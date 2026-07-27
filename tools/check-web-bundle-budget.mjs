// Enforce release gzip budgets against the actual generated JavaScript and CSS assets.
import { gzipSync } from "node:zlib";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const assetDirectory = join(process.cwd(), "dist-web", "assets");
// Signal Desk shell + modular CSS; budgets track measured gzip of the design cutover.
const limits = { js: 128_000, css: 13_000 };
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
