---
name: conflict-resolution
description: >
  Use this skill when the user says 'merge conflict', 'rebase conflict', 'resolve conflicts', 'conflict markers', 'ours vs theirs', 'git rerere', 'abort rebase', 'lost commits', 'git reflog', 'undo a merge', 'revert a merge', 'detached HEAD', 'recover deleted branch', 'git bisect', 'cherry-pick conflict'. Resolves Git conflicts and recovers from mistakes: how three-way merges produce conflicts, reading diff3/zdiff3 markers, ours/theirs semantics during merge vs rebase, tools (mergetool, rerere), lock files and generated files, undoing merges/rebases with reflog, and finding regressions with bisect. Do NOT use for: choosing a team branching model (use advanced-workflows), hook automation (use husky-and-hooks).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [tools, git, merge-conflict, rebase, reflog, bisect]
---

# Git Conflict Resolution and Recovery

## Purpose
Conflicts are Git asking a human to combine two edits of the same region; most bad resolutions come from not seeing the common ancestor or confusing "ours" and "theirs". Most "lost work" is still recoverable from the reflog. This skill gives a safe procedure for both.

## Agent Protocol

### Trigger
"merge conflict", "rebase conflict", "conflict markers", "ours vs theirs", "git rerere", "abort rebase", "lost commits", "git reflog", "undo a merge", "revert a merge", "detached HEAD", "recover branch", "git bisect", "cherry-pick conflict".

### Input Context
- Operation in progress (`git status` output: merge, rebase, cherry-pick, revert, stash pop)
- Conflicted files and their type (source, lock file, generated, binary)
- Whether the affected commits are already pushed/shared

### Output Artifact
Step-by-step commands with explanation, and the resolved code when the conflict content is provided. No file unless requested.

### Response Format
```
State: {operation in progress, branch, conflicted files}
Meaning: {ours = ..., theirs = ...}
Steps: {numbered commands}
Resolution: {combined code / which side and why}
Verify: {build/tests, git diff checks}
Safety net: {how to undo this}
```

## 1. Why Conflicts Happen
Git merges three versions: the merge base (common ancestor), ours, and theirs. Changes to different regions combine automatically; overlapping changes to the same lines (or edit vs delete, or both adding the same file) become conflicts. The default merge strategy since Git 2.34 is `ort`.

## 2. See the Ancestor: zdiff3 Markers
```bash
git config --global merge.conflictStyle zdiff3      # Git 2.35+; use diff3 on older Git
```
```
<<<<<<< HEAD
timeout = 30
||||||| merged common ancestors
timeout = 10
=======
timeout = 10
retries = 3
>>>>>>> feature/retries
```
With the base visible you can tell: ours changed the timeout, theirs added retries → keep both: `timeout = 30` and `retries = 3`. Without the base section this looks like an either/or choice.

## 3. Ours vs Theirs
| Operation | `--ours` / `HEAD` | `--theirs` |
|-----------|-------------------|------------|
| `git merge feature` (on main) | main (current branch) | feature |
| `git rebase main` (on feature) | main + already-replayed commits (the new base) | your feature commit being replayed |
| `git cherry-pick X` | current branch | commit X |
During a rebase the labels feel reversed because Git checks out the upstream and replays your commits onto it.

Take one side for a whole file: `git checkout --ours -- path` / `git checkout --theirs -- path` (or `git restore --ours/--theirs -- path`), then `git add path`.

## 4. Resolution Procedure
```bash
git status                                  # what operation, which files
git diff                                    # combined diff of conflicts
git mergetool                               # optional: configured 3-way tool (VS Code, IntelliJ, Meld, Beyond Compare)
# edit files, remove all markers
git diff --check                            # catches leftover conflict markers/whitespace
<build and run tests>
git add <files>
git merge --continue | git rebase --continue | git cherry-pick --continue
```
- Abort cleanly any time before committing: `git merge --abort`, `git rebase --abort`, `git cherry-pick --abort`.
- During a long rebase, `git rebase --skip` drops the current commit (only if its change is truly redundant).
- Understand the intent of both sides (read the commits: `git log --merge -p -- path`) instead of mechanically picking one.

## 5. Special Files
| File type | Approach |
|-----------|----------|
| Lock files (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `poetry.lock`, `uv.lock`, `Cargo.lock`) | resolve the manifest (`package.json`, `pyproject.toml`), take one side of the lock, then regenerate with the package manager (`npm install`, `pnpm install`, `uv lock`, `cargo update -p ...` only if needed) and commit the result |
| Generated code / snapshots | regenerate from sources, do not hand-merge |
| Binary files (images, design files) | choose a side (`--ours`/`--theirs`); consider Git LFS locking for binaries |
| Migrations with sequence numbers | renumber/re-generate the newer migration so order stays linear |
| Renames + edits | `ort` detects most renames; if not, apply the edit to the new path manually |
Optional automation: `.gitattributes` merge drivers (e.g. `merge=union` for append-only changelogs; custom drivers for lock files such as `npm-merge-driver`-style tools).

## 6. rerere: Reuse Recorded Resolution
```bash
git config --global rerere.enabled true
```
Git records how you resolved a conflict hunk and reapplies it when the same conflict reappears (repeated rebases, re-merging a topic branch). Review reapplied results; `git rerere forget path` discards a bad recording.

## 7. Reduce Future Conflicts
Small, short-lived branches; rebase/merge `main` frequently; avoid mass reformatting mixed with logic changes (format in a separate commit, then list it in `.git-blame-ignore-revs`); agree on formatter configuration; split large files that everyone edits.

## 8. Recovery Toolkit
```bash
git reflog                                   # every position HEAD/branches had (local, ~90 days by default)
git branch rescue <sha>                      # recover "lost" commits or a deleted branch
git reset --hard ORIG_HEAD                   # undo the last merge/rebase/reset locally (destroys uncommitted changes)
git revert -m 1 <merge-sha>                  # undo a pushed merge with a new commit (keeps history)
git switch -c save-work                      # leave detached HEAD without losing commits
git stash list; git stash show -p stash@{0}  # find stashed work; a dropped stash can be found via `git fsck --lost-found`
```
- Prefer `revert` for anything already pushed; `reset` rewrites history and is only safe on local/unshared branches.
- Before any risky operation: `git branch backup/<name>` costs nothing.
- Reverting a merge means re-merging that branch later will not bring those changes back unless you revert the revert.

## 9. Find the Commit that Broke It: bisect
```bash
git bisect start
git bisect bad                      # current commit is broken
git bisect good v2.3.0              # last known good
git bisect run ./scripts/test.sh    # exit 0 = good, 1-127 (except 125) = bad, 125 = skip
git bisect reset
```
Binary search needs about log2(N) test runs for N commits.

## 10. Anti-Patterns
- Committing files that still contain `<<<<<<<` markers (enable `git diff --check` in a pre-commit hook).
- Hand-merging lock files line by line.
- Resolving by always taking "mine" without understanding the other change.
- `git push --force` after resolving a rebase on a shared branch without `--force-with-lease`.
- `git reset --hard` with uncommitted work you meant to keep.

## 11. Checklist
- [ ] `zdiff3` conflict style and `rerere` enabled
- [ ] Ours/theirs confirmed for the current operation
- [ ] No markers left (`git diff --check`); build and tests pass before continuing
- [ ] Lock/generated files regenerated, not hand-merged
- [ ] Shared history fixed with `revert`, local with `reset`/rebase; backup branch made first
