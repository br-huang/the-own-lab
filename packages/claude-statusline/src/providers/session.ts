import { SessionState, StatuslineContext } from "../types.js";

export function getSessionState(input: StatuslineContext): SessionState | undefined {
  if (input.costUsd == null && input.durationMs == null && !input.sessionId) {
    return undefined;
  }

  return {
    costUsd: input.costUsd,
    durationMs: input.durationMs,
    sessionId: input.sessionId
  };
}
