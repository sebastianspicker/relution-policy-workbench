import { lookup } from "node:dns/promises";
import { BlockList, isIP } from "node:net";

const DEFAULT_DNS_TIMEOUT_MS = 30_000;

const blockedServiceAddresses = new BlockList();
// RFC 6890 unspecified address.
blockedServiceAddresses.addAddress("0.0.0.0", "ipv4");
blockedServiceAddresses.addSubnet("0.0.0.0", 8, "ipv4");
// RFC 1918 private networks.
blockedServiceAddresses.addSubnet("10.0.0.0", 8, "ipv4");
// RFC 6598 shared address space.
blockedServiceAddresses.addSubnet("100.64.0.0", 10, "ipv4");
// RFC 1122 loopback.
blockedServiceAddresses.addSubnet("127.0.0.0", 8, "ipv4");
// RFC 3927 IPv4 link-local.
blockedServiceAddresses.addSubnet("169.254.0.0", 16, "ipv4");
// RFC 1918 private networks.
blockedServiceAddresses.addSubnet("172.16.0.0", 12, "ipv4");
// RFC 1918 private networks.
blockedServiceAddresses.addSubnet("192.168.0.0", 16, "ipv4");
// IANA special-purpose protocol assignments and deprecated 6to4 relay anycast.
blockedServiceAddresses.addSubnet("192.0.0.0", 24, "ipv4");
blockedServiceAddresses.addSubnet("192.88.99.0", 24, "ipv4");
// RFC 2544 benchmarking and RFC 5737 documentation ranges.
blockedServiceAddresses.addSubnet("192.0.2.0", 24, "ipv4");
blockedServiceAddresses.addSubnet("198.18.0.0", 15, "ipv4");
blockedServiceAddresses.addSubnet("198.51.100.0", 24, "ipv4");
blockedServiceAddresses.addSubnet("203.0.113.0", 24, "ipv4");
// RFC 5771 multicast.
blockedServiceAddresses.addSubnet("224.0.0.0", 4, "ipv4");
// RFC 1112 reserved and limited broadcast space.
blockedServiceAddresses.addSubnet("240.0.0.0", 4, "ipv4");
// RFC 4291 unspecified and loopback.
blockedServiceAddresses.addAddress("::", "ipv6");
blockedServiceAddresses.addAddress("::1", "ipv6");
// Deprecated IPv4-compatible addresses can embed a local IPv4 target.
blockedServiceAddresses.addSubnet("::", 96, "ipv6");
// RFC 6145 IPv4-translatable addresses also obscure the routed IPv4 target.
blockedServiceAddresses.addSubnet("::ffff:0:0:0", 96, "ipv6");
// Translation prefixes can conceal an IPv4 destination from this policy.
blockedServiceAddresses.addSubnet("64:ff9b::", 96, "ipv6");
blockedServiceAddresses.addSubnet("64:ff9b:1::", 48, "ipv6");
// RFC 6666 discard-only and RFC 3849 documentation ranges.
blockedServiceAddresses.addSubnet("100::", 64, "ipv6");
// RFC 3879 deprecated site-local addresses.
blockedServiceAddresses.addSubnet("fec0::", 10, "ipv6");
// IETF protocol assignments and 6to4 transition ranges are not normal
// globally reachable service destinations and may encode other addresses.
blockedServiceAddresses.addSubnet("2001::", 23, "ipv6");
blockedServiceAddresses.addSubnet("2002::", 16, "ipv6");
blockedServiceAddresses.addSubnet("2001:db8::", 32, "ipv6");
// Documentation and segment-routing SID ranges are not public service hosts.
blockedServiceAddresses.addSubnet("3fff::", 20, "ipv6");
blockedServiceAddresses.addSubnet("5f00::", 16, "ipv6");
// RFC 4193 unique local, RFC 4291 link-local, and RFC 4291 multicast.
blockedServiceAddresses.addSubnet("fc00::", 7, "ipv6");
blockedServiceAddresses.addSubnet("fe80::", 10, "ipv6");
blockedServiceAddresses.addSubnet("ff00::", 8, "ipv6");

export type OutboundHostPolicyResult =
  | { kind: "blocked"; reason: string }
  | { kind: "dns-failure"; error: string }
  | undefined;

export type ServiceAddressResolver = (serviceName: string, hostname: string) => Promise<string[]>;

export interface ResolvedServiceAddress {
  address: string;
  family: 4 | 6;
}

export async function outboundHostPolicyError(
  serviceName: string,
  host: string,
  allowLocalServiceHosts: boolean,
  resolveAddresses: ServiceAddressResolver = resolveServiceAddresses,
  timeoutMs = DEFAULT_DNS_TIMEOUT_MS,
): Promise<OutboundHostPolicyResult> {
  if (allowLocalServiceHosts) {
    return undefined;
  }

  const hostname = normalizeHostname(host);
  let addresses: string[];
  try {
    addresses = await resolveWithTimeout(resolveAddresses(serviceName, hostname), serviceName, timeoutMs);
  } catch (error) {
    return { kind: "dns-failure", error: error instanceof Error ? error.message : String(error) };
  }
  const blockedAddress = addresses.find((address) => isBlockedServiceAddress(address));
  if (blockedAddress === undefined) {
    return undefined;
  }

  return {
    kind: "blocked",
    reason: `${serviceName} host resolves to a blocked local/private address (${blockedAddress}); use --allow-local-service-hosts only for local Docker or lab targets`,
  };
}

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

/**
 * Resolves once and returns only addresses approved for the eventual socket.
 * Callers must dial one of the returned addresses without resolving the host a
 * second time, while retaining the original hostname for TLS SNI/cert checks.
 */
export async function resolveAllowedServiceAddresses(
  serviceName: string,
  host: string,
  allowLocalServiceHosts: boolean,
  resolveAddresses: ServiceAddressResolver = resolveServiceAddresses,
  timeoutMs = DEFAULT_DNS_TIMEOUT_MS,
): Promise<ResolvedServiceAddress[]> {
  const hostname = normalizeHostname(host);
  let addresses: string[];
  try {
    addresses = await resolveWithTimeout(resolveAddresses(serviceName, hostname), serviceName, timeoutMs);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new Error(`Unable to resolve ${serviceName} host \"${hostname}\": ${message}`);
  }
  const uniqueAddresses = [...new Set(addresses)];
  if (uniqueAddresses.length === 0) {
    throw new Error(`Unable to resolve ${serviceName} host \"${hostname}\": DNS returned no addresses`);
  }
  if (!allowLocalServiceHosts) {
    const blockedAddress = uniqueAddresses.find((address) => isBlockedServiceAddress(address));
    if (blockedAddress !== undefined) {
      throw new Error(blockedServiceAddressReason(serviceName, blockedAddress));
    }
  }
  return uniqueAddresses.map((address) => {
    const family = isIP(address);
    if (family !== 4 && family !== 6) {
      throw new Error(`Unable to resolve ${serviceName} host \"${hostname}\": invalid address ${address}`);
    }
    return { address, family };
  });
}

async function resolveServiceAddresses(serviceName: string, hostname: string): Promise<string[]> {
  const literalFamily = isIP(hostname);
  if (literalFamily !== 0) {
    return [hostname];
  }

  const records = await lookup(hostname, { all: true, verbatim: true });
  return records.map((record) => record.address);
}

async function resolveWithTimeout<T>(operation: Promise<T>, serviceName: string, timeoutMs: number): Promise<T> {
  if (!Number.isSafeInteger(timeoutMs) || timeoutMs <= 0) throw new Error("DNS timeout must be a positive safe integer");
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => reject(new Error(`${serviceName} host resolution exceeded ${String(timeoutMs)}ms`)), timeoutMs);
  });
  try {
    return await Promise.race([operation, timeout]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

export function isBlockedServiceAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    return blockedServiceAddresses.check(address, "ipv4");
  }
  if (family === 6) {
    return blockedServiceAddresses.check(address, "ipv6");
  }
  // If not a valid IP address, block for security.
  return true;
}

export function literalServiceHostPolicyError(serviceName: string, host: string, allowLocalServiceHosts: boolean): string | undefined {
  if (allowLocalServiceHosts) return undefined;
  const hostname = normalizeHostname(host);
  return isIP(hostname) !== 0 && isBlockedServiceAddress(hostname)
    ? blockedServiceAddressReason(serviceName, hostname)
    : undefined;
}

function blockedServiceAddressReason(serviceName: string, address: string): string {
  return `${serviceName} host resolves to a blocked local/private address (${address}); use --allow-local-service-hosts only for local Docker or lab targets`;
}

function normalizeHostname(host: string): string {
  return host.trim().toLowerCase().replace(/^\[(.*)\]$/u, "$1").replace(/\.$/u, "");
}
