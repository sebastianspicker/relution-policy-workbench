// Supports Relution Docker end-to-end test scenarios and helpers.
import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { baseUrl } from "./relution-docker-e2e-config.js";

const composeFile = resolve("tests/relution-docker/compose.yml");
const composeProject = process.env.RELUTION_DOCKER_PROJECT ?? "rexp-studio-e2e";

/** Polls the fixture service because Docker startup is asynchronous in CI. */
async function waitForRelution(): Promise<void> {
  const deadline = Date.now() + 480_000;
  let lastError = "";
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${baseUrl}/`);
      if (response.status < 500) {
        return;
      }
      lastError = `${response.status} ${response.statusText}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    const ps = dockerCompose(["ps", "-a", "relution"], false);
    if (ps.includes("Exited") || ps.includes("Restarting")) {
      throw new Error(`Relution container stopped before becoming reachable at ${baseUrl}: ${lastError}`);
    }
    await delay(5_000);
  }
  throw new Error(`Relution did not become reachable at ${baseUrl}: ${lastError}`);
}

function dockerCompose(args: string[], check = true): string {
  const result = spawnSync("docker", ["compose", "-f", composeFile, "-p", composeProject, ...args], {
    cwd: resolve("."),
    encoding: "utf8",
    env: process.env,
  });
  const output = `${result.stdout}${result.stderr}`;
  if (check && result.status !== 0) {
    throw new Error(`docker compose ${args.join(" ")} failed with status ${String(result.status)}\n${output}`);
  }
  return output;
}

/** Run one scenario with deterministic startup, diagnostics, and teardown. */
export async function runRelutionScenario(
  logTail: number,
  scenario: () => Promise<void>,
): Promise<void> {
  dockerCompose(["up", "-d"]);
  try {
    await waitForRelution();
    await scenario();
  } catch (error) {
    const logs = dockerCompose(
      ["logs", "--no-color", "--tail", String(logTail), "relution"],
      false,
    );
    throw new Error(`${error instanceof Error ? error.message : String(error)}\n\nRelution logs:\n${logs}`);
  } finally {
    if (process.env.RELUTION_DOCKER_KEEP !== "1") {
      dockerCompose(["down", "--volumes", "--remove-orphans"], false);
    }
  }
}

/** Keeps retry timing explicit at Docker readiness boundaries. */
export async function delay(milliseconds: number): Promise<void> {
  await new Promise((resolveDelay) => {
    setTimeout(resolveDelay, milliseconds);
  });
}
