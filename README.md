<p align="center">
  <img src="docs/readme/montage.gif" width="800" alt="A grid of pixel art effects playing at once: a campfire, a burning skull, a waterfall, a plasma ball, a portal, a tornado and more.">
</p>

# pixelfx.

**<!-- count -->269<!-- /count --> pixel art effects and animations, every one a small piece of code.** Fire,
explosions, magic, weather, UI, pickups, critters and more. Play them live, recolor and mirror them, drop them into
a browser game, or export sprite sheets for any engine. Plus a Claude Code skill that makes new ones the way a
picky pixel artist would: draft, render, look, refine.

Every effect that involves a character is **acted out**: he winds up, lets go, freezes on contact and recovers, and a
target takes the hit. Twelve whole moves chain the effects into attacks from wind-up to recovery.

It's also a block on Patch: [play pixelfx on Patch](https://patch.gg/patch/pixel-effects), pick an effect and a
palette, and start a browser game from it.

**[open the gallery](https://patch-gg.github.io/pixelfx/)** · [catalog](docs/CATALOG.md) · [acting](#acting) ·
[the skill](#the-skill) · [make your own](#make-your-own) · [publish it on patch](#publish-it-on-patch) ·
[how it works](#how-it-works)

本地特效库已支持简体中文，首次打开默认使用中文，右上角可切换 English。支持中英文搜索；用 `node tools/serve.mjs` 启动后访问 `http://localhost:8080/gallery/`。详见[中文补丁说明](docs/LOCALIZATION.zh-CN.md)。

蝠化招式：[惊蝠脱身、掠夜、回噬](docs/BAT-MOVES.zh-CN.md)。在「完整招式」中搜索「蝠化」查看身体散开、蝠群位移和重聚反击；掠夜另提供可持续播放的飞行循环。

漫画风试作：[漫画飓风](docs/COMIC-HURRICANE.zh-CN.md)，在“自然”分类中预览；使用深色描边、青白风带、硬边明暗与网点，支持透明图集导出。

漫画系列新增：[风压巨拳、空间拉链、弹簧雷云](docs/COMIC-TRIO.zh-CN.md)，分别位于“近战”“奥术”“雷电”分类；支持中文搜索、换色、镜像和透明图集导出。

蒸汽工业系列：[活塞重锤](docs/STEAM-PISTON-HAMMER.zh-CN.md)，在“近战”分类中预览；采用煤烟伦敦的阴郁工业风，黑铁、暗铜、炉火与油污构成主体，重砸裂开石面并压出灰汽，停顿后缓慢拔起。

暗黑漫画系列：[撕页斩、缝影绞索](docs/NOIR-PAIR.zh-CN.md)，分别位于“近战”“暗影”分类；煤黑纸边翻卷合拢，暗红线逐针缝住影子并绷紧、断开。搜索“暗黑漫画”可一起预览。

暗黑漫画新增：[缝界收袋](docs/NOIR-SEAM-POUCH.zh-CN.md)，位于“暗影”分类；三扣缝出区域，地面化成黑布后提边收紧，最后撕裂散落。支持传入三个节点，提供完整动画、透明图集和阶段时刻。

镜面主题：[迟到的倒影](docs/DELAYED-REFLECTION.zh-CN.md)，位于“奥术”分类；镜中阳光先行、现实光刃随后穿镜，碎片里仍有流动的天空，最后化作雨滴与水洼倒影。支持换色、镜像、云速调整和透明图集导出。

角色水墨系列：[飞白三折、落墨开碑](docs/INK-DUO.zh-CN.md)。在「近战」搜索「水墨」，切换实际扣血、击盾和挥空，看剑圣镜影三笔飞白与石猴分身落棍泼墨；两款都能导出无角色的透明分段图集。

独立水墨小品：[白马拍岸、墨池藏雷、空山回钟](docs/INK-STUDIES.zh-CN.md)。画廊中搜索「独立水墨」可一起看；三款均为透明底，不绑定人物。

在本地画廊的「命中」分区搜索「周身震波」，可观看全屏黑白漫画放射的实机演示，打开详情即可下载 Godot 资源包。

The method is [Hugo Duprez](https://x.com/HugoDuprez)'s, from [How to make (good) pixel art effects with
Claude](https://www.spritefusion.com/blog/how-to-make-good-pixel-art-effects-with-claude): code is clay, trust your
eyes, feed your references. His [open-source effects](https://www.spritefusion.com/pixel-art-vfx) at Sprite Fusion
set the bar, and `src/core/sim.js` and the effects that say so at the top adapt his code. This repo is our take on
the idea at library scale, with a skill to keep going.

## what's in it.

<!-- catalog -->
| category | effects | some of them |
|---|---|---|
| **moves** | 15 | arrow shot, startled bat escape, nightflight, bat reprisal, dash strike, earth stomp… |
| **fire** | 12 | brazier, campfire, candle, fire breath, fire ring, fire tornado… |
| **explosions** | 12 | barrel explosion, big explosion, cartoon pow, dirt explosion, firework burst, firework rocket… |
| **water** | 13 | bubbles, drip, fountain, geyser, rain splash, ripples… |
| **ice** | 10 | blizzard vortex, freeze, frost breath, frost nova, ice crystal, ice lance… |
| **lightning** | 16 | ball lightning, chain lightning, charge up, comic spring cloud, electrified, lightning strike… |
| **sci-fi** | 12 | emp blast, energy core, force field, glitch, hologram, jetpack… |
| **melee** | 20 | claw swipe, comic wind fist, dagger flurry, double slash, flying white triptych, hammer smash… |
| **impacts** | 12 | blunt hit, body shockwave, bullet impact, critical hit, ground slam, heavy landing… |
| **projectiles** | 13 | arrow, bullet tracer, cannon shot, energy disc, signal flare, homing missile… |
| **spawn & death** | 10 | coin drop, disintegrate, dissolve burn, egg hatch, poof, respawn beam… |
| **arcane** | 15 | arcane beam, arcane missiles, arcane orb, blink in, blink out, comic space zipper… |
| **holy** | 10 | blessing, divine shield, feather burst, halo, heal, healing ring… |
| **shadow** | 15 | black hole, black sword wake, curse, dark explosion, eclipse, grasping hands… |
| **status** | 13 | bleeding, burning, charmed, confused, cursed, frozen… |
| **nature** | 14 | acid splash, boulder, comic hurricane, earth spike, healing bloom, leaf storm… |
| **weather** | 12 | aurora, blizzard, cherry blossoms, clouds, falling leaves, fireflies… |
| **ui** | 12 | achievement, coin collect, combo counter, confetti, countdown, crit number… |
| **pickups** | 11 | chest open, coin spin, collect burst, crystal shard, gem spin, heart pickup… |
| **transitions** | 10 | blinds, burn away, crt off, diamond wipe, glitch wipe, iris… |
| **critters** | 12 | bat, bird, butterfly, eyeball, fish school, flying skull… |
<!-- /catalog -->

JavaScript effects live in `src/fx/<category>/<name>.js`. The [catalog](docs/CATALOG.md) also lists downloadable Godot effects.

## use one.

**In a browser game** (canvas, Phaser, PixiJS, Kaplay, three.js), use the code. No dependencies.

```js
import { createFrame, clearFrame, createFx, composite } from "pixelfx";
import * as frostNova from "pixelfx/fx/ice/frost-nova";

const frame = createFrame(320, 180);                   // your game's pixel resolution
const img = new ImageData(320, 180);
const fx = createFx(frostNova, { x: 160, y: 140 });   // also: flip, angle, seed, palette, light...

function tick(dt) {
  fx.update(dt);
  clearFrame(frame);
  fx.draw(frame, "back");                              // behind characters
  drawCharacters();
  fx.draw(frame, "front");
  composite(frame, img.data, backgroundColor);         // color, then light added on top
  ctx.putImageData(img, 0, 0);                         // scale up with image-rendering: pixelated
}
```

Install from GitHub with `npm i github:patch-gg/pixelfx`, or copy `src/core` and the effects you want.

**In any engine** (Godot, Unity, GameMaker, Defold, LÖVE, Bevy), use sprite sheets:

```bash
node tools/render.mjs ice/frost-nova --sheet
```

That writes a transparent PNG of every frame in a grid and an Aseprite-style JSON (frame rects, durations, and
`meta.pixelfx` with fps, loop, columns and the pivot). Phaser's atlas loader and the Aseprite importers for Godot
and Unity read it. `node tools/sheets.mjs` exports the whole library to `sheets/`.

Any effect takes a `palette` (a dark-to-bright ramp of hex colors), so a fire can burn blue and a heal can glow
pink without touching its code:

```bash
node tools/render.mjs fire/torch --gif --opts '{"palette": ["#102","#215","#43a","#8cf","#cff","#fff"]}'
```

## acting.

<p align="center">
  <img src="docs/readme/acts.gif" width="800" alt="A grey dummy fighting a straw target: a three-stroke sword combo, a hammer smash, a ground pound, a holy smite, a frost nova and a run with after-images, each with a wind-up, a freeze on contact and a recovery.">
</p>

An effect on its own looks like a sticker. What sells a hit is the body around it: the wind-up that says something is
coming, the freeze on contact, the target rocking back, the recovery. So the 61 effects with a character, and the 12
moves, say what the body does and when:

```js
export const act = {
  target: { x: 58 },
  poses: [
    [-0.55, GUARD],            // he starts before the effect does (t = 0 is the effect's first frame)
    [-0.3, WIND_UP],
    [0, CUT, "snap"],          // "snap" holds the last pose and jumps on the key
    [0.06, FOLLOW_THROUGH, "snap"],
    [0.86, GUARD],
  ],
  hits: [{ t: 0.06, stop: 0.14, shake: 0.18, amp: 2, push: 2.8, straw: 18 }],   // freeze for 0.14 s on contact
};
```

**Play the whole thing**, character and target included, by swapping `createFx` for `createAct`:

```js
import { createFrame, clearFrame, createAct, composite } from "pixelfx";
import * as slash from "pixelfx/fx/melee/sword-slash";

const act = createAct(slash, { x: 80, y: 140 });

function tick(dt) {
  act.update(dt);                                  // holds still by itself during a freeze
  clearFrame(frame);
  act.draw(frame);                                 // { body: false } and { target: false } leave them out
  composite(frame, img.data, backgroundColor);
  const [sx, sy] = act.shake;                      // throw the picture this far
  ctx.putImageData(img, sx, sy);
}
```

**Got your own character?** Effect ids haven't changed and a sprite sheet is still the effect alone, so existing games
keep working. (Effects drawn on the body paint the stock dummy, so regenerate those if you ship them.) The timing is plain data: read `slash.act`, or `meta.pixelfx.act` in a sprite sheet's
JSON (`windup`, `recovery`, `hits` with `t` and `freeze`, `poses`). Start your own wind-up animation that long before the effect, and
stop updating everything for `freeze` seconds at each hit.

Effects drawn on the body (frost, poison, a scan line) are written against the standing character and follow him
wherever he goes: each pixel of a pose knows which pixel of the standing body it came from. `node tools/act.mjs
<id> --sheet` bakes a whole act, character included, into a sprite sheet.

The body is yours to use too: `skeleton(pose)` gives you every joint of a pose in 3D, to hang your own things on, and
`posedParts(pose)` gives you each part drawn on its own.

## the skill.

The `pixelfx` skill teaches Claude Code to find, use, export and make effects. Install it as a plugin:

```
/plugin marketplace add patch-gg/pixelfx
/plugin install pixelfx@pixelfx
```

or copy `skills/pixelfx` into `~/.claude/skills/`. Then ask for what you want:

- "Add a frost nova to my mage's ultimate."
- "Make five takes on a coin pickup sparkle and show me the best two."
- "Export the fire and explosions categories as sprite sheets for Godot."
- "This hit effect feels floaty. Make it punchier."
- "Give this spell a wind-up and make the enemy react to it."

## make your own.

```bash
node tools/new.mjs arcane/my-spell       # a working starting point (add --loop for a loop)
node tools/render.mjs arcane/my-spell    # records/arcane/my-spell/contact.png: look at it
node tools/check.mjs arcane/my-spell     # spills, seams, unseeded randomness, slow frames
```

Then go round: look at the contact sheet, fix the worst thing, render again. `--gif` and `--mp4` show the motion,
`--all` shows every frame. `node tools/act.mjs arcane/my-spell` shows an act as consecutive 12 fps steps, because motion
bugs don't show in samples. [docs/AUTHORING.md](docs/AUTHORING.md) has the contract, the drawing API and the quality
bar. `node tools/serve.mjs` runs the gallery locally with your effects in it.

## publish it on patch.

Made a browser game with these? Put it on [Patch](https://patch.gg), where people play and remix browser games and
mods. Install `pch`, Patch's command line, then restart your coding agent and ask it to publish the game: the install
gives every agent on your PC Patch's tools. Or run it yourself:

```bash
npm i -g @patchgg/cli      # or: curl -fsSL https://patch.gg/install.sh | sh
pch login
pch init                   # in your game's folder; it says what's next
pch publish
```

Publishing needs [Patch Desktop](https://docs.patch.gg/get-started) open on a Windows PC: it plays your game once to
test it before it goes live. The [quickstart](https://docs.patch.gg/quickstart) has the rest.

## how it works.

- **Two kinds of effect, no images.** Pure effects export `draw(p, t, o)`, the frame at `t` seconds from `t` alone, so
  loops tile with no seam. Simulated effects export `create(o)` and step real particles, debris and lights at 120 Hz,
  so sparks bounce and smoke rolls the same at any frame rate.
- **Two buffers.** `color` takes pixels: opaque, dithered or truly translucent. `light` takes additive glow, added on
  top. Hot things look hot because of the light buffer.
- **Seeded everything.** Every random number comes from the effect's seed, so frame 40 is the same every time.
- **Local space.** Effects draw around their own origin; the painter places, mirrors and rotates them. Directional
  effects face right. A 24×38 stock character stands in for status effects, auras and hits.
- **A real skeleton, drawn down to pixels.** The grey dummy is neutral on purpose, so the eye goes to the move and any effect's
  colors read on it. He's a 3D skeleton with fixed-length bones, pelvis to spine to shoulders, rendered in a few flat tones with one clean
  ink line, the way Dead Cells makes its sprites. So he can twist, bend and really turn round, and depth decides what's in front. Poses hold on 12 fps
  steps, the way hand-drawn sprites do, while particles run at full rate.
- **Same frame shape as Sprite Fusion's VFX** (`{ w, h, ox, oy, color, light }`), so both libraries can draw into
  one frame.

## license.

MIT, code and effects. Use them in anything, commercial included. Parts are adapted from Hugo Duprez's MIT effects
and from Hollow Crown's MIT source, and the Patch Pixel font in `gallery/fonts` is Patch's own and not covered: see
[NOTICE.md](NOTICE.md).

Made by [Patch](https://patch.gg).
