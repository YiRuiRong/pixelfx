// The coordinate along a cut runs from its heel (0) to its point (1).
// Old incisions are anchored to exact intersections on the first cut.
import { clamp, fit, lerp, rand, rng, smooth } from "../../core/index.js";
import { polygon, transform } from "../_comic.js";

const FPS = 24;
const SWEEP = 2;
const PRIMARY_RELEASE = 8;
export const STEEL = ["#08090e", "#191e28", "#313946", "#515c68", "#82919d", "#bbc9ce", "#f3f8fa"];
export const WINE = ["#210f18", "#511d2b", "#903447", "#be5261", "#e1878a"];

function path(x, y, dx, dy, width) {
  const length = Math.hypot(dx, dy);
  return { x, y, dx, dy, length, nx: -dy / length, ny: dx / length, width };
}

function point(cut, u, offset = 0) {
  return [cut.x + cut.dx * u + cut.nx * offset, cut.y + cut.dy * u + cut.ny * offset];
}

const main = { ...path(-101, 70, 202, -140, 16), release: PRIMARY_RELEASE, key: 0 };
export const middleScar = { along: 0.52, degrees: 35, length: 181, pivot: 0.52, width: 14, key: 2 };

// A pointed strip, broadest at its shoulder. Used for a scratch, a folded lip
// or a moving edge; at rest it is always on the same line that opened.
function sliver(p, cut, from, to, offset, radius, color, shoulder = 0.56) {
  if (to <= from || radius < 0.05) return;
  const mid = lerp(from, to, shoulder);
  polygon(p, [point(cut, from, offset), point(cut, mid, offset - radius),
    point(cut, to, offset), point(cut, mid, offset + radius)], color);
}

export function crossing({ along, degrees, length, pivot, width, warning, release, key }) {
  const angle = degrees * Math.PI / 180;
  const dx = Math.cos(angle) * length, dy = Math.sin(angle) * length;
  const [x, y] = point(main, along);
  return { ...path(x - pivot * dx, y - pivot * dy, dx, dy, width), pivot, warning, release, key };
}

// Each station gives the aperture and the width of the lifted bank. The abrupt
// steps along just one side are small torn corners on an otherwise straight cut.
const PROFILE = [
  [0, 0, 0], [0.07, 0.16, 0.12], [0.16, 0.38, 0.30], [0.23, 0.58, 0.67],
  [0.27, 0.68, 0.80], [0.29, 0.73, 0.52], [0.38, 0.87, 0.66],
  [0.45, 0.97, 0.86], [0.47, 1, 0.72], [0.59, 0.94, 0.70],
  [0.69, 0.78, 0.95], [0.71, 0.74, 0.54], [0.83, 0.50, 0.44],
  [0.93, 0.20, 0.20], [1, 0, 0],
];

// A few fixed nicks between the large planes give the black opening a torn
// edge. They belong to the material and never crawl as the aperture changes.
const rim = PROFILE.flatMap(([u, gap, fold], i) => {
  const next = PROFILE[i + 1];
  if (!next) return [{ u, gap, fold, drift: 0, notch: 0 }];
  return [0, 0.34, 0.76].map((f, j) => ({
    u: lerp(u, next[0], f), gap: lerp(gap, next[1], f), fold: lerp(fold, next[2], f),
    drift: rand(83, i, j) - 0.5, notch: rand(19, i, j) - 0.5,
  }));
});

function opening(u, age) {
  return smooth(-0.55, 0.65, age - SWEEP * u) * (1 - smooth(3 + 3 * u, 5 + 3 * u, age));
}

// One angular flap shows the dark underside of the lifted bank. The fold and
// its narrow glint collapse with their respective points on the cut.
function liftedFold(p, cut, age, steel) {
  const face = (coordinates, color) => polygon(p, coordinates.map(([u, height]) =>
    point(cut, u, height * cut.width * opening(u, age))), color);
  face([[0.18,-0.44],[0.25,-1.15],[0.31,-1.80],[0.414,-2.05],[0.377,-1.62],
    [0.445,-1.71],[0.407,-1.36],[0.49,-1.17],[0.331,-1.06],[0.24,-0.62]], steel[0]);
  face([[0.20,-0.50],[0.307,-1.68],[0.404,-1.98],[0.358,-1.45],[0.288,-1.14]], steel[3]);
  face([[0.208,-0.52],[0.309,-1.64],[0.366,-1.83],[0.318,-1.48]], steel[4]);
  face([[0.31,-1.72],[0.403,-1.98],[0.346,-1.76]], steel[5]);
  face([[0.29,-1.12],[0.358,-1.45],[0.426,-1.64],[0.378,-1.27]], steel[2]);
  face([[0.33,-1.11],[0.383,-1.31],[0.472,-1.17]], steel[3]);
  for (const u of [0.292, 0.307, 0.332]) {
    const h = (u - 0.29) * 6;
    face([[u,-1.35-h],[u+0.020,-1.57-h],[u+0.023,-1.58-h],[u+0.009,-1.39-h]], steel[2]);
  }
}

function cutFace(p, cut, age, steel, wine) {
  if (age < 0 || age >= 8) return;
  const rows = rim.map(({ u, gap, fold, drift, notch }) => {
    const w = cut.width * opening(u, age), aperture = w * gap;
    const near = aperture * (-0.61 + drift * 0.27);
    const far = aperture * (0.52 + notch * 0.22);
    const lip = near - aperture * (0.13 + notch * 0.12);
    const crest = lip - w * fold * (0.73 + notch * 0.24);
    return {
      outer: point(cut, u, crest - aperture * (0.22 - drift * 0.35)), crest: point(cut, u, crest),
      bevel: point(cut, u, lerp(lip, crest, 0.36)), lip: point(cut, u, lip),
      near: point(cut, u, near), far: point(cut, u, far),
      farLip: point(cut, u, far + aperture * 0.13),
      farEdge: point(cut, u, far + w * (0.25 * gap + (0.23 + drift * 0.45) * fold)),
    };
  });
  function band(top, bottom, color, section = rows) {
    polygon(p, [...section.map(row => row[top]), ...section.map(row => row[bottom]).reverse()], color);
  }
  band("outer", "farEdge", steel[1]);
  band("crest", "lip", steel[2]);
  band("bevel", "lip", steel[4]);
  band("lip", "farLip", wine[1]);
  band("near", "far", steel[0]);
  band("lip", "near", wine[2], rows.slice(4, 16));
  band("lip", "near", wine[2], rows.slice(21, 39));
  band("far", "farLip", wine[2], rows.slice(12, 32));
  band("farLip", "farEdge", steel[2]);
  const corners = rows.filter((_, i) => i % 3 === 0);
  for (const [a, b, c] of [[2, 4, 5], [5, 7, 8], [8, 10, 11], [11, 12, 13]]) {
    polygon(p, [corners[a].lip, corners[b].crest, corners[c].bevel], steel[3]);
    polygon(p, [corners[a].bevel, corners[b].crest, corners[b].outer], steel[2]);
    polygon(p, [corners[b].lip, corners[b].bevel, corners[c].lip], steel[5]);
    polygon(p, [corners[a].farLip, corners[b].farEdge, corners[c].farLip], steel[3]);
  }
  liftedFold(p, cut, age, steel);
}

function sleepingScar(p, cut, frame, end, steel, old) {
  const settle = old ? smooth(0, 3, frame) : smooth(cut.release + 2, cut.release + 6, frame);
  const erosion = smooth(end - 10, end, frame), opacity = settle * (1 - erosion);
  if (opacity <= 0) return;
  const fade = p.fade, trim = erosion * 0.34;
  p.fade = fade * opacity * 0.78;
  sliver(p, cut, trim, 0.60 - trim * 0.18, 0, 1.7, steel[0]);
  sliver(p, cut, 0.57 + trim * 0.18, 1 - trim, 0, 1.27, steel[0]);
  sliver(p, cut, 0.05 + trim, 0.41 - trim * 0.10, -0.65, 0.86, steel[3]);
  sliver(p, cut, 0.34 + trim * 0.38, 0.78 - trim * 0.30, -0.7, 0.95, steel[3]);
  sliver(p, cut, 0.76 + trim * 0.20, 0.96 - trim, -0.5, 0.68, steel[2]);
  if (erosion < 0.8) {
    polygon(p, [point(cut, 0.26, -0.7), point(cut, 0.33, -3.0), point(cut, 0.38, -3.6),
      point(cut, 0.32, -1.1)], steel[2]);
  }
  p.fade = fade;
}

function sightLine(p, frame, steel) {
  if (frame >= main.release) return;
  const reach = smooth(0, 6, frame);
  sliver(p, main, 0, reach, 0, 1.35, steel[0]);
  sliver(p, main, 0, reach, -0.15, 0.64, steel[4], 0.72);
}

function warning(p, cut, frame, wine) {
  if (frame < cut.warning || frame >= cut.release + SWEEP) return;
  const fade = p.fade;
  p.fade *= 1 - smooth(cut.release, cut.release + SWEEP, frame);
  const spread = smooth(cut.warning, cut.release - 1, frame);
  const reach = 0.08 + 0.79 * spread, u = cut.pivot;
  sliver(p, cut, u * (1 - reach), u + (1 - u) * reach, 0, 1 + spread * 0.55, wine[2], u);
  sliver(p, cut, u - 0.08, u + 0.08, 0, 3.3 - spread, wine[3]);
  const barb = 4.5 * (1 - spread);
  polygon(p, [point(cut, u - 0.017), point(cut, u + 0.022, -barb), point(cut, u + 0.005),
    point(cut, u - 0.018, barb)], wine[3]);
  const [x, y] = point(cut, u);
  p.blend(x, y, wine[4], 0.95 - spread * 0.6);
  p.glow(x, y, 10, wine[3], 0.26 * (1 - spread * 0.6));
  p.fade = fade;
}

function cuttingEdge(p, cut, age, steel, wine) {
  if (age < 0 || age > SWEEP) return;
  const head = clamp((age + 0.22) / SWEEP);
  const tail = Math.max(0, head - 0.46);
  sliver(p, cut, tail, head, -0.65, 2.1, steel[4], 0.78);
  sliver(p, cut, tail + 0.03, head, -0.8, 1.25, steel[6], 0.83);
  sliver(p, cut, Math.max(0, head - 0.30), head - 0.08, -cut.width * 1.22, 0.66, steel[4]);
  sliver(p, cut, Math.max(0, head - 0.44), head - 0.20, cut.width * 0.95, 0.74, steel[3]);
  const [x, y] = point(cut, head);
  p.glow(x, y, 7, steel[5], 0.28);
  p.glow(x, y, 17, wine[2], 0.12);
}

function shavings(p, cut, age, seed, steel) {
  if (age < 1 || age > 13) return;
  for (let i = 0; i < 4; i++) {
    const r = rng(seed + cut.key * 131, 17 + i);
    const u = 0.19 + i * 0.17 + r.range(-0.045, 0.045), side = i % 3 ? -1 : 1;
    const t = age - (1 + i % 3), life = r.range(6, 10);
    if (t < 0 || t >= life) continue;
    const drag = 1 - Math.exp(-0.23 * t);
    const travel = r.range(9, 19) * drag;
    const lift = (cut.width * 0.58 + r.range(7, 18) * drag) * side;
    const [x, y] = point(cut, u + travel / cut.length, lift);
    const fade = p.fade;
    p.fade *= 1 - smooth(life - 3, life, t);
    const turn = Math.atan2(cut.dy, cut.dx) + side * (0.23 + 0.12 * t);
    const shard = transform([[-1, 0], [0.30, -0.6], [1, 0], [0.08, 0.65]],
      x, y + t * t * 0.032, r.range(3.5, 6.4), 2.1, turn);
    polygon(p, shard, steel[2]);
    polygon(p, shard.slice(0, 3), steel[t < 2 ? 5 : 4]);
    p.fade = fade;
  }
}

export function swordScarStage({ name, desc, tags, echoes, end }) {
  const cuts = [main, ...echoes];
  const meta = {
    name, desc, tags: ["melee", "sword", "slash", "noir", "rift", "directional", "one-shot", ...tags],
    size: [280, 280], origin: [140, 140], duration: end / FPS, fps: FPS, loop: false, bg: "dark",
    options: { palette: STEEL, rift: WINE, seed: 67 },
  };
  const cues = {
    release: main.release / FPS,
    echoes: echoes.map(cut => ({ warning: cut.warning / FPS, release: cut.release / FPS,
      intersection: point(cut, cut.pivot) })),
  };
  function frameAt(time) { return Math.floor(time * FPS + 1e-7); }
  function drawBack(p, time, o) {
    const frame = frameAt(time);
    if (frame <= 0 || frame >= end) return;
    const steel = fit(o.palette, 7);
    for (const cut of echoes) sleepingScar(p, cut, frame, end, steel, true);
    sleepingScar(p, main, frame, end, steel, false);
    sightLine(p, frame, steel);
  }
  function draw(p, time, o) {
    const frame = frameAt(time);
    if (frame <= 0 || frame >= end) return;
    const steel = fit(o.palette, 7), wine = fit(o.rift, 5);
    for (const cut of cuts) {
      const age = frame - cut.release;
      if (cut !== main) warning(p, cut, frame, wine);
      cutFace(p, cut, age, steel, wine);
      cuttingEdge(p, cut, age, steel, wine);
      shavings(p, cut, age, o.seed, steel);
    }
  }
  return { meta, cues, drawBack, draw };
}
