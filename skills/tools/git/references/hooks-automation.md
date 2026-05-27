# Git Hooks and Automation

## Overview
Git hooks automate actions at various points in the Git lifecycle. Client-side hooks enforce code quality before commits, while server-side hooks enforce policies on pushes. Tools like Husky simplify hook management.

## Client-Side Hooks

### pre-commit Hook
```bash
#!/bin/sh
# .git/hooks/pre-commit

# Run linter on staged files
STAGED_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep '\.\(js\|ts\|tsx\)$')
if [ -n "$STAGED_FILES" ]; then
    echo "Running linter on staged files..."
    npx eslint $STAGED_FILES
    if [ $? -ne 0 ]; then
        echo "Linting failed. Please fix errors before committing."
        exit 1
    fi
fi

# Run tests for changed files
npx jest --findRelatedTests $STAGED_FILES
if [ $? -ne 0 ]; then
    echo "Tests failed. Please fix failures before committing."
    exit 1
fi
```

### commit-msg Hook
```bash
#!/bin/sh
# .git/hooks/commit-msg

# Check conventional commit format
COMMIT_MSG=$(cat "$1")
PATTERN="^(feat|fix|chore|docs|style|refactor|perf|test|ci|build)(\(.+\))?: .{1,72}"

if ! echo "$COMMIT_MSG" | grep -qE "$PATTERN"; then
    echo "ERROR: Commit message does not follow conventional commit format"
    echo ""
    echo "Valid format: type(scope): description"
    echo "Types: feat, fix, chore, docs, style, refactor, perf, test, ci, build"
    echo "Example: feat(auth): add login form validation"
    exit 1
fi
```

### pre-push Hook
```bash
#!/bin/sh
# .git/hooks/pre-push

# Run full test suite before pushing
echo "Running full test suite..."
npx jest
if [ $? -ne 0 ]; then
    echo "Tests failed. Push rejected."
    exit 1
fi

# Check for large files
MAX_SIZE=5242880 # 5MB
git diff --cached --name-only -z | while IFS= read -r -d '' file; do
    size=$(git cat-file -s :"$file")
    if [ "$size" -gt "$MAX_SIZE" ]; then
        echo "ERROR: File '$file' is larger than 5MB"
        exit 1
    fi
done
```

## Husky

### Husky Configuration
```bash
# Install Husky
npm install --save-dev husky
npx husky init

# Create hooks
npx husky add .husky/pre-commit "npx lint-staged"
npx husky add .husky/commit-msg "npx --no-install commitlint --edit \$1"
npx husky add .husky/pre-push "npm test"
```

### lint-staged Configuration
```javascript
// package.json
{
  "lint-staged": {
    "*.{js,ts,tsx}": [
      "eslint --fix",
      "prettier --write"
    ],
    "*.{json,md,yaml}": [
      "prettier --write"
    ],
    "*.css": [
      "stylelint --fix",
      "prettier --write"
    ]
  }
}
```

### commitlint Configuration
```javascript
// commitlint.config.js
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [
      2,
      'always',
      ['feat', 'fix', 'chore', 'docs', 'style', 'refactor', 'perf', 'test', 'ci', 'build'],
    ],
    'scope-case': [2, 'always', 'kebab-case'],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-max-length': [2, 'always', 72],
    'body-max-length': [2, 'always', 200],
    'footer-max-line-length': [2, 'always', 100],
  },
};
```

## Server-Side Hooks

### pre-receive Hook
```bash
#!/bin/sh
# .git/hooks/pre-receive (server-side)

# Enforce branch naming conventions
ZERO_COMMIT="0000000000000000000000000000000000000000"

while read oldrev newrev refname; do
    # Check branch name
    if [[ $refname =~ ^refs/heads/ ]]; then
        branch_name=${refname#refs/heads/}
        if [[ ! $branch_name =~ ^(main|develop|feature/|fix/|hotfix/|release/) ]]; then
            echo "ERROR: Branch name '$branch_name' violates naming convention"
            exit 1
        fi
    fi

    # Prevent direct pushes to main
    if [ "$refname" = "refs/heads/main" ]; then
        echo "ERROR: Direct pushes to main are not allowed. Use pull requests."
        exit 1
    fi

    # Check for large files
    if [ "$oldrev" = "$ZERO_COMMIT" ]; then
        # New branch/ref
        continue
    fi

    MAX_SIZE=10485760 # 10MB
    for commit in $(git rev-list "$oldrev..$newrev"); do
        git ls-tree -r "$commit" | while read -r mode type hash name; do
            size=$(git cat-file -s "$hash")
            if [ "$size" -gt "$MAX_SIZE" ]; then
                echo "ERROR: File '$name' exceeds 10MB"
                exit 1
            fi
        done
    done
done
```

## Hook Management

### Shared Hooks with Template
```bash
# Create hook template directory
mkdir -p ~/.git-templates/hooks
cp hooks/* ~/.git-templates/hooks/
chmod +x ~/.git-templates/hooks/*

# Configure git to use template
git config --global init.templateDir ~/.git-templates

# Or for existing repos
git init  # Reinitializes hooks from template
```

### Skipping Hooks
```bash
# Bypass pre-commit and commit-msg hooks
git commit --no-verify -m "fix: urgent hotfix"
git commit -n -m "fix: skip CI"  # Short form

# Bypass pre-push hook
git push --no-verify
git push -n  # Short form

# Bypass all hooks
git -c core.hookspath=/dev/null commit -m "bypass all hooks"
```

## CI Integration

### GitHub Actions Hook
```yaml
# .github/workflows/quality.yml
name: Code Quality
on: [push, pull_request]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm run lint
      - run: npm run typecheck

  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npm test -- --coverage
```

## Key Points
- pre-commit runs before commit creation, ideal for linting/formatting
- commit-msg validates commit message format
- pre-push blocks pushes that violate policies
- Husky manages and installs client-side hooks
- lint-staged runs linters on staged files only
- commitlint enforces conventional commit format
- Server-side hooks (pre-receive, update, post-receive) enforce server policies
- Hook templates ensure consistent hooks across team
- --no-verify bypasses hooks for emergency situations
- Hooks can be written in any scripting language
- Environment variables ($GIT_DIR, $GIT_INDEX_FILE) provide context
- post-commit, post-merge, post-checkout trigger after operations
- prepare-commit-msg auto-populates commit messages
- applypatch-msg and pre-applypatch for patch workflows
- Server-side hooks prevent policy violations before they reach remote
- Hook scripts should be idempotent and handle edge cases
- CI/CD systems provide server-side enforcement
- Hook debugging uses stderr output and exit codes
- Shared hook repositories standardize team workflows
- pre-push hooks catch issues before PR creation
- Git LFS hooks manage large file handling
- Performance matters - slow hooks frustrate developers
