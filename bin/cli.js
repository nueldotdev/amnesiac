#!/usr/bin/env node
import { Command } from "commander";
import fs from "fs";
import path from "path";
import os from "os";
import inquirer from "inquirer";
import { generateDocs } from "../lib/doc_generator.js";
import { loadConfig } from "../lib/config.js";
import { previewAndEditChangelog, saveChangelogEntry, persistRecoveryCopy } from "../lib/display.js";
import { readFileSync } from 'fs';

const program = new Command();
const packageJson = JSON.parse(readFileSync(new URL('../package.json', import.meta.url)));

// Handle Ctrl+C gracefully
process.on('SIGINT', () => {
  console.log('\nOperation cancelled by user.');
  process.exit(1);
});

program.version(packageJson.version);

program
  .command("init")
  .description("Initialize a local amnesiac.config.js file")
  .action(async () => {
    const localConfigPath = path.resolve(process.cwd(), "amnesiac.config.js");
    const defaultConfigContent = `export default {
  apiKey: process.env.GEMINI_API_KEY || "", // Consider adding a placeholder for API key
  model: "gemini-2.5-flash",
  outputFile: "CHANGELOG.md",
  prompt: \`
You are an assistant that generates clean, developer-friendly changelog entries.
Summarize commit messages and diffs into concise bullet points.
Output only valid markdown for a CHANGELOG.md file.
\`
};
`;

    if (fs.existsSync(localConfigPath)) {
      const { overwrite } = await inquirer.prompt([
        {
          type: "confirm",
          name: "overwrite",
          message: "amnesiac.config.js already exists. Overwrite?",
          default: false,
        },
      ]);
      if (!overwrite) {
        console.log("Initialization cancelled.");
        return;
      }
    }

    try {
      fs.writeFileSync(localConfigPath, defaultConfigContent.trim());
      console.log(`✅ Created amnesiac.config.js at ${localConfigPath}`);
      console.log(`💡 Remember to add your Gemini API key to your environment variables (e.g., GEMINI_API_KEY=YOUR_KEY) or directly into amnesiac.config.js`);
    } catch (error) {
      console.error(`❌ Failed to create amnesiac.config.js: ${error.message}`);
      process.exit(1);
    }
  });

program
  .command("reset")
  .description("Delete the global Amnesiac config file and all profiles")
  .action(async () => {
    const globalConfigPath = path.join(os.homedir(), ".amnesiac", "config.json");

    if (!fs.existsSync(globalConfigPath)) {
      console.log("🤷‍♀️ No global config file found to reset.");
      return;
    }

    const { confirmReset } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmReset",
        message: "This will delete your global Amnesiac config file (~/.amnesiac/config.json) and ALL saved profiles. Are you sure?",
        default: false,
      },
    ]);

    if (confirmReset) {
      try {
        fs.unlinkSync(globalConfigPath);
        console.log("✅ Global Amnesiac config and all profiles have been reset.");
      } catch (error) {
        console.error("❌ Failed to delete global config file:", error.message);
      }
    } else {
      console.log("Reset cancelled.");
    }
  });

program
  .command("status")
  .description("Display the currently active Amnesiac configuration")
  .action(async () => {
    try {
      const config = await loadConfig({}); // Load config without CLI overrides for status display

      console.log("\n--- Amnesiac Configuration Status ---\n");
      console.log(`Active Profile: ${config.activeProfile || 'N/A (using local/CLI defaults)'}`);
      console.log(`API Key: ${config.apiKey ? '********' + config.apiKey.slice(-4) : 'Not Set'}`); // Mask API key
      console.log(`Model: ${config.model}`);
      console.log(`Output File: ${config.outputFile}`);
      console.log(`Default Prompt: ${config.prompt.split('\n')[0]}...`); // Show first line of prompt
      console.log("\n-------------------------------------\n");
    } catch (error) {
      console.error(`\n❌ An error occurred while fetching status: ${error.message}`);
      process.exit(1);
    }
  });


program
  .command("show-git")
  .option("-s, --status", "Display the status of the files within the repository")
  .option("-d, --diff", "Display the changes within the files of the repository")
  .description("Display the current status or changes in your Git repository")
  .action(async (options) => {
    // Only allow one of --status or --diff at a time
    if (options.status && options.diff) {
      console.error("\n❌ You can only use one of --status or --diff at a time.\n");
      process.exit(1);
    }
    if (!options.status && !options.diff) {
      console.error("\n❌ Please specify either --status or --diff.\n");
      process.exit(1);
    }

    try {
      if (options.status) {
        const { getStatus } = await import('../lib/git.js');
        const statusStr = await getStatus();
        console.log("\n--- Git Status ---\n" + statusStr + "\n");
      } else if (options.diff) {
        const { getDiff } = await import('../lib/git.js');
        const { displayChanges } = await import('../lib/display.js');
        const diffStr = await getDiff();
        await displayChanges(diffStr);
      }
    } catch (error) {
      console.error(`\n❌ An error occurred while displaying git info: ${error.message}`);
      process.exit(1);
    }
  });


program
  .command("config")
  .description("Set up or edit Amnesiac config")
  .option("-p, --profile <name>", "Specify a profile name", "default")
  .option("-l, --list", "List all available profiles")
  .option("-d, --delete <name>", "Delete a specified profile")
  .action(async (options) => {
    try {
      const dir = path.join(os.homedir(), ".amnesiac");
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);

      const globalConfigPath = path.join(dir, "config.json");
      let globalConfig = { activeProfile: "default", profiles: {} };

      if (fs.existsSync(globalConfigPath)) {
        try {
          globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, "utf-8"));
        } catch (e) {
          console.error("❌ Error reading global config file. It might be corrupted. You can reset it with 'amnesiac reset'.", e.message);
          // Continue with default empty config if file is corrupted, but alert user
        }
      }

      if (options.list) {
        console.log("Available profiles:");
        const profiles = Object.keys(globalConfig.profiles);
        if (profiles.length > 0) {
          profiles.forEach(profile => {
            const activeIndicator = profile === globalConfig.activeProfile ? " (active)" : "";
            console.log(`- ${profile}${activeIndicator}`);
          });
        } else {
          console.log("No profiles found.");
        }
        return; // Exit after listing profiles
      }

      if (options.delete) {
        const profileToDelete = options.delete;
        if (globalConfig.profiles[profileToDelete]) {
          delete globalConfig.profiles[profileToDelete];
          if (globalConfig.activeProfile === profileToDelete) {
            globalConfig.activeProfile = "default"; // Reset active profile if deleted
          }
          fs.writeFileSync(globalConfigPath, JSON.stringify(globalConfig, null, 2));
          console.log(`✅ Profile "${profileToDelete}" deleted successfully.`);
        } else {
          console.log(`❌ Profile "${profileToDelete}" not found.`);
        }
        return; // Exit after deleting profile
      }

      // Ask for profile name if not provided via flag
      let profile = options.profile;
      if (profile === 'default') {
        const answers = await inquirer.prompt([
          {
            type: "input",
            name: "profile",
            message: "Profile name (default = 'default'):",
            default: "default",
          },
        ]);
        profile = answers.profile;
      }

      // Load existing profile config for editing
      let existingConfig = globalConfig.profiles[profile] || {};
      if (Object.keys(existingConfig).length > 0) {
        console.log(`🔄 Editing existing profile "${profile}"...`);
      } else {
        console.log(`🆕 Creating new profile "${profile}"...`);
      }

      const answers = await inquirer.prompt([
        {
          type: "password",
          name: "apiKey",
          message: "Enter your API key:",
          default: existingConfig.apiKey || "",
          validate: (input) =>
            input.trim() !== "" ? true : "API key is required.",
        },
        {
          type: "input",
          name: "model",
          message: "Enter model name:",
          default: existingConfig.model || "gemini-2.5-flash",
        },
        {
          type: "input",
          name: "prompt",
          message: "Enter your default prompt (leave blank to use default):",
          default:
            existingConfig.prompt ||
            "Generate a clear changelog entry for these changes.",
        },
        {
          type: "input",
          name: "outputFile",
          message: "Enter output file name:",
          default: existingConfig.outputFile || "CHANGELOG.md",
        },
      ]);

      globalConfig.profiles[profile] = answers;
      fs.writeFileSync(globalConfigPath, JSON.stringify(globalConfig, null, 2));
      console.log(`✅ Config saved at ${globalConfigPath}`);
    } catch (error) {
      if (error.name === 'ExitPromptError') {
        console.log('\nOperation cancelled by user.');
        process.exit(1);
      } else {
        console.error(`\n❌ An unexpected error occurred during config: ${error.message}`);
        process.exit(1);
      }
    }
  });

program
  .command("use <profile_name>")
  .description("Set the active profile for Amnesiac")
  .action(async (profile_name) => {
    const dir = path.join(os.homedir(), ".amnesiac");
    const globalConfigPath = path.join(dir, "config.json");
    let globalConfig = { activeProfile: "default", profiles: {} };

    if (fs.existsSync(globalConfigPath)) {
      try {
        globalConfig = JSON.parse(fs.readFileSync(globalConfigPath, "utf-8"));
      } catch (e) {
        console.error("❌ Error reading global config file. It might be corrupted. You can reset it with 'amnesiac reset'.", e.message);
        return; // Exit if global config is unreadable for 'use' command
      }
    }

    if (globalConfig.profiles[profile_name]) {
      globalConfig.activeProfile = profile_name;
      fs.writeFileSync(globalConfigPath, JSON.stringify(globalConfig, null, 2));
      console.log(`✅ Active profile set to "${profile_name}".`);
    } else {
      console.log(`❌ Profile "${profile_name}" not found. Please create it first using 'amnesiac config --profile ${profile_name}'.`);
    }
  });

  program
  .option("-d, --dry-run", "Preview and edit before saving")
  .option("-u, --use <profile>", "Use a specific profile for this run")
  .option("-p, --prompt <text>", "Override prompt")
  .option("-m, --model <name>", "Override model")
  .action(async (opts) => {
    try {
      const config = await loadConfig(opts);
      const changelogEntry = await generateDocs(config);
      
      if (!changelogEntry) {
        return; // No changes detected
      }

      if (opts.dryRun) {
        // Preview and let user edit/confirm
        console.log("\n🔄 Previewing changelog entry. \nYou can review and edit before saving");
        const { content, shouldSave, wasModified } = await previewAndEditChangelog(changelogEntry);

        if (shouldSave) {
          let savedPath;
          try {
            savedPath = saveChangelogEntry(config, content);
          } catch (e) {
            const recoveryPath = persistRecoveryCopy(content, "save_failed");
            console.error(`\n❌ Failed to save changelog: ${e.message}`);
            console.error(`✅ Your generated entry was saved for recovery at: ${recoveryPath}\n`);
            process.exit(1);
          }

          if (wasModified) {
            console.log(`✅ Your edited changelog has been saved to ${savedPath}`);
          } else {
            console.log(`✅ Changelog updated at ${savedPath}`);
          }
        } else {
          console.log("❌ Changelog not saved.");
        }
      } else {
        // No preview, just save
        console.log("🔄 Saving changelog entry...");
        let savedPath;
        try {
          savedPath = saveChangelogEntry(config, changelogEntry);
        } catch (e) {
          const recoveryPath = persistRecoveryCopy(changelogEntry, "save_failed");
          console.error(`\n❌ Failed to save changelog: ${e.message}`);
          console.error(`✅ Your generated entry was saved for recovery at: ${recoveryPath}\n`);
          process.exit(1);
        }
        console.log(`✅ Changelog updated at ${savedPath}`);
      }
    } catch (error) {
      console.error(`\n❌ An error occurred: ${error.message}`);
      process.exit(1);
    }
  });

program.parse(process.argv);