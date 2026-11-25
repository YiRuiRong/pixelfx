import { fit, rand } from "../../core/index.js";

const FPS = 24;
export const cues = { guard: 3, farGuard: 4, tip: 7, strike: 8, returnStroke: 20, catch: 24 };

export const meta = {
  name: "Sword tip conductor",
  desc: "Two wine-red currents slip from a black sword's guard into one cold point. The blade goes dark on discharge, then catches the returning stroke on one edge.",
  tags: ["lightning", "sword", "scar", "charge", "return", "overlay"],
  size: [36, 100], origin: [18, 85], duration: (cues.catch + 2) / FPS,
  fps: FPS, loop: false, bg: "dark",
  options: { palette: ["#351722", "#742b40", "#ae4058", "#d15b70", "#ed94a1", "#b7cbd5", "#eff7fa"], seed: 7 },
};

// Tip-local pixels on the 96 px, point-down version of the project's black sword.
// Keep the two tracks fixed to the bevels, even when the caller reseeds the light.
function pixelPath(points) {
  const pixels = [points[0]];
  for (let i = 1; i < points.length; i++) {
    const [x, y] = points[i - 1];
    const [dx, dy] = [points[i][0] - x, points[i][1] - y];
    const steps = Math.max(Math.abs(dx), Math.abs(dy));
    for (let j = 1; j <= steps; j++) {
      pixels.push([x + Math.round(dx * j / steps), y + Math.round(dy * j / steps)]);
    }
  }
  return pixels;
}

const near = pixelPath([
  [-7,-70], [-5,-71], [-3,-73], [-1,-74], [-2,-70], [-2,-64], [-1,-60],
  [-2,-54], [-2,-47], [-1,-45], [-1,-40], [-2,-38], [-1,-32], [-1,-26],
  [-2,-24], [-1,-19], [-1,-13], [0,-10], [-1,-6], [0,-3], [0,0],
]);
const far = pixelPath([
  [7,-70], [4,-71], [2,-73], [1,-73], [1,-69], [2,-64], [1,-59], [2,-54],
  [2,-49], [1,-46], [2,-41], [1,-36], [1,-30], [2,-27], [1,-22],
  [1,-14], [0,-11], [1,-8], [1,-5], [0,-2], [0,0],
]);
// Each pair is the tail and head on a track. The far guard ignites one cel later.
const charge = [
  { near: [0, .13] },
  { near: [.035, .39], far: [0, .16] },
  { near: [.24, .70], far: [.10, .55] },
  { near: [.60, .96], far: [.50, .89] },
];

function filament(p, path, tail, head, colors, strength, farSide = false) {
  const last = path.length - 1;
  const start = Math.round(tail * last), end = Math.round(head * last);
  const dir = end >= start ? 1 : -1;
  const [hx, hy] = path[end];
  for (let i = start; ; i += dir) {
    const [x, y] = path[i];
    // The back bevel passes behind the raised black ridge for a few pixels.
    if (!(farSide && y > -56 && y < -48)) {
      const u = (i - start) / (end - start || 1);
      const shade = u < .19 ? 0 : u < .55 ? 1 : u < .86 ? 2 : 3;
      p.blend(x, y, colors[shade], strength * (.64 + .36 * u));
      if (u > .68) p.blend(x + (farSide ? 1 : -1), y, colors[2], .37 * strength * u);
    }
    if (i === end) break;
  }
  if (farSide && hy > -56 && hy < -48) return;
  p.blend(hx, hy, colors[farSide ? 3 : 4], strength);
  p.glow(hx + .5, hy + .5, farSide ? 2.6 : 3.8, colors[2], .30 * strength);
}

export function draw(p, t, o) {
  const frame = Math.floor(t * FPS + 1e-7);
  const cel = charge[frame - cues.guard];
  if (!cel && frame !== cues.tip && frame !== cues.catch && frame !== cues.catch + 1) return;
  const colors = fit(o.palette, 7);
  if (cel) {
    if (cel.far) filament(p, far, ...cel.far, colors, .85, true);
    filament(p, near, ...cel.near, colors, .94 + .06 * rand(o.seed, frame));
    // Raking light picks out the lip of each wing for its ignition frame.
    if (frame === cues.guard || frame === cues.farGuard) {
      const side = frame === cues.guard ? -1 : 1;
      p.blend(side * 6, -71, colors[3], .83);
      p.blend(side * 5, -72, colors[4], side < 0 ? .86 : .59);
      p.glow(side * 5 + .5, -71.5, 3.4, colors[2], .23);
    }
  } else if (frame === cues.tip) {
    // Put the blush under the tip so the single cold texel keeps its steel tint.
    p.disc(.5, .5, 3.8, colors[3], d => .22 * (1 - d) ** 2);
    p.blend(0, -1, colors[3], .76);
    p.blend(-1, 0, colors[5], .34);
    p.px(0, 0, colors[6]);
  } else {
    // Pick up the returning edge at exactly the same tip; play only the near side back.
    const span = frame === cues.catch ? [1, .95] : [.97, .83];
    filament(p, near, ...span, colors, frame === cues.catch ? .92 : .72);
    if (frame === cues.catch) p.px(0, 0, colors[6]);
  }
}
