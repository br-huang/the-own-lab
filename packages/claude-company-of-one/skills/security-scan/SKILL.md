---
name: security-scan
description: 'Scan code changes for security vulnerabilities. Use as part of code review or independently.'
---

# Security Scan

Analyze code changes for security vulnerabilities across multiple categories.

## Checklist

### Secrets Detection

- API keys, tokens, passwords hardcoded in source or config files
- Private keys or certificates committed to the repository
- Connection strings with embedded credentials
- Environment-specific secrets not using environment variables

### Injection Risks

- SQL injection — unsanitized user input in queries
- XSS — unescaped output rendered in HTML contexts
- Command injection — user input passed to shell execution
- Path traversal — user-controlled file paths without validation

### Authentication and Authorization

- Missing auth checks on protected endpoints
- Improper session handling (fixation, insufficient expiry)
- Broken access control (horizontal/vertical privilege escalation)
- Insecure token storage or transmission

### Dependency Security

- Known CVEs in direct or transitive dependencies
- Untrusted or unvetted packages
- Outdated dependencies with known security patches
- Typosquatting or supply chain risks

### Data Exposure

- PII logged to application logs or monitoring systems
- Sensitive data in error messages returned to users
- Overly verbose stack traces in production error responses
- Unencrypted sensitive data at rest or in transit

## Severity Levels

| Severity | Definition                                    |
| -------- | --------------------------------------------- |
| Critical | Actively exploitable with significant impact  |
| High     | Likely exploitable under realistic conditions |
| Medium   | Potential risk requiring specific conditions  |
| Low      | Best practice violation, minimal direct risk  |

### Input Validation

- Validate ALL external input at system boundaries
- Whitelist valid input rather than blacklisting invalid
- Sanitize before use in interpreted contexts (SQL, HTML, shell)

### Cryptography

- Never implement custom crypto — use established libraries
- Hash passwords with bcrypt, scrypt, or argon2 (never MD5/SHA)
- Use HTTPS for all external communication
- Encrypt sensitive data at rest

### File Operations

- Validate file paths against traversal attacks
- Check file sizes before processing (prevent DoS)
- Validate file types (don't trust extensions alone)
- Use temp directories for ephemeral files; clean up after use

## Report Format

For each finding, provide:

1. **Severity** — Critical / High / Medium / Low
2. **Category** — Which checklist area (e.g., Injection Risks)
3. **Location** — Specific `file:line` reference
4. **Description** — What the vulnerability is and why it matters
5. **Evidence** — The problematic code or configuration
6. **Remediation** — Specific steps to fix the issue
7. **References** — Relevant CWE, OWASP, or advisory links where applicable
