# Best Practices

## Security

```yaml
# Use OIDC instead of static credentials
jobs:
  deploy:
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::123456789012:role/GitHubActionsRole
          aws-region: us-east-1

# Least privilege on GITHUB_TOKEN
permissions:
  contents: read
  issues: none
  pull-requests: write
  packages: read

# Pin action versions
- uses: actions/checkout@v4         # major tag OK with trust
- uses: actions/setup-node@v4
- uses: actions/cache@v4

# Never hardcode secrets
- run: echo "${{ secrets.DEPLOY_KEY }}" | base64 --decode > key.pem  # WRONG
- run: echo "$DEPLOY_KEY" > key.pem                                  # CORRECT (env var)
  env:
    DEPLOY_KEY: ${{ secrets.DEPLOY_KEY }}
```

## Performance

```yaml
# Dependency caching
- uses: actions/cache@v4
  with:
    path: |
      ~/.npm
      .next/cache
    key: ${{ runner.os }}-build-${{ hashFiles('**/package-lock.json') }}
    restore-keys: |
      ${{ runner.os }}-build-

# Conditional dependency installation
- run: npm ci --prefer-offline
- run: npm ci --ignore-scripts
  if: ${{ !contains(github.event.head_commit.message, 'build') }}

# Parallel job execution
jobs:
  lint:
  test:
    needs: lint
  e2e:
    needs: lint
  # lint + test/e2e runs in parallel
```

## Caching Strategy

| Cache key strategy | Use case |
|--------------------|----------|
| `hashFiles('lockfile')` | Exact match, best hit rate |
| `runner.os` prefix | Fallback for OS-specific deps |
| `runner.os-build-` | Cross-branch fallback |
| `**/*.sln` | .NET project files |
| `**/yarn.lock` | Yarn projects |

## Workflow Organization

```yaml
# Separate workflows by concern
.github/workflows/
  ci.yml           # Build + test
  lint.yml         # Linting only
  deploy.yml       # Deployment
  release.yml      # Release/tag
  security.yml     # Security scanning
  cleanup.yml      # Scheduled cleanup

# Consistent naming
name: "CI"                # Capitalized, readable
run-name: "CI ${{ github.sha }}"  # Descriptive run names

# Job naming
jobs:
  validate:     # Short, clear
  unit-test:    # Prefix category
  integration-test:
  build:
  deploy-staging:
  deploy-prod:
```

## Monitoring and Debugging

```yaml
# Step summary
- run: |
    echo "## Test Results" >> $GITHUB_STEP_SUMMARY
    echo "| Suite | Status |" >> $GITHUB_STEP_SUMMARY
    echo "|---|---|" >> $GITHUB_STEP_SUMMARY
    echo "| Unit | ✅ Passed |" >> $GITHUB_STEP_SUMMARY

# Debug logging (toggled by secrets)
- run: npm test -- --verbose
  env:
    DEBUG: ${{ secrets.ACTIONS_STEP_DEBUG || '' }}

# Job summary
- run: echo "# Deployment Complete" >> $GITHUB_STEP_SUMMARY

# Fail fast with annotations
- run: |
    if [ ${{ job.status }} != "success" ]; then
      echo "::error title=Deploy Failed::Check the logs for details"
      exit 1
    fi
```

## Cost Optimization

- Use `ubuntu-latest` instead of `windows-latest` unless Windows is required
- Cancel duplicate workflows with `concurrency`
- Use `timeout-minutes` to prevent runaway jobs
- Cache aggressively to reduce build times
- Use `if:` conditions to skip unnecessary jobs
- Consider self-hosted runners for high-volume workflows
