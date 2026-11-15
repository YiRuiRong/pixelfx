# 漫画飓风

特效 ID：`nature/comic-hurricane`。在画廊的“自然”分类中选择“漫画飓风”，也可搜索“飓风”“漫画”或 `comic hurricane`。

这是一个由 JavaScript 实时绘制的漫画风特效。沿用原有龙卷风的弯曲轴线、前后风带与种子随机碎屑思路，以深色描边、青白色宽风带、硬边明暗、稀疏网点和速度线构成画面。顶部螺旋表现风眼，细风线向上爬升，底部尘团绕地面旋转。

## 规格与接入

| 项目 | 值 |
| --- | --- |
| 源码 | `src/fx/nature/comic-hurricane.js` |
| 画布 | 384 × 384 |
| 锚点 | (192, 338)，风柱接地处 |
| 动画 | 3 秒循环，24 FPS，72 帧 |
| 默认背景 | 浅色，导出图集透明 |
| 参数 | `palette` 配色、`seed` 碎屑与细节变化；兼容通用位置、镜像、旋转和停止淡出 |

该效果采用较大的绘制尺寸表现漫画曲线。描边和宽风带使用局部扫描线填充，在像素边界混合覆盖率；底层运行时及其他特效保持现有接口。`drawBack` 绘制远侧风带、风柱与远侧碎屑，`draw` 绘制近侧风带、碎屑及尘浪。

所有运动使用同一个三秒周期及整数倍角速度，随机变化仅来自指定种子。同一参数和时间可以重现同一帧。

## 预览与导出

在 pixelfx 目录运行：

```powershell
node tools/serve.mjs
node tools/render.mjs nature/comic-hurricane --gif --sheet --scale 1 --zoom 1
node tools/check.mjs nature/comic-hurricane
```

本地画廊地址为 `http://localhost:8080/gallery/#nature`。渲染命令在 `records/nature/comic-hurricane/` 写入接触表、GIF、透明 PNG 图集及包含锚点和逐帧时间的 JSON。图集是 9 列 × 8 行，每帧 384 × 384；GIF 用于观看，PNG 和 JSON 用于素材接入。

此次仅集成到 pixelfx 画廊，未配置 Godot 游戏中的技能或伤害逻辑。渲染输出由现有 `.gitignore` 保留在本地。
