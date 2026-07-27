# Security policy

## Supported versions

Security fixes target the latest state of the `main` branch. The project is
distributed as source and does not operate a hosted service. Older prerelease
tags do not receive backports.

## Reporting a vulnerability

Do not disclose a suspected vulnerability in a public issue.

Use private vulnerability reporting from the repository's Security tab when it
is available.

If private reporting is unavailable, open an issue titled
`Private security reporting unavailable` without vulnerability details, logs,
attachments, affected paths, or sample data. A maintainer can then arrange a
private exchange.

A useful report includes:

- the affected commit or release
- reproduction steps
- expected and actual impact
- sanitized logs or fixtures

Do not send real Relution exports, credentials, tenant data, private keys, API
tokens, or archive passphrases before a suitable exchange path is agreed.

## Sensitive data

Treat the following as sensitive:

- tenant-derived `.rexp` archives and decrypted workspaces
- archive passphrases, API tokens, credentials, and environment files
- certificates, private keys, key stores, provisioning profiles, and
  environment-specific `.mobileconfig` files
- Relution and Zammad service addresses when they identify a private tenant
- device records, serial numbers, user identities, screenshots, logs,
  inventories, and audit reports

Keep these files out of git. Only reviewed and sanitized fixtures belong under
`example/`. The MDM files under `mdm/` contain placeholder-only LAB reference
data and are not tenant exports.

## Local trust boundary

The editor listens on loopback and requires a random per-process capability
token. It still trusts the local operating-system account and filesystem.
Other local processes, browser extensions, synchronized folders, shell
history, and tools with workspace access may be able to read sensitive data.

Do not share editor URLs because the URL fragment contains the capability
token. Store sensitive workspaces outside shared or world-readable
directories. Remove them according to the applicable retention policy.

## Network boundary

Production Relution access through the product is read-only. Zammad ticket
creation is the only supported product write to an external service and
requires an explicit user action. The opt-in Docker integration tests import
and publish policies only to their disposable loopback Relution service.

Remote service connections default to HTTPS. Local, private, special-use, or
cleartext destinations require `--allow-local-service-hosts`. That option is
for controlled lab services, not a remote production bypass.

The HTTP client rejects redirects, validates resolved addresses, pins approved
socket addresses, limits response size, and applies request deadlines. These
controls do not replace service authentication, certificate validation, or
tenant authorization.

## Archive and policy safety

Archive decryption uses authenticated encryption, and workspace and ZIP readers
enforce path, count, and size limits. Importing or validating a policy does not
prove that the policy is appropriate for a tenant or safe on a device. Review
payloads, assignments, platform support, rollback, and user impact before
external deployment.

## Response

Maintainers will assess the report against the identified commit or release,
prepare a fix or mitigation, and publish an advisory when disclosure is
appropriate.
