import { READY, ease, smooth } from "../../core/index.js";
import { NIGHT, EYES, part, point, swarmKit } from "./_bat-swarm.js";

export const timing = { scatter: 0.08, gather: 0.30, restored: 0.5, end: 0.8, displacement: -34 };
const T = timing, X = T.displacement;
export const meta = {
  name: "Startled bat escape",
  desc: "A blow passes through a hollow silhouette: the body bursts into silver-edged bats, slips backwards, then folds together around a red heartbeat.",
  tags: ["move", "bat", "bat-form", "swarm", "shadow", "dodge", "transform", "one-shot"],
  size: [188, 124], origin: [112, 100], duration: T.end, loop: false, fps: 30, bg: "ground", actor: 2,
  options: { palette: NIGHT, eyes: EYES, count: 14, body: true, seed: 19 },
};
const BRACE = { ...READY, lean: -3, crouch: 5, fx: 1, fy: -27, bx: 9, by: -25 };
export const act = {
  poses: [
    [-0.18, READY], [-0.035, BRACE], [0, BRACE],
    [0.08, { ...BRACE, x: -3 }, "snap"], [0.19, { ...BRACE, x: -12 }, "line"],
    [T.gather, { ...BRACE, x: X, crouch: 3 }, "out"],
    [T.restored, { ...READY, x: X, crouch: 5, lean: -2 }],
    [0.72, { ...READY, x: X }], [0.9, { ...READY, x: X }],
  ],
};
export const actorAlpha = (t) => t < T.restored ? 0 : 1;

export function create(o) {
  const K = swarmKit(o, act.poses), { C } = K;
  const path = (tt, b) => {
    const birth = b.delay * 0.65, u = part(tt, birth, 0.18);
    if (tt < birth || tt >= T.restored) return null;
    const spread = [Math.cos(b.fan) * b.radius, -25 + Math.sin(b.fan) * b.radius * 0.65];
    let p = point(b.home, spread, ease.outCubic(u));
    if (tt > 0.18) {
      const v = part(tt, 0.18, T.restored - b.delay), bend = Math.sin(v * Math.PI);
      p = point(spread, [X + b.home[0], b.home[1]], ease.inOutSine(v));
      p[1] -= bend * (8 + b.i % 3 * 3);
    }
    return { x: p[0], y: p[1], a: smooth(birth, birth + 0.04, tt) * (1 - smooth(0.38 - b.delay, T.restored - b.delay, tt)) };
  };
  return {
    drawBack(p, t) {
      if (t >= T.end) return;
      K.dust(p, t, 0.015, 0, 1); K.dust(p, t, T.gather, X, -1);
      K.flock(p, t, path, "back");
    },
    draw(p, t) {
      if (t >= T.end) return;
      K.body(p, t, T.scatter, T.gather, T.restored);
      K.husk(p, t, 0.065, 0.15);
      // The attack's narrow wake traverses the space the torso has just vacated.
      if (t >= 0.07 && t < 0.22) {
        const u = part(t, 0.07, 0.22), x = 44 - 64 * ease.outCubic(u), a = Math.sin(Math.PI * u);
        p.line(x, -27, x + 23 * (1 - u), -35, C[5], 0.9 * a);
        p.line(x + 7, -23, x + 29 * (1 - u), -30, C[2], 0.6 * a);
      }
      K.flock(p, t, path, "front");
      K.heart(p, X, -24, smooth(T.gather, 0.43, t) * (1 - smooth(0.48, 0.68, t)));
    },
  };
}
