# Code Review Fundamentals

## Overview
Code review is a systematic examination of code changes by peers to identify bugs, improve code quality, share knowledge, and ensure consistency with project standards.

## Core Concepts

### Concept 1: Review Scope and Focus
Review should check: correctness (does it work?), security (vulnerabilities?), maintainability (will we understand this in 6 months?), performance (efficient approach?), test coverage (are edge cases tested?), and style (consistent with project conventions?).

### Concept 2: Review Speed
Review within 24 hours for standard PRs, within 4 hours for urgent fixes. Smaller PRs get faster reviews. Use Draft PR for early architecture feedback. First response time matters more than completion time.

### Concept 3: Effective Feedback
Specific and actionable: "Use null-safe access with ?. operator here" not "Fix this." Separate blocking issues (bugs, security) from style suggestions. Use blocking/nitpick labels. Explain WHY, not just WHAT.

### Concept 4: Review Levels
Light review (simple changes, trusted authors), standard review (most PRs), deep review (complex logic, security-sensitive code). Adjust depth based on risk level of the change.

### Concept 5: Automation Support
Linters (ESLint, Ruff), formatters (Prettier, rustfmt), type checkers (TypeScript, mypy), SAST (Semgrep, CodeQL), dependency scan (npm audit, cargo audit), and test coverage reporting. Automation catches 80% of issues before human review.

## Best Practices

- Review within 24 hours
- Focus on correctness and security first
- Be specific and actionable in feedback
- Explain the WHY behind suggestions
- Use PR size limits (400 lines max)
- Leverage automation for style/catch common issues
- Approve or request changes — avoid "mostly looks good"
- Separate blocking issues from nits

## Anti-Patterns

- Nitpicking style instead of reviewing logic
- LGTM without actual review
- Reviewing too slowly (PRs sit for days)
- Blocking on personal preference
- Dismissive or aggressive tone in comments
- Reviewing only the diff (miss context)
- Ignoring test coverage in review
- Not reviewing error handling and edge cases
