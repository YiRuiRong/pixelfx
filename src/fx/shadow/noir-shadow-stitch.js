import { fit, rng, smooth, clamp } from "../../core/index.js";
import { polygon, stroke, spline, ellipse, transform } from "../_comic.js";

export const meta = {
  name: "Noir shadow stitch",
  desc: "Four iron eye-nails pin a human shadow. Crimson thread stitches its edges, cinches it into sharp pleats, then snaps strand by strand and hangs loose.",
  tags: ["comic", "noir", "shadow", "stitch", "thread", "nail", "bind", "curse", "ground", "one-shot"],
  size: [448, 336], origin: [224, 226], duration: 4.5, fps: 24, loop: false, bg: "dark",
  options: {
    palette: ["#070b11", "#141b24", "#27313c", "#3e4a56", "#606c76", "#899298", "#b7b9b5", "#ded9c9"],
    thread: ["#1c0d18", "#351422", "#581d2c", "#7e293b", "#a04450", "#be646a", "#d49b93", "#e6c5ad"],
    seed: 113,
  },
};
export const cues = { pins: [0.25, 0.458333333, 0.666666667, 0.875], sewing: 1.0,
  tighten: 1.916666667, bound: 2.125, release: 2.958333333, breaks: [2.958333333, 3.125, 3.291666667, 3.458333333] };

// A human-shaped patch lies on the floor. No actor is baked above it: the host can place its own target.
const BODY = [[-9, -87], [-13, -98], [-13, -111], [-8, -121], [2, -125], [10, -119], [14, -108], [11, -95],
  [7, -87], [11, -78], [33, -70], [57, -57], [86, -52], [99, -44], [95, -35], [79, -32], [53, -41], [29, -50],
  [22, -18], [29, 1], [47, 36], [49, 47], [34, 53], [20, 36], [6, 11], [-2, 2], [-17, 28], [-34, 57],
  [-50, 53], [-48, 39], [-30, 3], [-24, -17], [-30, -47], [-53, -36], [-78, -26], [-98, -31], [-103, -40],
  [-86, -50], [-57, -61], [-33, -73], [-10, -77]];
const PINS = [[-142, -72], [139, -67], [145, 50], [-143, 55]];
const GRIPS = [[-98, -38], [94, -42], [42, 48], [-44, 51]];
const RUNS = [[0.9, 1.317], [0.317, 0.537], [0.537, 0.707], [0.707, 0.9]];
function tension(t) { return smooth(cues.tighten, cues.bound, t) * (1 - smooth(cues.release, 3.65, t)); }
function deform([x, y], t) {
  const k = tension(t), born = smooth(0.02, 0.23, t), gone = 1 - smooth(3.72, 4.33, t);
  let dx = -x * 0.29, dy = (y + 25) * -0.08;
  for (let i = 0; i < 4; i++) {
    const [gx, gy] = GRIPS[i], [px, py] = PINS[i], w = Math.exp(-((x - gx) ** 2 + (y - gy) ** 2) / 1500);
    dx += (px - gx) * 0.65 * w; dy += (py - gy) * 0.42 * w;
  }
  const xx = x + dx * k, yy = y + dy * k;
  return [(xx + yy * 0.2) * (0.85 + 0.15 * born) * gone, yy * 0.68 * (0.8 + 0.2 * born) * gone];
}
function outline(t) { return spline(BODY.map(q => deform(q, t)), true, 3); }
function onBoundary(points, u) {
  u = (u % 1 + 1) % 1;
  const v = u * points.length, a = points[Math.floor(v)], b = points[(Math.floor(v) + 1) % points.length], f = v % 1;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}
function seam(points, i) {
  const [from, to] = RUNS[i], n = [38, 22, 19, 20][i], out = [];
  for (let j = 0; j <= n; j++) {
    const u = from + (to - from) * j / n, a = onBoundary(points, u - 0.002), b = onBoundary(points, u + 0.002);
    const q = onBoundary(points, u), dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy) || 1;
    for (const offset of [-2.1, 2.1]) out.push([q[0] - dy / length * offset, q[1] + dx / length * offset]);
  }
  return out;
}
function nailState(i, t) {
  const hit = cues.pins[i], age = t - hit, [x, y] = PINS[i], tilt = [-0.16, 0.12, 0.18, -0.12][i];
  const drop = 64 * (1 - clamp((age + 0.14) / 0.14) ** 2), sink = 33 * smooth(3.84, 4.35, t);
  const shake = age >= 0 ? Math.sin(age * 71) * Math.exp(-age * 17) * 1.3 : 0;
  const base = [x + shake, y - drop + sink];
  const eye = [base[0] + Math.sin(tilt) * 38, base[1] - Math.cos(tilt) * 38];
  return { age, base, eye, tilt, fade: smooth(hit - 0.16, hit - 0.1, t) * (1 - smooth(3.86, 4.4, t)) };
}
function thread(p, pts, C, width = 0.9) {
  if (pts.length < 2) return;
  stroke(p, pts, C[0], width + 0.8);
  stroke(p, pts, C[3], width);
  stroke(p, pts.map(([x, y]) => [x - 0.25, y - 0.35]), C[5], width * 0.3);
}
function prefix(points, progress) {
  const u = clamp(progress) * (points.length - 1), n = Math.floor(u), out = points.slice(0, n + 1);
  if (n + 1 < points.length) out.push([points[n][0] + (points[n + 1][0] - points[n][0]) * (u - n), points[n][1] + (points[n + 1][1] - points[n][1]) * (u - n)]);
  return out;
}

export function drawBack(p, t, o) {
  t = Math.round(t * 1e9) / 1e9;
  if (t <= 0 || t >= meta.duration) return;
  const C = fit(o.palette, 8), fade = p.fade, pts = outline(t), k = tension(t);
  p.fade *= smooth(0.02, 0.23, t) * (1 - smooth(3.78, 4.38, t));
  polygon(p, pts, C[0]);
  stroke(p, [...pts, pts[0]], C[3], 0.85);
  // Large grouped planes preserve the body silhouette; the taut cloth grows angular ridges.
  polygon(p, [[-11, -76], [9, -75], [18, -47], [8, -16], [3, 0], [-16, -21], [-20, -51]].map(q => deform(q, t)), C[1]);
  polygon(p, [[-9, -114], [-6, -120], [2, -121], [7, -116], [0, -102], [-8, -99]].map(q => deform(q, t)), C[1]);
  for (let i = 0; i < 4; i++) {
    const grip = deform(GRIPS[i], t), c = deform([i % 2 ? 9 : -10, i < 2 ? -47 : -4], t);
    const a = [c[0] + (grip[0] - c[0]) * 0.36, c[1] + (grip[1] - c[1]) * 0.36 - 8 * k];
    const b = [c[0] + (grip[0] - c[0]) * 0.72, c[1] + (grip[1] - c[1]) * 0.72 + 3 * k];
    polygon(p, [c, [a[0] - 5, a[1] + 7], grip, b, a], C[k > 0.25 ? 2 : 1]);
    if (k > 0) {
      stroke(p, [c, a, grip], C[3], 0.8 * k, true);
      polygon(p, [c, [a[0] + 4, a[1] + 3], grip, [b[0] + 1, b[1] + 5]], C[0]);
      stroke(p, [[c[0] + 2, c[1] + 3], [b[0], b[1] + 5]], C[2], 0.8 * k, true);
    }
  }
  // Tightening raises thin knife-edge folds across the torso, rather than a glowing magic circle.
  if (k > 0) for (let j = 0; j < 5; j++) {
    const y = -57 + j * 13, a = deform([-19, y + 5], t), b = deform([16, y - 3], t);
    const ridge = [a, deform([j % 2 ? 2 : -3, y - 9 * k], t), b];
    stroke(p, ridge, C[2], 2.6 * k, true); stroke(p, ridge, C[4], 0.6 * k, true);
  }
  p.fade = fade;
  for (let i = 0; i < 4; i++) {
    const n = nailState(i, t);
    if (n.age < 0) continue;
    p.fade = fade * n.fade;
    polygon(p, ellipse(PINS[i][0] + 4, PINS[i][1] + 2, 13, 4, -0.1, 20), C[0]);
    for (let j = 0; j < 3; j++) {
      const r = rng(o.seed, i * 20 + j), a = r.range(0, Math.PI * 2), length = r.range(8, 17);
      const [x, y] = PINS[i];
      stroke(p, [[x, y], [x + Math.cos(a) * length * 0.6, y + Math.sin(a) * length * 0.23],
        [x + Math.cos(a + 0.25) * length, y + Math.sin(a + 0.25) * length * 0.4]], C[2], 0.7, true);
    }
  }
  p.fade = fade;
}

function nail(p, n, C) {
  if (n.fade <= 0) return;
  const fade = p.fade; p.fade *= n.fade;
  const tr = pts => transform(pts, n.base[0], n.base[1], 1, 1, n.tilt);
  polygon(p, tr([[-3.6, -32], [3.6, -32], [2.5, -7], [0, 3], [-3, -7]]), C[0]);
  polygon(p, tr([[-3, -31], [-0.6, -31], [0, 0], [-2, -8]]), C[4]);
  polygon(p, tr([[0.5, -31], [3, -31], [2, -7], [0, 2]]), C[1]);
  polygon(p, tr([[-7, -44], [-3, -49], [5, -48], [8, -42], [7, -32], [2, -29], [-6, -32]]), C[1]);
  polygon(p, tr([[-7, -44], [-3, -49], [5, -48], [3, -44], [-3, -42], [-5, -33], [-6, -32]]), C[4]);
  polygon(p, tr([[3, -44], [7, -42], [6, -33], [2, -30], [1, -33]]), C[2]);
  polygon(p, tr(ellipse(0, -38, 2.4, 3.6, 0, 12)), C[0]);
  stroke(p, tr([[-7, -44], [-3, -49], [2, -49]]), C[6], 0.75);
  stroke(p, tr([[-2, -41], [1, -42], [3, -39]]), C[3], 0.6);
  stroke(p, tr([[5, -33], [2, -30], [-3, -31]]), C[0], 1.2);
  p.fade = fade;
}

function sewing(p, i, t, pts, o, C, T) {
  const start = cues.sewing + i * 0.09, progress = smooth(start, start + 0.6, t);
  if (progress <= 0) return;
  const n = nailState(i, t), run = seam(pts, i), from = run[0], k = tension(t), age = t - cues.breaks[i];
  const sewn = prefix(run, progress), fade = p.fade;
  if (age < 0) {
    const sag = 18 * (1 - k) + Math.sin(t * 15 + i) * 1.1 * k;
    const lead = spline([n.eye, [n.eye[0] * 0.66 + from[0] * 0.34, n.eye[1] * 0.66 + from[1] * 0.34 + sag], from]);
    thread(p, prefix(lead, Math.min(1, progress * 6)), T, 0.95);
  } else {
    // Two free ends recoil independently, then hang under gravity from the eye and the final stitch.
    const retract = smooth(0, 0.16, age), sag = 22 * smooth(0.08, 0.6, age), sway = Math.sin(age * 13 + i) * 9 * Math.exp(-age * 3.4);
    const end = [n.eye[0] + (from[0] - n.eye[0]) * (0.53 - 0.3 * retract) + sway, n.eye[1] + 19 + sag];
    const curl = spline([n.eye, [n.eye[0] + sway * 0.5, n.eye[1] + 15], [end[0] + 5, end[1] - 7], end]);
    p.fade = fade * n.fade; thread(p, curl, T, 0.9);
    p.fade = fade * (1 - smooth(0.45, 0.85, age));
    thread(p, spline([from, [from[0] + (n.eye[0] - from[0]) * 0.2, from[1] + 3 + sag * 0.4],
      [from[0] + (n.eye[0] - from[0]) * (0.45 - retract * 0.2), from[1] + 5 + sag * 0.7]]), T, 0.85);
    if (age < 0.17) {
      const cx = (n.eye[0] + from[0]) / 2, cy = (n.eye[1] + from[1]) / 2;
      const snap = Math.sin(Math.PI * clamp(age / 0.17));
      stroke(p, [[cx - 4, cy - 9 * snap], [cx + 3, cy - 3]], C[5], 0.75 * snap);
      stroke(p, [[cx + 7, cy + 2], [cx + 11, cy + 7 * snap]], T[5], 0.7 * snap);
    }
  }
  p.fade = fade * (1 - smooth(cues.breaks[i] + 0.24, cues.breaks[i] + 0.82, t));
  // A fine running thread joins separate cross-stitches. Joining every crossing with a miter
  // would make sharp red lightning spikes instead of thread passing through puncture holes.
  const running = prefix(run.filter((_, j) => j % 2 === 1), progress);
  thread(p, running, T, 0.32);
  for (let j = 0; j < sewn.length - 1; j += 2) {
    thread(p, [sewn[j], sewn[j + 1]], T, 0.62);
    const [x, y] = sewn[j]; polygon(p, ellipse(x, y, 1.05, 0.75, 0, 8), C[0]);
  }
  if (progress < 1 && sewn.length > 1) {
    const a = sewn.at(-2), b = sewn.at(-1), dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy) || 1;
    stroke(p, [[b[0] - dx / len * 5, b[1] - dy / len * 5], [b[0] + dx / len * 4, b[1] + dy / len * 4]], C[6], 0.75);
  }
  p.fade = fade;
}

export function draw(p, t, o) {
  t = Math.round(t * 1e9) / 1e9;
  if (t <= 0 || t >= meta.duration) return;
  const C = fit(o.palette, 8), T = fit(o.thread, 8), fade = p.fade, pts = outline(t);
  for (let i = 0; i < 4; i++) {
    const n = nailState(i, t);
    nail(p, n, C);
    sewing(p, i, t, pts, o, C, T);
    if (n.age > 0 && n.age < 0.38) for (let j = 0; j < 6; j++) {
      const r = rng(o.seed, 150 + i * 10 + j), u = n.age / 0.38, speed = r.range(12, 30), side = r.range(-1, 1);
      const x = PINS[i][0] + side * speed * u, y = PINS[i][1] - Math.sin(u * Math.PI) * r.range(7, 16);
      p.fade = fade * (1 - smooth(0.4, 1, u));
      const q = transform([[-1, 0], [0, -1.4], [1.4, -0.3], [0.5, 1]], x, y, 1.2, 1.2, u * 4 + j);
      polygon(p, q, j % 3 ? C[2] : C[4]);
    }
    p.fade = fade;
  }
}
