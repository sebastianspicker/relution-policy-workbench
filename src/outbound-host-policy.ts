/** Enforces outbound host policy and DNS-based private-network protections. */
import { isIP } from "node:net";
import {
  blockedServiceAddressReason,
  isBlockedServiceAddress,
  normalizeServiceHostname,
} from "./outbound-host-classification.js";
import {
  resolveValidatedServiceAddresses,
  type ResolvedServiceAddress,
  type ServiceAddressResolver,
} from "./outbound-host-resolution.js";

export type { ResolvedServiceAddress, ServiceAddressResolver } from "./outbound-host-resolution.js";

export type OutboundHostPolicyResult =
  | { kind: "blocked"; reason: string }
  | { kind: "dns-failure"; error: string }
  | undefined;

/** Resolves before session setup so hostnames cannot conceal local addresses. */
export async function outboundHostPolicyError(
  serviceName: string,
  host: string,
  allowLocalServiceHosts: boolean,
  resolveAddresses?: ServiceAddressResolver,
  timeoutMs?: number,
): Promise<OutboundHostPolicyResult> {
  if (allowLocalServiceHosts) return undefined;
  try {
    const resolved = await resolveValidatedServiceAddresses(serviceName, host, resolveAddresses, timeoutMs);
    const blockedAddress = resolved.addresses.find((entry) => isBlockedServiceAddress(entry.address));
    return blockedAddress === undefined ? undefined : { kind: "blocked", reason: blockedServiceAddressReason(serviceName, blockedAddress.address) };
  } catch (error) {
    return { kind: "dns-failure", error: error instanceof Error ? error.message : String(error) };
  }
}

/** Converts a policy result into the error contract used by CLI callers. */
export async function assertOutboundHostAllowed(
  serviceName: string,
  host: string,
  allowLocalServiceHosts: boolean,
): Promise<void> {
  const policyError = await outboundHostPolicyError(serviceName, host, allowLocalServiceHosts);
  if (policyError !== undefined) {
    throw new Error(policyError.kind === "blocked" ? policyError.reason : policyError.error);
  }
}

/** Resolves once and returns exact, policy-approved addresses for socket pinning. */
export async function resolveAllowedServiceAddresses(
  serviceName: string,
  host: string,
  allowLocalServiceHosts: boolean,
  resolveAddresses?: ServiceAddressResolver,
  timeoutMs?: number,
): Promise<ResolvedServiceAddress[]> {
  const resolved = await resolveValidatedServiceAddresses(serviceName, host, resolveAddresses, timeoutMs);
  if (!allowLocalServiceHosts) {
    const blockedAddress = resolved.addresses.find((entry) => isBlockedServiceAddress(entry.address));
    if (blockedAddress !== undefined) throw new Error(blockedServiceAddressReason(serviceName, blockedAddress.address));
  }
  return resolved.addresses;
}

/** Rejects a literal blocked host before DNS preflight. */
export function literalServiceHostPolicyError(serviceName: string, host: string, allowLocalServiceHosts: boolean): string | undefined {
  if (allowLocalServiceHosts) return undefined;
  const hostname = normalizeServiceHostname(host);
  return isIP(hostname) !== 0 && isBlockedServiceAddress(hostname)
    ? blockedServiceAddressReason(serviceName, hostname)
    : undefined;
}
