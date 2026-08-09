/** Enforces outbound host policy and DNS-based private-network protections. */
export type {
  OutboundHostPolicyResult,
} from "./outbound-host-policy-types.js";
export type { ResolvedServiceAddress, ServiceAddressResolver } from "./outbound-host-resolution.js";
export { assertOutboundHostAllowed, outboundHostPolicyError } from "./outbound-host-policy-check.js";
export { resolveAllowedServiceAddresses } from "./outbound-host-policy-resolution.js";
export { literalServiceHostPolicyError } from "./outbound-host-literal-policy.js";
