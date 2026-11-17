# 蝠化三式

墨黑与灰紫的蝠身、冷银翼缘、暗红眼光。每只蝙蝠使用四个明确的扇翅姿态，大小、扇翅相位和飞行先后均错开。三个动作都包含前摇、人体消散、蝠群运动、重聚和收势。

在本地画廊的「完整招式」中搜索 **蝠化**，可一起查看这三个效果。也可以搜索各自的中文名称。

| 名称 | 模块 | 动作节奏（特效时间） |
|---|---|---|
| 惊蝠脱身 | `moves/bat-dodge` | 0–0.08 秒身体散开；攻击穿过空隙；0.30–0.50 秒在后方重聚，位移 −34 px |
| 掠夜 | `moves/bat-nightflight` | 0–0.11 秒化形；两股尾流跟随领飞蝙蝠前行；0.76–1.00 秒急停重聚，位移 +128 px |
| 回噬 | `moves/bat-reprisal` | 散蝠后绕上方折返；0.44 秒开始恢复手臂；0.56 秒命中并停顿 80 ms；0.76 秒完全重聚 |

前摇使用负时间；上表不包含前摇和命中停顿。`timing` 导出关键时间与位移，`act` 提供姿态和命中事件。这些是动画数据，闪避判定、碰撞、伤害和冷却由游戏决定。

## 播放与接入

用 `createAct` 播放完整演示：包含项目默认角色、位移和命中反馈。角色没有单独设定原画，本次沿用默认人偶作为动作占位。

用 `createFx` 接入自己的角色时，传入 `actor` 的 `mask / pixels / x / y / w / h`；它的颜色会保留在消散和重聚的身体碎片中。按 `actorAlpha(t)` 隐藏原角色，重聚结束后把游戏角色放到位移终点再恢复显示。原点固定在招式开始时的脚下，位移已包含在特效内部；不要再次给这些完整招式施加同一段位移。镜像后位移方向相反。

可调选项：`palette`（蝠身）、`eyes`（眼光）、`seed`（群体差异）、`count`（6–24 只）、`body`（默认 `true`；设为 `false` 时只画蝠群与命中效果）。通用的 `flip`、`light` 和 `angle` 同样有效。

`bat-nightflight.js` 另外导出 `flight`，是一个 1.2 秒无缝循环的持续飞行模块。用 `createFx(flight, options)` 创建，随游戏角色移动更新 `instance.options.x / y`，飞行期间隐藏原角色；调用 `stop()` 后用 0.3 秒淡出。该模块只包含持续飞行，起飞和落地由游戏自己的动画状态控制。

## 导出

在项目根目录运行：

```powershell
node tools/act.mjs moves/bat-dodge moves/bat-nightflight moves/bat-reprisal --mp4
node tools/act.mjs moves/bat-dodge moves/bat-nightflight moves/bat-reprisal --sheet --no-target
node tools/render.mjs moves/bat-dodge moves/bat-nightflight moves/bat-reprisal --sheet
```

- `records/act/moves-bat-*.mp4`：含完整动作的动态预览；回噬预览含受击靶。
- `records/act/moves-bat-*.sheet.png / .sheet.json`：含默认角色、前摇和停顿的透明图集，不包含受击靶。
- `records/moves/bat-*/bat-*.png / .json`：特效本体图集；默认包含变形阶段的角色碎片，没有完整角色的前摇和收势。需要独立的纯蝠群层时用 `body: false` 重新导出。

图集使用最近邻采样、关闭有损压缩，并按 JSON 中 `meta.pixelfx.pivot` 设置原点。含角色图集已经烘焙命中停顿，不要再次应用同一段停顿。

## 验证

```powershell
node tools/check.mjs moves/bat-dodge moves/bat-nightflight moves/bat-reprisal
node tools/check-bat-moves.mjs
```

回归检查覆盖：人体隐藏与恢复、30/60/120 fps 的重聚边界、种子确定性、分步更新、镜像、自定义角色像素、命中停顿、动作结束清空、持续飞行的循环接缝与停止淡出。镜像预览和导出会同步反射画面原点，图集 JSON 保留对应的实际原点。视觉检查包含三轮关键帧对照和画廊中的动态预览。
