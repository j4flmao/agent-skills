# Advanced Git Workflows

## Interactive Rebase

### Squashing Commits
```bash
git rebase -i HEAD~5
# Change 'pick' to 'squash' for commits to merge
# Keep the first commit as 'pick'
```

### Editing Commit Messages
```bash
git rebase -i HEAD~3
# Change 'pick' to 'reword' for commits needing message changes
```

### Splitting Commits
```bash
git rebase -i HEAD~3
# Change 'pick' to 'edit'
git reset HEAD^
git add -p  # Stage changes in logical groups
git commit -m "First logical change"
git commit -m "Second logical change"
git rebase --continue
```

## Cherry-Picking

### Selective Commit Application
```bash
# Apply specific commit to current branch
git cherry-pick <commit-hash>

# Cherry-pick range of commits
git cherry-pick <start-hash>^..<end-hash>

# Cherry-pick with no automatic commit (edit first)
git cherry-pick -n <commit-hash>
```

### Common Cherry-Pick Scenarios
- Hotfix backport to release branches
- Selective feature extraction from feature branches
- Bug fix propagation across maintenance branches

## Bisect for Root Cause Analysis

```bash
# Start bisect
git bisect start
git bisect bad HEAD
git bisect good v1.0.0

# After each step, mark commit as good or bad
git bisect good   # If bug not present
git bisect bad    # If bug present

# End bisect when commit found
git bisect reset
```

### Automation
```bash
git bisect start HEAD v1.0.0
git bisect run npm test  # Automatically test each commit
```

## Reflog Recovery

```bash
# View all reference changes
git reflog

# Recover lost commit
git checkout <lost-commit-hash>

# Recover deleted branch
git checkout -b recovered-branch <hash>
```

## Subtree vs Submodule

| Feature | Subtree | Submodule |
|---------|---------|-----------|
| Content visibility | Full copy in repo | Pointer only |
| Update complexity | Pull + squash | Submodule update |
| CI complexity | No extra steps | Need submodule init |
| Bisect compatibility | Full history | Need submodule checkout |

## Worktree for Parallel Work

```bash
# Create new worktree
git worktree add ../project-feature feature-branch

# List worktrees
git worktree list

# Remove worktree
git worktree remove ../project-feature
```

## Hooks Automation

### Pre-commit Hook
```bash
#!/bin/sh
npm run lint && npm run typecheck
```

### Commit-msg Hook
```bash
#!/bin/sh
# Enforce conventional commit format
if ! head -1 "$1" | grep -qE '^(feat|fix|chore|docs|refactor|test)\(.+\): .+'; then
  echo "ERROR: Conventional commit format required"
  exit 1
fi
```

### Post-checkout Hook
```bash
#!/bin/sh
# Auto-install dependencies when package.json changes
if git diff HEAD@{1} --name-only | grep -q "package.json"; then
  npm install
fi
```
