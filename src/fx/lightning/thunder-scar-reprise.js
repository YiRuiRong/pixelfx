import { clamp, fit, lerp, rng, smooth } from "../../core/index.js";
import { polygon } from "../_comic.js";
import { STEEL, WINE } from "../melee/_sword-scar.js";

const FPS = 24;
const FRAMES = 42;
const LAST_FRAME = FRAMES - 1;
const IMPACT = 8, RETURN_STROKE = 20, RETURN_APEX = 24;

export const sourceUrl = import.meta.url;
export const cues = { impact: IMPACT, returnStroke: RETURN_STROKE, returnApex: RETURN_APEX };
export const meta = {
  name: "Thunder scar: Reprise",
  desc: "A cold bolt splits the ground. The wine-red scar kindles, sending a white edge back up the same path and lifting a graphite lip at each bend.",
  tags: ["lightning", "scar", "noir", "rift", "impact", "ground", "one-shot"],
  size: [232, 264], origin: [116, 238], fps: FPS, frameCount: FRAMES, duration: FRAMES / FPS,
  loop: false, bg: "dark", cueFrames: cues,
  options: { palette: STEEL, rift: WINE, seed: 67 },
};

const point=(a,b,t)=>[lerp(a[0],b[0],t),lerp(a[1],b[1],t)];
function curve(keys,t) {
  if(t<=keys[0][0]) return keys[0][1];
  for(let i=1;i<keys.length;i++) if(t<=keys[i][0]) return lerp(keys[i-1][1], keys[i][1],(t-keys[i-1][0])/(keys[i][0]-keys[i-1][0]));
  return keys.at(-1)[1];
}
function withAlpha(p,alpha,fn) {
  if(alpha<=.009) return;
  const saved=p.fade; p.fade=saved*clamp(alpha); fn(); p.fade=saved;
}
// Measure distance along the channel so the return follows every corner of the first strike.
function spine(points) {
  const d=[0];
  for(let i=1;i<points.length;i++) d.push(d[i-1]+Math.hypot(points[i][0]-points[i-1][0],points[i][1]-points[i-1][1]));
  const total=d.at(-1), ends=d.map(v=>v/total), stations=[0];
  for(let i=1;i<points.length;i++){
    const n=Math.ceil((d[i]-d[i-1])/4);
    for(let j=1;j<=n;j++) stations.push(lerp(ends[i-1],ends[i],j/n));
  }
  const normal=points.slice(1).map(([x,y],i)=>{const dx=x-points[i][0],dy=y-points[i][1],l=Math.hypot(dx,dy);return [-dy/l, dx/l];});
  const verts=points.map((q,i)=>{
    if(i===0) return normal[0]; if(i===points.length-1) return normal.at(-1);
    const a=normal[i-1], b=normal[i], dot=a[0]*b[0]+a[1]*b[1];
    const den=Math.max(.5,1+dot);
    return [(a[0]+b[0])/den,(a[1]+b[1])/den];
  });
  function pos(u,offset=0) {
    u=clamp(u); let i=1;
    while(i<ends.length-1&&u>ends[i]) i++;
    const k=(u-ends[i-1])/(ends[i]-ends[i-1]),v=point(points[i-1],points[i],k);
    if(!offset) return v;
    const edge=normal[i-1],distance=(ends[i]-ends[i-1])*total;
    const nearStart=clamp(1-k*distance/5),nearEnd=clamp(1-(1-k)*distance/5);
    return [v[0]+offset*(edge[0]+(verts[i-1][0]-edge[0])*nearStart+(verts[i][0]-edge[0])*nearEnd),
      v[1]+offset*(edge[1]+(verts[i-1][1]-edge[1])*nearStart+(verts[i][1]-edge[1])*nearEnd)];
  }
  return {ends,stations,pos,total};
}
// All coordinates are relative to the flash on the ground, at (0, 0).
const main=spine([[28,-220],[12,-195],[15,-187],[-7,-170],[-21,-150],[-31,-142],[-43,-122],[-22,-127],[-6,-135],[-17,-109],[-13,-101],[-28,-80],[-35,-60],[-18,-66],[-8,-74],[-12,-50],[-5,-42],[-7,-24],[-2,-15],[0,0]]);
const forks=[
  {p:spine([[-7,-170],[9,-164],[19,-150],[30,-148],[27,-142],[49,-131],[57,-117]]), junction:main.ends[3],weight:1},
  {p:spine([[30,-148],[40,-154],[52,-152],[60,-155]]),junction:main.ends[3]+.06,weight:.57},
  {p:spine([[-28,-80],[-45,-72],[-53,-74],[-64,-63],[-76,-58]]),junction:main.ends[11],weight:.78}
];
const earth=spine([[-51,8],[-37,6],[-22,2],[-13,3],[0,0],[13,-2],[21,-1.5],[33,-5],[44,-5.5]]);
const root=earth.ends[4];
const spur=spine([[0,0],[8,4],[15,4],[24,9]]);
function band(p,path,lo,hi,left,right,color) {
  lo=clamp(lo);hi=clamp(hi);if(hi-lo<.0005)return;
  const us=[lo,...path.stations.filter(u=>u>lo+.00001&&u<hi-.00001),hi];
  const side=(u,offset)=>path.pos(u,typeof offset==='number'?offset:offset(u));
  polygon(p,[...us.map(u=>side(u,left)),...us.slice().reverse().map(u=>side(u,right))],color);
}
function ribbon(p,path,lo,hi,w,color,bias=0){
  if(hi<=lo||w<=.02)return;
  const rad=u=>w*(.10+.90*Math.sin(clamp((u-lo)/(hi-lo))*Math.PI)**.7);
  band(p,path,lo,hi,u=>bias-rad(u),u=>bias+rad(u),color);
}
const span=[[0,0],[.052,.30],[.12,.57],[.18,.64],[.22,.89],[.26,.81],[.30,1.04],[.34,.45],[.39,.62],[.43,.33],[.49,.72],[.56,.57],[.61,.82],[.65,.73],[.70,.36],[.77,.68],[.83,.46],[.90,.47],[.97,.28],[1,.07]];
const tear=[[0,0],[.10,.34],[.18,.55],[.23,.91],[.25,.51],[.294,1],[.302,.67],[.342,.39],[.38,.52],[.39,.21],[.45,.58],[.50,.21],[.58,.87],[.60,.45],[.64,.65],[.68,.21],[.77,.72],[.78,.37],[.85,.54],[.93,.26],[1,0]];
function aperture(u,frame) {
  const first=6.7+1.3*u, second=RETURN_STROKE+4*(1-u);
  const open=(start,scale,hold)=>scale*smooth(start-.6,start+.8,frame)*(1-smooth(start+hold,start+hold+3,frame));
  return Math.max(open(first,frame<IMPACT?.22:.96,3+u),open(second,1.10,3.5+(1-u)*.8));
}
function dimensions(u,frame){return (1+9*curve(span,u))*aperture(u,frame);}
// The graphite fracture lifts only where a stroke has passed.
function drawFlap(p,frame,steel,from,to,peak) {
  const vertex=(u,h)=>{const s=lerp(from,to,u);return main.pos(s,h*peak*aperture(s,frame));};
  const face=(pts,c)=>polygon(p,pts.map(([t,h])=>vertex(t,h)),c);
  if(aperture((from+to)/2,frame)<.055)return;
  face([[0,.13],[.20,.40],[.36,.86],[.54,.99],[.69,1.45],[.61,.87],[.80,1.07],[.72,.73],[.88,.82],[.79,.51],[1,.13],[.56,.28],[.24,.12]],steel[0]);
  face([[.05,.18],[.31,.70],[.44,.82],[.68,1.36],[.54,.76],[.31,.39]],steel[3]);
  face([[.18,.35],[.35,.72],[.45,.85],[.63,1.21],[.48,.79]],steel[4]);
  face([[.36,.74],[.48,.91],[.64,1.24],[.49,.89]],steel[5]);
  face([[.34,.38],[.55,.79],[.75,.99],[.64,.67],[.83,.77],[.68,.48],[.52,.38]],steel[2]);
  face([[.49,.36],[.63,.66],[.70,.67],[.61,.50],[.80,.62],[.70,.39]],steel[3]);
  face([[.31,.45],[.49,.75],[.52,.77],[.38,.54]],steel[2]);
}
function openChannel(p,frame,steel,wine) {
  if(frame<7||frame>32||(frame>=15&&frame<RETURN_STROKE))return;
  const W=u=>dimensions(u,frame),ridge=u=>(.65+.62*curve(tear,u))*W(u);
  band(p,main,0,1,u=>-W(u)*.66,u=>ridge(u)+W(u)*.08,steel[0]);
  band(p,main,.012,.995,u=>W(u)*.16,ridge,steel[2]);
  band(p,main,.018,.993,u=>W(u)*.17,u=>W(u)*.37,steel[4]);
  band(p,main,.015,.988,u=>-W(u)*.66,u=>-W(u)*.39,steel[2]);
  band(p,main,.025,.978,u=>-W(u)*.45,u=>-W(u)*.30,wine[2]);
  band(p,main,.06,.95,u=>W(u)*.025,u=>W(u)*.15,wine[1]);
  for(const [a,b,crest] of [[.05,.16,.66],[.16,.26,.85],[.30,.37,.78],[.41,.49,.73],[.54,.64,.88],[.65,.73,.6],[.77,.86,.8],[.875,.963,.61]]){
    const m=lerp(a,b,.70);
    const between=(u,start,mid,end)=>u<m?lerp(start,mid,(u-a)/(m-a)):lerp(mid,end,(u-m)/(b-m));
    band(p,main,a,b,u=>W(u)*between(u,.25,.31,.44),u=>W(u)*between(u,.25,crest,.44),steel[3]);
    band(p,main,m,b,u=>W(u)*lerp(crest,.44,(u-m)/(b-m)),u=>W(u)*lerp(crest-.16,.44,(u-m)/(b-m)),steel[4]);
    band(p,main,a,b,u=>W(u)*between(u,-.49,-.62,-.43),u=>W(u)*between(u,-.49,-.48,-.43),steel[3]);
  }
  drawFlap(p,frame,steel,main.ends[2],main.ends[6],20);
  drawFlap(p,frame,steel,main.ends[10],main.ends[12],10);
}
const leaderSteps=[0,.045,.19,.295,.295,.59,.76,.928];
function branches(p,frame,steel,wine) {
  for(const {p:q,junction,weight} of forks) {
    const reach=frame<IMPACT?leaderSteps[frame]:1;
    const pre=smooth(junction+.012,junction+.27,reach);
    if(q===forks[1].p&&frame<IMPACT&&reach<.55)continue;
    if(pre<.01)continue;
    const strike=curve([[1,.16],[7,.44],[8,1],[9,.7],[11,.28],[15,.06],[18,0]],frame);
    const t=RETURN_STROKE+4*(1-junction),echo=smooth(t-.45,t+.25,frame)*(1-smooth(t+.5,t+3,frame));
    const power=Math.max(strike,echo*.78);
    if(power<.015)continue;
    withAlpha(p,power,()=>{
      ribbon(p,q,0,pre,1.55*weight,steel[1]);
      ribbon(p,q,.02,pre,.89*weight,steel[4]);
      if(power>.62){ribbon(p,q,.08,.65*pre,.61*weight,steel[5]);ribbon(p,q,.4*pre,.9*pre,.43*weight,wine[3],.7);}
    });
  }
}
function sleeping(p,frame,steel) {
  if(frame<IMPACT)return;
  const fade=curve([[8,1],[12,.9],[15,.65],[19,.8],[24,1],[29,.86],[33,.46],[38,0]],frame);
  const trim=clamp((frame-28)/12);
  withAlpha(p,fade,()=>{
    band(p,main,trim*.79,1-trim*.08,-1,1.15,steel[1]);
    band(p,main,trim*.79,1-trim*.08,.05,.95,steel[3]);
  });
}
function leader(p,frame,steel,wine) {
  if(frame<=0||frame>=IMPACT)return;
  const tip=leaderSteps[frame], base=[0,1,2,3.1,4.5,6,8,10][frame];
  ribbon(p,main,0,tip,1.37,steel[1]);
  band(p,main,0,tip,-.34,.45,steel[3]);
  ribbon(p,main,Math.max(0,tip-.115),tip,.82,steel[5]);
  const [x,y]=main.pos(tip);p.glow(x,y,5,steel[4],.14);
  polygon(p,[[-1,0],[-1.35,-base*.47],[.8,-base],[.8,-2],[3,.2]],wine[3]);
  if(frame>=5) polygon(p,[[.2,-base],[1.0,-base-2.8],[1.0,-base*.57]],wine[4]);
  p.glow(0,-2,7+base*.44,wine[3],.11+frame*.018);
}
function flash(p,frame,steel,wine) {
  if(frame===IMPACT||frame===9) {
    const strength=frame===IMPACT?1:.5;
    withAlpha(p,strength,()=>{
      band(p,main,.012,1,-1.48,.24,steel[5]);
      ribbon(p,main,.52,1,1.65,steel[6],-.48);
      ribbon(p,main,.18,.32,.8,steel[6],-.50);
      const [x,y]=main.pos(.95);p.glowLine(x,y,0,0,10,steel[5],.29);
    });
  }
  if(frame<RETURN_STROKE||frame>25)return;
  const head=[.96,.75,.48,.23,.015,0][frame-RETURN_STROKE],trail=[.08,.24,.28,.30,.31,.16][frame-RETURN_STROKE];
  const end=Math.min(1,head+trail),tailEnd=Math.min(1,end+.09);
  ribbon(p,main,head,tailEnd,3.34,steel[0],-.59);
  ribbon(p,main,head,tailEnd,2.73,steel[3],-.65);
  ribbon(p,main,head,end,2.25,steel[5],-.8);
  ribbon(p,main,head,Math.min(1,head+trail*.79),1.52,steel[6],-.73);
  const [x,y]=main.pos(head);p.glow(x,y,12,steel[5],.34);
  const [tx,ty]=main.pos(Math.min(1,head+.07));p.glowLine(x,y,tx,ty,4.5,steel[5],.24);
}
function tornGround(p,frame,fade,steel,wine) {
  const breath=curve([[1,0],[7,.06],[8,.91],[9,1],[11,.79],[14,.18],[18,.16],[20,.71],[22,.21],[29,.06],[38,0]],frame);
  if(breath<.025)return;
  const layer=(points,color)=>polygon(p,points.map(([x,y,h])=>[x,y+h*breath]),color);
  withAlpha(p,fade,()=>{
    layer([[-33,5,0],[-20,2.3,-.1],[-14,3,-1.4],[-8,1.5,-3.1],[-3,.5,-2.9],[3,-.4,-2.2],[14,-1.9,-1.1],[21,-1.5,0],[9,-1.1,3.5],[4,-.4,3.0],[-3,1.1,4.0],[-10,1.6,2.5],[-23,4,1.5]],steel[0]);
    layer([[-31,4.9,0],[-20,2.5,-1.2],[-15,3,-1.5],[-8,1.7,-3.1],[-1,.2,-3.6],[-4,.5,-1.6],[-13,2.5,-.2],[-18,2.9,.3]],steel[3]);
    layer([[-22,3.0,0],[-9,1.7,-2.8],[-4,.8,-2.7],[-10,2.0,-1.6]],steel[4]);
    layer([[-14,3,.8],[-2,.4,.3],[12,-1.7,.1],[18,-1.8,-.3],[6,-.9,1.5],[-2,.7,2.0]],wine[2]);
    layer([[-8,1.6,2.1],[-1,.4,2.8],[10,-1.3,1.3],[15,-1.9,.1],[10,-.9,3.6],[4,-.3,4.0],[-2,1.2,4.1]],steel[2]);
    layer([[0,.5,3.5],[9,-1,2.1],[13,-1.5,1],[8,-.7,2.9]],steel[4]);
  });
}
// Embers on the ground run inward before the return stroke lifts off.
function converge(p,frame,steel,wine) {
  if(frame<15||frame>20)return;
  const k=curve([[15,.08],[16,.21],[17,.40],[18,.60],[19,1],[20,.58]],frame);
  const climb=.12*k*k;
  ribbon(p,main,1-climb,1,1.25*k,wine[2],-.50);
  ribbon(p,main,1-climb*.64,1,1.0*k,wine[3],-.45);
  polygon(p,[[-2*k,0],[.55*k,-4*k],[1*k,-11*k],[2.3*k,-5*k],[2.8*k,-1.5*k],[5*k,-1.4*k],[1*k,.9*k]],wine[3]);
  if(k>.3)polygon(p,[[.85*k,-10.8*k],[1.2*k,-13*k],[1.65*k,-5*k]],wine[4]);
  for(const [x,y,side] of [[-29,4,1],[23,-3,-1]]){
    const a=(frame-15)/5,px=lerp(x,0,a),py=lerp(y,0,a);
    withAlpha(p,k*.83,()=>{sliver(p,px-3*side,py+.55,6*side,-.45,1.0,steel,1);});
  }
  p.glow(0,-2,10,wine[3],k*.28);
}
function soil(p,frame,steel,wine) {
  if(frame<=0||frame>=LAST_FRAME)return;
  const extent=curve([[0,0],[2,.17],[7,.35],[8,.81],[10,1],[29,1],[37,.71],[41,.08]],frame);
  const a=root*(1-extent),b=root+(1-root)*extent;
  const fade=curve([[0,0],[2,.72],[8,1],[34,.8],[40,.22],[41,0]],frame);
  const burst=curve([[0,0],[7,.12],[8,1],[9,.90],[12,.22],[15,.05],[19,.18],[20,.62],[22,.13],[28,0]],frame);
  const hot=curve([[0,0],[5,.4],[8,1],[9,.84],[12,.14],[14,.12],[17,.44],[19,.94],[20,.75],[22,.21],[26,.12],[31,0]],frame);
  withAlpha(p,fade,()=>{
    ribbon(p,earth,a,b,1.55+burst*2.75,steel[0]);
    ribbon(p,earth,a,b,.80+burst*.98,steel[3],-.9);
    ribbon(p,earth,a,b,.9+burst*1.05,steel[1]);
    if(hot>.04) withAlpha(p,hot,()=>{
      const reach=frame<14?extent*.89:curve([[14,.12],[17,.35],[19,.63],[20,.41],[22,.19]],frame);
      ribbon(p,earth,root-root*reach,root+(1-root)*reach,1.1+hot*.5,wine[3]);
      ribbon(p,earth,root-.07,root+.072,1.4,wine[4]);
      p.glow(0,-.5,8+hot*8,wine[3],.26*hot);
    });
    if(frame>=IMPACT)withAlpha(p,Math.max(.13,burst*.83),()=>ribbon(p,spur,0,Math.min(1,(frame-7)/3),1.25,steel[3]));
    tornGround(p,frame,fade,steel,wine);
    converge(p,frame,steel,wine);
  });
}
function sliver(p,x,y,dx,dy,half,steel,bright=1) {
  const len=Math.hypot(dx,dy);if(len<.25)return;
  const nx=-dy/len*half,ny=dx/len*half;
  const A=[x,y],B=[x+dx,y+dy],J=[x+dx*.38+nx,y+dy*.38+ny],K=[x+dx*.62-nx,y+dy*.62-ny];
  polygon(p,[A,J,B,K],steel[2]);polygon(p,[A,J,B],steel[bright?5:3]);
  if(bright>1)polygon(p,[A,[x+dx*.33+nx*.62,y+dy*.33+ny*.62],B],steel[6]);
}
function contact(p,frame,steel,wine) {
  const kick=curve([[7,0],[8,1],[9,.66],[10,.28],[11,0],[19,0],[20,.67],[21,.24],[22,0]],frame);
  if(kick<=0)return;
  if(frame>=RETURN_STROKE) {
    polygon(p,[[-2.6*kick,0],[-.2,-5*kick],[-1,-21*kick],[1,-11.8*kick],[1.6,-5*kick],[3.2*kick,-1]],steel[5]);
    polygon(p,[[.1,0],[-.45,-15*kick],[1,-7*kick],[1.8,-.8]],steel[6]);
    p.glow(0,-4,11,steel[5],kick*.31);p.glowLine(-.8,-5,.2,-16,5,steel[4],kick*.18);return;
  }
  const fin=(x,y,dx,dy,sw)=>{
    const tip=[x+dx*kick,y+dy*kick],lip=[x+dx*.36*kick-sw*kick,y+dy*.35*kick],ridge=[x+dx*.36*kick+sw*.60*kick,y+dy*.41*kick];
    polygon(p,[[x,y],lip,tip,ridge],steel[2]);polygon(p,[lip,tip,ridge],steel[4]);polygon(p,[[x,y],ridge,tip],steel[5]);
  };
  fin(-3,.8,-19,-15,2.6);fin(1,.1,11,-17,1.9);
  withAlpha(p,kick,()=>{
    sliver(p,-1,1,-33*kick,-3.8*kick,1.7*kick,steel,2);
    sliver(p,0,.1,26*kick,-7.5*kick,1.6*kick,steel,2);
    sliver(p,-1,1,-13*kick,-17*kick,1.6*kick,steel,1);
    sliver(p,.25,.8,15*kick,-14*kick,1.24*kick,steel,1);
    sliver(p,-2,1,-21*kick,3.8*kick,1.32*kick,steel,0);
    polygon(p,[[-5*kick,1],[.1,-4.5*kick],[6.5*kick,-1.4],[.2,1.8*kick]],steel[6]);
    p.glow(0,-1,19*kick,steel[5],.36*kick);p.glow(0,1,22*kick,wine[2],.15*kick);
  });
}
// Thin pieces break off the raised bank just after each pulse.
function peel(p,frame,steel,wine,seed){
  const poses=[[9,-7,-1,-1,1,8.7],[10,4,.3,1,.69,6.0],[22,-31,-86,-1,.75,7.2],[24,-42,-147,-1,.70,7.8]];
  for(const [i,[start,bx,by,side,k,length]] of poses.entries()){
    const age=frame-start,life=8+i%2;
    if(age<0||age>=life)continue;
    const rr=rng(seed,340+i),flight=1-Math.exp(-age*.24);
    const x=bx+side*(7+rr.range(16,24)*flight)*k,y=by-(4+rr.range(17,25)*flight)*k+.13*age*age;
    const angle=(side>0?-.56:-2.62)+side*.15*age;
    const scale=(1-.42*age/life)*k,c=Math.cos(angle),s=Math.sin(angle);
    const pt=(a,b)=>[x+scale*(a*c-b*s),y+scale*(a*s+b*c)];
    withAlpha(p,1-smooth(life-3,life,age),()=>{
      const a=pt(-length*.48,.1), b=pt(length*.12,-1.5), t=pt(length*.57,-.1), d=pt(-length*.16,2.2);
      polygon(p,[a,b,t,d],steel[1]);polygon(p,[a,b,t],steel[age<3?5:4]);polygon(p,[a,t,d],steel[2]);
      if(age<3)polygon(p,[a,pt(length*.08,.52),t],wine[2]);
    });
  }
}
function debris(p,frame,steel,seed){
  const banks=[
    [8,0,0, [-1,1,-1,1,1,-1], 1],
    [9,...main.pos(.28), [-1,1,-1], .86],
    [22,...main.pos(.56), [-1,1], .61],
    [24,...main.pos(.22), [-1,1,-1,1], .96]
  ];
  for(let j=0;j<banks.length;j++){
    const [start,bx,by,sides,scale]=banks[j];
    for(let i=0;i<sides.length;i++){
      const r=rng(seed+89*j,i+51),side=sides[i],age=frame-start-(i%3)*.62,life=r.range(5.8,11);
      if(age<=0||age>=life)continue;
      const vx=r.range(2.5,6)*side*scale,vy=r.range(2.5,6.3)*scale;
      const q=1-Math.exp(-age*.155);
      const x=bx+vx*5.6*q,y=by-vy*5.8*q+.115*age*age;
      const len=r.range(5,10.5)*scale*(1-.51*age/life);
      const angle=Math.atan2(-vy,vx)+side*(.10+r.range(.025,.125))*age;
      withAlpha(p,1-smooth(life-3.4,life,age),()=>sliver(p,x,y,Math.cos(angle)*len,Math.sin(angle)*len,r.range(.64,1.64)*scale,steel,age<3?1:0));
    }
  }
}

function frameAt(time) {
  return Math.floor(time * FPS + 1e-6);
}

export function drawBack(p, time, options) {
  const frame = frameAt(time);
  if (frame <= 0 || frame >= LAST_FRAME) return;
  const steel = fit(options.palette, 7), wine = fit(options.rift, 5);
  branches(p, frame, steel, wine);
  sleeping(p, frame, steel);
  soil(p, frame, steel, wine);
}

export function draw(p, time, options) {
  const frame = frameAt(time);
  if (frame <= 0 || frame >= LAST_FRAME) return;
  const steel = fit(options.palette, 7), wine = fit(options.rift, 5);
  leader(p, frame, steel, wine);
  openChannel(p, frame, steel, wine);
  flash(p, frame, steel, wine);
  contact(p, frame, steel, wine);
  debris(p, frame, steel, options.seed);
  peel(p, frame, steel, wine, options.seed);
}
