#!/usr/bin/env node
// Regression checks for transformation ownership, clock boundaries and the reusable cruise loop.
import assert from "node:assert/strict";
import { createAct, createFx, createFrame, clearFrame, hex } from "../src/core/index.js";
import * as dodge from "../src/fx/moves/bat-dodge.js";
import * as flight from "../src/fx/moves/bat-nightflight.js";
import * as reprisal from "../src/fx/moves/bat-reprisal.js";
import { renderAct, renderFrames, spriteSheet } from "./lib/fxlib.mjs";

const W = 512, H = 224, X = 200, Y = 176;
function snapshot(mod, time, options = {}, step = null) {
  const fx = createFx(mod, { x: X, y: Y, ...options });
  if (step) {
    const n = Math.round(time / step);
    for (let i = 0; i < n; i++) fx.update(time / n);
  } else fx.update(time);
  const f = createFrame(W, H);
  fx.draw(f);
  return f;
}
const occupied = (f) => f.color.reduce((n, c) => n + ((c >>> 24) > 0), 0);
const same = (a, b, reason) => {
  assert.deepEqual(a.color, b.color, reason);
  assert.deepEqual(a.light, b.light, reason);
};
// Different dt sums can straddle an 8-bit blend rounding boundary by floating-point epsilon.
const sameWithinByte = (a, b, reason) => {
  for (const key of ["color", "light"]) for (let i = 0; i < a[key].length; i++) {
    for (const shift of [0, 8, 16, 24]) assert.ok(Math.abs(((a[key][i] >>> shift) & 255) - ((b[key][i] >>> shift) & 255)) <= 1, reason);
  }
};

// Non-body acts must respect actorAlpha while keeping their front/back layers visible.
const probe = (alpha) => ({
  meta: { duration: 1, size: [100, 80], origin: [50, 60], actor: 2 },
  act: { poses: [[-0.1, {}], [1, {}]] }, actorAlpha: () => alpha,
  drawBack(p) { p.px(-30, -20, hex("#ff0000")); },
  draw(p) { p.px(30, -20, hex("#00ff00")); },
});
function actFrame(mod, elapsed) {
  const a = createAct(mod, { x: X, y: Y }); a.update(elapsed);
  const f = createFrame(W, H); a.draw(f); return f;
}
const hidden = actFrame(probe(0), 0.2), visible = actFrame(probe(1), 0.2), partial = actFrame(probe(0.5), 0.2);
const aboveFloor = (f) => f.color.slice(0, Y * W).filter((c) => c >>> 24).length;
assert.equal(aboveFloor(hidden), 2, "hidden body must leave only the two effect layers");
assert.ok(aboveFloor(partial) > 2 && aboveFloor(partial) < aboveFloor(visible), "partial alpha must dither the posed body");
assert.ok(aboveFloor(actFrame(probe(0), 0.01)) > 100, "the actor must remain visible during anticipation");

for (const mod of [dodge, flight, reprisal]) {
  const { restored, end } = mod.timing, t = 0.24;
  const original = snapshot(mod, t);
  assert.ok(occupied(original) > 100, `${mod.meta.name}: visible swarm`);
  same(original, snapshot(mod, t), "same seed must reproduce the frame");
  sameWithinByte(original, snapshot(mod, t, {}, 1 / 120), "frame subdivision must not change closed-form motion");
  assert.notDeepEqual(original.color, snapshot(mod, t, { seed: 90 }).color, "seed must vary the flock");
  const stop = snapshot(mod, end);
  assert.equal(occupied(stop), 0, "one-shots must finish empty");
  assert.ok(stop.light.every((c) => !(c & 0xffffff)), "no leftover light after completion");
  for (const fps of [30, 60, 120]) {
    const a = createAct(mod, { x: X, y: Y }), f = createFrame(W, H);
    let seenReturn = false, hitCount = 0;
    a.onHit = () => hitCount++;
    for (let i = 0; i < fps * 4 && !a.done(); i++) {
      a.update(1 / fps);
      if (a.t >= restored - 0.025 && a.t <= restored + 0.06) {
        a.draw(clearFrame(f), { target: false });
        assert.ok(aboveFloor(f) > 80, `${mod.meta.name}: no empty frame at body handoff (${fps} fps)`);
        seenReturn = true;
      }
      if (a.frozen) {
        const before = a.t;
        a.update(1 / fps);
        assert.equal(a.t, before, "hit-stop must freeze character and effect time together");
      }
    }
    assert.ok(a.done() && seenReturn, "act must return to a visible actor and finish");
    assert.equal(a.pose.x, mod.timing.displacement, "the actor must finish at the displacement endpoint");
    assert.equal(hitCount, mod.act.hits?.length ?? 0, "damage events fire exactly once");
  }
  // All layers, wings, body fragments and lights share the same mirror transform.
  const a = snapshot(mod, 0.32), b = snapshot(mod, 0.32, { flip: true });
  let changed = 0, union = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < X * 2; x++) {
    const i = y * W + x, j = y * W + (2 * X - 1 - x);
    if (a.color[i] || b.color[j]) union++;
    if (a.color[i] !== b.color[j]) changed++;
  }
  // Bayer-dithered trail pixels stay anchored to the screen; solid sprites still mirror exactly.
  assert.ok(changed / union < 0.04, "mirroring must preserve the flock, allowing screen-space trail dithering");
  const bare = snapshot(mod, 0, { body: false });
  assert.equal(occupied(bare), 0, "body:false must omit character fragments from a standalone effect");
  const mask = { w: 8, h: 12, data: new Uint8Array(96).fill(1) }, own = hex("#21f2a0") >>> 0;
  const custom = snapshot(mod, 0, { actor: { mask, pixels: new Uint32Array(96).fill(own), x: -4, y: -12, w: 8, h: 12 } });
  assert.ok(custom.color.some((c) => c === own), "supplied actor pixels must retain their colors");
  console.log(`ok  ${mod.meta.name}: seeds, timing, body handoff, mirror, custom sprite, end`);
}

// Export framing must move the pivot too: a left-facing dash otherwise leaves its atlas cell.
for (const [id, mod] of [["bat-dodge", dodge], ["bat-nightflight", flight], ["bat-reprisal", reprisal]]) {
  const fx = { id: `moves/${id}`, mod, meta: mod.meta };
  for (const render of [renderFrames, renderAct]) {
    const opts = { bg: "none", target: false, fps: 30, hold: 0 };
    const normal = render(fx, opts), mirrored = render(fx, { ...opts, options: { flip: true } });
    assert.equal(mirrored.pivot[0], normal.w - normal.pivot[0], "mirror exports must reflect the pivot");
    const footprint = (rgba, w) => {
      let n = 0, sumX = 0;
      for (let i = 3; i < rgba.length; i += 4) if (rgba[i] >= 32) { n++; sumX += ((i - 3) / 4) % w; }
      return { n, x: sumX / n };
    };
    for (let i = 0; i < normal.n; i++) {
      const a = footprint(normal.frames[i].clear, normal.w), b = footprint(mirrored.frames[i].clear, mirrored.w);
      if (a.n < 80) continue;
      assert.ok(Math.abs(a.n - b.n) <= Math.max(8, a.n * 0.06), `${id}: mirror must retain the full frame at ${i}`);
      assert.ok(Math.abs(a.x + b.x - (normal.w - 1)) < 2, `${id}: mirror must stay centered in its export at ${i}`);
    }
    assert.deepEqual(spriteSheet(fx, mirrored, id).json.meta.pixelfx.pivot, mirrored.pivot, "atlas JSON must preserve the actual export pivot");
  }
  console.log(`ok  ${id}: mirrored preview/export framing and atlas pivot`);
}

const cruise = flight.flight, D = cruise.meta.duration;
same(snapshot(cruise, 0), snapshot(cruise, D), "cruise must return to exactly the same frame");
sameWithinByte(snapshot(cruise, 0.4), snapshot(cruise, D * 3 + 0.4), "cruise phase must not drift between cycles");
const loop = createFx(cruise, { x: X, y: Y });
loop.update(20); assert.ok(!loop.done(), "cruise persists until explicitly stopped");
loop.stop(); loop.update(0.31);
const stopped = createFrame(W, H); loop.draw(stopped);
assert.ok(loop.done()); assert.equal(occupied(stopped), 0, "stopped cruise must fade empty");
console.log("ok  nightflight cruise: exact seam, repeated cycles, stop/fade");
console.log("All bat move regression checks passed.");
