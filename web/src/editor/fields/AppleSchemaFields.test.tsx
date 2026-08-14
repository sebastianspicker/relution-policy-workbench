/** Verifies Apple schema fields render supported controls and preserve profile values. */
import { fireEvent, render, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  createAppleSchemaProfileConfiguration,
  extractAppleSchemaPayloadBodyJson,
  type AppleSchemaEntry,
} from "../../../../src/apple-schema.js";
import { AppleSchemaFields } from "./AppleSchemaFields.js";
import { createOptionalParityAppleSchemaEntry } from "../../../../tests/rexp-apple-compat-fixtures.js";
import { getFieldContainer, getFieldNumberInput } from "./field-test-helpers.js";

describe("AppleSchemaFields", () => {
  it("preserves omit versus explicit optional boolean number and enum values", () => {
    const entry = createOptionalParityAppleSchemaEntry();
    let currentDetails = createAppleSchemaProfileConfiguration(entry, { requiredName: "alpha" }).details as Record<string, unknown>;
    const onError = vi.fn();
    const onChange = vi.fn((nextDetails: Record<string, unknown>) => {
      currentDetails = nextDetails;
    });
    const view = render(<AppleSchemaFields entry={entry} details={currentDetails} onChange={onChange} onError={onError} />);

    expect(getPayloadBody(entry, currentDetails)).toEqual({ RequiredName: "alpha" });

    const toggleSelect = getFieldCombobox("Optional toggle");
    fireEvent.change(toggleSelect, { target: { value: "false" } });
    expect(getPayloadBody(entry, currentDetails)).toEqual({
      RequiredName: "alpha",
      OptionalToggle: false,
    });

    view.rerender(<AppleSchemaFields entry={entry} details={currentDetails} onChange={onChange} onError={onError} />);
    fireEvent.change(getFieldCombobox("Optional toggle"), { target: { value: getFieldCombobox("Optional toggle").options[0]!.value } });
    expect(getPayloadBody(entry, currentDetails)).toEqual({ RequiredName: "alpha" });

    view.rerender(<AppleSchemaFields entry={entry} details={currentDetails} onChange={onChange} onError={onError} />);
    fireEvent.change(getFieldNumberInput("Optional count"), { target: { value: "0" } });
    expect(getPayloadBody(entry, currentDetails)).toEqual({
      RequiredName: "alpha",
      OptionalCount: 0,
    });

    view.rerender(<AppleSchemaFields entry={entry} details={currentDetails} onChange={onChange} onError={onError} />);
    fireEvent.change(getFieldNumberInput("Optional count"), { target: { value: "" } });
    expect(getPayloadBody(entry, currentDetails)).toEqual({ RequiredName: "alpha" });

    view.rerender(<AppleSchemaFields entry={entry} details={currentDetails} onChange={onChange} onError={onError} />);
    fireEvent.change(getFieldCombobox("Optional mode"), { target: { value: "manual" } });
    expect(getPayloadBody(entry, currentDetails)).toEqual({
      RequiredName: "alpha",
      OptionalMode: "manual",
    });

    view.rerender(<AppleSchemaFields entry={entry} details={currentDetails} onChange={onChange} onError={onError} />);
    fireEvent.change(getFieldCombobox("Optional mode"), { target: { value: getFieldCombobox("Optional mode").options[0]!.value } });
    expect(getPayloadBody(entry, currentDetails)).toEqual({ RequiredName: "alpha" });
    expect(onError).not.toHaveBeenCalled();
  });

  it("rejects non-integer Apple schema integer input", () => {
    const entry = createOptionalParityAppleSchemaEntry();
    const details = createAppleSchemaProfileConfiguration(entry, { requiredName: "alpha" }).details as Record<string, unknown>;
    const onError = vi.fn();
    const onChange = vi.fn();
    render(<AppleSchemaFields entry={entry} details={details} onChange={onChange} onError={onError} />);

    fireEvent.change(getFieldNumberInput("Optional count"), { target: { value: "12abc" } });

    expect(onChange).not.toHaveBeenCalled();
    expect(onError).not.toHaveBeenCalled();
  });
});

function getFieldCombobox(fieldTitle: string): HTMLSelectElement {
  return within(getFieldContainer(fieldTitle)).getByRole("combobox");
}

function getPayloadBody(entry: AppleSchemaEntry, details: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(extractAppleSchemaPayloadBodyJson(details, entry)) as Record<string, unknown>;
}
