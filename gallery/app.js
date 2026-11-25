// Tiles play when visible. Details show the live renderer or the native engine preview and package.

import { effects, categories, packagedEffects } from "../src/fx/index.js";
import { createFrame, clearFrame, createFx, createAct, actBounds, composite, backdrop, drawActor, painterFor, stockActor, actorAlphaOf, sampleFrameCount, PAL, BACKDROPS } from "../src/core/index.js";
import { t, getLanguage, setLanguage, effectText, categoryText, tagText, paletteText, backdropText, searchText } from "./i18n.js";

const REPO = "https://github.com/patch-gg/pixelfx";
const bundledSources = import.meta.bundledEffectSources ?? {};
const embeddedMedia = import.meta.bundledPackageMedia ?? {};
const assetUrl = (path) => embeddedMedia[path] ?? new URL((import.meta.packageRoot ?? "../outputs/") + path, import.meta.url).href;
const FX = Object.entries({ ...effects, ...packagedEffects }).sort(([a], [b]) => a.localeCompare(b)).map(([id, mod]) => {
  const meta = { fps: 30, bg: "dark", loop: false, duration: 1, tags: [], options: {}, ...mod.meta };
  const sourceUrl = bundledSources[id]
    ? URL.createObjectURL(new Blob([bundledSources[id]], { type: "text/plain;charset=utf-8" }))
    : mod.sourceUrl ?? `${REPO}/blob/main/src/fx/${id}.js`;
  const fx = { id, cat: id.split("/")[0], name: meta.name, mod: { ...mod, meta }, meta, sourceUrl, media: mod.media };
  fx.search = searchText(fx, categories.find((c) => c.id === fx.cat));
  return fx;
});
const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
// full-screen effects (transitions, weather, impact frames) fill a 16:9 stage edge to edge instead of floating in it
const isScreen = (fx) => fx.meta.size[0] >= 320 && Math.abs(fx.meta.size[0] / fx.meta.size[1] - 16 / 9) < 0.05;
const $ = (s) => document.querySelector(s);
function el(tag, props = {}, kids = []) {
  const e = Object.assign(document.createElement(tag), props);
  for (const k of [].concat(kids)) e.append(k);
  return e;
}

// ---- a live effect on a canvas, at an integer scale that fits the stage
class Player {
  constructor(canvas, fx, aspect, pad) {
    Object.assign(this, { canvas, fx, ctx: canvas.getContext("2d"), opts: {}, flip: false, actor: true, speed: 1, playing: true });
    this.bg = fx.meta.bg;
    this.layout(aspect, pad);
  }
  // the art-pixel stage: the effect's canvas plus some room, stretched to the tile's aspect; CSS scales it up
  layout(aspect, pad) {
    Object.assign(this, { aspect, pad });
    // an act needs room for the whole performance, not just the effect's canvas
    const acted = this.acted, b = acted ? { ...actBounds(this.fx.mod) } : null;
    // an act happens above the floor: don't spend the tile on bricks
    if (b) b.y1 = Math.min(b.y1, 22);
    const [w, h] = acted ? [b.x1 - b.x0, b.y1 - b.y0] : this.fx.meta.size, [ox, oy] = acted ? [-b.x0, -b.y0] : this.fx.meta.origin;
    this.W = Math.ceil(Math.max(w * (acted ? Math.min(pad, 1.1) : pad), h * (acted ? Math.min(pad, 1.1) : pad) * aspect));
    this.H = Math.ceil(this.W / aspect);
    this.x = Math.floor((this.W - w) / 2) + ox;
    if (this.flip) this.x = this.W - this.x;
    // an act stands near the bottom of its tile, with the room above it
    this.y = acted ? Math.max(oy + 2, this.H - b.y1 - 2) : Math.floor((this.H - h) / 2) + oy;
    this.canvas.width = this.W;
    this.canvas.height = this.H;
    // shrinking pixel art nearest-neighbour drops whole 1 px lines; smooth it only when it has to shrink
    const shown = this.canvas.getBoundingClientRect().width * devicePixelRatio;
    this.canvas.style.imageRendering = shown && shown < this.W ? "auto" : "";
    this.frame = createFrame(this.W, this.H);
    this.img = this.ctx.createImageData(this.W, this.H);
    this.setBg(this.bg);
    this.restart();
  }
  setBg(kind) {
    this.bg = kind;
    this.bgBuf = kind === "none" ? null : backdrop(kind, this.W, this.H, this.y);
    this.dirty = true;
  }
  // an effect with an act plays it, unless the character is switched off
  get acted() {
    return !!this.fx.mod.act && this.actor;
  }
  restart() {
    this.inst = (this.acted ? createAct : createFx)(this.fx.mod, { x: this.x, y: this.y, flip: this.flip, ...this.opts });
    this.acc = 0;
    this.wait = 0;
    this.dirty = true;
  }
  tick(dt) {
    const m = this.fx.meta, step = 1 / m.fps;
    if (this.playing) this.acc = Math.min(this.acc + dt * this.speed, 0.25);
    let moved = false;
    while (this.acc >= step) {
      this.acc -= step;
      if (!m.loop && (this.acted ? this.inst.done() : this.inst.t >= m.duration)) {
        this.wait += step;
        if (this.wait > 0.45) this.restart();
      } else this.inst.update(step);
      moved = true;
    }
    if (moved || this.dirty) this.render();
  }
  seek(t) {
    this.restart();
    this.inst.update(t);
    this.render();
  }
  render() {
    const f = clearFrame(this.frame);
    if (this.acted) {
      this.inst.draw(f);
      composite(f, this.img.data, this.bgBuf);
      const [sx, sy] = this.inst.shake;
      if (sx || sy) this.ctx.clearRect(0, 0, this.W, this.H);
      this.ctx.putImageData(this.img, sx, sy);
      this.dirty = false;
      return;
    }
    this.inst.draw(f, "back");
    const m = this.fx.meta, tt = m.loop ? this.inst.t % m.duration : Math.min(this.inst.t, m.duration);
    if (m.actor && this.actor) drawActor(painterFor(f).place(this.x, this.y, this.flip), this.inst.options.actor ?? stockActor(), actorAlphaOf(this.fx.mod, tt, this.inst.options));
    this.inst.draw(f, "front");
    composite(f, this.img.data, this.bgBuf);
    this.ctx.putImageData(this.img, 0, 0);
    this.dirty = false;
  }
}

// ---- tiles
const tiles = [];
const sections = [];
function syncVideoTile(tile) {
  const { media } = tile.fx;
  if (!media) return;
  const video = tile.cv;
  if (!tile.visible || tile.fig.hidden || detail || (reduced && !tile.hover)) {
    video.pause();
    return;
  }
  if (!video.hasAttribute("src")) video.src = assetUrl(media.preview);
  // Browsers that restrict autoplay still show the poster and offer controls in the detail view.
  video.play().catch(() => {});
}
function build() {
  $("#subtitle").textContent = t("subtitle", { count: FX.length });
  const main = $("#grid");
  for (const c of categories) {
    const list = FX.filter((f) => f.cat === c.id);
    if (!list.length) continue;
    const grid = el("div", { className: "grid" });
    const translated = categoryText(c);
    const sec = el("section", { id: c.id }, [el("div", { className: "section-head" }, [el("h2", { textContent: translated.name }), el("p", { textContent: translated.blurb })]), grid]);
    sections.push({ c, sec, list });
    for (const fx of list) {
      const cv = fx.media
        ? el("video", { poster: assetUrl(fx.media.poster), muted: true, loop: true, playsInline: true, preload: "none" })
        : el("canvas");
      cv.ariaLabel = effectText(fx).name;
      const b = fx.mod.act ? actBounds(fx.mod) : null, [fw, fh] = b ? [b.x1 - b.x0, b.y1 - b.y0] : fx.meta.size;
      const fig = el("figure", { className: isScreen(fx) ? "tile big screen" : fw > 200 || fh > 170 || (b && (fw > 130 || fx.mod.act.target || fx.mod.act.targets)) ? "tile big" : "tile", tabIndex: 0 }, [
        el("div", { className: "stage" }, cv),
        el("figcaption", {}, [el("b", { textContent: effectText(fx).name }), el("small", { textContent: fx.meta.loop ? t("loop") : t("seconds", { value: +fx.meta.duration.toFixed(2) }) })]),
      ]);
      const tile = { fx, fig, cv, player: null, visible: false, hover: false };
      fig.addEventListener("click", () => openDetail(fx));
      fig.addEventListener("keydown", (e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), openDetail(fx)));
      fig.addEventListener("pointerenter", () => { tile.hover = true; syncVideoTile(tile); });
      fig.addEventListener("pointerleave", () => { tile.hover = false; syncVideoTile(tile); });
      grid.append(fig);
      tiles.push(tile);
    }
    main.append(sec);
  }
  const io = new IntersectionObserver((entries) => {
    for (const e of entries) {
      const t = tiles.find((x) => x.fig === e.target);
      t.visible = e.isIntersecting;
      if (t.fx.media) syncVideoTile(t);
      else if (t.visible && !t.player) {
        t.player = isScreen(t.fx) ? new Player(t.cv, t.fx, 16 / 9, 1) : new Player(t.cv, t.fx, 6 / 5, 1.25);
        if (reduced) t.player.seek(t.fx.meta.duration * 0.4);
      }
    }
  }, { rootMargin: "200px" });
  tiles.forEach((t) => io.observe(t.fig));
}

// ---- filters
const state = { cat: "all", q: new URLSearchParams(location.search).get("q") ?? "" };
$("#q").value = state.q;
function chips() {
  const box = $("#chips");
  const mk = (id, label, n) => {
    const b = el("button", { className: "chip", type: "button" }, [label, el("span", { textContent: n })]);
    b.dataset.cat = id;
    b.addEventListener("click", () => setCat(id));
    box.append(b);
  };
  mk("all", t("all"), FX.length);
  for (const s of sections) mk(s.c.id, categoryText(s.c).name, s.list.length);
}
function setCat(id, fromHash = false) {
  state.cat = sections.some((s) => s.c.id === id) ? id : "all";
  document.querySelectorAll(".chip").forEach((b) => b.setAttribute("aria-pressed", String(b.dataset.cat === state.cat)));
  if (!fromHash) history.replaceState(null, "", state.cat === "all" ? location.pathname : "#" + state.cat);
  filter();
  if (!fromHash) window.scrollTo({ top: 0 });
}
function filter() {
  const q = state.q.trim().toLowerCase();
  let shown = 0;
  for (const s of sections) {
    let any = false;
    for (const fx of s.list) {
      const t = tiles.find((x) => x.fx === fx);
      const hit = (state.cat === "all" || state.cat === s.c.id) && (!q || fx.search.includes(q));
      t.fig.hidden = !hit;
      any ||= hit;
      shown += hit;
    }
    s.sec.hidden = !any;
  }
  $("#none").hidden = shown > 0;
}

// ---- detail
let detail = null;
function openDetail(fx) {
  const d = $("#detail");
  const big = $("#big"), screen = isScreen(fx);
  big.parentElement.classList.toggle("screen", screen);
  big.hidden = !!fx.media;
  const video = $("#d-video"), download = $("#d-package");
  video.hidden = !fx.media;
  download.hidden = !fx.media;
  $("#d-live").hidden = !!fx.media;
  $("#d-id").textContent = fx.id;
  $("#d-sheet").replaceChildren();
  if (fx.media) {
    detail = { fx };
    video.poster = assetUrl(fx.media.poster);
    video.src = assetUrl(fx.media.preview);
    download.href = assetUrl(fx.media.archive);
    download.download = fx.media.archive.split("/").pop();
    if (!reduced) video.play().catch(() => {});
  } else {
    detail = screen ? new Player(big, fx, 16 / 9, 1) : new Player(big, fx, 16 / 10, 1.6);
    $("#d-bg").replaceChildren(...BACKDROPS.concat("none").map((b) => btn(backdropText(b), () => detail.setBg(b), b === fx.meta.bg, "bg")));
    $("#d-speed").replaceChildren(...[0.25, 0.5, 1].map((s) => btn(`${s}×`, () => (detail.speed = s), s === 1, "speed")));
    $("#d-pal").replaceChildren();
    $("#d-actor").hidden = !fx.meta.actor;
    $("#d-actor").setAttribute("aria-pressed", "true");
    $("#d-flip").setAttribute("aria-pressed", "false");
    $("#d-play").setAttribute("aria-pressed", "true");
  }
  tiles.forEach(syncVideoTile);
  refreshDetailText();
  d.showModal();
  d.scrollTop = 0;
}
function refreshDetailText() {
  const fx = detail.fx, m = fx.meta, translated = effectText(fx);
  $("#d-name").textContent = translated.name;
  $("#d-desc").textContent = translated.desc;
  $(fx.media ? "#d-video" : "#big").ariaLabel = translated.name;
  const frames = sampleFrameCount(m);
  const facts = [
    [t("kind"), m.loop ? t("loop") : t("once")],
    [t(fx.media && m.loop ? "sustainLoop" : "length"), t("lengthValue", { seconds: +m.duration.toFixed(2), frames, fps: m.fps })],
    ...(fx.mod.act ? [[t("acted"), actFacts(fx.mod)]] : []),
    [t(fx.media ? "previewSize" : "canvas"), t("canvasValue", { w: m.size[0], h: m.size[1] })],
    [t("tags"), m.tags.map(tagText).join(t("tagSeparator"))],
  ];
  $("#d-facts").replaceChildren(...facts.flatMap(([k, v]) => [el("dt", { textContent: k }), el("dd", { textContent: v })]));
  if (fx.media) return;
  // Optional outcome controls belong to the preview, not the battle simulation.
  $("#d-outcome-row").hidden = !m.outcomes;
  $("#d-outcome").replaceChildren(...(m.outcomes ?? []).map(key => btn(t(key), () => {
    detail.opts.outcome = key;
    detail.restart();
    $("#d-sheet").replaceChildren();
    code(fx);
  }, key === (detail.opts.outcome ?? m.options.outcome), "outcome")));
  [...$("#d-bg").children].forEach((button, i) => { button.textContent = backdropText([...BACKDROPS, "none"][i]); });
  const pal = $("#d-pal"), selected = pal.value;
  pal.replaceChildren(el("option", { value: "", textContent: t("ownPalette") }), ...Object.keys(PAL).map((k) => el("option", { value: k, textContent: paletteText(k) })));
  pal.value = selected;
  $("#d-play").textContent = t(detail.playing ? "pause" : "play");
  code(fx);
}
// what the body does around the effect, in a line: the wind-up, the freeze, the recovery
function actFacts(mod) {
  const k = mod.act.poses, lead = Math.max(0, -k[0][0]), end = k[k.length - 1][0] - mod.meta.duration, hits = (mod.act.hits ?? []).filter((h) => h.stop);
  const parts = [];
  if (lead > 0) parts.push(t("windup", { seconds: lead.toFixed(2) }));
  if (hits.length) parts.push(t(hits.length === 1 ? "freeze" : "freezes", { ms: Math.round(hits[0].stop * 1000), count: hits.length, at: hits[0].t.toFixed(2) }));
  if (!mod.meta.loop && end > 0.02) parts.push(t("recovery", { seconds: end.toFixed(2) }));
  return parts.join(t("separator")) || t("bodyMoves");
}
function btn(label, fn, on, group) {
  const b = el("button", { className: "btn", type: "button", textContent: label });
  b.setAttribute("aria-pressed", String(!!on));
  b.addEventListener("click", () => {
    if (group) b.parentElement.querySelectorAll(".btn").forEach((x) => x.setAttribute("aria-pressed", String(x === b)));
    fn();
  });
  return b;
}
function code(fx) {
  const v = fx.id.split("/")[1].replace(/-(\w)/g, (_, c) => c.toUpperCase());
  const acted = !!fx.mod.act, make = acted ? "createAct" : "createFx";
  const [mw, mh] = fx.meta.size, [ox, oy] = fx.meta.origin;
  const b = acted ? actBounds(fx.mod) : { x0: -ox, y0: -oy, x1: mw - ox, y1: mh - oy };
  const w = Math.max(320, Math.ceil(b.x1 - b.x0)), h = Math.max(180, Math.ceil(b.y1 - b.y0));
  const opts = {
    x: Math.floor((w - (b.x1 - b.x0)) / 2) - b.x0,
    y: Math.floor((h - (b.y1 - b.y0)) / 2) - b.y0,
    ...(detail.opts.outcome ? { outcome: detail.opts.outcome } : {}),
    ...(detail.opts.palette ? { palette: "[…]" } : {}), ...(detail.flip ? { flip: true } : {}),
  };
  if (detail.flip) opts.x = w - opts.x;
  $("#d-code").textContent = [
    `import { createFrame, ${make}, composite } from "pixelfx";`,
    `import * as ${v} from "pixelfx/fx/${fx.id}";`,
    ``,
    `const frame = createFrame(${w}, ${h});`,
    `const fx = ${make}(${v}, ${JSON.stringify(opts).replace(/"\[…\]"/, "[…]").replace(/"(\w+)":/g, "$1: ").replace(/,/g, ", ")});`,
    ``,
    `// ${t("tickComment")}`,
    `fx.update(dt);`,
    `fx.draw(frame);          // ${t("buffersComment")}`,
    `composite(frame, imageData.data, null);`,
    ...(acted ? [``, `// ${t("timingComment", { name: v })}`] : []),
  ].join("\n");
  $("#d-src").href = fx.sourceUrl;
}
function sheet() {
  const fx = detail.fx, m = fx.meta, [w, h] = m.size, n = sampleFrameCount(m);
  const cols = Math.min(n, Math.max(1, Math.ceil(Math.sqrt((n * h) / w)))), rows = Math.ceil(n / cols);
  const cv = el("canvas", { width: cols * w, height: rows * h }), ctx = cv.getContext("2d");
  const frame = createFrame(w, h), img = ctx.createImageData(w, h);
  const inst = createFx(fx.mod, { x: detail.flip ? w - m.origin[0] : m.origin[0], y: m.origin[1], ...detail.opts, flip: detail.flip });
  for (let i = 0; i < n; i++) {
    if (i) inst.update(1 / m.fps);
    inst.draw(clearFrame(frame));
    composite(frame, img.data, null);
    ctx.putImageData(img, (i % cols) * w, Math.floor(i / cols) * h);
  }
  const k = Math.max(1, Math.min(4, Math.floor(1100 / (cols * w))));
  const pic = el("img", { src: cv.toDataURL("image/png"), alt: t("sheetAlt", { name: effectText(fx).name }), width: cols * w * k, height: rows * h * k });
  $("#d-sheet").replaceChildren(pic, el("p", { textContent: t("sheetInfo", { n, w, h, cols, fps: m.fps, mode: t(m.loop ? "loop" : "once"), command: `node tools/render.mjs ${fx.id} --sheet${detail.opts.outcome ? ` --opts '${JSON.stringify({outcome:detail.opts.outcome})}'` : ""}` }) }));
}
function wireDetail() {
  const d = $("#detail");
  $("#d-close").addEventListener("click", () => d.close());
  d.addEventListener("close", () => {
    $("#d-video").pause();
    detail = null;
    tiles.forEach(syncVideoTile);
  });
  d.addEventListener("click", (e) => e.target === d && d.close());
  $("#d-play").addEventListener("click", (e) => {
    detail.playing = !detail.playing;
    e.target.setAttribute("aria-pressed", String(detail.playing));
    e.target.textContent = t(detail.playing ? "pause" : "play");
  });
  $("#d-again").addEventListener("click", () => detail.restart());
  $("#d-flip").addEventListener("click", (e) => {
    detail.flip = !detail.flip;
    e.target.setAttribute("aria-pressed", String(detail.flip));
    detail.layout(detail.aspect, detail.pad);
    code(detail.fx);
  });
  $("#d-actor").addEventListener("click", (e) => {
    detail.actor = !detail.actor;
    e.target.setAttribute("aria-pressed", String(detail.actor));
    // with an act, the character is the performance: off shows the effect alone, as a sprite sheet has it
    if (detail.fx.mod.act) detail.layout(detail.aspect, detail.pad);
    detail.dirty = true;
  });
  $("#d-seed").addEventListener("click", () => {
    detail.opts.seed = 1 + Math.floor(Math.random() * 9999);
    detail.restart();
  });
  $("#d-pal").addEventListener("change", (e) => {
    if (e.target.value) detail.opts.palette = PAL[e.target.value];
    else delete detail.opts.palette;
    detail.restart();
    code(detail.fx);
  });
  $("#d-make").addEventListener("click", sheet);
  $("#d-copy").addEventListener("click", async (e) => {
    const text = $("#d-code").textContent;
    try {
      await navigator.clipboard.writeText(text);
      e.target.textContent = t("copied");
    } catch {
      getSelection().selectAllChildren($("#d-code"));
      e.target.textContent = t("selected");
    }
    setTimeout(() => (e.target.textContent = t("copy")), 1400);
  });
}

function applyLanguage() {
  document.documentElement.lang = getLanguage();
  document.title = t("title");
  $("#language").value = getLanguage();
  $("#subtitle").textContent = t("subtitle", { count: FX.length });
  document.querySelectorAll("[data-i18n]").forEach((node) => { node.textContent = t(node.dataset.i18n); });
  for (const attribute of ["placeholder", "aria-label", "content"]) {
    document.querySelectorAll(`[data-i18n-${attribute}]`).forEach((node) => {
      node.setAttribute(attribute, t(node.getAttribute(`data-i18n-${attribute}`)));
    });
  }
  for (const { c, sec } of sections) {
    const translated = categoryText(c);
    sec.querySelector("h2").textContent = translated.name;
    sec.querySelector(".section-head p").textContent = translated.blurb;
  }
  document.querySelectorAll(".chip").forEach((button) => {
    const category = categories.find((c) => c.id === button.dataset.cat);
    button.firstChild.nodeValue = category ? categoryText(category).name : t("all");
  });
  for (const tile of tiles) {
    const translated = effectText(tile.fx);
    tile.fig.querySelector("b").textContent = translated.name;
    tile.fig.querySelector("small").textContent = tile.fx.meta.loop ? t("loop") : t("seconds", { value: +tile.fx.meta.duration.toFixed(2) });
    tile.cv.ariaLabel = translated.name;
    tile.fig.title = getLanguage() === "zh-CN" ? tile.fx.name : "";
  }
  if (detail) {
    refreshDetailText();
    if ($("#d-sheet img")) sheet();
  }
}

// ---- the clock
let last = performance.now();
function frameLoop(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (detail) detail.tick?.(dt);
  else for (const t of tiles) if (t.visible && t.player && !t.fig.hidden && (!reduced || t.hover)) t.player.tick(dt);
  requestAnimationFrame(frameLoop);
}

build();
chips();
wireDetail();
applyLanguage();
$("#language").addEventListener("change", (event) => {
  setLanguage(event.target.value);
  applyLanguage();
});
$("#q").addEventListener("input", (e) => {
  state.q = e.target.value;
  filter();
});
setCat(location.hash.slice(1) || "all", true);
addEventListener("hashchange", () => setCat(location.hash.slice(1) || "all", true));
requestAnimationFrame(frameLoop);
