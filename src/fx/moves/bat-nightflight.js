import { READY, ease, poseAt, smooth, TAU } from "../../core/index.js";
import { NIGHT, EYES, part, point, swarmKit } from "./_bat-swarm.js";

export const timing = { scatter: 0.11, cruise: 0.17, gather: 0.76, restored: 1, end: 1.25, displacement: 128 };
const T = timing, X = T.displacement, PERIOD = 1.2;
export const meta = {
  name: "Nightflight",
  desc: "The body unravels into a tapered flock: three bats lead two rippling streams, then bank inward and brake, knitting the runner back together at the landing.",
  tags: ["move", "bat", "bat-form", "swarm", "shadow", "dash", "flight", "transform", "one-shot"],
  size: [280, 120], origin: [84, 96], duration: T.end, loop: false, fps: 30, bg: "ground", actor: 2,
  options: { palette: NIGHT, eyes: EYES, count: 14, body: true, seed: 23 },
};
const LOW = { ...READY, crouch: 6, lean: 4, fx: 3, fy: -23, bx: -5, by: -22, ffx: 10, fbx: -8 };
export const act = {
  poses: [
    [-0.22, READY], [-0.06, { ...LOW, lean: -2 }], [0, LOW, "snap"],
    [0.11, { ...LOW, x: 6 }, "in"], [0.19, { ...LOW, x: 22 }, "line"],
    [0.69, { ...LOW, x: 111 }, "line"], [T.gather, { ...LOW, x: 124 }, "out"],
    [0.88, { ...LOW, x: X, lean: -2, crouch: 5 }, "out"],
    [T.restored, { ...READY, x: X, crouch: 5, lean: -2 }],
    [1.25, { ...READY, x: X }], [1.4, { ...READY, x: X }],
  ],
};
export const actorAlpha = (t) => t < T.restored ? 0 : 1;

function formation(t, b) {
  const wave = t / PERIOD * TAU + b.wobble;
  const x = (b.i < 3 ? 16 - b.i * 10 : -10 - (b.f - 0.2) * 56) + Math.cos(wave) * (1 + b.f * 2);
  const y = -26 + (b.i < 3 ? [0, -5, 5][b.i] : Math.sign(b.lane) * (6 + b.f * 9)) + Math.sin(wave) * (1.5 + b.f * 2);
  return [x, y];
}
function make(o, looping) {
  const K = swarmKit(o, looping ? null : act.poses);
  const path = (tt, b) => {
    if (looping) { const p = formation(tt, b); return { x: p[0], y: p[1], a: 1 }; }
    if (tt < b.delay || tt >= T.restored) return null;
    const center = poseAt(act.poses, tt).x ?? 0, f = formation(tt, b);
    const gather = ease.inOutSine(part(tt, T.gather + b.delay * 0.5, T.restored - b.delay));
    let p = point(b.home, [center + f[0], f[1]], ease.outCubic(part(tt, b.delay, T.cruise)));
    p = point(p, [X + b.home[0], b.home[1]], gather);
    p[1] -= Math.sin(gather * Math.PI) * (b.i % 2 ? 7 : -5);
    return { x: p[0], y: p[1], a: smooth(b.delay, b.delay + 0.045, tt) * (1 - smooth(0.89 - b.delay, T.restored - b.delay, tt)) };
  };
  return {
    drawBack(p, t) {
      if (!looping && t >= T.end) return;
      if (!looping) { K.dust(p, t, 0.04, 0, -1); K.dust(p, t, T.gather, X, 1); }
      K.flock(p, t, path, "back");
    },
    draw(p, t) {
      if (!looping && t >= T.end) return;
      if (!looping) K.body(p, t, T.scatter, T.gather, T.restored);
      K.flock(p, t, path, "front");
      if (!looping) {
        const x = poseAt(act.poses, t).x ?? 0;
        K.heart(p, x + 2, -26, smooth(0.11, 0.2, t) * (1 - smooth(0.95, 1.12, t)) * 0.7);
      } else K.heart(p, 2, -26, 0.55 + 0.12 * Math.sin(t / PERIOD * TAU));
    },
  };
}
export const create = (o) => make(o, false);

// Mount this companion module on a moving entity for a sustained flight; stop() fades it out.
// The registered move above is the complete takeoff / travel / landing performance.
export const flight = {
  meta: { ...meta, name: "Nightflight cruise", desc: "A seamless travelling bat formation, ready to attach to the player's moving position.",
    size: [176, 104], origin: [104, 82], duration: PERIOD, loop: true },
  actorAlpha: () => 0,
  create: (o) => make(o, true),
};
