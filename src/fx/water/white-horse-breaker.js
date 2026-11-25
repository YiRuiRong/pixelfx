// White horses (whitecaps): the crest, poll and mane are the SAME load of ink.
// The face, throat and folded knees are slivers of open paper between brush marks.
import { clamp, fit, lerp, rand, smooth } from "../../core/index.js";
import { bead, contour as path, wash } from "../_ink-studies.js";

export const meta = {
  name: "White horse breaker", desc: "A blue-black breaker lifts a horse out of its unpainted spaces. Two forehooves take one half-step; the shoulder falls as surf and a single lock of mane lands a beat late.",
  tags: ["ink-wash", "ink-studies", "water", "wave", "horse", "negative-space", "one-shot"],
  size: [208,116], origin: [104,96], duration: 1.48, fps: 50, loop: false, bg: "light",
  options: {palette: ["#122126", "#253d42", "#406267", "#668782", "#94b1a6", "#c1cfbd"], seed: 23},
};
export const cues = { swell: .16, reveal: .48, crest: .66, step: .76, slap: .98, lastLock: 1.12 };

// Each tuft has a root and a divided point, not an evenly spaced outline.
const body = path([-72,0], [-54,-3,-47,-6,-42,-13], [-49,-10,-54,-11,-57,-13],
  [-42,-13,-32,-18,-27,-28], [-32,-23,-39,-22,-42,-23], [-25,-30,-23,-37,-18,-46],
  [-25,-41,-32,-42,-35,-40], [-22,-50,-17,-48,-9,-60], [-18,-56,-22,-59,-30,-58],
  [-17,-62,-13,-62,-4,-68], [3,-74,12,-73,18,-68], [12,-68,5,-64,2,-56],
  [-4,-42,1,-29,-11,-19], [-26,-6,-49,1,-72,0]);
const brow = path([2,-58], [3,-66,10,-70,16,-70], [16,-74,13,-79,15,-83],
  [20,-81,21,-76,22,-74], [24,-76,26,-81,28,-81], [29,-78,27,-73,27,-70],
  [31,-66,30,-63,35,-58], [40,-53,46,-49,48,-45], [48,-42,46,-39,42,-39],
  [39,-39,35,-41,33,-43], [27,-44,23,-47,21,-51], [26,-48,33,-47,37,-44],
  [40,-42,43,-42,44,-44], [44,-47,37,-50,34,-54], [28,-60,26,-63,22,-65],
  [17,-69,10,-67,2,-58]);
const jaw = path([30,-48], [25,-46,22,-45,20,-48], [18,-50,18,-53,19,-56],
  [14,-53,14,-47,17,-44], [18,-41,12,-38,10,-34], [5,-28,8,-22,4,-19],
  [13,-22,9,-30,17,-37], [20,-40,22,-42,24,-43], [27,-44,29,-45,30,-48]);
const eye = path([24,-61], [26,-62,29,-60,30,-58], [27,-58,25,-57,24,-61]);
const nose = path([40,-48], [42,-49,44,-47,44,-45], [41,-45,40,-46,40,-48]);
const ear = path([17,-79], [19,-78,20,-74,20,-72], [18,-72,17,-76,17,-79]);
// The toes are squared off at different heights. Upper and lower marks stop short
// of one another at the knee; nowhere is a white leg painted onto the background.
const farLeg = path([-16,-20], [-8,-21,-3,-26,4,-28], [9,-30,14,-31,17,-29],
  [20,-28,19,-25,18,-23], [16,-19,14,-15,16,-13], [19,-11],[16,-9],[12,-10],
  [10,-13,12,-19,14,-24], [15,-27,13,-27,9,-26], [1,-23,-6,-18,-16,-20]);
const nearLeg = path([-6,-13], [4,-13,11,-18,16,-24], [22,-30,27,-34,32,-33],
  [37,-32,35,-27,33,-24], [30,-20,28,-16,28,-13], [31,-10],[29,-7],[24,-8],
  [21,-12,24,-17,26,-21], [29,-26,33,-29,30,-30], [27,-31,22,-26,19,-22],
  [11,-12,3,-10,-6,-13]);
const shoulder = path([-25,-13], [-13,-20,-9,-23,-7,-34], [-4,-40,0,-44,4,-45],
  [-4,-35,-2,-23,-7,-19], [-11,-15,-19,-14,-25,-13]);
const farWash = path([-76,1], [-66,-5,-50,-6,-45,-15], [-46,-10,-43,-12,-41,-14],
  [-33,-17,-29,-27,-22,-30], [-26,-22,-23,-27,-19,-29], [-12,-38,-13,-46,-4,-54],
  [-5,-46,-10,-35,-8,-30], [-15,-13,-43,1,-76,1]);
const striae = [
  [2,.96,path([-65,-2],[-39,-6,-32,-17,-25,-24],[-36,-15,-39,-13,-41,-13],[-45,-9,-52,-6,-65,-2])],
  [4,.78,path([-39,-18],[-23,-25,-19,-31,-16,-40],[-19,-35,-16,-39,-13,-43],[-16,-32,-25,-23,-39,-18])],
  [3,.95,path([-27,-34],[-18,-38,-12,-51,-6,-55],[-12,-43,-18,-35,-27,-34])],
  [4,.76,path([-14,-54],[-5,-63,1,-69,10,-69],[3,-70,-4,-65,-7,-64],[-9,-60,-13,-59,-14,-54])],
  [0,.86,path([-46,-6],[-26,-11,-12,-23,-8,-38],[-7,-25,-21,-10,-46,-6])],
  [2,.82,path([-29,-57],[-20,-60,-14,-57,-7,-64],[-15,-60,-20,-62,-29,-57])],
];
const surge = path([-67,1],[-48,0,-27,-10,-8,-8],[9,-8,16,-1,39,-3],
  [50,-3,54,-4,61,-5],[55,-1,49,0,35,1],[44,1,54,0,62,1],[44,4,20,5,6,3],[-17,-1,-38,5,-67,1]);
const shoal = path([-48,4],[-31,4,-21,0,-10,0],[5,-1,19,6,34,4],[23,8,8,8,-5,5],[-22,2,-32,7,-48,4]);
const swept = path([-67,1],[-53,0,-46,-3,-30,-3],[-43,-3,-49,2,-67,1]);
const waveLip = path([-19,-40],[-8,-56,5,-73,19,-69],[32,-65,36,-53,27,-44],
  [29,-51,29,-58,21,-60],[12,-63,8,-59,3,-52],[-1,-47,-5,-39,-8,-31],[-9,-43,-4,-52,2,-58],[-6,-54,-11,-45,-19,-40]);
const lock = path([-33,-52],[-25,-51,-20,-57,-17,-62],[-11,-71,-5,-76,2,-77],
  [-2,-74,-5,-69,-9,-66],[-7,-67,-4,-66,-2,-66],[-13,-63,-20,-49,-33,-52]);
// Match by distance around each closed contour, not control-point count. The tip
// changes from a breaking lip into a brow/muzzle without ever crossfading two heads.
function sample(loop, n) {
  const pts=[...loop,loop[0]], d=[0];
  for (let j=1;j<pts.length;j++) d.push(d[j-1]+Math.hypot(pts[j][0]-pts[j-1][0],pts[j][1]-pts[j-1][1]));
  let j=1;
  return Array.from({length:n},(_,i) => {
    const v=i*d.at(-1)/n;
    while (d[j]<v) j++;
    const u=(v-d[j-1])/(d[j]-d[j-1] || 1);
    return [lerp(pts[j-1][0],pts[j][0],u),lerp(pts[j-1][1],pts[j][1],u)];
  });
}
const lip=sample(waveLip,156), face=sample(brow,156);
const ribbons = [
  // A lower breaker appears inside the curl. Its broken return runs under both knees.
  [3,.54,path([-60,1],[-46,-3,-35,-5,-28,-11],[-17,-24,-1,-20,-1,-12],[-3,-16,-9,-17,-14,-14],[-20,-8,-25,-4,-32,-3],[-43,0,-49,-1,-60,1])],
  [3,.68,path([-26,-8],[-16,-15,-2,-14,6,-11],[16,-7,23,-8,29,-11],[23,-5,14,-5,3,-9],[-6,-12,-14,-12,-26,-8])],
  [2,.72,path([-77,-2],[-64,-3,-59,-7,-54,-12],[-52,-14,-48,-15,-45,-14],[-54,-15,-54,-6,-65,-4],[-71,-2,-74,-3,-77,-2])],
  [4,.84,path([-51,-7],[-39,-11,-34,-16,-28,-19],[-33,-15,-36,-11,-41,-9],[-45,-8,-48,-7,-51,-7])],
  [2,.82,path([-51,-19],[-43,-16,-37,-22,-29,-27],[-32,-23,-36,-18,-41,-17],[-45,-15,-48,-17,-51,-19])],
  [4,.76,path([-37,-29],[-27,-28,-23,-35,-20,-39],[-24,-31,-28,-26,-37,-29])],
  [3,.91,path([-39,-44],[-34,-49,-28,-52,-23,-51],[-17,-50,-13,-55,-11,-58],[-18,-46,-24,-51,-29,-49],[-33,-49,-34,-47,-39,-44])],
  [1,.82,path([-30,-49],[-21,-53,-19,-50,-13,-57],[-18,-49,-22,-52,-30,-49])],
];
const cheek = path([18,-59],[16,-55,17,-50,23,-49],[26,-48,29,-49,30,-50],[25,-48,19,-51,18,-59]);
const jets = [path([-18,0],[-4,-1,8,-15,15,-15],[12,-12,10,-9,12,-9],[16,-10,18,-12,20,-12],[12,-6,1,0,-18,0]),
  path([9,0],[22,-2,30,-10,38,-9],[44,-8,47,-13,50,-14],[44,-4,42,-8,37,-7],[29,-4,22,1,9,0])];
const spray = [[5,-12,18,-24,2.0], [17,-11,28,-15,1.3], [-20,-13,-15,-19,1.6], [22,-12,35,-24,1.1], [-25,-9,-23,-8,1.1]];

export function draw(p,t,o) {
  if (t <= 0 || t >= meta.duration) return;
  const C = fit(o.palette,6), {swell,reveal,crest,step,slap,lastLock} = cues;
  const arrival = smooth(0,.20,t), rise = smooth(swell,crest,t), fall = smooth(step,slap,t);
  const dry = smooth(1.04,meta.duration,t), show = smooth(reveal,crest-.03,t)*(1-smooth(step+.04,slap,t));
  const drift = -29 + 34*smooth(0,crest,t) + 22*smooth(step,1.10,t) + 14*dry;
  const broad = .51 + .48*arrival + .08*fall;
  const tall = (.18*arrival + .82*rise)*(1-.977*fall);
  const plant = smooth(step,.88,t), lean = 11*(1-rise) + 23*fall;
  const map = (x,y) => [drift+x*broad+lean*(-y/72), y*tall + 1.6*Math.sin(x*.049+o.seed)*fall];
  const open = smooth(reveal,crest-.03,t);
  const foot = (x,y) => {
    const k=smooth(-3,32,x)*smooth(-34,-8,y);
    return map(x-7*(1-open)+10*k*plant, y*(.24+.76*open)+13*k*plant);
  };
  const wet = arrival*(1-dry);
  // Under-current moves on after contact; the body collapses into that same mark.
  const floor = (x,y) => [drift + x*(.45+.50*arrival+.06*fall)*(1-.58*dry), y*(.33+.67*arrival)*(1-.8*dry)];
  wash(p,shoal,floor,C[3],wet*.53);
  wash(p,surge,floor,C[1],wet*(1-.66*dry)*.95);
  wash(p,swept,floor,C[4],wet*.78);
  const standing = wet*(1-smooth(.98,1.18,t));
  wash(p,farWash,map,C[3],standing*.60);
  wash(p,body,map,C[1],standing);
  for (const [c,a,form] of striae) wash(p,form,map,C[c],a*standing);
  for (const [c,a,form] of ribbons) wash(p,form,map,C[c],a*standing);
  const horse=open*(1-smooth(step+.035,slap-.02,t));
  const crown=horse<1e-7 ? waveLip : horse>1-1e-7 ? brow : lip.map(([x,y],i) => [lerp(x,face[i][0],horse),lerp(y,face[i][1],horse)]);
  wash(p,crown,map,C[0],standing);
  wash(p,shoulder,map,C[2],show*.78);
  const chin=(x,y) => map(lerp(20,x,open),lerp(-48,y,open));
  wash(p,jaw,chin,C[1],show); wash(p,cheek,chin,C[3],show*.72);
  wash(p,farLeg,foot,C[3],show*.91); wash(p,nearLeg,foot,C[0],show);
  wash(p,eye,map,C[0],show); wash(p,nose,map,C[0],show); wash(p,ear,map,C[4],show*.82);
  // This one tuft is carried by the receding sheet, not by the collapsing neck.
  const fly = (x,y) => {
    const root=smooth(-32,2,x), lag=smooth(.86-.085*root,lastLock-.10*root,t);
    return [drift+x*broad+16*lag+2*rise, y*(.10*arrival+.90*rise)*(1-.98*lag)+4*rise*(1-lag)];
  };
  wash(p,lock,fly,C[2],wet*(1-smooth(lastLock,1.20,t))*.90);
  // Separate a few tips at the rising crest, then throw a new fan off the landing.
  const wind=smooth(.27,.53,t)*(1-smooth(.74,.91,t));
  for (const [i,[x,y,r]] of [[-24,-58,1.6],[-37,-46,1.1],[-7,-73,1.1],[32,-37,.93]].entries()) {
    if (!wind) break;
    const [cx,cy]=map(x-4*rise+2*rand(o.seed,i),y-5*wind);
    bead(p,cx,cy,wind*r,wind*(r+1.75),.90,C,i+o.seed,wind*.84);
  }
  for (const [i,jet] of jets.entries()) {
    const u=clamp((t-slap+.045-i*.025)/(.24+.055*i)), lift=4*u*(1-u);
    const cast=(x,y) => [24+x*(.52+.54*u)+12*u, y*lift];
    wash(p,jet,cast,C[i+1],lift*(1-u*u));
  }
  for (const [i,[x,y,dx,dy,r]] of spray.entries()) {
    const u = clamp((t-(slap-.035)-i*.009)/(.26+.04*rand(o.seed,i)));
    if (u <= 0 || u >= 1) continue;
    const h = 4*u*(1-u), k = (1-u*u)*smooth(0,.15,u);
    bead(p,25+x+dx*u,y*.15+dy*h,r*.77*k,r*2.05*k,dx>0 ? .9-.5*u : -.8+.4*u,C,i+o.seed,1-u*u);
  }
}
