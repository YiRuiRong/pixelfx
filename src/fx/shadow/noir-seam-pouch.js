import { fit, rng, smooth, clamp, lerp, TAU } from "../../core/index.js";
import { polygon, stroke, spline, ellipse, transform } from "../_comic.js";

export const meta = {
  name: "Noir seam pouch",
  desc: "Three iron clasps stitch a crimson triangle. Its floor turns to charcoal cloth, rises into a deeply pleated pouch, cinches shut, then tears into falling fabric strips.",
  tags: ["comic", "noir", "shadow", "stitch", "thread", "cloth", "trap", "bind", "ground", "one-shot"],
  size: [448, 384], origin: [224, 256], duration: 5.5, fps: 24, loop: false, bg: "dark",
  options: {
    palette: ["#080b12", "#141a24", "#252f3c", "#3c4858", "#5a6675", "#828c95", "#b1b5b5", "#ded8c8"],
    thread: ["#1b0c17", "#35131f", "#581f2d", "#7a293a", "#9b3d4b", "#bb6269", "#d89a92", "#e9c7ae"],
    nodes: [[-150, 25], [133, 39], [18, -103]],
    seed: 149,
  },
};

export const cues = {
  pins: [0.25, 0.833333333, 1.416666667], closed: 1.75,
  cloth: 1.791666667, lift: 2.208333333, tighten: 2.833333333,
  impact: 3.166666667, tear: 3.708333333,
};

const SAMPLES = 48, RINGS = 15;
const cross = (a, b, c) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);

function geometry(o) {
  let nodes = o.nodes;
  if (!Array.isArray(nodes) || nodes.length !== 3 || nodes.some(q => !Array.isArray(q) || q.length !== 2 || q.some(v => !Number.isFinite(v)))
    || Math.abs(cross(...nodes)) < 32) nodes = meta.options.nodes;
  const c = [nodes.reduce((n, q) => n + q[0], 0) / 3, nodes.reduce((n, q) => n + q[1], 0) / 3];
  return { nodes, c };
}

function boundary(g, u) {
  u = ((u % 1) + 1) % 1;
  const f = u * 3, i = Math.floor(f), a = g.nodes[i], b = g.nodes[(i + 1) % 3];
  return [lerp(a[0], b[0], f - i), lerp(a[1], b[1], f - i)];
}

function motion(t) {
  const age = Math.max(0, t - cues.impact);
  return {
    reveal: smooth(cues.cloth, 2.125, t),
    lift: smooth(cues.lift, 2.791666667, t),
    tight: smooth(cues.tighten, cues.impact, t),
    burst: Math.max(0, t - cues.tear),
    fade: 1 - smooth(cues.tear + 0.18, cues.tear + 0.72, t),
    squeeze: t < cues.impact ? 0 : Math.sin(age * 24) * Math.exp(-age * 8) * 0.13,
  };
}

// Material coordinates: radius 0 is the bag bottom, radius 1 is its moving drawstring hem.
// The radial bulge keeps a belly below the neck, rather than turning the cloth into a cone.
function fabric(g, s, u, r, seed, piece = Math.floor(((u % 1 + 1) % 1) * 3)) {
  const b = boundary(g, u), dx = b[0] - g.c[0], dy = b[1] - g.c[1];
  const a = Math.atan2(dy * 1.8, dx);
  const weave = Math.sin(u * TAU * 7 + Math.sin(u * TAU * 3 + 0.2) * 1.4 + Math.sin(r * 3.6 + u * 8) * 0.5);
  const pleat = weave * s.lift * (0.014 + 0.026 * s.tight) * Math.sin(Math.PI * r);
  const radial = r * (1 - s.lift * 0.25) - s.tight * 0.67 * r ** 3 + s.lift * 0.12 * Math.sin(Math.PI * r) + pleat;
  const z = (s.lift * 112 + s.tight * 30) * smooth(0.1, 1, r) * (1 + s.squeeze * 0.3);
  const flutter = (1.3 * Math.sin(u * TAU * 9) + 0.7 * Math.sin(u * TAU * 17 + seed)) * r ** 3 * s.reveal;
  const roundX = lerp(dx, Math.cos(a) * 148, s.tight * 0.8), roundY = lerp(dy, Math.sin(a) * 76, s.tight * 0.8);
  let x = g.c[0] + roundX * radial * s.reveal * (1 - s.squeeze) + Math.cos(a) * flutter;
  let y = g.c[1] + roundY * radial * s.reveal - z + Math.sin(a) * flutter * 0.4;
  y += s.lift * (1 - s.tight) * Math.sin(((u * 3 % 1 + 1) % 1) * Math.PI) * 18 * r ** 4;
  if (s.burst > 0) {
    const q = boundary(g, (piece + 0.5) / 3), vx = q[0] - g.c[0], vy = q[1] - g.c[1];
    const len = Math.hypot(vx, vy) || 1, open = smooth(0, 0.17, s.burst);
    const roll = smooth(0.03, 0.4, s.burst), pivot = [g.c[0] + vx / len * 26, g.c[1] - 64];
    const turn = (piece === 1 ? -0.8 : 0.8) * roll;
    const localX = (x - pivot[0]) * (1 - 0.58 * roll), localY = (y - pivot[1]) * (1 - 0.15 * roll);
    x = pivot[0] + localX * Math.cos(turn) - localY * Math.sin(turn);
    y = pivot[1] + localX * Math.sin(turn) + localY * Math.cos(turn);
    x += vx / len * (22 * open + 65 * s.burst);
    y += vy / len * 15 * open - 38 * Math.sin(Math.min(1, s.burst / 0.55) * Math.PI) + 86 * s.burst ** 2;
    x += Math.sin(r * 10 + s.burst * 14 + piece) * s.burst * 7;
  }
  return [x, y];
}

function cord(p, points, T, width = 0.8) {
  if (points.length < 2) return;
  stroke(p, points, T[0], width + 0.75);
  stroke(p, points, T[3], width);
  stroke(p, points.map(([x, y]) => [x - 0.25, y - 0.3]), T[5], width * 0.28);
}

function pinState(g, i, t) {
  const age = t - cues.pins[i], [x, y] = g.nodes[i];
  const drop = 53 * (1 - clamp((age + 0.17) / 0.17) ** 2);
  const sink = 20 * smooth(4.3, 4.9, t);
  const wobble = age < 0 ? 0 : Math.sin(age * 64) * Math.exp(-age * 15) * 1.2;
  return { age, x: x + wobble, y: y - drop + sink,
    fade: smooth(-0.19, -0.12, age) * (1 - smooth(4.25, 4.95, t)) };
}

function pin(p, n, C, i) {
  if (n.fade <= 0) return;
  const saved = p.fade; p.fade *= n.fade;
  const tr = points => transform(points, n.x, n.y, 1, 1, [-0.11, 0.1, -0.04][i]);
  polygon(p, tr([[-9, -4], [7, -5], [11, -1], [7, 4], [-8, 3], [-12, 0]]), C[0]);
  polygon(p, tr([[-7, -5], [7, -5], [8, -1], [5, 1], [-8, 0]]), C[3]);
  polygon(p, tr([[-2, -16], [3, -16], [3, -1], [0, 7], [-2, 0]]), C[1]);
  polygon(p, tr([[-5, -26], [1, -29], [7, -25], [8, -17], [3, -12], [-4, -14], [-7, -20]]), C[2]);
  stroke(p, tr([[-5, -25], [1, -28], [5, -25]]), C[6], 0.85);
  polygon(p, tr(ellipse(0, -21, 3.1, 4.2, 0, 14)), C[0]);
  stroke(p, tr([[-5, -24], [-6, -20], [-3, -15]]), C[4], 0.8);
  p.fade = saved;
}

function tracing(p, g, t, C, T) {
  const times = [cues.pins[0] + 0.05, cues.pins[1] + 0.05, cues.pins[2] + 0.05, cues.closed];
  for (let side = 0; side < 3; side++) {
    const a = g.nodes[side], b = g.nodes[(side + 1) % 3], prog = smooth(times[side], times[side + 1], t);
    if (!prog) continue;
    const points = Array.from({ length: 29 }, (_, j) => {
      const u = prog * j / 28;
      return [lerp(a[0], b[0], u), lerp(a[1], b[1], u) - 1.2 - Math.sin(u * Math.PI) * 2];
    });
    cord(p, points, T, 0.85);
    const dx = b[0] - a[0], dy = b[1] - a[1], length = Math.hypot(dx, dy), nx = -dy / length, ny = dx / length;
    const count = Math.floor(length / 12);
    for (let j = 1; j < count * prog; j++) {
      const u = j / count, x = lerp(a[0], b[0], u), y = lerp(a[1], b[1], u) - 1.2;
      cord(p, [[x - nx * 2.4, y - ny * 2.4], [x + nx * 2.4, y + ny * 2.4]], T, 0.5);
    }
    if (prog < 1) {
      const q = points.at(-1);
      stroke(p, [[q[0] - dx / length * 7, q[1] - dy / length * 7 - 1], [q[0] + dx / length * 3, q[1] + dy / length * 3]], C[6], 0.85);
    }
  }
}

function cloth(p, g, s, o, C, front) {
  if (s.reveal <= 0 || s.fade <= 0) return;
  const saved = p.fade; p.fade *= s.fade;
  const cells = [], runs = [];
  for (let j = 0; j < SAMPLES; j++) {
    const u = j / SAMPLES, mid = boundary(g, (j + 0.5) / SAMPLES);
    if ((mid[1] >= g.c[1]) !== front) continue;
    const piece = Math.floor(j / (SAMPLES / 3));
    const key = s.burst > 0 ? piece : 0, last = runs.at(-1);
    if (last && last.end === j && last.key === key) last.end = j + 1;
    else runs.push({ start: j, end: j + 1, key, piece });
    for (let k = 0; k < RINGS; k++) {
      const r0 = k / RINGS, r1 = (k + 1) / RINGS, gap = s.burst > 0 ? 0.0014 * smooth(0, 0.12, s.burst) : 0;
      const ua = u + (j % 16 === 0 ? gap : 0), ub = (j + 1) / SAMPLES - ((j + 1) % 16 === 0 ? gap : 0);
      const pts = [[ua, r0], [ub, r0], [ub, r1], [ua, r1]].map(([v, r]) => fabric(g, s, v, r, o.seed, piece));
      const v = (j + 0.5) / SAMPLES, r = (r0 + r1) / 2;
      const ridge = Math.sin(v * TAU * 7 + Math.sin(v * TAU * 3 + 0.2) * 1.4 + Math.sin(r * 3.6 + v * 8) * 0.5);
      const light = !front && j % 5 < 3 ? 1 : 0;
      const fold = s.lift > 0.1 ? (ridge > 0.4 ? 1 : ridge < -0.85 ? -1 : 0) : 0;
      const tone = clamp(1 + light + fold, 0, 3);
      cells.push({ pts, tone, depth: (mid[1] - g.c[1]) * (r0 + r1) / 2 });
    }
  }
  // Opaque fabric beneath the shaded mesh prevents antialiased shared edges from turning into
  // a transparent wireframe on light backgrounds. Only the three actual tear seams open up.
  if (runs.length > 1 && runs[0].start === 0 && runs.at(-1).end === SAMPLES && runs[0].key === runs.at(-1).key) {
    const first = runs.shift(); runs.at(-1).end = first.end + SAMPLES;
  }
  for (const run of runs) {
    const pts = [], a = run.start / SAMPLES, b = run.end / SAMPLES;
    for (let k = 0; k <= RINGS; k++) pts.push(fabric(g, s, a, k / RINGS, o.seed, run.piece));
    for (let j = run.start + 1; j <= run.end; j++) pts.push(fabric(g, s, j / SAMPLES, 1, o.seed, run.piece));
    for (let k = RINGS - 1; k >= 0; k--) pts.push(fabric(g, s, b, k / RINGS, o.seed, run.piece));
    polygon(p, pts, C[1]);
  }
  cells.sort((a, b) => a.depth - b.depth);
  for (const cell of cells) polygon(p, cell.pts, C[cell.tone]);
  // Grouped fold valleys and short crosshatching follow the material, rather than screen-space noise.
  for (let j = 0; j < 13; j++) {
    const R = rng(o.seed, 200 + j), u = (j + R.range(0.15, 0.7)) / 13, b = boundary(g, u);
    if ((b[1] >= g.c[1]) !== front) continue;
    const inner = R.range(0.3, 0.6), outer = lerp(0.71, 0.97, s.lift);
    const pts = Array.from({ length: 12 }, (_, k) => fabric(g, s, u + Math.sin(k * 0.4 + j) * 0.009, lerp(inner, outer, k / 11), o.seed));
    stroke(p, pts, C[j % 3 === 0 ? 3 : 0], 0.35 + s.lift * 0.65, true);
    if (j % 3 === 0) for (let k = 0; k < 3; k++) {
      const r = 0.54 + k * 0.055;
      stroke(p, [fabric(g, s, u - 0.006, r, o.seed), fabric(g, s, u + 0.015, r + 0.025, o.seed)], C[3], 0.45);
    }
  }
  p.fade = saved;
}

function hem(p, g, s, t, o, C, T, front) {
  if (s.reveal < 0.99 || s.fade <= 0) return;
  const saved = p.fade; p.fade *= s.fade;
  for (let j = 0; j < SAMPLES; j++) {
    const u = j / SAMPLES, b = boundary(g, (j + 0.5) / SAMPLES);
    if ((b[1] >= g.c[1]) !== front) continue;
    const piece = Math.floor(j / 16), points = Array.from({ length: 4 }, (_, k) => fabric(g, s, u + k / 3 / SAMPLES, 1, o.seed, piece));
    stroke(p, points, C[4], 1.4);
    cord(p, points, T, 0.7);
    if (j % 2 === 0) {
      const a = fabric(g, s, u, 0.965, o.seed, piece), b2 = fabric(g, s, u, 1.015, o.seed, piece);
      cord(p, [a, b2], T, 0.45);
    }
  }
  p.fade = saved;
}

function tethers(p, g, s, t, o, T, front) {
  if (s.lift <= 0) return;
  const saved = p.fade;
  for (let i = 0; i < 3; i++) {
    if ((g.nodes[i][1] >= g.c[1]) !== front) continue;
    const n = pinState(g, i, t), end = fabric(g, s, i / 3, 1, o.seed, i), start = [n.x, n.y - 21];
    p.fade = saved * n.fade;
    if (s.burst <= 0) {
      const sag = 14 * s.lift * (1 - s.tight), control = [(start[0] + end[0]) / 2, (start[1] + end[1]) / 2 + sag];
      cord(p, spline([start, control, end]), T, 0.8);
    } else {
      const recoil = smooth(0, 0.16, s.burst), droop = 35 * smooth(0.08, 0.65, s.burst);
      const q = [start[0] + (end[0] - start[0]) * (0.45 - recoil * 0.28) + Math.sin(s.burst * 20 + i) * 5 * Math.exp(-s.burst * 5), start[1] + droop];
      cord(p, spline([start, [start[0] + (q[0] - start[0]) * 0.65, start[1] - 12 * (1 - recoil)], q]), T, 0.75);
    }
  }
  p.fade = saved;
}

function scraps(p, g, t, o, C, front) {
  const saved = p.fade;
  for (let i = 0; i < 19; i++) {
    if ((i % 3 !== 0) !== front) continue;
    const R = rng(o.seed, 500 + i), age = t - cues.tear - R.range(0, 0.17), life = R.range(1.05, 1.58);
    if (age <= 0 || age >= life) continue;
    const turn = R.range(-Math.PI, Math.PI), side = R.range(-1, 1), speed = R.range(65, 170), startY = R.range(-126, -35);
    const drag = (1 - Math.exp(-age * 2.4)) / 2.4;
    const x = g.c[0] + R.range(-38, 38) + side * speed * drag + Math.sin(age * 8 + i) * age * 6;
    const y = g.c[1] + startY - R.range(12, 42) * drag + 60 * age ** 2;
    const size = R.range(4, 10), flap = 0.25 + Math.abs(Math.sin(age * R.range(8, 13) + i)) * 0.75;
    p.fade = saved * (1 - smooth(0.45, 1, age / life));
    const pts = transform([[-1, -0.3], [-0.2, -0.7], [0.5, -0.34], [1.7, 0.05], [1.25, 0.34], [0.36, 0.17], [-0.4, 0.54], [-0.8, 0.25]], x, y, size, size * flap, turn + age * R.range(-5, 5));
    polygon(p, pts, C[1 + i % 3]);
    stroke(p, [pts[0], pts[1], pts[2], pts[3]], C[4], 0.55);
    if (i % 3 === 0) stroke(p, [pts[4], [pts[4][0] + 3, pts[4][1] + 5]], C[2], 0.45);
  }
  p.fade = saved;
}

function render(p, rawTime, o, front) {
  const t = Math.round(rawTime * 1e9) / 1e9;
  if (t <= 0 || t >= meta.duration) return;
  // Equivalent node/world translations must produce identical coverage, including color rounding
  // along translucent threads. Keep subpixel precision without floating-point addition-order noise.
  const placed = p;
  p = Object.create(placed);
  p.toX = (x, y) => Math.round(placed.toX(x, y) * 1e7) / 1e7;
  p.toY = (x, y) => Math.round(placed.toY(x, y) * 1e7) / 1e7;
  const g = geometry(o), s = motion(t), C = fit(o.palette, 8), T = fit(o.thread, 8), saved = p.fade;
  if (!front) {
    p.fade = saved * s.lift * (1 - smooth(4.1, 5.1, t)) * 0.2;
    polygon(p, ellipse(g.c[0], g.c[1] + 9, 105 - 33 * s.tight, 35 - 10 * s.tight), C[0]);
    p.fade *= 0.65;
    polygon(p, ellipse(g.c[0], g.c[1] + 9, 117 - 33 * s.tight, 41 - 10 * s.tight), C[0]);
    p.fade = saved;
    for (let i = 0; i < 3; i++) {
      const n = pinState(g, i, t);
      if (n.age < 0) continue;
      p.fade = saved * n.fade * 0.65;
      polygon(p, ellipse(g.nodes[i][0], g.nodes[i][1] + 2, 12, 4), C[0]);
      for (let j = 0; j < 3; j++) {
        const a = j * 2.1 + i, x = g.nodes[i][0], y = g.nodes[i][1];
        stroke(p, [[x, y], [x + Math.cos(a) * 10, y + Math.sin(a) * 5], [x + Math.cos(a + 0.4) * 16, y + Math.sin(a + 0.4) * 8]], C[2], 0.55, true);
      }
    }
    p.fade = saved;
    if (t < 2.25) {
      p.fade *= 1 - smooth(cues.lift, 2.25, t);
      tracing(p, g, t, C, T); p.fade = saved;
    }
  }
  // A rear floor clasp must disappear behind the lifted fabric rather than float on its inside wall.
  if (!front) for (let i = 0; i < 3; i++) {
    if (g.nodes[i][1] < g.c[1]) pin(p, pinState(g, i, t), C, i);
  }
  cloth(p, g, s, o, C, front);
  if (!front && s.lift > 0 && s.tight < 1 && s.burst === 0) {
    p.fade = saved * smooth(0.12, 0.6, s.lift) * (1 - smooth(0.78, 1, s.tight));
    polygon(p, Array.from({ length: SAMPLES }, (_, j) => fabric(g, s, j / SAMPLES, 0.985, o.seed)), C[0]);
    p.fade = saved;
  }
  hem(p, g, s, t, o, C, T, front);
  tethers(p, g, s, t, o, T, front);
  for (let i = 0; i < 3; i++) {
    if ((g.nodes[i][1] >= g.c[1]) !== front) continue;
    const n = pinState(g, i, t); if (front) pin(p, n, C, i);
    if (n.age <= 0 || n.age >= 0.35) continue;
    p.fade = saved * (1 - smooth(0.1, 0.35, n.age));
    for (let j = 0; j < 6; j++) {
      const R = rng(o.seed, i * 12 + j), dir = R.range(-1, 1), u = n.age / 0.35;
      const x = n.x + dir * R.range(10, 29) * u, y = g.nodes[i][1] - Math.sin(u * Math.PI) * R.range(5, 15);
      polygon(p, transform([[-1.5, 0], [0, -1.4], [1.8, 0.5], [0, 1]], x, y, 1, 1, u * 4), C[2 + j % 3]);
    }
    p.fade = saved;
  }
  if (front && t >= cues.impact && t < cues.tear) {
    const top = [g.c[0], g.c[1] - 139], pulse = Math.sin((t - cues.impact) * 25) * Math.exp(-(t - cues.impact) * 7);
    cord(p, spline([[top[0] - 8, top[1]], [top[0] - 2, top[1] - 4 + pulse], [top[0] + 7, top[1] + 1], [top[0], top[1] + 4], [top[0] - 8, top[1]]]), T, 1.25);
    cord(p, spline([top, [top[0] + 13, top[1] - 3], [top[0] + 19, top[1] + 9]]), T, 0.7);
  }
  scraps(p, g, t, o, C, front);
  p.fade = saved;
}

export function drawBack(p, t, o) { render(p, t, o, false); }
export function draw(p, t, o) { render(p, t, o, true); }
