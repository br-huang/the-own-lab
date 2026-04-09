import { execFileSync } from "node:child_process";
import { readCache, writeCache } from "../cache.js";
import { GitState } from "../types.js";

function git(args: string[], cwd: string): string {
  try {
    return execFileSync("git", args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"]
    }).trim();
  } catch {
    return "";
  }
}

export function getGitState(cwd: string): GitState | undefined {
  const cacheKey = `git:${cwd}`;
  const cached = readCache<GitState>(cacheKey, 5000);
  if (cached) return cached;

  const branch = git(["branch", "--show-current"], cwd);
  if (!branch) return undefined;

  const state = {
    branch,
    dirty: git(["status", "--porcelain"], cwd) !== ""
  };

  writeCache(cacheKey, state);
  return state;
}
