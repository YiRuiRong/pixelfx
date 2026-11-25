// A contour is a move followed by line ends or cubic control/control/end triples.
// Keep these marks in brush space: mirroring changes the gesture, never the grain.
import { clamp } from "../core/math.js";
import { polygon } from "./_comic.js";

export function contour(start, ...segments) {
  const out = [start];
  for (const s of segments) {
    if (s.length === 2) { out.push(s); continue; }
    const [x, y] = out.at(-1), [a, b, c, d, ex, ey] = s;
    const n = Math.max(3, Math.ceil((Math.hypot(a-x,b-y) + Math.hypot(c-a,d-b) + Math.hypot(ex-c,ey-d))/3));
    for (let i = 1; i <= n; i++) {
      const u = i/n, v = 1-u;
      out.push([v*v*v*x + 3*v*v*u*a + 3*v*u*u*c + u*u*u*ex, v*v*v*y + 3*v*v*u*b + 3*v*u*u*d + u*u*u*ey]);
    }
  }
  return out;
}

export function wash(p, form, map, color, alpha = 1) {
  if (alpha < .005) return;
  const saved = p.fade;
  p.fade *= alpha;
  polygon(p, form.map(([x,y]) => map(x,y)), color);
  p.fade = saved;
}

// A loaded water drop. The pale area is diluted pigment, not a white specular dot.
// The dry nib at the top and the scalloped pigment line deform *with* the drop.
export function bead(p, x, y, rx, ry, angle, C, grain, opacity = 1, tip = .18) {
  if (Math.min(rx, ry) < .15 || opacity < .01) return;
  const ca = Math.cos(angle), sa = Math.sin(angle), phase = grain * .73;
  const bx = 1.36 * (Math.abs(rx*ca) + Math.abs(ry*sa));
  const by = 1.36 * (Math.abs(rx*sa) + Math.abs(ry*ca));
  p.each(x-bx, y-by, x+bx, y+by, (lx, ly, sx, sy) => {
    const dx = lx-x, dy = ly-y, v = (-sa*dx + ca*dy)/ry;
    if (Math.abs(v) > 1.33) return;
    const u = ((ca*dx + sa*dy)/rx + .12*v*v) / (1 + tip*v);
    const r = Math.sqrt(u*u + v*v) + .038*Math.sin(5*u+2*v+phase)*Math.cos(4*v-phase);
    // A hanging nib projects from the shoulder, then travels with the compressed
    // silhouette. Unequal tusche rims avoid the look of eight identical pearls.
    const nib = v < -.60 && v > -1.27 && Math.abs(u+.19+.18*(v+1)) < tip*(v+1.28)*1.6;
    if (r > 1.10 && !nib) return;
    const tide = v + .31*u + .20*Math.sin(3.6*u+phase) + .065*Math.sin(10*u-3*v);
    const rim = r > .92;
    const glint = v<-.17 && u<.17 && r>.70 && r<.88 && u>-.83;
    const c = nib && r>1 ? C[2] : rim ? C[3] : glint ? C[4] : r>.84 ? C[1] : tide < -.39 ? C[2] : tide < .05 ? C[1] : C[0];
    const a = nib && r>1 ? .80 : rim ? .64*clamp((1.10-r)/.15) : .91 + .09*clamp(tide+.4);
    p.blendPx(sx,sy,c,a*opacity);
  });
}
