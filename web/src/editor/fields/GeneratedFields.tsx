// Renders and tests generated configuration fields.
import type { JSX } from "react";
import type { ConfigurationTemplate } from "../../../../src/templates.js";
import type { JsonRecord } from "../types.js";
import { GeneratedFieldNode } from "./generated-fields-node.js";
import { hasRenderableContent, isRenderableField } from "./generated-fields-renderability.js";
import { buildFieldTree } from "./generated-fields-tree.js";

export function GeneratedFields(props: {
  template: ConfigurationTemplate;
  details: JsonRecord;
  onChange: (details: JsonRecord) => void;
}): JSX.Element {
  const editableFields = props.template.fields.filter((field) => field.path !== "uuid" && field.path !== "type");
  const fieldTree = buildFieldTree(editableFields);
  const unsupportedFields = collectUnsupportedFields(fieldTree);
  return (
    <div className="field-grid">
      {props.template.portalHidden ? <p className="warning">Portal hidden type</p> : null}
      {unsupportedFields.length > 0 ? (
        <p className="warning">
          Some settings are only available in Raw JSON: {unsupportedFields.map((field) => field.label).join(", ")}.
        </p>
      ) : null}
      {fieldTree.map((node) => (
        <GeneratedFieldNode key={node.field.path} node={node} details={props.details} onChange={props.onChange} nested={false} keyPrefix="" />
      ))}
    </div>
  );
}

function collectUnsupportedFields(nodes: ReturnType<typeof buildFieldTree>): ConfigurationTemplate["fields"] {
  const unsupported = [] as ConfigurationTemplate["fields"];
  for (const node of nodes) {
    if (node.field.kind === "object" && node.children.some(hasRenderableContent)) {
      unsupported.push(...collectUnsupportedFields(node.children));
    } else if (!isRenderableField(node.field)) {
      unsupported.push(node.field);
    }
  }
  return unsupported;
}
