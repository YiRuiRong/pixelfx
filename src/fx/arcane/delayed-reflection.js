// An original mirror vignette: the reflection predicts a sunlit cut, then reality catches up.
// Shards retain mirror-space UVs; the same moving sky survives the fracture and becomes rain.
import { fit, mix, clamp, smooth, Rng, TAU } from "../../core/index.js";
import { polygon, stroke, ellipse, arc, spline } from "../_comic.js";

export const meta = {
  name: "Delayed reflection",
  desc: "Sunlight cuts a reflected figure before a blade escapes the mirror. The glass breaks into shards of moving sky, melts into rain and leaves reflections in the puddles.",
  tags: ["mirror", "reflection", "anime", "sky", "cloud", "sunbeam", "glass", "shards", "rain", "ripple", "delay"],
  size: [480, 384],
  origin: [240, 304],
  duration: 6.5,
  loop: false,
  fps: 24,
  bg: "dark",
  options: {
    palette: ["#343a60", "#3868a0", "#277dc5", "#65b5df", "#b2e0ed", "#d5eaf1", "#eef7fb", "#ffffff"],
    sunlight: ["#786580", "#ac8999", "#d8afa9", "#ecc595", "#f6dda9", "#fff0c9", "#fff9e8", "#ffffff"],
    reflection: true,
    cloudSpeed: 6,
    seed: 19,
  },
};

// Visual cues only. The host game decides targeting, cancellation and damage independently.
export const cues = Object.freeze({ open: 0.08, reflectedCut: 1.25, reflectedHold: 1.62, release: 2.14, crack: 2.86, shatter: 3.18, rain: 4.62, end: meta.duration });
const MX = -59, MY = -163, RX = 72, RY = 112, TILT = -0.075;
const TW = 150, TH = 230, CW = 512;
const ease = (t, a, b) => smooth(a, b, t);
const clock = t => Math.round(t * 1e9) / 1e9;

function line(p, points, color, width = 0.7, alpha = 1) {
  if (alpha <= 0.004) return;
  const fade = p.fade; p.fade *= alpha;
  stroke(p, points, color, width);
  p.fade = fade;
}
function fill(p, points, color, alpha = 1) {
  const fade = p.fade; p.fade *= alpha;
  polygon(p, points, color); p.fade = fade;
}
function glint(p, x, y, r, C, a) {
  line(p, [[x - r, y], [x, y - 0.7], [x + r, y]], C[7], 0.45, a);
  line(p, [[x, y - r * 1.5], [x, y + r * 1.5]], C[6], 0.45, a);
  p.glow(x, y, r * 3.5, C[5], a * 0.14);
}

// Voronoi cells share their original edges exactly; no interior seams are drawn before the crack cue.
function clip(poly, nx, ny, d) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const da = a[0] * nx + a[1] * ny - d, db = b[0] * nx + b[1] * ny - d;
    if (da <= 0) out.push(a);
    if ((da < 0) !== (db < 0)) {
      const t = da / (da - db); out.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]);
    }
  }
  return out;
}
function fragments(R) {
  const seeds = [[-7, -3]];
  for (let i = 0; i < 11; i++) {
    const a = i * TAU / 11 + R.range(-0.12, 0.12), r = i % 2 ? 0.82 : 0.6;
    seeds.push([Math.cos(a) * RX * r, Math.sin(a) * RY * r]);
  }
  const outline = ellipse(0, 0, RX, RY, 0, 80);
  return seeds.map((s, i) => {
    let pts = outline;
    for (const b of seeds) if (b !== s) pts = clip(pts, b[0] - s[0], b[1] - s[1], (b[0] ** 2 + b[1] ** 2 - s[0] ** 2 - s[1] ** 2) / 2);
    const cx = pts.reduce((v, q) => v + q[0], 0) / pts.length, cy = pts.reduce((v, q) => v + q[1], 0) / pts.length;
    return { pts, cx, cy, vx: cx * 0.63 + R.range(-17, 23), vy: cy * 0.14 + R.range(-6, 9), spin: R.range(-0.38, 0.38), yaw: R.range(1.2, 2.5) * (i % 2 ? 1 : -1), melt: cues.rain + R.range(-0.12, 0.3), fall: R.range(0.36, 0.66), phase: R.range(0, TAU) };
  });
}
function mapping(cx, cy, sx, sy, angle, u0 = 0, v0 = 0) {
  const c = Math.cos(angle), s = Math.sin(angle);
  return { cx, cy, sx, sy, c, s, u0, v0,
    point(u, v) { return [cx + (u - u0) * sx * c - (v - v0) * sy * s, cy + (u - u0) * sx * s + (v - v0) * sy * c]; } };
}
function pane(t) {
  return mapping(MX, MY + Math.sin(t * 1.6) * 1.7, Math.max(0.006, ease(t, cues.open, 0.82)), 0.94 + 0.06 * ease(t, 0.08, 0.65), TILT);
}
function fragmentPose(f, t) {
  const d = Math.max(0, t - cues.shatter), drift = 1 - Math.exp(-d * 1.4);
  const c = Math.cos(TILT), s = Math.sin(TILT), melt = ease(t, f.melt, f.melt + 0.36);
  const turn = Math.cos(d * f.yaw), width = (Math.abs(turn) < 0.045 ? (turn < 0 ? -0.045 : 0.045) : turn) * (1 - melt * 0.98);
  return mapping(MX + f.cx * c - f.cy * s + f.vx * drift, MY + f.cx * s + f.cy * c + f.vy * drift + d * d * 6,
    width, 1 - melt * 0.98, TILT + f.spin * d, f.cx, f.cy);
}

// A compact, precomputed cloud field. Animation translates the samples, not the shard UVs.
function skyResources(C, S, R) {
  const clouds = new Uint8Array(CW * TH);
  const wisps = [
    [-80, -69, 92, 6], [75, -83, 67, 7], [210, -91, 132, 5],
    [-90, -22, 116, 4], [97, -14, 88, 9], [253, -28, 92, 6],
    [-40, 39, 83, 6], [139, 52, 121, 7], [302, 29, 97, 10],
    [10, 82, 165, 5], [245, 86, 160, 5],
  ].map(([x, y, w, h]) => [x + R.range(-8, 8), y + R.range(-5, 5), w, h]);
  // Lit cloud banks sit over quieter, fine cirrus. Large lobes overlap without noisy pixel speckle.
  for (const [x, y, w] of [[-48, 29, 72], [94, -33, 88], [205, 58, 80]]) {
    for (let i = 0; i < 6; i++) {
      const rx = R.range(13, 24), ry = R.range(8, 19);
      wisps.push([x + (i / 5 - 0.5) * w, y - Math.sin(i / 5 * Math.PI) * 9, rx, ry]);
    }
  }
  for (let y = 0; y < TH; y++) for (let x = 0; x < CW; x++) {
    const u = x - 160, v = y - 115;
    let a = 0;
    for (const [cx, cy, rx, ry] of wisps) {
      const dx = (u - cx) / rx;
      if (Math.abs(dx) > 1) continue;
      const ridge = 2.4 * Math.sin(u * 0.041 + cy) + 1.3 * Math.sin(u * 0.12);
      const dy = (v - cy - ridge) / ry, q = dx * dx + dy * dy;
      if (q < 1) a = Math.max(a, Math.min(1, (1 - q) * 3.5) * (dy < -0.2 ? 0.98 : 0.61));
    }
    clouds[y * CW + x] = Math.round(a * 15);
  }
  const bases = new Uint32Array(TW * TH), cloudColors = new Uint32Array(TH * 16);
  const silhouette = new Uint8Array(TW * TH);
  for (let y = 0; y < TH; y++) {
    const v = y - 115, height = clamp((v + 112) / 224);
    let base = mix(C[2], C[4], height * 0.94);
    base = mix(base, S[3], ease(v, 20, 112) * 0.75);
    for (let k = 0; k < 16; k++) cloudColors[y * 16 + k] = mix(base, mix(C[7], S[5], height * 0.6), k / 15 * 0.9);
    for (let x = 0; x < TW; x++) {
      const u = x - 75, d = Math.hypot((u - 31) * 1.06, v - 57);
      const sun = clamp(1 - d / 38);
      bases[y * TW + x] = d < 8.5 ? S[6] : mix(base, S[5], sun * sun * 0.65);
      // Anonymous reflected figure, deliberately not an enemy texture or a game actor.
      const xx = u + 13, yy = v - 14;
      const head = xx * xx / 53 + (yy + 28) ** 2 / 81 < 1;
      const torso = yy >= -20 && yy < 38 && Math.abs(xx + 1) < (yy < -11 ? 6 + (yy + 20) * 0.85 : 10.8 + Math.max(0, yy - 4) * 0.17);
      const arm = yy >= -12 && yy < 25 && Math.abs(xx + yy * 0.025) > 9 && Math.abs(xx + yy * 0.025) < 15.5 - yy * 0.04;
      const leg = yy >= 31 && yy < 66 && ((xx > -10 + yy * 0.015 && xx < -3) || (xx > 1 + yy * 0.025 && xx < 8 + yy * 0.025));
      silhouette[y * TW + x] = head || torso || arm || leg ? 1 : 0;
    }
  }
  return { clouds, bases, cloudColors, silhouette };
}

export function create(o) {
  const C = fit(o.palette, 8), S = fit(o.sunlight, 8), R = new Rng(o.seed);
  const pieces = fragments(R), sky = skyResources(C, S, R), tex = new Uint32Array(TW * TH);
  const drops = Array.from({ length: 15 }, () => ({ a: R.range(0, TAU), phase: R.range(0, TAU), size: R.range(0.9, 1.6) }));
  const rim = mix(C[6], S[6], 0.24), shade = mix(C[0], S[0], 0.32);
  const cloudSpeed = Number.isFinite(o.cloudSpeed) ? clamp(o.cloudSpeed, 0, 24) : meta.options.cloudSpeed;
  let textureTime = -1;

  function texture(t) {
    if (textureTime === t) return;
    textureTime = t;
    const shift = Math.round(t * cloudSpeed), human = o.reflection !== false ? ease(t, 0.78, 1.12) * (1 - ease(t, 2.6, 3.08)) : 0;
    const preview = ease(t, cues.reflectedCut, cues.reflectedCut + 0.12) * (1 - ease(t, cues.release, cues.release + 0.2));
    const reach = -83 + 170 * ease(t, cues.reflectedCut, cues.reflectedHold);
    for (let y = 0; y < TH; y++) for (let x = 0; x < TW; x++) {
      const i = y * TW + x, u = x - 75, v = y - 115;
      const k = sky.clouds[y * CW + ((x + 85 + shift) % CW)];
      let color = k ? mix(sky.bases[i], sky.cloudColors[y * 16 + k], k / 15) : sky.bases[i];
      if (sky.silhouette[i] && human) color = mix(color, shade, 0.28 * human);
      // A slanted, faint surface reflection makes the sky read as glass rather than a portal.
      const sheen = Math.abs(u + v * 0.29 + 41);
      if (sheen < 6) color = mix(color, C[7], 0.14 * (1 - sheen / 6));
      const dist = Math.abs(v - (u * 0.2 + 12));
      if (preview && u < reach && dist < 9) color = mix(color, dist < 1.3 ? S[7] : S[4], preview * (dist < 1.3 ? 0.98 : 0.55 * (1 - dist / 9)));
      tex[i] = color;
    }
  }
  const sample = (u, v) => tex[Math.max(0, Math.min(TH - 1, Math.floor(v + 115))) * TW + Math.max(0, Math.min(TW - 1, Math.floor(u + 75)))];

  function surface(p, points, m, alpha, whole = false) {
    if (alpha < 0.004) return;
    const verts = points.map(([u, v]) => m.point(u, v));
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (const [x, y] of verts) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
    const edges = whole ? [] : points.map((a, i) => {
      const b = points[(i + 1) % points.length], dx = b[0] - a[0], dy = b[1] - a[1], len = Math.hypot(dx, dy);
      return [-dy / len, dx / len, (dy * a[0] - dx * a[1]) / len];
    });
    p.each(x0 - 1, y0 - 1, x1 + 1, y1 + 1, (x, y, sx, sy) => {
      const dx = x - m.cx, dy = y - m.cy;
      const u = (dx * m.c + dy * m.s) / m.sx + m.u0, v = (-dx * m.s + dy * m.c) / m.sy + m.v0;
      let inside;
      if (whole) inside = (1 - Math.sqrt(u * u / (RX * RX) + v * v / (RY * RY))) * Math.min(RX * Math.abs(m.sx), RY * m.sy);
      else {
        inside = Infinity;
        for (const [nx, ny, d] of edges) inside = Math.min(inside, (u * nx + v * ny + d) * Math.min(Math.abs(m.sx), m.sy));
      }
      if (inside < -0.5) return;
      p.blendPx(sx, sy, sample(u, v), alpha * clamp(inside + 0.5));
    });
    return verts;
  }

  function ground(p, t) {
    if (t <= 0 || t >= meta.duration || p.fade <= 0) return;
    texture(t);
    const a = ease(t, 0.15, 0.8) * (1 - ease(t, 3.2, 4.2));
    if (a) {
      p.each(MX - 83, -4, MX + 83, 31, (x, y, sx, sy) => {
        const q = ((x - MX) / 83) ** 2 + ((y - 12) / 17) ** 2;
        if (q > 1) return;
        const wav = Math.sin(y * 2.8 + t * 2) * 2.4;
        p.blendPx(sx, sy, sample((x - MX) * 0.8 + wav, 92 - (y + 3) * 5), a * (1 - q) * 0.26);
      });
      line(p, arc(MX, 12, 70, 10, 0.1, 2.6), C[5], 0.5, a * 0.3);
    }
    const attack = ease(t, cues.release, cues.release + 0.1) * (1 - ease(t, 2.68, 3.25));
    if (attack) {
      p.each(-30, -1, 218, 25, (x, y, sx, sy) => {
        const dist = Math.abs(y - 11 - Math.sin(x * 0.06) * 1.2);
        const k = clamp(1 - dist / 11) * clamp((x + 30) / 40) * clamp((218 - x) / 70) * attack;
        if (k < 0.005) return;
        p.blendPx(sx, sy, S[4], k * 0.18);
        if (dist < 1.5 + Math.sin(x * 0.14) * 0.6) p.add(sx, sy, S[5], k * 0.14);
      });
    }
    for (const f of pieces) {
      const land = f.melt + 0.2 + f.fall, q = t - land;
      if (q < 0 || q > 1.25) continue;
      const m = fragmentPose(f, f.melt + 0.2), x = m.cx + Math.sin(f.phase) * 9, y = 7 + 10 * Math.sin(f.phase);
      const life = (1 - ease(q, 0.4, 1.25)) * (1 - ease(t, 6.0, meta.duration)), rx = 5 + q * 30, ry = rx * 0.23;
      p.each(x - rx, y - ry, x + rx, y + ry, (lx, ly, sx, sy) => {
        const d = ((lx - x) / rx) ** 2 + ((ly - y) / ry) ** 2;
        if (d < 1) p.blendPx(sx, sy, sample(f.cx + (lx - x) * 1.2, f.cy - (ly - y) * 5), life * (1 - d) * 0.25);
      });
      const ring = ellipse(x, y, rx, ry, 0, 36).concat([[x + rx, y]]);
      line(p, ring.map(([a, b]) => [a, b + 0.8]), C[1], 0.55, life * 0.26);
      line(p, ring, C[5], 0.45, life * 0.55);
      if (q > 0.13) line(p, arc(x, y, rx * 0.61, ry * 0.61, 0.2, 2.8), S[5], 0.4, life * 0.35);
      if (q < 0.16) glint(p, x, y, (1 - q / 0.16) * 2.5, C, 0.5);
    }
  }

  function blade(p, t) {
    const q = t - cues.release;
    if (q < 0 || q > 0.78) return;
    const progress = clamp(q / 0.65), x = -18 + progress * 218, y = MY + 17 + progress * 33;
    const a = ease(q, 0, 0.055) * (1 - ease(q, 0.48, 0.78)), width = 22 * Math.sin(Math.PI * clamp(q / 0.78));
    const length = 38 + 98 * ease(q, 0, 0.23);
    const upper = spline([[x - length, y - width * 0.05], [x - length * 0.64, y - width * 0.94], [x - length * 0.27, y - width * 0.68], [x + 5, y]], false, 7);
    const lower = spline([[x + 5, y], [x - length * 0.33, y - width * 0.15], [x - length * 0.63, y - width * 0.34], [x - length, y - width * 0.05]], false, 7);
    fill(p, [...upper, ...lower], S[4], a * 0.68);
    line(p, lower, mix(S[0], S[3], 0.55), 1, a * 0.45);
    line(p, upper, S[7], 1.1, a);
    line(p, lower, S[6], 0.55, a * 0.7);
    p.glowLine(x - length * 0.8, y - 2, x, y, 9, S[4], a * 0.17);
    for (let i = 0; i < 3; i++) {
      const xx = x - 25 - i * 28, yy = y + 12 + i * 7;
      line(p, [[xx - 52, yy - 5], [xx - 20, yy - 1], [xx, yy]], i % 2 ? C[6] : S[4], 0.5, a * (0.5 - i * 0.1));
    }
  }

  function front(p, t) {
    if (t <= 0 || t >= meta.duration || p.fade <= 0) return;
    texture(t);
    if (t < cues.shatter) {
      const m = pane(t), a = ease(t, cues.open, 0.26);
      const rimPoints = ellipse(0, 0, RX, RY, 0, 100), path = rimPoints.map(q => m.point(...q));
      surface(p, rimPoints, m, a * 0.91, true);
      line(p, [...path, path[0]], shade, 1.45, a * 0.7);
      line(p, [...path, path[0]], rim, 0.65, a * 0.95);
      line(p, arc(0, 0, RX - 2, RY - 2, 2.8, 1.72).map(q => m.point(...q)), C[7], 0.65, a * 0.85);
      line(p, arc(0, 0, RX + 1.8, RY + 1.8, -1.05, 0.9).map(q => m.point(...q)), S[3], 0.45, a * 0.55);
      // A few thin bevel reflections, never a uniformly glowing portal ring.
      for (const [angle, span] of [[3.68, 0.29], [4.55, 0.19], [0.24, 0.24]]) {
        const points = arc(0, 0, RX - 0.8, RY - 0.8, angle, span, 12).map(q => m.point(...q));
        line(p, points, C[7], 1, a * 0.9);
        const [x, y] = points[6]; p.glow(x, y, 7, C[5], a * 0.12);
      }
      for (const d of drops) {
        const u = Math.cos(d.a) * (RX - 1.6), v = Math.sin(d.a) * (RY - 2) + Math.sin(t * 1.1 + d.phase) * 1.2;
        const [x, y] = m.point(u, v);
        p.disc(x, y, d.size, C[5], a * 0.8); p.blend(x - 0.5, y - 1, C[7], a);
      }
      for (const [i, g] of [[0, [-54, -71]], [1, [54, 75]]]) {
        const [x, y] = m.point(...g), k = Math.max(0, Math.sin(t * 3.1 + i * 3)) ** 7 * a;
        glint(p, x, y, 3.4, C, k * 0.8);
      }
      const ripple = t - cues.release;
      if (ripple > 0 && ripple < 0.65) {
        // Clipped to the original pane: refraction travels across glass, never outside it.
        for (let i = 0; i < 2; i++) {
          const radius = ripple * 135 - i * 17;
          if (radius <= 0) continue;
          const pts = arc(18, 17, radius * 0.62, radius, 0, TAU, 100);
          let run = [];
          for (const q of pts) {
            if (q[0] ** 2 / RX ** 2 + q[1] ** 2 / RY ** 2 < 0.97) run.push(m.point(...q));
            else { line(p, run, C[7], 0.6, (1 - ripple / 0.65) * 0.5); run = []; }
          }
          line(p, run, C[7], 0.6, (1 - ripple / 0.65) * 0.5);
        }
      }
      if (t > cues.crack) {
        const a = ease(t, cues.crack, cues.shatter);
        for (const f of pieces) {
          const path = f.pts.map(q => m.point(...q));
          line(p, [...path, path[0]], C[6], 0.45, a * 0.47);
        }
      }
    } else {
      for (const f of pieces) {
        const fade = 1 - ease(t, f.melt + 0.12, f.melt + 0.38), m = fragmentPose(f, t);
        if (fade * 0.85 <= 0.004) continue;
        const path = surface(p, f.pts, m, 0.85 * fade);
        line(p, [...path, path[0]], shade, 1.05, fade * 0.24);
        line(p, [...path, path[0]], rim, 0.62, fade * 0.78);
        const rainbow = Math.max(0, 1 - Math.abs(m.sx) * 1.6);
        if (rainbow) {
          line(p, [path[0], path[1]], C[3], 1.3, rainbow * fade * 0.75);
          line(p, [path[1], path[2]], S[2], 1.15, rainbow * fade * 0.8);
          line(p, [path[0], path[1]], C[7], 0.4, rainbow * fade);
        }
        const gleam = Math.max(0, Math.sin(t * 4 + f.phase)) ** 12 * fade;
        glint(p, ...path[0], 2.1, C, gleam * 0.8);
      }
    }
    blade(p, t);
    for (const f of pieces) {
      const start = f.melt + 0.2, q = (t - start) / f.fall;
      if (q <= 0 || q >= 1) continue;
      const m = fragmentPose(f, start), x = m.cx + Math.sin(f.phase) * 9 * q, floor = 7 + Math.sin(f.phase) * 10;
      const y = m.cy + (floor - m.cy) * q * q;
      const a = ease(q, 0, 0.15), length = 2 + q * 10;
      line(p, [[x + 0.6, y - length], [x + 0.6, y]], C[1], 0.95, a * 0.28);
      line(p, [[x, y - length], [x, y]], C[5], 0.75, a * 0.85);
      p.disc(x, y, 1.9 - q * 0.5, C[4], a * 0.65);
      p.blend(x, y - 1, C[7], a);
      p.glow(x, y, 4, C[5], a * 0.12);
    }
  }
  return { drawBack(p, t) { ground(p, clock(t)); }, draw(p, t) { front(p, clock(t)); } };
}
