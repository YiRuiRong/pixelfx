import { clamp, fit, lerp, Rng, smooth, TAU } from "../../core/index.js";
import { polygon, stroke } from "../_comic.js";
import { STEEL, WINE } from "../melee/_sword-scar.js";

const FPS = 24, FRAMES = 42;
const HIT = 8, RETURN = 20, INVERT = 22, APEX = 26;
const BOLT_WIDTH_SCALE = 1.4;

export const sourceUrl = import.meta.url;
export const cues = { impact: HIT, returnStroke: RETURN, inversion: INVERT, returnApex: APEX };
export const meta = {
  name: "Thunder scar: Sky Rend",
  desc: "A cold white bolt leaves a red seam. Half a second later ink and paper invert around the impact, and a white edge climbs the scar, lifting graphite at each bend.",
  tags: ["lightning", "scar", "manga", "impact", "speed-lines", "ground", "one-shot"],
  size: [272, 280], origin: [136, 240], fps: FPS, frameCount: FRAMES, duration: FRAMES / FPS,
  loop: false, bg: "dark", cueFrames: cues, options: { palette: STEEL, rift: WINE, seed: 73 },
};

// Numbered from the ground up. Both strokes and the hinges on the torn faces use these same knots.
const channel = [
  [0, 0], [-5, -17], [-4, -29], [-12, -43], [-3, -66], [-25, -58],
  [-17, -83], [-2, -98], [3, -113], [-33, -102], [-21, -130], [2, -153],
  [-5, -156], [24, -179], [21, -188], [48, -219],
];
const widths = [.54, .75, .56, .93, 1.12, 1.51, .82, .61, 1.05, 1.50, .83, .72, .61, 1.04, .59, .075];
const top = channel.length - 1;
const leader = [top, 14.66, 13.45, 12.9, 10.25, 8.2, 5.1, 2.6, 0];
const returnHead = [0, .45, 3.85, 7.2, 9.7, 12.8, top];
const forks = [
  { knot: 11, path: [channel[11], [13, -149], [21, -140], [31, -142], [29, -135], [51, -121], [55, -108]] },
  { knot: 6, path: [channel[6], [-33, -80], [-39, -73], [-49, -74], [-66, -62]] },
];
const ground = [[-59, 7], [-43, 4], [-31, 5], [-16, .7], [-8, 2], [0, 0], [16, -1], [25, -4], [33, -3], [49, -7]];
const hinges = [
  { knot: 4, length: 1.24, lift: 15, side: -1 },
  { knot: 7, length: 1.08, lift: 19, side: 1 },
  { knot: 10, length: 1.35, lift: 32, side: -1 },
  { knot: 13, length: 1.12, lift: 22, side: 1 },
].map(hinge => ({ ...hinge, opens: RETURN + returnHead.findIndex(head => head >= hinge.knot) }));

const normals = channel.slice(1).map(([x, y], i) => {
  const dx = x - channel[i][0], dy = y - channel[i][1], length = Math.hypot(dx, dy);
  return [-dy / length, dx / length];
});
const rails = channel.map((_, i) => {
  const a = normals[Math.max(0, i - 1)], b = normals[Math.min(i, top - 1)];
  const scale = widths[i] / Math.max(.48, 1 + a[0] * b[0] + a[1] * b[1]);
  return [(a[0] + b[0]) * scale, (a[1] + b[1]) * scale];
});

function point(path, at) {
  const i = Math.min(path.length - 2, Math.floor(at)), a = path[i], b = path[i + 1];
  return [lerp(a[0], b[0], at - i), lerp(a[1], b[1], at - i)];
}

function spanIndices(lo, hi) {
  const indices = [lo];
  for (let i = Math.floor(lo) + 1; i < hi; i++) indices.push(i);
  indices.push(hi);
  return indices;
}

function pathStroke(p, path, lo, hi, color, width) {
  if (hi - lo < .015) return;
  stroke(p, spanIndices(lo, hi).map(i => point(path, i)), color, width);
}

function blade(p, lo, hi, left, right, color, widthScale = BOLT_WIDTH_SCALE) {
  if (hi - lo < .015) return;
  const indices = spanIndices(lo, hi);
  const edge = (i, offset) => {
    const [x, y] = point(channel, i), [nx, ny] = point(rails, i);
    const spread = offset * widthScale;
    return [x + nx * spread, y + ny * spread];
  };
  polygon(p, [...indices.map(i => edge(i, left)), ...indices.reverse().map(i => edge(i, right))], color);
}

// The sides of the little flash are torn at an angle to the ground. Each ink wedge runs up to
// this edge, so the scene stays visible in the notches and between the strokes on the way out.
const paperEdge = [
  [-104, 8], [-78, -2], [-98, -5], [-74, -14], [-92, -16], [-77, -30],
  [-95, -47], [-69, -40], [-86, -74], [-59, -61], [-41, -59], [-54, -93],
  [-27, -74], [-29, -90], [-13, -75], [-2, -127], [4, -86], [21, -97],
  [16, -72], [51, -91], [44, -72], [74, -78], [59, -57], [100, -71],
  [86, -49], [93, -51], [77, -34], [102, -40], [86, -23], [108, -25],
  [86, -8], [101, -8], [68, 5], [76, 8], [41, 12], [12, 11], [16, 20],
  [-17, 17], [-52, 24], [-42, 15], [-81, 20], [-68, 11],
];
const core = [[-15, 2], [-4, -1], [-9, -6], [-3, -4], [-5, -13], [0, -6], [3, -10],
  [3, -4], [12, -8], [6, -2], [16, -3], [5, 1], [8, 3], [1, 2], [-5, 5], [-3, 2]];

function paperPoint(angle) {
  const dx = Math.cos(angle), sine = Math.sin(angle);
  const dy = sine * (sine < 0 ? .87 : .24) - dx * .085;
  let radius = Infinity;
  for (let i = 0; i < paperEdge.length; i++) {
    const [x, y] = paperEdge[i], next = paperEdge[(i + 1) % paperEdge.length];
    const ex = next[0] - x, ey = next[1] - y, det = dx * ey - dy * ex;
    if (Math.abs(det) < 1e-8) continue;
    const along = (x * dy - y * dx) / det, reach = (x * ey - y * ex) / det;
    if (along >= 0 && along <= 1 && reach > 0) radius = Math.min(radius, reach);
  }
  // The wedges meet a shared edge. Snap their intersections so JS engines round its coverage alike.
  return [Math.round(dx * radius * 64) / 64, Math.round(dy * radius * 64) / 64];
}

const scaled = ([x, y], k) => [x * k, y * k];

function cutRays(random) {
  const count = 46, step = TAU / count;
  return Array.from({ length: count }, (_, i) => {
    const angle = (i + random.range(.13, .85)) * step;
    const heavy = i % 7 === 2 || i % 11 === 5;
    const halfWidth = step * (heavy ? .55 : random.range(.075, .27));
    const middle = paperPoint(angle), length = Math.hypot(...middle);
    const nx = -middle[1] / length, ny = middle[0] / length;
    return {
      left: paperPoint(angle - halfWidth), right: paperPoint(angle + halfWidth), middle,
      tip: scaled(middle, heavy ? random.range(.09, .19) : random.range(.21, .54)),
      heavy, release: i % 3 === 1 || heavy, lag: random.range(0, .48),
      nib: [nx * Math.min(3.2, halfWidth * length), ny * Math.min(3.2, halfWidth * length)],
    };
  });
}

function drawPrint(p, f, rays, steel) {
  const age = f - RETURN;
  if (age < 0 || age > 7) return;
  if (age < 4) {
    const positive = f < INVERT;
    const paper = positive ? steel[6] : steel[0], ink = positive ? steel[0] : steel[6];
    polygon(p, paperEdge, paper);
    for (const ray of rays) {
      polygon(p, [ray.tip, ray.left, ray.right], ink);
      if (ray.heavy) {
        // A dry cut left in a wide stroke, ending well before the focal point.
        const split = scaled(ray.middle, .54);
        polygon(p, [split, scaled(ray.middle, .98), scaled(ray.right, .91)], paper);
      }
    }
    polygon(p, core, ink);
    polygon(p, [[-2, .2], [.4, -2.2], [2.5, -.8], [.2, 1.9]], paper);
    return;
  }
  for (const ray of rays) {
    if (!ray.release) continue;
    const u = clamp((age - 3 - ray.lag) / 4.5);
    const inner = lerp(.34, 1.04, u), outer = lerp(.95, 1.13, u);
    const [x, y] = scaled(ray.middle, lerp(inner, outer, .71));
    const [dx, dy] = scaled(ray.nib, 1 - u);
    const color = age === 4 ? steel[5] : age === 5 ? steel[3] : steel[2];
    polygon(p, [scaled(ray.middle, inner), [x + dx, y + dy], scaled(ray.middle, outer), [x - dx * .55, y - dy * .55]], color);
  }
}

function drawGround(p, f, steel, wine) {
  if (f < 5) return;
  const extent = f < HIT ? .10 : 1 - smooth(32, 41, f);
  pathStroke(p, ground, 5 - 5 * extent, 5 + 4 * extent, steel[1], 1.3);
  pathStroke(p, ground, 5 - 5 * extent, 5 + 4 * extent, steel[3], .51);
  if (f < HIT || f >= RETURN) return;
  const spread = 1 - smooth(12, RETURN - 1, f);
  const left = 5 - 4.5 * spread, right = 5 + 3.7 * spread;
  pathStroke(p, ground, left, right, wine[2], 1.05);
  pathStroke(p, ground, left, Math.min(5, left + .72), wine[3], .85);
  pathStroke(p, ground, Math.max(5, right - .65), right, wine[3], .85);
  const bead = 1.2 + 2.1 * smooth(13, 19, f);
  polygon(p, [[-bead * 1.9, .6], [-.6, -bead], [bead * 1.5, -.7], [.4, bead * .63]], wine[3]);
  p.px(0, -1, wine[4]);
  p.glow(0, -1, 2.1 * bead, wine[3], .17);
}

function drawForks(p, f, head, steel) {
  for (const { knot, path } of forks) {
    const extent = f < HIT ? clamp((knot - head) / 2.9) : 1 - smooth(28, 36, f);
    const tone = f === HIT ? 4 : f >= INVERT && f < APEX && Math.abs(head - knot) < 2.2 ? 5 : 2;
    pathStroke(p, path, 0, (path.length - 1) * extent, steel[tone], tone > 2 ? .8 : .46);
  }
}

function liftFace(p, f, head, hinge, steel) {
  if (head < hinge.knot || f >= 38) return;
  const height = hinge.lift * (.48 + .52 * smooth(hinge.knot, hinge.knot + 1.7, head)) * (1 - smooth(hinge.opens + 3, hinge.opens + 10, f));
  if (height < .4) return;
  const a = point(channel, hinge.knot - hinge.length), [x, y] = channel[hinge.knot];
  const dx = x - a[0], dy = y - a[1], scale = hinge.side * height / Math.hypot(dx, dy);
  const project = (u, v) => [a[0] + u * dx - v * dy * scale, a[1] + u * dy + v * dx * scale];
  const face = (coords, color) => polygon(p, coords.map(([u, v]) => project(u, v)), color);
  face([[0, 0], [.16, .38], [.34, .50], [.67, 1.15], [.61, .68], [1.14, 1.39],
    [.90, .51], [1.02, .54], [.89, .26], [1, 0]], steel[0]);
  face([[.06, .08], [.27, .41], [.64, 1.03], [.49, .52], [.82, .74], [1.04, 1.21],
    [.83, .39], [.56, .18], [.30, .13]], steel[3]);
  face([[.08, .10], [.31, .44], [.59, .90], [.44, .45], [.22, .21]], steel[5]);
  face([[.41, .19], [.67, .43], [1.02, 1.16], [.80, .34], [.68, .24]], steel[2]);
  face([[.63, .44], [.83, .74], [1.07, 1.27], [.86, .62]], steel[4]);
  face([[.18, .16], [.39, .39], [.51, .60], [.36, .36]], steel[2]);
  face([[.54, .24], [.73, .46], [.88, .75], [.72, .51]], steel[4]);
}

function chiselTip(p, head, steel) {
  const [x, y] = point(channel, head), behind = point(channel, head - .58);
  const length = Math.hypot(x - behind[0], y - behind[1]);
  const tx = (x - behind[0]) / length, ty = (y - behind[1]) / length;
  const place = ([along, across]) => {
    const spread = across * BOLT_WIDTH_SCALE;
    return [x + tx * along - ty * spread, y + ty * along + tx * spread];
  };
  polygon(p, [[1, 0], [-8, 5.4], [-12, 4.7], [-19, 8.1], [-13, -.5], [-7, -3.8]].map(place), steel[0]);
  polygon(p, [[1, 0], [-8, 3.6], [-14, 5.2], [-11, 1.4], [-6, -1.8]].map(place), steel[6]);
  polygon(p, [[-7, -2], [-11, -.2], [-15, 3.4], [-10, -1.9]].map(place), steel[3]);
}

function drawChannel(p, f, head, steel, wine) {
  if (f < HIT) {
    blade(p, head, top, -.62, .75, steel[3]);
    blade(p, head, Math.min(top, head + 1.8), -.75, .88, steel[6]);
    return;
  }
  if (f < RETURN) {
    if (f > HIT + 1) {
      blade(p, 0, top, -.69, .7, steel[2], 1);
      return;
    }
    blade(p, 0, top, -1.6, 1.5, steel[4]);
    blade(p, 0, top, -.70, .45, steel[6]);
    polygon(p, [[-26, 2], [-3, -.7], [-7, -12], [.4, -2.2], [21, -3.5], [2, 1.5]], steel[6]);
    return;
  }
  const fade = 1 - smooth(31, 40, f);
  const tail = clamp((f - APEX) / 4);
  blade(p, .8 * (1 - fade) * top, top, -1.05 * fade, 1.48 * fade, f >= APEX && f < 32 ? steel[3] : steel[2], 1);
  if (f < INVERT) {
    blade(p, 0, top, -2.25, 5.8, steel[5]);
    blade(p, 0, top, -1.36, 4.25, steel[0]);
    return;
  }
  for (const hinge of hinges) liftFace(p, f, head, hinge, steel);
  const after = clamp(1 - (f - APEX) / 7);
  blade(p, top * tail, head, -3.5 * after, 5.6 * after, steel[0]);
  blade(p, top * tail, head, .65, 3.1 * after, f < APEX ? steel[3] : wine[1]);
  const lo = Math.max(top * tail, head - 5.4);
  if (head > lo) {
    blade(p, lo, head, -3.4 * after, 1.8 * after, steel[5]);
    blade(p, Math.max(lo, head - 3.6), head, -2.55 * after, 1.10 * after, steel[6]);
    if (f <= APEX) chiselTip(p, head, steel);
    const [x, y] = point(channel, head);
    p.glow(x, y, 7, steel[6], .18 * after);
  }
}

function drawChips(p, f, chips, steel) {
  for (const chip of chips) {
    const age = f - chip.start;
    if (age < 0 || age >= chip.life) continue;
    const progress = age / chip.life, distance = 5 * (1 - Math.exp(-age / 5));
    const x = chip.x + chip.vx * distance, y = chip.y + chip.vy * distance + .10 * age * age;
    const angle = chip.angle + chip.spin * age;
    const dx = Math.cos(angle) * chip.size * (1 - progress * .72), dy = Math.sin(angle) * chip.size * (1 - progress * .72);
    const a = [x - dx, y - dy], b = [x + dx, y + dy], lip = [x - dy * .28, y + dx * .28];
    polygon(p, [a, [x + dy * .25, y - dx * .25], b, lip], steel[2]);
    polygon(p, [a, b, lip], steel[age < 3 ? 5 : 3]);
  }
}

export function create(options) {
  const steel = fit(options.palette, 7), wine = fit(options.rift, 5), random = new Rng(options.seed);
  const rays = cutRays(random);
  const chips = [];
  function chip(start, knot, side, speed, size) {
    const [x, y] = channel[knot];
    chips.push({ start, x, y, size, vx: side * speed, vy: -random.range(2.3, 4.4),
      angle: side * random.range(-.8, .15), spin: side * random.range(.08, .19), life: random.int(7, 11) });
  }
  chip(HIT, 0, -1, 6.7, 4.9);
  chip(HIT + 1, 0, 1, 7.5, 4.1);
  for (const hinge of hinges) {
    chip(hinge.opens + 1, hinge.knot, hinge.side, random.range(3.5, 5.2), random.range(3, 6));
  }
  const frameAt = t => Math.floor(t * FPS + 1e-6);
  return {
    drawBack(p, time) {
      const f = frameAt(time);
      if (f <= 0 || f >= FRAMES - 1) return;
      drawGround(p, f, steel, wine);
      drawPrint(p, f, rays, steel);
    },
    draw(p, time) {
      const f = frameAt(time);
      if (f <= 0 || f >= FRAMES - 1) return;
      const head = f < HIT ? leader[f] : f < RETURN ? 0 : returnHead[Math.min(f - RETURN, returnHead.length - 1)];
      drawForks(p, f, head, steel);
      drawChannel(p, f, head, steel, wine);
      drawChips(p, f, chips, steel);
    },
  };
}
