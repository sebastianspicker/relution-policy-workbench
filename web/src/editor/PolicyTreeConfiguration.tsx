/** Renders one configuration row and its move/remove actions. */
import type { JSX } from "react";
import { findAppleCompatSettingForDetails } from "../../../src/apple-compat.js";
import type { ConfigurationTemplate } from "../../../src/templates.js";
import { asRecord } from "./editor-record-utils.js";
import type { Selection } from "./types.js";

export function PolicyTreeConfiguration(props: {
  readonly configuration: unknown;
  readonly configurationIndex: number;
  readonly configurationCount: number;
  readonly policyIndex: number;
  readonly versionIndex: number;
  readonly selection: Selection | undefined;
  readonly templatesByType: ReadonlyMap<string, ConfigurationTemplate>;
  readonly onSelect: (selection: Selection) => void;
  readonly onMove: (selection: Selection, direction: "up" | "down") => void;
  readonly onRemove: (selection: Selection) => void;
}): JSX.Element {
  const details = asRecord(asRecord(props.configuration)?.details);
  const type = typeof details?.type === "string" ? details.type : "UNKNOWN";
  const template = props.templatesByType.get(type);
  const appleCompatSetting = findAppleCompatSettingForDetails(details);
  const label = appleCompatSetting === undefined ? template?.label ?? type : `${appleCompatSetting.label} *`;
  const rowSelection = { policyIndex: props.policyIndex, versionIndex: props.versionIndex, configurationIndex: props.configurationIndex };
  const active = selectionMatches(props.selection, rowSelection);
  const controlCount = configurationControlCount(details, template);
  return (
    <div className="tree-item-row">
      <button className={active ? "tree-item tree-item-select active" : "tree-item tree-item-select"} onClick={() => props.onSelect(rowSelection)}>
        <span className="tree-item-label">{label}</span>
        {controlCount !== undefined ? <span className="tree-count" aria-hidden="true">{controlCount.configured}</span> : null}
        {appleCompatSetting !== undefined
          ? <span className="tree-item-meta">APPLE_MOBILECONFIG / {appleCompatSetting.payloadType}</span>
          : template === undefined ? null : <span className="tree-item-meta">{type}</span>}
        {controlCount !== undefined
          ? <span className="tree-item-meta tree-item-meta--controls">{controlCount.configured} / {controlCount.total} controls</span>
          : null}
      </button>
      <div className="tree-item-actions">
        <button type="button" className="icon-button" title="Move up" aria-label={`Move ${label} up`} disabled={props.configurationIndex === 0} onClick={() => props.onMove(rowSelection, "up")}>↑</button>
        <button type="button" className="icon-button" title="Move down" aria-label={`Move ${label} down`} disabled={props.configurationIndex >= props.configurationCount - 1} onClick={() => props.onMove(rowSelection, "down")}>↓</button>
        <button type="button" className="icon-button" title="Remove" aria-label={`Remove ${label}`} onClick={() => props.onRemove(rowSelection)}>×</button>
      </div>
    </div>
  );
}

function configurationControlCount(
  details: Readonly<Record<string, unknown>> | undefined,
  template: ConfigurationTemplate | undefined,
): { readonly configured: number; readonly total: number } | undefined {
  if (template === undefined || template.fields.length === 0) return undefined;
  const total = template.fields.length;
  const configured = template.fields.filter((field) => {
    const value = details?.[field.path];
    return value !== undefined && value !== null && value !== "";
  }).length;
  return { configured, total };
}

function selectionMatches(selection: Selection | undefined, candidate: Selection): boolean {
  return selection?.policyIndex === candidate.policyIndex
    && selection.versionIndex === candidate.versionIndex
    && selection.configurationIndex === candidate.configurationIndex;
}
