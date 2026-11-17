import { fit, rng, smooth, clamp, TAU } from "../../core/index.js";
import { PALETTE, polygon, spline, stroke, ribbon, shape, arc, transform, star, chip } from "../_comic.js";

export const meta = {
  name: "Comic wind fist",
  desc: "White wind ribbons knot into a giant fist, coil back, punch into a flat impact star, then unravel into curling gusts and chips.",
  tags: ["comic", "wind", "fist", "melee", "charge", "impact", "directional", "one-shot"],
  size: [448, 320], origin: [224, 244], duration: 2.5, fps: 24, loop: false, bg: "light",
  options: { palette: PALETTE, seed: 23 },
};
export const cues = { release: 0.95, impact: 1.125, recovery: 1.25 };

const OUTLINE = spline([[-62, -25], [-40, -34], [-23, -49], [1, -56], [27, -53], [46, -43],
  [57, -32], [61, -20], [58, -11], [64, 0], [61, 12], [54, 19], [56, 28], [44, 37],
  [24, 39], [7, 46], [-15, 38], [-35, 25], [-62, 23]], true);

function state(t) {
  const born = smooth(0.04, 0.55, t), cock = smooth(0.5, cues.release, t);
  const punch = Math.pow(clamp((t - cues.release) / (cues.impact - cues.release)), 2);
  const squash = smooth(cues.impact - 0.015, cues.impact + 0.025, t) * (1 - smooth(1.25, 1.45, t));
  const gone = smooth(1.38, 1.82, t);
  return { x: -86 - 42 * cock + 179 * punch, y: -126 + 7 * punch,
    sx: born * (1 - squash * 0.3) * (1 - gone * 0.2), sy: born * (1 + squash * 0.22), born, gone, cock };
}

function coil(p, C, t, s, back) {
  const fade = 1 - smooth(1.25, 1.62, t);
  if (!fade || !s.born) return;
  const end = s.x - 45 * s.sx, start = -195, r = (28 + 5 * s.cock) * s.born;
  let pts = [];
  for (let j = 0; j <= 126; j++) {
    const u = j / 126, a = u * TAU * 3.1 - t * 5;
    const q = [start + (end - start) * u, s.y + Math.sin(a) * r * (0.6 + u * 0.4)];
    if ((Math.cos(a) < 0) === back) pts.push(q);
    else if (pts.length) { pts.push(q); ribbon(p, pts, C, 6 * fade * s.born, back); pts = []; }
  }
  ribbon(p, pts, C, 6 * fade * s.born, back);
}

function fist(p, C, s) {
  if (s.born < 0.02 || s.gone >= 1) return;
  const tr = (pts) => transform(pts, s.x, s.y, s.sx, s.sy, -0.04);
  const fade = p.fade; p.fade *= 1 - s.gone;
  shape(p, tr(OUTLINE), C, 5, 1.6);
  polygon(p, tr(spline([[-60, 9], [-30, 13], [-6, 26], [24, 26], [52, 11], [53, 29], [31, 38], [9, 43], [-15, 35], [-36, 23], [-60, 21]], true)), C[3]);
  polygon(p, tr(spline([[-48, -24], [-20, -42], [4, -49], [28, -45], [43, -36], [20, -34], [-4, -35], [-25, -25]], true)), C[7]);
  for (let j = 0; j < 3; j++) {
    const y = -30 + j * 19;
    stroke(p, tr(spline([[21, y - 8], [36, y - 6], [44, y], [43, y + 7], [35, y + 10]])), C[1], 1.05, true);
    stroke(p, tr(spline([[24, y - 6], [34, y - 5], [39, y]])), C[7], 1.6, true);
  }
  const thumb = spline([[-32, -3], [-13, -6], [4, 2], [24, 16], [28, 28], [19, 36], [6, 33], [-9, 18], [-29, 15]], true);
  shape(p, tr(thumb), C, 6, 1.2);
  stroke(p, tr(spline([[-19, -1], [-5, 3], [10, 13], [18, 22]])), C[7], 2.1, true);
  stroke(p, tr(spline([[-54, -10], [-36, -9], [-25, -15], [-13, -23]])), C[2], 1, true);
  for (let row = 0; row < 4; row++) for (let col = 0; col < 7; col++) {
    const [x, y] = tr([[-54 + col * 5 + row % 2 * 2, 11 + row * 3]])[0];
    if (col < 5 - row * 0.5) p.circle(x, y, 0.65, C[2]);
  }
  p.fade = fade;
}

function unravel(p, C, t) {
  for (let i = 0; i < 5; i++) {
    const u = clamp((t - 1.28 - i * 0.04) / (1.12 - i * 0.06));
    if (u <= 0 || u >= 1) continue;
    const pts = [];
    for (let j = 0; j <= 42; j++) {
      const q = j / 42, a = i * 1.7 + u * 5 + q * 4.8;
      const r = (18 + 52 * u) * (1 - q * 0.64);
      pts.push([42 - i * 15 + Math.cos(a) * r + u * (i % 2 ? -32 : 30),
        -120 + (i - 2) * 16 + Math.sin(a) * r * 0.7 + Math.sin(i * 1.7) * u * 30]);
    }
    ribbon(p, pts, C, 7 * Math.sin(Math.PI * u), i % 2 === 0);
  }
}

export function drawBack(p, t, o) {
  t = Math.round(t * 1e9) / 1e9;
  if (t <= 0 || t >= meta.duration) return;
  const C = fit(o.palette, 8), s = state(t);
  coil(p, C, t, s, true);
  if (t > 0.88 && t < 1.4) {
    const k = smooth(0.88, 1.05, t) * (1 - smooth(1.18, 1.4, t));
    for (let i = 0; i < 6; i++) {
      const R = rng(o.seed, i), y = -192 + i * 25, x = -193 + R.range(0, 23);
      stroke(p, spline([[x, y], [x + 65 * k, y - 2], [s.x + 25, y + (i - 2) * 2]]), C[i % 2 ? 2 : 0], k * 1.3, true);
    }
  }
}

export function draw(p, t, o) {
  t = Math.round(t * 1e9) / 1e9;
  if (t <= 0 || t >= meta.duration) return;
  const C = fit(o.palette, 8), s = state(t);
  coil(p, C, t, s, false);
  fist(p, C, s);
  if (t < 0.72) {
    const k = smooth(0, 0.2, t) * (1 - smooth(0.42, 0.72, t));
    for (let i = 0; i < 3; i++) ribbon(p, arc(s.x, s.y, 56 + i * 8, 39 + i * 9, t * 8 + i * 2, 3.6), C, 5 * k, i === 2);
  }
  const h = t - cues.impact;
  if (h >= 0 && h < 0.34) {
    const k = 1 - smooth(0.1, 0.34, h);
    star(p, 99 + h * 28, -118, (14 + 55 * smooth(0, 0.13, h)) * k, 83 * k, C, 0.12);
  }
  if (h >= 0) for (let i = 0; i < 11; i++) {
    const R = rng(o.seed, i + 50), life = R.range(0.45, 1.05), u = h / life;
    if (u >= 1) continue;
    const a = R.range(-2, 2), d = 22 + 88 * (1 - Math.pow(1 - u, 3));
    const x = 89 + Math.cos(a) * d, y = -118 + Math.sin(a) * d + 24 * u * u;
    chip(p, x, y, R.range(2, 5) * Math.sin(Math.PI * u), a + u * 5, C);
    if (u < 0.5) stroke(p, [[x - Math.cos(a) * 13, y - Math.sin(a) * 13], [x, y]], C[2], 0.75);
  }
  unravel(p, C, t);
}
