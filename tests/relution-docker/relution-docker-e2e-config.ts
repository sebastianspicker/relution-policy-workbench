// Supports Relution Docker end-to-end test scenarios and helpers.
const dockerPort = process.env.RELUTION_DOCKER_PORT ?? "8080";

export const baseUrl = process.env.RELUTION_E2E_BASE_URL ?? `http://127.0.0.1:${dockerPort}`;
export const archiveSecret = process.env.RELUTION_E2E_REXP_KEY ?? ["key", "123"].join("");

export function relutionE2eApiUrl(
  segments: readonly string[],
  options: {
    readonly baseUrlValue?: string;
    readonly allowRemoteBaseUrl?: boolean;
  } = {},
): URL {
  const parsedBase = relutionE2eBaseUrl(
    options.baseUrlValue ?? baseUrl,
    options.allowRemoteBaseUrl ?? process.env.RELUTION_E2E_ALLOW_REMOTE_BASE_URL === "1",
  );
  const basePath = parsedBase.pathname === "/" ? "" : parsedBase.pathname.replace(/\/$/u, "");
  parsedBase.pathname = `${basePath}/${segments.map((segment) => encodeURIComponent(segment)).join("/")}`;
  parsedBase.search = "";
  parsedBase.hash = "";
  return parsedBase;
}

function relutionE2eBaseUrl(value: string, allowRemoteBaseUrl: boolean): URL {
  const parsed = new URL(value);
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`Relution E2E base URL must use http or https: ${value}`);
  }
  if (!allowRemoteBaseUrl && !isLoopbackHost(parsed.hostname)) {
    throw new Error(
      `Relution E2E base URL must be loopback unless RELUTION_E2E_ALLOW_REMOTE_BASE_URL=1 is set: ${parsed.hostname}`,
    );
  }
  return parsed;
}

function isLoopbackHost(hostname: string): boolean {
  return hostname === "127.0.0.1" || hostname === "localhost" || hostname === "::1" || hostname === "[::1]";
}
