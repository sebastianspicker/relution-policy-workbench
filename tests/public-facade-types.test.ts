/** Locks compatibility types exported by the historical public facades. */
import assert from "node:assert/strict";
import test from "node:test";
import type { CustomSettingsInput } from "../src/apple-schema.js";
import type {
  OutboundHostPolicyResult,
  ServiceAddressResolver,
} from "../src/outbound-host-policy.js";
import type { NewWorkspaceOptions } from "../src/workspace.js";

type PublicFacadeContracts = [
  CustomSettingsInput,
  OutboundHostPolicyResult,
  ServiceAddressResolver,
  NewWorkspaceOptions,
];

test("retains the public facade type contracts", () => {
  const contracts: PublicFacadeContracts | undefined = undefined;

  assert.equal(contracts, undefined);
});
