/** Verifies the CLI against a disposable Relution Docker service fixture. */
import test from "node:test";
import { runAppleMobileconfigScenario } from "./relution-docker-apple-scenario.js";
import { runBaselineTemplatesScenario } from "./relution-docker-baselines-scenario.js";

test(
  "local Docker Relution imports a generated Apple mobileconfig policy and exports native settings",
  { timeout: 600_000 },
  runAppleMobileconfigScenario,
);

test(
  "local Docker Relution imports every generated OS baseline template",
  { timeout: 3_600_000 },
  runBaselineTemplatesScenario,
);
