#!/usr/bin/env node
// Verify the drawings, not just their cue metadata. Add --exports after packaging.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { createFrame, createFx, hex } from "../src/core/index.js";
import { effects } from "../src/fx/index.js";
import zh from "../gallery/locales/zh-CN-effects.js";
import { encodePNG } from "./lib/png.mjs";
import { ROOT, loadEffect, renderFrames } from "./lib/fxlib.mjs";

const ids = ["water/white-horse-breaker","lightning/thunder-under-ink","arcane/empty-mountain-echo"];
const [horse,pool,bell]=ids.map(id=>effects[id]);
function paint(mod,t,opts={},pad=0,underlay=false) {
  const [w,h]=mod.meta.size, [ox,oy]=mod.meta.origin, frame=createFrame(w+2*pad,h+2*pad,-pad,-pad);
  if (underlay) for (let i=0;i<frame.color.length;i++) frame.color[i]=pattern(i,frame.w);
  const fx=createFx(mod,{x:opts.flip ? w-ox : ox,y:oy,...opts});
  fx.update(t); fx.draw(frame); return frame;
}
const inks=[hex("#193747")>>>0,hex("#bd9264")>>>0];
const pattern=(i,w) => inks[((Math.floor((i%w)/3) + Math.floor(i/w/2))%2)];
const at=(f,x,y) => f.color[y*f.w+x]>>>24;
function compare(a,b,mirror,w,label) {
  for (let i=0;i<a.length;i++) {
    const j=mirror ? i+w-1-2*(i%w) : i, c=a[i], d=b[j];
    if (c===d) continue;
    const ca=c>>>24, da=d>>>24;
    assert.ok(Math.abs(ca-da)<=2,`${label}: alpha at ${i} (${ca}/${da})`);
    for (const k of [0,8,16]) assert.ok(Math.abs(((c>>>k)&255)*ca-((d>>>k)&255)*da)<=510,`${label}: colour at ${i}`);
  }
}
function bounds(f,x0=0,y0=0,x1=f.w,y1=f.h) {
  let l=f.w,r=-1,top=f.h,b=-1,n=0;
  for (let y=y0;y<y1;y++) for(let x=x0;x<x1;x++) if(at(f,x,y)>16) {
    l=Math.min(l,x);r=Math.max(r,x);top=Math.min(top,y);b=Math.max(b,y);n++;
  }
  return {l,r,top,b,n};
}
for (const [k,id] of ids.entries()) {
  const mod=effects[id], m=mod.meta, [w,h]=m.size, [ox,oy]=m.origin;
  assert.equal(zh[id][0],["白马拍岸","墨池藏雷","空山回钟"][k]);
  assert.ok(!m.actor && !mod.act && !m.loop && m.tags.includes('ink-studies'));
  assert.equal(m.fps,50);
  const peak=[.70,.60,.64][k], base=paint(mod,peak), n=Math.round(m.duration*m.fps);
  assert.ok(base.color.some(c=>(c>>>24)>8&&(c>>>24)<240),'must contain translucent pigment');
  assert.equal(bounds(paint(mod,0)).n,0); assert.ok(paint(mod,m.duration).color.every(c=>!c));
  assert.notDeepEqual(base.color,paint(mod,peak,{palette:['#524','#e9b']}).color);
  assert.notDeepEqual(base.color,paint(mod,peak,{seed:100}).color);
  assert.deepEqual(base.color,paint(mod,peak).color);
  const stepper=createFx(mod,{x:ox,y:oy}), step=createFrame(w,h);
  for (let i=0;i<=n;i++) {
    if (i) stepper.update(1/m.fps);
    step.color.fill(0); step.light.fill(0); stepper.draw(step);
    const t=i/m.fps, live=paint(mod,t), left=paint(mod,t,{flip:true});
    assert.ok(live.light.every(v=>v===0),`${id} glow on frame ${i}`);
    compare(step.color,live.color,false,w,`${id} seek ${i}`);
    compare(live.color,left.color,true,w,`${id} mirror ${i}`);
    // Expanded viewport catches a clipped pool tongue or last strand, even in variants.
    for (const seed of [2,85]) {
      const pad=12, f=paint(mod,t,{seed},pad);
      for (let y=0;y<f.h;y++) for (let x=0;x<f.w;x++) {
        if (x===pad && y>=pad && y<pad+h) x+=w;
        assert.equal(f.color[y*f.w+x],0,`${id} seed ${seed} frame ${i}: clipped at ${x-pad},${y-pad}`);
      }
    }
  }
  console.log(`ok ${id}: ${n+1} frames, bounds, mirror, seek, palette, seed, transparent endpoints`);
}
// At the crest, probe the open neck and BOTH knees, with painted neighbours on each side.
const crest=paint(horse,.70), [hx,hy]=horse.meta.origin;
for (const [y,left,gap,right] of [[-37,2,10,18],[-23,4,8,12],[-23,20,27,33]]) {
  assert.ok(at(crest,hx+left,hy+y)>64 && at(crest,hx+right,hy+y)>64);
  assert.equal(at(crest,hx+gap,hy+y),0);
}
assert.ok(bounds(paint(horse,.20)).top>hy-25 && bounds(crest).top<hy-75);
const late=paint(horse,.98);
assert.ok(bounds(late).top>hy-38 && bounds(late,hx-10,hy-32,hx+14,hy-23).n>5,'one lock still in the air');
assert.equal(bounds(paint(horse,1.12),hx-10,hy-32,hx+14,hy-23).n,0,'last lock landed');

// The three held frames share even their feathered edges. Look through the tear at
// an already painted, multicolour scene: zero-alpha paint must never erase it.
const whole=paint(pool,.56), slit=paint(pool,.58), under=paint(pool,.58,{},0,true);
for (const t of [.60,.62]) assert.deepEqual(paint(pool,t).color,slit.color);
let cut=0, blue=0;
for (let i=0;i<slit.color.length;i++) {
  if (!slit.color[i]) { assert.equal(under.color[i],pattern(i,slit.w)); if ((whole.color[i]>>>24)>200) cut++; }
  if ((slit.color[i]&0xffffff)===(hex(pool.meta.options.palette.at(-1))&0xffffff)) blue++;
}
assert.ok(cut>230 && blue>0 && blue<70,`cut ${cut}, azurite ${blue}`);
const opened=bounds(paint(pool,.64)), held=bounds(slit);
assert.ok(opened.l < held.l-1 && opened.r > held.r+1,'both banks start recoiling on the fourth frame');

// Connected ink islands, sorted by x: a hidden ring or beads running together
// would change the count. Measure the squeeze itself, not the pulse() function.
function beads(f) {
  const mask=Uint8Array.from(f.color,c=>(c>>>24)>35), parts=[];
  for (let i=0;i<mask.length;i++) if (mask[i]) {
    const q=[i]; let l=f.w,r=-1,top=f.h,b=-1; mask[i]=0;
    for (let j=0;j<q.length;j++) {
      const k=q[j], x=k%f.w, y=Math.floor(k/f.w);
      l=Math.min(l,x);r=Math.max(r,x);top=Math.min(top,y);b=Math.max(b,y);
      for (const d of [-f.w-1,-f.w,-f.w+1,-1,1,f.w-1,f.w,f.w+1]) if (mask[k+d]) {mask[k+d]=0;q.push(k+d);}
    }
    if (q.length>4) parts.push({x:l,w:r-l+1,h:b-top+1});
  }
  return parts.sort((a,b)=>a.x-b.x);
}
const rest=paint(bell,.28), resting=beads(rest);
for(let i=14;i<=100;i++) assert.equal(beads(paint(bell,i/50)).length,8,`eight distinct ink beads, frame ${i}`);
for(let i=0;i<8;i++) {
  const hit=beads(paint(bell,.32+i*.09+.048))[i];
  assert.ok(hit.h<resting[i].h*.6 && hit.w>resting[i].w*1.32,`outgoing squeeze ${i}`);
  if (i>=4) {
    const echo=beads(paint(bell,1.46+(7-i)*.10+.054))[i];
    assert.ok(hit.h<echo.h && echo.h<resting[i].h,`weaker return ${i}`);
  }
}
for(let f=73;f<=106;f++) {
  const back=paint(bell,f/50);
  for (let y=0;y<back.h;y++) for(let x=0;x<bell.meta.origin[0];x++) assert.equal(back.color[y*back.w+x],rest.color[y*back.w+x]);
}
console.log('ok: one crest and late mane, held negative lightning over an existing scene, eight outward squeezes and four returning');

if (process.argv.includes('--exports')) for (const id of ids) {
  const fx=await loadEffect(id), r=renderFrames(fx,{bg:'none'}), name=id.split('/')[1], dir=join(ROOT,'records','ink-studies',id);
  const j=JSON.parse(readFileSync(join(dir,name+'.json'),'utf8')), {w,h}=j.meta.size, info=j.meta.pixelfx;
  assert.equal(info.id,id); assert.deepEqual(info.pivot,fx.meta.origin); assert.equal(info.loop,false);
  assert.equal(info.fps,50); assert.equal(j.frames.length,r.n); assert.equal(j.meta.image,name+'.png');
  const bytes=new Uint8Array(w*h*4);
  j.frames.forEach((entry,i)=>{
    const x=(i%info.columns)*r.w, y=Math.floor(i/info.columns)*r.h;
    assert.deepEqual(entry.frame,{x,y,w:r.w,h:r.h}); assert.equal(entry.duration,20);
    for(let row=0;row<r.h;row++) bytes.set(r.frames[i].clear.subarray(row*r.w*4,(row+1)*r.w*4),4*((y+row)*w+x));
  });
  assert.ok(encodePNG(w,h,bytes).equals(readFileSync(join(dir,name+'.png'))),`${id} atlas must preserve exact straight RGBA`);
  console.log(`ok ${id}: on-disk PNG + JSON vs every transparent runtime frame`);
}
