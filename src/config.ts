import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { z } from "zod";
import { Config } from "./types.js";

const configSchema = z.object({
  renderer: z.enum(["plain", "powerline"]).default("powerline"),
  widgets: z
    .array(z.enum(["model", "cwd", "git", "context", "session"]))
    .default(["model", "cwd", "git", "context", "session"]),
  nerdFont: z.boolean().default(true),
  theme: z
    .object({
      neutral: z.object({ fg: z.string(), bg: z.string() }).partial().optional(),
      info: z.object({ fg: z.string(), bg: z.string() }).partial().optional(),
      success: z.object({ fg: z.string(), bg: z.string() }).partial().optional(),
      warning: z.object({ fg: z.string(), bg: z.string() }).partial().optional(),
      danger: z.object({ fg: z.string(), bg: z.string() }).partial().optional(),
      muted: z.object({ fg: z.string(), bg: z.string() }).partial().optional(),
      separator: z.string().optional(),
      separatorAscii: z.string().optional()
    })
    .default({})
});

export const defaultConfig: Config = {
  renderer: "powerline",
  widgets: ["model", "cwd", "git", "context", "session"],
  nerdFont: true,
  theme: {}
};

function configPaths(cwd: string): string[] {
  return [
    path.join(cwd, ".claude-code-statusline.json"),
    path.join(os.homedir(), ".config", "claude-code-statusline", "config.json")
  ];
}

export function loadConfig(cwd: string): Config {
  for (const candidate of configPaths(cwd)) {
    if (!fs.existsSync(candidate)) continue;
    const parsed = JSON.parse(fs.readFileSync(candidate, "utf8"));
    return configSchema.parse(parsed);
  }

  return defaultConfig;
}
