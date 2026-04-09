import test from "node:test";
import assert from "node:assert/strict";
import { normalizeInput } from "../src/input.js";

test("normalizeInput reads primary fields", () => {
  const result = normalizeInput({
    session_id: "abc123",
    transcript_path: "/tmp/demo.jsonl",
    workspace: { current_dir: "/tmp/project" },
    model: { display_name: "Claude Sonnet 4" },
    context: { used_ratio: 0.5 },
    cost: { total_cost_usd: 0.0123 },
    session: { duration_ms: 120000 }
  });

  assert.equal(result.cwd, "/tmp/project");
  assert.equal(result.projectName, "project");
  assert.equal(result.model, "Claude Sonnet 4");
  assert.equal(result.contextRatio, 0.5);
  assert.equal(result.costUsd, 0.0123);
  assert.equal(result.durationMs, 120000);
});
