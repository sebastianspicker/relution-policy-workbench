import assert from "node:assert/strict";
import test from "node:test";
import { editorServerCommand } from "../e2e/editor-server-command.js";

test("quotes validated temporary editor paths in the cleanup and serve command", () => {
  const command = editorServerCommand({
    workspace: "/tmp/relution-policy-workbench-space and 'quote' $HOME;touch-pwned",
    output: "/tmp/relution-policy-workbench-output & reports",
    port: 8791,
  });

  assert.match(command, /^rm -rf -- /u);
  assert.match(command, /'\/tmp\/relution-policy-workbench-space and '"'"'quote'"'"' \$HOME;touch-pwned'/u);
  assert.match(command, /--workspace '\/tmp\/relution-policy-workbench-space and /u);
  assert.match(command, /--out '\/tmp\/relution-policy-workbench-output & reports'/u);
  assert.match(command, /--port 8791/u);
});

test("rejects editor paths outside the dedicated temporary namespace", () => {
  const invalidPaths = [
    "relative/workspace",
    "/",
    "/tmp/other-workspace",
    "/tmp/relution-policy-workbench-safe/../../etc",
  ];

  for (const path of invalidPaths) {
    assert.throws(
      () => editorServerCommand({ workspace: path, output: "/tmp/relution-policy-workbench-output", port: 8791 }),
      /must be a normalized/u,
    );
    assert.throws(
      () => editorServerCommand({ workspace: "/tmp/relution-policy-workbench-workspace", output: path, port: 8791 }),
      /must be a normalized/u,
    );
  }
});

test("rejects invalid editor server ports", () => {
  for (const port of [0, -1, 65_536, 8791.5, Number.NaN, Number.POSITIVE_INFINITY]) {
    assert.throws(
      () => editorServerCommand({
        workspace: "/tmp/relution-policy-workbench-workspace",
        output: "/tmp/relution-policy-workbench-output",
        port,
      }),
      /integer between 1 and 65535/u,
    );
  }
});
