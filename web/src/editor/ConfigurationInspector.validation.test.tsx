/** Verifies inspector validation and assurance behavior. */
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ConfigurationInspector } from "./ConfigurationInspector.js";
import { createAppState, createEditorControllerStub } from "./useEditorController.test-helpers.js";

describe("ConfigurationInspector", () => {
  it("does not surface save status as an alert (status lives in StatusBar)", () => {
    const controller = createEditorControllerStub({
      inspectorTab: "validation",
      setInspectorTab: vi.fn(),
      status: "Save failed: validation error",
      isDirty: false,
      rulesetReport: undefined,
    });

    render(<ConfigurationInspector controller={controller} />);

    expect(screen.queryByRole("alert")).toBeNull();
    expect(screen.getByRole("status").textContent).toMatch(/LOCAL · not a live tenant/i);
    expect(screen.queryByText(/Save failed/i)).toBeNull();
  });

  it("shows Assurance heading with local checks chip and boundary badge", () => {
    const controller = createEditorControllerStub({
      inspectorTab: "validation",
      setInspectorTab: vi.fn(),
      isDirty: false,
      rulesetReport: undefined,
    });

    render(<ConfigurationInspector controller={controller} />);

    expect(screen.getByRole("heading", { name: /^Assurance$/i })).toBeTruthy();
    expect(screen.getByText(/local checks/i)).toBeTruthy();
    expect(screen.getByRole("status").textContent).toMatch(/LOCAL · not a live tenant/i);
  });

  it("shows schema compatibility warnings when validation succeeds with weakened schemas", () => {
    const state = createAppState();
    state.validation = {
      ok: true,
      errors: [],
      schemaCompatibilityIssueCount: 2,
      schemaCompatibilityIssues: [
        {
          schemaName: "FirstSchema",
          path: "FirstSchema.properties.name",
          kind: "invalid-pattern",
          pattern: "[",
          message: "Invalid regular expression",
        },
        {
          schemaName: "SecondSchema",
          path: "SecondSchema.properties.code",
          kind: "invalid-pattern",
          pattern: "(",
          message: "Invalid regular expression",
        },
      ],
    };
    const controller = createEditorControllerStub({
      state,
      inspectorTab: "validation",
      isDirty: false,
      rulesetReport: undefined,
    });

    render(<ConfigurationInspector controller={controller} />);

    expect(screen.getByText(/validation degraded: 2 regex constraints removed/i)).toBeTruthy();
    expect(screen.getByText("FirstSchema.properties.name")).toBeTruthy();
    expect(screen.getByText("SecondSchema.properties.code")).toBeTruthy();
    expect(screen.queryByText(/^Workspace valid$/u)).toBeNull();
  });

  it("keeps the plain valid state when validation has no schema compatibility warnings", () => {
    const state = createAppState();
    state.validation = { ok: true, errors: [], schemaCompatibilityIssueCount: 0 };
    const controller = createEditorControllerStub({
      state,
      inspectorTab: "validation",
      isDirty: false,
      rulesetReport: undefined,
    });

    render(<ConfigurationInspector controller={controller} />);

    expect(screen.getByText(/^Workspace valid$/u)).toBeTruthy();
  });
});
