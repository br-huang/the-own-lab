import { Segment, StatuslineContext } from "../types.js";

export function cwdWidget(input: StatuslineContext): Segment {
  return {
    id: "cwd",
    text: input.projectName,
    tone: "muted",
    priority: 90
  };
}
