---
name: dev-loop-pr-writer
description: >
  Use this skill when the user says 'PR description', 'pull request', 'create PR', 'PR template', 'write PR', 'PR summary', 'PR body', 'write pull request', 'PR for changes'. Generates a well-structured PR description from git diff. Do NOT use for: commit messages or changelogs.
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [dev-loop, pr, github, phase-7]
version: "2.0.0"
author: "j4flmao"
license: "MIT"
---

# Dev Loop PR Writer

## Purpose
Generate well-structured pull request descriptions from git diffs. Enforces conventional commit format, organizes changes by category, and includes testing notes and checklists for consistent PR quality across the team.

Eliminates vague PR descriptions, missing context, and inconsistent formatting. Every PR produced by this skill is ready to paste into GitHub, GitLab, or Bitbucket without editing. Designed for teams practicing trunk-based development with short-lived feature branches. Consistent PR quality reduces review cycle time and makes changelog generation automatic.

## Agent Protocol

### Trigger
"PR description", "pull request", "create PR", "PR template", "write PR", "PR summary", "PR body", "write pull request", "PR for changes"

### Input Context
- `git diff HEAD` output (required) — full diff with file paths and line numbers
- List of changed files with diff stats (insertions, deletions, rename status)
- Optional: issue/feature reference numbers (e.g. #123, PROJ-456)
- Optional: branch name for scope inference (feature/ prefix, fix/ prefix)
- Optional: related PR numbers for cross-reference in change list
- Optional: previous PR template from the repository for consistency

### Output Artifact
PR body text — title, summary paragraph, change list (grouped by category), testing notes, checklist

### Response Format
- Output starts with PR title as markdown H2 heading
- Followed by summary paragraph (2-4 sentences: problem, solution, effect)
- Then change list as bullet groups with sub-headings per logical category
- Then testing notes section with edge cases explicitly called out
- Then checklist with markdown checkboxes for each verification step
- Compression footer appended verbatim as the final line
- No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
PR body is complete, formatted, and ready to paste into GitHub/ GitLab / Bitbucket. Title does not exceed 72 characters. All four body sections (summary, changes, testing, checklist) are present. Conventional commit type and scope are correct.

### Max Response Length
2000 tokens

## Architecture

### PR Generation Pipeline
```
Git Diff ──> Diff Analysis ──> Categorization ──> Section Generation ──> PR Body
                                                                          
Parse diff        Identify         Group changes     Title (conv commit)
stats +           changed          by primary type   Summary (problem → solution → effect)
file paths        files            (feat/fix/        Change list (grouped bullets with file refs)
                  + line           refactor/chore/   Testing notes (unit, integration, edge cases)
                  ranges           test/docs)        Checklist (standardized verification steps)
```

### Decision Tree: Change Classification
```
What is the primary nature of this change?
├── Adds new user-facing functionality
│   → type: feat, scope: feature area
│   Example: feat(auth): add password reset flow
├── Corrects incorrect behavior
│   → type: fix, scope: affected area
│   Example: fix(payments): handle declined card response
├── Restructures code without behavior change
│   → type: refactor, scope: module name
│   Example: refactor(database): extract query builder
├── Updates tooling, CI, or dependencies
│   → type: chore, scope: system area
│   Example: chore(ci): pin GitHub Actions runner
├── Adds or fixes tests
│   → type: test, scope: tested area
│   Example: test(api): add rate limit middleware tests
└── Documentation updates only
    → type: docs, scope: document name
    Example: docs(readme): update quickstart steps
```

## Workflow

1. **Analyze diff** — Read `git diff HEAD` output. Identify all changed files with their diff stats. Categorize each change by primary type: feat (new feature — adds user-facing functionality), fix (bug fix — corrects incorrect behavior), refactor (restructure without behavior change — rename, extract, inline), chore (tooling, CI, dependency updates, config changes), test (additions or corrections to test suite), docs (documentation changes — README, JSDoc, ADRs). Note specific file:line ranges for the change list references.

2. **Write PR title** — Use conventional commit format with required scope: `feat(feature): description`, `fix(area): description`, `refactor(module): description`. Keep under 72 characters total. Use imperative mood ("Add" not "Added" or "Adds"). Scope is a noun (the module or area changed). No trailing period.

3. **Write summary** — One paragraph (2-4 sentences) explaining what changed and why. Structure: state the problem that existed, describe the solution implemented, note the effect on users or developers. Focus on motivation and context. Avoid restating the diff — the diff already shows what changed, the summary explains why it matters. Reference the issue number with a keyword: `Closes #123` or `Relates to #456`.

4. **Add change list** — Bullet points per logical change (not per file — multiple small files in one logical change get one bullet). Reference specific files and function names with `file.ts:42` format. Group related changes under sub-headings for readability (## API Changes, ## Bug Fixes, ## Internal Refactoring). Each bullet starts with an imperative verb. No trailing punctuation.

5. **Add testing notes** — Describe how the change was verified: unit tests added with count and coverage, integration tests for API contracts, manual testing steps for UI changes. List edge cases covered: empty state, error state, boundary conditions, null inputs, concurrent access. Mention test framework and assertion count for credibility.

6. **Add checklist** — Ensure all items are checked before submission: self-review of diff completed, tests added for new code, existing tests pass without regression, documentation updated (API docs, README, ADR), no linting or type errors, edge cases handled (empty, error, loading states), backwards compatibility verified, API changes documented in OpenAPI spec if applicable.

7. **Add reviewer guidance** — Include a section with specific questions or areas where the author wants feedback: "Focus review on the retry logic in `Fetcher.ts:120-180`", "Are there edge cases in the rate limiting config I may have missed?", "Should this be behind a feature flag?" Explicit guidance gets reviewers to the right code faster and improves review quality.

8. **Handle breaking changes** — If the diff modifies API contracts, database schemas, or public interfaces, add `BREAKING CHANGE:` in a blockquote at the bottom of the description. Include migration instructions for downstream consumers: what changed, what the old behavior was, how to update consuming code, and a before/after example.

## Models

### Conventional Commit Types
```
feat      New feature for the user or consumer of the code
fix       Bug fix for the user or consumer
refactor  Code change with no behavioral change (rename, extract)
chore     Tooling, CI, dependency management, configuration
test      Adding or correcting automated tests
docs      Documentation-only changes (README, comments, ADRs)
perf      Performance improvement
style     Formatting changes only (whitespace, semicolons)
```

### Title Examples
```
feat(auth): add password reset flow with email verification
fix(payments): handle Stripe 402 response for declined cards
refactor(database): extract query builder from UserRepository
chore(ci): pin GitHub Actions runner to ubuntu-24.04
test(api): add integration tests for rate limiting middleware
docs(readme): update quickstart with new env vars
```

### PR Body Structure
```
## Title (conv commit format, <=72 chars)

## Summary
Problem: what was wrong. Solution: what was implemented. Effect: what this means for users.

## Changes
### Category Heading
- Imperative verb description of logical change (file.ts:start-end)
- Imperative verb description of another logical change (other.ts:start-end)

## Testing
- Unit tests: X new, covering Y scenarios
- Integration tests: API contract verification
- Edge cases: empty state, error response, null input
- Manual testing: steps performed on staging

## Checklist
- [ ] Self-review completed
- [ ] Tests added for new code
- [ ] Existing tests pass
- [ ] Documentation updated
- [ ] No lint or type errors
- [ ] Edge cases handled
- [ ] Backwards compatible

## Reviewer Focus
- (specific areas for reviewer attention)

> BREAKING CHANGE: (if applicable, with migration notes)
```

## Rules

- **Title must follow conventional commits** — type(scope): description. No exceptions. Scope is mandatory for clarity. Never use a bare type without scope.
- **Summary explains why, not what** — The diff already shows what changed. The summary explains the motivation, context, and reasoning behind the change.
- **Change list references specific files** — Every bullet in the changes section references at least one file with line range. Vague references like "fixed stuff" are rejected. Use `path/to/file.ts:42-56` format.
- **Testing notes include edge cases** — Happy path alone is insufficient. Every testing section must document at least one boundary condition, error path, or empty state tested.
- **No filler phrases** — Strip "This PR", "This commit", "Please review", "This change", "I have". Start every change bullet with an imperative verb. Start the summary with the problem statement.
- **One PR = one logical change** — No bundled unrelated changes. If the diff touches multiple concerns, split into multiple PRs. A single PR with both a bug fix and a refactor should be two PRs.
- **Issues are referenced, not re-described** — Use `Closes #123` or `Relates to #456`. Do not re-explain the issue content in the PR summary. The link provides context.
- **Breaking changes get a visible footnote** — If the change modifies an API contract, database schema, or public interface, add `BREAKING CHANGE:` in a blockquote at the bottom of the description.
- **PR title and branch prefix match** — If the branch starts with `fix/`, the PR title should use `fix(scope)`. Branch prefix and conventional commit type should align.
- **Reviewer guidance must be specific** — "Please review" is not guidance. Ask specific questions about risky areas, design decisions, or edge cases.
- **PR description must be self-contained** — A reviewer should understand the change and its context from the PR alone, without switching to external tickets.
- **Screenshots for UI changes** — If the diff includes UI changes, include before/after screenshots. A picture catches layout regressions that code review misses.
- **Performance impact noted** — If the change could affect performance (query changes, new API endpoints, image processing), include benchmark results or performance analysis.

## Common Pitfalls

- **Summary repeats the diff**: "Changed X to Y" is not a summary. The summary should explain _why_ X was changed to Y. Focus on motivation, not mechanics.
- **No issue reference**: PRs without linked issues lose context after merge. Every PR should reference at least one issue with `Closes`, `Fixes`, or `Relates to`.
- **Overly broad scope**: A PR titled `feat(api): add endpoints` is too vague. `feat(api): add bulk user import and export endpoints` is specific and useful in changelogs.
- **Checklist items unchecked**: An unchecked "Tests added" checkbox when tests are present looks sloppy. Only include checklist items that are verified complete.
- **Missing screenshots for UI changes**: Code review alone cannot catch visual regressions. Always include before/after screenshots or a screen recording for UI changes.
- **Ignoring the "why" for refactors**: Refactors need extra motivation. If the PR says "extract function" without explaining why extraction improves the codebase, reviewers will question the value.
- **Breaking changes without migration notes**: Breaking the API contract without migration guidance forces downstream teams to reverse-engineer the migration path. Always provide explicit migration steps.

## Compared With

| Tool | Input | Output Customization | Platform Support |
|------|-------|---------------------|------------------|
| This skill | git diff | Template-based, team conventions | GitHub, GitLab, Bitbucket |
| GitHub Copilot PR | git diff + context | AI-completed sections | GitHub only |
| GPT-based PR generators | git diff | Free-form AI output | Generic |
| Conventional PR template | Manual | Human-written | Any |
| Release-drafter | GitHub labels | PR-based release notes | GitHub only |
| PR Pilot | git diff + AI | Automated PR creation | GitHub, GitLab |

## Performance

- Diff analysis: parsing a 500-line diff with 10 changed files completes in <200ms
- Title generation: <50ms using heuristic classification of changed file paths and diff content
- Full PR body generation: <1 second for a typical feature branch with 10-20 changed files
- Breaking change detection: heuristic analysis of diff content (interface changes, schema modifications) in <100ms
- Template rendering: <50ms to fill in sections and format markdown
- Checklist generation: static template, negligible time
- The generation runs entirely locally — no API calls needed, no latency from external services

## Tooling

| Tool | Category | Use Case |
|------|----------|----------|
| git diff | Input source | Diff analysis for change extraction |
| gh CLI | PR creation | Create PRs from generated descriptions |
| GitKraken / Fork | Visual client | Manual PR review before submission |
| GitHub CLI | GitHub integration | PR creation, status checks, reviews |
| GitLab CLI | GitLab integration | PR creation for GitLab projects |
| Browser extension (Refined GitHub) | Review UX | Enhanced PR viewing experience |
| GitHub Actions / GitLab CI | Automation | Auto-generate descriptions in CI |
| conventional-changelog | Changelog | Link generated PRs to changelog entries |

## Handoff
git-workflow for commit + push. After the PR body is written, hand off to the git-workflow skill to commit the changes and push the branch for review.
