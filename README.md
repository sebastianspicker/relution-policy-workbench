# REXP Studio

REXP Studio is a local TypeScript command-line tool and browser editor for
Relution `.rexp` policy archives. It can inspect, extract, edit, validate, and
rebuild archive format version 1 as observed in Relution Server `26.1.1`.

The repository also contains:

- a React policy editor served by a loopback-only Node.js process
- Relution 26.1.1 configuration templates with 201 configuration types and
  2067 OpenAPI schemas
- a vendored Apple `device-management` release snapshot with 298 Apple schema entries
  and 22 mobileconfig-backed gap settings
- BSI, CIS, and vendor recommendation mappings and baseline templates
- offline MDM source validation and LAB artifact tooling
- read-only Relution device queries and local audit reports
- optional user-initiated Zammad ticket creation

The package is private and distributed as source. It is not a hosted service or
an npm package.

See the [documentation index](docs/README.md), [release procedure](docs/alpha-release.md),
[contribution guide](CONTRIBUTING.md), [changelog](CHANGELOG.md), and
[security policy](SECURITY.md).

## Project scope

The primary workflow is local policy archive maintenance:

1. Inspect or extract a `.rexp` archive.
2. Edit its plaintext workspace through the CLI or browser.
3. Validate the workspace against the bundled Relution data.
4. Rebuild and verify an encrypted archive for controlled import.

The archive implementation handles the observed ZIP layout, plaintext
`metadata.json` and `report.json`, encrypted metadata and policy entries,
AES-128-GCM encryption, and PBKDF2-HMAC-SHA256 key derivation.

REXP Studio does not write policies or device state to a production Relution
tenant. Relution commands query device base information and write reports
locally. The Docker integration suite is the only repository workflow that
imports and publishes policies, and it targets a disposable local Relution
service.

## Capabilities and limitations

Current capabilities include:

- archive metadata inspection without a passphrase
- authenticated extraction, verification, and rebuilding
- local policy creation and editing
- Relution native configuration editing
- Apple configuration profile, DDM, and MDM command authoring
- baseline selection, ruleset import, compliance evaluation, and local
  remediation
- deterministic MDM source validation, output construction, and drift checks
- read-only Relution device queries and assessments
- local JSON and Markdown audit reports
- optional Zammad ticket creation after an explicit user action

Current limitations:

- The editor must remain on a loopback address.
- Compatibility is based on Relution Server 26.1.1 reference data and reviewed
  fixtures, not every Relution release or tenant configuration.
- DDM declarations and MDM command drafts are stored in `editor-sidecar.json`;
  they are not packed into Relution `.rexp` archives.
- Relution exports may omit `APPLE_MOBILECONFIG` entries. Keep the local
  workspace and sidecar when those entries must be restored.
- The MDM package under `mdm/` is restricted to LAB reference use. It has no
  production approval, tenant inventory, physical-device result, or proven
  rollback result.
- Dense policy editing is intended for desktop and tablet layouts. Narrow
  layouts preserve access but are not optimized for sustained phone use.
- Browser automation does not establish assistive-technology, live-service, or
  physical-device support.

## Requirements

- Node.js 22.12 or newer
- pnpm 10.34.5
- Python 3.11 or newer for the Python evidence tools
- uv 0.10.7 for the locked Python environment
- a POSIX-compatible shell for package scripts
- Playwright browser binaries for browser tests and screenshot capture
- Docker Engine with Compose v2 for the optional Relution integration tests

CI uses Node.js 22 and Python 3.11 on Ubuntu. Native Windows execution of the
POSIX package scripts is not covered by CI.

## Installation

Install the JavaScript and Python environments from their lock files:

```sh
pnpm install --frozen-lockfile
uv sync --locked
```

Build both the Node.js and browser applications:

```sh
pnpm build
```

The build writes Node.js output to `dist/` and browser assets to `dist-web/`.

## Configuration

### Archive passphrase

`RELUTION_REXP_KEY` supplies the archive passphrase to commands that decrypt or
build `.rexp` files. `--key <passphrase>` is also accepted, but command-line
arguments can be exposed through shell history or process inspection.

The value is a passphrase, not a hexadecimal, base64, or raw encryption key.
New archives require at least 16 characters and reject known placeholder
values. REXP Studio cannot recover a missing passphrase.

### Relution connection

Read-only Relution CLI commands accept:

| Setting | Environment variable | CLI option |
| --- | --- | --- |
| Server URL or host | `RELUTION_BASE_URL` | `--host` |
| API token | `RELUTION_ACCESS_TOKEN` | `--token` |
| Protocol | none | `--protocol http\|https` |
| Port | none | `--port` |
| Base path | none | `--base-path` |

HTTPS is the default. HTTP and local, private, or special-use destinations
require `--allow-local-service-hosts` and are intended only for a controlled
local lab.

Zammad settings are session-only browser inputs. There are no supported Zammad
environment variables or CLI options.

### Development and integration variables

| Variable | Purpose | Default |
| --- | --- | --- |
| `EDITOR_PORT` | Playwright editor port | `8791` |
| `FUZZ_RUNS` | Fast-check run count | `64` |
| `RELUTION_E2E_BASE_URL` | Docker test service URL | `http://127.0.0.1:<RELUTION_DOCKER_PORT>` |
| `RELUTION_E2E_REXP_KEY` | Docker test archive passphrase | test fixture value |
| `RELUTION_E2E_ACCESS_TOKEN` | Dashboard test token override | test fixture value |
| `RELUTION_E2E_MANAGEMENT_ACCESS_TOKEN` | Management API token override | basic authentication |
| `RELUTION_E2E_USERNAME` | Local Relution administrator | `admin` |
| `RELUTION_E2E_PASSWORD` | Local Relution administrator password | disposable fixture value |
| `RELUTION_E2E_SYSTEM_PASSWORD` | Local Relution system password | disposable fixture value |
| `RELUTION_E2E_POSTGRES_IMAGE` | PostgreSQL image | `postgres:16-alpine` |
| `RELUTION_DOCKER_IMAGE` | Relution image | `relution/relution:26.1.1` |
| `RELUTION_DOCKER_PORT` | Loopback host port | `8080` |
| `RELUTION_DOCKER_MEMORY` | Relution JVM memory value | `1536m` |
| `RELUTION_DOCKER_PROJECT` | Compose project name | `rexp-studio-e2e` |
| `RELUTION_DOCKER_KEEP` | Keep the stack after a test when set to `1` | unset |

`RELUTION_DOCKER_MEMORY` passes through to the container's `RELUTION_MEMORY`.
`RELUTION_E2E_ALLOW_REMOTE_BASE_URL=1` removes the local URL check in the
integration harness. Do not set it for routine tests. The integration workflow
is designed for the disposable loopback service.

`RELUTION_README_REXP_KEY` can override the local screenshot fixture
passphrase. `PLAYWRIGHT_BROWSERS_PATH` selects the browser installation and
cache directory used by the Playwright scripts.

## Usage

Start the default browser editor:

```sh
pnpm rexp
```

The command creates `.rexp-editor/workspace` when needed, writes output to
`.rexp-editor/output.rexp`, and prints a browser URL for
`http://127.0.0.1:8787/`. Open the URL printed by the current process because it
contains an ephemeral capability token in the fragment.

Show the complete CLI syntax:

```sh
pnpm rexp:built help
```

`rexp:built` runs the existing Node.js build. Use `pnpm rexp <command>` when the
source must be rebuilt first.

### Archive commands

Inspect clear archive metadata:

```sh
pnpm rexp inspect example/sample-policy-export.rexp
```

The following commands assume `RELUTION_REXP_KEY` is set through a
shell-appropriate secret input method:

```sh
pnpm rexp extract input.rexp --out /tmp/rexp-workspace --force --pretty
pnpm rexp verify input.rexp
pnpm rexp pack /tmp/rexp-workspace --out /tmp/rebuilt.rexp --force
```

Create and serve a new workspace:

```sh
pnpm rexp serve \
  --workspace /tmp/rexp-studio-workspace \
  --platform IOS \
  --name "Example iOS Policy"
```

Extract an archive and open it in the editor:

```sh
pnpm rexp edit input.rexp \
  --workspace /tmp/rexp-studio-workspace \
  --out /tmp/rebuilt.rexp \
  --force
```

### Templates and Apple catalogs

```sh
pnpm rexp templates list --platform IOS
pnpm rexp apple-compat list
pnpm rexp apple-schema audit
pnpm rexp apple-schema list --kind profile
```

The bundled template data was extracted from Relution Server 26.1.1 and
contains 19 platform values, 201 configuration detail templates, and 2067
OpenAPI schemas.

Refresh template data from a trusted Relution image:

```sh
pnpm rexp templates refresh \
  --image relution/relution:26.1.1 \
  --server-version 26.1.1
```

Refresh from an extracted executable JAR:

```sh
pnpm rexp templates refresh \
  --jar /tmp/relution-exec.jar \
  --server-version 26.1.1 \
  --out data/relution-26.1.1/template-bundle.json
```

Template refresh loads Relution classes in a restricted Docker container. Use
only an image or JAR from a trusted source.

The Apple catalog is a vendored Apple `device-management` release snapshot.
Refresh it from the default release ref or pin a revision:

```sh
pnpm rexp apple-schema refresh
pnpm rexp apple-schema refresh --revision <commit-or-tag>
```

### Relution device audit

These commands make read-only remote API requests:

Set `RELUTION_ACCESS_TOKEN` through a shell-appropriate secret input method
before running them. `RELUTION_BASE_URL` can replace `--host`.

```sh
pnpm rexp relution test --host relution.example.org
pnpm rexp relution devices --host relution.example.org --platform IOS --json
pnpm rexp relution assess --host relution.example.org --workspace /tmp/rexp-workspace --json
pnpm rexp relution audit --host relution.example.org --expected-policy IOS="iOS Baseline" --json
```

Reports are written only below the selected workspace's `reports/` directory.
Persisted reports redact the server URL, raw device records, serial numbers,
and user identity fields. The report records whether the query was complete,
partial, or of unknown completeness.

### Offline MDM commands

```sh
pnpm rexp mdm validate
pnpm rexp mdm diff
pnpm rexp mdm manifest
```

`pnpm rexp mdm verify-sources` additionally requires the untracked source
corpus under `private/source-pdfs-cache/`. `pnpm rexp mdm generate` rebuilds the
LAB JSON outputs. When `RELUTION_REXP_KEY` is present, encrypted archives are
written under the ignored `private/mdm-archives/LAB/` directory.

See [mdm/README.md](mdm/README.md) for the package contract and evidence states.

### Audit output

```sh
pnpm rexp audit \
  --json-out data/relution-26.1.1/audit-report.json \
  --markdown-out reports/relution-audit.md
```

The audit covers the bundled configuration types, schema compatibility, local
mock archive round trips, and the reviewed example archive.

## Screenshots

The screenshots use deterministic fixtures and mocked local API responses.
They do not contact Relution or Zammad.

### Editor overview

![REXP Studio editor overview](docs/readme-tour/01-editor-overview.png)

### Guided baseline builder

![Guided baseline builder](docs/readme-tour/02-baseline-guided.png)

### Expert baseline selection

![Expert baseline selection](docs/readme-tour/03-baseline-expert.png)

### Policy editor

![Policy editor](docs/readme-tour/04-policy-editor.png)

### Compliance review

![Compliance review](docs/readme-tour/05-compliance.png)

### Settings

![Settings import and export](docs/readme-tour/06-settings-import-export.png)

### Device audit

![Read-only device audit](docs/readme-tour/07-device-audit.png)

## Repository structure

| Path | Contents |
| --- | --- |
| `src/` | CLI, archive core, local HTTP server, workspace persistence, integrations, compliance, and MDM libraries |
| `web/src/` | React editor, controller hooks, components, and browser tests |
| `web/src/styles/` | Design tokens, layout, and section styles |
| `tests/` | Node.js tests, Python tests, shared fixtures, Playwright tests, visual baselines, README capture, and optional Docker integration tests |
| `web/src/**/*.test.ts(x)` | Colocated React unit and integration tests |
| `tools/` | Node.js and Python evidence, mapping, and validation tools |
| `data/` | Relution and Apple reference catalogs |
| `example/` | Reviewed fixtures, recommendation data, and baseline templates |
| `mdm/` | Versioned LAB source, schema, evidence, runbook, and output package |
| `docs/` | Focused technical documentation and screenshots |
| `.github/workflows/` | CI, CodeQL, fuzz, Scorecard, and Docker integration workflows |

## Development workflow

Run the narrow check for a changed area first. The main package commands are:

```sh
pnpm typecheck
pnpm knip
pnpm build
pnpm check:bundle:web
pnpm test:node
pnpm test:web
pnpm python:lint
pnpm python:test
```

`pnpm verify:ci` runs the local CI contract: Python cache cleanup, TypeScript
checking, Knip, both builds, web bundle budgets, built Node.js tests, Vitest,
Ruff, pytest, repository meta tests, and final Python cache cleanup.

There is no general formatter script. TypeScript formatting is enforced through
the existing source style and review. Ruff provides Python lint checks.

See [CONTRIBUTING.md](CONTRIBUTING.md) for change and pull request guidance.

## Testing

Run the full local gate:

```sh
pnpm verify:ci
git diff --check
```

Install Playwright browsers when browser tests are required:

```sh
PLAYWRIGHT_BROWSERS_PATH=/tmp/ms-playwright \
  pnpm exec playwright install chromium firefox webkit
```

Then run:

```sh
pnpm test:e2e:web
pnpm screenshots:readme
```

The Playwright configuration serializes Chromium, Firefox, and WebKit projects
because they share one mutable workspace. Browser availability depends on the
local Playwright installation.

Run the optional Docker checks only against the disposable local service:

```sh
docker compose -f tests/relution-docker/compose.yml config --quiet
pnpm test:e2e:relution
pnpm test:e2e:relution-dashboard
```

The scheduled GitHub workflow runs `pnpm test:e2e:relution`. The dashboard
variant remains a local opt-in command.

Example local Docker overrides:

```sh
RELUTION_DOCKER_IMAGE=relution/relution:26.1.1 \
RELUTION_DOCKER_PORT=8080 \
RELUTION_DOCKER_MEMORY=1536m \
pnpm test:e2e:relution
```

## Deployment and operation

REXP Studio has no hosted deployment configuration. Operate it from a local
source checkout:

```sh
pnpm install --frozen-lockfile
pnpm build
pnpm rexp:built
```

The editor serves `dist-web/` and its `/api/*` backend from the same loopback
process. Do not use `pnpm exec vite preview` for normal operation because it
serves only static browser assets.

The Docker Compose file is test infrastructure, not a production deployment.
It binds Relution to `127.0.0.1` and uses disposable fixture credentials.

## Troubleshooting

- `Editor API unavailable`: stop stale editor processes, run `pnpm rexp`, and
  open the new URL printed by that process.
- `Missing archive passphrase`: set `RELUTION_REXP_KEY` securely or supply
  `--key`. An incorrect value fails authenticated decryption.
- Browser executable missing: install the Playwright browsers with the command
  in the Testing section.
- `mdm verify-sources` reports missing files: use `mdm validate` and `mdm diff`
  in a public clone, or provide the approved private source corpus.
- Docker test cannot bind port 8080: set an unused loopback port with
  `RELUTION_DOCKER_PORT`.
- Remote service URL is rejected: use HTTPS for remote services. Use
  `--allow-local-service-hosts` only for a controlled local lab.
- CLI syntax is unclear: run `pnpm rexp:built help`. Subcommands do not provide
  separate `--help` pages.

## Security considerations

- Keep archive passphrases, API tokens, certificates, tenant exports, decrypted
  workspaces, reports, and environment files out of git.
- Treat the local operating-system account, browser extensions, terminal
  history, synchronized folders, and workspace permissions as part of the
  trust boundary.
- Do not share the editor URL. Its fragment contains the per-process API
  capability token.
- The outbound HTTP client rejects redirects, applies DNS and address checks,
  pins approved socket addresses, limits response size, and applies a request
  deadline.
- Review imported policy data and Zammad ticket drafts before taking external
  action.
- Do not treat reference-schema validation as proof that a policy is safe or
  effective on a device.

Report vulnerabilities through the private process in [SECURITY.md](SECURITY.md).

## Contributing

Changes should include a focused test, documentation updates for changed
behavior, and the narrowest relevant verification before `pnpm verify:ci`.
Visible UI changes also require browser checks and reviewed screenshots. MDM
changes require source validation and deterministic output comparison.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before opening a pull request.

## License

Repository-authored source code is licensed under the [MIT License](LICENSE).
Reference data and derived evidence may be subject to separate upstream terms.
