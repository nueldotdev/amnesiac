## 2026-01-21 — v1.0.2

### Added

*   **Changelog Preview & Edit:** Introduced a new `--dry-run` option allowing users to preview and edit generated changelog entries before saving them.
*   **Changelog Save Recovery:** Implemented a recovery mechanism to persist generated changelog content locally if saving fails.
*   **Git Status & Diff Command:** Added a new `show-git` command with `--status` and `--diff` options to display the current Git repository status or changes directly from the CLI.
*   **New Dependencies:** Added `open` and `update-notifier` for future enhancements and version notifications.

### Changed

*   **Refactored Changelog Generation:** The `generateDocs` function now returns the generated changelog entry instead of directly writing it to a file, providing more control over the saving process.
*   **Improved Configuration Loading:** Enhanced `loadConfig` to better manage active profiles and ensure CLI options correctly override existing configurations.
*   **Git Status JSDoc:** Added detailed JSDoc comments to the `getStatus` function in `lib/git.js` for improved code clarity.

## 2025-10-03 — v1.0.1

- Default model updated: Now uses `gemini-2.5-flash` by default to align with the latest Gemini API.


