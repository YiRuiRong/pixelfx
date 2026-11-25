// Flying White: three distinct press–drag–lift gestures from the sword ECHO's feet.
// Clip exports let a host place every release and the target's ink independently.
import { fit, clamp, smooth, READY } from "../../core/index.js";
import { brush, nib, drop, filament, outcomes, clipMeta } from "./_ink-brush.js";

export const meta = {
  name: "Flying white triptych", desc: "A jade-edged rising flick, a dry horizontal wipe with two open channels, then a loaded falling cut. Only a damaging third stroke throws ink from its victim.",
  tags: ["ink-wash", "flying-white", "blade-master", "echo", "slash", "combo", "one-shot"],
  size: [128, 96], origin: [30, 80], fps: 50, duration: .60, loop: false, bg: "light", actor: 2,
  outcomes, options: { palette: ["#11191d", "#253537", "#425957", "#73928b", "#a5cbbb"], seed: 47, outcome: "damage" },
};
export const cues = { rise: 0, cross: .16, fall: .32, contact: .32 };
const victim = [52, -13]; // a preview fixture only; clips.spray has its own origin (the actual victim)
const gestures = [
  { path: nib([[8,-12],[25,-12],[53,-37],[49,-66]], [0,4.7,5.5,3.7,2.0,1.0,0], .54, 1.3), write: .058, lift: .080, end: .16 },
  { path: nib([[3,-30],[16,-37],[45,-27],[76,-32]], [0,4.9,6.7,4.3,3.3,1.4,0], 1.35, 3.1), write: .057, lift: .063, end: .16 },
  { path: nib([[9,-64],[34,-64],[55,-32],[52,-12]], [0,1.6,3.8,5.9,8.6,8.4,2.8], .37, 6.4), write: .057, lift: .106, end: .24 },
];
// Individually drawn flyaways: the loaded downstroke bunches at its foot;
// the dry horizontal fan exits in three *different* directions.
const locks = [
  [nib([[13,-11],[32,-15],[41,-35],[45,-49]],[0,1.15,1.4,.6,0],0,0)],
  [nib([[27,-38],[44,-34],[61,-28],[76,-30]],[0,1.30,1,.65,0],0,0),
   nib([[35,-29],[52,-25],[65,-25],[81,-27]],[0,1.2,1.3,.55,0],0,0),
   nib([[18,-29],[32,-24],[47,-23],[59,-23]],[0,.85,1.05,.40,0],0,0)],
  [nib([[24,-62],[43,-49],[50,-32],[47,-17]],[0,.75,1.6,.6,0],0,0),
   nib([[52,-37],[56,-30],[56,-19],[54,-12]],[0,1.8,2.7,1.2,0],0,0)],
];
function strokeAt(p, index, t, o) {
  const g = gestures[index];
  if (t <= 0 || t >= g.end) return;
  const lift = smooth(g.lift, g.end, t), head = 1 - (1-clamp(t/g.write))**2;
  const C = fit(o.palette,5);
  brush(p, g.path, lift*.99, head, C, o.seed, { load: 1-.49*lift, alpha: 1-lift*.72 });
  for (const [i, lock] of locks[index].entries()) {
    filament(p,lock,clamp(lift*1.09),clamp((head-.17-i*.06)*1.34),C[i === 1 ? 1 : 2],1-.6*lift);
  }
}
function sprayAt(p, t, o, x = 0, y = 0) {
  if (o.outcome !== "damage" || t <= 0 || t >= .26) return;
  const C = fit(o.palette, 5), seed = Math.sin(o.seed*1.7);
  // Exactly three pulls from the cut; no sparks, blood decal or radial shock.
  for (const [i, [vx,vy,r,delay]] of [[25,-13,2.3,.018],[32,-3,1.5,.031],[14,-24,1.85,.044]].entries()) {
    const age = t-delay, u = clamp(age/(.207-i*.013));
    if (u <= 0 || u >= 1) continue;
    const flight = 1-(1-u)**2, s = (1-u**1.5)*smooth(0,.09,u);
    const px = x+(vx+seed*1.7)*flight, py = y+vy*flight+12*u*u;
    drop(p, px, py, (6.5-i)*s, (-4+i*.9+u*7)*s, r*s, C, 1-smooth(.69,1,u));
  }
}
export function draw(p, t, o) {
  strokeAt(p, 0, t, o); strokeAt(p, 1, t-cues.cross, o); strokeAt(p, 2, t-cues.fall, o);
  sprayAt(p, t-cues.contact, o, ...victim);
}
export const clips = Object.fromEntries(["rise","cross","fall"].map((name,i) => [name, {
  meta: clipMeta(meta, name, meta.size, meta.origin, gestures[i].end), draw: (p,t,o) => strokeAt(p,i,t,o),
}]));
clips.spray = { meta: clipMeta(meta, "spray", [62,50], [10,31], .26), draw: (p,t,o) => sprayAt(p,t,o) };

const guard = { ...READY, weapon: "sword", sa: -.71 }, low = { ...guard, x: 1, crouch: 5, lean: 2, fx: 12, fy: -19, sa: .46 };
const high = { ...guard, x: 4, lean: 4, fx: 12, fy: -35, sa: -1.21, toeB: true };
const across = { ...guard, x: 7, crouch: 3, lean: 5, fx: 15, fy: -27, sa: -.06, ffx: 10 };
const down = { ...low, x: 8, lean: 6, fx: 14, fy: -21, sa: .47, ffx: 12, toeB: true };
export const act = {
  target: { x: victim[0], outcomes: ["damage","shield"] }, poses: [[-.18,guard],[-.05,low],[0,low],[.055,high,"snap"],[.16,high],
    [.20,across,"snap"],[.27,{ ...high, sa: -1.55 },"snap"],[.32,{ ...high, sa: -1.55 }],[.36,down,"snap"],[.45,down],[.65,guard]],
  hits: [cues.rise,cues.cross,cues.fall].map((t,i) => ({ t, outcomes: ["damage"], push: i === 2 ? 1.5 : .45, straw: 0, flash: 0 })),
};
