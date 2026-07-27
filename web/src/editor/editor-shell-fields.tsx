/** Selects the concrete editor for a resolved configuration type. */
import type { JSX } from "react";
import { AppleCompatFields } from "./fields/AppleCompatFields.js";
import { AppleSchemaFields } from "./fields/AppleSchemaFields.js";
import { GeneratedFields } from "./fields/GeneratedFields.js";
import { MobileConfigFields } from "./fields/MobileConfigFields.js";
import type { EditorController } from "./types.js";

export function EditorFields({ controller }: { readonly controller: EditorController }): JSX.Element {
  const details = controller.details;
  const configuration = controller.configuration;
  if (configuration === undefined || details === undefined) return <div className="empty-state">No editable configuration selected.</div>;
  const updateDetails = (nextDetails: Record<string, unknown>) => controller.updateSelectedConfiguration({ ...configuration, details: nextDetails });
  if (controller.appleCompatSetting !== undefined) return <AppleCompatFields setting={controller.appleCompatSetting} details={details} onError={controller.setStatus} onChange={updateDetails} />;
  if (controller.appleSchemaProfile !== undefined) return <AppleSchemaFields entry={controller.appleSchemaProfile} details={details} onError={controller.setStatus} onChange={updateDetails} />;
  if (details.type === "APPLE_MOBILECONFIG") return <MobileConfigFields details={details} onError={controller.setStatus} onChange={updateDetails} />;
  if (controller.template !== undefined) return <GeneratedFields template={controller.template} details={details} onChange={updateDetails} />;
  return <div className="empty-state">No editable configuration selected.</div>;
}
