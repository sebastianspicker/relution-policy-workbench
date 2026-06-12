# Security Policy

## Supported Versions

Security fixes target the latest state of the `main` branch. This project is
local-first and does not run a hosted service for users.

## Reporting A Vulnerability

Do not open a public GitHub issue for suspected vulnerabilities.

Use GitHub private vulnerability reporting:

https://github.com/sebastianspicker/relution-policy-workbench/security/advisories/new

If GitHub private vulnerability reporting is unavailable, contact the maintainer
privately and include:

- affected commit or release, if known
- reproduction steps
- expected and actual impact
- sanitized logs or sample files, if relevant

Please avoid sending real Relution exports, credentials, tenant data, private
keys, or encryption keys unless a secure exchange path has been agreed first.

## Security-Relevant Data

Treat these as sensitive:

- Relution `.rexp` archives, decrypted workspaces, and generated imports
- archive encryption keys and `.env` files
- Relution API URLs, credentials, and read-only device audit exports
- policy payloads, screenshots, logs, and generated baseline artifacts

Keep real exports, credentials, and private tenant data out of git. Use tracked
examples only when they are sanitized fixtures.

## Disclosure And Response

The maintainer will triage privately reported vulnerabilities, confirm the
affected scope when possible, and publish a GitHub security advisory after a
fix or mitigation is available. Fixes are normally made against `main`.
