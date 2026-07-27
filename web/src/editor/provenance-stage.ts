/** Pure helpers for the workspace provenance workflow stage. */
import type { AppSection } from "./SectionRoute.js";

type ProvenanceStepId = "select" | "configure" | "assure" | "build";
type ProvenanceStepState = "done" | "current" | "pending";

export type ProvenanceStep = {
  readonly id: ProvenanceStepId;
  readonly label: string;
  readonly index: number;
  readonly state: ProvenanceStepState;
};

const STEPS: readonly { readonly id: ProvenanceStepId; readonly label: string }[] = [
  { id: "select", label: "Select" },
  { id: "configure", label: "Configure" },
  { id: "assure", label: "Assure" },
  { id: "build", label: "Build" },
];

export function resolveProvenanceStage(input: {
  readonly appSection: AppSection;
  readonly workspaceLoaded: boolean;
  readonly hasFreshBuild: boolean;
}): readonly ProvenanceStep[] {
  if (!input.workspaceLoaded) {
    return STEPS.map((step, index) => ({
      ...step,
      index: index + 1,
      state: index === 0 ? "current" : "pending",
    }));
  }

  const currentIndex = currentStageIndex(input.appSection, input.hasFreshBuild);

  return STEPS.map((step, index) => {
    let state: ProvenanceStepState;
    if (index < currentIndex) {
      state = "done";
    } else if (index === currentIndex) {
      state = "current";
    } else if (step.id === "build" && input.hasFreshBuild) {
      state = "done";
    } else {
      state = "pending";
    }
    return { ...step, index: index + 1, state };
  });
}

function currentStageIndex(section: AppSection, hasFreshBuild: boolean): number {
  if (section === "settings") return 3;
  if (section === "baselines" || section === "device-audit") return 2;
  if (section === "policies") return 1;
  if (hasFreshBuild) return 3;
  return 1;
}

export function provenanceSchemaLabel(serverVersion: string | undefined): string {
  const version = serverVersion?.trim();
  if (version !== undefined && version.length > 0) {
    return version.startsWith("Relution") ? version : `Relution ${version}`;
  }
  return "Relution 26.1.1";
}
