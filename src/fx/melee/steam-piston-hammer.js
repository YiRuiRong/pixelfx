import { fit, rng, smooth, clamp, TAU } from "../../core/index.js";
import { polygon, spline, stroke, shape, ellipse, arc, transform, chip } from "../_comic.js";

export const meta = {
  name: "Steam piston hammer",
  desc: "A soot-black industrial hammer ratchets on tarnished brass pistons, slams into broken stone and low coal-smoke steam, then labours upward through lingering vapour.",
  tags: ["comic", "steam", "piston", "industrial", "hammer", "heavy", "impact", "ground", "one-shot"],
  size: [448, 448], origin: [224, 392], duration: 4, fps: 24, loop: false, bg: "dark",
  options: {
    palette: ["#101518", "#292520", "#44362b", "#5c4934", "#746044", "#917b57", "#af9b73", "#c4b58d"],
    iron: ["#090e12", "#141b20", "#242f35", "#34434a", "#4b5b62", "#64767c", "#87969a", "#aab3b0"],
    steam: ["#20282a", "#343e40", "#505b5a", "#747e77", "#8b9387", "#a9ad9d", "#bfc1b0", "#cccbbb"],
    soot: ["#0d1215", "#1b2123", "#2a3130", "#3b433f", "#50564d", "#686d60", "#838777", "#a0a28d"],
    heat: ["#1c1614", "#3d211c", "#633026", "#8a4130", "#a85635", "#bd7647", "#d69c61", "#e1b47a"],
    seed: 83,
  },
};
export const cues = { release: 1.375, impact: 1.541666667, recovery: 2.0 };

// Three short advances and two catches make each worn sleeve feel driven by machinery.
function ratchet(start, end, t) {
  const u = clamp((t - start) / (end - start));
  return 0.48 * smooth(0, 0.31, u) + 0.34 * smooth(0.46, 0.67, u) + 0.18 * smooth(0.81, 1, u);
}

function state(t) {
  const born = smooth(0, 0.3, t), gone = smooth(3.4, 3.97, t);
  const lift = 0.13 * smooth(cues.recovery, 2.22, t) + 0.7 * smooth(2.3, 3.05, t) + 0.17 * smooth(3.05, 3.3, t);
  const retract = smooth(2.94, 3.62, t), sink = 3 * smooth(cues.impact, cues.impact + 0.1, t) * (1 - lift);
  const slam = clamp((t - cues.release) / (cues.impact - cues.release)) ** 2.8 * (1 - lift);
  const lengths = [
    12 + 28 * ratchet(0.16, 0.48, t) * (1 - retract * 0.55) + 30 * slam,
    10 + 25 * ratchet(0.43, 0.76, t) * (1 - retract * 0.55) + 29 * slam,
    10 + 21 * ratchet(0.72, 1.00, t) * (1 - retract * 0.55) + 27 * slam + sink,
  ];
  const bottom = -256 + lengths.reduce((a, b) => a + b, 0) + 64;
  const h = t - cues.impact;
  return { born, gone, lengths, bottom, lift, slam,
    shake: h > 0 ? Math.sin(h * 66) * Math.exp(-h * 12) * 1.8 :
      Math.sin(t * 89) * smooth(1.04, cues.release, t) * 0.25,
    mount: -7 * (1 - born) - 8 * gone,
    pressure: smooth(0.5, cues.release, t) * (1 - smooth(cues.impact, 2.35, t)),
    furnace: 0.84 + Math.sin(t * 17) * 0.1 + Math.sin(t * 31) * 0.06,
  };
}

function rivet(p, x, y, C, r = 2.5) {
  polygon(p, ellipse(x, y, r + 0.7, r + 0.7, 0.2, 6), C[0]);
  polygon(p, ellipse(x, y, r, r, 0.2, 6), C[3]);
  stroke(p, [[x - r * 0.5, y - r * 0.4], [x + r * 0.45, y - r * 0.4]], C[5], 0.65);
  if (r > 2.5) stroke(p, [[x - r * 0.22, y + 0.3], [x + r * 0.3, y + 0.3]], C[1], 0.55);
}

function sleeve(p, x, top, bottom, w, B, I) {
  shape(p, [[x - w, top], [x + w, top], [x + w, bottom - 3], [x + w - 5, bottom],
    [x - w + 4, bottom], [x - w, bottom - 3]], B, 3, 1.25);
  polygon(p, [[x + w * 0.38, top + 1], [x + w - 1, top + 1], [x + w - 1, bottom - 4],
    [x + w - 5, bottom - 1], [x + w * 0.38, bottom - 1]], B[2]);
  polygon(p, [[x - w + 4, top + 1], [x - w + 7, top + 1], [x - w + 7, bottom - 2], [x - w + 4, bottom - 2]], B[5]);
  const h = bottom - top;
  polygon(p, [[x + w * 0.25, top], [x + w * 0.48, top], [x + w * 0.48, top + h * 0.42],
    [x + w * 0.32, top + h * 0.63], [x + w * 0.25, top + h * 0.25]], B[1]);
  stroke(p, [[x - 2, top + h * 0.21], [x - 2, top + h * 0.52]], B[4], 0.5);
  stroke(p, [[x - w + 1, top + 1], [x - w + 1, bottom - 9]], I[4], 0.55);
  shape(p, [[x - w - 3, bottom - 7], [x + w + 3, bottom - 7], [x + w + 3, bottom - 2],
    [x + w - 2, bottom + 2], [x - w + 2, bottom + 2], [x - w - 3, bottom - 2]], I, 2, 1);
  stroke(p, [[x - w - 1, bottom - 6], [x + w * 0.25, bottom - 6]], I[4], 0.85);
}

function housing(p, B, I, H, s) {
  const dx = s.shake * 0.4, dy = s.mount;
  const tr = (pts) => transform(pts, dx, dy);
  // Two bent supply pipes sit behind the fixed barrel, not on the moving ram.
  for (const side of [-1, 1]) {
    const pts = tr(spline([[side * 40, -321], [side * 65, -320], [side * 72, -308], [side * 72, -274], [side * 53, -266]]));
    stroke(p, pts, I[0], 6.6);
    stroke(p, pts, B[2], 4.5);
    stroke(p, pts.map(([x, y]) => [x - 1.4, y - 0.8]), I[4], 0.9);
    shape(p, tr([[side * 66, -289], [side * 78, -289], [side * 80, -284],
      [side * 78, -277], [side * 66, -277], [side * 64, -283]]), B, 2, 1);
    stroke(p, tr([[side * 67, -287], [side * 76, -287]]), B[4], 0.8);
  }
  shape(p, tr([[-49, -335], [-34, -345], [34, -345], [49, -335], [49, -259], [34, -248], [-34, -248], [-49, -259]]), I, 2, 1.6);
  polygon(p, tr([[18, -342], [35, -342], [47, -333], [47, -260], [34, -251], [18, -251]]), I[1]);
  polygon(p, tr([[-34, -336], [-26, -340], [-26, -252], [-33, -252], [-41, -260], [-41, -327]]), I[3]);
  stroke(p, tr([[-44, -327], [-44, -268], [-33, -255]]), I[5], 0.95);
  stroke(p, tr([[48, -326], [48, -266]]), I[3], 0.7);
  polygon(p, tr([[-25, -331], [-18, -327], [-21, -309], [-18, -292], [-24, -279], [-26, -292]]), B[2]);
  polygon(p, tr([[19, -325], [30, -329], [31, -316], [26, -309], [27, -293], [21, -300]]), I[0]);
  polygon(p, tr([[5, -275], [18, -279], [31, -272], [39, -257], [11, -253], [-2, -260]]), I[0]);
  polygon(p, tr([[-12, -325], [-4, -328], [9, -325], [16, -321], [9, -319], [-2, -321], [-10, -319]]), I[3]);
  for (const y of [-334, -258]) {
    shape(p, tr([[-55, y - 5], [-45, y - 10], [45, y - 10], [55, y - 5], [55, y + 5], [44, y + 10], [-44, y + 10], [-55, y + 5]]), B, 2, 1.3);
    stroke(p, tr([[-48, y - 4], [-33, y - 7], [22, y - 7]]), B[5], 0.95);
    stroke(p, tr([[-51, y + 2], [-51, y - 2], [-45, y - 5]]), I[5], 0.65);
    stroke(p, tr([[-46, y + 6], [44, y + 6]]), B[1], 1.4);
    for (const x of [-40, 0, 40]) rivet(p, x + dx, y + dy + 1, I, 2.8);
  }
  // External tie bolts and a small cast plaque break the cylinder into readable planes.
  for (const x of [-37, 37]) {
    stroke(p, tr([[x, -326], [x, -267]]), I[0], 3.2);
    stroke(p, tr([[x - 0.8, -325], [x - 0.8, -267]]), I[4], 0.7);
  }
  // A shuttered furnace inspection port gives a small, restrained source of warmth.
  shape(p, tr([[-17, -313], [12, -313], [17, -307], [17, -287], [12, -281], [-17, -281]]), I, 0, 1);
  polygon(p, tr([[-12, -307], [10, -307], [11, -289], [-12, -289]]), H[2]);
  polygon(p, tr([[-10, -298], [9, -301], [10, -291], [-10, -291]]), H[3 + Math.round(s.pressure)]);
  for (const x of [-8, 0, 8]) stroke(p, tr([[x, -308], [x, -287]]), I[0], 1.7);
  stroke(p, tr([[-17, -311], [12, -311], [15, -307]]), I[4], 0.7);
  for (const x of [-20, 19]) rivet(p, x + dx, -296 + dy, I, 1.5);
  p.glow(dx, -298 + dy, 18, H[3], (0.13 + s.pressure * 0.14) * s.furnace);
  // Soot, oxidised seams and short chips are grouped, leaving the cast planes readable.
  for (const pts of [[[21, -314], [23, -307]], [[28, -285], [30, -278]], [[-30, -314], [-29, -304]], [[-13, -271], [-8, -273]]])
    stroke(p, tr(pts), B[3], 0.7);
  // The gauge is stained amber rather than a clean white face.
  const gx = 69 + dx, gy = -301 + dy;
  shape(p, ellipse(gx, gy, 18, 18, 0, 32), B, 3, 1.4);
  shape(p, ellipse(gx, gy, 13.7, 13.7, 0, 28), B, 5, 0.9);
  polygon(p, [[gx - 11, gy + 4], [gx + 11, gy + 1], [gx + 8, gy + 10], [gx - 4, gy + 12]], B[3]);
  for (let i = 0; i < 7; i++) {
    const a = -Math.PI * 1.18 + i * Math.PI * 1.36 / 6;
    stroke(p, [[gx + Math.cos(a) * 9.5, gy + Math.sin(a) * 9.5], [gx + Math.cos(a) * 12, gy + Math.sin(a) * 12]], I[1], 0.65);
  }
  const a = -Math.PI * 1.18 + s.pressure * Math.PI * 1.36 + s.shake * 0.05;
  stroke(p, [[gx, gy + 2], [gx + Math.cos(a) * 10, gy + Math.sin(a) * 10]], I[0], 1.15);
  polygon(p, ellipse(gx, gy, 2, 2, 0, 8), I[1]);
  stroke(p, [[gx - 9, gy - 5], [gx - 5, gy - 9]], B[6], 0.55);
  // Safety valve and its warm rim.
  shape(p, tr([[-78, -311], [-67, -311], [-67, -299], [-78, -299]]), B, 2, 1);
  shape(p, tr([[-84, -313], [-70, -313], [-70, -309], [-84, -309]]), I, 3, 1);
}

function hammer(p, B, I, s) {
  const b = s.bottom + s.mount, x = s.shake;
  let top = -256 + s.mount;
  for (let i = 0; i < 3; i++) {
    const bottom = top + s.lengths[i];
    sleeve(p, x, top - 3, bottom, 28 - i * 7, B, I);
    top = bottom;
  }
  const tr = (pts) => transform(pts, x, b, 1.1, 1);
  // A broad cast-iron striking face, bevelled top and a dark right-hand end plane.
  shape(p, tr([[-86, -53], [-70, -71], [62, -72], [86, -56], [86, -15], [71, 0], [37, 0],
    [33, -4], [11, -1], [-20, -1], [-25, 1], [-67, 0], [-85, -13]]), I, 2, 1.8);
  polygon(p, tr([[-82, -52], [-67, -68], [61, -69], [80, -56], [62, -48], [-65, -48]]), I[3]);
  polygon(p, tr([[63, -47], [84, -54], [84, -15], [71, -3], [63, -10]]), I[0]);
  polygon(p, tr([[-82, -47], [-67, -40], [-67, -12], [-58, -3], [-66, -3], [-82, -15]]), I[3]);
  polygon(p, tr([[-65, -44], [60, -44], [60, -35], [-53, -35]]), I[1]);
  polygon(p, tr([[-38, -34], [-24, -38], [-7, -35], [6, -38], [20, -35], [15, -30], [-18, -29], [-31, -31]]), I[3]);
  polygon(p, tr([[-65, -19], [-36, -14], [-14, -19], [8, -12], [31, -16], [61, -21], [68, -4], [35, -3], [31, -7], [-22, -4], [-58, -3]]), I[0]);
  stroke(p, tr([[-80, -52], [-66, -67], [-24, -68]]), I[5], 1.05);
  stroke(p, tr([[9, -68], [54, -68], [69, -61]]), I[4], 0.7);
  stroke(p, tr([[-79, -41], [-79, -18]]), I[5], 0.75);
  stroke(p, tr([[83, -48], [83, -18], [73, -7]]), I[3], 0.65);
  polygon(p, tr([[54, -43], [64, -46], [61, -37], [65, -29], [58, -24], [56, -32]]), B[2]);
  polygon(p, tr([[-65, -41], [-58, -38], [-61, -29], [-56, -23], [-64, -21]]), B[2]);
  polygon(p, tr([[21, -65], [36, -66], [32, -63], [42, -61], [35, -58], [22, -61], [14, -60]]), I[2]);
  for (const pts of [[[-27, -62], [-20, -64]], [[-19, -59], [-13, -61]], [[-10, -61], [-5, -63]], [[28, -18], [33, -15]]])
    stroke(p, tr(pts), I[4], 0.55);
  for (const sx of [-51, 43]) {
    shape(p, tr([[sx - 7, -68], [sx + 7, -68], [sx + 9, -47], [sx + 9, -6], [sx + 5, -2], [sx - 7, -2]]), B, 2, 1);
    polygon(p, tr([[sx - 6, -65], [sx - 3, -65], [sx - 1, -47], [sx - 1, -5], [sx - 6, -5]]), B[4]);
    polygon(p, tr([[sx + 3, -37], [sx + 8, -35], [sx + 7, -20], [sx + 5, -26]]), I[0]);
    for (const y of [-43, -15]) rivet(p, x + (sx + 1) * 1.1, b + y, I, 3);
  }
  shape(p, tr([[-23, -70], [-18, -81], [18, -81], [25, -70], [21, -62], [-20, -62]]), B, 2, 1.2);
  stroke(p, tr([[-16, -77], [10, -77]]), B[5], 0.85);
  shape(p, tr([[-22, -35], [21, -35], [26, -30], [26, -18], [20, -14], [-22, -14], [-26, -19], [-26, -30]]), I, 1, 1);
  stroke(p, tr([[-17, -30], [16, -30]]), I[3], 0.6);
  for (const sx of [-17, 16]) rivet(p, x + sx * 1.1, b - 24, B, 1.5);
  for (const pts of [[[27, -35], [32, -39]], [[-34, -24], [-30, -28]], [[-3, -7], [3, -9]], [[68, -32], [74, -37]]])
    stroke(p, tr(pts), I[4], 0.55);
  stroke(p, tr([[-7, -11], [-3, -9], [2, -12], [8, -8]]), I[4], 0.6);
}

function cracks(p, I, h, seed) {
  if (h < 0 || h >= 2.38) return;
  const fade = p.fade; p.fade *= 1 - smooth(1.55, 2.38, h);
  const grow = smooth(0, 0.2, h);
  const pit = [[-77, -5], [-52, -13], [-24, -9], [0, -14], [28, -9], [57, -12], [82, -3], [73, 11], [31, 19], [-5, 15], [-36, 20], [-72, 11]];
  shape(p, transform(pit, 0, 0, grow, grow), I, 0, 1);
  polygon(p, transform([[ -74, 6], [-42, 12], [-7, 11], [30, 14], [76, 5], [73, 11], [31, 19], [-5, 15], [-36, 20], [-72, 11]], 0, 0, grow, grow), I[1]);
  stroke(p, transform([[-70, 10], [-36, 18], [-5, 14]], 0, 0, grow, grow), I[3], 0.9);
  stroke(p, transform([[8, 15], [31, 17], [66, 11]], 0, 0, grow, grow), I[3], 0.75);
  // Broken paving has a top plane and a sunk side; it remains after the airborne dust clears.
  for (let i = 0; i < 7; i++) {
    const R = rng(seed, 460 + i), a = i / 7 * TAU + 0.28, x = Math.cos(a) * R.range(68, 94), y = Math.sin(a) * 15;
    const w = R.range(8, 15), h = R.range(3, 6), tr = (pts) => transform(pts, 0, 0, grow, grow);
    const pts = [[x - w, y], [x - w * 0.55, y - h], [x + w * 0.5, y - h - 1],
      [x + w, y + 1], [x + w * 0.66, y + h], [x - w * 0.7, y + h + 1]];
    shape(p, tr(pts), I, 2, 0.7);
    polygon(p, tr([pts[0], pts[1], pts[2], pts[3], [x, y + 1]]), I[3]);
    stroke(p, tr([pts[0], pts[1], pts[2]]), I[4], 0.55);
  }
  for (let i = 0; i < 10; i++) {
    const R = rng(seed, 150 + i), a = i / 10 * TAU + R.range(-0.23, 0.23), len = R.range(94, 176) * grow;
    const ca = Math.cos(a), sa = Math.sin(a), start = (25 + R.range(0, 12)) * grow;
    const pts = [[ca * start, sa * start * 0.2]];
    for (let j = 1; j < 5; j++) {
      const d = start + (len - start) * j / 4, k = j % 2 ? 1 : -1;
      pts.push([ca * d - sa * R.range(3, 9) * k, sa * d * 0.2 + ca * k * R.range(1.5, 3.5)]);
    }
    stroke(p, pts.map(([x, y]) => [x, y + 1.4]), I[3], 0.8);
    stroke(p, pts, I[0], 1.05);
    const q = pts[2];
    stroke(p, [q, [q[0] + ca * 17 - sa * 10, q[1] + sa * 3.5 + ca * 4],
      [q[0] + ca * 29 - sa * 17, q[1] + sa * 6 + ca * 5.5]], I[1], 0.65);
  }
  p.fade = fade;
}

const STEAM_LOBE = spline([[-1, 0], [-0.91, -0.45], [-0.58, -0.5], [-0.38, -0.98],
  [-0.03, -1.04], [0.23, -0.63], [0.6, -0.84], [0.93, -0.4], [0.83, 0.1], [1, 0.32],
  [0.65, 0.6], [0.12, 0.67], [-0.36, 0.55], [-0.82, 0.54]], true, 3);
const STEAM_SHADE = spline([[-0.95, 0.05], [-0.5, 0.24], [0.2, 0.12], [0.73, -0.03],
  [0.93, 0.26], [0.61, 0.5], [-0.3, 0.45], [-0.8, 0.43]], true, 3);

function steamLobe(p, x, y, rx, ry, S, turn = 0) {
  if (rx < 0.5 || ry < 0.5) return;
  const tr = (pts) => transform(pts, x, y, rx, ry, turn), fade = p.fade;
  const phase = turn * 4 + rx * 0.043;
  const contour = STEAM_LOBE.map(([a, b]) => [a * (1 + 0.065 * Math.sin(b * 4.1 + phase)),
    b * (1 + 0.13 * Math.sin(a * 3.8 - phase))]);
  // Broad translucent planes; no ink ring or white cap around the vapour.
  p.fade = fade * 0.12;
  polygon(p, transform(contour, x, y, rx * 1.14, ry * 1.18, turn), S[2]);
  p.fade = fade * 0.7;
  polygon(p, tr(contour), S[3]);
  p.fade = fade * 0.38;
  polygon(p, tr(STEAM_SHADE), S[1]);
  polygon(p, tr(spline([[-0.8, -0.12], [-0.57, -0.3], [-0.34, -0.81], [-0.07, -0.85],
    [0.22, -0.4], [0.57, -0.64], [0.8, -0.32], [0.5, -0.17], [0.06, -0.13], [-0.3, 0.05]], true, 3)), S[5]);
  p.fade = fade;
}

function steamTrail(p, pts, S, width) {
  const fade = p.fade;
  p.fade = fade * 0.13; stroke(p, pts, S[2], width * 1.8, true);
  p.fade = fade * 0.58; stroke(p, pts, S[3], width, true);
  p.fade = fade * 0.3; stroke(p, pts.map(([x, y]) => [x - 0.5, y - 0.4]), S[5], width * 0.4, true);
  p.fade = fade;
}

function steamDisc(p, S, h, back, seed) {
  if (h < 0 || h >= 1.15) return;
  const expand = 1 - (1 - clamp(h / 0.6)) ** 3, r = 74 + 99 * expand;
  const fade = p.fade, decay = 1 - smooth(0.48, 1.15, h);
  p.fade *= decay * (back ? 0.58 : 0.88);
  // A low, broken sheet of pressure joins rolling lobes, then dissolves into gaps.
  if (h < 0.55) {
    const from = back ? Math.PI : 0;
    const outer = arc(0, 1, r, 4 + 14 * expand, from, Math.PI, 32);
    const inner = arc(0, 1, r * 0.65, 2 + 6 * expand, from, Math.PI, 32).reverse();
    const f = p.fade; p.fade *= 0.36 * (1 - smooth(0.2, 0.55, h));
    polygon(p, [...outer, ...inner], S[3]); p.fade = f;
  }
  for (let i = 0; i < 6; i++) {
    const R = rng(seed, 260 + i + (back ? 10 : 0)), u = i / 5 * 2 - 1;
    const x = u * r + R.range(-4, 4), y = (back ? -6 : 7) + (1 - Math.abs(u)) * (back ? -9 : 9) - h * R.range(3, 8);
    const size = 0.55 + Math.sin(Math.PI * clamp(h / 1.4)) * 0.45;
    const roll = smooth(0.05, 0.3, h) * (1 - smooth(0.5, 1.1, h));
    steamLobe(p, x, y - roll * (i % 2 ? 3 : 0), R.range(25, 37) * size,
      (R.range(8, 14) + roll * R.range(4, 8)) * size, S, u * 0.08);
  }
  p.fade = fade;
}

function coalSmoke(p, A, h, seed) {
  if (h < 0 || h >= 1.58) return;
  const fade = p.fade;
  for (let i = 0; i < 7; i++) {
    const R = rng(seed, 330 + i), life = R.range(1.1, 1.58), u = h / life;
    if (u >= 1) continue;
    const side = i % 2 ? 1 : -1, x = side * (35 + R.range(60, 113) * (1 - (1 - u) ** 3));
    const y = -8 - Math.sin(u * Math.PI) * R.range(19, 39);
    p.fade = fade * (1 - smooth(0.45, 1, u)) * 0.82;
    steamLobe(p, x, y, 17 + R.range(14, 25) * u, 11 + R.range(8, 18) * u, A, side * u * 0.15);
  }
  p.fade = fade;
}

function arrivalSmoke(p, A, t) {
  const fade = p.fade;
  for (let i = 0; i < 4; i++) {
    const u = (t - 0.04 - i * 0.07) / 0.83;
    if (u <= 0 || u >= 1) continue;
    p.fade = fade * Math.sin(Math.PI * u) * 0.47;
    steamLobe(p, (i % 2 ? 1 : -1) * (40 + u * 26), -247 - i * 12 - u * 37,
      27 + u * 16, 20 + u * 13, A, i * 0.2);
  }
  p.fade = fade;
}

function vents(p, S, t, s) {
  // Short irregular puffs escape during pressure build-up; the final release is bigger.
  for (let i = 0; i < 5; i++) {
    const at = 0.71 + i * 0.155, u = (t - at) / 0.47;
    if (u <= 0 || u >= 1) continue;
    const fade = p.fade; p.fade *= Math.sin(Math.PI * u) * 0.7;
    steamLobe(p, -83 - u * 39, -311 + s.mount - u * 24, 5 + u * 8, 3 + u * 7, S, -u * 0.3);
    p.fade = fade;
  }
  const h = t - cues.impact;
  if (h >= 0 && h < 0.52) {
    const u = h / 0.52, k = 1 - smooth(0.2, 0.52, h), fade = p.fade;
    p.fade *= k;
    const x = -88 - 65 * (1 - (1 - u) ** 2), y = -311 + s.mount - 14 * u;
    steamTrail(p, spline([[-84, -311 + s.mount], [-104, -312 + s.mount], [x, y]]), S, 6 * k);
    steamLobe(p, x, y, 9 + 14 * u, 6 + 10 * u, S, -0.22);
    p.fade = fade;
  }
}

function trailingSteam(p, S, t, s) {
  if (t <= cues.recovery || t >= 3.65) return;
  const fade = p.fade;
  for (let i = 0; i < 3; i++) {
    const k = smooth(cues.recovery + i * 0.05, 2.28 + i * 0.04, t) * (1 - smooth(2.95 + i * 0.12, 3.4 + i * 0.1, t));
    p.fade = fade * k * 0.83;
    const detach = smooth(2.72 + i * 0.1, 3.5, t), x = (i - 1) * 43;
    const y = s.bottom + s.mount - 2 + detach * (20 + i * 11), bend = Math.sin(t * 5 + i * 2) * 8;
    const len = Math.min(58, -s.bottom + 14) * [0.9, 0.67, 1.1][i];
    const pts = spline([[x, y], [x - 9 + bend, y + len * 0.26], [x + 8, y + len * 0.55],
      [x + 13 - bend, y + len * 0.8], [x + 2 - bend, y + len]]);
    steamTrail(p, pts, S, 5.3 - i * 0.55);
  }
  p.fade = fade;
}

function debris(p, H, I, S, A, h, seed) {
  const stone = [I[0], I[1], I[2], I[2], I[3], I[3], I[4], I[5]];
  for (let i = 0; i < 12; i++) {
    const R = rng(seed, i + 45), life = R.range(0.9, 1.32), u = h / life;
    if (u <= 0 || u >= 1) continue;
    const side = i % 2 ? 1 : -1, x = side * (42 + R.range(50, 122) * (1 - (1 - u) ** 2));
    const arcY = Math.sin(Math.PI * Math.min(u / 0.72, 1)), bounce = u > 0.72 ? Math.sin((u - 0.72) / 0.28 * Math.PI) * 3 : 0;
    const y = 2 - arcY * R.range(15, 43) - bounce;
    chip(p, x, y, R.range(2.6, 5.6) * (1 - smooth(0.75, 1, u)), u * R.range(-8, 8), stone);
  }
  for (let i = 0; i < 8; i++) {
    const R = rng(seed, i + 90), u = (h - 0.08) / R.range(0.7, 1.25);
    if (u <= 0 || u >= 1) continue;
    const side = i % 2 ? 1 : -1, x = side * (75 + R.range(45, 91) * (1 - (1 - u) ** 3));
    const y = -6 - R.range(15, 34) * u;
    const fade = p.fade; p.fade *= (1 - smooth(0.6, 1, u)) * 0.66;
    steamLobe(p, x, y, R.range(17, 27) * Math.sin(Math.PI * u), R.range(7, 13) * Math.sin(Math.PI * u), i % 3 ? S : A, side * u * 0.2);
    p.fade = fade;
  }
  if (h > 0 && h < 0.28) for (let i = 0; i < 5; i++) {
    const R = rng(seed, 200 + i), u = h / 0.28, side = i % 2 ? 1 : -1;
    const x = side * (61 + u * R.range(26, 72)), y = -2 - u * R.range(9, 26);
    stroke(p, [[x - side * (4 + u * 5), y + 2], [x, y]], H[4], 0.8 * (1 - u));
    stroke(p, [[x - side * 2, y + 1], [x, y]], H[6], 0.45 * (1 - u));
  }
  // Low skidding coal flecks carry the force along the ground, below the main silhouette.
  if (h > 0 && h < 0.58) for (let i = 0; i < 11; i++) {
    const R = rng(seed, 410 + i), u = h / 0.58, side = i % 2 ? 1 : -1;
    const x = side * (65 + R.range(67, 122) * (1 - (1 - u) ** 2));
    const y = 4 - Math.sin(u * Math.PI) * R.range(3, 19), fade = p.fade;
    p.fade *= 1 - smooth(0.48, 1, u);
    chip(p, x, y, R.range(1.1, 2.5), i + u * 4, stone);
    p.fade = fade;
  }
}

export function drawBack(p, t, o) {
  t = Math.round(t * 1e9) / 1e9;
  if (t <= 0 || t >= meta.duration) return;
  const I = fit(o.iron, 8), S = fit(o.steam, 8), A = fit(o.soot, 8), s = state(t), h = t - cues.impact;
  const fade = p.fade;
  p.fade *= s.born * (1 - s.gone) * 0.24;
  polygon(p, ellipse(0, 3, 84 - s.bottom * 0.1, 13, 0, 40), I[1]);
  p.fade = fade;
  arrivalSmoke(p, A, t);
  cracks(p, I, h, o.seed);
  coalSmoke(p, A, h, o.seed);
  steamDisc(p, S, h, true, o.seed);
  trailingSteam(p, S, t, s);
  if (t > cues.release && t < cues.impact) {
    const k = Math.sin(Math.PI * clamp((t - cues.release) / (cues.impact - cues.release)));
    p.fade *= 0.19;
    for (const side of [-1, 1]) {
      const x = side * 91, y = s.bottom - 26;
      stroke(p, [[x, y - 67 * k], [x, y]], I[3], 4.5 * k, true);
    }
    p.fade = fade;
  }
  vents(p, S, t, s);
  p.fade = fade;
}

export function draw(p, t, o) {
  t = Math.round(t * 1e9) / 1e9;
  if (t <= 0 || t >= meta.duration) return;
  const B = fit(o.palette, 8), I = fit(o.iron, 8), S = fit(o.steam, 8), A = fit(o.soot, 8), H = fit(o.heat, 8);
  const s = state(t), h = t - cues.impact;
  const fade = p.fade;
  p.fade *= s.born * (1 - s.gone);
  hammer(p, B, I, s);
  housing(p, B, I, H, s);
  p.fade = fade;
  steamDisc(p, S, h, false, o.seed);
  debris(p, H, I, S, A, h, o.seed);
  p.fade = fade;
}
