// Renders and tests generated configuration fields.
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { GeneratedFields } from "./GeneratedFields.js";
import { createDnsTemplate, createObjectListTemplate, createTemplate } from "./generated-fields-test-fixtures.js";

describe("GeneratedFields nested controls", () => {
  it("rejects non-integer entries in integer arrays", () => {
    const onChange = vi.fn();
    render(
      <GeneratedFields
        template={createTemplate([{ path: "levels", label: "Levels", kind: "array", itemKind: "integer", required: false, nullable: false, enumValues: [], enumLabels: {} }])}
        details={{ type: "TEST", uuid: "DETAIL-1", levels: [1, 2] }}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "3\n4abc" } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it("renders supported nested DNS settings in the GUI", () => {
    render(
      <GeneratedFields
        template={createDnsTemplate()}
        details={{ type: "APPLE_DNS_SETTINGS", uuid: "DETAIL-1", dnsSettings: { dnsProtocol: "HTTPS", serverAddresses: ["1.1.1.1", "8.8.8.8"], supplementalMatchDomains: ["example.test", "*.corp.test"] } }}
        onChange={() => {}}
      />,
    );
    expect(screen.queryByText(/some settings are only available in raw json/i)).toBeNull();
    expect(screen.getByText("DNS Settings")).toBeTruthy();
    expect(screen.getAllByRole("textbox").some((element) => (element as HTMLTextAreaElement).value === "1.1.1.1\n8.8.8.8")).toBe(true);
    expect(screen.getAllByRole("textbox").some((element) => (element as HTMLTextAreaElement).value === "example.test\n*.corp.test")).toBe(true);
  });

  it("writes nested string arrays and preserves unknown sibling keys", () => {
    const onChange = vi.fn();
    render(
      <GeneratedFields
        template={createDnsTemplate()}
        details={{ type: "APPLE_DNS_SETTINGS", uuid: "DETAIL-1", dnsSettings: { serverAddresses: ["1.1.1.1"], customResolver: true } }}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("1.1.1.1"), { target: { value: "1.1.1.1\n8.8.8.8" } });
    expect(onChange).toHaveBeenCalledWith({
      type: "APPLE_DNS_SETTINGS",
      uuid: "DETAIL-1",
      dnsSettings: { serverAddresses: ["1.1.1.1", "8.8.8.8"], customResolver: true },
    });
  });

  it("prunes empty parent objects when clearing the last nested optional field", () => {
    const onChange = vi.fn();
    render(
      <GeneratedFields
        template={createDnsTemplate()}
        details={{ type: "APPLE_DNS_SETTINGS", uuid: "DETAIL-1", dnsSettings: { serverAddresses: ["1.1.1.1"] } }}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("1.1.1.1"), { target: { value: "" } });
    expect(onChange).toHaveBeenCalledWith({ type: "APPLE_DNS_SETTINGS", uuid: "DETAIL-1" });
  });

  it("offers an explicit clear action for optional primitive fields", () => {
    const onChange = vi.fn();
    render(
      <GeneratedFields
        template={createTemplate([{ path: "nickname", label: "Nickname", kind: "string", required: false, nullable: false, enumValues: [], enumLabels: {} }])}
        details={{ type: "TEST", uuid: "DETAIL-1", nickname: "alpha" }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /clear nickname/i }));
    expect(onChange).toHaveBeenCalledWith({ type: "TEST", uuid: "DETAIL-1" });
  });

  it("offers an explicit null action for nullable primitive fields", () => {
    const onChange = vi.fn();
    render(
      <GeneratedFields
        template={createTemplate([{ path: "threshold", label: "Threshold", kind: "number", required: true, nullable: true, enumValues: [], enumLabels: {} }])}
        details={{ type: "TEST", uuid: "DETAIL-1", threshold: 42 }}
        onChange={onChange}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: /set threshold to null/i }));
    expect(onChange).toHaveBeenCalledWith({ type: "TEST", uuid: "DETAIL-1", threshold: null });
  });

  it("renders nested object-list editors when array metadata is present", () => {
    const template = createObjectListTemplate();
    expect(template.fields.find((field) => field.path === "rules")?.itemFields?.map((field) => field.path)).toEqual([
      "name", "priority", "weights", "options", "options.enabled", "options.matchDomains",
    ]);
    render(
      <GeneratedFields
        template={template}
        details={{ type: "TEST_OBJECT_LIST", uuid: "DETAIL-1", rules: [{ name: "alpha", priority: 7, weights: [1.5, 2.25], options: { enabled: true, matchDomains: ["example.test", "*.corp.test"] } }] }}
        onChange={() => {}}
      />,
    );
    expect(screen.queryByText(/some settings are only available in raw json/i)).toBeNull();
    expect(screen.getByText("Rules")).toBeTruthy();
    expect(screen.getByText("Options")).toBeTruthy();
    expect(screen.getByDisplayValue("alpha")).toBeTruthy();
    expect(screen.getByDisplayValue("7")).toBeTruthy();
  });

  it("updates nested array object rows and preserves unknown sibling keys", () => {
    const onChange = vi.fn();
    render(
      <GeneratedFields
        template={createObjectListTemplate()}
        details={{ type: "TEST_OBJECT_LIST", uuid: "DETAIL-1", rules: [{ name: "alpha", priority: 7, weights: [1.5], options: { enabled: true }, untouched: "keep-me" }] }}
        onChange={onChange}
      />,
    );
    fireEvent.change(screen.getByDisplayValue("1.5"), { target: { value: "1.5\n2.25" } });
    fireEvent.click(screen.getByRole("button", { name: /remove/i }));
    expect(onChange).toHaveBeenNthCalledWith(1, {
      type: "TEST_OBJECT_LIST",
      uuid: "DETAIL-1",
      rules: [{ name: "alpha", priority: 7, weights: [1.5, 2.25], options: { enabled: true }, untouched: "keep-me" }],
    });
    expect(onChange).toHaveBeenNthCalledWith(2, { type: "TEST_OBJECT_LIST", uuid: "DETAIL-1", rules: [] });
  });
});
