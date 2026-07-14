import assert from "node:assert/strict";
import test from "node:test";
import {
  assertOutboundHostAllowed,
  literalServiceHostPolicyError,
  outboundHostPolicyError,
  resolveAllowedServiceAddresses,
} from "../src/outbound-host-policy.js";

const blockedLocalHosts = [
  "::ffff:192.168.1.1",
  "::ffff:10.0.0.1",
  "::ffff:172.16.0.1",
  "100.64.0.1",
  "198.18.0.1",
  "192.0.0.1",
  "192.88.99.1",
  "203.0.113.1",
  "240.0.0.1",
  "fc00::1",
  "fe80::1",
  "fec0::1",
  "::127.0.0.1",
  "::ffff:0:127.0.0.1",
  "::ffff:0:8.8.8.8",
  "64:ff9b::7f00:1",
  "64:ff9b:1::7f00:1",
  "2001::7f00:1",
  "2001:2::1",
  "2001:10::1",
  "2001:20::1",
  "2002:7f00:1::",
  "2001:db8::1",
  "3fff::1",
  "5f00::1",
];

for (const host of blockedLocalHosts) {
  test(`assertOutboundHostAllowed rejects ${host}`, async () => {
    await assert.rejects(
      assertOutboundHostAllowed("Relution", host, false),
      /blocked local\/private address/u,
    );
  });
}

const allowedPublicHosts = ["2606:4700:4700::1111", "8.8.8.8"];

for (const host of allowedPublicHosts) {
  test(`assertOutboundHostAllowed accepts ${host}`, async () => {
    await assert.doesNotReject(assertOutboundHostAllowed("Relution", host, false));
  });
}

test("outboundHostPolicyError returns dns-failure when DNS resolution throws ENOTFOUND", async () => {
  const result = await outboundHostPolicyError("Relution", "missing.example.test", false, async () => {
    throw new Error("getaddrinfo ENOTFOUND missing.example.test");
  });

  assert.equal(result?.kind, "dns-failure");
  assert.match(result.error, /ENOTFOUND/u);
});

test("literal host checks reject private addresses without a DNS preflight", () => {
  assert.match(literalServiceHostPolicyError("Relution", "[::1]", false) ?? "", /blocked local\/private address/u);
  assert.equal(literalServiceHostPolicyError("Relution", "8.8.8.8", false), undefined);
  assert.equal(literalServiceHostPolicyError("Relution", "127.0.0.1", true), undefined);
});

test("outboundHostPolicyError returns blocked when DNS resolves to a private address", async () => {
  const result = await outboundHostPolicyError("Relution", "internal.example.test", false, async () => ["10.0.0.1"]);

  assert.equal(result?.kind, "blocked");
  assert.match(result.reason, /blocked local\/private address \(10\.0\.0\.1\)/u);
});

test("outboundHostPolicyError returns undefined when DNS resolves to a public address", async () => {
  const result = await outboundHostPolicyError("Relution", "public.example.test", false, async () => ["8.8.8.8"]);

  assert.equal(result, undefined);
});

test("resolveAllowedServiceAddresses rejects mixed public and private DNS answers", async () => {
  await assert.rejects(
    resolveAllowedServiceAddresses("Relution", "rebind.example.test", false, async () => ["8.8.8.8", "127.0.0.1"]),
    /blocked local\/private address \(127\.0\.0\.1\)/u,
  );
});

test("resolveAllowedServiceAddresses returns exact approved addresses for socket pinning", async () => {
  const addresses = await resolveAllowedServiceAddresses(
    "Relution",
    "public.example.test",
    false,
    async () => ["8.8.8.8", "2606:4700:4700::1111"],
  );

  assert.deepEqual(addresses, [
    { address: "8.8.8.8", family: 4 },
    { address: "2606:4700:4700::1111", family: 6 },
  ]);
});

test("resolveAllowedServiceAddresses bounds direct resolver calls", async () => {
  await assert.rejects(
    resolveAllowedServiceAddresses("Relution", "hung.example.test", false, async () => await new Promise(() => undefined), 5),
    /resolution exceeded 5ms/u,
  );
});
