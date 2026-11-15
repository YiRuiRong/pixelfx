// Borrow the funnel, layered wind bands and seeded debris approach from nature/tornado.
// The inked ribbons, cel shadows and screentone are drawn here at a larger illustration scale.
import { fit, rng, TAU } from "../../core/index.js";

export const meta = {
  name: "Comic hurricane",
  desc: "An ink-outlined funnel of sweeping white wind ribbons, crisp cyan shadows and screentone; speed strokes, tumbling chips and curled dust orbit in front and behind.",
  tags: ["nature", "wind", "hurricane", "tornado", "comic", "storm", "loop"],
  size: [384, 384],
  origin: [192, 338],
  duration: 3,
  loop: true,
  fps: 24,
  bg: "light",
  options: {
    palette: ["#112b3c", "#284b60", "#477e91", "#71b7c7", "#a6dce2", "#d4f1ef", "#eefbf4", "#ffffff"],
    seed: 17,
  },
};

const HEIGHT = 248, TILT = 0.23;
const fract = (v) => v - Math.floor(v);

// Scanline fills keep wide ink shapes inexpensive. Transform vertices before rasterizing so mirror,
// rotation, placement and cropped frames keep working. Fractional span ends use real alpha coverage.
function polygon(p, points, color) {
  if (points.length < 3) return;
  const pts = points.map(([x, y]) => [p.toX(x, y), p.toY(x, y)]);
  let lo = Infinity, hi = -Infinity;
  for (const [, y] of pts) { lo = Math.min(lo, y); hi = Math.max(hi, y); }
  const y0 = Math.max(p.oy, Math.ceil(lo - 0.5)), y1 = Math.min(p.oy + p.h, Math.ceil(hi - 0.5));
  const hits = [];
  for (let y = y0; y < y1; y++) {
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
      const start = Math.ceil(left), end = Math.floor(right);
      if (Math.floor(left) === Math.floor(right)) {
        p.blendPx(Math.floor(left), y, color, right - left);
        continue;
      }
      if (start > left) p.blendPx(start - 1, y, color, start - left);
      if (end > start) {
        if (p.fade >= 1) p.C.fill(color, (y - p.oy) * p.w + start - p.ox, (y - p.oy) * p.w + end - p.ox);
        else for (let x = start; x < end; x++) p.blendPx(x, y, color, 1);
      }
      if (right > end) p.blendPx(end, y, color, right - end);
    }
  }
}

function ellipse(p, cx, cy, rx, ry, color) {
  polygon(p, Array.from({ length: 48 }, (_, i) => {
    const a = i * TAU / 48;
    return [cx + rx * Math.cos(a), cy + ry * Math.sin(a)];
  }), color);
}

function geometry(t, seed) {
  const phase = TAU * fract(t / meta.duration);
  const offset = rng(seed, 30).range(-0.45, 0.45);
  return {
    phase,
    axis: (u) => 19 * u * Math.sin(phase + offset - 3 * u) + 8 * Math.sin(phase * 2 - 5 * u) * Math.sin(Math.PI * u),
    radius: (u) => 9 + 82 * Math.pow(Math.max(0, u), 1.4) + 8 * Math.pow(u, 7)
      + 5 * Math.sin(phase * 2 - u * 8) * u * (1 - u),
  };
}

// Each sample stores a center, a normal and a half width; the same mesh draws ink, fill and cel bands.
function mesh(points) {
  return points.map((q, i) => {
    const a = points[Math.max(0, i - 1)], b = points[Math.min(points.length - 1, i + 1)];
    const dx = b.x - a.x, dy = b.y - a.y, d = Math.hypot(dx, dy) || 1;
    return { ...q, nx: -dy / d, ny: dx / d };
  });
}

function strip(p, path, color, from = -1, to = 1, extra = 0) {
  const edge = (q, f) => [q.x + q.nx * f * (q.w + extra * Math.min(1, q.w)), q.y + q.ny * f * (q.w + extra * Math.min(1, q.w))];
  polygon(p, [...path.map((q) => edge(q, from)), ...path.slice().reverse().map((q) => edge(q, to))], color);
}

function ribbon(p, samples, C, back = false) {
  if (samples.length < 3) return;
  const path = mesh(samples);
  strip(p, path, C[0], -1, 1, 1.8);
  strip(p, path, C[back ? 3 : 6]);
  strip(p, path, C[back ? 2 : 3], 0.35, 0.95);
  if (!back) strip(p, path, C[7], -0.8, -0.2);
}

function windBand(p, C, g, u, head, span, width, back, lift = 0, radiusScale = 1) {
  const r = g.radius(u) * radiusScale, cx = g.axis(u), n = 56;
  let samples = [];
  for (let i = 0; i <= n; i++) {
    const v = i / n, a = head - span * v, sn = Math.sin(a);
    const q = { x: cx + r * Math.cos(a), y: -HEIGHT * u + r * TILT * sn + lift + (18 + u * 10) * (v - 0.5),
      w: width * Math.pow(Math.sin(Math.PI * v), 0.7) };
    if ((sn < 0) === back) samples.push(q);
    else if (samples.length) {
      samples.push(q);
      ribbon(p, samples, C, back);
      samples = [];
    }
  }
  ribbon(p, samples, C, back);
}

function funnel(p, C, g) {
  const outline = (inset) => {
    const left = [], right = [];
    for (let i = 0; i <= 40; i++) {
      const u = 0.025 + i / 40 * 0.965, x = g.axis(u), r = Math.max(2, g.radius(u) - inset);
      left.push([x - r, -HEIGHT * u]);
      right.push([x + r, -HEIGHT * u]);
    }
    return [...left, ...right.reverse()];
  };
  polygon(p, outline(0), C[0]);
  polygon(p, outline(2.5), C[3]);
  const lit = [], edge = [];
  for (let i = 0; i <= 36; i++) {
    const u = 0.04 + i / 36 * 0.94, x = g.axis(u), r = g.radius(u);
    lit.push([x - r + 3.5, -HEIGHT * u]);
    edge.push([x + r * (0.08 + 0.2 * Math.sin(u * 10 + g.phase)), -HEIGHT * u]);
  }
  polygon(p, [...lit, ...edge.reverse()], C[5]);
  // Sparse printed dots stay on the shadow side of the volume.
  for (let row = 0; row < 29; row++) {
    const y = -23 - row * 7, u = -y / HEIGHT, cx = g.axis(u), r = g.radius(u);
    for (let x = cx + r * 0.42 + (row % 2) * 3; x < cx + r - 5; x += 7) p.circle(x, y, 0.85, C[2]);
  }
  const cx = g.axis(1);
  ellipse(p, cx, -HEIGHT - 1, g.radius(1) + 3, 23, C[0]);
  ellipse(p, cx - 1, -HEIGHT - 3, g.radius(1) - 2, 18, C[2]);
  ellipse(p, cx - 10, -HEIGHT - 5, 43, 9, C[1]);
  const spiral = [];
  for (let k = 0; k <= 70; k++) {
    const q = k / 70, r = 83 * (1 - q), a = g.phase * 2 - q * TAU * 1.55;
    spiral.push({ x: cx + r * Math.cos(a), y: -HEIGHT - 3 + r * 0.17 * Math.sin(a), w: 2.9 * Math.sin(Math.PI * q) });
  }
  strip(p, mesh(spiral), C[5]);
}

function winds(p, C, g, seed, back) {
  const levels = [0.08, 0.18, 0.30, 0.43, 0.57, 0.71, 0.85, 0.98];
  for (let j = 0; j < levels.length; j++) {
    const u = levels[j], R = rng(seed, j + 50);
    const head = g.phase * (j < 3 ? 4 : 3) + j * 1.19 + R.range(-0.25, 0.25);
    windBand(p, C, g, u, head, 4.9, 5.5 + u * 9, back, 0, 1.06);
  }
  // Broken, long brush sweeps flare away from the crown instead of a rigid closed ring.
  windBand(p, C, g, 1, g.phase * 2 + 0.7, 4.8, 10, back, -3, 1.16);
  windBand(p, C, g, 0.82, g.phase * 3 + 3.1, 2.5, 4.5, back, -2, 1.36);
  // Thin strokes climb between the broad bands; zero-width ends hide the cycle reset.
  for (let i = 0; i < 5; i++) {
    const q = fract(g.phase / TAU * 2 + i / 5), u = 0.05 + q * 0.91;
    windBand(p, C, g, u, g.phase * 4 + i * 1.7, 1.8, 1.6 * Math.sin(Math.PI * q), back, 0, 1.04);
  }
}

function speedLines(p, C, g, seed) {
  for (let i = 0; i < 13; i++) {
    const R = rng(seed, i + 130), side = i % 2 ? 1 : -1;
    const u = R.range(0.2, 0.95), r = g.radius(u) + R.range(17, 40);
    const pulse = 0.5 + 0.5 * Math.sin(g.phase * 3 + R.range(0, TAU));
    const x = g.axis(u) + side * r, y = -u * HEIGHT + 7 * Math.sin(g.phase * 2 + i);
    const len = R.range(22, 41) * (0.65 + 0.35 * pulse), samples = [];
    for (let k = 0; k <= 10; k++) {
      const q = k / 10;
      samples.push({ x: x + side * len * (q - 0.5), y: y - len * 0.26 * q + 6 * q * q,
        w: Math.sin(Math.PI * q) * (0.9 + 1.1 * pulse) });
    }
    strip(p, mesh(samples), i % 3 ? C[1] : C[3]);
  }
}

function chips(p, C, g, seed, back) {
  for (let i = 0; i < 13; i++) {
    const R = rng(seed, i + 200), q = fract(g.phase / TAU * 2 + R.next());
    const a = g.phase * 5 + R.range(0, TAU);
    if ((Math.sin(a) < 0) !== back) continue;
    const r = g.radius(q) + 19 + R.range(0, 19), size = R.range(3, 6.5) * Math.pow(Math.sin(Math.PI * q), 0.55);
    const x = g.axis(q) + r * Math.cos(a), y = -q * HEIGHT + r * TILT * Math.sin(a);
    const turn = g.phase * 3 + i, cs = Math.cos(turn), sn = Math.sin(turn);
    const shape = [[-1, -0.5], [0.25, -1], [1, -0.25], [0.65, 0.8], [-0.6, 0.65]];
    const verts = (s) => shape.map(([vx, vy]) => [x + (vx * cs - vy * sn) * s, y + (vx * sn + vy * cs) * s]);
    polygon(p, verts(size + Math.min(1.1, size * 0.4)), C[0]);
    polygon(p, verts(size), C[back ? 3 : 5]);
    const facet = verts(size);
    polygon(p, [facet[0], facet[1], [x, y], facet[4]], C[2]);
  }
}

function dust(p, C, g, seed, back) {
  for (let i = 0; i < 7; i++) {
    const R = rng(seed, i + 300), a = g.phase * 2 + i * TAU / 7;
    if ((Math.sin(a) < 0) !== back) continue;
    const r = R.range(47, 76), x = g.axis(0) + r * Math.cos(a), y = 3 + r * 0.2 * Math.sin(a);
    const s = 12 + 3 * Math.sin(g.phase * 2 + i), pts = [];
    for (let k = 0; k < 36; k++) {
      const b = k * TAU / 36, rr = s * (1 + 0.17 * Math.sin(b * 5 + i));
      pts.push([x + Math.cos(b) * rr * 1.45, y + Math.sin(b) * rr * 0.7]);
    }
    polygon(p, pts, C[0]);
    polygon(p, pts.map(([px, py]) => [x + (px - x) * 0.87, y + (py - y) * 0.78 - 0.6]), C[back ? 3 : 5]);
    const curl = [];
    for (let k = 0; k <= 18; k++) {
      const q = k / 18, b = -0.6 + q * 5, rr = s * 0.55 * (1 - q * 0.8);
      curl.push({ x: x + Math.cos(b) * rr, y: y + Math.sin(b) * rr * 0.55, w: 0.7 * Math.sin(Math.PI * q) });
    }
    strip(p, mesh(curl), C[2]);
  }
  for (let i = 0; i < 3; i++) {
    const head = g.phase * 3 + i * TAU / 3;
    windBand(p, C, g, 0.12, head, 3.3, 2.8, back, 28, 2.6);
  }
}

export function drawBack(p, t, o) {
  const C = fit(o.palette, 8), g = geometry(t, o.seed);
  speedLines(p, C, g, o.seed);
  dust(p, C, g, o.seed, true);
  chips(p, C, g, o.seed, true);
  winds(p, C, g, o.seed, true);
  funnel(p, C, g);
}

export function draw(p, t, o) {
  const C = fit(o.palette, 8), g = geometry(t, o.seed);
  winds(p, C, g, o.seed, false);
  dust(p, C, g, o.seed, false);
  chips(p, C, g, o.seed, false);
}
