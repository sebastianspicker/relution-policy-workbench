/** Verifies built-in and custom theme controls, persistence, and contrast protection. */
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CUSTOM_THEME_STORAGE_NAME } from "./theme-contract.js";
import { ThemeSwitcher } from "./ThemeSwitcher.js";

afterEach(() => {
  localStorage.clear();
  document.documentElement.removeAttribute("style");
});

describe("ThemeSwitcher", () => {
  it("forwards built-in theme changes", () => {
    const onThemeChange = vi.fn();
    render(<ThemeSwitcher theme="studio" onThemeChange={onThemeChange} />);

    fireEvent.click(screen.getByLabelText(/^dark$/i));

    expect(onThemeChange).toHaveBeenCalledWith("dark");
  });

  it("discloses custom tokens, persists valid values, applies them, and resets", async () => {
    const onThemeChange = vi.fn();
    render(<ThemeSwitcher theme="custom" onThemeChange={onThemeChange} />);

    const disclosure = screen.getByRole("button", { name: /customize tokens/i });
    expect(disclosure.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(disclosure);
    expect(disclosure.getAttribute("aria-expanded")).toBe("true");

    fireEvent.change(screen.getByLabelText(/custom theme page/i), { target: { value: "#ffffff" } });
    await waitFor(() => expect(document.documentElement.style.getPropertyValue("--ci-color-page")).toBe("#ffffff"));
    expect(JSON.parse(localStorage.getItem(CUSTOM_THEME_STORAGE_NAME) ?? "{}")).toMatchObject({ "--ci-color-page": "#ffffff" });
    expect(onThemeChange).toHaveBeenCalledWith("custom");

    fireEvent.click(screen.getByRole("button", { name: /reset custom/i }));
    await waitFor(() => expect(document.documentElement.style.getPropertyValue("--ci-color-page")).toBe("#e8edf2"));
    expect(localStorage.getItem(CUSTOM_THEME_STORAGE_NAME)).toBeNull();
  });

  it("alerts and leaves storage and applied tokens unchanged when contrast is invalid", async () => {
    const onThemeChange = vi.fn();
    render(<ThemeSwitcher theme="custom" onThemeChange={onThemeChange} />);

    fireEvent.click(screen.getByRole("button", { name: /customize tokens/i }));
    await waitFor(() => expect(document.documentElement.style.getPropertyValue("--ci-color-toolbar-text")).toBe("#d7e0ea"));
    fireEvent.change(screen.getByLabelText(/custom theme toolbar text/i), { target: { value: "#121a24" } });

    expect(screen.getByRole("alert").textContent).toMatch(/custom theme not applied/i);
    expect(localStorage.getItem(CUSTOM_THEME_STORAGE_NAME)).toBeNull();
    expect(document.documentElement.style.getPropertyValue("--ci-color-toolbar-text")).toBe("#d7e0ea");
    expect(onThemeChange).not.toHaveBeenCalled();
  });
});
