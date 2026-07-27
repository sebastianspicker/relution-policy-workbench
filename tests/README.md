# Test structure

The repository uses one top-level test root for cross-package and operational
tests. React tests remain next to the components and modules they exercise.

## Active tests

| Path | Classification | Runner |
| --- | --- | --- |
| `tests/*.test.ts` | Active Node.js unit, integration, security, regression, and repository-contract tests | `node:test` |
| `tests/meta/*.test.ts` | Active repository policy and documentation checks | `node:test` |
| `tests/python/test_*.py` | Active Python unit and tool tests | pytest |
| `web/src/**/*.test.ts` and `web/src/**/*.test.tsx` | Active React and browser-module tests | Vitest |
| `tests/e2e/editor-live.spec.ts` | Active browser workflow and visual-regression tests | Playwright |
| `tests/readme-tour/readme-tour.spec.ts` | Active deterministic documentation capture | Playwright |
| `tests/relution-docker/*.e2e.ts` | Active opt-in tests against the disposable local Relution service | `node:test` |
| `tests/fuzz.test.ts` | Active experimental property and fuzz coverage | `node:test` |

The configured runners discover every test path listed above. Supporting
modules do not match runner globs and are imported by active tests. Keep new
active tests in these paths and do not ignore them.

## Generated and supporting material

The PNG files under `tests/e2e/editor-live.spec.ts-snapshots/` are generated
visual baselines, but they are required inputs to the Playwright assertions and
remain versioned. Shared source fixtures under `tests/fixtures/`, test-case
modules, `conftest.py`, and Playwright helper modules are active supporting
code, not standalone tests.

Coverage output, test reports, caches, local databases, runtime snapshots, and
browser failure artifacts are disposable outputs. They are ignored rather than
stored with the active test sources.

## Commands

Run the main local gate:

```sh
pnpm verify:ci
```

Run browser and documentation capture checks separately:

```sh
pnpm test:e2e:web
pnpm screenshots:readme
```

Validate or run the optional Docker integration lane:

```sh
docker compose -f tests/relution-docker/compose.yml config --quiet
pnpm test:e2e:relution
pnpm test:e2e:relution-dashboard
```
