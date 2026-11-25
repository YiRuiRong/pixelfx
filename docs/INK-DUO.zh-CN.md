# 飞白三折 · 落墨开碑

这两款水墨特效分别为**剑圣的镜影三连**和**灵兽石猴分身的追击跳劈**制作。它们在 `pixelfx` 中独立运行，没有改动主游戏，不负责伤害、追踪或命中判定。

## 在画廊试动作

在 `pixelfx` 目录运行 `node tools/serve.mjs`，打开 `http://localhost:8080/gallery/?q=水墨#melee`。也可在「近战」搜索「水墨」「剑圣」或「石猴」。点开卡片，用 1× 看动作，用 0.25× 看笔锋；可切换左右、背景和配色。「角色」只切换演示用持械人偶，不会把人偶加进图集。

| 模拟结果 | 飞白三折 `melee/flying-white-triptych` | 落墨开碑 `melee/inkstone-cleave` |
| --- | --- | --- |
| 实际扣血 `damage` | 挑、擦、落，第三刀从受击点飞出三滴墨。 | 棍梢干擦，接触点压出前倾的湿墨与三道山石皴锋，分身退场。 |
| 护盾全吸收 `shield` | 三刀仍挥出，不溅墨。 | 仍是有效接触，落墨与扣血时相同。 |
| 挥空 `miss` | 只有三笔刀势。 | 下落仍有枯笔，落地无墨花，人偶留下。 |

剑圣的青灰笔锋只占刀势一侧；横擦的飞白是真透明，不是白线。石猴只有下落末段带墨，地面印迹往前摊开，不画暗示范围伤害的圆环。所有随机纹理均来自表现种子，不读取战斗 RNG。

## 给角色用哪张图？

运行 `node tools/export-ink-duo.mjs`。在 `records/ink-duo/atlases/` 的两个子目录中，每段都有同名透明 PNG 和 Aseprite JSON；`manifest.json` 列出动作时刻、各段时长、帧数和锚点。两个 `full` 是**固定示范站位、模拟扣血**的整招，请勿在每次出刀时都播放一整套。正式角色优先按下表取独立片段：

| 片段 | 相对动作时刻 | 锚点及触发条件 |
| --- | --- | --- |
| 剑圣 `rise / cross / fall` | 0.00 / 0.16 / 0.32 秒 | 分别取三次 `blade_chain` 的 `index` 0 / 1 / 2，放在当段**镜影**局部坐标，不是本体；当段挥空也播，朝向逐段取。 |
| 剑圣 `spray` | 第三段实际扣血事件 | 锚在**目标的真实受击位置**。只有第三刀的 `weapon_contact` 才用，不要由动画计时器补发。 |
| 石猴 `trail` | 起手 0.32–0.46 秒 | 放在角色后层，锚在**当帧棍梢**，跟随追击；起跳和高点留白。 |
| 石猴 `stamp` | 接触时（默认起手后 0.46 秒） | 放在前层，以 `monkey_clone_impact` 的实际落点开播，持续 0.34 秒。认接触事件，不认扣血量；目标失效时不播。 |

均为 **50 fps**（每帧 20 ms）、单次播放、默认向右。整招分别为 **128×96 / 31 帧**、**156×112 / 41 帧**。按 JSON 的 `meta.pixelfx.pivot` 定位；左右镜像时也要镜像锚点。纹理只含墨迹，没有刀、棍、人物、木桩、纸底、光晕层或屏震。关闭装饰 FX 时不应隐藏真实分身、人物姿势或 HUD。

JS 宿主也可以直接使用 `clips`。例如（`x` / `y` 是宿主已经换算好的表现坐标）：

```js
import { createFx } from 'pixelfx';
import * as sword from 'pixelfx/fx/melee/flying-white-triptych';
import * as monkey from 'pixelfx/fx/melee/inkstone-cleave';

const cut = createFx(sword.clips.cross, { x: echoX, y: echoY, flip: facingLeft });
// 只在真实接触回调中创建；这次被护盾完全吸收，仍应留印。
const print = createFx(monkey.clips.stamp, { x: contactX, y: contactY, outcome: 'shield' });
```

## 复验与原角色预览

```powershell
node tools/check.mjs melee/flying-white-triptych melee/inkstone-cleave
node tools/export-ink-duo.mjs
node tools/test-ink-duo.mjs --exports
```

专项检查逐帧验证三种结果、笔画方向与透明留白、镜像、裁切、分段锚点重组成整招、同种子复现和磁盘图集。画廊的人偶不会成为运行时依赖。

本地额外运行 `python tools/preview-ink-duo.py`（需 Pillow 与相邻的主项目素材）可生成 `records/ink-duo/role-preview/ink-duo.gif` 和 `keyframes.png`：用原角色持械动作、足点和两套原场地底图，按原速及半速比较「宣纸山水」与「深空星环」。这是离线对位样张，不是 Godot 实机截图或已接入主游戏的证明；这些角色与场地图不打包进透明特效。
