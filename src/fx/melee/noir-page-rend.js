import { fit, rng, smooth } from "../../core/index.js";
import { polygon, stroke, spline, transform } from "../_comic.js";

export const meta = {
  name: "Noir page rend",
  desc: "A pale scratch tears space into curled black paper around a wine-red cut; the thick lips snap shut and shed slowly tumbling inked scraps.",
  tags: ["comic", "noir", "paper", "tear", "slash", "rift", "dark", "one-shot"],
  size: [448, 384], origin: [224, 326], duration: 3.25, fps: 24, loop: false, bg: "dark",
  options: {
    palette: ["#080b10", "#171c23", "#2c333c", "#464e57", "#69717a", "#969b9b", "#c3c2b7", "#e8e1cb"],
    rift: ["#100a10", "#260f1b", "#481724", "#692332", "#923747", "#b95860", "#d58a86", "#e6b6a3"],
    seed: 97,
  },
};
export const cues = { scratch: 0.08, release: 0.708333333, impact: 0.875, closing: 1.666666667, shut: 1.875 };

// Along-cut and across-cut coordinates keep the two peeled faces attached to the same tear.
const TX = 0.773, TY = -0.634, NX = -TY, NY = TX;
const point = (u, v = 0) => [(u - 0.5) * 340 * TX + v * NX, -160 + (u - 0.5) * 340 * TY + v * NY];
const local = (u, v, pts, side = 1, scale = 1) => pts.map(([a, b]) => point(u + a * scale / 340, v + b * side * scale));
function opening(u, t) {
  const birth = smooth(cues.release + u * 0.085, cues.release + u * 0.085 + 0.1, t);
  const close = 1 - smooth(cues.closing + u * 0.025, cues.shut - (1 - u) * 0.035, t);
  return birth * close * (1 + 0.13 * Math.exp(-Math.max(0, t - 0.94) * 7) * Math.sin(Math.max(0, t - 0.94) * 22));
}
function widths(u, t, side, seed) {
  const k = opening(u, t), env = Math.max(0, Math.sin(Math.PI * u)) ** 0.72;
  const r = rng(seed, Math.round(u * 48) + (side < 0 ? 10 : 90));
  const tooth = r.range(-2.4, 2.4) * env;
  const fold = (side < 0 ? 43 : 37) * env * (0.8 + 0.25 * Math.sin(u * 11 + side) + 0.15 * Math.sin(u * 25 - side));
  return { inner: (17 * env + tooth) * k,
    outer: (17 * env + fold + tooth * 2.7) * k,
    k, env };
}
function edge(side, t, o, band = 0) {
  return Array.from({ length: 49 }, (_, i) => {
    const u = i / 48, w = widths(u, t, side, o.seed);
    return point(u, side * (w.inner + (w.outer - w.inner) * band));
  });
}

export function drawBack(p, t, o) {
  t = Math.round(t * 1e9) / 1e9;
  if (t <= cues.release || t >= cues.shut) return;
  const C = fit(o.palette, 8), R = fit(o.rift, 8);
  const left = edge(-1, t, o), right = edge(1, t, o);
  polygon(p, [...left, ...right.slice().reverse()], R[2]);
  const inner = (side) => Array.from({ length: 49 }, (_, i) => {
    const u = i / 48, w = widths(u, t, side, o.seed);
    return point(u, side * Math.max(0, w.inner - 3.2 * w.k));
  });
  polygon(p, [...inner(-1), ...inner(1).reverse()], R[0]);
  for (let i = 0; i < 15; i++) {
    const u = 0.09 + i * 0.055, w = widths(u, t, 1, o.seed), side = i % 2 ? 1 : -1;
    const a = point(u, side * w.inner * 0.8), b = point(u + 0.045, side * w.inner * 0.27);
    stroke(p, [a, b], i % 3 ? R[3] : R[4], 0.65 * w.k, true);
  }
  // Restrained light is confined to the wound, leaving the paper faces solid and dark.
  const flash = 1 - smooth(cues.impact, cues.impact + 0.16, t);
  if (t >= cues.release && flash > 0) {
    const [x, y] = point(0.55);
    p.glow(x, y, 48, R[4], flash * 0.16);
  }
  for (const side of [-1, 1]) {
    const tips = edge(side, t, o, 1.15);
    stroke(p, tips, C[0], 1.4);
  }
}

function roll(p, u, side, t, o, C) {
  const w = widths(u, t, side, o.seed), k = w.k * w.env;
  if (k < 0.03) return;
  const base = side * (w.inner + (w.outer - w.inner) * 0.5);
  const tr = (pts) => local(u, base, pts, side, k * 1.35);
  const outline = spline([[-25, -3], [-14, 8], [-5, 17], [11, 20], [24, 13], [27, 1],
    [21, -7], [10, -8], [4, -2], [7, 7], [15, 9], [19, 4], [16, 0], [12, 2],
    [13, 5], [10, 3], [10, -1], [17, -3], [21, 2], [18, 11], [7, 13], [-4, 9], [-14, -6]], true, 3);
  polygon(p, tr(outline), C[0]);
  polygon(p, tr([[-25, -3], [-13, 2], [-3, 10], [8, 14], [19, 11], [25, 2], [23, 12],
    [11, 19], [-5, 16], [-14, 8]]), C[side < 0 ? 4 : 3]);
  stroke(p, tr(spline([[-23, -3], [-11, 4], [-2, 12], [10, 16], [22, 10], [24, 2], [19, -4], [11, -4], [7, 0]])), C[6], 1.2 * k, true);
  stroke(p, tr(spline([[8, 2], [12, 7], [18, 5]])), C[4], 0.8 * k, true);
  for (let i = 0; i < 5; i++) stroke(p, tr([[-13 + i * 4, 7 + i * 1.5], [-16 + i * 4, 3 + i * 1.4]]), C[1], 0.6 * k);
}

function scrap(p, t, i, o, C) {
  const r = rng(o.seed, 400 + i), late = i >= 11;
  const birth = (late ? cues.shut : cues.impact) + r.range(0, 0.1), age = t - birth;
  const life = r.range(late ? 0.9 : 1.15, late ? 1.32 : 1.65);
  if (age <= 0 || age >= life) return;
  const side = i % 2 ? 1 : -1, u = r.range(0.08, 0.92), [sx, sy] = point(u, side * 22);
  const speed = r.range(25, 70), drag = 1 - Math.exp(-age * 3);
  const x = sx + side * speed * drag + Math.sin(age * 6 + i) * 6;
  const y = sy - r.range(9, 27) * drag + 23 * age * age;
  const size = r.range(3.8, 8), turn = r.range(-2, 2) + age * r.range(-3, 3);
  const flip = 0.25 + 0.75 * Math.abs(Math.cos(age * 5 + i));
  const pts = transform([[-1.5, -0.45], [-0.15, -0.8], [0.7, -0.3], [1.3, 0.35], [0.15, 0.6], [-0.9, 0.2]], x, y, size, size * flip, turn);
  const fade = p.fade; p.fade *= (1 - smooth(life - 0.35, life, age)) * smooth(0, 0.05, age);
  polygon(p, pts, C[1]);
  polygon(p, [pts[1], pts[2], pts[3], [x, y]], C[3]);
  stroke(p, [pts[0], pts[1], pts[2]], C[5], 0.65);
  p.fade = fade;
}

export function draw(p, t, o) {
  t = Math.round(t * 1e9) / 1e9;
  if (t <= 0 || t >= meta.duration) return;
  const C = fit(o.palette, 8), R = fit(o.rift, 8), fade = p.fade;
  if (t < cues.release) {
    const progress = smooth(cues.scratch, 0.375, t);
    if (progress > 0) {
      const pts = Array.from({ length: 40 }, (_, i) => point(i / 39 * progress, Math.sin(i * 1.6) * 0.45));
      stroke(p, pts, C[0], 2.4);
      stroke(p, pts, C[6], 0.8, true);
      const [x, y] = point(progress); p.glow(x, y, 7, C[6], 0.16 * (1 - smooth(0.3, 0.6, t)));
    }
  }
  if (t > cues.release && t < cues.shut) for (const side of [-1, 1]) {
    const lip = edge(side, t, o), ridge = edge(side, t, o, 0.22), mid = edge(side, t, o, 0.56), outer = edge(side, t, o, 1);
    polygon(p, [...outer, ...lip.slice().reverse()], C[1]);
    polygon(p, [...mid, ...ridge.slice().reverse()], C[side < 0 ? 3 : 2]);
    polygon(p, [...ridge, ...lip.slice().reverse()], C[side < 0 ? 5 : 4]);
    stroke(p, outer, C[0], 1.4);
    stroke(p, mid, C[4], 0.7, true);
    stroke(p, lip, C[6], 0.9, true);
    for (let i = 0; i < 25; i++) {
      const u = 0.035 + i * 0.038, w = widths(u, t, side, o.seed);
      if (w.k < 0.04 || i % 7 > 3) continue;
      const from = point(u, side * (w.inner + (w.outer - w.inner) * 0.36));
      const to = point(u + 0.032, side * (w.inner + (w.outer - w.inner) * (0.6 + i % 3 * 0.06)));
      stroke(p, [from, to], C[0], 0.6 * w.k);
      if (i % 3 === 0) stroke(p, [point(u, side * w.inner), point(u + 0.012, side * (w.inner - 3 * w.k))], C[5], 0.6 * w.k);
    }
    // Broad irregular tears in the dark coating make the rim read as folded sheet material.
    for (let j = 0; j < 3; j++) {
      const u = 0.15 + j * 0.29 + side * 0.03, w = widths(u, t, side, o.seed);
      const v = side * (w.inner + (w.outer - w.inner) * 0.64);
      polygon(p, local(u, v, [[-17, 0], [-8, -6], [3, -3], [16, -7], [8, 2], [-4, 5]], side, w.k), C[1]);
      stroke(p, local(u, v, [[-17, 0], [-8, -6], [3, -3]], side, w.k), C[3], 0.65 * w.k);
    }
    roll(p, side < 0 ? 0.3 : 0.72, side, t, o, C);
  }
  // Two short ink wedges underline the release without hiding the ripped-paper silhouette.
  const burst = smooth(cues.release, cues.impact, t) * (1 - smooth(cues.impact, 1.12, t));
  if (burst > 0) for (let i = 0; i < 6; i++) {
    const side = i % 2 ? -1 : 1, u = 0.15 + i * 0.13;
    const pts = [point(u - 0.08, side * (48 + i % 3 * 5)), point(u + 0.08, side * 43), point(u - 0.06, side * (50 + i % 3 * 5))];
    p.fade = fade * burst; polygon(p, pts, i % 3 ? C[3] : C[5]);
  }
  p.fade = fade;
  if (t >= cues.shut && t < cues.shut + 0.22) {
    const k = 1 - smooth(cues.shut + 0.04, cues.shut + 0.22, t);
    stroke(p, [point(0.015), point(0.4, -1), point(0.69, 1), point(0.985)], C[0], 3 * k, true);
    stroke(p, [point(0.05), point(0.46, -0.4), point(0.92)], R[4], 1.1 * k, true);
    stroke(p, [point(0.2), point(0.68)], C[6], 0.55 * k, true);
  }
  for (let i = 0; i < 18; i++) scrap(p, t, i, o, C);
  p.fade = fade;
}
