#!/usr/bin/env node
// Public runtime/export checks, including connected machinery, contact timing and atlas clipping.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { effects } from "../src/fx/index.js";
import { effects as chinese, tags } from "../gallery/locales/zh-CN.js";
import { createFrame, clearFrame, createFx, fit } from "../src/core/index.js";
import { loadEffect, renderFrames, spriteSheet, save } from "./lib/fxlib.mjs";

const id = "melee/steam-piston-hammer", fx = await loadEffect(id), mod = fx.mod, m = fx.meta;
const results = [], before = JSON.stringify(m), bytes = (a) => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
const hash = (f) => createHash("sha256").update(bytes(f.color)).update(bytes(f.light)).digest("hex");
const count = (f) => f.color.reduce((n, c) => n + !!(c >>> 24), 0);
const check = (name, fn) => { fn(); results.push(name); };
function at(t, opts = {}, f = createFrame(768, 768), layer) {
  const inst = createFx(mod, { x: 384, y: 416, ...opts });
  inst.update(t); inst.draw(clearFrame(f), layer);
  return f;
}

check("registered with Chinese name, description and translated tags", () => {
  assert.equal(effects[id].meta.name, m.name);
  assert.equal(chinese[id][0], "活塞重锤");
  assert.ok(chinese[id][1]);
  assert.deepEqual(m.tags.filter((tag) => !tags[tag]), []);
});
for (const i of [9, 26, 33, 36, 37, 38, 45, 62, 87, 96]) {
  const direct = at(i / m.fps), inst = createFx(mod, { x: 384, y: 416 });
  for (let j = 0; j < i; j++) inst.update(1 / m.fps);
  const stepped = createFrame(768, 768); inst.draw(stepped);
  check(`direct seek equals continuous playback at frame ${i}`, () => assert.equal(hash(stepped), hash(direct)));
  const layers = createFrame(768, 768);
  inst.draw(layers, "back"); inst.draw(layers, "front");
  check(`separate layers equal combined drawing at frame ${i}`, () => assert.equal(hash(layers), hash(direct)));
}

for (const opts of [{}, { flip: true }, { angle: Math.PI / 3 }, { flip: true, angle: -0.4 }]) {
  const full = at(1.9, opts), crop = at(1.9, opts, createFrame(210, 230, 300, 170));
  check(`viewport clipping preserves transformed pixels: ${JSON.stringify(opts)}`, () => {
    for (let y = 0; y < crop.h; y++) for (let x = 0; x < crop.w; x++) {
      const a = y * crop.w + x, b = (y + crop.oy) * full.w + x + crop.ox;
      assert.equal(crop.color[a], full.color[b]); assert.equal(crop.light[a], full.light[b]);
    }
    assert.ok(count(full) > 1000);
  });
}
check("integer placement translates the whole effect", () => {
  const moved = at(1.9, { x: 403, y: 399 }, createFrame(768, 768, 19, -17));
  assert.equal(hash(moved), hash(at(1.9)));
});
for (const key of ["palette", "iron", "steam", "soot", "heat"]) {
  const original = at(1.9), recolored = at(1.9, { [key]: ["#251332", "#a85c91", "#fff"] });
  check(`short ${key} ramp recolors without changing coverage`, () => {
    assert.notEqual(hash(original), hash(recolored));
    assert.deepEqual(original.color.map((v) => v >>> 24), recolored.color.map((v) => v >>> 24));
  });
}
check("seed changes debris while preserving deterministic replay", () => {
  assert.notEqual(hash(at(1.9, { seed: 2 })), hash(at(1.9, { seed: 3 })));
  assert.equal(hash(at(1.9, { seed: 2 })), hash(at(1.9, { seed: 2 })));
});

for (const flip of [false, true]) for (const seed of [0, 7, m.options.seed, 999]) {
  const [w, h] = m.size, f = createFrame(w + 48, h + 48, -24, -24);
  const inst = createFx(mod, { x: m.origin[0], y: m.origin[1], flip, seed });
  check(`every atlas frame fits: flip=${flip}, seed=${seed}`, () => {
    for (let i = 0; i <= Math.round(m.duration * m.fps); i++) {
      if (i) inst.update(1 / m.fps);
      inst.draw(clearFrame(f));
      for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
        if (x >= 24 && x < w + 24 && y >= 24 && y < h + 24) continue;
        const k = y * f.w + x;
        assert.equal(f.color[k] >>> 24, 0, `frame ${i} spills at ${x - 24}, ${y - 24}`);
        assert.equal(f.light[k] & 0xffffff, 0);
      }
    }
  });
}

// Observe dense iron rows in the rendered image, independently of the module's motion equations.
const iron = new Set(fit(m.options.iron, 8).map((v) => v >>> 0));
function headRow(f) {
  let last = -1;
  for (let y = 160; y < 416; y++) {
    let n = 0;
    for (let x = 284; x < 484; x++) n += iron.has(f.color[y * f.w + x]);
    if (n > 65) last = y;
  }
  assert.ok(last > 200, "the broad iron head must remain visible");
  return last;
}
for (const t of [0.38, 0.75, 1.15, 1.375, 1.5, 1.75, 2.5, 3.15]) {
  check(`piston connects housing to hammer at t=${t}`, () => {
    const f = at(t, {}, undefined, "front"), bottom = headRow(f);
    for (let y = 100; y < bottom; y++) {
      let solid = false;
      for (let x = 382; x <= 386; x++) solid ||= (f.color[y * f.w + x] >>> 24) === 255;
      assert.ok(solid, `visible break in mechanism at row ${y}`);
    }
  });
}
check("head holds, accelerates into contact and rises slowly", () => {
  const row = (t) => headRow(at(t, {}, undefined, "front"));
  assert.equal(row(1.15), row(1.3));
  const slow = row(35 / 24) - row(34 / 24), fast = row(37 / 24) - row(36 / 24);
  assert.ok(slow > 0 && fast > slow * 2, `last-frame descent ${fast} should exceed early descent ${slow}`);
  assert.ok(row(1.75) > row(1.3) + 60);
  assert.ok(row(2.15) > row(2.65) + 20);
});

for (const t of [0.85, 1.62, 2.55]) {
  const inst = createFx(mod, { x: 384, y: 416 });
  inst.update(t); inst.stop(); inst.update(0.1);
  const f = createFrame(768, 768); inst.draw(f);
  check(`stop fades all active layers at t=${t}`, () => {
    assert.equal(inst.done(), false);
    assert.ok(count(f) > 0);
    assert.ok(f.color.every((c) => (c >>> 24) < 255));
    inst.update(0.21); inst.draw(clearFrame(f));
    assert.equal(inst.done(), true); assert.equal(count(f), 0);
  });
}
check("another instance cannot alter this instance", () => {
  const a = createFx(mod, { x: 384, y: 416 }), b = createFx(mod, { seed: 999, palette: ["#123", "#fff"] });
  a.update(1.9); b.update(1.3); b.stop(); b.update(0.31);
  const f = createFrame(768, 768); a.draw(f);
  assert.equal(hash(f), hash(at(1.9)));
});
check("zero update keeps the image unchanged", () => {
  const inst = createFx(mod, { x: 384, y: 416 }), f = createFrame(768, 768);
  inst.update(1.9); inst.draw(f); const beforePause = hash(f);
  inst.update(0); inst.draw(clearFrame(f)); assert.equal(hash(f), beforePause);
});
check("start, end and time after completion are transparent", () => {
  for (const t of [0, m.duration, m.duration + 1]) assert.equal(count(at(t)), 0);
});
const r = renderFrames(fx), sheet = spriteSheet(fx, r, "steam-piston-hammer");
check("export contains transparent frames and correct anchor and timing", () => {
  assert.equal(r.n, 97);
  assert.equal(Object.keys(sheet.json.frames).length, r.n);
  assert.equal(sheet.json.meta.pixelfx.fps, m.fps);
  assert.deepEqual(sheet.json.meta.pixelfx.pivot, m.origin);
  assert.equal(sheet.json.meta.pixelfx.loop, false);
  assert.equal(sheet.png.readUInt32BE(16), sheet.json.meta.size.w);
  assert.equal(sheet.png.readUInt32BE(20), sheet.json.meta.size.h);
  assert.equal(sheet.png[25], 6, "PNG must retain RGBA");
  assert.equal(r.frames.at(-1).clear.some((v) => v), false);
  assert.ok(r.frames[42].clear.some((v, i) => i % 4 === 3 && v === 255));
  assert.ok(r.frames[42].clear.some((v, i) => i % 4 === 3 && v === 0));
});
check("metadata is immutable", () => assert.equal(JSON.stringify(m), before));
save("records/steam-piston-hammer/checks.json", JSON.stringify({ passed: results.length, checks: results }, null, 2));
console.log(`${results.length} steam-piston-hammer checks passed.`);
