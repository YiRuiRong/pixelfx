# 活塞重锤

煤烟笼罩的伦敦蒸汽工业风特效：铸铁气缸、三级暗铜套筒、磨损的重锤、污旧压力表与泄压阀。主体使用煤黑、冷铁灰和烟褐色，加入油渍、积炭、锈蚀接缝与六角紧固件；炉膛暗红和少量冷灰亮边维持辨识度。沿用漫画系列的清楚轮廓和分块阴影，整体转为阴郁、沉重的工业插画感。

当前为暗黑改版。冲击由碎裂石面、低飞煤屑、灰汽和煤烟承担；蒸汽采用半透明体积与不规则翻卷，接触后逐渐散开。深浅背景都已审图，暗色来自素材本身的材质和配色。

| 项目 | 规格 |
| --- | --- |
| 特效 ID | `melee/steam-piston-hammer` |
| 画廊名称 / 分类 | 活塞重锤 / 近战 |
| 画布 / 锚点 | 448 × 448 / (224, 392)，锚点为地面接触点 |
| 时长 / 帧率 | 4 秒 / 24 FPS，单次播放 |
| 图集 | 97 帧，包含开始与结束透明帧；每行 10 帧 |
| 主文件 | `src/fx/melee/steam-piston-hammer.js` |
| 绘制依赖 | `src/fx/_comic.js`、`src/core/` |

## 动作与时序

- **0–1.0 秒**：气缸从淡煤烟中显现，三级暗铜套筒依次伸出，每节带两次短暂卡顿；上端气缸固定，只有套筒和锤头移动。
- **1.0–1.375 秒**：锤头悬停，污旧压力表指针上升，阀门间歇冒汽；炉膛暗红轻微起伏，机身小幅震动。
- **1.375–1.542 秒**：活塞加速下压，锤头在约 4 帧内砸到地面。石面裂开、煤屑沿地面射出，蒸汽被压成低矮气浪。
- **1.542–2.0 秒**：锤头陷入地面约 3 像素并停住，侧阀泄压；灰汽翻卷，煤烟与碎石向外散开。碎裂铺石具有顶面和下沉侧面。
- **2.0–3.4 秒**：先艰难抬起少许，约 2.22–2.30 秒短暂停住，再继续回收；三缕余汽逐渐脱离锤底、变淡，地面留下漆黑砸痕。
- **3.4–4.0 秒**：机械、裂纹与余汽收尾淡出，结束帧完全透明。

模块导出的 `cues.release`、`cues.impact`、`cues.recovery` 可供宿主对齐视觉动作。当前内容是独立 pixelfx 特效，尚未接入 Godot 战斗判定。

## 预览和导出

启动本地服务后打开 `http://localhost:8080/gallery/`，搜索“活塞重锤”或 `steam-piston-hammer`。画廊支持重播、暂停、慢放、换色、镜像、随机变化和生成图集。

```powershell
node tools/serve.mjs 8080
node tools/render.mjs melee/steam-piston-hammer --gif --mp4 --sheet --scale 1 --zoom 1
```

导出目录为 `records/melee/steam-piston-hammer/`：

- `anim.gif` / `anim.mp4`：深色背景动画预览。
- `steam-piston-hammer.png`：透明 RGBA 图集。
- `steam-piston-hammer.json`：Aseprite 格式帧矩形、帧时长、帧率和锚点元数据。
- `contact.png`：关键帧总览。

`palette` 控制暗铜，`iron` 控制黑铁、铺石和裂纹，`steam` 控制灰汽，`soot` 控制煤烟，`heat` 控制炉火与少量撞击火星；五组配色均支持短色阶。`seed` 控制裂纹、碎石和气团变化。公共运行时支持 `x/y/flip/angle`、`light` 和 `stop()` 的 0.3 秒淡出。旋转播放需给宿主视口留足空间，默认图集尺寸为直立效果设计。

## 验证记录

```powershell
node tools/check.mjs melee/steam-piston-hammer
node tools/test-steam-piston-hammer.mjs
node tools/build-gallery.mjs
git diff --check
```

特效检查通过，无警告；57 项专项检查通过，报告位于 `records/steam-piston-hammer/checks.json`。检查覆盖连续播放与直接定位一致、前后层合成、移动/镜像/旋转裁剪、五组短配色、种子确定性、4 个种子下左右方向共 776 帧的边界、机械连接、下砸加速与拔起、停止淡出、实例隔离、结束清空和透明图集元数据。

暗黑改版的三轮审图与对应源码保存在 `records/steam-piston-hammer/dark-rework/round-1` 至 `round-3`。依次重做材质与动作、加强冷灰边缘与蒸汽体积、补充碎裂铺石并打散重复气团；每轮保留关键帧，最终轮含 `impact-sequence.png`、`dark.png` 和 `light.png`。改版前源码与 GIF 保存在同目录的 `before/`。

早期明亮漫画版的四轮审图仍保留在 `records/steam-piston-hammer/round-1` 至 `round-4`，仅作为历史记录。

浏览器已验证中文搜索、实际播放、半速、换色、镜像与 97 帧图集生成。画廊构建成功。本次不涉及 Godot 游戏或录像系统。
