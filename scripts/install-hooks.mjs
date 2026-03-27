#!/usr/bin/env node
import { execFileSync } from "node:child_process";

try {
  execFileSync("git", ["rev-parse", "--is-inside-work-tree"], { stdio: "ignore" });
  execFileSync("git", ["config", "core.hooksPath", ".githooks"], { stdio: "inherit" });
  console.log("[hooks] core.hooksPath set to .githooks");
} catch (error) {
  console.error("[hooks] Unable to configure Git hooks.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
