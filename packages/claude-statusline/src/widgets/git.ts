import { GitState, Segment } from "../types.js";

export function gitWidget(git?: GitState): Segment | undefined {
  if (!git) return undefined;

  return {
    id: "git",
    text: git.dirty ? `${git.branch}*` : git.branch,
    tone: git.dirty ? "warning" : "success",
    priority: 80
  };
}
