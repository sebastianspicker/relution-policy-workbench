// Supports local Codacy Cloud cache and configuration workflows.
import {
  copyFileSync,
  readFileSync,
  writeFileSync,
} from "node:fs";

const POLICY_EXCLUDES = [
  "private/**",
  "node_modules/**",
  "docs/archive/**",
];

/** Make fetched configuration portable and restore mandatory public/private exclusions. */
function normalizeRepositoryConfigPaths(path) {
  const config = JSON.parse(readFileSync(path, "utf8"));
  for (const tool of config.tools ?? []) {
    if (tool.localConfigurationFile?.endsWith("/pyproject.toml")) {
      tool.localConfigurationFile = "pyproject.toml";
    }
  }
  const excludes = new Set(config.exclude ?? []);
  for (const exclude of POLICY_EXCLUDES) {
    excludes.add(exclude);
  }
  config.exclude = [...excludes];
  writeJson(path, config);
  return config;
}

/** Write deterministic, reviewable JSON with a trailing newline. */
function writeJson(path, value) {
  writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

/** Remove volatile timestamps before comparing fetched and mirrored configurations. */
function comparableConfig(path) {
  const config = normalizeRepositoryConfigPaths(path);
  delete config.metadata?.createdAt;
  delete config.metadata?.updatedAt;
  return JSON.stringify(config);
}

/** Mirror the normalized Cloud config and fail if the resulting files diverge. */
export function syncLocalConfigFromRemote(configPath, localConfigPath) {
  normalizeRepositoryConfigPaths(configPath);
  copyFileSync(configPath, localConfigPath);
  if (comparableConfig(configPath) !== comparableConfig(localConfigPath)) {
    console.error(
      `Local Codacy config ${localConfigPath} does not match fetched remote config ${configPath}`,
    );
    return 1;
  }
  return 0;
}
