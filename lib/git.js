import simpleGit from "simple-git";

const git = simpleGit();

/**
 * Get unstaged + staged changes.
 */
export async function getDiff() {
  try {
    return await git.diff();
  } catch (err) {
    console.error("❌ Failed to get git diff. Make sure Git is installed and you are in a Git repository.", err.message);
    throw new Error("Git diff failed.");
  }
}

/**
 * Get status (new/untracked, modified, deleted files, etc.)
 */
export async function getStatus() {
  try {
    const status = await git.status();
    return [
      ...status.not_added.map(f => `Untracked: ${f}`),
      ...status.modified.map(f => `Modified: ${f}`),
      ...status.deleted.map(f => `Deleted: ${f}`),
      ...status.staged.map(f => `Staged: ${f}`),
    ].join("\n");
  } catch (err) {
    console.error("❌ Failed to get git status. Make sure Git is installed and you are in a Git repository.", err.message);
    throw new Error("Git status failed.");
  }
}
