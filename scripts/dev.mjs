/**
 * Derivo Docs — Next.js Dev Server with Auto Route Pre-compilation
 *
 * Spawns Next.js dev server and automatically runs the route warmup
 * script so that every single page is already compiled by the time
 * the user visits it in their browser.
 */

import { spawn } from "node:child_process";
import { warmupAllRoutes } from "./warmup.mjs";

const isWindows = process.platform === "win32";
const nextCmd = isWindows ? "npx.cmd" : "npx";

console.log("🚀 [Derivo Docs] Starting development server with auto startup compilation...");

const nextProcess = spawn(nextCmd, ["next", "dev"], {
  stdio: "inherit",
  shell: true,
  env: process.env,
});

// Trigger route warmup in background
setTimeout(() => {
  warmupAllRoutes().catch((err) => {
    console.warn("Warmup error:", err);
  });
}, 1000);

nextProcess.on("close", (code) => {
  process.exit(code ?? 0);
});

process.on("SIGINT", () => {
  nextProcess.kill("SIGINT");
  process.exit(0);
});

process.on("SIGTERM", () => {
  nextProcess.kill("SIGTERM");
  process.exit(0);
});
