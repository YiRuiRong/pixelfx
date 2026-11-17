# 暗黑漫画：缝界收袋

用户选定的“缝界机”招牌特效：三枚铁线扣依次落地，暗红线闭合成区域；地面化为煤黑布料，边缘提起、深褶向中心聚拢，袋口收紧，随后布面撕开、卷曲散落。

在画廊搜索 **缝界收袋**、**暗黑漫画** 或 `shadow/noir-seam-pouch` 可找到。制作使用现有程序化漫画绘制工具，无新增外部素材或依赖。

| 属性 | 值 |
| --- | --- |
| 分类 / ID | 暗影 / `shadow/noir-seam-pouch` |
| 画布 / 锚点 | 448 × 384 / (224, 256) |
| 时长 / 帧率 / 帧数 | 5.5 秒 / 24 FPS / 133 帧 |
| 背景 / 播放 | 默认深色 / 单次播放 |
| 主色 | 煤黑布料、冷灰分面、暗红缝线、少量旧纸白铁扣亮边 |

## 动作时序

- 0.25、0.833、1.417 秒：三枚铁线扣依次扎入地面。针尖沿三点连线前进，留下暗红线与独立短针脚。
- 1.75 秒：最后一边闭合。
- 1.792–2.125 秒：圈内地面从中心扩展为完整黑布，留出短暂预告。
- 2.208–2.792 秒：边缘提起，边线之间自然下垂，露出袋口内侧；地面铁扣通过三股线牵住布边。
- 2.833–3.167 秒：袋口迅速缩紧，褶皱收向中心，袋底保持圆润；收紧后有短促压缩回弹。
- 3.167–3.708 秒：短暂保持收束形态。
- 3.708 秒起：布面分成三大片并卷曲甩开，拉线回弹垂落；碎布翻转减速下落。
- 5.5 秒：全部清空，结束帧透明。

导出的 `cues` 包含 `pins / closed / cloth / lift / tighten / impact / tear`。`impact` 对应袋口完成收紧的时刻。

## 使用与导出

在 pixelfx 目录执行：

```powershell
node tools/serve.mjs 8080
node tools/render.mjs shadow/noir-seam-pouch --gif --mp4 --sheet --scale 1 --zoom 1
```

正式输出位于 `records/shadow/noir-seam-pouch/`：

- `anim.gif`、`anim.mp4`：动态预览。
- `noir-seam-pouch.png`、`noir-seam-pouch.json`：透明 RGBA 图集及帧信息。
- `contact.png`：关键帧总览。

主色阶为 `palette`，缝线色阶为 `thread`，均支持短数组换色。支持 `x / y / flip / angle / seed` 和公共运行时的 `stop()` 淡出；没有额外发光层。

`nodes` 是相对于锚点的三个二维节点，默认值为 `[[-150,25],[133,39],[18,-103]]`。调用方可传入另一组三角形；无效、非有限或退化节点回退默认形状。画布规格只保证默认节点完整显示，自定义大范围节点应扩大宿主画布，并重新检查导出范围。

```js
import { createFx } from "pixelfx";
import * as seamPouch from "pixelfx/fx/shadow/noir-seam-pouch";

const effect = createFx(seamPouch, {
  x: 224, y: 256,
  nodes: [[-117, 40], [154, 9], [-29, -89]],
});
```

布料分前后层绘制，可在 `draw(frame, "back")` 与 `draw(frame, "front")` 之间绘制被包围的角色。当前交付为独立特效，未制作缝界机角色，也未接入 Godot 的移动路径采集、区域命中、牵引或伤害结算。以后接入角色时，由技能记录三个实际节点并控制命中，表现读取同一组节点和时序。

## 验证

```powershell
node tools/test-noir-seam-pouch.mjs
node tools/check.mjs shadow/noir-seam-pouch
node tools/build-gallery.mjs
git diff --check
```

44 项专项检查通过，包含逐帧定位与播放一致、图层合成、旋转与裁剪、短色阶、节点平移、自定义三角形、无效节点回退、实例隔离、停止淡出、首尾透明及图集规格。三种种子与左右方向共检查 798 帧边界；另检查整库中文名称与标签覆盖。

四轮制作和审图记录保存在 `records/noir-seam-pouch/`。浅色背景下的布面网格透底已通过连续布料底层修正，三处实际撕裂保持分开。三节点平移与整体平移的像素一致性由局部深度排序和亚像素坐标规整保证。

通用检查通过，零警告；中文画廊构建与 `git diff --check` 通过。浏览器实际验收了中文搜索、播放、暂停、重播、0.25× 慢放、镜像、白骨换色、浅色背景及 133 帧图集生成，控制台无警告或错误；结束后恢复默认配色、深色背景、1× 速度并保持播放。截图为 `records/noir-seam-pouch/gallery-verified.jpg`。

正式 MP4 经 ffprobe 核验为 H.264、448 × 384、24 FPS、133 帧；包含结束时刻的一帧，视频容器时长为 5.541667 秒。透明图集为 RGBA8888，每行 11 帧，JSON 锚点为 (224, 256)。
