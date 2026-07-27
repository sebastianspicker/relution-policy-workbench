// Renders and tests generated configuration fields.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GeneratedFields } from "./GeneratedFields.js";
import { createNestedObjectField, createTemplate } from "./generated-fields-test-fixtures.js";

describe("GeneratedFields input and JSON controls", () => {
  it("writes real null for nullable enum selections", () => {
    const onChange = vi.fn();
    render(
      <GeneratedFields
        template={createTemplate([{ path: "mode", label: "Mode", kind: "string", required: false, nullable: true, enumValues: ["AUTO", "MANUAL"], enumLabels: { AUTO: "Auto", MANUAL: "Manual" } }])}
        details={{ type: "TEST", uuid: "DETAIL-1", mode: "AUTO" }}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "__NULL__" } });
    expect(onChange).toHaveBeenCalledWith({ type: "TEST", uuid: "DETAIL-1", mode: null });
  });

  it("renders and applies field-scoped JSON editors", () => {
    const onChange = vi.fn();
    render(
      <GeneratedFields
        template={createTemplate([createNestedObjectField()])}
        details={{ type: "TEST", uuid: "DETAIL-1", nested: { mode: "guided" } }}
        onChange={onChange}
      />,
    );
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toBe('{\n  "mode": "guided"\n}');
    fireEvent.change(screen.getByRole("textbox"), { target: { value: '{\n  "mode": "json"\n}' } });
    fireEvent.click(screen.getByRole("button", { name: /apply nested json/i }));
    expect(onChange).toHaveBeenCalledWith({ type: "TEST", uuid: "DETAIL-1", nested: { mode: "json" } });
  });

  it("labels the JSON apply action with its field name", () => {
    render(
      <GeneratedFields
        template={createTemplate([createNestedObjectField()])}
        details={{ type: "TEST", uuid: "DETAIL-1", nested: { mode: "guided" } }}
        onChange={() => {}}
      />,
    );
    expect(screen.getByRole("button", { name: /apply nested json/i })).toBeTruthy();
  });

  it("preserves unsaved object JSON drafts when parent details change", () => {
    const template = createTemplate([createNestedObjectField()]);
    const { rerender } = render(
      <GeneratedFields template={template} details={{ type: "TEST", uuid: "DETAIL-1", nested: { mode: "initial" } }} onChange={() => {}} />,
    );
    fireEvent.change(screen.getByRole("textbox"), { target: { value: '{\n  "mode": "draft"\n}' } });
    rerender(<GeneratedFields template={template} details={{ type: "TEST", uuid: "DETAIL-1", nested: { mode: "server" } }} onChange={() => {}} />);
    expect((screen.getByRole("textbox") as HTMLTextAreaElement).value).toContain('"draft"');
    expect(screen.getByText(/unsaved json draft preserved/i)).toBeTruthy();
  });

  it("applies array-of-object JSON edits through the native GUI", () => {
    const onChange = vi.fn();
    render(
      <GeneratedFields
        template={createTemplate([{ path: "whitelistedApps", label: "Whitelisted Apps", kind: "array", itemKind: "object", required: false, nullable: false, enumValues: [], enumLabels: {} }])}
        details={{ type: "TEST", uuid: "DETAIL-1", whitelistedApps: [{ packageName: "com.example.one" }] }}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), { target: { value: '[\n  {\n    "packageName": "com.example.two"\n  }\n]' } });
    fireEvent.click(screen.getByRole("button", { name: /apply whitelisted apps json/i }));
    expect(onChange).toHaveBeenCalledWith({ type: "TEST", uuid: "DETAIL-1", whitelistedApps: [{ packageName: "com.example.two" }] });
  });

  it("applies number arrays and rejects invalid integer input", () => {
    const onChange = vi.fn();
    const { rerender } = render(
      <GeneratedFields
        template={createTemplate([{ path: "levels", label: "Levels", kind: "array", itemKind: "number", required: false, nullable: false, enumValues: [], enumLabels: {} }])}
        details={{ type: "TEST", uuid: "DETAIL-1", levels: [1, 2] }}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "3\n4" } });
    expect(onChange).toHaveBeenCalledWith({ type: "TEST", uuid: "DETAIL-1", levels: [3, 4] });

    rerender(
      <GeneratedFields
        template={createTemplate([{ path: "priority", label: "Priority", kind: "integer", required: false, nullable: false, enumValues: [], enumLabels: {} }])}
        details={{ type: "TEST", uuid: "DETAIL-1", priority: 1 }}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "12.5" } });
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("rejects a fractional integer value", () => {
    const onChange = vi.fn();
    render(
      <GeneratedFields
        template={createTemplate([{ path: "priority", label: "Priority", kind: "integer", required: false, nullable: false, enumValues: [], enumLabels: {} }])}
        details={{ type: "TEST", uuid: "DETAIL-1", priority: 1 }}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByRole("spinbutton"), { target: { value: "12.5" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("retains numeric clear and nullable reset semantics through the extracted control dispatch", () => {
    const onChange = vi.fn();
    render(
      <GeneratedFields
        template={createTemplate([
          { path: "optionalThreshold", label: "Optional Threshold", kind: "number", required: false, nullable: false, enumValues: [], enumLabels: {} },
          { path: "nullableThreshold", label: "Nullable Threshold", kind: "number", required: true, nullable: true, enumValues: [], enumLabels: {} },
        ])}
        details={{ type: "TEST", uuid: "DETAIL-1", optionalThreshold: 4, nullableThreshold: 9 }}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByRole("spinbutton", { name: "Optional Threshold (optionalThreshold)" }), { target: { value: "" } });
    fireEvent.change(screen.getByRole("spinbutton", { name: "Nullable Threshold (nullableThreshold)" }), { target: { value: "" } });
    expect(onChange).toHaveBeenNthCalledWith(1, { type: "TEST", uuid: "DETAIL-1", nullableThreshold: 9 });
    expect(onChange).toHaveBeenNthCalledWith(2, { type: "TEST", uuid: "DETAIL-1", optionalThreshold: 4, nullableThreshold: null });
  });
});
