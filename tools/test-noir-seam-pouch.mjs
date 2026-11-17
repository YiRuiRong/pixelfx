#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { effects } from "../src/fx/index.js";
import { effects as chinese, tags } from "../gallery/locales/zh-CN.js";
import { searchText } from "../gallery/i18n.js";
import { createFrame, clearFrame, createFx } from "../src/core/index.js";
import { loadEffect, renderFrames, spriteSheet, save } from "./lib/fxlib.mjs";

const id = "shadow/noir-seam-pouch", fx = await loadEffect(id), mod = fx.mod, m = fx.meta;
const results = [], check = (name, fn) => { fn(); results.push(name); };
const bytes = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
const hash = f => createHash("sha256").update(bytes(f.color)).update(bytes(f.light)).digest("hex");
const occupied = f => f.color.reduce((n, c) => n + !!(c >>> 24), 0);
function at(t, options = {}, frame = createFrame(768, 768), layer) {
  const inst = createFx(mod, { x: 384, y: 400, ...options });
  inst.update(t); inst.draw(clearFrame(frame), layer); return frame;
}
const metaBefore = JSON.stringify(m), phases = [8, 30, 47, 64, 79, 95, 116];

check("registry, Chinese search and all library translations", () => {
  assert.ok(effects[id]);
  const text = searchText({ ...fx, cat: "shadow" });
  for (const word of ["缝界收袋", "暗黑漫画", "布料", "noir seam pouch"]) assert.ok(text.includes(word));
  for (const [key, effect] of Object.entries(effects)) {
    assert.ok(chinese[key], `missing Chinese effect ${key}`);
    for (const tag of effect.meta.tags) assert.ok(tags[tag], `missing tag ${tag}`);
  }
});

for (const frame of phases) {
  check(`direct positioning equals playback, frame ${frame}`, () => {
    const a = at(frame / 24), inst = createFx(mod, { x: 384, y: 400 }), b = createFrame(768, 768);
    for (let i = 0; i < frame; i++) inst.update(1 / 24);
    inst.draw(b); assert.equal(hash(a), hash(b));
  });
  check(`back and front compose correctly, frame ${frame}`, () => {
    const combined = at(frame / 24), inst = createFx(mod, { x: 384, y: 400 }), split = createFrame(768, 768);
    inst.update(frame / 24); inst.draw(split, "back"); inst.draw(split, "front");
    assert.equal(hash(combined), hash(split));
  });
}

for (const options of [{}, { flip: true }, { angle: 0.65 }, { flip: true, angle: -0.4 }]) {
  check(`world clipping after transform ${JSON.stringify(options)}`, () => {
    const full = at(2.9, options), part = at(2.9, options, createFrame(180, 240, 300, 180));
    assert.ok(occupied(full) > 10000);
    for (let y = 0; y < part.h; y++) for (let x = 0; x < part.w; x++) {
      const a = y * part.w + x, b = (y + part.oy) * full.w + x + part.ox;
      assert.equal(part.color[a], full.color[b]); assert.equal(part.light[a], full.light[b]);
    }
  });
}

for (const flip of [false, true]) for (const seed of [0, 7, m.options.seed]) {
  check(`all 133 frames fit the transparent atlas, flip=${flip}, seed=${seed}`, () => {
    const [w, h] = m.size, pad = 24, f = createFrame(w + 48, h + 48, -pad, -pad);
    const inst = createFx(mod, { x: m.origin[0], y: m.origin[1], seed, flip });
    for (let frame = 0; frame <= Math.round(m.duration * m.fps); frame++) {
      if (frame) inst.update(1 / m.fps);
      inst.draw(clearFrame(f));
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
        if (x >= pad && x < pad + w && y >= pad && y < pad + h) continue;
        const i = y * f.w + x;
        assert.equal(f.color[i] >>> 24, 0, `frame ${frame} outside at ${x - pad},${y - pad}`);
        assert.equal(f.light[i] & 0xffffff, 0);
      }
    }
  });
}

for (const key of ["palette", "thread"]) check(`short ${key} ramp recolors without changing coverage`, () => {
  const original = at(3.35), recolored = at(3.35, { [key]: ["#1c2930", "#598c92", "#e2e6ce"] });
  assert.notEqual(hash(original), hash(recolored));
  assert.deepEqual(original.color.map(v => v >>> 24), recolored.color.map(v => v >>> 24));
});
check("seeded scraps change deterministically", () => {
  assert.equal(hash(at(4.2, { seed: 2 })), hash(at(4.2, { seed: 2 })));
  assert.notEqual(hash(at(4.2, { seed: 2 })), hash(at(4.2, { seed: 3 })));
});
check("translating the three nodes translates the whole effect", () => {
  const nodes = m.options.nodes.map(([x, y]) => [x + 23, y - 11]);
  for (const time of [1.6, 2.65, 3.4, 4.3]) assert.equal(hash(at(time, { nodes })), hash(at(time, { x: 407, y: 389 })));
});
check("custom triangle changes the cloth without mutating caller data", () => {
  const nodes = [[-117, 40], [154, 9], [-29, -89]], before = JSON.stringify(nodes);
  assert.notEqual(hash(at(2.4)), hash(at(2.4, { nodes })));
  assert.equal(JSON.stringify(nodes), before);
});
for (const nodes of [null, [], [[0, 0], [10, 0], [20, 0]], [[NaN, 0], [20, 10], [0, 50]]]) {
  check(`invalid triangle has a finite default fallback: ${JSON.stringify(nodes)}`, () => {
    assert.equal(hash(at(2.7, { nodes })), hash(at(2.7)));
  });
}

check("three clasps land in order before the cloth appears", () => {
  for (const [i, [x, y]] of m.options.nodes.entries()) {
    const zone = () => createFrame(24, 32, 384 + x - 12, 400 + y - 29);
    assert.equal(occupied(at(mod.cues.pins[i] - 0.2, {}, zone())), 0);
    assert.ok(occupied(at(mod.cues.pins[i] + 0.04, {}, zone())) > 110);
  }
  const center = () => createFrame(80, 30, 344, 360);
  assert.equal(occupied(at(1.76, {}, center())), 0);
  assert.ok(occupied(at(2.17, {}, center())) > 2000);
});
check("cloth is solid across internal mesh edges", () => {
  const f = at(2.17);
  // This rectangle is well inside the fully formed, still-flat triangle.
  for (let y = 365; y < 385; y++) for (let x = 360; x < 410; x++) assert.equal(f.color[y * f.w + x] >>> 24, 255);
});
check("tightening reduces the elevated mouth width", () => {
  const width = time => {
    const f = at(time); let min = Infinity, max = -Infinity;
    for (let y = 210; y < 315; y++) for (let x = 250; x < 520; x++) if ((f.color[y * f.w + x] >>> 24) > 200) { min = Math.min(min, x); max = Math.max(max, x); }
    return max - min;
  };
  assert.ok(width(3.4) < width(2.9) * 0.8);
});
for (const time of [0.5, 2.6, 3.5, 4.7]) check(`stop fades all layers at ${time}s`, () => {
  const inst = createFx(mod, { x: 384, y: 400 }), f = createFrame(768, 768);
  inst.update(time); inst.stop(); inst.update(0.1); inst.draw(f);
  assert.ok(occupied(f) > 0); assert.ok(f.color.some(v => (v >>> 24) > 0 && (v >>> 24) < 255));
  inst.update(0.21); inst.draw(clearFrame(f)); assert.ok(inst.done()); assert.equal(occupied(f), 0);
});
check("starts and ends transparent without additive glow", () => {
  for (const time of [0, m.duration, m.duration + 1]) assert.equal(occupied(at(time)), 0);
  for (const time of [1.9, 3.2, 4.0]) assert.ok(at(time).light.every(v => !(v & 0xffffff)));
});
check("effect instances do not share progress or stop state", () => {
  const a = createFx(mod, { x: 384, y: 400 }), b = createFx(mod, { seed: 77 });
  a.update(3.3); b.update(4); b.stop(); b.update(0.5); a.update(0);
  const frame = createFrame(768, 768); a.draw(frame); assert.equal(hash(frame), hash(at(3.3)));
  assert.equal(JSON.stringify(m), metaBefore);
});
check("RGBA sprite sheet has 133 frames, correct pivot and empty endpoints", () => {
  const rendered = renderFrames(fx), sheet = spriteSheet(fx, rendered, "noir-seam-pouch");
  assert.equal(rendered.n, 133); assert.equal(sheet.json.frames.length, 133);
  assert.equal(sheet.json.meta.pixelfx.fps, 24);
  assert.deepEqual(sheet.json.meta.pixelfx.pivot, [224, 256]);
  assert.deepEqual(sheet.json.meta.pixelfx.frameSize, [448, 384]);
  assert.equal(sheet.png[25], 6);
  assert.ok(!rendered.frames[0].clear.some(v => v)); assert.ok(!rendered.frames.at(-1).clear.some(v => v));
});

save("records/noir-seam-pouch/checks.json", JSON.stringify({ passed: results.length, checks: results }, null, 2));
console.log(`${results.length} seam-pouch checks passed.`);
