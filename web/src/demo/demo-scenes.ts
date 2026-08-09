/** Defines the small, deterministic public tour without reproducing editor state or API behavior. */
export type DemoSceneId = "overview" | "baseline" | "policy" | "audit";

export interface DemoScene {
  readonly id: DemoSceneId;
  readonly label: string;
  readonly heading: string;
  readonly description: string;
  readonly detail: string;
  readonly imageUrl: string;
  readonly imageAlt: string;
}

export const DEMO_SCENES: readonly DemoScene[] = [
  {
    id: "overview",
    label: "Workbench",
    heading: "A local policy workspace",
    description: "Inspect the editor shell, policy navigation, validation surface, and build posture in one deterministic workspace.",
    detail: "The capture uses mocked local API responses and a fixture iOS policy. No archive, tenant, or credential is loaded by this page.",
    imageUrl: new URL("../../../docs/readme-tour/01-editor-overview.png", import.meta.url).href,
    imageAlt: "REXP Studio workbench with policy navigation, an empty editor selection, and local validation status.",
  },
  {
    id: "baseline",
    label: "Baseline",
    heading: "Build from reviewed guidance",
    description: "Step through the guided baseline builder before moving into the policy editor.",
    detail: "The selected platform, tier, modules, and coverage are sanitized fixture values. Applying a baseline is shown only as a simulated command.",
    imageUrl: new URL("../../../docs/readme-tour/02-baseline-guided.png", import.meta.url).href,
    imageAlt: "REXP Studio guided baseline builder with iOS platform and tier controls.",
  },
  {
    id: "policy",
    label: "Policy",
    heading: "Edit policy configuration",
    description: "Review a representative iOS passcode configuration with schema status, compatibility notes, and assurance context.",
    detail: "The policy names, identifiers, configuration values, and validation results are deterministic repository fixtures.",
    imageUrl: new URL("../../../docs/readme-tour/04-policy-editor.png", import.meta.url).href,
    imageAlt: "REXP Studio policy editor showing an iOS passcode configuration and assurance inspector.",
  },
  {
    id: "audit",
    label: "Device audit",
    heading: "Review read-only posture",
    description: "Inspect the shape of a read-only device assessment and its local report workflow.",
    detail: "Device names, users, service addresses, timestamps, and findings are sanitized fixture data. No Relution or Zammad request can leave this page.",
    imageUrl: new URL("../../../docs/readme-tour/07-device-audit.png", import.meta.url).href,
    imageAlt: "REXP Studio read-only device audit with sanitized iPad findings and report summary.",
  },
] as const;

export function sceneFromHash(hash: string): DemoSceneId {
  const candidate = hash.replace(/^#\/?/u, "").replace(/^tour\//u, "");
  return DEMO_SCENES.some((scene) => scene.id === candidate) ? candidate as DemoSceneId : "overview";
}
