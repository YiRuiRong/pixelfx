# 镜面主题：迟到的倒影

以清透蓝天、薄云、夕照、银白玻璃边缘和雨后反光组成的镜面特效。镜中的金白光轨先穿过淡淡人影，停留半秒后，现实光刃才穿镜而出；破碎后每片玻璃保留原镜面的天空位置，云继续移动，最终化成雨滴与水洼倒影。

在本地画廊的“奥术”分类中搜索 **迟到的倒影**、**镜面** 或 `arcane/delayed-reflection`。制作沿用 pixelfx 的程序化绘制，无新增外部素材或依赖。这是清透天空与玻璃光影的像素化表达。

| 属性 | 值 |
| --- | --- |
| 分类 / ID | 奥术 / `arcane/delayed-reflection` |
| 画布 / 锚点 | 480 × 384 / (240, 304) |
| 时长 / 帧率 / 帧数 | 6.5 秒 / 24 FPS / 157 帧，包含透明结束帧 |
| 播放 / 默认背景 | 单次播放 / 深色 |
| 配色 | 青蓝天空、冷灰紫倒影、银白边缘、香槟金光刃 |

## 动作时序

| 时刻 | 表现 |
| --- | --- |
| 0.08–0.82 秒 | 细银线侧转展开为悬浮椭圆镜面，显出天空、夕阳与边缘雨珠 |
| 0.78–1.12 秒 | 淡淡示意人影出现在镜内 |
| 1.25–1.62 秒 | 镜内金白光轨从左向右穿过人影 |
| 1.62–2.14 秒 | 光轨停留，现实侧保持安静 |
| 2.14 秒 | 光刃穿镜而出，镜面泛起透明涟漪，地面出现湿润金色反光 |
| 2.86 秒 | 银色裂纹显现 |
| 3.18 秒 | 镜面分为 12 块，缓慢散开、翻转；各片内部继续播放同一片天空 |
| 约 4.50–5.78 秒 | 碎片先后收缩成雨滴，坠落后激起细小涟漪与天空倒影 |
| 6.0–6.5 秒 | 水面反射逐渐散尽，结束时颜色与发光层都清空 |

模块导出 `cues`，包含 `open / reflectedCut / reflectedHold / release / crack / shatter / rain / end`。`rain` 是碎片化雨阶段的中心时刻，单片有确定性的少量时间差。

## 使用与导出

在 pixelfx 目录运行：

```powershell
node tools/serve.mjs 8080
node tools/render.mjs arcane/delayed-reflection --gif --mp4 --sheet --scale 1 --zoom 1
```

正式输出位于 `records/arcane/delayed-reflection/`：

- `anim.gif`、`anim.mp4`：完整动态预览。
- `delayed-reflection.png`、`delayed-reflection.json`：透明 RGBA 图集和帧信息，每行 12 帧。
- `contact.png`：关键帧总览。

```js
import { createFx } from "pixelfx";
import * as delayedReflection from "pixelfx/fx/arcane/delayed-reflection";

const effect = createFx(delayedReflection, {
  x: 240, y: 304,
  reflection: false, // 关闭镜中的示意人影
  cloudSpeed: 6,     // 云层每秒移动的镜面像素数；0 可冻结天空
});
```

`palette` 为天空、玻璃和雨水的主色阶，`sunlight` 为夕照与光刃色阶，均支持短数组重采样。`cloudSpeed` 限制为 0–24；非有限输入回退 6。`seed` 改变云层、碎片和雨滴的确定性细节。

支持 `x / y / flip / angle / light` 及公共运行时的 `stop()` 淡出。`light: 0` 关闭附加发光，镜面和光刃主体仍保留。地面倒影与涟漪在 back 层，镜面、光刃、碎片与落雨在 front 层。旋转时使用足够大的宿主画布；默认图集边界保证未旋转的左右两方向完整显示。

镜中的人影是可关闭的示意轮廓。当前交付为独立特效，未采样敌人真实贴图，也未接入 Godot 角色、自动选敌、命中或伤害结算。后续接入时应由角色技能驱动真实目标与判定，表现读取相同的释放时刻。

## 制作与验证

制作记录保存在 `records/delayed-reflection/`，四轮源码与关键帧均保留。第一轮先修复缓动函数参数错误，再检查完整动作；第二轮重做云层、倒影轮廓和弯曲光刃；第三轮补银边与雨滴反光、收净末尾涟漪；第四轮改善浅色背景上的碎片边缘、雨滴和水纹对比。

```powershell
node tools/test-delayed-reflection.mjs
node tools/check.mjs arcane/delayed-reflection
node tools/build-gallery.mjs
git diff --check
```

43 项专项检查通过，包括寻帧与连续播放一致、前后层合成、变换与裁剪、短色阶、实例隔离、停止淡出、首尾透明、图集规格，以及镜内预告先于现实光刃、关闭示意倒影、碎片中云层继续移动和雨后涟漪的顺序。三个种子与左右方向共检查 942 帧，颜色与发光均无画布溢出。

通用检查通过，零警告。正式 MP4 经 ffprobe 核验为 H.264、480 × 384、24 FPS、157 帧；包含结束时刻的一帧，容器时长为 6.541667 秒。透明图集为 RGBA8888，锚点为 (240, 304)。本机专项测量的绘制中位数约 4 ms，耗时随阶段和宿主环境变化，导出图集可省去运行时程序化绘制。

画廊验证包含中文搜索、暂停与重播、0.25× 慢放、镜像、白骨换色、浅色背景和 157 帧图集生成，控制台无警告或错误。验收后恢复原始配色、深色背景、正常速度和默认方向。截图已保存为 `records/delayed-reflection/gallery-verified.jpg`；保存后保留预览标签的工具调用超时，不影响已生成文件与播放验收结果。全部 256 个特效及 536 个标签的中文覆盖检查通过。
