import fs from "fs";
import path from "path";
import os from "os";
import { pathToFileURL } from "url";

/**
 * Load config with priority:
 * CLI opts (--use, --prompt, --model) > local project config > global active profile
 */
export async function loadConfig(cliOpts = {}) {
  let config = {};
  let globalConfig = { activeProfile: "default", profiles: {} };
  const globalConfigPath = path.join(os.homedir(), ".amnesiac", "config.json");

  // 1. Load global config file
  if (fs.existsSync(globalConfigPath)) {
    try {
      globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, "utf8"));
    } catch (e) {
      console.warn("⚠️ Failed to read global config file, using defaults.", e.message);
    }
  }

  // Determine which profile to use
  let profileToLoad = globalConfig.activeProfile;
  if (cliOpts.use) {
    profileToLoad = cliOpts.use;
  }

  // 2. Load specified/active global profile config
  if (globalConfig.profiles[profileToLoad]) {
    config = { ...config, ...globalConfig.profiles[profileToLoad] };
  } else if (cliOpts.use && !globalConfig.profiles[profileToLoad]) {
    console.warn(`⚠️ Profile "${cliOpts.use}" not found in global config. Falling back to active profile or default.`);
  }

  // 3. Load local config (if exists in cwd)
  const localPath = path.resolve(process.cwd(), "amnesiac.config.js");
  if (fs.existsSync(localPath)) {
    try {
      const localConfig = (await import(pathToFileURL(localPath))).default;
      config = { ...config, ...localConfig };
    } catch (err) {
      console.warn("⚠️ Failed to load local config:", err.message);
    }
  }

  // 4. Apply CLI overrides
  if (cliOpts.prompt) config.prompt = cliOpts.prompt;
  if (cliOpts.model) config.model = cliOpts.model;

  return config;
}
