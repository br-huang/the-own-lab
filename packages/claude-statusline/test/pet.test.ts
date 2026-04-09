import test from "node:test";
import assert from "node:assert/strict";
import { petWidget } from "../src/widgets/pet.js";

test("petWidget goes into panic when context usage is high", () => {
  const result = petWidget(
    {
      raw: {},
      cwd: "/tmp/project",
      projectName: "project",
      model: "Claude",
      contextRatio: 0.82
    },
    undefined,
    undefined,
    { branch: "main", dirty: false }
  );

  assert.equal(result.tone, "danger");
  assert.match(result.text, /ctx 82%/);
});

test("petWidget shows working mood for dirty git state", () => {
  const result = petWidget(
    {
      raw: {},
      cwd: "/tmp/project",
      projectName: "project",
      model: "Claude"
    },
    undefined,
    undefined,
    { branch: "feature/demo", dirty: true }
  );

  assert.equal(result.tone, "warning");
  assert.match(result.text, /fixing feature\/demo/);
});
