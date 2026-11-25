#!/usr/bin/env node
// Bundle the gallery into dist/gallery (a static site: GitHub Pages or any host) and dist/page (one page plus
// one script, with fonts and native media inlined, for hosts that take a page body).
//
//   node tools/index.mjs && node tools/build-gallery.mjs

import { build } from "esbuild";
import { readFileSync, writeFileSync, mkdirSync, cpSync } from "node:fs";
import { dirname, extname, join } from "node:path";
import { ROOT } from "./lib/fxlib.mjs";
import { effects, packagedEffects } from "../src/fx/index.js";

const G = join(ROOT, "gallery"), OUT = join(ROOT, "dist", "gallery"), PAGE = join(ROOT, "dist", "page");
mkdirSync(OUT, { recursive: true });
mkdirSync(PAGE, { recursive: true });

// A standalone gallery can show locally authored originals even without the source tree.
const bundledSources = Object.fromEntries(Object.entries(effects)
  .filter(([, mod]) => mod.sourceUrl)
  .map(([id, mod]) => [id, readFileSync(new URL(mod.sourceUrl), "utf8")]));
const bundle = {
  entryPoints: [join(G, "app.js")], bundle: true, format: "esm", minify: true,
  legalComments: "none",
};
const define = {
  "import.meta.bundledEffectSources": JSON.stringify(bundledSources),
  "import.meta.packageRoot": JSON.stringify("./outputs/"),
};
await build({ ...bundle, outfile: join(OUT, "app.js"), define });
const bundledMedia = {};
const mimeTypes = { ".png": "image/png", ".mp4": "video/mp4", ".zip": "application/zip" };
for (const { media } of Object.values(packagedEffects)) {
  for (const asset of Object.values(media)) {
    const src = join(ROOT, "outputs", asset), dest = join(OUT, "outputs", asset);
    mkdirSync(dirname(dest), { recursive: true });
    cpSync(src, dest);
    bundledMedia[asset] = `data:${mimeTypes[extname(asset)]};base64,${readFileSync(src).toString("base64")}`;
  }
}
cpSync(join(G, "fonts"), join(OUT, "fonts"), { recursive: true });
writeFileSync(join(OUT, "style.css"), readFileSync(join(G, "style.css")));
writeFileSync(join(OUT, "index.html"), readFileSync(join(G, "index.html")));

// the one-page version: <title> and <style> first, then the body markup, the font as a data URI
const html = readFileSync(join(G, "index.html"), "utf8");
const body = html.slice(html.indexOf("<!--BODY-->") + 11, html.indexOf("<!--/BODY-->"));
const font = readFileSync(join(G, "fonts", "PatchPixel-Regular.woff2")).toString("base64");
const css = readFileSync(join(G, "style.css"), "utf8").replace("url(fonts/PatchPixel-Regular.woff2)", `url(data:font/woff2;base64,${font})`);
writeFileSync(
  join(PAGE, "index.html"),
  [
    '<meta charset="utf-8">',
    html.match(/<title>.*?<\/title>/)?.[0] ?? "<title>pixelfx</title>",
    '<meta name="claude:viewport-fit-sides" content="cover">',
    '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Funnel+Sans:wght@400;500&family=Red+Hat+Mono:wght@400;500&display=swap">',
    `<style>\n${css}\n</style>`,
    body.trim(),
    '<script type="module" src="app.js"></script>',
  ].join("\n"),
);
await build({
  ...bundle, outfile: join(PAGE, "app.js"),
  define: { ...define, "import.meta.bundledPackageMedia": JSON.stringify(bundledMedia) },
});
console.log(`dist/gallery and dist/page built (${(readFileSync(join(OUT, "app.js")).length / 1024).toFixed(0)} KB of script)`);
