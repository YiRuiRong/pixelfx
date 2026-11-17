# 漫画特效三件套

延续 `nature/comic-hurricane` 的深蓝描边、青白色块、硬边阴影、稀疏网点和宽条带，新增三种单次播放特效。全部由代码绘制，接入 pixelfx 画廊。

| 特效 | ID / 画廊分类 | 时长 / 帧数 | 画布 | 锚点 |
| --- | --- | --- | --- | --- |
| 风压巨拳 | `melee/comic-wind-fist` / 近战 | 2.5 秒 / 61 帧 | 448 × 320 | (224, 244) |
| 空间拉链 | `arcane/comic-space-zipper` / 奥术 | 3.5 秒 / 85 帧 | 384 × 384 | (192, 336) |
| 弹簧雷云 | `lightning/comic-spring-cloud` / 雷电 | 3 秒 / 73 帧 | 384 × 384 | (192, 328) |

统一 24 FPS。帧数含末尾透明帧；每个效果在 `duration` 时完全消失。画廊会在播放结束后稍作等待再重播。

## 动作

- **风压巨拳**：0–0.55 秒，风带汇成带指节与拇指的拳形；0.55–0.95 秒，拳头后拉并压紧风柱；0.95–1.125 秒，向右出拳；接触时拳形横向挤压、纵向伸展，出现窄而高的星芒；随后风带错开松散、卷曲消失。锚点位于画布横向中心，保证左右方向的完整图集都有余量。
- **空间拉链**：先出现歪斜拉链；约 0.32–1.42 秒，拉头滑下并展开纸页卷边；深色裂口中有网点和旋转细线，碎屑沿弯曲轨迹被吸入；2.4–2.72 秒快速合拢，以纵向闪光收尾。
- **弹簧雷云**：雷云向下压扁，闪电折线被压紧；1.04 秒开始伸展，约 1.208 秒击中地面，带出星芒、尘团和地面风环；云朵经历两次逐渐减弱的弹动，最后收小淡出。

模块中的 `cues` 导出关键时刻，供宿主对齐动作或命中表现。它们仅描述视觉时序；当前没有接入 Godot 角色、伤害、击退或传送逻辑。

## 使用与导出

在 pixelfx 目录运行：

```powershell
node tools/serve.mjs 8080
node tools/render.mjs melee/comic-wind-fist arcane/comic-space-zipper lightning/comic-spring-cloud --gif --mp4 --sheet --scale 1 --zoom 1
```

打开 `http://localhost:8080/gallery/`，直接搜索三个中文名称，或搜索 `comic-` 查看漫画系列。可使用现有暂停、慢放、重播、换色、镜像、随机变化和生成图集控件。

默认输出分别位于：

- `records/melee/comic-wind-fist/`
- `records/arcane/comic-space-zipper/`
- `records/lightning/comic-spring-cloud/`

每个目录包含 GIF、MP4、透明 PNG 图集、Aseprite 格式 JSON 及关键帧接触表。PNG 和 JSON 使用同名文件；JSON 记录帧矩形、帧时长、24 FPS、非循环标记及锚点。程序运行可传入 `palette`、`seed`，并使用公共的 `x/y/flip/angle` 和 `stop()`。预览文件按现有 `.gitignore` 留在本地。

三个特效共用 `src/fx/_comic.js` 的扫描线填充、描边、条带和漫画碎屑工具。单独复制特效到其他 JS 工程时，应连同该文件与 `src/core` 一起复制。原漫画飓风及公共运行时没有改动。

## 验证

```powershell
node tools/check.mjs melee/comic-wind-fist arcane/comic-space-zipper lightning/comic-spring-cloud nature/comic-hurricane
node tools/test-comic-trio.mjs
node tools/build-gallery.mjs
```

三轮关键帧预览保存在 `records/comic-trio/round-1`、`round-2`、`round-3`。修正项包括折线描边的尖角厚度、裂口卷边、巨拳风带错开消散、接触帧浮点边界及巨拳镜像图集的锚点。

专项检查覆盖逐帧播放与直接定位一致、前后层合成、旋转与镜像下的视口裁剪、短配色覆盖率、种子变化、停止淡出、实例隔离、结束清空、元数据不变、透明图集，以及两个种子下左右方向的逐帧越界检查。当前 87 项通过，报告为 `records/comic-trio/checks.json`。

画廊已检查三个中文名称的显示和实际播放，并操作验证换色、镜像及图集生成。该验证不包含正式游戏接入与录像系统测试。
