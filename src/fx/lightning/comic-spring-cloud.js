import { fit, rng, smooth, clamp } from "../../core/index.js";
import { PALETTE, polygon, spline, stroke, ribbon, shape, arc, transform, star, chip, puff } from "../_comic.js";

export const meta = {
  name: "Comic spring cloud",
  desc: "A cloud squashes a zigzag lightning spring, fires it into a ground starburst, then rebounds with two diminishing bounces above curling dust.",
  tags: ["comic", "lightning", "cloud", "spring-loaded", "charge", "impact", "one-shot"],
  size: [384, 384], origin: [192, 328], duration: 3, fps: 24, loop: false, bg: "light",
  options: { palette: PALETTE, seed: 67 },
};
export const cues = { release: 1.04, impact: 1.208333333, recovery: 1.34 };
const CLOUD = spline([[-75, 12], [-91, 0], [-89, -17], [-76, -26], [-60, -25], [-54, -43],
  [-33, -49], [-15, -40], [0, -54], [22, -53], [40, -34], [56, -38], [73, -28],
  [75, -11], [91, -3], [90, 14], [72, 25], [46, 24], [26, 31], [2, 28], [-23, 33], [-43, 24], [-63, 27]], true);

function cloudState(t) {
  const born = smooth(0, 0.3, t), charge = smooth(0.35, cues.release, t), a = Math.max(0, t - cues.impact);
  const recoil = t < cues.impact ? 0 : Math.exp(-a * 3.2) * Math.sin(a * 11.5);
  const released = smooth(cues.release, cues.impact + 0.03, t), gone = smooth(2.15, 2.85, t);
  return { x: released * Math.sin(a * 17) * Math.exp(-a * 4) * 5,
    y: -225 + charge * 37 * (1 - released) - recoil * 52,
    sx: born * (1 + charge * 0.2 * (1 - released) - recoil * 0.1) * (1 - gone * 0.35),
    sy: born * (1 - charge * 0.52 * (1 - released) + recoil * 0.17) * (1 - gone * 0.35),
    charge, released, born, gone };
}

function cloud(p, C, s) {
  if (s.born < 0.02 || s.gone >= 1) return;
  const fade = p.fade; p.fade *= 1 - s.gone;
  const tr = (pts) => transform(pts, s.x, s.y, s.sx, s.sy);
  shape(p, tr(CLOUD), C, 5, 1.55);
  polygon(p, tr(spline([[-85, 6], [-60, 14], [-37, 8], [-12, 17], [15, 12], [40, 16], [67, 7], [87, 5], [86, 16], [67, 22], [45, 21], [23, 28], [1, 25], [-23, 30], [-44, 21], [-63, 24], [-77, 16]], true)), C[3]);
  polygon(p, tr(spline([[-81, -10], [-72, -21], [-56, -19], [-49, -36], [-33, -43], [-16, -32], [2, -46], [20, -46], [35, -30], [13, -33], [-6, -22], [-27, -29], [-45, -21], [-60, -6]], true)), C[7]);
  for (const pts of [ [[-69, -6], [-55, -9], [-45, -3]], [[-25, -22], [-10, -25], [3, -19]], [[27, -14], [42, -21], [55, -17]], [[-10, 12], [3, 16], [18, 13]] ])
    stroke(p, tr(spline(pts)), C[2], 0.95, true);
  for (let row = 0; row < 3; row++) for (let col = 0; col < 12; col++) {
    const x = -43 + col * 8 + row % 2 * 4, y = 17 + row * 3;
    if (row > 0 && (x < -28 || x > 30)) continue;
    const [a, b] = tr([[x, y]])[0]; p.circle(a, b, 0.75, C[2]);
  }
  p.fade = fade;
}

function bolt(p, C, t, s) {
  if (t < 0.22 || t > 1.55) return;
  const release = smooth(cues.release, cues.impact, t), top = s.y + 25 * s.sy;
  const height = (83 - s.charge * 43) * (1 - release) + (-12 - top) * release;
  const pts = [[0, top]];
  for (let i = 1; i <= 5; i++) pts.push([(i % 2 ? -1 : 1) * (23 - i * 1.7) * (1 - release * 0.2), top + height * i / 6]);
  pts.push([0, top + height]);
  const k = smooth(0.22, 0.43, t) * (1 - smooth(1.3, 1.55, t));
  const thickness = (2.1 + release * 5.5) * k;
  stroke(p, pts, C[0], thickness + 1.2 * k);
  stroke(p, pts, C[3], thickness);
  stroke(p, pts.map(([x, y]) => [x - 0.8 * k, y]), C[7], thickness * 0.57);
  if (release > 0.5) {
    const branch = [[-7, -115], [-36, -102], [-26, -83], [-57, -61]];
    stroke(p, branch, C[0], 2.8 * k);
    stroke(p, branch, C[6], 1.45 * k);
  }
}

export function drawBack(p, t, o) {
  t = Math.round(t * 1e9) / 1e9;
  if (t <= 0 || t >= meta.duration) return;
  const C = fit(o.palette, 8), s = cloudState(t), h = t - cues.impact;
  if (t < cues.release && t > 0.4) {
    for (const side of [-1, 1]) for (let i = 0; i < 3; i++) {
      const x = side * (113 + i * 5), y = s.y - 28 + i * 24;
      stroke(p, spline([[x, y - 10], [x - side * 11, y - 3], [x - side * 14, y + 2]]), C[2], 1.1 * s.charge, true);
    }
  }
  if (h >= 0 && h < 0.75) {
    const u = h / 0.75, r = 18 + 110 * (1 - (1 - u) ** 3);
    ribbon(p, arc(0, 0, r, r * 0.17, Math.PI, Math.PI), C, 5 * (1 - u), true);
  }
  bolt(p, C, t, s);
}

export function draw(p, t, o) {
  t = Math.round(t * 1e9) / 1e9;
  if (t <= 0 || t >= meta.duration) return;
  const C = fit(o.palette, 8), s = cloudState(t), h = t - cues.impact;
  cloud(p, C, s);
  if (h >= 0 && h < 0.38) {
    const k = 1 - smooth(0.1, 0.38, h);
    star(p, 0, -3, (45 + 50 * smooth(0, 0.16, h)) * k, 33 * k, C, 0.12, 11);
  }
  if (h >= 0 && h < 0.75) {
    const u = h / 0.75, r = 18 + 110 * (1 - (1 - u) ** 3);
    ribbon(p, arc(0, 0, r, r * 0.17, 0, Math.PI), C, 5 * (1 - u));
  }
  for (let i = 0; i < 8; i++) {
    const R = rng(o.seed, i + 12), life = R.range(0.65, 1.2), u = h / life;
    if (u <= 0 || u >= 1) continue;
    const side = i % 2 ? 1 : -1, x = side * (18 + R.range(50, 118) * (1 - (1 - u) ** 3));
    const y = -5 - Math.sin(u * Math.PI) * R.range(10, 33);
    puff(p, x, y, R.range(10, 19) * Math.sin(Math.PI * u), R.range(5, 10) * Math.sin(Math.PI * u), C, i);
    chip(p, x * 0.82, y - Math.sin(u * Math.PI) * 27, 3.5 * Math.sin(Math.PI * u), u * 7 + i, C);
  }
  if (h > 0.03 && h < 0.32) for (const side of [-1, 1]) {
    const u = (h - 0.03) / 0.29, x = side * (26 + u * 45), y = -49 - u * 55;
    stroke(p, [[x, y], [x + side * 12, y - 7], [x + side * 8, y - 15], [x + side * 20, y - 23]], C[2], 1.5 * (1 - u));
  }
}
