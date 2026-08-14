/** Verifies mobileconfig payload and derived-state behavior. */
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createAppleCompatConfiguration } from "../../../../src/apple-compat.js";
import { MobileConfigFields } from "./MobileConfigFields.js";
import { brokenMobileConfigXml } from "./mobile-config-test-helpers.js";

describe("MobileConfigFields", () => {
  it("clears derived payload state when xml stays unsigned but becomes unparsable", () => {
    const onChange = vi.fn();
    const onError = vi.fn();
    const details = createAppleCompatConfiguration("associated-domains").details as Record<string, unknown>;
    const { container } = render(<MobileConfigFields details={details} onChange={onChange} onError={onError} />);
    const textarea = container.querySelector("textarea.mobileconfig-textarea");

    expect(textarea).toBeTruthy();

    fireEvent.change(textarea!, {
      target: {
        value: brokenMobileConfigXml(),
      },
    });

    expect(onError).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({
        rawContent: expect.stringContaining("com.apple.associated-domains"),
        payloadContent: {},
        secondLevelPayloadType: "",
        mobileConfigSignatureState: "signed-invalid",
      }),
    );
  });

  it("shows detected payload type as read-only display data", () => {
    const onChange = vi.fn();
    const details = createAppleCompatConfiguration("associated-domains").details as Record<string, unknown>;

    render(<MobileConfigFields details={details} onChange={onChange} onError={vi.fn()} />);

    const payloadTypeInput = screen.getByDisplayValue("com.apple.associated-domains");

    expect(payloadTypeInput.hasAttribute("readonly")).toBe(true);

    fireEvent.change(payloadTypeInput, {
      target: {
        value: "com.example.changed",
      },
    });

    expect(onChange).not.toHaveBeenCalled();
  });
});
