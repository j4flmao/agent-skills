# Merge Conflict Resolution

## Understanding Conflicts

A merge conflict occurs when two branches have modified the same lines of the same file. Git cannot automatically determine which change to keep.

### Conflict Markers

```
<<<<<<< HEAD
This is the current branch's version
=======
This is the incoming branch's version
>>>>>>> feature-branch
```

- `<<<<<<< HEAD` — Start of current branch's version
- `=======` — Separator between versions
- `>>>>>>> feature-branch` — End of incoming branch's version

## Conflict Prevention

### Keep Branches Short-Lived

```bash
# Branches that live > 2 days are conflict magnets
# Rebase frequently to stay current
git rebase main
```

### Communication

- Announce major refactors on team channel
- Use CODEOWNERS to assign file responsibility
- Pair on high-risk merges

### Architectural Strategies

- Microservices reduce shared code surface
- Well-defined interfaces and contracts
- Feature flags instead of long-lived branches
- Monorepo tools (Nx, Turborepo) detect affected projects

## Resolution Workflows

### Merge

```bash
# Merge feature into main
git checkout main
git merge feature/user-auth

# CONFLICT in src/user.ts
# Resolve conflicts manually
git add src/user.ts
git commit
```

### Rebase

```bash
# Rebase feature onto main (cleaner history)
git checkout feature/user-auth
git rebase main

# CONFLICT — resolve, then continue
# Fix conflicts in affected files
git add <resolved-files>
git rebase --continue

# Or skip this commit
git rebase --skip

# Or abort rebase entirely
git rebase --abort
```

### Cherry-Pick

```bash
# Pick specific commits from another branch
git cherry-pick abc123

# CONFLICT — resolve normally
git add <resolved-files>
git cherry-pick --continue
```

## Resolution Strategies by Conflict Type

### Same Lines Changed

The most common and straightforward:

1. Read both versions in the diff
2. Determine which changes to keep, modify, or combine
3. Remove conflict markers
4. Test the result

```typescript
// CONFLICT
<<<<<<< HEAD
const taxRate = 0.08
=======
const TAX_RATE = 0.10
>>>>>>> feature/tax-update

// RESOLVED
const TAX_RATE = 0.09  // Compromise: new rate but follow naming convention
```

### One Side Deleted, Other Modified

```bash
# File exists in HEAD but deleted in feature branch
CONFLICT: user.ts deleted in feature/tax-update and modified in HEAD

# Options:
git add user.ts        # Keep HEAD version
git rm user.ts         # Accept deletion
```

### Both Added Same File Differently

```bash
# Both branches created src/utils.ts with different content
# Merge conflict — you must reconcile both implementations

# Options:
# 1. Keep both versions merged into one file
# 2. Rename one file
# 3. Accept one version entirely
```

### Binary File Conflicts

```bash
# Binary files can't be merged line-by-line
# Choose one version
git checkout --ours assets/logo.png    # Keep HEAD version
git checkout --theirs assets/logo.png  # Keep incoming version
git add assets/logo.png
```

## Tools for Conflict Resolution

### VS Code

VS Code provides a three-way merge editor:

```json
// settings.json
"git.mergeEditor": true
```

Features:
- Incoming and current panes side by side
- Accept buttons for each change
- Combined view showing result
- Undo/redo per resolution decision

### Command Line

```bash
# See conflict summary per file
git diff --name-only --diff-filter=U

# See conflicts with context (3 lines)
git diff --check

# List all conflicted files
git status --short | grep "^UU"

# Show the merge base
git merge-base HEAD MERGE_HEAD
```

### mergetool

```bash
# Configure
git config merge.tool vscode
git config mergetool.vscode.cmd 'code --wait "$MERGED"'

# Launch mergetool
git mergetool
```

## Complex Resolutions

### Resolving After Failed Automatic Merge

```bash
# Start clean
git merge --abort

# Retry with strategy options
git merge -Xours feature/branch         # Prefer our version on conflicts
git merge -Xtheirs feature/branch       # Prefer their version on conflicts
git merge -Xpatience feature/branch     # Better diffs for large reworks
git merge -Xdiff-algorithm=histogram    # Alternative diff algorithm
```

### Splitting Large Merge

```bash
# Merge file-by-file for control
git merge --no-commit --no-ff feature/branch

# Review and resolve each file
git add src/file1.ts
git commit --no-edit
git add src/file2.ts
git commit --no-edit
# ... continue for each logical group
git merge --continue
```

### Three-Way Merge with Base

```bash
# Show the merge base version
git show $(git merge-base HEAD MERGE_HEAD):path/to/file.ts

# Compare HEAD vs base
git diff $(git merge-base HEAD MERGE_HEAD):path/to/file.ts HEAD:path/to/file.ts

# Compare feature vs base  
git diff $(git merge-base HEAD MERGE_HEAD):path/to/file.ts MERGE_HEAD:path/to/file.ts
```

## Post-Resolution Checklist

- [ ] All conflict markers removed (search `<<<<<<<` in workspace)
- [ ] All `=======` and `>>>>>>>` markers removed
- [ ] Code compiles without errors
- [ ] Tests pass (especially around resolved code)
- [ ] Linter passes on all touched files
- [ ] No unintended changes from the merge
- [ ] Both sides' intended changes are preserved

```bash
# Verify no remaining markers
rg '<<<<<<<|=======|>>>>>>>' src/

# Check only expected files changed
git diff --stat HEAD
```

## Handling Recurring Conflicts

### If same file conflicts repeatedly:

1. Extract conflicting section into a shared module
2. Assign a file owner responsible for coordination
3. Consider splitting the file into smaller, independent files
4. Use git attributes for custom merge drivers

### Custom Merge Drivers

```bash
# .gitattributes
*.lock -merge  # Always conflict — force manual review
*.json merge=union  # Accept both sides for JSON lists
```

```bash
# Configure union merge driver
git config merge.union.driver true
```
