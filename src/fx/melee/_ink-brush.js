// Shared brush for the two ink actions. Work in nib coordinates (u along the stroke,
// v across it). The channels are gaps between polygons, never white paint or erasures:
// another fighter, a dark background, or an earlier stroke stays visible through them.
import { clamp, smooth } from "../../core/math.js";
import { polygon } from "../_comic.js";

export const outcomes = ["damage", "shield", "miss"];
const windowAt = (u, a, b, c, d) => smooth(a, b, u) * (1 - smooth(c, d, u));

// Pressure is sampled along the actual curve, not inferred from a uniform-width arc.
export function nib(points, pressure, dry, grain) {
  const [a, b, c, d] = points, N = 48;
  return Array.from({ length: N + 1 }, (_, i) => {
    const u = i / N, v = 1 - u;
    const xy = k => v*v*v*a[k] + 3*v*v*u*b[k] + 3*v*u*u*c[k] + u*u*u*d[k];
    const tangent = k => v*v*(b[k]-a[k]) + 2*v*u*(c[k]-b[k]) + u*u*(d[k]-c[k]);
    const dx = tangent(0), dy = tangent(1), length = Math.hypot(dx, dy) || 1;
    const k = u * (pressure.length - 1), j = Math.min(Math.floor(k), pressure.length - 2);
    const w = pressure[j] + (pressure[j+1] - pressure[j]) * smooth(0, 1, k - j);
    return { u, x: xy(0), y: xy(1), nx: -dy/length, ny: dx/length, w, dry, grain };
  });
}

export function brush(p, nib, tail, head, C, seed, { x = 0, y = 0, load = 1, alpha = 1 } = {}) {
  tail = clamp(tail); head = clamp(head);
  if (head - tail < .008 || load <= .015 || alpha <= .01) return;
  const N = nib.length - 1, phase = (seed % 53) * .67 + nib[0].grain;
  // The head writes fast; the trailing hairs lift one after the other. Pigment teeth
  // are attached to fixed positions on the path, so a held stroke does not sparkle.
  const sections = [];
  for (let i = Math.floor(tail*N); i <= Math.ceil(head*N); i++) {
    const u = clamp(i/N, tail, head), index = Math.min(N-1, Math.floor(u*N)), f = u*N-index;
    const a = nib[index], b = nib[index+1];
    const tooth = Math.sin(u*71+phase)*.045 + Math.sin(u*109-phase)*.025;
    const tip = (.26 + .74*smooth(0, .062, head-u)) * (.22 + .78*smooth(0, .045, u-tail));
    const w = (a.w+(b.w-a.w)*f) * load * tip;
    const mid = Math.sin(u*14+a.grain) * .10, dry = a.dry;
    const split1 = dry * windowAt(u,.14,.36,.69,.94) * (.72+.28*Math.sin(12*u+a.grain));
    const split2 = dry * windowAt(u,.37,.54,.87,.99) * (.75+.25*Math.sin(21*u));
    const s1 = -.42 + mid, s2 = .31 + .14*Math.sin(u*9-phase*.18);
    const belly = .10*Math.sin(22*u+a.grain) + .065*Math.sin(46*u+phase);
    // Short bites in the perimeter and dark pigment islands inside it. These are
    // correlated with the brush direction, not screen-space dithering or white flecks.
    const nick = .22*windowAt(u,.28,.305,.315,.35) + .28*windowAt(u,.58,.62,.63,.66) + .16*windowAt(u,.74,.77,.78,.82);
    // On the dry wipe the three bundles are pulled to different endpoints:
    // the gaps open out of the silhouette instead of closing into an outlined eye.
    const fray = dry > 1 ? smooth(.57,.98,u) : 0;
    sections.push({u, x: x+a.x+(b.x-a.x)*f, y: y+a.y+(b.y-a.y)*f,
      nx: a.nx+(b.nx-a.nx)*f, ny: a.ny+(b.ny-a.ny)*f, w, tooth, belly, fray, nick,
      l1: s1-.17*split1, r1: s1+.17*split1, l2: s2-.11*split2, r2: s2+.11*split2 });
  }
  const fade = p.fade;
  function band(lo, hi, color, opacity = 1, start = 0, end = 1) {
    const left = [], right = [];
    for (const s of sections) {
      if (s.u < start || s.u > end) continue;
      const a = lo(s)*s.w, b = hi(s)*s.w;
      left.push([s.x+s.nx*a, s.y+s.ny*a]); right.push([s.x+s.nx*b, s.y+s.ny*b]);
    }
    if (left.length < 2) return;
    p.fade = fade * alpha * opacity;
    polygon(p, left.concat(right.reverse()), color);
  }
  // A damp fringe outside the nib, a near-black belly and two uneven dry channels.
  band(s => -1.20+s.tooth*2, s => -.85+s.tooth, C[3], .45, .07, .93);
  band(s => -1+s.tooth+s.belly-.65*s.fray, s => s.l1-.65*s.fray, C[1], 1, 0, nib[0].dry > 1 ? .88 : 1);
  band(s => s.r1, s => s.l2, C[0]);
  band(s => s.r2+.71*s.fray, s => 1+s.tooth*1.5+s.belly-s.nick+.71*s.fray, C[0], 1, 0, nib[0].dry > 1 ? .94 : 1);
  // A broken mineral-colour edge, not a luminous outline. Narrow at both ends.
  band(s => -.99+s.tooth+s.belly, s => -.99+s.tooth+s.belly+.34*windowAt(s.u,.04,.25,.56,.79), C[4], .95, .04, .79);
  band(s => s.r1+.015, s => s.r1+.015+.23*windowAt(s.u,.09,.21,.32,.52), C[2], .86, .09, .52);
  band(s => -.76+s.belly, s => -.76+s.belly+.17*windowAt(s.u,.34,.41,.49,.55), C[0], .82, .34, .55);
  band(s => .72+s.belly, s => .72+s.belly+.16*windowAt(s.u,.48,.53,.58,.64), C[3], .68, .48, .64);
  band(s => s.r2, s => s.r2+.19*windowAt(s.u,.25,.48,.65,.91), C[2], .95, .25, .91);
  // A few escaped bristles follow the hand, not a field of random floating pixels.
  band(s => 1.10+s.tooth*2, s => 1.10+s.tooth*2+.16*windowAt(s.u,.22,.38,.68,.92), C[1], .83, .22, .92);
  band(s => -1.42+s.tooth*2, s => -1.42+s.tooth*2+.13*windowAt(s.u,.40,.50,.79,.91), C[3], .75, .40, .91);
  p.fade = fade;
}

// Small side locks: a stroke tapers a second time at each end, with its own
// (offset) trajectory. They read as lifted dry hair, never as a closed outline.
export function filament(p, path, tail, head, color, alpha = 1) {
  if (head <= tail || alpha < .02) return;
  const left = [], right = [], saved = p.fade;
  for (const s of path) {
    if (s.u < tail || s.u > head) continue;
    const w = s.w * (.2+.8*smooth(0,.12,head-s.u)) * (.2+.8*smooth(0,.1,s.u-tail));
    left.push([s.x-s.nx*w,s.y-s.ny*w]); right.push([s.x+s.nx*w,s.y+s.ny*w]);
  }
  p.fade *= alpha; polygon(p,left.concat(right.reverse()),color); p.fade = saved;
}

// Irregular pulled drops. The belly sits away from the pointed end, so even a
// stationary frame describes a direction. r is the half width, not the length.
export function drop(p, x, y, dx, dy, r, C, alpha = 1) {
  if (r < .13 || alpha < .01) return;
  const len = Math.hypot(dx,dy) || 1, ex = dx/len, ey = dy/len;
  const shape = pts => pts.map(([a,b]) => [x+dx*a-ey*r*b, y+dy*a+ex*r*b]);
  const save = p.fade;
  p.fade *= alpha;
  polygon(p, shape([[-.81,0],[-.21,-.60],[.13,-.96],[.37,-.77],[.54,-.28],[.52,.45],[.29,.93],[.03,.81],[-.30,.40]]), C[0]);
  polygon(p, shape([[-.35,-.39],[.11,-.96],[.34,-.72],[.11,-.46]]), C[3]);
  p.fade = save;
}

export function clipMeta(parent, name, size, origin, duration) {
  const { fps, options } = parent;
  return { name, size, origin, duration, fps, loop: false, options };
}
