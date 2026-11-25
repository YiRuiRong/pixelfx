#!/usr/bin/env node
// Offline event-ready sprite sheets. No siblings of the pixelfx checkout are needed.
import { join } from "node:path";
import { ROOT, loadEffect, renderFrames, spriteSheet, save } from "./lib/fxlib.mjs";

const out = join(ROOT,"records","ink-duo","atlases");
for (const name of ["flying-white-triptych","inkstone-cleave"]) {
  const fx = await loadEffect(`melee/${name}`);
  const manifest = { id: fx.id, fps: fx.meta.fps, cues: fx.mod.cues, clips: {} };
  // Full is the gallery example. Runtime clips contain either motion OR result, not both.
  for (const [key,mod] of Object.entries({ full: fx.mod, ...fx.mod.clips })) {
    const sub = { id: key === "full" ? fx.id : `${fx.id}:${key}`, meta: mod.meta, mod };
    const r = renderFrames(sub,{actor:false,bg:"none"});
    const {png,json} = spriteSheet(sub,r,key);
    save(join(out,name,`${key}.png`),png);
    save(join(out,name,`${key}.json`),JSON.stringify(json,null,2)+"\n");
    manifest.clips[key] = { atlas:`${key}.json`, duration:mod.meta.duration, pivot:r.pivot, frames:r.n };
  }
  save(join(out,name,"manifest.json"), JSON.stringify(manifest,null,2)+"\n");
  console.log(`${fx.id}: ${Object.keys(manifest.clips).join(", ")} -> ${join(out,name)}`);
}
