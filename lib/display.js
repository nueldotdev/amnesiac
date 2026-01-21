import open from 'open';
import fs from 'fs';
import path from 'path';
import os from 'os';
import inquirer from 'inquirer';


/**
 * Opens the provided content in the user's default application for Markdown files,
 * waits for the application to close, and then removes the temporary file.
 *
 * @async
 * @param {string} content - The content to display.
 * @returns {Promise<void>} Resolves when the process is complete.
 */
export async function displayChanges(content) {
	const fileName = path.join(os.tmpdir(), `amnesiac_preview_${Date.now()}.diff`);
	fs.writeFileSync(fileName, content);
	await open(fileName, { wait: true });
	fs.unlinkSync(fileName);
}

/**
 * Display changelog entry in a temp file that user can edit.
 * Returns the final content and user's save decision.
 */
export async function previewAndEditChangelog(content) {
	const tempFile = path.join(os.tmpdir(), `amnesiac_preview_${Date.now()}.md`);
	try {
		fs.writeFileSync(tempFile, content);
		console.log("\n📝 Opening changelog in your editor...\n");
		// NOTE: On Windows (and some editors), `open(..., { wait: true })` may return
		// immediately even though the file is still open. So we don't rely on it.
		await open(tempFile, { wait: false });

		// Wait for the user to confirm they're done editing & have saved changes.
		await inquirer.prompt([
			{
				type: "input",
				name: "done",
				message: "When you're done editing AND have saved the file, press Enter to continue.",
			},
		]);

		const editedContent = fs.readFileSync(tempFile, 'utf-8');
		const wasModified = editedContent !== content;
		if (wasModified) {
			console.log("\n✏️ Your changes have been detected.\n");
		}
		// Show a preview of what will be saved
		console.log("📋 Preview of changelog entry:\n");
		console.log("─".repeat(60));
		console.log(editedContent);
		console.log("─".repeat(60));
		console.log();
		// Ask user to confirm
		const { shouldSave } = await inquirer.prompt([
			{
				type: "confirm",
				name: "shouldSave",
				message: "Save this changelog entry?",
				default: true,
			},
		]);
		return { content: editedContent, shouldSave, wasModified };
	} finally {
		// Clean up temp file
		if (fs.existsSync(tempFile)) {
			fs.unlinkSync(tempFile);
		}
	}
}

function safeWriteFileWithBackup(targetPath, contents) {
	const dir = path.dirname(targetPath);
	const base = path.basename(targetPath);
	const tmpPath = path.join(dir, `.${base}.${Date.now()}.tmp`);
	const backupPath = path.join(dir, `${base}.bak.${Date.now()}`);

	// Ensure target directory exists
	if (!fs.existsSync(dir)) {
		fs.mkdirSync(dir, { recursive: true });
	}

	// Write to temp first
	fs.writeFileSync(tmpPath, contents, "utf8");

	// Backup existing file (best effort)
	if (fs.existsSync(targetPath)) {
		try {
			fs.copyFileSync(targetPath, backupPath);
		} catch {
			// ignore backup failures; we'll still try to write
		}
	}

	// Replace target (Windows rename won't overwrite, so unlink first)
	try {
		if (fs.existsSync(targetPath)) fs.unlinkSync(targetPath);
		fs.renameSync(tmpPath, targetPath);
	} catch (err) {
		// If replace fails, keep tmp around for recovery and rethrow
		throw new Error(
			`Failed to write changelog to "${targetPath}". A recovery file may exist at "${tmpPath}". Original error: ${err.message}`
		);
	}
}

export function persistRecoveryCopy(entry, reason = "unknown") {
	const fileName = path.join(os.tmpdir(), `amnesiac_recovery_${Date.now()}.md`);
	const header = `<!-- amnesiac recovery: ${reason} -->\n\n`;
	fs.writeFileSync(fileName, header + entry, "utf8");
	return fileName;
}

/**
 * Save changelog entry to file
 */
export function saveChangelogEntry(config, entry) {
	const changelogPath = config.outputFile || "CHANGELOG.md";
	let existing = "";
	if (fs.existsSync(changelogPath)) {
		existing = fs.readFileSync(changelogPath, "utf8");
	}
	const updated = `## ${new Date().toISOString().split("T")[0]}\n\n${entry}\n\n${existing}`;
	safeWriteFileWithBackup(changelogPath, updated);
	return changelogPath;
}