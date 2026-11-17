import { fit, rng, smooth, clamp } from "../../core/index.js";
import { PALETTE, polygon, spline, stroke, ribbon, shape, transform, star, chip } from "../_comic.js";

export const meta = {
  name: "Comic space zipper",
  desc: "A crooked zipper peels open curled paper edges onto a dark screentone pocket, sucks in orbiting chips, then races shut with a sharp snap.",
  tags: ["comic", "arcane", "portal", "zipper", "pull", "seal", "one-shot"],
  size: [384, 384], origin: [192, 336], duration: 3.5, fps: 24, loop: false, bg: "light",
  options: { palette: PALETTE, seed: 41 },
};
export const cues = { opening: 0.32, open: 1.42, closing: 2.4, shut: 2.72 };
const center = (u) => -19 + u * 40 + 9 * Math.sin(u * 6);
const yy = (u) => -282 + u * 250;
function width(u, t) {
  const open = smooth(cues.opening + u * 0.86, cues.opening + u * 0.86 + 0.24, t);
  const close = smooth(cues.closing + (1 - u) * 0.2, cues.closing + (1 - u) * 0.2 + 0.12, t);
  const breath = 1 + 0.025 * Math.sin(t * 5 + u * 4) * smooth(1.3, 1.6, t);
  return 68 * Math.pow(Math.sin(Math.PI * u), 0.72) * open * (1 - close) * breath;
}
function edge(side, t, outer = 0) {
  return Array.from({ length: 61 }, (_, i) => {
    const u = i / 60, w = width(u, t);
    return [center(u) + side * (w + outer * Math.sin(Math.PI * u) * Math.min(1, w / 12)), yy(u)];
  });
}

function slider(p, x, y, C, turn) {
  const tr = (pts) => transform(pts, x, y, 1, 1, turn);
  shape(p, tr([[-10, -12], [10, -12], [13, 2], [7, 12], [-7, 12], [-13, 2]]), C, 3);
  polygon(p, tr([[-7, -9], [5, -9], [8, 0], [4, 5], [-7, 5]]), C[7]);
  const tab = spline([[-4, 4], [5, 3], [11, 11], [10, 31], [5, 36], [-4, 32], [-8, 14]], true);
  shape(p, tr(tab), C, 5, 1.3);
  shape(p, tr(spline([[-2, 13], [4, 12], [5, 25], [0, 27], [-3, 23]], true)), C, 1, 0.6);
  stroke(p, tr([[-4, 9], [-5, 25]]), C[7], 1.15);
}

export function drawBack(p, t, o) {
  t = Math.round(t * 1e9) / 1e9;
  if (t <= 0 || t >= meta.duration) return;
  const C = fit(o.palette, 8), left = edge(-1, t), right = edge(1, t);
  if (t > cues.opening && t < cues.shut) {
    polygon(p, [...left, ...right.reverse()], C[0]);
    const inside = (side) => Array.from({ length: 61 }, (_, i) => {
      const u = i / 60; return [center(u) + side * Math.max(0, width(u, t) - 4), yy(u)];
    });
    const innerL = inside(-1), innerR = inside(1);
    polygon(p, [...innerL, ...innerR.reverse()], C[1]);
    // Screen tones are confined to the opening, with an empty dark focus down its center.
    for (let row = 0; row < 34; row++) {
      const u = (row + 0.5) / 34, w = width(u, t) - 7, y = yy(u);
      for (let x = -w + row % 2 * 4; x < w; x += 8) {
        if (Math.abs(x) < 12 || w < 3) continue;
        p.circle(center(u) + x, y, 1.05, C[2]);
      }
    }
    const w = width(0.52, t);
    if (w > 18) for (let i = 0; i < 3; i++) {
      const pts = [];
      for (let j = 0; j <= 32; j++) {
        const v = j / 32, a = v * 5.4 + i * 2 + t;
        pts.push([center(0.52) + Math.cos(a) * w * 0.65 * (1 - v), -151 + Math.sin(a) * 40 * (1 - v)]);
      }
      stroke(p, pts, C[3], 0.9, true);
    }
  }
}

export function draw(p, t, o) {
  t = Math.round(t * 1e9) / 1e9;
  if (t <= 0 || t >= meta.duration) return;
  const C = fit(o.palette, 8), fade = p.fade;
  p.fade *= 1 - smooth(2.89, 3.38, t);
  const reveal = smooth(0.02, 0.3, t);
  for (const side of [-1, 1]) {
    const inner = edge(side, t), outer = edge(side, t, 25);
    shape(p, [...outer, ...inner.slice().reverse()], C, side < 0 ? 5 : 3, 1.15);
    ribbon(p, edge(side, t, 10), C, 3.8, side > 0);
    // A peeled lip turns back on itself: broad lit paper, a dark reverse and a rolled tip.
    const v = side < 0 ? 0.3 : 0.69, w = width(v, t), curl = Math.min(1, w / 45);
    if (curl > 0.01) {
      const x = center(v) + side * (w + 16 * curl), y = yy(v);
      const points = spline([[0, -29], [14, -18], [22, -1], [16, 16], [3, 19], [-5, 12], [0, 2], [8, 5], [6, 11], [13, 8], [12, -5], [3, -12]], true);
      shape(p, transform(points, x, y, side * curl, curl, side * 0.12), C, side < 0 ? 6 : 4, 1.1 * curl);
      stroke(p, transform(spline([[4, -21], [16, -4], [13, 8]]), x, y, side * curl, curl), C[7], 1.8 * curl, true);
    }
    // Each tooth follows its own side of the split, and interlocks again on closure.
    for (let i = 0; i < 23; i++) {
      const u = (i + (side > 0 ? 0.5 : 0.05)) / 23;
      if (u > reveal) continue;
      const w = width(u, t), x = center(u) + side * (w + 1.5), y = yy(u);
      const pts = [[x, y - 3], [x - side * 6.5, y - 2.5], [x - side * 7.5, y + 2], [x, y + 3.5]];
      shape(p, pts, C, side < 0 ? 6 : 4, 0.65);
    }
  }
  if (t < cues.opening) {
    const pts = Array.from({ length: 40 }, (_, i) => { const u = i / 39 * reveal; return [center(u), yy(u)]; });
    stroke(p, pts, C[0], 1.5);
  }
  if (t > 0.15 && t < 2.9) {
    const u = t < cues.closing ? smooth(cues.opening, 1.3, t) : 1 - smooth(cues.closing, cues.shut, t);
    slider(p, center(u), yy(u), C, 0.12 + Math.sin(t * 8) * (t < 1.3 ? 0.09 : 0.03));
  }
  p.fade = fade;
  for (let i = 0; i < 10; i++) {
    const R = rng(o.seed, i + 60), start = R.range(0.9, 1.75), age = (t - start) / R.range(0.55, 0.8);
    if (age < 0 || age >= 1) continue;
    const side = i % 2 ? -1 : 1, u = R.range(0.25, 0.75), d = (1 - age) ** 1.5;
    const x = center(u) + side * (24 + 134 * d), y = yy(u) - Math.sin(age * Math.PI) * 24;
    const s = R.range(4.5, 7) * Math.min(1, age * 9) * (1 - smooth(0.7, 1, age));
    chip(p, x, y, s, age * 7 + i, C, i % 3 === 0);
    stroke(p, spline([[x + side * 25 * d, y - 7], [x + side * 12 * d, y - 2], [x, y]]), C[2], 0.85 * Math.sin(age * Math.PI), true);
  }
  if (t >= cues.shut && t < 2.94) {
    const k = 1 - smooth(cues.shut + 0.04, 2.94, t);
    star(p, center(0.5), -155, 27 * k, 124 * k, C, 0.18, 7);
  }
  if (t > 2.7 && t < 3.35) for (let i = 0; i < 4; i++) {
    const u = clamp((t - 2.7) / 0.65), a = i * Math.PI / 2 + 0.4;
    star(p, Math.cos(a) * (30 + u * 35), -155 + Math.sin(a) * (55 + u * 25), 5 * Math.sin(u * Math.PI), 9 * Math.sin(u * Math.PI), C, 0, 4);
  }
}
