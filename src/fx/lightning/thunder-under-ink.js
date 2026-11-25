// A lightning bolt in reserve: cut the pigment plate, never the host frame.
import { clamp, ease, fit, noise2, rand, smooth } from "../../core/index.js";
import { bead } from "../_ink-studies.js";

export const meta = {
  name: "Thunder under ink", desc: "A falling drop spreads into a ragged pool. A fork of bare ground tears through it and holds for three frames before the two skins recoil, with azurite at their torn tips only.",
  tags: ["ink-wash", "ink-studies", "lightning", "crack", "negative-space", "one-shot"],
  size: [200,116], origin: [100,76], duration: 1.26, fps: 50, loop: false, bg: "light",
  options: {palette: ["#141b22", "#252f37", "#3f4e55", "#657476", "#9aaca7", "#507f91"], seed: 38},
};
export const cues = { touch: .20, crack: .58, release: .64, peel: .78 };

// The middle almost-horizontal chisel cut makes a readable bolt, not a wavy river.
const spine = [[30,-34],[-4,-5],[13,-4],[-13,11],[-4,12],[-31,33]];
const twigs = [[[-3,-5],[-13,-7],[-12,-11],[-24,-16]], [[-10,10],[3,12],[9,7],[18,6]]];
const paths = [spine, ...twigs];
const W = 135, H = 67, X = (W-1)/2, Y = (H-1)/2;
const plates = new Map(); // bounded: gallery reseeds indefinitely
function dist(x,y,path) {
  let min = Infinity;
  for (let i=1; i<path.length; i++) {
    const [ax,ay] = path[i-1], dx = path[i][0]-ax, dy = path[i][1]-ay;
    const u = clamp(((x-ax)*dx + (y-ay)*dy)/(dx*dx+dy*dy));
    min = Math.min(min,Math.hypot(x-ax-u*dx,y-ay-u*dy));
  }
  return min;
}
function bankAt(y) {
  for (let i=1; i<spine.length; i++) {
    const [ax,ay] = spine[i-1], [bx,by] = spine[i];
    if (y <= by) return ax+(bx-ax)*(y-ay)/(by-ay);
  }
  return spine.at(-1)[0];
}
const lobes=[[-46,1,14,4],[42,-4,16,4],[-31,14,14,3.4]];
function plate(seed) {
  if (plates.has(seed)) return plates.get(seed);
  const pigment = new Uint8Array(W*H), alpha = new Uint8Array(W*H), side = new Int8Array(W*H);
  const cut = new Uint8Array(W*H), tips = new Uint8Array(W*H), tooth = new Uint8Array(W*H), fringe = new Uint8Array(W*H);
  const phase = rand(seed,2)*Math.PI*2;
  for (let y=-Y;y<=Y;y++) for (let x=-X;x<=X;x++) {
    const i = (y+Y)*W+x+X, u=x/52, v=y/23, a=Math.atan2(v,u);
    const cloud = noise2(x*.076,y*.105,seed), grain = noise2(x*.30,y*.34,seed+17);
    // Scalloped edge, capillary fingers, a broad uneven belly of pooled soot.
    const outline = 1+.095*Math.sin(3*a+.9)+.064*Math.sin(7*a+phase)+.034*Math.sin(13*a-1.4);
    let depth = outline - Math.hypot(u+.15*v,v) + .12*cloud + .048*grain;
    // Three low pools of separated binder wick out past the dense brush load.
    for (const [cx,cy,rx,ry] of lobes) {
      if (Math.abs(x-cx)>rx+2 || Math.abs(y-cy)>ry+2) continue;
      depth=Math.max(depth,.3*(1-Math.hypot((x-cx)/rx,(y-cy)/ry))+.035*grain);
    }
    if (depth < -.054) continue;
    let c = 1, load = 1;
    const vein = v + .43*Math.sin(3.2*u+.8) + .25*u + .46*cloud + .10*grain;
    if (depth < .04) { c=3; load=.15+.54*smooth(-.054,.04,depth); }
    else if (depth < .095+.018*grain) { c=2; load=.62+.19*cloud; }
    else if (depth < .145) { c=0; load=.80; }
    else if (vein > .07) c=0;
    else if (vein < -.58 || (vein < -.20 && cloud > .39)) { c=2; load=.85; }
    if (depth > .20 && vein < -.24 && Math.abs(vein+.57+.09*grain)<.055) { c=3; load=.77; }
    if (depth>.17 && vein<.20 && cloud+.14*grain<-.46) { c=2; load=.82; }
    // The last capillaries keep wicking after the dense centre is at full size.
    // Arrival varies along the edge; a uniformly scaled inkblot looks inflated.
    if (depth<.14) fringe[i]=Math.round(255*clamp(.37+.32*cloud+.15*grain+(.12-depth)*1.8));
    tooth[i]=Math.round(255*clamp(.5+.29*cloud+.16*grain+.15*Math.sin(5*v+3*u)+(c===0 ? .13 : -.04)));
    pigment[i]=c; alpha[i]=Math.round(load*255); side[i]=x < bankAt(y) ? -1 : 1;
    const rough=.19*grain, w=1.58+.68*(1-Math.abs(v));
    cut[i] = Number(paths.some((path,k) => dist(x,y,path) < (k===0 ? w : 1.05)+rough));
    tips[i] = Number(!cut[i] && twigs.some(twig => {
      const [ex,ey] = twig.at(-1);
      return (x-ex)**2+(y-ey)**2<10 && dist(x,y,twig)<2.2;
    }));
  }
  const result={pigment,alpha,side,cut,tips,tooth,fringe};
  if (plates.size === 4) plates.delete(plates.keys().next().value);
  plates.set(seed,result); return result;
}

export function draw(p,t,o) {
  if (t <= 0 || t >= meta.duration) return;
  const C=fit(o.palette,6), {touch,crack,release,peel}=cues;
  if (t < touch-1e-8) {
    const u=clamp(t/touch), arrive=smooth(0,.055,t);
    bead(p,-3*(1-u),-57*(1-u*u)-4,4.7*arrive,(5+4.2*u*u)*arrive,-.07,C,o.seed,arrive,.31);
    return;
  }
  const art=plate(o.seed), spread=ease.outCubic(clamp((t-touch)/(crack-.04-touch)));
  const soak=clamp((t-touch)/(crack-touch));
  const opened = t >= crack-1e-8, snap = t < release-1e-8 ? 0 : .16+.84*ease.outCubic(clamp((t-release)/.105));
  const settle = smooth(peel,.96,t), dry = smooth(.88,meta.duration,t);
  const sx=(.10+.90*spread)*(1-.53*dry), sy=(.11+.89*spread)*(1-.81*dry);
  // Keep the first three frames of the fissure exactly still. Its geometry is
  // sampled from the same coordinates as the wet banks; neither bank can fill it.
  for (const bank of [-1,1]) {
    const k=snap*(1-.27*settle), angle=bank*(-.14*k+.075*dry), ca=Math.cos(angle), sa=Math.sin(angle);
    const dx=bank*(20*k+11*dry), dy=(bank<0 ? -5 : 3)*k-3*snap*(1-settle)+4*dry;
    const bx=Math.abs(ca)*X*sx+Math.abs(sa)*Y*sy+1, by=Math.abs(sa)*X*sx+Math.abs(ca)*Y*sy+1;
    p.each(dx-bx,dy-by,dx+bx,dy+by,(lx,ly,px,py) => {
      const x= Math.round((ca*(lx-dx)+sa*(ly-dy))/sx), y=Math.round((-sa*(lx-dx)+ca*(ly-dy))/sy);
      if (x < -X || x > X || y < -Y || y > Y) return;
      const i = (y+Y)*W+x+X;
      if (art.side[i]!==bank || !art.alpha[i] || (opened && art.cut[i])) return;
      const c=opened && art.tips[i] ? C[5] : C[art.pigment[i]];
      const wick=dry<.12 ? 1 : smooth(dry*.88-.15,dry*.88+.02,art.tooth[i]/255);
      const bleed=art.fringe[i]/255, edge=bleed && !opened ? smooth(bleed-.20,bleed,soak) : 1;
      p.blendPx(px,py,c,art.alpha[i]/255*(1-dry)*wick*edge);
    });
  }
  // The recoil lifts ink off two broken banks, not off a circular shock front.
  for (const [i,[x,y,vx,vy,r]] of [[-34,-15,-35,-12,2.3],[-45,-7,-30,-3,1.3],[-29,13,-29,8,1.7],
    [42,-10,29,-10,2.1],[36,13,38,8,1.6],[17,-17,12,-19,1.2]].entries()) {
    const u=clamp((t-release-.016*i)/(.27+.055*rand(o.seed,i)));
    if (u<=0 || u>=1) continue;
    const fling=ease.outCubic(u), size=(1-u*u)*smooth(0,.09,u);
    bead(p,x+vx*fling,y+vy*fling+9*u*u,r*size,r*(1.9-.7*u)*size,Math.sign(vx)*.99,C,o.seed+i,1-u*u);
  }
}
