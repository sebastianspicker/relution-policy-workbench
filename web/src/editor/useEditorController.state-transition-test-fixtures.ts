/** Sidecar fixture for controller state-transition scenarios. */
import { act } from "@testing-library/react";
import { currentReady } from "./useEditorController.test-core.js";
import { createAppState } from "./useEditorController.test-fixtures.js";
import { renderController } from "./useEditorController.test-runner.js";
import type { AppState } from "./types.js";

function createStateWithDdmArtifact() {
  const state = createAppState();
  state.sidecar = {
    ...state.sidecar,
    ddmArtifacts: [{
      uuid: "artifact-1",
      schemaId: "com.example.ddm",
      kind: "ddm-configuration",
      title: "DDM Artifact",
      identifier: "com.example.ddm",
      values: {},
      payload: { payloadType: "com.example.ddm" },
    }],
  };
  return state;
}

export async function renderDdmArtifactRemoval(responseFor: (state: AppState) => Record<string, unknown>) {
  const state = createStateWithDdmArtifact();
  const hook = await renderController(state, {
    sidecarResponses: { "/api/ddm/artifact/remove": responseFor(state) },
  });
  await act(async () => { await currentReady(hook.result).controller.removeDdmArtifact("artifact-1"); });
  return hook;
}
