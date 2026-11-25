# 白马拍岸 · 墨池藏雷 · 空山回钟

三款独立的水墨小品，一款靠留白认形，一款靠停顿，一款只靠墨滴的形变。素材完全由 `pixelfx` 代码绘制；不需要人物、纸纹贴图、音效或主游戏资源。未接入 Godot 战斗逻辑。

| 名称 / 源码 ID | 单帧 / 锚点（距左、上边缘，像素） | 时长 / 帧数 | 看哪一拍 |
| --- | --- | --- | --- |
| 白马拍岸 `water/white-horse-breaker` | 208×116 / (104,96)，水面 | 1.48 秒 / 75 帧 | 浪尖本身变成马首，0.66 秒可读出颈部和双蹄的留白。0.76 秒踏半步，0.98 秒肩背拍回水面，最后一绺鬃毛拖到 1.12 秒才落。 |
| 墨池藏雷 `lightning/thunder-under-ink` | 200×116 / (100,76)，落墨点 | 1.26 秒 / 64 帧 | 一滴浓墨在 0.20 秒触地。0.58 秒裂口显形，0.58 / 0.60 / 0.62 秒三帧外沿不动，0.64 秒两岸弹开。雷纹是没有着墨的区域，不是白色闪电。 |
| 空山回钟 `arcane/empty-mountain-echo` | 232×76 / (116,38)，墨珠列中心 | 2.36 秒 / 119 帧 | 八滴悬墨从 0.32 秒起，自左往右每隔 0.09 秒受压一次。1.46 秒弱回波从右往左，依次只经过第 8、7、6、5 滴；左边四滴保持静止。 |

都是 **50 fps、单次播放**；帧数包含最后一帧透明帧。程序模块另导出以秒为单位的 `cues`，只描述视觉节奏，不代替命中事件。播放方向默认向右（墨池从中心分裂）；三个效果均支持 `flip`、`palette` 和表现 `seed`。默认墨色为浅场地设计，深场景可换更浅的配色；不会为提亮而往透明处填白。

## 直接看 / 直接用

- **动态画廊**：在 `pixelfx` 根目录运行 `node tools/serve.mjs`，打开 `http://localhost:8080/gallery/?q=独立水墨`。清空分类筛选可同时看到三张卡片。支持慢放、镜像和换背景。
- **离线预览**：打包后双击 `records/ink-studies/ink-studies.gif` 看原速三联动图（从三个各自的关键帧开始循环）；每款 ID 的子目录内还有从头播放的 `anim.gif`。`alpha-proof.png` 将同一透明帧叠在纸色、深色和双色纹理上；这些底色和字都不在特效里。
- **取图集**：解压 `ink-studies-atlases.zip`。每个 ID 的目录里有一对同名的 PNG 和 Aseprite 格式 JSON。按 `frames` 顺序和矩形取帧，每帧 20ms，播放一次，不要把网格末尾的空格也算一帧。锚点读取 `meta.pixelfx.pivot`；水平翻转时若手工计算，用 `(单帧宽 - pivot.x, pivot.y)`。墨层使用普通 Alpha 混合，不用加法发光；像素画缩放可用最近邻。

## 从源码复现

```powershell
# 在 pixelfx 根目录。打包和预览需要 Python 3、Pillow，特效运行及专项检查只需 Node。
python tools/package-ink-studies.py
node tools/test-ink-studies.mjs --exports
node tools/check.mjs water/white-horse-breaker lightning/thunder-under-ink arcane/empty-mountain-echo
```

只导出图集、不制作预览或 ZIP 时，也可用 `node tools/render.mjs water/white-horse-breaker lightning/thunder-under-ink arcane/empty-mountain-echo --sheet --out records/ink-studies`。图集逐行保存渲染器的直通 RGBA，不把半透明洇边重复乘以 Alpha。
