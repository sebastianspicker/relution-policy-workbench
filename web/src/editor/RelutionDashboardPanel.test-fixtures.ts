// Supports the editor UI and its focused test scenarios.
import { fireEvent, render, screen } from "@testing-library/react";
import { createElement } from "react";
import { vi } from "vitest";
import { RelutionDashboardPanel } from "./RelutionDashboardPanel.js";
import { jsonResponse } from "./RelutionDashboardPanel.response-fixtures.js";

type ApiRoute = (init: RequestInit | undefined) => Response | Promise<Response>;

export function renderDashboard(): void {
  render(createElement(RelutionDashboardPanel));
}

export function mockDashboardApi(routes: Readonly<Record<string, ApiRoute>>): void {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.pathname : input.url;
    const matchingRoute = Object.entries(routes).find(([path]) => path === url);
    if (matchingRoute === undefined) throw new Error(`Unhandled fetch: ${url}`);
    const [, handler] = matchingRoute;
    return handler(init);
  });
}

export function configuredRelutionSession(baseUrl = "https://relution.example.test"): Response {
  return jsonResponse({ configured: true, baseUrl, tokenConfigured: true, mode: "read-only" });
}

export function configuredZammadSession(baseUrl = "https://zammad.example.test"): Response {
  return jsonResponse({ configured: true, baseUrl, tokenConfigured: true, group: "IT", customer: "it@example.test" });
}

export async function configureRelution(baseHost = "relution.example.test"): Promise<void> {
  fireEvent.change(screen.getAllByLabelText(/server/i)[0]!, { target: { value: baseHost } });
  fireEvent.change(screen.getAllByLabelText(/api token/i)[0]!, { target: { value: "secret-token" } });
  fireEvent.click(screen.getByRole("button", { name: /set session/i }));
  await screen.findByText(`Relution https://${baseHost} | read-only`);
}

export async function configureZammad(baseHost = "zammad.example.test"): Promise<void> {
  fireEvent.change(screen.getAllByLabelText(/server/i)[1]!, { target: { value: baseHost } });
  fireEvent.change(screen.getAllByLabelText(/api token/i)[1]!, { target: { value: "zammad-token" } });
  fireEvent.change(screen.getByLabelText(/customer/i), { target: { value: "it@example.test" } });
  fireEvent.click(screen.getByRole("button", { name: /set zammad/i }));
  await screen.findByText(`Zammad https://${baseHost}`);
}
