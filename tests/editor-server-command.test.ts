/** Verifies command-line construction for launching the editor server. */
import assert from "node:assert/strict";
import test from "node:test";
import { editorServerCommand } from "./e2e/editor-server-command.js";

test("quotes validated temporary editor paths in the cleanup and serve command", () => {
  const command = editorServerCommand({
    workspace: "/tmp/rexp-studio-space and 'quote' $HOME;touch-pwned",
    output: "/tmp/rexp-studio-output & reports",
    port: 8791,
  });

  assert.match(command, /^rm -rf -- /u);
  assert.match(command, /'\/tmp\/rexp-studio-space and '"'"'quote'"'"' \$HOME;touch-pwned'/u);
  assert.match(command, /--workspace '\/tmp\/rexp-studio-space and /u);
  assert.match(command, /--out '\/tmp\/rexp-studio-output & reports'/u);
  assert.match(command, /--port 8791/u);
  assert.match(command, /--editor-api-token 'playwright-editor-api-token'/u);
});

test("uses a quoted deterministic token when the browser harness supplies one", () => {
  const command = editorServerCommand({
    workspace: "/tmp/rexp-studio-workspace",
    output: "/tmp/rexp-studio-output",
    port: 8791,
    apiToken: "playwright token 'quoted'",
  });

  assert.match(command, /--editor-api-token 'playwright token '"'"'quoted'"'"''/u);
});

test("rejects editor paths outside the dedicated temporary namespace", () => {
  const invalidPaths = [
    "relative/workspace",
    "/",
    "/tmp/other-workspace",
    "/tmp/rexp-studio-safe/../../etc",
  ];

  for (const path of invalidPaths) {
    assert.throws(
      () => editorServerCommand({ workspace: path, output: "/tmp/rexp-studio-output", port: 8791 }),
      /must be a normalized/u,
    );
    assert.throws(
      () => editorServerCommand({ workspace: "/tmp/rexp-studio-workspace", output: path, port: 8791 }),
      /must be a normalized/u,
    );
  }
});

test("rejects invalid editor server ports", () => {
  for (const port of [0, -1, 65_536, 8791.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => editorServerCommand({
        workspace: "/tmp/rexp-studio-workspace",
        output: "/tmp/rexp-studio-output",
        port,
      }),
      /integer between 1 and 65535/u,
    );
  }
});
