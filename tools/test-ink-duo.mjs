#!/usr/bin/env node
// Behavioural tests. No dependency on the Godot checkout or a graphics device.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { effects } from "../src/fx/index.js";
import { createFrame, createFx, createAct, actTiming, clearFrame } from "../src/core/index.js";
import { ROOT, loadEffect, renderFrames, spriteSheet } from "./lib/fxlib.mjs";
import zh from "../gallery/locales/zh-CN-effects.js";

const ids = ["melee/flying-white-triptych","melee/inkstone-cleave"];
const [blade, stone] = ids.map(id => effects[id]);
const marks = buf => buf.reduce((n,c) => n+((c>>>24)>0),0);
function paint(mod,t,opts={},layer) {
  const [w,h]=mod.meta.size, [x,y]=mod.meta.origin, frame=createFrame(w,h);
  const fx=createFx(mod,{x:opts.flip ? w-x : x,y,...opts});
  fx.update(t); fx.draw(frame,layer); return frame.color;
}
// Polygon antialiasing can round a subpixel edge one byte differently on reflection.
// Compare alpha and premultiplied colour (RGB in completely clear cells is irrelevant).
function samePixels(a,b,label,mirrorWidth=0) {
  assert.equal(a.length,b.length);
  for (let i=0;i<a.length;i++) {
    const j=mirrorWidth ? i+mirrorWidth-1-2*(i%mirrorWidth) : i, p=a[i],q=b[j];
    if (p===q) continue;
    const ap=p>>>24, aq=q>>>24;
    assert.ok(Math.abs(ap-aq)<=2, `${label} pixel ${i}: alpha ${ap}/${aq}`);
    for (const shift of [0,8,16]) assert.ok(Math.abs(((p>>>shift)&255)*ap-((q>>>shift)&255)*aq)<=510, `${label} pixel ${i}: channel ${shift}`);
  }
}
const active=(mod,t,o) => marks(paint(mod,t,o));
const gates=mod => mod.meta.outcomes.map(outcome=>({outcome}));

for (const [i,id] of ids.entries()) {
  const mod=effects[id], [w,h]=mod.meta.size;
  assert.ok(zh[id].join('').includes('墨'));
  assert.equal(mod.meta.fps,50); assert.equal(mod.meta.loop,false);
  for (const options of gates(mod)) {
    assert.equal(active(mod,0,options),0); assert.equal(active(mod,mod.meta.duration,options),0);
    const duration=mod.meta.duration, max=Math.round(duration*50);
    for (let f=0;f<=max;f++) {
      const t=f/50, right=paint(mod,t,options);
      samePixels(right,paint(mod,t,{...options,flip:true}),`${id} ${options.outcome} frame ${f} mirror`,w);
      // Recompose each full preview from the same event clips a host would place.
      const layer=createFrame(w,h), [ox,oy]=mod.meta.origin;
      const add=(clip,age,x=0,y=0) => {
        if (age < -1e-8 || age >= clip.meta.duration) return;
        const fx=createFx(clip,{x:ox+x,y:oy+y,...options}); fx.update(Math.max(0,age)); fx.draw(layer);
      };
      if (i===0) {
        for (const k of ['rise','cross','fall']) add(mod.clips[k],t-mod.cues[k]);
        add(mod.clips.spray,t-mod.cues.contact,52,-13);
      } else {
        const age=t-mod.cues.descent, [dx,dy]=mod.trailHead(age);
        add(mod.clips.trail,age,40+dx,-1+dy); add(mod.clips.stamp,t-mod.cues.contact,40,-1);
      }
      samePixels(right,layer.color,`${id} ${options.outcome} split/whole frame ${f}`);
      assert.ok(layer.light.every(c=>!(c&0xffffff)),"ink should have no additive glow");
      // Validate the outcome independently of the split assets' own rendering.
      if (i===0) {
        if (t<=.32 || options.outcome!=='damage') samePixels(right,paint(mod,t,{outcome:'miss'}),`blade no unsignalled spray ${f}`);
      } else if (t<=.32 || (options.outcome==='miss' && t>=.46)) assert.equal(marks(right),0,`stone false signal at ${t}`);
      else if (t<.46 || options.outcome==='shield') samePixels(right,paint(mod,t,{outcome:'damage'}),`stone contact ${f}`);
    }
  }
  // A short custom palette recolours real ink, and reseeding does not shift cue times.
  const peak=i===0 ? .22 : .54;
  const own=paint(mod,peak), altered=paint(mod,peak,{palette:["#522","#e99"]});
  assert.notDeepEqual(own,altered); assert.ok(active(mod,peak,{seed:2})>0);
  assert.deepEqual(paint(mod,peak,{seed:17}),paint(mod,peak,{seed:17}));
  assert.notDeepEqual(own,paint(mod,peak,{seed:17}));
  for (const outcome of ['damage','shield','miss']) {
    const act=createAct(mod,{outcome}); const received=[]; act.onHit=h=>received.push(h.t);
    while(!act.done()) act.update(.01);
    const wanted=i===0 ? outcome==='damage' ? [0,.16,.32] : [] : outcome!=='miss' ? [.46] : [];
    assert.deepEqual(received,wanted); assert.equal(act.targets.length,Number(outcome!=='miss'));
    assert.ok(actTiming(mod).hits.every(h=>h.outcomes.length));
  }
  for (const [key,m] of Object.entries({full:mod,...mod.clips})) {
    // Check every pixel outside the nominal rectangle, including independent clip crops.
    const [cw,ch]=m.meta.size, [ox,oy]=m.meta.origin, pad=12;
    const frame=createFrame(cw+2*pad,ch+2*pad), fx=createFx(m,{x:ox+pad,y:oy+pad,seed:65});
    for (let f=0;f<=Math.round(m.meta.duration*50);f++) {
      if (f) fx.update(.02); fx.draw(clearFrame(frame));
      for (let y=0;y<frame.h;y++) for(let x=0;x<frame.w;x++) {
        if (x>=pad && x<cw+pad && y>=pad && y<ch+pad) continue;
        assert.equal(frame.color[y*frame.w+x],0,`${key} f${f} clipped at ${x-pad},${y-pad}`);
      }
    }
  }
  console.log(`ok ${id}: all outcomes, split anchors, mirrored frames, alpha bounds, palette, seed and act`);
}
// Distinct silhouettes and two real, transparent paper channels within the horizontal brush.
for (const [key, minRatio, maxRatio] of [['rise',.45,1.25],['cross',3.6,10],['fall',.55,1.3]]) {
  const m=blade.clips[key], [w]=m.meta.size, buf=paint(m,.06); let x0=w,x1=0,y0=100,y1=0, gaps=0;
  for(let x=0;x<w;x++) { let runs=0, gap=1;
    for(let y=0;y<m.meta.size[1];y++) {
      const alpha=buf[y*w+x]>>>24;
      if(alpha>100) {x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y); if(gap) runs++; gap=0;}
      else if(alpha===0) gap++;
    } if(runs>=3) gaps++;
  }
  const ratio=(x1-x0+1)/(y1-y0+1); assert.ok(ratio>=minRatio && ratio<=maxRatio,`${key} aspect ratio ${ratio}`);
  if(key==='cross') assert.ok(gaps>=8,`dry wipe has two open channels on only ${gaps} columns`);
}
assert.ok(active(blade.clips.spray,.075)>0);
for (const outcome of ['shield','miss']) assert.equal(active(blade.clips.spray,.075,{outcome}),0);
for (const outcome of ['damage','shield']) assert.equal(stone.actorAlpha(.80,{outcome}),0);
assert.equal(stone.actorAlpha(.80,{outcome:'miss'}),1);
assert.ok(active(stone,.46,{outcome:'shield'})>0); assert.ok(active(stone,.42,{outcome:'miss'})>0);
assert.equal(marks(paint(stone,.40,{},'front')),0); assert.equal(marks(paint(stone,.56,{},'back')),0);
// Gating one target must not renumber an authored h.at for another target.
const selective={...blade,act:{...blade.act,targets:[{x:9,outcomes:['miss']},{x:42}],hits:[{t:.1,at:1,push:2,straw:0}]}};
const pair=createAct(selective,{outcome:'damage'}); pair.update(.3); assert.ok(pair.targets[0].omega || pair.targets[0].theta);
console.log('ok: stroke directions, open channels, actual-HP vs shield gates, independent layers and target slots');

if(process.argv.includes('--exports')) for(const id of ids) {
  const fx=await loadEffect(id), name=id.split('/')[1], dir=join(ROOT,'records','ink-duo','atlases',name);
  const manifest=JSON.parse(readFileSync(join(dir,'manifest.json'))); assert.deepEqual(manifest.cues,fx.mod.cues);
  for (const [key,mod] of Object.entries({full:fx.mod,...fx.mod.clips})) {
    const sub={id:key==='full'?id:`${id}:${key}`,meta:mod.meta,mod}, r=renderFrames(sub,{bg:'none',actor:false});
    const {png,json}=spriteSheet(sub,r,key);
    assert.ok(png.equals(readFileSync(join(dir,`${key}.png`))),`${name}/${key} outdated PNG`);
    assert.equal(readFileSync(join(dir,`${key}.json`),"utf8"),JSON.stringify(json,null,2)+"\n");
    assert.deepEqual(manifest.clips[key],{atlas:`${key}.json`,duration:mod.meta.duration,pivot:r.pivot,frames:r.n});
    assert.ok(json.frames.every(frame=>frame.duration===20));
  }
  console.log(`ok ${name}: on-disk transparent PNGs, frame rectangles, pivots and event manifest`);
}
