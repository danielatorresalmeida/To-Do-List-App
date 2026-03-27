#!/usr/bin/env node
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const stagedOnly = args.has("--staged");

const cwd = process.cwd();

const IGNORED_PREFIXES = [
  ".git/",
  "node_modules/",
  "dist/",
  "docs/assets/"
];

const IGNORED_EXTENSIONS = new Set([
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".svg",
  ".ico",
  ".pdf",
  ".woff",
  ".woff2",
  ".ttf",
  ".eot",
  ".mp4",
  ".mp3",
  ".zip",
  ".gz"
]);

const PLACEHOLDER_HINTS = ["...", "<", "example", "your_", "your-", "redacted", "xxxxx"];

const PATTERNS = [
  {
    name: "Google OAuth client secret",
    regex: /\bGOCSPX-[A-Za-z0-9_-]{10,}\b/g
  },
  {
    name: "Google OAuth client id",
    regex: /\b\d{8,}-[A-Za-z0-9-]+\.apps\.googleusercontent\.com\b/g
  },
  {
    name: "Google OAuth secret assignment",
    regex: /\bgoogle\.oauth_client_secret\s*=\s*["'][^"']+["']/gi
  },
  {
    name: "Private key block",
    regex: /-----BEGIN [A-Z ]*PRIVATE KEY-----/g
  }
];

const gitListArgs = stagedOnly
  ? ["diff", "--cached", "--name-only", "--diff-filter=ACMR"]
  : ["ls-files"];

let fileListRaw = "";
try {
  fileListRaw = execFileSync("git", gitListArgs, { cwd, encoding: "utf8" });
} catch (error) {
  console.error("[secret-scan] Failed to list files from git.");
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(2);
}

const files = fileListRaw
  .split(/\r?\n/)
  .map((value) => value.trim())
  .filter(Boolean)
  .filter((filePath) => !IGNORED_PREFIXES.some((prefix) => filePath.startsWith(prefix)))
  .filter((filePath) => !IGNORED_EXTENSIONS.has(path.extname(filePath).toLowerCase()));

const isProbablyBinary = (buffer) => {
  const max = Math.min(buffer.length, 4096);
  for (let i = 0; i < max; i += 1) {
    if (buffer[i] === 0) {
      return true;
    }
  }
  return false;
};

const isPlaceholder = (text) => {
  const normalized = text.toLowerCase();
  return PLACEHOLDER_HINTS.some((hint) => normalized.includes(hint));
};

const findings = [];

for (const relativePath of files) {
  const absolutePath = path.join(cwd, relativePath);
  if (!fs.existsSync(absolutePath)) {
    continue;
  }

  const raw = fs.readFileSync(absolutePath);
  if (isProbablyBinary(raw)) {
    continue;
  }

  const content = raw.toString("utf8");
  const lines = content.split(/\r?\n/);
  lines.forEach((line, index) => {
    PATTERNS.forEach(({ name, regex }) => {
      const localRegex = new RegExp(regex.source, regex.flags);
      let match = localRegex.exec(line);
      while (match) {
        const value = match[0];
        if (!isPlaceholder(value) && !isPlaceholder(line)) {
          findings.push({
            file: relativePath,
            line: index + 1,
            type: name,
            value
          });
        }
        match = localRegex.exec(line);
      }
    });
  });
}

if (findings.length > 0) {
  console.error("[secret-scan] Potential secrets detected:");
  findings.forEach((item) => {
    console.error(`- ${item.file}:${item.line} [${item.type}] ${item.value}`);
  });
  console.error("[secret-scan] Commit blocked. Move secrets to env vars or Firebase config.");
  process.exit(1);
}

console.log(`[secret-scan] OK (${stagedOnly ? "staged files" : "tracked files"}).`);
