---
name: commit
description: Stage and commit changes with conventional commit format. Use when the user says /commit or asks to commit.
disable-model-invocation: true
allowed-tools: Bash(git add *) Bash(git commit *) Bash(git status *) Bash(git log *) Bash(git diff *)
shell: powershell
---

## Instructions

1. Run `git status` and `git diff` to inspect changes
2. Run `git log --oneline -5` to see recent commit style
3. Draft a conventional commit message (`type(scope): description`)
4. Stage files: `git add <files>`
5. Commit: `git commit -m "<message>"`
6. Show final `git status`

## Rules
- Do NOT commit .env, credentials.json, or secrets
- Do NOT use --no-verify or --no-gpg-sign
- Only commit when user explicitly requests it
