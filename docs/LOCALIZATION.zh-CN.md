# pixelfx 简体中文补丁

本地特效库默认使用简体中文，右上角的“语言”下拉框可以切换 English。切换立即生效，浏览器会记住选择；没有保存过语言、设置值不受支持或浏览器存储不可用时，使用简体中文。

## 使用

在 pixelfx 目录运行：

```powershell
node tools/serve.mjs 8080
```

打开 `http://localhost:8080/gallery/`。服务已经运行时，刷新页面即可加载补丁。

- 已汉化全部 21 个分类、245 个特效的名称与说明、513 个标签、27 个配色和 6 个背景选项。
- 页面按钮、辅助阅读标签、搜索提示、动作时序、图集说明及示例代码中的注释均随语言切换。
- 搜索始终同时匹配中英文名称、说明、标签、分类和原始特效 ID。例如“黑洞”“black hole”“shadow/black-hole”均可找到同一特效。
- 语言切换保留当前分类与搜索条件。语言偏好只保存在当前浏览器的当前站点中。
- 原始特效 ID、文件名、导入路径、渲染实现和导出帧数据保持不变。特效画面内自带的 POW!、LEVEL UP! 等像素文字属于原始作品，本补丁不重绘这些字形。
- 汉化同时修复了搜索筛选时卡片的 flex 样式覆盖 hidden 属性的问题。

## 维护与构建

| 文件 | 用途 |
| --- | --- |
| `gallery/i18n.js` | 默认语言、偏好保存、界面文案与中英文搜索 |
| `gallery/locales/zh-CN-effects.js` | 以原始特效 ID 对应中文名称和说明 |
| `gallery/locales/zh-CN.js` | 分类、标签、配色与背景翻译 |
| `gallery/index.html`、`gallery/app.js`、`gallery/style.css` | 语言控件、显示更新与中文字体适配 |

新增特效时，在中文词条中补充对应 ID。尚未翻译的新增特效回退到原始英文，不影响预览。不要将中文名称写入生成的 `src/fx/index.js`；重新生成索引不会覆盖独立的中文词条。

```powershell
node tools/build-gallery.mjs
```

构建输出的 `dist/gallery/` 与 `dist/page/` 都包含语言支持。单页输出声明 UTF-8，避免中文编码识别错误。

此补丁只作用于 pixelfx 特效库页面，不涉及外层 Godot 游戏或其录像功能。
