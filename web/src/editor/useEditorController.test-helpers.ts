/** Compatibility facade for deterministic editor controller test support. */
export { currentReady, jsonResponse, waitForReady } from "./useEditorController.test-core.js";
export { installFetchMock } from "./useEditorController.test-fetch.js";
export type { FetchRequestRecord } from "./useEditorController.test-fetch-types.js";
export {
  createAppState,
  createSidecar,
  createValidation,
  createWorkspace,
} from "./useEditorController.test-fixtures.js";
export { createBsiPasscodeRecommendation, createComplianceReport, createRecommendationCatalog, createRecommendationIndex } from "./useEditorController.test-recommendation-fixtures.js";
export { createEditorControllerStub } from "./useEditorController.test-stub.js";
