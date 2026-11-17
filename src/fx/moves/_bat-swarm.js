// Shared art for the three bat moves. Four held wing drawings, banked in whole steps;
// body fragments follow the same pose track as the act, so the handoff never changes stance.
import { clamp, ease, fit, lerp, mix, posed, poseAt, rand, Rng, stockActor, TAU } from "../../core/index.js";
import { Grid } from "../critters/_lib.js";

export const NIGHT = ["#0c0d18", "#211b2d", "#493853", "#765c7e", "#a397af", "#c4c8da", "#f1e9ed"];
export const EYES = ["#361323", "#852a45", "#d95b70", "#ffd0d2"];
export const part = (t, a, b) => clamp((t - a) / (b - a));
export const point = (a, b, u) => [lerp(a[0], b[0], u), lerp(a[1], b[1], u)];
export function bezier(a, b, c, d, u) {
  const v = 1 - u;
  return [v ** 3 * a[0] + 3 * v * v * u * b[0] + 3 * v * u * u * c[0] + u ** 3 * d[0],
    v ** 3 * a[1] + 3 * v * v * u * b[1] + 3 * v * u * u * c[1] + u ** 3 * d[1]];
}

const WINGS = [
  [[2, -1], [5, -5], [9, -9], [8, -1], [6, -2], [4, 3], [2, 2]],
  [[2, -1], [6, -4], [11, -4], [8, 3], [6, 1], [4, 4], [2, 2]],
  [[2, -1], [6, 1], [8, 6], [5, 4], [4, 2], [2, 5], [2, 2]],
  [[2, -1], [4, -3], [5, -6], [5, -1], [3, 1], [3, 3], [2, 2]],
];

export function swarmKit(o, track = null) {
  const C = fit(o.palette ?? NIGHT, 7), E = fit(o.eyes ?? EYES, 4), R = new Rng(o.seed);
  const count = Math.round(clamp(o.count ?? 14, 6, 24));
  const bats = Array.from({ length: count }, (_, i) => ({
    i, f: i / Math.max(1, count - 1), back: i > 2 && i % 3 === 0,
    size: i < 3 ? 2 : R.chance(0.5) ? 1 : 0,
    phase: R.range(0, 4), wobble: R.range(0, TAU), delay: R.range(0, 0.035),
    home: [R.range(-7, 7), -34 + (i / (count - 1)) * 29],
    fan: -Math.PI * 0.95 + (i / count) * TAU + R.range(-0.15, 0.15),
    radius: R.range(24, 38), lane: (i % 2 ? -1 : 1) * (5 + (i % 4) * 3),
  }));
  const sprites = new Map();
  function sprite(fi, size, bank, back) {
    const key = `${fi}/${size}/${bank}/${back}`;
    if (sprites.has(key)) return sprites.get(key);
    const g = new Grid(-16, -16, 32, 32), scale = [0.58, 0.76, 0.98][size];
    const a = bank * 0.32, cs = Math.cos(a), sn = Math.sin(a);
    const xy = ([x, y]) => [(x * cs - y * sn) * scale, (x * sn + y * cs) * scale];
    const col = back ? C.map((c) => mix(c, C[1], 0.25)) : C;
    for (const s of [-1, 1]) {
      const wing = WINGS[fi].map(([x, y]) => xy([s * x, y]));
      g.poly(wing, col[2]);
      g.poly([wing[0], wing[1], wing[2], wing[4]], col[3]);
      g.line(...wing[0], ...wing[1], col[4]);
      g.line(...wing[1], ...wing[2], col[4]);
      if (s < 0) g.set(...wing[1], col[5]);
      g.line(...wing[1], ...wing[4], col[2]);
      g.poly([xy([s * 0.6, -2]), xy([s * 2, -5]), xy([s * 2.1, -1])], col[3]);
    }
    g.poly([xy([-1, -3]), xy([1, -3]), xy([2, 2]), xy([0, 4]), xy([-2, 2])], col[2]);
    g.line(...xy([-0.5, -2]), ...xy([-0.5, 1]), col[4]);
    g.outline(col[0]);
    const cells = [];
    for (let y = 0; y < g.h; y++) for (let x = 0; x < g.w; x++) {
      const c = g.c[y * g.w + x];
      if (c) cells.push([g.x0 + x, g.y0 + y, c]);
    }
    sprites.set(key, cells);
    return cells;
  }
  function bat(p, b, pos, t, strength = 1, bank = 0) {
    if (strength <= 0) return;
    const fi = ((Math.floor(t * 10 + b.phase) % 4) + 4) % 4;
    const size = strength < 0.38 ? 0 : b.size, roll = Math.round(clamp(bank, -2, 2));
    const x = Math.round(pos[0]), y = Math.round(pos[1] + (fi === 2 ? -1 : 0));
    for (const [dx, dy, c] of sprite(fi, size, roll, b.back)) p.blend(x + dx, y + dy, c, Math.min(1, strength * 2));
    if (!b.back && strength > 0.45) {
      p.px(x, y - 1, E[b.i < 3 ? 2 : 1]);
      if (b.i < 3) p.glow(x, y - 1, 3, E[2], 0.14 * strength);
    }
  }
  function flock(p, t, path, layer) {
    for (const b of bats) {
      if ((layer === "back") !== b.back) continue;
      const q = path(t, b);
      if (!q || q.a <= 0) continue;
      const prev = path(t - 0.025, b);
      if (prev && prev.a > 0 && Math.hypot(q.x - prev.x, q.y - prev.y) > 4 && b.i % 2 === 0) {
        p.line(prev.x, prev.y, q.x, q.y, C[2], 0.55 * q.a);
        p.glowLine(prev.x, prev.y, q.x, q.y, 2, C[4], 0.035 * q.a);
      }
      const roll = prev ? clamp((q.y - prev.y) / 5, -2, 2) : 0;
      bat(p, b, [q.x, q.y], t, q.a, roll);
    }
  }

  const A = o.actor ?? stockActor(2), stock = A.mask === stockActor(2).mask;
  // Pose pixels are cached by the rig. A supplied game sprite keeps its own colors and mask.
  function body(p, t, dissolveEnd, gatherStart, gatherEnd, armFirst = false) {
    if (o.body === false || !track || t < 0 || t >= gatherEnd || (t >= dissolveEnd && t < gatherStart)) return;
    const forming = t >= gatherStart, u = forming ? part(t, gatherStart, gatherEnd) : part(t, 0, dissolveEnd);
    const q = poseAt(track, t), cx = Math.round(q.x ?? 0), cy = Math.round(q.y ?? 0);
    const draw = (x, y, c, sx, sy) => {
      const cell = rand(Math.floor(sx / 4), Math.floor(sy / 4), o.seed ?? 1);
      let key = clamp(Math.hypot(sx - 3, (sy + 24) * 0.7) / 29 + cell * 0.15, 0.04, 0.97);
      if (forming) {
        key = clamp(Math.hypot(sx, (sy + 23) * 0.8) / 28 + cell * 0.12 + (sy < -30 ? 0.2 : 0), 0.03, 0.97);
        if (armFirst) key = x > 4 && y < -15 && y > -39 ? key * 0.24 : 0.3 + key * 0.65;
      }
      if (forming ? key > u : key < u) return;
      const edge = Math.abs(key - u), tint = edge < 0.12 ? C[edge < 0.035 ? 5 : 2] : c;
      p.px(cx + x, cy + y, tint);
    };
    if (stock) {
      const r = posed(q);
      for (let i = 0; i < r.n; i++) {
        const src = r.src[i], sx = src >= 0 ? src % 24 - 12 : r.xs[i], sy = src >= 0 ? Math.floor(src / 24) - 38 : r.ys[i];
        draw(r.xs[i], r.ys[i], r.color[i], sx, sy);
      }
    } else {
      for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) {
        const j = y * A.w + x;
        if (!A.mask.data[j]) continue;
        draw(A.x + x, A.y + y, A.pixels?.[j] || C[3], (x / A.w - 0.5) * 24, (y / A.h - 1) * 38);
      }
    }
  }
  function heart(p, x, y, a) {
    if (a <= 0) return;
    p.blend(x, y, E[2], a);
    p.glow(x, y, 8, E[1], 0.2 * a);
    p.glow(x, y, 3, E[2], 0.3 * a);
  }
  function husk(p, t, begin, end) {
    if (o.body === false || !stock || !track || t < begin || t >= end) return;
    const u = part(t, begin, end), q = poseAt(track, 0), r = posed(q);
    const cells = new Set();
    for (let i = 0; i < r.n; i++) cells.add(`${r.xs[i]},${r.ys[i]}`);
    for (let i = 0; i < r.n; i++) {
      const x = r.xs[i], y = r.ys[i];
      if (y > -5 || (x + y) % 3 === 0) continue;
      if (!cells.has(`${x - 1},${y}`) || !cells.has(`${x + 1},${y}`)) p.blend(x, y, C[3], 0.45 * (1 - u));
    }
  }
  function dust(p, t, at, x, direction = 0) {
    const u = part(t, at, at + 0.3);
    if (t < at || u >= 1) return;
    for (let i = 0; i < 7; i++) {
      const s = direction || (i % 2 ? 1 : -1), speed = 6 + rand(i, 5) * 12;
      p.disc(x + s * speed * ease.outCubic(u), -1 - Math.sin(u * Math.PI) * (2 + i % 3), 1.5 + u * 2, C[2], 0.24 * (1 - u) ** 2);
    }
  }
  return { C, E, bats, bat, flock, body, heart, husk, dust };
}
