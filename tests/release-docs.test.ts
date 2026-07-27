/** Validates public release documentation, links, commands, and stated evidence. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import test from "node:test";
import { createAppleCompatReport, renderAppleCompatReportMarkdown } from "../src/apple-compat-report.js";
import { createRelutionAuditReport } from "../src/audit.js";
import { loadAppleSchemaCatalog } from "../src/apple-schema-catalog.js";
import { loadTemplateBundle } from "../src/templates.js";
import { fixture, password } from "./rexp-helpers.js";

const readmeTourScreenshots = [
  "01-editor-overview.png",
  "02-baseline-guided.png",
  "03-baseline-expert.png",
  "04-policy-editor.png",
  "05-compliance.png",
  "06-settings-import-export.png",
  "07-device-audit.png",
] as const;
const pngSignature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function assertCountNearLabel(text: string, labels: string[], count: number): void {
  const value = String(count);
  const matchingLine = text.split("\n").find((line) => {
    const lowerLine = line.toLowerCase();
    return line.includes(value) && labels.some((label) => lowerLine.includes(label.toLowerCase()));
  });
  assert.notEqual(matchingLine, undefined, `Expected ${value} near one of: ${labels.join(", ")}`);
}

test("assertCountNearLabel accepts a count on the same line as its label", () => {
  assert.doesNotThrow(() => assertCountNearLabel("Policies: 5", ["Policies"], 5));
});

test("assertCountNearLabel rejects off-by-one counts", () => {
  assert.throws(() => assertCountNearLabel("Policies: 5", ["Policies"], 6));
});

test("assertCountNearLabel does not match counts split onto another line", () => {
  assert.throws(() => assertCountNearLabel("Policies:\n5", ["Policies"], 5));
});

test("committed Apple compatibility artifacts match generated output", () => {
  const bundle = loadTemplateBundle();
  const report = createAppleCompatReport(bundle);
  const committedJson = JSON.parse(readFileSync("data/apple-compat/relution-jamf-gap.json", "utf8")) as unknown;
  const committedMarkdown = readFileSync("docs/JAMF_RELUTION_APPLE_GAP.md", "utf8");

  assert.deepEqual(committedJson, report);
  assert.equal(committedMarkdown, renderAppleCompatReportMarkdown(report));
});

test("README factual counts match the bundled data", () => {
  const readme = readFileSync("README.md", "utf8");
  const bundle = loadTemplateBundle();
  const catalog = loadAppleSchemaCatalog();
  const report = createAppleCompatReport(bundle);
  const audit = createRelutionAuditReport({ bundle, key: password, sampleRexp: fixture });

  assertCountNearLabel(readme, ["configuration templates", "configuration detail templates", "configuration types"], bundle.configurationTypes.length);
  assertCountNearLabel(readme, ["schemas"], Object.keys(bundle.schemas).length);
  assertCountNearLabel(readme, ["mobileconfig-backed gap settings"], report.summary.mobileconfigBacked);
  assertCountNearLabel(readme, ["Apple schema entries"], catalog.entries.length);
  assertCountNearLabel(readme, ["OpenAPI schemas"], audit.summary.schemaCount);
});

test("README product tour links complete non-empty 1440 by 1000 PNG assets", () => {
  const readme = readFileSync("README.md", "utf8");

  for (const filename of readmeTourScreenshots) {
    const path = `docs/readme-tour/${filename}`;
    const screenshot = readFileSync(path);
    assert.equal(readme.includes(`](${path})`), true, `${path} should be linked from README`);
    assert.equal(screenshot.subarray(0, pngSignature.length).equals(pngSignature), true, `${path} should be a PNG`);
    assert.equal(screenshot.readUInt32BE(16), 1440, `${path} width`);
    assert.equal(screenshot.readUInt32BE(20), 1000, `${path} height`);
    assert.equal(screenshot.length > 20_000, true, `${path} should contain rendered content`);
  }
});

test("public alpha entry points and project versions stay aligned", () => {
  const readme = readFileSync("README.md", "utf8");
  const packageManifest = JSON.parse(readFileSync("package.json", "utf8")) as {
    readonly version?: string;
    readonly private?: boolean;
  };
  const pythonManifest = readFileSync("pyproject.toml", "utf8");
  const pythonVersion = /^version = "([^"]+)"$/mu.exec(pythonManifest)?.[1];

  assert.equal(packageManifest.version, pythonVersion);
  assert.equal(packageManifest.private, true, "the alpha is distributed as source, not an npm package");
  for (const path of ["docs/alpha-release.md", "CONTRIBUTING.md", "CHANGELOG.md", "SECURITY.md"]) {
    assert.equal(readme.includes(`](${path})`), true, `${path} should be linked from README`);
    assert.equal(readFileSync(path, "utf8").trim().length > 0, true, `${path} should be present in the release package`);
  }
  assert.equal(
    readFileSync(".github/ISSUE_TEMPLATE/alpha_feedback.md", "utf8").trim().length > 0,
    true,
    "the public alpha feedback template should be present in the release package",
  );
});

test("public alpha toolchain versions are exact and aligned", () => {
  const readme = readFileSync("README.md", "utf8");
  const contributing = readFileSync("CONTRIBUTING.md", "utf8");
  const packageManifest = JSON.parse(readFileSync("package.json", "utf8")) as {
    readonly packageManager?: string;
  };
  const packageManager = packageManifest.packageManager ?? "";
  const pnpmVersion = /^pnpm@(\d+\.\d+\.\d+)$/u.exec(packageManager)?.[1];
  assert.notEqual(pnpmVersion, undefined, "packageManager should pin an exact pnpm version");
  assert.equal(readme.includes(`pnpm ${pnpmVersion}`), true);
  assert.equal(contributing.includes(`pnpm ${pnpmVersion}`), true);
  for (const path of [".github/workflows/ci.yml", ".github/workflows/fuzz.yml", ".github/workflows/relution-e2e.yml"]) {
    assert.equal(readFileSync(path, "utf8").includes(`version: ${pnpmVersion}`), true, `${path} pnpm version`);
  }

  const pythonManifest = readFileSync("pyproject.toml", "utf8");
  const uvVersion = /^required-version = "==([^"]+)"$/mu.exec(pythonManifest)?.[1];
  assert.notEqual(uvVersion, undefined, "tool.uv.required-version should pin an exact uv version");
  assert.equal(readme.includes(`uv ${uvVersion}`), true);
  assert.equal(contributing.includes(`uv ${uvVersion}`), true);
  assert.equal(readFileSync(".github/workflows/ci.yml", "utf8").includes(`version: "${uvVersion}"`), true);
});

test("committed audit report matches the generated stable summary", () => {
  const bundle = loadTemplateBundle();
  const report = createRelutionAuditReport({ bundle, key: password, sampleRexp: fixture });
  const committed = JSON.parse(readFileSync("data/relution-26.1.1/audit-report.json", "utf8")) as Record<string, unknown>;

  assert.deepEqual(committed.summary, report.summary);
  assert.deepEqual(committed.sourceInventory, report.sourceInventory);
});

test("README, compose defaults, and template bundle agree on the pinned Relution version", () => {
  const readme = readFileSync("README.md", "utf8");
  const compose = readFileSync("tests/relution-docker/compose.yml", "utf8");
  const bundle = loadTemplateBundle();
  const version = bundle.serverVersion;

  assert.equal(compose.includes(`RELUTION_DOCKER_IMAGE:-relution/relution:${version}`), true);
  assert.equal(compose.includes('127.0.0.1:${RELUTION_DOCKER_PORT:-8080}:8080'), true);
  assert.equal(readme.includes(`Relution Server \`${version}\``), true);
  assert.equal(readme.includes(`RELUTION_DOCKER_IMAGE=relution/relution:${version}`), true);
  assert.equal(readme.includes(`--server-version ${version}`), true);
  assert.equal(readme.includes(`data/relution-${version}/template-bundle.json`), true);
  assert.equal(readme.includes(`data/relution-${version}/audit-report.json`), true);
});

test("README explains RELUTION_DOCKER_MEMORY as the value passed through to RELUTION_MEMORY", () => {
  const readme = readFileSync("README.md", "utf8");

  assert.match(readme, /RELUTION_DOCKER_MEMORY[\s\S]*passes through to the container's `RELUTION_MEMORY`/u);
});

test("README documents Apple schema release snapshot refresh semantics", () => {
  const readme = readFileSync("README.md", "utf8");

  assert.match(readme, /vendored Apple `device-management` release snapshot/u);
  assert.match(readme, /--revision <commit-or-tag>/u);
});

test("post-build CLI runner executes the built help command", () => {
  const output = execFileSync("pnpm", ["rexp:built", "help"], { encoding: "utf8" });

  assert.match(output, /Usage:/u);
  assert.match(output, /rexp inspect <file\.rexp>/u);
  assert.match(output, /--markdown-out <reports\/relution-audit\.md>/u);
  assert.match(output, /RELUTION_BASE_URL/u);
  assert.match(output, /RELUTION_ACCESS_TOKEN/u);
});
