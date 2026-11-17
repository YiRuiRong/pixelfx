#!/usr/bin/env node
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { performance } from "node:perf_hooks";
import { effects } from "../src/fx/index.js";
import { effects as chinese, tags } from "../gallery/locales/zh-CN.js";
import { searchText } from "../gallery/i18n.js";
import { createFrame, clearFrame, createFx } from "../src/core/index.js";
import { loadEffect, renderFrames, spriteSheet, save } from "./lib/fxlib.mjs";

const id = "arcane/delayed-reflection", fx = await loadEffect(id), mod = fx.mod, m = fx.meta;
const results = [], check = (name, fn) => { fn(); results.push(name); };
const bytes = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
const hash = f => createHash("sha256").update(bytes(f.color)).update(bytes(f.light)).digest("hex");
const occupied = f => f.color.reduce((n, c) => n + !!(c >>> 24), 0);
const empty = f => !f.color.some(c => c >>> 24) && !f.light.some(c => c & 0xffffff);
function at(t, options = {}, frame = createFrame(768, 768), layer) {
  const inst = createFx(mod, { x: 384, y: 400, ...options });
  inst.update(t); inst.draw(clearFrame(frame), layer); return frame;
}
const before = JSON.stringify(m), phases = [10, 37, 46, 59, 84, 104, 128, 148];
check("registered effect, Chinese search and complete translation coverage", () => {
  assert.ok(effects[id]);
  const text = searchText({ ...fx, cat: "arcane" });
  for (const word of ["迟到的倒影", "镜面", "天空", "delayed reflection"]) assert.ok(text.includes(word));
  for (const [key, effect] of Object.entries(effects)) {
    assert.ok(chinese[key], `missing effect ${key}`);
    for (const tag of effect.meta.tags) assert.ok(tags[tag], `missing tag ${tag}`);
  }
});
for (const frame of phases) {
  check(`seek and continuous playback match at frame ${frame}`, () => {
    const expected = at(frame / 24), inst = createFx(mod, { x: 384, y: 400 }), actual = createFrame(768, 768);
    for (let i = 0; i < frame; i++) inst.update(1 / 24);
    inst.draw(actual); assert.equal(hash(actual), hash(expected));
  });
  check(`front and back compose correctly at frame ${frame}`, () => {
    const expected = at(frame / 24), inst = createFx(mod, { x: 384, y: 400 }), actual = createFrame(768, 768);
    inst.update(frame / 24); inst.draw(actual, "back"); inst.draw(actual, "front");
    assert.equal(hash(actual), hash(expected));
  });
}
for (const options of [{}, { flip: true }, { angle: 0.65 }, { flip: true, angle: -0.4 }]) {
  check(`clipping preserves pixels after transform ${JSON.stringify(options)}`, () => {
    for (const time of [1.75, 3.65]) {
      const full = at(time, options), part = at(time, options, createFrame(180, 240, 300, 180));
      assert.ok(occupied(full) > 5000);
      for (let y = 0; y < part.h; y++) for (let x = 0; x < part.w; x++) {
        const a = y * part.w + x, b = (y + part.oy) * full.w + x + part.ox;
        assert.equal(part.color[a], full.color[b]); assert.equal(part.light[a], full.light[b]);
      }
    }
  });
}
for (const flip of [false, true]) for (const seed of [0, 7, m.options.seed]) {
  check(`all 157 frames fit the atlas, flip=${flip}, seed=${seed}`, () => {
    const [w, h] = m.size, pad = 32, f = createFrame(w + 64, h + 64, -pad, -pad);
    const inst = createFx(mod, { x: m.origin[0], y: m.origin[1], flip, seed });
    const outside = [];
    for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (x < pad || x >= pad + w || y < pad || y >= pad + h) outside.push(y * f.w + x);
    for (let frame = 0; frame <= 156; frame++) {
      if (frame) inst.update(1 / m.fps);
      inst.draw(clearFrame(f));
      for (const i of outside) {
        assert.equal(f.color[i] >>> 24, 0, `frame ${frame} spills color at ${i % f.w - pad},${Math.floor(i / f.w) - pad}`);
        assert.equal(f.light[i] & 0xffffff, 0, `frame ${frame} spills light`);
      }
    }
  });
}
for (const key of ["palette", "sunlight"]) check(`short ${key} ramp recolors without changing geometry`, () => {
  const original = at(2.5), recolored = at(2.5, { [key]: ["#2b264a", "#9867a0", "#f4e8f4"] });
  assert.notEqual(hash(original), hash(recolored));
  assert.deepEqual(original.color.map(v => v >>> 24), recolored.color.map(v => v >>> 24));
});
check("seed changes shards reproducibly", () => {
  assert.equal(hash(at(3.8, { seed: 23 })), hash(at(3.8, { seed: 23 })));
  assert.notEqual(hash(at(3.8, { seed: 23 })), hash(at(3.8, { seed: 24 })));
});
check("moving clouds survive the break while fragment geometry stays fixed", () => {
  for (const time of [1.9, 3.6, 4.3]) {
    const moving = at(time, { reflection: false }), still = at(time, { cloudSpeed: 0, reflection: false });
    assert.deepEqual(moving.color.map(v => v >>> 24), still.color.map(v => v >>> 24));
    let changed = 0;
    // Above the floor, inside the glass: exclude additive glints and puddles.
    for (let y = 80; y < 360; y++) for (let x = 180; x < 440; x++) {
      const i = y * moving.w + x;
      if ((moving.color[i] >>> 24) > 190 && moving.color[i] !== still.color[i]) changed++;
    }
    assert.ok(changed > 300, `no moving cloud detail at ${time}s: ${changed}`);
  }
});
check("optional reflected figure changes only colors inside the mirror", () => {
  const a = at(1.1), b = at(1.1, { reflection: false });
  assert.notEqual(hash(a), hash(b));
  assert.deepEqual(a.color.map(v => v >>> 24), b.color.map(v => v >>> 24));
  assert.equal(hash(at(3.6)), hash(at(3.6, { reflection: false })));
});
check("a visible mirrored cut precedes an external blade by a half-second hold", () => {
  assert.ok(mod.cues.release - mod.cues.reflectedHold >= 0.5);
  const zone = () => createFrame(160, 105, 430, 210);
  for (const time of [1.3, 1.75, 2.1]) assert.ok(empty(at(time, {}, zone(), "front")));
  assert.ok(occupied(at(2.55, {}, zone(), "front")) > 200);
  const gold = time => {
    const f = at(time); let n = 0;
    for (let y = 234; y < 265; y++) for (let x = 265; x < 389; x++) {
      const c = f.color[y * f.w + x];
      // The hottest core is nearly white; hue alone would misclassify it as blue sky.
      if ((c & 255) > 245 && ((c >>> 8) & 255) > 240) n++;
    }
    return n;
  };
  assert.ok(gold(1.8) > gold(1.1) + 100);
});
check("water reflection is behind the glass and rain lands before ripples", () => {
  const sky = () => createFrame(180, 240, 235, 120), floor = () => createFrame(300, 70, 220, 380);
  assert.ok(empty(at(1.9, {}, sky(), "back")));
  assert.ok(occupied(at(1.9, {}, floor(), "back")) > 500);
  assert.ok(empty(at(4.8, {}, floor(), "back")));
  assert.ok(occupied(at(5.9, {}, floor(), "back")) > 200);
});
for (const time of [0.5, 1.75, 2.5, 3.7, 5.2]) check(`stop clears color and light in both layers at ${time}s`, () => {
  const inst = createFx(mod, { x: 384, y: 400 }), f = createFrame(768, 768);
  inst.update(time); inst.stop(); inst.update(0.1); inst.draw(f);
  assert.ok(occupied(f) > 0);
  inst.update(0.21); inst.draw(clearFrame(f)); assert.ok(inst.done()); assert.ok(empty(f));
});
check("zero light retains glass and the blade without glow", () => {
  for (const time of [1.75, 2.55, 3.8]) {
    const f = at(time, { light: 0 }); assert.ok(occupied(f) > 3000); assert.ok(!f.light.some(c => c & 0xffffff));
  }
});
check("first and last frames are completely transparent; the tail fades before ending", () => {
  for (const time of [0, m.duration, m.duration + 1]) assert.ok(empty(at(time)));
  assert.ok(occupied(at(6.4)) < occupied(at(6.0)));
  assert.ok(empty(at(6.499)));
});
check("instances and caller options are isolated", () => {
  const options = { x: 384, y: 400, palette: ["#123", "#acf"] }, json = JSON.stringify(options);
  const a = createFx(mod, options), b = createFx(mod, { seed: 77, cloudSpeed: 0 });
  a.update(3.3); b.update(4); b.stop(); b.update(0.5);
  const frame = createFrame(768, 768); a.draw(frame);
  assert.equal(hash(frame), hash(at(3.3, options)));
  assert.equal(JSON.stringify(options), json); assert.equal(JSON.stringify(m), before);
});
let atlas;
check("RGBA atlas has 157 frames, correct pivot, and empty endpoints", () => {
  const rendered = renderFrames(fx), sheet = spriteSheet(fx, rendered, "delayed-reflection");
  assert.equal(rendered.n, 157); assert.equal(sheet.json.frames.length, 157);
  assert.equal(sheet.json.meta.pixelfx.fps, 24);
  assert.deepEqual(sheet.json.meta.pixelfx.pivot, [240, 304]);
  assert.deepEqual(sheet.json.meta.pixelfx.frameSize, [480, 384]);
  assert.equal(sheet.png[25], 6);
  assert.ok(!rendered.frames[0].clear.some(v => v)); assert.ok(!rendered.frames.at(-1).clear.some(v => v));
  atlas = sheet.json.meta.pixelfx;
});
const inst = createFx(mod, { x: m.origin[0], y: m.origin[1] }), f = createFrame(480, 384), timings = [];
for (let i = 0; i < 156; i++) {
  inst.update(1 / 24); clearFrame(f); const start = performance.now(); inst.draw(f); timings.push(performance.now() - start);
}
timings.sort((a, b) => a - b);
save("records/delayed-reflection/checks.json", JSON.stringify({ passed: results.length, checks: results, atlas, drawMs: { median: timings[78], p95: timings[148] } }, null, 2));
console.log(`${results.length} delayed-reflection checks passed; median draw ${timings[78].toFixed(2)} ms.`);
