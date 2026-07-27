/** Shared imports for focused useEditorController behavior suites. */
export { act, waitFor } from "@testing-library/react";
export { afterEach, describe, expect, it, vi } from "vitest";
export { controllerSuite } from "./useEditorController.test-suite.js";
export { buildArchive, renderAfterFailedBuild, renderController, renderReadyController, renderSelectedController, selectFirstConfiguration, updateConfigurationName } from "./useEditorController.test-runner.js";
export { deferEndpoint, deferTwoRequests, deferred, requestPath, resolveControllerAction, startControllerAction } from "./useEditorController.test-deferred-requests.js";
export { expectOriginalConfigurationClean, renderArchiveImportController, renderDdmArtifactController, startConcurrentComplianceChecks } from "./useEditorController.test-request-operations.js";
export { applyBaselineTemplate, importRulesetFile, renderBaselineController } from "./useEditorController.test-import-operations.js";
export { renderRecommendationController } from "./useEditorController.test-recommendation-operations.js";
export { renderComplianceController } from "./useEditorController.test-compliance-operations.js";
export {
  createAppState,
  createComplianceReport,
  createRecommendationCatalog,
  createRecommendationIndex,
  createSidecar,
  createValidation,
  createWorkspace,
  currentReady,
  installFetchMock,
  jsonResponse,
  type FetchRequestRecord,
} from "./useEditorController.test-helpers.js";
