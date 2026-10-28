---
description: "j4flmao/rules — Mandatory git commit standards (Conventional Commits)"
glob: "*"
---

# Git Commit Standards

Cursor/AI MUST follow these rules when writing git commit messages.

## 1. Conventional Commits format
Every commit message must follow the Conventional Commits 1.0.0 specification.
Format: `<type>[optional scope][!]: <subject>`, e.g. `feat(frontend): ...` or `fix: ...`.

### Allowed Types:
- `feat`: A new feature (bumps MINOR)
- `fix`: A bug fix (bumps PATCH)
- `docs`: Documentation only changes (e.g., Markdown files in `skills/`)
- `style`: Changes that do not affect the meaning of the code (white-space, formatting)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `build`: Changes to the build system or dependencies
- `ci`: Changes to CI configuration and scripts
- `chore`: Other maintenance that does not touch src or tests
- `revert`: Reverts a previous commit

### Breaking Changes
Mark breaking changes with `!` after the type/scope (`feat(api)!: ...`) and/or a `BREAKING CHANGE: <description>` footer. Either bumps MAJOR.

## 2. Subject Line Rules
- Use the imperative, present tense: "change" not "changed" nor "changes".
- Do NOT capitalize the first letter.
- Do NOT place a period `.` at the end.
- Aim for ≤ 50 characters; hard limit 72.

## 3. Body Rules (Optional but highly recommended)
- If the change is complex, leave a blank line after the subject and write a detailed body wrapped at 72 columns.
- Explain *what* and *why*, not *how* (the code explains how).
- Put footers (`BREAKING CHANGE:`, `Refs: #123`, `Co-Authored-By:`) after the body, separated by a blank line.

**Example:**
```text
feat(enterprise): add release trains skill documentation

This standardizes the release schedule across all R&D departments,
preventing feature-driven deployment delays.
```
