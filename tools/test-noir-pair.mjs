#!/usr/bin/env node
// Public runtime and exporter regression checks for the two noir effects.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { effects } from "../src/fx/index.js";
import { effects as chinese, tags } from "../gallery/locales/zh-CN.js";
import { searchText } from "../gallery/i18n.js";
import { createFrame, clearFrame, createFx } from "../src/core/index.js";
import { loadEffect, renderFrames, spriteSheet, save } from "./lib/fxlib.mjs";

const ids = ["melee/noir-page-rend", "shadow/noir-shadow-stitch"], results = [];
const check = (name, fn) => { fn(); results.push(name); };
const bytes = a => Buffer.from(a.buffer, a.byteOffset, a.byteLength);
const hash = f => createHash("sha256").update(bytes(f.color)).update(bytes(f.light)).digest("hex");
const occupied = f => f.color.reduce((n, c) => n + !!(c >>> 24), 0);
function at(mod, t, opts = {}, frame = createFrame(768, 768), layer) {
  const instance = createFx(mod, { x: 384, y: 400, ...opts });
  instance.update(t); instance.draw(clearFrame(frame), layer);
  return frame;
}

for (const id of ids) {
  const fx = await loadEffect(id), mod = fx.mod, m = fx.meta;
  const before = JSON.stringify(m), label = text => `${id}: ${text}`;
  check(label("registered and searchable in Chinese and English"), () => {
    assert.equal(effects[id].meta.name, m.name);
    const text = searchText({ ...fx, cat: id.split("/")[0] });
    assert.ok(text.includes(chinese[id][0]));
    assert.ok(text.includes(m.name.toLowerCase()));
    assert.ok(text.includes("暗黑漫画"));
    assert.deepEqual(m.tags.filter(tag => !tags[tag]), []);
  });
  const frames = id.startsWith("melee") ? [8, 21, 40, 45, 60, 78] : [7, 24, 51, 70, 83, 100];
  for (const frame of frames) {
    const direct = at(mod, frame / m.fps), stepped = createFx(mod, { x: 384, y: 400 });
    for (let i = 0; i < frame; i++) stepped.update(1 / m.fps);
    const f = createFrame(768, 768); stepped.draw(f);
    check(label(`seek equals playback at frame ${frame}`), () => assert.equal(hash(f), hash(direct)));
    clearFrame(f); stepped.draw(f, "back"); stepped.draw(f, "front");
    check(label(`separate layers equal combined drawing at frame ${frame}`), () => assert.equal(hash(f), hash(direct)));
  }
  const sample = id.startsWith("melee") ? 1.2 : 2.3;
  for (const opts of [{}, { flip: true }, { angle: 0.8 }, { flip: true, angle: -0.48 }]) {
    const full = at(mod, sample, opts), cropped = at(mod, sample, opts, createFrame(220, 240, 300, 180));
    check(label(`world-space clipping with ${JSON.stringify(opts)}`), () => {
      assert.ok(occupied(full) > 1500);
      for (let y = 0; y < cropped.h; y++) for (let x = 0; x < cropped.w; x++) {
        const a = y * cropped.w + x, b = (y + cropped.oy) * full.w + x + cropped.ox;
        assert.equal(cropped.color[a], full.color[b]); assert.equal(cropped.light[a], full.light[b]);
      }
    });
  }
  check(label("translation follows the requested anchor"), () => {
    assert.equal(hash(at(mod, sample)), hash(at(mod, sample, { x: 401, y: 389 }, createFrame(768, 768, 17, -11))));
  });
  for (const key of ["palette", id.startsWith("melee") ? "rift" : "thread"]) {
    const original = at(mod, sample), recolored = at(mod, sample, { [key]: ["#162d30", "#55aaad", "#e5f1cc"] });
    check(label(`short ${key} ramp recolors without changing the silhouette`), () => {
      assert.notEqual(hash(original), hash(recolored));
      assert.deepEqual(original.color.map(c => c >>> 24), recolored.color.map(c => c >>> 24));
    });
  }
  check(label("seeds vary secondary detail deterministically"), () => {
    assert.notEqual(hash(at(mod, sample, { seed: 2 })), hash(at(mod, sample, { seed: 3 })));
    assert.equal(hash(at(mod, sample, { seed: 2 })), hash(at(mod, sample, { seed: 2 })));
  });
  for (const flip of [false, true]) for (const seed of [0, 7, m.options.seed]) {
    const [w, h] = m.size, pad = 24, f = createFrame(w + pad * 2, h + pad * 2, -pad, -pad);
    const instance = createFx(mod, { x: flip ? w - m.origin[0] : m.origin[0], y: m.origin[1], flip, seed });
    check(label(`every atlas frame fits, flip=${flip}, seed=${seed}`), () => {
      for (let i = 0; i <= Math.round(m.duration * m.fps); i++) {
        if (i) instance.update(1 / m.fps);
        instance.draw(clearFrame(f));
        for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) {
          if (x >= pad && x < w + pad && y >= pad && y < h + pad) continue;
          const a = y * f.w + x;
          assert.equal(f.color[a] >>> 24, 0, `frame ${i} spills color at ${x - pad},${y - pad}`);
          assert.equal(f.light[a] & 0xffffff, 0, `frame ${i} spills light at ${x - pad},${y - pad}`);
        }
      }
    });
  }
  for (const time of [0.2, sample, m.duration - 0.6]) {
    check(label(`stop fades and clears both layers at ${time}s`), () => {
      const instance = createFx(mod, { x: 384, y: 400 }), f = createFrame(768, 768);
      instance.update(time); instance.stop(); instance.update(0.1); instance.draw(f);
      assert.ok(!instance.done());
      assert.ok(occupied(f) > 0);
      assert.ok(f.color.some(c => (c >>> 24) > 0 && (c >>> 24) < 255));
      instance.update(0.21); instance.draw(clearFrame(f));
      assert.ok(instance.done()); assert.equal(occupied(f), 0);
      assert.ok(f.light.every(c => !(c & 0xffffff)));
    });
  }
  check(label("zero update and other instances do not alter the picture"), () => {
    const a = createFx(mod, { x: 384, y: 400 }), b = createFx(mod, { seed: 88 });
    a.update(sample); b.update(1.5); b.stop(); b.update(0.31); a.update(0);
    const f = createFrame(768, 768); a.draw(f);
    assert.equal(hash(f), hash(at(mod, sample)));
  });
  check(label("starts and ends completely transparent"), () => {
    for (const time of [0, m.duration, m.duration + 1]) {
      const f = at(mod, time); assert.equal(occupied(f), 0); assert.ok(f.light.every(c => !(c & 0xffffff)));
    }
  });
  for (const flip of [false, true]) {
    const r = renderFrames(fx, { options: { flip }, margin: flip ? 2 : 0 }), sheet = spriteSheet(fx, r, id.split("/")[1]);
    check(label(`transparent atlas preserves frames and pivot, flip=${flip}`), () => {
      assert.equal(r.n, id.startsWith("melee") ? 79 : 109);
      assert.equal(Object.keys(sheet.json.frames).length, r.n);
      assert.equal(sheet.json.meta.pixelfx.fps, 24);
      assert.equal(sheet.json.meta.pixelfx.loop, false);
      assert.deepEqual(sheet.json.meta.pixelfx.pivot, [m.origin[0] + (flip ? 2 : 0), m.origin[1] + (flip ? 2 : 0)]);
      assert.equal(sheet.png.readUInt32BE(16), sheet.json.meta.size.w);
      assert.equal(sheet.png.readUInt32BE(20), sheet.json.meta.size.h);
      assert.equal(sheet.png[25], 6);
      assert.equal(r.frames[0].clear.some(v => v), false);
      assert.equal(r.frames.at(-1).clear.some(v => v), false);
      assert.ok(r.frames[Math.round(sample * 24)].clear.some((v, i) => i % 4 === 3 && v === 255));
    });
  }
  check(label("metadata remains immutable"), () => assert.equal(JSON.stringify(m), before));
}

const slash = effects[ids[0]], stitch = effects[ids[1]];
check("page rend: the opening grows beyond the scratch and shuts before the scraps finish", () => {
  const scratch = occupied(at(slash, 0.5)), opened = occupied(at(slash, 1.1)), closed = occupied(at(slash, 2.1));
  assert.ok(opened > scratch * 8);
  assert.ok(closed > 20 && closed < opened * 0.12);
});
check("shadow stitch: four nails accumulate before the thread appears", () => {
  // Count each landing zone: a falling next nail is already visible in a full-frame count.
  for (const [i, [x, y]] of [[-142, -72], [139, -67], [145, 50], [-143, 55]].entries()) {
    const zone = () => createFrame(44, 64, 384 + x - 22, 400 + y - 54);
    assert.equal(occupied(at(stitch, stitch.cues.pins[i] - 0.18, {}, zone(), "front")), 0);
    assert.ok(occupied(at(stitch, stitch.cues.pins[i] + 0.04, {}, zone(), "front")) > 300);
  }
});
check("shadow stitch: cinching changes the shadow; released thread remains visible", () => {
  assert.notEqual(hash(at(stitch, 1.8, {}, undefined, "back")), hash(at(stitch, 2.5, {}, undefined, "back")));
  assert.ok(occupied(at(stitch, 3.8, {}, undefined, "front")) > 200);
});
save("records/noir-pair/checks.json", JSON.stringify({ passed: results.length, checks: results }, null, 2));
console.log(`${results.length} noir-pair checks passed.`);
