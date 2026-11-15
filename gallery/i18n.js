import * as zh from "./locales/zh-CN.js";

export const DEFAULT_LANGUAGE = "zh-CN";
export const STORAGE_KEY = "pixelfx.language";
export const resolveLanguage = (value) => value === "en" ? "en" : DEFAULT_LANGUAGE;
let language = DEFAULT_LANGUAGE;
// Storage can be unavailable in embedded/private browsers; the gallery still works.
try { language = resolveLanguage(localStorage.getItem(STORAGE_KEY)); } catch {}
export const getLanguage = () => language;
export function setLanguage(value) {
  language = resolveLanguage(value);
  try { localStorage.setItem(STORAGE_KEY, language); } catch {}
}

const messages = {
  "zh-CN": {
    title: "pixelfx · 像素特效库",
    description: "由代码驱动的像素特效与动画，支持实时预览、配色调整和精灵图集导出。",
    subtitle: "共 {count} 种像素特效，每一种都由代码驱动。",
    github: "GitHub 源码", skill: "Claude Code 技能", language: "语言",
    categories: "特效分类", search: "搜索特效", searchPlaceholder: "搜索中英文名称",
    empty: "没有找到匹配的特效。试试“火焰”“挥斩”或“循环”。",
    close: "关闭", playback: "播放", pause: "暂停", play: "播放", again: "重播",
    backdrop: "背景", palette: "配色", seed: "随机变化", show: "显示", mirror: "镜像",
    character: "角色", spriteSheet: "生成图集", useIt: "使用示例", source: "查看源码",
    copy: "复制", copied: "已复制", selected: "已选中，请复制", all: "全部",
    loop: "循环", once: "单次播放", seconds: "{value} 秒", kind: "类型", length: "时长",
    acted: "角色动作", canvas: "画布", tags: "标签", ownPalette: "原始配色",
    lengthValue: "{seconds} 秒，{frames} 帧，{fps} 帧/秒", canvasValue: "{w} × {h} 像素",
    windup: "前摇 {seconds} 秒", freeze: "在 {at} 秒处停顿 {ms} 毫秒",
    freezes: "共 {count} 次停顿，首次在 {at} 秒", recovery: "收势 {seconds} 秒",
    bodyMoves: "角色随特效一起动作", separator: "；", tagSeparator: "、",
    sheetAlt: "{name}精灵图集",
    sheetInfo: "共 {n} 帧，每帧 {w} × {h} 像素，每行 {cols} 帧，{fps} 帧/秒，{mode}。保存图片，或运行：{command}",
    tickComment: "每次更新", buffersComment: "颜色与发光缓冲区",
    timingComment: "使用自己的角色时，读取动作时序：{name}.act（姿态、命中与停顿）",
  },
  en: {
    title: "pixelfx", description: "Pixel art effects and animations, every one a small piece of code. Play them, recolor them, export sprite sheets.",
    subtitle: "{count} pixel art effects, every one a small piece of code.",
    github: "github", skill: "claude code skill", language: "Language",
    categories: "Categories", search: "Search effects", searchPlaceholder: "search",
    empty: "Nothing matches that. Try fire, slash or loop.",
    close: "close", playback: "play", pause: "pause", play: "play", again: "again",
    backdrop: "backdrop", palette: "palette", seed: "new seed", show: "show", mirror: "mirror",
    character: "character", spriteSheet: "sprite sheet", useIt: "use it", source: "source",
    copy: "copy", copied: "copied", selected: "selected", all: "all",
    loop: "loop", once: "one-shot", seconds: "{value}s", kind: "kind", length: "length",
    acted: "acted", canvas: "canvas", tags: "tags", ownPalette: "its own",
    lengthValue: "{seconds} s, {frames} frames at {fps} fps", canvasValue: "{w} × {h} px",
    windup: "{seconds} s wind-up", freeze: "{ms} ms freeze at {at} s",
    freezes: "{count} freezes, first at {at} s", recovery: "{seconds} s recovery",
    bodyMoves: "the body moves with it", separator: ", ", tagSeparator: ", ",
    sheetAlt: "{name} sprite sheet",
    sheetInfo: "{n} frames of {w} × {h} px, {cols} across, {fps} fps, {mode}. Save the image, or run: {command}",
    tickComment: "every tick", buffersComment: "color + light buffers",
    timingComment: "your own character? read the timing: {name}.act (poses, hits, freezes)",
  },
};

export function t(key, values = {}) {
  const template = messages[language][key] ?? messages.en[key] ?? key;
  return template.replace(/\{(\w+)\}/g, (match, name) => values[name] ?? match);
}
export function effectText(fx) {
  const translated = language === "zh-CN" && zh.effects[fx.id];
  return translated ? { name: translated[0], desc: translated[1] } : { name: fx.meta.name, desc: fx.meta.desc };
}
export function categoryText(category) {
  const translated = language === "zh-CN" && zh.categories[category.id];
  return translated ? { name: translated[0], blurb: translated[1] } : category;
}
export const tagText = (key) => language === "zh-CN" ? zh.tags[key] ?? key : key;
export const paletteText = (key) => language === "zh-CN" ? zh.palettes[key] ?? key : key;
export const backdropText = (key) => language === "zh-CN" ? zh.backdrops[key] ?? key : key;

// Search both languages, even while the other language is selected.
export function searchText(fx, category) {
  return [fx.id, fx.meta.name, fx.meta.desc, ...fx.meta.tags, ...(zh.effects[fx.id] ?? []),
    ...fx.meta.tags.map((tag) => zh.tags[tag] ?? tag), category?.name, category?.blurb,
    ...(zh.categories[fx.cat] ?? []), fx.meta.loop ? "loop 循环" : "one-shot 单次播放",
  ].join(" ").toLowerCase();
}
