/** Instrument strip showing workspace scope, schema ring, and workflow stage. */
import type { JSX } from "react";
import { provenanceSchemaLabel, resolveProvenanceStage, type ProvenanceStep } from "./provenance-stage.js";
import type { AppSection } from "./SectionRoute.js";
import type { EditorController } from "./types.js";

export function ProvenanceStrip(props: {
  readonly appSection: AppSection;
  readonly controller: EditorController;
}): JSX.Element {
  const { appSection, controller } = props;
  const schema = provenanceSchemaLabel(controller.state.bundle?.serverVersion);
  const steps = resolveProvenanceStage({
    appSection,
    workspaceLoaded: controller.state.workspace !== undefined,
    hasFreshBuild: controller.hasFreshBuild,
  });

  return (
    <div className="provenance-strip" aria-label="Workspace provenance">
      <div className="provenance-item">
        <span className="provenance-dot" aria-hidden="true" />
        <span className="provenance-label">Scope</span>
        <span className="provenance-value">Local workspace</span>
      </div>
      <div className="provenance-item">
        <span className="provenance-label">Schema</span>
        <span className="provenance-value">{schema}</span>
      </div>
      <div className="provenance-item">
        <span className="provenance-label">Ring</span>
        <span className="provenance-value">LAB</span>
      </div>
      <div className="provenance-stage" aria-label="Workflow stage">
        {steps.map((step, index) => (
          <ProvenanceStageStep key={step.id} step={step} showLine={index < steps.length - 1} />
        ))}
      </div>
      <div className="provenance-item">
        <span className="provenance-label">Tenant write</span>
        <span className="provenance-value">Disabled</span>
      </div>
    </div>
  );
}

function ProvenanceStageStep(props: {
  readonly step: ProvenanceStep;
  readonly showLine: boolean;
}): JSX.Element {
  const { step, showLine } = props;
  const modifier = step.state === "done"
    ? "provenance-step--done"
    : step.state === "current"
      ? "provenance-step--current"
      : "";
  const tick = step.state === "done" ? "✓" : String(step.index);

  return (
    <>
      <div className={`provenance-step${modifier.length > 0 ? ` ${modifier}` : ""}`}>
        <span className="provenance-tick" aria-hidden="true">{tick}</span>
        <span>{step.label}</span>
      </div>
      {showLine ? <div className="provenance-line" aria-hidden="true" /> : null}
    </>
  );
}
