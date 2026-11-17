#!/usr/bin/env node
// Exercise the public runtime and exporter: seeking, layers, clipping, placement, recoloring and stop.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { effects } from "../src/fx/index.js";
import { effects as chinese, tags } from "../gallery/locales/zh-CN.js";
import { createFrame, clearFrame, createFx } from "../src/core/index.js";
import { loadEffect, renderFrames, spriteSheet, save } from "./lib/fxlib.mjs";

const ids = ["melee/comic-wind-fist", "arcane/comic-space-zipper", "lightning/comic-spring-cloud"];
const results = [];
const bytes = (array) => Buffer.from(array.buffer, array.byteOffset, array.byteLength);
const check = (name, fn) => { fn(); results.push(name); };
const count = (frame) => frame.color.reduce((n, c) => n + !!(c >>> 24), 0);
const hash = (frame) => createHash("sha256").update(bytes(frame.color)).update(bytes(frame.light)).digest("hex");
function frameAt(mod, t, opts = {}, frame = createFrame(768, 768)) {
  const fx = createFx(mod, { x: 384, y: 416, ...opts });
  fx.update(t); fx.draw(clearFrame(frame));
  return frame;
}

for (const id of ids) {
  const fx = await loadEffect(id), mod = fx.mod, m = fx.meta;
  const before = JSON.stringify(mod.meta), label = (what) => `${id}: ${what}`;
  check(label("registry and Chinese search text"), () => {
    assert.equal(effects[id].meta.name, m.name);
    assert.ok(chinese[id]?.[0] && chinese[id]?.[1]);
    assert.deepEqual(m.tags.filter((tag) => !tags[tag]), []);
  });
  for (const i of [5, 12, Math.round(mod.cues.impact ? mod.cues.impact * m.fps : 1.6 * m.fps), Math.round(m.duration * m.fps * 0.75)]) {
    const t = i / m.fps, direct = frameAt(mod, t);
    const stepper = createFx(mod, { x: 384, y: 416 }), stepped = createFrame(768, 768);
    for (let j = 0; j < i; j++) stepper.update(1 / m.fps);
    stepper.draw(stepped);
    check(label(`seek equals continuous playback at frame ${i}`), () => assert.equal(hash(stepped), hash(direct)));
    const layers = createFrame(768, 768);
    stepper.draw(layers, "back"); stepper.draw(layers, "front");
    check(label(`separate layers equal combined drawing at frame ${i}`), () => assert.equal(hash(layers), hash(direct)));
  }
  for (const opts of [{}, { flip: true }, { angle: Math.PI / 3 }, { flip: true, angle: -0.4, palette: ["#211527", "#cb6c96", "#fff"] }]) {
    const full = frameAt(mod, 1.6, opts);
    const crop = frameAt(mod, 1.6, opts, createFrame(210, 230, 300, 170));
    check(label(`cropped viewport matches full frame ${JSON.stringify(opts)}`), () => {
      for (let y = 0; y < crop.h; y++) for (let x = 0; x < crop.w; x++) {
        const a = y * crop.w + x, b = (y + crop.oy) * full.w + x + crop.ox;
        assert.equal(crop.color[a], full.color[b]); assert.equal(crop.light[a], full.light[b]);
      }
    });
    check(label(`transformed effect is visible ${JSON.stringify(opts)}`), () => assert.ok(count(full) > 200));
  }
  const normal = frameAt(mod, 1.6), recolored = frameAt(mod, 1.6, { palette: ["#211527", "#cb6c96", "#fff"] });
  check(label("short palette changes color and preserves coverage"), () => {
    assert.notEqual(hash(normal), hash(recolored));
    assert.deepEqual(normal.color.map((v) => v >>> 24), recolored.color.map((v) => v >>> 24));
  });
  check(label("seed changes secondary motion"), () => assert.notEqual(hash(frameAt(mod, 1.6, { seed: 2 })), hash(frameAt(mod, 1.6, { seed: 3 }))));
  for (const flip of [false, true]) for (const seed of [m.options.seed, 7]) {
    const [w, h] = m.size, f = createFrame(w + 48, h + 48, -24, -24);
    const inst = createFx(mod, { x: m.origin[0], y: m.origin[1], flip, seed });
    check(label(`every atlas frame fits: flip=${flip}, seed=${seed}`), () => {
      for (let i = 0; i <= Math.round(m.duration * m.fps); i++) {
        if (i) inst.update(1 / m.fps);
        inst.draw(clearFrame(f));
        for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
          if (x >= 24 && x < w + 24 && y >= 24 && y < h + 24) continue;
          assert.equal(f.color[y * f.w + x] >>> 24, 0, `frame ${i} spills at ${x - 24}, ${y - 24}`);
        }
      }
    });
  }
  const stopped = createFx(mod, { x: 384, y: 416 });
  stopped.update(0.7); stopped.stop(); stopped.update(0.1);
  const partial = createFrame(768, 768); stopped.draw(partial);
  check(label("stop fades before completion"), () => {
    assert.equal(stopped.done(), false);
    assert.ok(partial.color.some((c) => (c >>> 24) > 0 && (c >>> 24) < 255));
  });
  stopped.update(0.21); stopped.draw(clearFrame(partial));
  check(label("stop removes every pixel"), () => { assert.ok(stopped.done()); assert.equal(count(partial), 0); });
  check(label("one-shot ends empty"), () => assert.equal(count(frameAt(mod, m.duration + 0.5)), 0));
  const a = createFx(mod, { x: 384, y: 416 }), b = createFx(mod, { seed: 999, x: 384, y: 416 });
  a.update(1.6); b.update(0.5); b.stop(); b.update(0.31);
  const isolated = createFrame(768, 768); a.draw(isolated);
  check(label("another instance cannot change this instance"), () => assert.equal(hash(isolated), hash(normal)));
  const r = renderFrames(fx), sheet = spriteSheet(fx, r, id.split("/")[1]);
  check(label("transparent atlas and timing metadata"), () => {
    assert.equal(r.n, Math.round(m.duration * m.fps) + 1);
    assert.equal(Object.keys(sheet.json.frames).length, r.n);
    assert.equal(sheet.json.meta.pixelfx.fps, m.fps);
    assert.deepEqual(sheet.json.meta.pixelfx.pivot, m.origin);
    assert.equal(sheet.json.meta.pixelfx.loop, false);
    assert.equal(sheet.png.readUInt32BE(16), sheet.json.meta.size.w);
    assert.equal(sheet.png.readUInt32BE(20), sheet.json.meta.size.h);
    assert.equal(r.frames.at(-1).clear.some((v) => v), false);
    assert.ok(r.frames.some((f) => f.clear.some((v, i) => i % 4 === 3 && v > 0)));
  });
  check(label("metadata stays immutable"), () => assert.equal(JSON.stringify(mod.meta), before));
}
save("records/comic-trio/checks.json", JSON.stringify({ passed: results.length, checks: results }, null, 2));
console.log(`${results.length} comic-series checks passed.`);
