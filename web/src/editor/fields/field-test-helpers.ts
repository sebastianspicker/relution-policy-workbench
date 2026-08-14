/** Provides DOM query helpers for editor field tests. */
import { screen, within } from "@testing-library/react";

export function getFieldContainer(fieldTitle: string): HTMLElement {
  const container = screen.getByText(fieldTitle).closest(".field, .checkbox-field");
  if (container === null) throw new Error(`Missing field container for ${fieldTitle}`);
  return container as HTMLElement;
}

export function getFieldNumberInput(fieldTitle: string): HTMLInputElement {
  return within(getFieldContainer(fieldTitle)).getByRole("spinbutton");
}
