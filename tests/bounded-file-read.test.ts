/** Protects capped regular-file reads from oversized and symlinked inputs. */
import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { constants, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import test from "node:test";

function runBoundedFileReadChild(script: string): void {
  const result = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
    encoding: "utf8",
    timeout: 1_000,
  });
  assert.equal(result.error, undefined, result.error?.message);
  assert.equal(result.status, 0, result.stderr);
}

function mockedModuleScript(setup: string, action: string): string {
  const moduleUrl = new URL("../src/utils/bounded-file-read.js", import.meta.url).href;
  return [
    'import assert from "node:assert/strict";',
    'const fs = (await import("node:fs")).default;',
    'const { syncBuiltinESMExports } = await import("node:module");',
    "const events = [];",
    "const descriptor = 73;",
    "const path = '/mocked-input';",
    "const options = { label: 'Mocked input', maxBytes: 3 };",
    `const module = await import(${JSON.stringify(moduleUrl)});`,
    setup,
    "syncBuiltinESMExports();",
    "const { readBoundedRegularFileNoFollow } = module;",
    "assert.equal(typeof readBoundedRegularFileNoFollow, 'function');",
    action,
  ].join("\n");
}

test("bounded regular-file reader exposes only its public read API", () => {
  const moduleUrl = new URL("../src/utils/bounded-file-read.js", import.meta.url).href;
  runBoundedFileReadChild([
    'import assert from "node:assert/strict";',
    `const module = await import(${JSON.stringify(moduleUrl)});`,
    "assert.deepEqual(Object.keys(module).sort(), ['readBoundedRegularFileNoFollow']);",
  ].join("\n"));
});

test("bounded regular-file reader validates and consumes one no-follow descriptor", () => {
  runBoundedFileReadChild(mockedModuleScript(
    [
      "fs.openSync = (receivedPath, flags) => { events.push(['open', receivedPath, flags]); return descriptor; };",
      "fs.fstatSync = (receivedDescriptor) => { events.push(['fstat', receivedDescriptor]); return { isFile: () => true, size: 3 }; };",
      "let reads = 0;",
      "fs.readSync = (receivedDescriptor, data, offset, length, position) => {",
      "  events.push(['read', receivedDescriptor, offset, length, position]);",
      "  if (reads++ === 0) { data.set([97, 98], offset); return 2; }",
      "  data.set([99], offset); return 1;",
      "};",
      "fs.closeSync = (receivedDescriptor) => { events.push(['close', receivedDescriptor]); };",
    ].join("\n"),
    [
    "const data = readBoundedRegularFileNoFollow(path, options);",
    "assert.deepEqual(data, Buffer.from('abc'));",
    `assert.deepEqual(events, [['open', path, ${String(constants.O_RDONLY | constants.O_NOFOLLOW | constants.O_NONBLOCK)}], ['fstat', descriptor], ['read', descriptor, 0, 3, 0], ['read', descriptor, 2, 1, 2], ['close', descriptor]]);`,
    ].join("\n"),
  ));
});

test("bounded regular-file reader validates before reading and closes after every post-open failure", () => {
  for (const scenario of [
    {
      name: "non-regular file",
      setup: "fs.fstatSync = (receivedDescriptor) => { events.push(['fstat', receivedDescriptor]); return { isFile: () => false, size: 3 }; };",
      expected: "Mocked input must be a regular file: /mocked-input",
      events: "[['open', path, flags], ['fstat', descriptor], ['close', descriptor]]",
    },
    {
      name: "oversized file",
      setup: "fs.fstatSync = (receivedDescriptor) => { events.push(['fstat', receivedDescriptor]); return { isFile: () => true, size: 4 }; };",
      expected: "Mocked input exceeds the 3 byte limit: /mocked-input",
      events: "[['open', path, flags], ['fstat', descriptor], ['close', descriptor]]",
    },
    {
      name: "fstat failure",
      setup: "fs.fstatSync = (receivedDescriptor) => { events.push(['fstat', receivedDescriptor]); throw new Error('fstat failed'); };",
      expected: "fstat failed",
      events: "[['open', path, flags], ['fstat', descriptor], ['close', descriptor]]",
    },
    {
      name: "read failure",
      setup: "fs.fstatSync = (receivedDescriptor) => { events.push(['fstat', receivedDescriptor]); return { isFile: () => true, size: 3 }; }; fs.readSync = (receivedDescriptor) => { events.push(['read', receivedDescriptor]); throw new Error('read failed'); };",
      expected: "read failed",
      events: "[['open', path, flags], ['fstat', descriptor], ['read', descriptor], ['close', descriptor]]",
    },
    {
      name: "short read",
      setup: "fs.fstatSync = (receivedDescriptor) => { events.push(['fstat', receivedDescriptor]); return { isFile: () => true, size: 3 }; }; fs.readSync = (receivedDescriptor, data, offset) => { events.push(['read', receivedDescriptor, offset]); if (offset === 0) { data.set([97, 98], offset); return 2; } return 0; };",
      expected: "Mocked input changed while reading: /mocked-input",
      events: "[['open', path, flags], ['fstat', descriptor], ['read', descriptor, 0], ['read', descriptor, 2], ['close', descriptor]]",
    },
  ]) {
    runBoundedFileReadChild(mockedModuleScript(
      [
        "const flags = fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK;",
        "fs.openSync = (receivedPath, receivedFlags) => { events.push(['open', receivedPath, receivedFlags]); return descriptor; };",
        scenario.setup,
        "fs.closeSync = (receivedDescriptor) => { events.push(['close', receivedDescriptor]); };",
      ].join("\n"),
      [
      "assert.throws(() => readBoundedRegularFileNoFollow(path, options), { message: " + JSON.stringify(scenario.expected) + " });",
      "assert.deepEqual(events, " + scenario.events + ");",
      ].join("\n"),
    ));
  }
});

test("bounded regular-file reads reject FIFOs without blocking", { skip: process.platform === "win32" }, () => {
  const root = mkdtempSync(join(tmpdir(), "relution-bounded-fifo-"));
  const fifo = join(root, "input.fifo");
  try {
    execFileSync("mkfifo", [fifo]);
    const moduleUrl = new URL("../src/utils/bounded-file-read.js", import.meta.url).href;
    const script = [
      `const { readBoundedRegularFileNoFollow } = await import(${JSON.stringify(moduleUrl)});`,
      "try {",
      `  readBoundedRegularFileNoFollow(${JSON.stringify(fifo)}, { label: "FIFO input", maxBytes: 1024 });`,
      "  process.exitCode = 2;",
      "} catch (error) {",
      "  if (!(error instanceof Error) || !error.message.includes(\"must be a regular file\")) throw error;",
      "}",
    ].join("\n");
    const result = spawnSync(process.execPath, ["--input-type=module", "--eval", script], {
      encoding: "utf8",
      timeout: 1_000,
    });
    assert.equal(result.error, undefined, result.error?.message);
    assert.equal(result.status, 0, result.stderr);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
