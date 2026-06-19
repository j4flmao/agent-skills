# Secret Scanning Guide

## Scanning Tools

### GitLeaks (Local & CI)
```bash
# Scan entire repository history
gitleaks detect --source . --verbose

# Scan staged changes (pre-commit)
gitleaks protect --staged

# Generate SARIF report for GitHub
gitleaks detect --source . --report-format sarif --report-path report.sarif

# Custom config
gitleaks detect --source . --config .gitleaks.toml
```

### TruffleHog (Deep Scanning)
```bash
# Scan for secrets with entropy detection
trufflehog filesystem --directory . --json

# Scan GitHub org
trufflehog github --org=my-org --token=$GITHUB_TOKEN

# Scan GitLab
trufflehog gitlab --url=https://gitlab.com --token=$GITLAB_TOKEN
```

## Incident Response for Leaked Secrets
1. **Detect**: Automated scanning finds leaked secret
2. **Verify**: Is the secret still valid? Where was it exposed?
3. **Revoke**: Immediately revoke the compromised credential
4. **Rotate**: Generate new credential, deploy to all affected systems
5. **Forensics**: Determine how the secret was leaked, fix the process gap
6. **Post-mortem**: Update scanning rules, training, and process

## Key Points
- Use multiple scanning tools (GitLeaks + TruffleHog + GitHub secret scanning)
- Scan all branches and full git history, not just the latest commit
- Pre-commit hooks prevent secrets from entering the repository
- GitHub secret scanning (push protection) blocks secrets on push
- Have an incident response plan for leaked secrets
- Revoke immediately, then investigate root cause
- Use webhook-based scanning for real-time detection
