---
description: "j4flmao/rules — Mandatory git commit standards (Conventional Commits)"
glob: "*"
---

# Git Commit Standards

Cursor/AI MUST follow these rules when writing git commit messages.

## 1. Conventional Commits format
Every commit message must adhere to the Conventional Commits specification.
Format: `<type>(<scope>): <subject>`

### Allowed Types:
- `feat`: A new feature
- `fix`: A bug fix
- `docs`: Documentation only changes (e.g., Markdown files in `skills/`)
- `style`: Changes that do not affect the meaning of the code (white-space, formatting)
- `refactor`: A code change that neither fixes a bug nor adds a feature
- `perf`: A code change that improves performance
- `test`: Adding missing tests or correcting existing tests
- `chore`: Changes to the build process or auxiliary tools and libraries

## 2. Subject Line Rules
- Use the imperative, present tense: "change" not "changed" nor "changes".
- Do NOT capitalize the first letter.
- Do NOT place a period `.` at the end.
- Keep it under 50 characters.

## 3. Body Rules (Optional but highly recommended)
- If the change is complex, leave a blank line after the subject and write a detailed body.
- Explain *what* and *why*, not *how* (the code explains how).

**Example:**
```text
feat(enterprise): add release trains skill documentation

This standardizes the release schedule across all R&D departments,
preventing feature-driven deployment delays.
```
