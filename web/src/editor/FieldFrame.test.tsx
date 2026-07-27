/** Verifies field labels, descriptions, required state, and errors are associated with controls. */
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { FieldFrame } from "./FieldFrame.js";

describe("FieldFrame", () => {
  it("associates a visible label, metadata, and error with its control", () => {
    const { container } = render(
      <FieldFrame label="Minimum passcode length" path="payload.minimumLength" description="Number of characters." required error="Must be at least 6.">
        <input />
      </FieldFrame>,
    );
    const control = screen.getByRole("textbox", { name: /minimum passcode length/i });
    expect(control.getAttribute("aria-invalid")).toBe("true");
    expect(control.getAttribute("aria-required")).toBe("true");
    expect(control.getAttribute("aria-describedby")).toContain("description");
    expect(control.getAttribute("aria-describedby")).toContain("error");
    expect(screen.getByRole("alert").textContent).toContain("at least 6");
    expect(container.querySelector(".field-main")).toBeTruthy();
    expect(container.querySelector(".field-control")).toBeTruthy();
    expect(container.querySelector(".field-path")?.textContent).toBe("payload.minimumLength");
  });
});
