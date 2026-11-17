// Local illustration tools for the comic series. The scanline coverage and ribbon shading follow
// nature/comic-hurricane; the original effect and the shared pixel painter remain independent.
import { TAU } from "../core/index.js";

export const PALETTE = ["#112b3c", "#284b60", "#477e91", "#71b7c7", "#a6dce2", "#d4f1ef", "#eefbf4", "#ffffff"];

export function polygon(p, points, color) {
  if (points.length < 3 || p.fade <= 0) return;
  const pts = points.map(([x, y]) => [p.toX(x, y), p.toY(x, y)]);
  let lo = Infinity, hi = -Infinity;
  for (const [, y] of pts) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
  const hits = [];
  for (let y = Math.max(p.oy, Math.ceil(lo - 0.5)); y < Math.min(p.oy + p.h, Math.ceil(hi - 0.5)); y++) {
    hits.length = 0;
    const sy = y + 0.5;
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[j], b = pts[i];
      if ((a[1] > sy) !== (b[1] > sy)) hits.push(a[0] + (sy - a[1]) * (b[0] - a[0]) / (b[1] - a[1]));
    }
    hits.sort((a, b) => a - b);
    for (let i = 0; i + 1 < hits.length; i += 2) {
      const left = Math.max(p.ox, hits[i]), right = Math.min(p.ox + p.w, hits[i + 1]);
      if (right <= left) continue;
      if (Math.floor(left) === Math.floor(right)) { p.blendPx(Math.floor(left), y, color, right - left); continue; }
      const start = Math.ceil(left), end = Math.floor(right);
      if (start > left) p.blendPx(start - 1, y, color, start - left);
      if (end > start) {
        if (p.fade >= 1) p.C.fill(color, (y - p.oy) * p.w + start - p.ox, (y - p.oy) * p.w + end - p.ox);
        else for (let x = start; x < end; x++) p.blendPx(x, y, color, 1);
      }
      if (right > end) p.blendPx(end, y, color, right - end);
    }
  }
}

export function spline(points, closed = false, steps = 5) {
  const n = points.length, out = [];
  const get = (i) => points[closed ? (i + n) % n : Math.max(0, Math.min(n - 1, i))];
  for (let i = 0; i < n - (closed ? 0 : 1); i++) {
    const a = get(i - 1), b = get(i), c = get(i + 1), d = get(i + 2);
    for (let j = 0; j < steps; j++) {
      const t = j / steps, t2 = t * t, t3 = t2 * t;
      out.push([0, 1].map((k) => 0.5 * (2 * b[k] + (-a[k] + c[k]) * t
        + (2 * a[k] - 5 * b[k] + 4 * c[k] - d[k]) * t2 + (-a[k] + 3 * b[k] - 3 * c[k] + d[k]) * t3)));
    }
  }
  if (!closed) out.push(points.at(-1));
  return out;
}

function edges(path, extra = 0, from = -1, to = 1) {
  const side = (q, i, f) => {
    const a = path[Math.max(0, i - 1)], b = path[Math.min(path.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, l = Math.hypot(dx, dy) || 1;
    const w = q.w + extra * Math.min(1, q.w);
    return [q.x - dy / l * w * f, q.y + dx / l * w * f];
  };
  return [...path.map((q, i) => side(q, i, from)), ...path.map((q, i) => side(q, i, to)).reverse()];
}

export function stroke(p, points, color, width = 1.2, taper = false) {
  if (points.length < 2) return;
  const left = [], right = [];
  for (let i = 0; i < points.length; i++) {
    const q = points[i], a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const normal = (x, y) => { const l = Math.hypot(x, y) || 1; return [-y / l, x / l]; };
    const n0 = i ? normal(q[0] - a[0], q[1] - a[1]) : normal(b[0] - q[0], b[1] - q[1]);
    const n1 = i < points.length - 1 ? normal(b[0] - q[0], b[1] - q[1]) : n0;
    const nx = n0[0] + n1[0], ny = n0[1] + n1[1], l = Math.hypot(nx, ny) || 1;
    const w = width * (taper ? Math.pow(Math.max(0, Math.sin(Math.PI * i / (points.length - 1))), 0.65) : 1);
    const m = w / Math.max(0.3, (nx * n1[0] + ny * n1[1]) / l);
    left.push([q[0] + nx / l * m, q[1] + ny / l * m]);
    right.push([q[0] - nx / l * m, q[1] - ny / l * m]);
  }
  polygon(p, [...left, ...right.reverse()], color);
}

export function ribbon(p, points, C, width = 7, back = false) {
  if (points.length < 3 || width <= 0) return;
  const path = points.map(([x, y], i) => ({ x, y, w: width * Math.pow(Math.sin(Math.PI * i / (points.length - 1)), 0.7) }));
  polygon(p, edges(path, 1.3), C[0]);
  polygon(p, edges(path), C[back ? 3 : 6]);
  polygon(p, edges(path, 0, 0.3, 0.92), C[back ? 2 : 3]);
  if (!back) polygon(p, edges(path, 0, -0.78, -0.15), C[7]);
}

export function shape(p, points, C, fill = 5, width = 1.35) {
  polygon(p, points, C[fill]);
  stroke(p, [...points, points[0], points[1]], C[0], width);
}

export function ellipse(cx, cy, rx, ry, turn = 0, n = 40) {
  const c = Math.cos(turn), s = Math.sin(turn);
  return Array.from({ length: n }, (_, i) => {
    const a = TAU * i / n, x = rx * Math.cos(a), y = ry * Math.sin(a);
    return [cx + x * c - y * s, cy + x * s + y * c];
  });
}

export function arc(cx, cy, rx, ry, from, span, n = 36) {
  return Array.from({ length: n + 1 }, (_, i) => { const a = from + span * i / n; return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)]; });
}

export function transform(points, x, y, sx = 1, sy = sx, turn = 0) {
  const c = Math.cos(turn), s = Math.sin(turn);
  return points.map(([px, py]) => [x + px * sx * c - py * sy * s, y + px * sx * s + py * sy * c]);
}

export function star(p, x, y, rx, ry, C, turn = 0, rays = 9) {
  const pts = Array.from({ length: rays * 2 }, (_, i) => {
    const a = i * Math.PI / rays + turn, r = i % 2 ? 0.36 : 0.82 + 0.18 * Math.cos(i * 2.1);
    return [x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r];
  });
  shape(p, pts, C, 6);
  polygon(p, pts.map(([a, b]) => [x + (a - x) * 0.58, y + (b - y) * 0.58]), C[7]);
}

export function chip(p, x, y, s, turn, C, back = false) {
  if (s < 0.15) return;
  const pts = transform([[-1, -0.4], [-0.1, -1], [1, -0.3], [0.65, 0.9], [-0.7, 0.65]], x, y, s, s, turn);
  shape(p, pts, C, back ? 3 : 5, Math.min(1, s * 0.3));
  polygon(p, [pts[2], pts[3], pts[4], [x, y]], C[2]);
}

export function puff(p, x, y, rx, ry, C, phase = 0) {
  if (rx < 0.4 || ry < 0.4) return;
  const pts = Array.from({ length: 48 }, (_, i) => {
    const a = i / 48 * TAU, r = 1 + 0.14 * Math.sin(a * 6 + phase);
    return [x + Math.cos(a) * rx * r, y + Math.sin(a) * ry * r];
  });
  shape(p, pts, C, 5, Math.min(1.25, ry * 0.2));
  stroke(p, arc(x, y + ry * 0.14, rx * 0.52, ry * 0.55, 0.1, 4.5), C[2], 0.85, true);
}
