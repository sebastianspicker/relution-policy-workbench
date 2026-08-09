/** Locks the public Relution facade's compatibility-only type exports. */
import assert from "node:assert/strict";
import test from "node:test";
import type {
  RelutionAssessmentCompleteness,
  RelutionConnectionTestResult,
  RelutionDeviceQueryOptions,
} from "../src/relution-api.js";

test("retains the public Relution type contracts", () => {
  const completeness: RelutionAssessmentCompleteness = {
    assessedCount: 1,
    total: 1,
    truncated: false,
    status: "complete",
  };
  const queryOptions: RelutionDeviceQueryOptions = {
    limit: 1,
    sortField: "name",
  };
  const connectionResult: RelutionConnectionTestResult = {
    ok: true,
    baseUrl: "https://relution.example.test",
  };

  assert.equal(completeness.status, "complete");
  assert.equal(queryOptions.sortField, "name");
  assert.equal(connectionResult.ok, true);
});
