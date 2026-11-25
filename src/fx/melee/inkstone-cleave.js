// A loaded staff, not an area attack: only the last part of the descent carries ink.
// The stamp is a separate, forward-facing print placed at the resolved contact point.
import { clamp, fit, smooth, READY } from "../../core/index.js";
import { polygon } from "../_comic.js";
import { brush, nib, drop, outcomes, clipMeta } from "./_ink-brush.js";

export const meta = {
  name: "Inkstone cleave", desc: "The clone rises clean. A dry staff-tip trace drops into a low, wet print that splits into three mountain-like folds. A shield takes the print; a missed landing leaves no splash.",
  tags: ["ink-wash", "stone-monkey", "staff", "slam", "impact", "one-shot"],
  size: [156, 112], origin: [36, 94], fps: 50, duration: .80, loop: false, bg: "light", actor: 2,
  outcomes, options: { palette: ["#171d1c", "#2c3733", "#657b6e", "#93a899", "#c2cfb4"], seed: 83, outcome: "damage" },
};
export const cues = { takeoff: .12, descent: .32, contact: .46, clear: .80 };
const tip = [40,-1]; // in the gallery only, relative to the clone's floor projection
const swing = nib([[-43,-79],[-15,-80],[8,-32],[0,0]], [0,2.2,3.1,4.8,4.2,2.9,0], 1.45, 2.1);
const sole = nib([[-9,.5],[1,4],[34,1],[60,-3]], [0,2.6,5.2,4.6,3.7,1.6,0], .35, 8.3);
// Offset of the travelling nib from the gallery's fixed eventual impact. A split
// trail instead anchors its head directly on the live weapon tip, even during a chase.
const nibHead = t => .04+.96*clamp(t/(cues.contact-cues.descent))**1.35;
export function trailHead(t) {
  const k = nibHead(t)*(swing.length-1), i = Math.min(swing.length-2,Math.floor(k)), f=k-i;
  return ["x","y"].map(axis => Math.round(swing[i][axis]+(swing[i+1][axis]-swing[i][axis])*f));
}
function trailAt(p, t, o, x = 0, y = 0) {
  if (t <= 0 || t >= cues.contact-cues.descent-1e-8) return;
  const u = clamp(t/(cues.contact-cues.descent)), head = nibHead(t);
  brush(p, swing, Math.max(0,head-.45), head, fit(o.palette,5), o.seed, { x, y, load: .85+.15*u });
}
// The folds share a wet root but not an outline. Each has a different broken ridge
// (axe-cut texture), an ink-heavy face and a sliver of reflected grey-green.
const folds = [
  { at: 3, drift: 5, up: 3, lag: 0,
    edge: [[-6,1],[-7,-3],[-9,-7],[-6,-6],[-9,-13],[-6,-11],[-2,-12],[1,-6],[4,-4],[7,0]],
    ridge: [[-9,-13],[-6,-11],[-2,-12],[1,-6],[.2,-4],[-3,-8],[-5,-7]],
    cut: [[-5,-9],[-2,-5],[0,-4],[-2,-4]] },
  { at: 10, drift: 16, up: 7, lag: .012,
    edge: [[-9,1],[-7,-4],[-4,-7],[-3,-12],[0,-11],[7,-19],[6,-13],[9,-15],[7,-8],[9,-9],[5,-3],[2,0]],
    ridge: [[-6,-4],[-4,-7],[-3,-12],[0,-11],[7,-19],[3,-10],[1,-9],[1,-7]],
    cut: [[1,-8],[3,-12],[7,-16],[4,-11]] },
  { at: 19, drift: 26, up: 2, lag: .022,
    edge: [[-8,1],[-5,-3],[-1,-6],[3,-7],[12,-12],[10,-9],[14,-10],[9,-4],[5,-1]],
    ridge: [[-6,-2],[-1,-6],[3,-7],[12,-12],[6,-7],[3,-5]],
    cut: [[2,-3],[9,-7],[6,-4]] },
];
function stampAt(p, t, o, x = 0, y = 0) {
  if ((o.outcome !== "damage" && o.outcome !== "shield") || t < -1e-8 || t >= .34-1e-8) return;
  t = Math.max(t,0);
  const C = fit(o.palette,5), phase = Math.sin(o.seed*.76);
  const cast = 1-(1-clamp(t/.10))**3, lift = smooth(.15,.34,t);
  // Lay the flat pool immediately; after the airborne peaks collapse, just the
  // broken witness mark runs out of water. There is no circular back half.
  const saved = p.fade;
  const press = .47+.53*cast, sx = (1-.48*lift)*press, sy = (1-.82*lift)*(.84+.16*cast);
  const pool = pts => pts.map(([a,b]) => [x+lift*19+a*sx, y+b*sy]);
  p.fade *= 1-lift;
  polygon(p,pool([[-13,.5],[-8,-1],[-10,-2],[-5,-4],[0,-4],[3,-6],[9,-7],[14,-5],[23,-5],[28,-3],[39,-4],
    [35,-2],[47,-2],[39,1],[26,1],[21,3],[8,3],[2,5],[-5,4],[-3,3],[-9,3]]),C[1]);
  polygon(p,pool([[-10,0],[-3,-2],[3,-2],[9,-5],[15,-5],[11,-3],[6,-1],[1,-1],[-3,1]]),C[3]);
  p.fade = saved;
  brush(p, sole, .85*lift, .39+.61*cast, C, o.seed+3,
    {x,y,load:(1-.70*lift)*(1.12-.18*cast),alpha:1-lift});
  for (const [i, f] of folds.entries()) {
    const age = t-f.lag;
    if (age < 0) continue;
    const out = 1-(1-clamp(age/.13))**2, dry = smooth(.13,.275-i*.009,age);
    if (dry >= 1) continue;
    const roots = .57 + .43*cast, height = (.42+.73*cast)*(1-.76*dry);
    const cx = x+f.at*roots+(f.drift+phase*.85)*out, cy = y-f.up*Math.sin(Math.PI*clamp(age/.23));
    const map = pts => pts.map(([a,b]) => [cx+a*roots*(1-.27*dry),cy+b*height]);
    p.fade = saved*(1-dry);
    // Separate the caps from the wet base as short, torn tips rather than debris rings.
    const drain = 1-smooth(.065,.16,age);
    if (drain > 0) {
      const foot = x+f.at+(cx-x-f.at)*.36, w = (5+i)*drain;
      polygon(p,[[cx-4*drain,cy-3],[cx+3*drain,cy-2],[foot+w,y+1],[foot-w,y+2]],C[1]);
    }
    polygon(p,map(f.edge),C[i === 0 ? 1 : 0]);
    polygon(p,map(f.ridge),C[2]);
    polygon(p,map(f.cut),C[4]);
  }
  p.fade = saved;
  // Stray ink, flung predominantly forward, then falling back towards the print.
  for (const [i,[vx,vy,r]] of [[12,-16,1.8],[36,-23,1.45],[51,-10,1.6]].entries()) {
    const u = clamp((t-.022-i*.009)/(.20+i*.013));
    if (u <= 0 || u >= 1) continue;
    const flight = 1-(1-u)**2, s = (1-u*u)*smooth(0,.12,u);
    drop(p, x+6+(vx+phase)*flight, y+vy*flight+13*u*u, (3+i)*s, (-4+6*u)*s, r*s,C,1-smooth(.70,1,u));
  }
}
// A successful one-use clone retires; the gallery stand-in must not also vanish on a miss.
// Only the actor preview reads this. It never paints a body into an effect sheet.
export function actorAlpha(t,o) {
  return o.outcome === "damage" || o.outcome === "shield" ? 1-smooth(.53,cues.clear,t) : 1;
}
export function drawBack(p,t,o) { trailAt(p,t-cues.descent,o,...tip); }
export function draw(p,t,o) { stampAt(p,t-cues.contact,o,...tip); }
export const clips = {
  trail: { meta: clipMeta(meta,"trail",[80,80],[55,65],.14), draw: () => {}, drawBack(p,t,o) {
    const [x,y] = trailHead(t); trailAt(p,t,o,-x,-y);
  } },
  stamp: { meta: clipMeta(meta,"stamp",[100,56],[22,42],.34), draw: (p,t,o) => stampAt(p,t,o) },
};
const guard = { ...READY, weapon: "staff", two: true, fx: 10, fy: -25, sa: -.8 };
const crouch = { ...guard, lean: 2, crouch: 7, fy: -20, sa: -1.15 };
const high = { ...guard, x: 2, y: -28, crouch: 1, fx: 4, fy: -38, sa: -2.0, ffy: -5, fby: -8 };
const landed = { ...guard, x: 5, lean: 5, crouch: 6, fx: 13, fy: -20, sa: .61, ffx: 10, toeB: true };
export const act = {
  target: {x: tip[0], outcomes: ["damage","shield"]},
  poses: [[0,guard],[cues.takeoff,crouch],[.26,high,"out"],[cues.descent,high],
    [.38,{ ...high, x: 4, y: -19, fx: 9, fy: -36, sa: -.85 }],
    [.42,{ ...high, x: 5, y: -11, fx: 12, fy: -27, sa: -.19 }],
    [cues.contact,landed,"in"],[.52,landed],[.72,guard]],
  hits: [{t:cues.contact, outcomes:["damage","shield"], push:1.8, straw:0, flash:0}],
};
