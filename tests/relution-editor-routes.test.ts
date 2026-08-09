/** Tests Relution route-namespace fallback and unknown-endpoint responses. */
import assert from "node:assert/strict";
import test from "node:test";
import { handleRelutionApiRequest } from "../src/relution-editor-routes.js";

test("Relution routes fall through outside their exact namespace", async () => {
  assert.equal(
    await handleRelutionApiRequest(new URL("http://localhost/api/relution-unknown/session"), { method: "GET" } as never, responseStub() as never, { lastDevices: [] }, "/tmp/workspace"),
    false,
  );
});

test("unknown Relution endpoints return an exact JSON 404 response", async () => {
  const response = responseStub();
  assert.equal(
    await handleRelutionApiRequest(new URL("http://localhost/api/relution/unknown"), { method: "PATCH" } as never, response as never, { lastDevices: [] }, "/tmp/workspace"),
    true,
  );
  assert.deepEqual(response.writeHeadCalls, [{
    status: 404,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      pragma: "no-cache",
      "x-content-type-options": "nosniff",
      "x-frame-options": "DENY",
    },
  }]);
  assert.equal(response.body, JSON.stringify({ error: "Unknown Relution endpoint: PATCH /api/relution/unknown" }));
});

test("unknown Relution endpoint defaults an absent method to GET", async () => {
  const response = responseStub();
  await handleRelutionApiRequest(new URL("http://localhost/api/relution/unknown"), {} as never, response as never, { lastDevices: [] }, "/tmp/workspace");
  assert.equal(response.body, JSON.stringify({ error: "Unknown Relution endpoint: GET /api/relution/unknown" }));
});

function responseStub() {
  const writeHeadCalls: Array<{ status: number; headers: Record<string, string> }> = [];
  let body = "";
  return {
    get body() { return body; },
    writeHeadCalls,
    on: () => undefined,
    writeHead: (status: number, headers: Record<string, string>) => { writeHeadCalls.push({ status, headers }); },
    end: (value: string) => { body = value; },
  };
}
