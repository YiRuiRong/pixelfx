#!/usr/bin/env node
// Serve the repo so the gallery can load the effects as modules: node tools/serve.mjs [port]
// then open http://localhost:8080/gallery/

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { join, extname, normalize, sep } from "node:path";
import { ROOT } from "./lib/fxlib.mjs";

const PORT = +(process.argv[2] ?? 8080);
const TYPES = {
  ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8", ".json": "application/json", ".png": "image/png", ".gif": "image/gif",
  ".svg": "image/svg+xml", ".woff2": "font/woff2", ".md": "text/plain; charset=utf-8", ".mp4": "video/mp4", ".zip": "application/zip",
};

createServer(async (req, res) => {
  let path = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (path === "/") return res.writeHead(302, { location: "/gallery/" }).end();
  if (path.endsWith("/")) path += "index.html";
  const file = normalize(join(ROOT, path));
  if (!file.startsWith(ROOT + sep)) return res.writeHead(403).end();
  try {
    const body = await readFile(file);
    const type = TYPES[extname(file)] ?? "application/octet-stream";
    const headers = { "content-type": type, "cache-control": "no-store" };
    if (type === "video/mp4") {
      // Native video controls seek with a byte range, including when resuming a loop.
      headers["accept-ranges"] = "bytes";
      const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? "");
      if (req.method === "GET" && range && (range[1] || range[2])) {
        const size = body.length;
        const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
        const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
        if (start > end) return res.writeHead(416, { ...headers, "content-range": `bytes */${size}` }).end();
        headers["content-range"] = `bytes ${start}-${end}/${size}`;
        return res.writeHead(206, { ...headers, "content-length": end - start + 1 }).end(body.subarray(start, end + 1));
      }
    }
    res.writeHead(200, { ...headers, "content-length": body.length }).end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
}).listen(PORT, () => console.log(`gallery: http://localhost:${PORT}/gallery/`));
