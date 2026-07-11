import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ConfigurationPickerModal } from "./ConfigurationPickerModal.js";

beforeEach(() => {
  Object.defineProperty(HTMLDialogElement.prototype, "showModal", {
    configurable: true,
    value(this: HTMLDialogElement) {
      this.setAttribute("open", "");
    },
  });
});

describe("ConfigurationPickerModal", () => {
  it("handles native cancel and restores focus to the trigger", () => {
    render(<ModalHarness />);
    const trigger = screen.getByRole("button", { name: /open picker/i });
    trigger.focus();
    fireEvent.click(trigger);

    expect(screen.getByRole("searchbox", { name: /search configurations/i })).toBe(document.activeElement);
    const dialog = screen.getByRole("dialog", { name: /add configuration/i });
    const cancel = new Event("cancel", { bubbles: false, cancelable: true });
    fireEvent(dialog, cancel);

    expect(cancel.defaultPrevented).toBe(true);
    expect(screen.queryByRole("dialog", { name: /add configuration/i })).toBeNull();
    expect(trigger).toBe(document.activeElement);
  });

  it("keeps close and cancel controls keyboard-operable", () => {
    const onClose = vi.fn();
    render(<EmptyPicker onClose={onClose} />);

    const close = screen.getByRole("button", { name: /close/i });
    close.focus();
    fireEvent.keyDown(close, { key: "Enter" });
    fireEvent.click(close);

    expect(onClose).toHaveBeenCalledOnce();
  });
});

function ModalHarness(): React.JSX.Element {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>Open picker</button>
      {open ? <EmptyPicker onClose={() => setOpen(false)} /> : null}
    </>
  );
}

function EmptyPicker({ onClose }: { readonly onClose: () => void }): React.JSX.Element {
  return (
    <ConfigurationPickerModal
      availableTemplates={[]}
      presentNativeTypes={[]}
      availableAppleCompatSettings={[]}
      availableAppleSchemaProfiles={[]}
      customSettingsAvailable={false}
      selectedType=""
      query=""
      group="all"
      onSelectedTypeChange={vi.fn()}
      onQueryChange={vi.fn()}
      onGroupChange={vi.fn()}
      onAdd={vi.fn()}
      onClose={onClose}
    />
  );
}
