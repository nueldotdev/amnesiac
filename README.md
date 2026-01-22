---
layout:
  width: default
  title:
    visible: true
  description:
    visible: false
  tableOfContents:
    visible: true
  outline:
    visible: true
  pagination:
    visible: true
  metadata:
    visible: true
metaLinks:
  alternates:
    - https://app.gitbook.com/s/2AwfWOGBWBxQmyvHedqW/
---

# Amnesiac

Amnesiac is a CLI tool for keeping track of what’s changed in your code. It looks at your recent Git commits and diffs, uses Gemini to summarize them, and spits out a tidy, bullet-point for your changelog.

## Table of Contents

* [Features](./#features)
* [Installation](./#installation)
* [Getting Started](./#getting-started)
* [Configuration & Profiles](./#configuration--profiles)
  * [Configuration Loading Hierarchy](./#configuration-loading-hierarchy)
  * [Global Configuration (`~/.amnesiac/config.json`)](./#global-configuration-amnesiacconfigjson)
  * [Local Project Configuration (`amnesiac.config.js`)](./#local-project-configuration-amnesiacconfigjs)
* [Commands](./#commands)
  * [`amnesiac`](./#amnesiac)
  * [`amnesiac init`](./#amnesiac-init)
  * [`amnesiac config`](./#amnesiac-config)
  * [`amnesiac use <profile_name>`](./#amnesiac-use-profile_name)
  * [`amnesiac status`](./#amnesiac-status)
  * [`amnesiac reset`](./#amnesiac-reset)
  * [`amnesiac --version`](./#amnesiac---version)
* [API Key and Model Information](./#api-key-and-model-information)
  * [Getting Your API Key](./#getting-your-api-key)
  * [Keeping Your API Key Secure](./#keeping-your-api-key-secure)
  * [Understanding Gemini Models](./#understanding-gemini-models)
* [Changelog](./#changelog)

## Features

* **Automated Changelog Generation:** Generate changelog entries from Git diffs and commit messages.
* **Flexible Configuration:** Supports global profiles, local project-specific configurations, and CLI overrides.
* **Profile Management:** Create, edit, list, and delete multiple configuration profiles.
* **Active Profile Switching:** Easily switch between global profiles.
* **Secure API Key Handling:** API key input is masked, and the status command redacts it.
* **Intuitive CLI:** User-friendly commands for initialization, configuration, and status checks.

## Installation

To install Amnesiac, you will first need to have [Node.js](https://nodejs.org/) and [npm](https://www.npmjs.com/) installed on your system.

Then, you can install Amnesiac globally via npm:

```bash
npm install -g @nueldotdev/amnesiac
```

This will make the `amnesiac` command available from any directory in your terminal.

### Updating Amnesiac

To update your globally installed Amnesiac to the latest version, simply run:

```bash
npm update -g @nueldotdev/amnesiac
```

## Getting Started

1.  **Initialize your project (optional, but recommended for project-specific settings):**

    ```bash
    amnesiac init
    ```

    This command creates an `amnesiac.config.js` file in your project root with default settings.
2.  **Configure your API Key and Model:** Run `amnesiac config` to set up your global default profile or create a new one. You'll be prompted for your Gemini API key and preferred model.

    ```bash
    amnesiac config
    ```

    _(See_ [_Configuration & Profiles_](./#configuration--profiles) _for more details on managing profiles.)_
3.  **Generate Changelog Entry:** Once configured, you can generate a changelog entry by running:

    ```bash
    amnesiac
    ```

    This command will:

    * Detect recent Git changes (staged, uncommitted, and committed).
    * Send the diff to the Gemini API using your active configuration.
    * Receive a concise changelog entry.
    * Prepend the new entry to your `CHANGELOG.md` file (or the file specified in your config).

### Preview/edit workflow (recommended)

If you want to review and tweak the generated entry before it is written to your changelog, use `--dry-run`:

```bash
amnesiac --dry-run
```

This flow will:

* Open a temporary `.md` file containing the generated entry in your default editor
* Let you edit it
* Ask you to confirm before saving it to your changelog

**Important (Windows/editor note):** some editors don't allow the CLI to reliably detect when the file is closed. After you edit the temp file, **save it in your editor (Ctrl+S)**, then return to the terminal and press Enter when prompted.

### Safety: backups and recovery

When saving to your changelog file, Amnesiac writes safely:

* If a changelog file already exists, it may create a best-effort backup alongside it (e.g. `CHANGELOG.md.bak.<timestamp>`).
* If saving fails (permissions/locked file/etc.), Amnesiac will write a **recovery copy** to your OS temp directory and print the path so you don't lose the generated/edited entry.

## Configuration & Profiles

Amnesiac offers a flexible configuration system that allows you to manage settings at different levels: per-project, globally, or as a one-off CLI override.

### Configuration Loading Hierarchy

Amnesiac loads configurations with the following priority (highest to lowest):

1. **CLI Overrides:** Options passed directly to the `amnesiac` command (e.g., `--use <profile>`, `--prompt <text>`, `--model <name>`). These are temporary for a single run.
2. **Local Project Configuration:** An `amnesiac.config.js` file in your current project's root directory. This takes precedence over your global active profile for that specific project.
3. **Global Active Profile:** The profile marked as `activeProfile` in your `~/.amnesiac/config.json` file. This is your default fallback.

### Local Project Configuration (`amnesiac.config.js`)

You can create an `amnesiac.config.js` file in the root of your project to define project-specific settings. This configuration will override your global active profile settings when you run `amnesiac` within that project, unless a `--use` flag is provided via CLI.

**Example `amnesiac.config.js`:**

```javascript
export default {
  apiKey: process.env.GEMINI_API_KEY, // Can be sourced from environment variables
  model: "gemini-2.5-flash",
  outputFile: "PROJECT_CHANGELOG.md",
  prompt: `
  Generate a comprehensive changelog entry focusing on new features and bug fixes for this project.
  Include PR numbers if available.
  `
};
```

## Commands

Amnesiac provides several commands to manage your configurations and generate changelogs.

### `amnesiac`

The main command to generate a changelog entry. It uses the configuration determined by the [loading hierarchy](./#configuration-loading-hierarchy).

**Usage:**

```bash
amnesiac
amnesiac -p "Custom prompt for this run" # Override prompt for a single run
amnesiac -m "gemini-2.5-flash" # Override model for a single run
amnesiac -u work # Use 'work' profile for a single run
amnesiac -d # Preview/edit in your editor before saving
```

### `amnesiac show-git`

Display the current Git status or diff for the repository you are currently in.

**Usage:**

```bash
amnesiac show-git --status
amnesiac show-git --diff
```

### `amnesiac init`

Initializes a local `amnesiac.config.js` file in the current project directory with default settings. It will prompt for confirmation if the file already exists.

**Usage:**

```bash
amnesiac init
```

### `amnesiac config`

Manages your global Amnesiac profiles (stored in `~/.amnesiac/config.json`).

**Usage:**

*   **Set up or edit a profile (will prompt for details):**

    ```bash
    amnesiac config
    amnesiac config --profile my-dev-profile # Directly specify a profile to create/edit
    ```

    When prompted for the API key, your input will be masked for security.
*   **List all available profiles:**

    ```bash
    amnesiac config --list
    # or
    amnesiac config -l
    ```

    This will also indicate which profile is currently active.
*   **Delete a specified profile:**

    ```bash
    amnesiac config --delete my-old-profile
    # or
    amnesiac config -d my-old-profile
    ```

### `amnesiac use <profile_name>`

Sets the specified profile as the globally active profile in `~/.amnesiac/config.json`. This profile will be used by default for subsequent `amnesiac` runs unless overridden by a local config or CLI flag.

**Usage:**

```bash
amnesiac use work
amnesiac use personal
```

### `amnesiac status`

Displays the currently active Amnesiac configuration, including the active profile, model, output file, and a snippet of the default prompt. The API key is masked for security.

**Usage:**

```bash
amnesiac status
```

### `amnesiac reset`

Deletes the entire global Amnesiac configuration file (`~/.amnesiac/config.json`), effectively removing all saved profiles and resetting global settings. This command requires user confirmation.

**Usage:**

```bash
amnesiac reset
```

### `amnesiac --version`

Displays the current version of the Amnesiac CLI tool.

**Usage:**

```bash
amnesiac --version
# or
amnesiac -V
```

## API Key and Model Information

### Getting Your API Key

Amnesiac uses the Google Gemini API to generate changelog entries. You'll need an API key to use the tool.

1. Visit [Google AI Studio](https://aistudio.google.com/app/apikey).
2. Follow the instructions to create a new API key.
3. Once you have your key, you can configure it using `amnesiac config` or by setting it in your local `amnesiac.config.js` file or as an environment variable (e.g., `GEMINI_API_KEY`).

### Keeping Your API Key Secure

Your API key is a sensitive credential. Treat it like a password:

* **Do not commit it directly into your project's `amnesiac.config.js`** if the file is shared publicly. Instead, use environment variables (`process.env.GEMINI_API_KEY`) as shown in the local config example.
* When entering your API key via `amnesiac config`, the input is masked.
* When viewing your configuration with `amnesiac status`, the API key is partially masked.

### Understanding Gemini Models

The `model` parameter (e.g., `gemini-2.5-flash`, `gemini-2.5-pro`) determines which Gemini model Amnesiac uses for content generation.

* **`gemini-2.5-flash`:** A faster, more cost-effective model, suitable for many common tasks. This is the default.
* **`gemini-2.5-pro`:** A more capable model for complex tasks, offering higher quality but potentially at a higher latency or cost.

You can specify the model in your global or local configurations, or override it for a single run using `amnesiac -m <model_name>`. Refer to the [Gemini API documentation](https://ai.google.dev/models/gemini) for the latest information on available models and their capabilities.

## Changelog

See full history in [CHANGELOG.md](CHANGELOG.md).
