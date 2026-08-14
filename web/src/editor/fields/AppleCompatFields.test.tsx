/** Verifies Apple compatibility controls preserve documented setting semantics. */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  APPLE_COMPAT_SETTINGS,
  createAppleCompatConfiguration,
  extractAppleCompatPayloadBodyJson,
  type AppleCompatSetting,
} from "../../../../src/apple-compat.js";
import { AppleCompatFields } from "./AppleCompatFields.js";
import { getFieldNumberInput } from "./field-test-helpers.js";

describe("AppleCompatFields", () => {
  it("preserves blank optional numeric fields while still accepting zero and positive values", () => {
    const setting = createOptionalNumericSetting();
    withAppleCompatSetting(setting, () => {
      let currentDetails = createAppleCompatConfiguration(setting.id).details as Record<string, unknown>;
      const onError = vi.fn();
      const onChange = vi.fn((nextDetails: Record<string, unknown>) => {
        currentDetails = nextDetails;
      });
      const view = render(<AppleCompatFields setting={setting} details={currentDetails} onChange={onChange} onError={onError} />);

      expect(getPayloadBody(setting, currentDetails)).toEqual({
        OptionalCount: 7,
        OptionalRatio: 1.5,
      });

      fireEvent.change(getFieldNumberInput("Optional count"), { target: { value: "" } });
      expect(getPayloadBody(setting, currentDetails)).toEqual({ OptionalRatio: 1.5 });

      view.rerender(<AppleCompatFields setting={setting} details={currentDetails} onChange={onChange} onError={onError} />);
      fireEvent.change(getFieldNumberInput("Optional count"), { target: { value: "0" } });
      expect(getPayloadBody(setting, currentDetails)).toEqual({
        OptionalCount: 0,
        OptionalRatio: 1.5,
      });

      view.rerender(<AppleCompatFields setting={setting} details={currentDetails} onChange={onChange} onError={onError} />);
      fireEvent.change(getFieldNumberInput("Optional count"), { target: { value: "12.5" } });
      expect(getPayloadBody(setting, currentDetails)).toEqual({
        OptionalCount: 0,
        OptionalRatio: 1.5,
      });

      view.rerender(<AppleCompatFields setting={setting} details={currentDetails} onChange={onChange} onError={onError} />);
      fireEvent.change(getFieldNumberInput("Optional ratio"), { target: { value: "" } });
      expect(getPayloadBody(setting, currentDetails)).toEqual({ OptionalCount: 0 });

      view.rerender(<AppleCompatFields setting={setting} details={currentDetails} onChange={onChange} onError={onError} />);
      fireEvent.change(getFieldNumberInput("Optional ratio"), { target: { value: "2.25" } });
      expect(getPayloadBody(setting, currentDetails)).toEqual({
        OptionalCount: 0,
        OptionalRatio: 2.25,
      });
      expect(onError).not.toHaveBeenCalled();
    });
  });

  it("applies valid payload JSON, rejects invalid JSON, and keeps no-UUID drafts keyed by the setting", () => {
    const setting = createObjectListSetting();
    withAppleCompatSetting(setting, () => {
      let details = createAppleCompatConfiguration(setting.id).details as Record<string, unknown>;
      delete details.uuid;
      const onError = vi.fn();
      const onChange = vi.fn((nextDetails: Record<string, unknown>) => { details = nextDetails; });
      const view = render(<AppleCompatFields setting={setting} details={details} onChange={onChange} onError={onError} />);
      const payloadEditor = screen.getByLabelText(/apple payload json/i) as HTMLTextAreaElement;

      fireEvent.change(payloadEditor, { target: { value: '{"Domains":[{"Name":"example.test"}]}' } });
      fireEvent.click(screen.getByRole("button", { name: /apply payload json/i }));
      expect(getPayloadBody(setting, details)).toEqual({ Domains: [{ Name: "example.test" }] });

      view.rerender(<AppleCompatFields setting={setting} details={details} onChange={onChange} onError={onError} />);
      fireEvent.change(screen.getByLabelText(/apple payload json/i), { target: { value: "[]" } });
      fireEvent.click(screen.getByRole("button", { name: /apply payload json/i }));
      expect(onError).toHaveBeenCalledWith("Payload JSON must be an object");

      fireEvent.click(screen.getByRole("button", { name: /add row/i }));
      expect(getPayloadBody(setting, details)).toEqual({ Domains: [{ Name: "example.test" }, { Name: "" }] });
      expect(onChange).toHaveBeenCalled();
    });
  });
});

function withAppleCompatSetting(setting: AppleCompatSetting, run: () => void): void {
  APPLE_COMPAT_SETTINGS.push(setting);
  try {
    run();
  } finally {
    const index = APPLE_COMPAT_SETTINGS.findIndex((entry) => entry.id === setting.id);
    if (index >= 0) {
      APPLE_COMPAT_SETTINGS.splice(index, 1);
    }
  }
}

function getPayloadBody(setting: AppleCompatSetting, details: Record<string, unknown>): Record<string, unknown> {
  return JSON.parse(extractAppleCompatPayloadBodyJson(details, setting)) as Record<string, unknown>;
}

function createOptionalNumericSetting(): AppleCompatSetting {
  return {
    id: "test-optional-numeric",
    label: "Optional Numeric",
    payloadType: "com.example.optional-numeric",
    platforms: ["IOS"],
    status: "mobileconfig-backed",
    jamfFeature: "Optional numeric profile payload",
    relutionTransportType: "APPLE_MOBILECONFIG",
    description: "",
    sourceUrls: ["https://example.invalid/profile"],
    builder: "generic-json",
    fields: [
      {
        id: "payloadKeysJson",
        label: "Payload keys JSON",
        kind: "json",
        description: "",
        defaultValue: JSON.stringify({ OptionalCount: 7, OptionalRatio: 1.5 }, null, 2),
      },
      {
        id: "optionalCount",
        label: "Optional count",
        kind: "integer",
        description: "",
        defaultValue: undefined,
        payloadKey: "OptionalCount",
      },
      {
        id: "optionalRatio",
        label: "Optional ratio",
        kind: "number",
        description: "",
        defaultValue: undefined,
        payloadKey: "OptionalRatio",
      },
    ],
  };
}

function createObjectListSetting(): AppleCompatSetting {
  return {
    id: "test-object-list",
    label: "Object List",
    payloadType: "com.example.object-list",
    platforms: ["IOS"],
    status: "mobileconfig-backed",
    jamfFeature: "Object list profile payload",
    relutionTransportType: "APPLE_MOBILECONFIG",
    description: "",
    sourceUrls: ["https://example.invalid/profile"],
    builder: "generic-json",
    fields: [
      { id: "payloadKeysJson", label: "Payload keys JSON", kind: "json", description: "", defaultValue: "{}" },
      { id: "domains", label: "Domains", kind: "object-list", description: "", defaultValue: [], payloadKey: "Domains", itemFields: [
        { id: "name", label: "Name", kind: "string", description: "", defaultValue: "", payloadKey: "Name" },
      ] },
    ],
  };
}
