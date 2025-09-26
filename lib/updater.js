import fs from "fs";

/**
 * Ensure changelog exists and prepend new entry.
 */
export function updateChangelog(changelogPath, entry) {
  let existing = "";

  if (fs.existsSync(changelogPath)) {
    existing = fs.readFileSync(changelogPath, "utf8");
  }

  const updated = `## ${new Date().toISOString().split("T")[0]}\n\n${entry}\n\n${existing}`;
  fs.writeFileSync(changelogPath, updated, "utf8");

  return changelogPath;
}
