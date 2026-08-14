/** Handles archive creation and compliance evaluation editor endpoints. */
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { IncomingMessage, ServerResponse } from "node:http";
import { applyComplianceRemediationToWorkspace, buildComplianceReport, loadComplianceArtifacts } from "./compliance.js";
import { assertNewArchiveKey, extractRexp } from "./rexp.js";
import { sendJson } from "./editor-routes-utils.js";
import { captureSidecarState, restoreSidecarState, rollbackPersistedEditorState } from "./editor-sidecar-rollback.js";
import { recordMobileConfigRestoreEntries, replaceEditorSidecarFromWorkspace } from "./sidecar.js";
import { buildVerifiedEditorArchive } from "./editor-build-publish.js";
import { loadWorkspace, saveWorkspace, schemaCompatibilityIssues, validateWorkspace } from "./workspace.js";
import { optionalString, requireString } from "./editor-api-request-input.js";
import { parseComplianceSelectionBody, parseRecommendationSourceBody, parseRecommendationSourcesBody, parseWorkspaceBody } from "./editor-domain-request-input.js";
import { badRequest, HttpError, type JsonRecord } from "./editor-http-input.js";
import { readJsonBody } from "./editor-json-body.js";
import type { RecommendationSource } from "./recommendation-types.js";
import type { EditorRequestContext } from "./editor-server-contract.js";

const IMPORT_JSON_BODY_LIMIT_BYTES = 64 * 1024 * 1024;
type ComplianceApplyResult = ReturnType<typeof applyComplianceRemediationToWorkspace> & {
  readonly selection: ReturnType<typeof parseComplianceSelectionBody>;
  readonly sources: RecommendationSource[];
};
type ArchiveBuildPreparation = {
  readonly workspace: ReturnType<typeof loadWorkspace>;
  readonly validation: ReturnType<typeof validateWorkspace>;
  readonly constraintsRemoved: ReturnType<typeof getRemovedSchemaConstraints>;
};
type ArchiveBuildResult = {
  readonly previousSidecar: ReturnType<typeof captureSidecarState>;
  readonly sidecar: ReturnType<typeof recordMobileConfigRestoreEntries>;
  readonly verification: ReturnType<typeof buildVerifiedEditorArchive>;
};

export async function handleComplianceApiRequest(
  url: URL, request: IncomingMessage, response: ServerResponse, context: EditorRequestContext,
): Promise<boolean> {
  if (url.pathname === "/api/compliance/check" && request.method === "POST") {
    const body = await readJsonBody(request);
    const workspace = parseWorkspaceBody(body);
    const selection = parseComplianceSelectionBody(body);
    const sources = parseRecommendationSourcesBody(body);
    sendJson(response, 200, { report: buildComplianceReport({ workspace, selection, sources, catalogs: loadComplianceArtifacts(sources), bundle: context.bundle, appleSchema: context.appleSchema }) });
    return true;
  }
  if (url.pathname !== "/api/compliance/apply" || request.method !== "POST") return false;
  const body = await readJsonBody(request);
  let result: ComplianceApplyResult;
  try { result = applyComplianceRequestBody(body, context); }
  catch (error) { throw clientInputError(error); }
  const previousWorkspace = loadWorkspace(context.options.workspace);
  const previousSidecar = captureSidecarState(context.options.workspace);
  try { sendAppliedComplianceResponse(response, context, result); }
  catch (error) {
    rollbackPersistedEditorState(context.options.workspace, previousWorkspace, previousSidecar, error);
    throw error;
  }
  return true;
}

export async function handleArchiveApiRequest(
  url: URL, request: IncomingMessage, response: ServerResponse, context: EditorRequestContext,
): Promise<boolean> {
  if (url.pathname === "/api/import" && request.method === "POST") {
    await handleArchiveImportRequest(request, response, context);
    return true;
  }
  if (url.pathname === "/api/build" && request.method === "POST") {
    handleArchiveBuildRequest(response, context);
    return true;
  }
  return false;
}

async function handleArchiveImportRequest(
  request: IncomingMessage, response: ServerResponse, context: EditorRequestContext,
): Promise<void> {
  const { options, bundle, appleSchema, runtimeState } = context;
  const body = await readJsonBody(request, IMPORT_JSON_BODY_LIMIT_BYTES);
  const importKey = optionalString(body, "key") ?? runtimeState.key;
  if (importKey.length === 0) throw badRequest("Import requires an archive passphrase");
  const previousWorkspace = loadWorkspace(options.workspace);
  const previousSidecar = captureSidecarState(options.workspace);
  const previousKey = runtimeState.key;
  const previousKeyValidation = runtimeState.keyValidation;
  const importDir = mkdtempSync(join(tmpdir(), "rexp-studio-import-"));
  try {
    writeFileSync(join(importDir, "import.rexp"), Buffer.from(requireString(body, "dataBase64"), "base64"));
    const extractedDir = join(importDir, "workspace");
    extractRexp(join(importDir, "import.rexp"), extractedDir, importKey, { force: true, pretty: true });
    const workspace = loadWorkspace(extractedDir);
    saveWorkspace(options.workspace, workspace);
    const sidecar = replaceEditorSidecarFromWorkspace(options.workspace, workspace, appleSchema.source.revision);
    runtimeState.key = importKey;
    runtimeState.keyValidation = { keySet: true, validated: true };
    sendJson(response, 200, { workspace, validation: validateWorkspace(workspace, bundle), keySet: true, sidecar });
  } catch (error) {
    runtimeState.key = previousKey;
    runtimeState.keyValidation = previousKeyValidation;
    rollbackPersistedEditorState(options.workspace, previousWorkspace, previousSidecar, error);
    throw error;
  } finally { rmSync(importDir, { recursive: true, force: true }); }
}

function handleArchiveBuildRequest(response: ServerResponse, context: EditorRequestContext): void {
  const preparation = prepareArchiveBuild(response, context);
  if (!preparation) return;
  const archiveBuild = buildArchiveWithSidecar(context, preparation.workspace);
  const { sidecar, verification } = archiveBuild;
  if (!verification.ok) {
    restoreSidecarState(context.options.workspace, archiveBuild.previousSidecar);
    sendArchiveBuildVerificationFailure(response, preparation, verification);
    return;
  }
  context.runtimeState.keyValidation = { keySet: true, validated: true };
  sendJson(response, 200, { validation: preparation.validation, verification, outputFile: context.options.out, sidecar, ...(preparation.constraintsRemoved.length === 0 ? {} : { constraintsRemoved: preparation.constraintsRemoved }) });
}

function prepareArchiveBuild(response: ServerResponse, context: EditorRequestContext): ArchiveBuildPreparation | undefined {
  const { options, bundle, runtimeState } = context;
  if (runtimeState.key.length === 0) {
    sendJson(response, 400, { error: "Build requires an archive passphrase. Enter one in Settings and click Set passphrase." });
    return;
  }
  try {
    assertNewArchiveKey(runtimeState.key);
  } catch (error) {
    throw badRequest(error instanceof Error ? error.message : String(error));
  }
  const workspace = loadWorkspace(options.workspace);
  const validation = validateWorkspace(workspace, bundle);
  const constraintsRemoved = getRemovedSchemaConstraints(bundle);
  if (!validation.ok) {
    sendJson(response, 400, { validation, ...(constraintsRemoved.length === 0 ? {} : { constraintsRemoved }) });
    return;
  }
  return { workspace, validation, constraintsRemoved };
}

function buildArchiveWithSidecar(context: EditorRequestContext, workspace: ReturnType<typeof loadWorkspace>): ArchiveBuildResult {
  const { options, appleSchema, runtimeState } = context;
  const previousSidecar = captureSidecarState(options.workspace);
  try {
    const sidecar = recordMobileConfigRestoreEntries(options.workspace, workspace, appleSchema.source.revision);
    const verification = buildVerifiedEditorArchive({ workspace: options.workspace, output: options.out, key: runtimeState.key });
    return { previousSidecar, sidecar, verification };
  } catch (error) {
    rollbackArchiveBuildSidecar(options.workspace, previousSidecar, error);
  }
}

function rollbackArchiveBuildSidecar(
  workspace: EditorRequestContext["options"]["workspace"], previousSidecar: ReturnType<typeof captureSidecarState>, error: unknown,
): never {
  try { restoreSidecarState(workspace, previousSidecar); }
  catch (rollbackError) { throw new AggregateError([error, rollbackError], "Archive build failed and sidecar rollback failed"); }
  throw error;
}

function sendArchiveBuildVerificationFailure(
  response: ServerResponse, preparation: ArchiveBuildPreparation, verification: ReturnType<typeof buildVerifiedEditorArchive>,
): void {
  const failedEntryCount = verification.checkedEntries.filter((entry) => entry.hashStatus !== "match").length;
  sendJson(response, 500, { error: `Build verification failed for ${failedEntryCount} archive entr${failedEntryCount === 1 ? "y" : "ies"}`, validation: preparation.validation, verification, failedEntryCount, ...(preparation.constraintsRemoved.length === 0 ? {} : { constraintsRemoved: preparation.constraintsRemoved }) });
}

function getRemovedSchemaConstraints(bundle: EditorRequestContext["bundle"]) {
  return schemaCompatibilityIssues(bundle).map((issue) => ({ path: issue.path, constraint: issue.kind === "invalid-pattern" ? "pattern" : issue.kind, original: issue.pattern }));
}

function applyComplianceRequestBody(body: JsonRecord, context: EditorRequestContext): ComplianceApplyResult {
  const selection = parseComplianceSelectionBody(body);
  const source = parseRecommendationSourceBody(body);
  const sources = [...new Set([...parseRecommendationSourcesBody(body), source])];
  return { ...applyComplianceRemediationToWorkspace({ workspace: parseWorkspaceBody(body), selection, sources, source, recommendationId: requireString(body, "recommendationId"), remediationId: requireString(body, "remediationId"), catalogs: loadComplianceArtifacts(sources), bundle: context.bundle, appleSchema: context.appleSchema }), selection, sources };
}
function sendAppliedComplianceResponse(response: ServerResponse, context: EditorRequestContext, result: ComplianceApplyResult): void {
  const validation = validateWorkspace(result.workspace, context.bundle);
  if (!validation.ok) throw badRequest(`Compliance remediation produced an invalid workspace: ${validation.errors.map((error) => `${error.path}: ${error.message}`).join("; ")}`);
  saveWorkspace(context.options.workspace, result.workspace);
  const persisted = loadWorkspace(context.options.workspace);
  const sidecar = recordMobileConfigRestoreEntries(context.options.workspace, persisted, context.appleSchema.source.revision);
  const report = buildComplianceReport({ workspace: persisted, selection: result.selection, sources: result.sources, catalogs: loadComplianceArtifacts(result.sources), bundle: context.bundle, appleSchema: context.appleSchema });
  sendJson(response, 200, { workspace: persisted, validation, sidecar, report });
}
function clientInputError(error: unknown): HttpError { return error instanceof HttpError ? error : badRequest(error instanceof Error ? error.message : String(error)); }
