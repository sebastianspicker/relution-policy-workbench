import { gzipSync } from "node:zlib";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const assetDirectory = join(process.cwd(), "dist-web", "assets");
const limits = { js: 122_960, css: 9_765 };
const totals = { js: 0, css: 0 };

for (const fileName of readdirSync(assetDirectory)) {
  const kind = fileName.endsWith(".js") ? "js" : fileName.endsWith(".css") ? "css" : undefined;
  if (kind !== undefined) totals[kind] += gzipSync(readFileSync(join(assetDirectory, fileName))).byteLength;
}

for (const kind of ["js", "css"]) {
  if (totals[kind] > limits[kind]) {
    throw new Error(`${kind.toUpperCase()} gzip bundle ${totals[kind]} bytes exceeds ${limits[kind]} byte release budget`);
  }
}

console.log(`Web bundle budget: JS ${totals.js} / ${limits.js} bytes gzip; CSS ${totals.css} / ${limits.css} bytes gzip`);
