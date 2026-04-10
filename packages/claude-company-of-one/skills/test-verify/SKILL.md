---
name: test-verify
description: 'Run and analyze test results against acceptance criteria. Use when verifying implementation completeness.'
---

# Test Verify

Run tests and verify implementation against acceptance criteria.

## Process

1. **Read acceptance criteria** from `REQUIREMENTS.md` — Know exactly what must be true before running anything.

2. **Run full test suite** — Execute all tests, not just the new ones. Catch regressions.

3. **Map test results to acceptance criteria** — For each acceptance criterion, identify which test(s) verify it. Flag any criterion without a corresponding test.

4. **Test edge cases** not covered by existing tests — Use the edge case checklist below to identify gaps and write additional tests.

5. **Produce structured report** — Use the report format below.

## Edge Case Checklist

- [ ] Empty/null inputs
- [ ] Boundary values (zero, one, max, min, off-by-one)
- [ ] Error paths (invalid input, network failure, timeout)
- [ ] Concurrency (race conditions, duplicate submissions)
- [ ] Performance (large inputs, many records)
- [ ] Security (injection, unauthorized access, malformed input)

## Report Format

### Summary

One paragraph: what was tested, how many tests ran, how many passed/failed.

### Criteria Verification Table

| #   | Acceptance Criterion     | Test(s)          | Result      |
| --- | ------------------------ | ---------------- | ----------- |
| 1   | Description of criterion | `test_name_here` | PASS / FAIL |

### Edge Cases

List of edge cases tested and their results.

### Issues Found

Any bugs, regressions, or concerns discovered during verification.

### Verdict

**PASS** — All acceptance criteria verified, no critical issues.
**FAIL** — List which criteria failed and why.
