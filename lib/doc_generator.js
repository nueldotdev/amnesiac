import fs from "fs";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { getDiff, getStatus } from "./git.js";

export async function generateDocs(config) {
  const { apiKey, model, outputFile, prompt } = config;

  if (!apiKey || apiKey.trim() === '') {
    throw new Error("API key missing or empty in config. Please set it using 'amnesiac config' or in your local amnesiac.config.js.");
  }

  // 1. Get git diff + status
  let diff = '';
  let status = '';
  try {
    diff = await getDiff();
    status = await getStatus();
  } catch (error) {
    // Git errors are already logged in git.js, just re-throw to stop generation
    throw error;
  }

  if (!diff.trim() && !status.trim()) {
    console.log("No recent changes detected.");
    return null;
  }

  // 2. Init Gemini
  const genAI = new GoogleGenerativeAI(apiKey);
  const llm = genAI.getGenerativeModel({ model: model || "gemini-2.5-flash" });

  // 3. Build prompt
  const fullPrompt = `
${prompt || "Generate a clear changelog entry for these changes."}

Here is the current repo status:
\`\`\`
${status}
\`\`\`

Here are the latest diffs:
\`\`\`diff
${diff}
\`\`\`
`;

  // 4. Send to Gemini
  let changelogEntry;
  try {
    console.log("✨ Generating content... 📝");
    const result = await llm.generateContent(fullPrompt);
    changelogEntry = result.response.text();
  } catch (err) {
    console.error("❌ Failed to generate changelog:", err.message);
    return;
  }

  // 5. Return response instead of writing
  console.log("✅ Content generated.");
  return changelogEntry;
}
