import { READY, ease, rand, smooth, sparkle } from "../../core/index.js";
import { NIGHT, EYES, part, point, bezier, swarmKit } from "./_bat-swarm.js";

export const timing = { scatter: 0.1, gather: 0.44, hit: 0.56, restored: 0.76, end: 1.2, displacement: 57, target: 79 };
const T = timing, X = T.displacement, TX = T.target;
export const meta = {
  name: "Bat reprisal",
  desc: "Scattered bats hook over the attack and dive back: a hand reforms first, silver claws strike in a brief freeze, and the rest of the body folds in behind it.",
  tags: ["move", "bat", "bat-form", "swarm", "shadow", "reprisal", "claw", "transform", "one-shot"],
  size: [244, 152], origin: [76, 124], duration: T.end, loop: false, fps: 30, bg: "ground", actor: 2,
  options: { palette: NIGHT, eyes: EYES, count: 16, body: true, seed: 31 },
};
const BRACE = { ...READY, crouch: 5, lean: -3, fx: 1, fy: -26, bx: 8, by: -23 };
const COCK = { ...READY, x: X - 3, crouch: 3, lean: -2, fx: -7, fy: -34, bx: 9, by: -24, weapon: "claw", sa: -1.5 };
const STRIKE = { ...READY, x: X, crouch: 4, lean: 4, fx: 17, fy: -24, bx: -5, by: -23, ffx: 11, fbx: -9, weapon: "claw", sa: 0.7 };
export const act = {
  target: { x: TX },
  poses: [
    [-0.22, READY], [-0.04, BRACE], [0, BRACE],
    [0.12, { ...BRACE, x: -7 }, "out"], [0.38, { ...COCK, x: X - 9 }, "line"],
    [T.gather, COCK, "snap"], [0.51, { ...COCK, fx: 10, fy: -36, lean: 1 }, "snap"],
    [T.hit, STRIKE, "snap"], [T.restored, { ...STRIKE, crouch: 5 }],
    [1.03, { ...READY, x: X, weapon: "claw", sa: 0.3 }],
    [1.3, { ...READY, x: X }],
  ],
  hits: [{ t: T.hit, stop: 0.08, shake: 0.16, amp: 2, push: 2.6, straw: 11, skin: "shadow", y: -25 }],
};
export const actorAlpha = (t) => t < T.restored ? 0 : 1;

export function create(o) {
  const K = swarmKit(o, act.poses), { C, E } = K;
  const path = (tt, b) => {
    if (tt < b.delay * 0.5 || tt >= T.restored) return null;
    const a = [-15 + Math.cos(b.fan) * 19, -28 + Math.sin(b.fan) * 22];
    let p = point(b.home, a, ease.outCubic(part(tt, b.delay * 0.5, 0.15)));
    if (tt >= 0.15) {
      const u = part(tt, 0.15 + b.delay + b.f * 0.07, T.hit + b.f * 0.07);
      p = bezier(a, [12 + b.f * 25, -83 + b.lane], [TX + 39, -70 + b.lane], [TX, -25 + b.lane * 0.2], ease.inOutSine(u));
      const spread = Math.sin(u * Math.PI);
      p[0] += Math.sin(b.f * 11 + b.wobble) * 7 * spread;
      p[1] += Math.cos(b.f * 9 + b.wobble) * 6 * spread;
    }
    if (tt >= T.hit + b.f * 0.07) {
      const u = part(tt, T.hit + b.f * 0.07, T.restored - b.delay * 0.5);
      p = bezier([TX, -25 + b.lane * 0.2], [TX + 12, -17 + b.lane], [X - 7, -40 + b.lane], [X + b.home[0], b.home[1]], ease.outCubic(u));
    }
    return { x: p[0], y: p[1], a: smooth(b.delay * 0.5, 0.07 + b.delay, tt) * (1 - smooth(0.65 - b.delay, T.restored - b.delay * 0.5, tt)) };
  };
  function strike(p, t) {
    const age = t - T.hit;
    if (age < -0.04 || age > 0.48) return;
    // Three hooked cuts share the same contact beat; only their fading tails are staggered.
    for (let j = 0; j < 3; j++) {
      const u = part(age, -0.04 + j * 0.006, 0.11 + j * 0.015), a = 1 - smooth(0.04, 0.22 + j * 0.02, age);
      if (a <= 0) continue;
      const pts = [];
      for (let i = 0; i <= 15; i++) {
        const v = i / 15;
        if (v > ease.outCubic(u)) break;
        pts.push([TX - 18 + j * 5 + v * 25, -46 + j * 2 + 29 * v + 7 * Math.sin(v * Math.PI)]);
      }
      if (pts.length > 1) {
        p.polyline(pts.map(([x, y]) => [x - 1, y + 1]), C[1], a);
        p.polyline(pts, age < 0.05 ? C[6] : C[4], a);
      }
    }
    if (age >= 0 && age < 0.10) {
      const a = 1 - age / 0.10;
      sparkle(p, TX, -25, 8 * a, C[6], E[2], 0.35 * a);
      p.glow(TX, -25, 22, C[4], 0.22 * a);
    }
    if (age >= 0) for (let i = 0; i < 12; i++) {
      const life = 0.22 + rand(i, o.seed) * 0.25;
      if (age >= life) continue;
      const angle = -1.8 + rand(i, 8) * 3, speed = 28 + rand(i, 9) * 80;
      const x = TX + Math.cos(angle) * speed * age, y = -25 + Math.sin(angle) * speed * age + 65 * age * age;
      p.line(x - Math.cos(angle) * 2, y - Math.sin(angle) * 2, x, y, i % 3 ? C[4] : E[2], 1 - age / life);
    }
  }
  return {
    drawBack(p, t) {
      if (t >= T.end) return;
      K.dust(p, t, 0.025, 0, -1); K.dust(p, t, T.hit, X, 1);
      K.flock(p, t, path, "back");
    },
    draw(p, t) {
      if (t >= T.end) return;
      K.body(p, t, T.scatter, T.gather, T.restored, true);
      K.husk(p, t, 0.08, 0.16);
      K.flock(p, t, path, "front");
      strike(p, t);
      K.heart(p, X, -24, smooth(0.6, 0.73, t) * (1 - smooth(0.79, 0.98, t)));
    },
  };
}
