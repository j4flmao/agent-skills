---
name: husky-and-hooks
description: >
  Use this skill when the user says 'git hooks', 'husky', 'lint-staged', 'pre-commit hook', 'commit-msg hook', 'commitlint', 'pre-push', 'lefthook', 'pre-commit framework', 'hooks not running', 'skip hooks', 'core.hooksPath'. Sets up and debugs client-side Git hooks: how hooks work, Husky v9 for JS repos, lint-staged for staged-file checks, commitlint for Conventional Commits, language-agnostic alternatives (pre-commit, lefthook), performance and CI parity. Do NOT use for: server-side CI pipelines (use devops/github-actions or devops/gitlab-ci), linter rule configuration itself (use tools/eslint or language skills), branching policy (use advanced-workflows).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [tools, git, hooks, husky, lint-staged, commitlint]
---

# Git Hooks with Husky, lint-staged and Friends

## Purpose
Client-side hooks catch formatting, lint and commit-message problems seconds after they are made instead of minutes later in CI. They are a convenience, not enforcement: anyone can bypass them, so CI must run the same checks. This skill sets up fast, cross-platform hooks and explains how to debug them.

## Agent Protocol

### Trigger
"git hooks", "husky", "lint-staged", "pre-commit hook", "commit-msg", "commitlint", "pre-push", "lefthook", "pre-commit framework", "hooks not running", "core.hooksPath".

### Input Context
- Repo languages and package manager (npm/pnpm/yarn/bun, Python uv, polyglot)
- Checks wanted per stage and their run time
- OS mix of contributors (Windows needs a POSIX shell such as Git Bash for shell hooks)

### Output Artifact
Hook files, `package.json`/config snippets, and troubleshooting steps. No file unless requested.

### Response Format
```
Tool: {husky + lint-staged | pre-commit | lefthook}
Hooks: {hook -> command -> target time}
Config: {snippets}
CI parity: {same checks in CI}
Bypass/debug: {how to skip once, how to debug}
```

## 1. How Hooks Work
- Git runs executable scripts from `.git/hooks/` (or the directory in `core.hooksPath`) at events. Client-side: `pre-commit`, `prepare-commit-msg`, `commit-msg`, `post-commit`, `pre-rebase`, `post-checkout`, `post-merge`, `pre-push`.
- A non-zero exit from `pre-commit`, `commit-msg` or `pre-push` aborts the operation.
- `.git/hooks` is not versioned; tools like Husky set `core.hooksPath` to a committed directory so the team shares hooks.
- Bypass: `git commit --no-verify` / `git push --no-verify` (skips pre-commit, commit-msg and pre-push). For Husky, `HUSKY=0` disables hooks (useful in CI and scripted commits).

## 2. Husky v9 Setup (JavaScript repos)
```bash
npm install --save-dev husky lint-staged @commitlint/cli @commitlint/config-conventional
npx husky init          # creates .husky/pre-commit and adds "prepare": "husky" to package.json
```
`package.json`:
```json
{
  "scripts": { "prepare": "husky" },
  "lint-staged": {
    "*.{js,jsx,ts,tsx}": ["eslint --fix --max-warnings=0", "prettier --write"],
    "*.{json,md,yml,yaml,css}": "prettier --write"
  }
}
```
`.husky/pre-commit`:
```sh
npx lint-staged
```
`.husky/commit-msg`:
```sh
npx --no -- commitlint --edit "$1"
```
`commitlint.config.js` (ESM projects use `export default`; CommonJS `module.exports`):
```js
export default { extends: ['@commitlint/config-conventional'] };
```
`.husky/pre-push` (optional, keep it fast):
```sh
npm run typecheck && npm test -- --run
```
- Husky v9 hook files are plain shell scripts; the old `. "$(dirname -- "$0")/_/husky.sh"` line from v8 is no longer needed (and is deprecated).
- `prepare` runs on `npm install`, so hooks install automatically for contributors. In production/CI installs without devDependencies the `husky` binary is missing; use `"prepare": "husky || true"` or set `HUSKY=0`.
- Monorepo with the package in a subdirectory: run `husky` from that package with the hooks directory path, and `cd` into it inside hooks.

## 3. lint-staged Behaviour
- Runs commands only on staged files that match each glob, passes file paths as arguments, and re-stages files modified by fixers.
- Stashes unstaged changes before running and restores them afterwards, so partially staged files are checked as they will be committed.
- Keep tasks to per-file tools (formatters, linters). Project-wide checks (`tsc --noEmit`, full test suite) belong in `pre-push` or CI because they ignore the file list and are slow.
- For type checking only changed files, use a function config: `"*.ts": () => "tsc --noEmit"` (runs once, without file arguments).

## 4. Language-Agnostic Alternatives
| Tool | Config | Strengths |
|------|--------|-----------|
| pre-commit (pre-commit.com) | `.pre-commit-config.yaml` | huge hook catalogue, isolated environments per hook, `pre-commit run --all-files` in CI; popular in Python/polyglot repos |
| lefthook | `lefthook.yml` | single Go binary, parallel hooks, glob filtering, no Node needed |
| Plain `core.hooksPath` | committed `scripts/hooks/` + `git config core.hooksPath scripts/hooks` | zero dependencies |

pre-commit example:
```yaml
repos:
  - repo: https://github.com/astral-sh/ruff-pre-commit
    rev: v0.6.9            # pin; update with `pre-commit autoupdate`
    hooks:
      - id: ruff
        args: [--fix]
      - id: ruff-format
  - repo: https://github.com/gitleaks/gitleaks
    rev: v8.21.2
    hooks:
      - id: gitleaks
```
Pin `rev`s to tags and update them deliberately (`pre-commit autoupdate`); check current versions when copying.

## 5. What to Run Where
| Stage | Target time | Checks |
|-------|-------------|--------|
| pre-commit | < 5 s | format, lint fix on staged files, secret scan (gitleaks), large-file and merge-marker checks |
| commit-msg | < 1 s | commitlint / message format |
| pre-push | < 60 s | type check, unit tests for affected packages |
| CI (required) | any | everything above on all files + full tests, builds, security scans |
CI must run the same tools with the same versions; hooks are only an early warning.

## 6. Troubleshooting
- Hooks not running: check `git config core.hooksPath` (should be `.husky/_` for Husky v9 — the generated wrapper directory), that `npm install` ran `prepare`, and that hook files are executable on macOS/Linux (`chmod +x .husky/*`).
- Windows: hooks run through Git's bundled sh; use LF line endings for hook files (`.gitattributes`: `.husky/* text eol=lf`).
- GUI clients/IDEs may not load your shell profile — Node from nvm/fnm/volta may be missing; Husky reads `~/.config/husky/init.sh` for PATH setup.
- Debug: `HUSKY=2 git commit ...` (Husky v9 prints each command), `pre-commit run --verbose`, `LEFTHOOK_VERBOSE=1`.

## 7. Anti-Patterns
| Anti-pattern | Problem | Fix |
|--------------|---------|-----|
| Full test suite in pre-commit | slow commits → people use `--no-verify` | move to pre-push/CI |
| Hooks as the only enforcement | bypassable | same checks required in CI |
| Running linters on the whole repo in pre-commit | slow, unrelated failures | lint-staged / file filters |
| Unpinned hook versions | different results per machine | pin versions, lockfile |
| Hooks that modify files without re-staging | committed content differs from checked content | lint-staged or `git add` within the tool's flow |

## 8. Checklist
- [ ] Hooks versioned and auto-installed (`prepare`, `pre-commit install`, `lefthook install`)
- [ ] pre-commit limited to staged files and under a few seconds
- [ ] Commit messages validated (Conventional Commits)
- [ ] Secret scanning before commit
- [ ] Identical checks enforced in CI; documented bypass for emergencies
