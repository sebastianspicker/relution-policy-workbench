import type { PolicyWorkspace, WorkspaceValidationResult } from "../../../src/workspace.js";
import { postJson, readJsonResponse } from "./editor-utils.js";
import type { AppState, JsonRecord } from "./types.js";
import type { EditorControllerWorkspaceSetters } from "./useEditorControllerActionTypes.js";
import { parseArtifactValuesJson, postSidecarActionRequest } from "./useEditorControllerActionRequests.js";
import { clearWorkspaceHistory, type WorkspaceHistoryInput } from "./workspace-history.js";
import { keyResponseState, keyStatusMessage, type KeyUpdateResponse } from "./key-validation.js";

export type WorkspaceRequest = { readonly revision: number; readonly intent: number };
export type OrthogonalStateRequest = { readonly intent: number };
export type ActivityRequest = { readonly intent: number };

export class WorkspaceRequestGuard {
  private revisionValue = 0;
  private workspaceIntentValue = 0;
  private keyIntentValue = 0;
  private sidecarIntentValue = 0;
  private exclusiveMutationIntent: number | undefined;
  private buildActivityIntent = 0;
  private selectionValue: string | undefined;

  get revision(): number { return this.revisionValue; }
  begin(): WorkspaceRequest { return { revision: this.revisionValue, intent: ++this.workspaceIntentValue }; }
  isCurrent(request: WorkspaceRequest): boolean { return this.revisionValue === request.revision && this.workspaceIntentValue === request.intent; }
  beginExclusiveMutation(): WorkspaceRequest | undefined {
    if (this.exclusiveMutationIntent !== undefined) return undefined;
    const request = this.begin();
    this.exclusiveMutationIntent = request.intent;
    return request;
  }
  isExclusiveCurrent(request: WorkspaceRequest): boolean { return this.exclusiveMutationIntent === request.intent; }
  isApplicable(request: WorkspaceRequest): boolean { return this.isCurrent(request) || this.isExclusiveCurrent(request); }
  finishExclusiveMutation(request: WorkspaceRequest): void {
    if (this.isExclusiveCurrent(request)) this.exclusiveMutationIntent = undefined;
  }
  canEditWorkspace(): boolean { return this.exclusiveMutationIntent === undefined; }
  beginBuildActivity(request: WorkspaceRequest): ActivityRequest { this.buildActivityIntent = request.intent; return { intent: request.intent }; }
  finishBuildActivity(request: ActivityRequest): boolean { return request.intent === this.buildActivityIntent; }
  beginKeyMutation(): OrthogonalStateRequest { return { intent: ++this.keyIntentValue }; }
  isCurrentKeyMutation(request: OrthogonalStateRequest): boolean { return this.keyIntentValue === request.intent; }
  beginSidecarMutation(): OrthogonalStateRequest { return { intent: ++this.sidecarIntentValue }; }
  isCurrentSidecarMutation(request: OrthogonalStateRequest): boolean { return this.sidecarIntentValue === request.intent; }
  recordEdit(): boolean {
    if (!this.canEditWorkspace()) return false;
    this.revisionValue += 1;
    return true;
  }
  synchronizeSelection(selection: string): void {
    if (this.selectionValue !== undefined && this.selectionValue !== selection) this.recordEdit();
    this.selectionValue = selection;
  }
}

const workspaceRequestGuards = new WeakMap<object, WorkspaceRequestGuard>();
const complianceActivities = new WeakMap<object, { latest: number; active: Set<number> }>();

export function workspaceRequestGuardFor(key: object): WorkspaceRequestGuard {
  const guard = workspaceRequestGuards.get(key) ?? new WorkspaceRequestGuard();
  workspaceRequestGuards.set(key, guard);
  return guard;
}

export function beginExplicitComplianceActivity(key: object): ActivityRequest {
  const activity = complianceActivities.get(key) ?? { latest: 0, active: new Set<number>() };
  const request = { intent: activity.latest + 1 };
  activity.latest = request.intent;
  activity.active.add(request.intent);
  complianceActivities.set(key, activity);
  return request;
}

export function finishExplicitComplianceActivity(key: object, request: ActivityRequest): boolean {
  const activity = complianceActivities.get(key);
  if (activity === undefined) return false;
  activity.active.delete(request.intent);
  return request.intent === activity.latest;
}

export function hasExplicitComplianceActivity(key: object): boolean {
  return (complianceActivities.get(key)?.active.size ?? 0) > 0;
}

interface WorkspacePersistenceInput {
  readonly currentState: AppState;
  readonly isDirty: boolean;
  readonly guard: WorkspaceRequestGuard;
  readonly historyInput: Pick<WorkspaceHistoryInput, "setUndoStack" | "setRedoStack">;
  readonly setState: EditorControllerWorkspaceSetters["setState"];
  readonly setIsDirty: EditorControllerWorkspaceSetters["setIsDirty"];
  readonly onSavedBeforeAction: () => void;
}

export function createWorkspacePersistence(input: WorkspacePersistenceInput) {
  async function persistWorkspace(nextWorkspace: PolicyWorkspace, request: WorkspaceRequest): Promise<{
    workspace: PolicyWorkspace;
    validation: WorkspaceValidationResult;
    sidecar?: AppState["sidecar"];
  } | undefined> {
    const response = await postJson("/api/workspace", { workspace: nextWorkspace });
    const updated = await readJsonResponse<{ workspace: PolicyWorkspace; validation: WorkspaceValidationResult; sidecar?: AppState["sidecar"] }>(response);
    if (!response.ok) throw new Error(JSON.stringify(updated));
    if (!input.guard.isApplicable(request)) return undefined;
    input.setState((current) => current === undefined ? current : {
      ...current,
      workspace: updated.workspace,
      validation: updated.validation,
      sidecar: updated.sidecar ?? current.sidecar,
    });
    input.setIsDirty(false);
    clearWorkspaceHistory(input.historyInput);
    return updated;
  }

  async function ensureSavedWorkspace(request: WorkspaceRequest): Promise<PolicyWorkspace | undefined> {
    if (!input.isDirty) return input.currentState.workspace;
    const updated = await persistWorkspace(input.currentState.workspace, request);
    if (updated === undefined) return undefined;
    input.onSavedBeforeAction();
    return updated.workspace;
  }

  return { persistWorkspace, ensureSavedWorkspace };
}

interface SidecarRequesterInput {
  readonly guard: WorkspaceRequestGuard;
  readonly setState: EditorControllerWorkspaceSetters["setState"];
  readonly onSuccess: (message: string) => void;
  readonly onError: (message: string) => void;
}

export function createSidecarRequester(input: SidecarRequesterInput) {
  async function postSidecarAction(url: string, body: JsonRecord, success: string): Promise<void> {
    const request = input.guard.beginSidecarMutation();
    try {
      const sidecar = await postSidecarActionRequest(url, body, success);
      if (!input.guard.isCurrentSidecarMutation(request)) return;
      input.setState((current) => current === undefined ? current : { ...current, sidecar });
      input.onSuccess(success);
    } catch (error) {
      if (!input.guard.isCurrentSidecarMutation(request)) return;
      input.onError(actionErrorMessage(error));
    }
  }

  async function postArtifactUpdate(url: string, uuid: string, valuesJson: string, success: string): Promise<void> {
    try {
      await postSidecarAction(url, { uuid, values: parseArtifactValuesJson(valuesJson) }, success);
    } catch (error) {
      input.onError(actionErrorMessage(error));
    }
  }

  return { postSidecarAction, postArtifactUpdate };
}

interface KeyRequesterInput {
  readonly guard: WorkspaceRequestGuard;
  readonly setState: EditorControllerWorkspaceSetters["setState"];
  readonly setHasFreshBuild: EditorControllerWorkspaceSetters["setHasFreshBuild"];
  readonly onSuccess: (message: string) => void;
  readonly onError: (message: string) => void;
}

export function createKeyRequester(input: KeyRequesterInput) {
  return async (key: string): Promise<void> => {
    const request = input.guard.beginKeyMutation();
    try {
      const response = await postJson("/api/key", { key });
      const result = await readJsonResponse<KeyUpdateResponse>(response);
      if (!input.guard.isCurrentKeyMutation(request)) return;
      if (!response.ok) { input.onError(`Key update blocked: ${JSON.stringify(result)}`); return; }
      const next = keyResponseState(result);
      input.setState((current) => current === undefined ? current : { ...current, ...next });
      input.setHasFreshBuild(false);
      input.onSuccess(keyStatusMessage(next));
    } catch (error) {
      if (input.guard.isCurrentKeyMutation(request)) input.onError(`Key update failed: ${actionErrorMessage(error)}`);
    }
  };
}

function actionErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
