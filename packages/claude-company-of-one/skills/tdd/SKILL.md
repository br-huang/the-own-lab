---
name: tdd
description: 'Test-driven development cycle: RED -> GREEN -> REFACTOR. Use for every code change — no exceptions.'
---

# Test-Driven Development

Every code change follows the TDD cycle. No exceptions.

## The Cycle

### RED — Write a Failing Test

1. Write a test that describes the expected behavior.
2. Run it. Watch it fail.
3. **Verify it fails for the RIGHT reason.** A test that fails because of a syntax error is not a valid RED. The test must fail because the behavior does not yet exist.

### GREEN — Make It Pass

1. Write the **MINIMUM** code to make the test pass.
2. Resist the urge to write more. Do not generalize. Do not optimize. Do not clean up.
3. Run the test. It must pass.

### REFACTOR — Clean Up

1. With the test green, improve the code.
2. Improve names, reduce duplication, simplify structure.
3. Run the test after every change. It must stay green.
4. Do not add new behavior during refactor — that requires a new RED.

## Rules

- **If you wrote code before the test, delete it. Start over.** The test comes first. Always.
- **Never skip RED.** Watching the test fail proves it tests the right thing. A test you have never seen fail is a test you cannot trust.
- **One behavior per test.** If a test name has "and" in it, split it into two tests.
- **Test names describe behavior.** Use the pattern: "should X when Y" (e.g., "should return 404 when user not found").
- **Arrange-Act-Assert structure.** Every test has three sections:
  - **Arrange** — Set up the preconditions.
  - **Act** — Perform the action being tested.
  - **Assert** — Verify the expected outcome.

## What to Test

- Happy path (expected inputs → expected outputs)
- Edge cases (empty, null, boundary values, max size)
- Error paths (invalid inputs → appropriate errors)
- Integration points (API calls, database queries, file I/O)

## What NOT to Test

- Private implementation details (test through the public API)
- Third-party library internals
- Trivial getters/setters with no logic
- Framework boilerplate

## Mocking

- Mock external services (APIs, databases, file systems)
- Do NOT mock internal logic — test the real code
- Prefer fakes over mocks when possible (in-memory DB > mock DB)
- Keep mocks minimal — only mock what you must
