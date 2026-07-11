# Git Branching Strategy for Blockchain Projects

## Overview

This branching strategy is tailored for blockchain and smart contract development where code immutability, audit trails, and deployment safety are critical. Standard trunk-based or GitHub Flow branching is insufficient because contract deployments are irreversible and audits require fixed code snapshots.

---

## Branch Naming Convention

| Branch Prefix | Purpose | Base Branch | Lifetime |
|---|---|---|---|
| `main` | Production-ready, audited, deployed on mainnet | - | Permanent |
| `develop` / `demo` | Testnet deployment, integration testing | `main` | Permanent |
| `feat/*` | New features | `develop` | Short-lived |
| `fix/*` | Bug fixes (non-security) | `develop` | Short-lived |
| `audit/*` | Security audit remediation | `develop` | Medium-lived |
| `release/v*.*.*` | Release candidates | `develop` | Temporary |
| `hotfix/*` | Emergency production fix | `main` | Short-lived (merge + delete) |
| `chore/*` | Build, CI, dependencies, tooling | `develop` | Short-lived |
| `docs/*` | Documentation only | `develop` | Short-lived |

Examples:
- `feat/staking-rewards-v2`
- `fix/overflow-in-reward-calculation`
- `audit/trail-of-bits-findings`
- `release/v1.0.0-rc1`
- `hotfix/emergency-pause-bypass`
- `chore/upgrade-foundry-1.0`

---

## Branch Flow Diagram

```
                              main (production, audited, mainnet)
                             /    \
                            /      \
                           /        \
                   release/v1.0.0    hotfix/emergency-fix
                   (release cand.)   (critical only)
                         |
                         |
                    develop (testnet, integration)
                    /    |    \
                   /     |     \
                  /      |      \
            feat/xxx  fix/xxx  chore/xxx
                 |
            audit/remediation
            (post-audit branch)
```

### Smart Contract Specific Flow

```
1. feat/my-contract ──PR──→ develop
       ↑                        |
       |                  2. Deploy on testnet
       |                        |
       |                  3. Integration tests pass
       |                        |
       |                  4. Code freeze
       |                        |
       +---- 5. audit/xxx ─────┤ (branch from develop)
                                |
                          6. Fix findings
                                |
                          7. Merge audit back to develop
                                |
                          8. release/v1.0.0 (from develop)
                                |
                          9. Mainnet deploy
                                |
                          10. Tag: MyContract-v1.0.0-mainnet
                                |
                          11. Merge release to main + develop
```

---

## Contract Versioning

### Rules

1. Every contract deployment gets a semantic version.
2. Git tag format: `[ContractName]-v[MAJOR].[MINOR].[PATCH]-[network]`
3. The deployment registry maps `contract address → git commit → semantic version`.

### Version Bumping

| Change | Example | Bump |
|---|---|---|
| Initial deployment | First version | v1.0.0 |
| New feature (non-breaking) | Add staking reward cap | Minor (v1.1.0) |
| Bug fix (no storage change) | Fix rounding error | Patch (v1.0.1) |
| Breaking storage layout | Add new state variable mid-struct | Major (v2.0.0) |
| Emergency fix | Reentrancy fix | Patch (v1.0.1-hotfix1) |

### Tag Examples

```
TokenV1-v1.0.0-mainnet
TokenV1-v1.1.0-mainnet
StakingV2-v2.0.0-mainnet
StakingV2-v2.0.1-sepolia
MultisigWallet-v1.0.0-mainnet
MyContract-v1.0.0-hotfix1-mainnet
```

### Deployment Registry Entry

```json
{
  "TokenV1": {
    "currentVersion": "v1.1.0",
    "deployments": [
      {
        "version": "v1.0.0",
        "address": "0x...",
        "chainId": 1,
        "gitCommit": "a1b2c3d",
        "gitTag": "TokenV1-v1.0.0-mainnet",
        "timestamp": "2026-01-15T10:00:00Z",
        "auditReport": "https://..."
      },
      {
        "version": "v1.1.0",
        "address": "0x...",
        "chainId": 1,
        "gitCommit": "d4e5f6a",
        "gitTag": "TokenV1-v1.1.0-mainnet",
        "timestamp": "2026-03-20T14:30:00Z",
        "auditReport": "https://...",
        "upgradeFrom": "v1.0.0"
      }
    ]
  }
}
```

---

## CI/CD Pipeline per Branch

### `feature/*` and `fix/*`

```yaml
# .github/workflows/pr.yml
on: [pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: foundry-rs/foundry-toolchain@v1
      - run: forge install
      - run: forge fmt --check
      - run: forge build --sizes
      - run: forge test -vvv
      - run: forge snapshot --diff
```

| Trigger | Actions |
|---|---|
| Push to branch | Unit tests + lint + build |
| PR opened | All above + coverage + Slither |
| PR updated | Re-run all checks |
| Required | All checks pass before merge |

### `develop`

```yaml
# .github/workflows/develop.yml
on:
  push:
    branches: [develop]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - run: forge test -vvv
      - run: forge coverage
      - run: slither .
      - run: forge snapshot --diff

  deploy-testnet:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - run: forge script script/Deploy.s.sol --rpc-url sepolia --broadcast --verify
```

| Trigger | Actions |
|---|---|
| Push to develop | Full test suite + coverage + Slither |
| After push | Auto-deploy to testnet |
| On success | Notify team (Slack/Discord) |
| On failure | Block merge until fixed |

### `release/*`

```yaml
on:
  push:
    branches: [release/v*]

jobs:
  full-audit-check:
    runs-on: ubuntu-latest
    steps:
      - run: forge test --invoke-runs 1000
      - run: forge coverage --report lcov
      - run: slither . --fail-high
      - run: forge verify-contract --chain-id 11155111

  deploy-staging:
    needs: full-audit-check
    runs-on: ubuntu-latest
    steps:
      - run: forge script script/StagingDeploy.s.sol --rpc-url staging --broadcast
```

| Trigger | Actions |
|---|---|
| Push to release | Full suite + fuzz + invariant |
| After push | Deploy to staging via test multisig |
| Required | All audit checks must pass |

### `main`

```yaml
on:
  push:
    branches: [main]

jobs:
  mainnet-deploy:
    runs-on: ubuntu-latest
    environment: production
    steps:
      - run: forge build --verify
      - run: forge script script/MainnetDeploy.s.sol --rpc-url mainnet --broadcast
      - run: forge verify-contract --chain-id 1
```

| Trigger | Actions |
|---|---|
| Push to main | All checks + multisig deploy |
| After deploy | Verify on explorer + tag release |
| Manual step | Must create GitHub Release |
| Monitoring | Tenderly + Forta sentinels activated |

### `hotfix/*`

```yaml
on:
  push:
    branches: [hotfix/*]

jobs:
  emergency-fix:
    runs-on: ubuntu-latest
    steps:
      - run: forge test -vvv
      - run: slither . --fail-medium
      - run: forge script script/HotfixDeploy.s.sol --rpc-url mainnet --broadcast
```

| Trigger | Actions |
|---|---|
| Push to hotfix | Min tests + Slither + immediate deploy |
| After deploy | Create git tag with `-hotfix1` suffix |
| Post-deploy | Create PR back to `develop` |
| Post-mortem | Write incident report within 24h |

---

## Branch Protection Rules

### `main`

```
Required:
  - Require pull request before merging
  - Require 2 approvals (3 for security-sensitive files)
  - Dismiss stale approvals when new commits are pushed
  - Require status checks: test, lint, slither, coverage
  - Require branches to be up to date
  - Include administrators
  - Restrict push access to lead devs + CI bot

Optional:
  - Require signed commits (recommended)
  - Require linear history (no merge commits)
  - Code owner review for: src/**, contracts/**, deploy/**
```

### `develop`

```
Required:
  - Require pull request before merging
  - Require 1 approval (2 for contracts/** or src/**)
  - Require status checks: test, lint, slither
  - Require branches to be up to date
  - Include administrators
```

### Feature/Fix Branches

```
No direct protection, but enforce:
  - Branch naming convention via GitHub rules
  - Delete branch after merge (auto-delete)
  - No direct push to develop/main
```

---

## Release Workflow Example

```bash
# 1. Feature development
git checkout develop
git pull origin develop
git checkout -b feat/staking-rewards-v2
# ... develop, commit, push ...
gh pr create --base develop --title "Staking rewards v2" --body "..."

# 2. Merge to develop after review
gh pr merge --squash

# 3. Audit phase
git checkout develop
git pull origin develop
git checkout -b audit/trail-of-bits-findings
# ... fix findings, commit ...
gh pr create --base develop --title "Audit remediation" --body "..."
gh pr merge

# 4. Release candidate
git checkout develop
git pull origin develop
git checkout -b release/v1.0.0-rc1
git push origin release/v1.0.0-rc1

# 5. Mainnet deploy
# CI deploys to mainnet via multisig
git checkout main
git pull origin main
git merge release/v1.0.0-rc1
git tag -a StakingV2-v1.0.0-mainnet -m "StakingV2 v1.0.0 mainnet deploy"
git push origin main --tags

# 6. Merge back to develop
git checkout develop
git pull origin develop
git merge main
git push origin develop

# 7. Emergency hotfix (if needed)
git checkout main
git pull origin main
git checkout -b hotfix/emergency-reentrancy-fix
# ... fix, commit, push ...
# CI deploys directly to mainnet
git tag StakingV2-v1.0.1-hotfix1-mainnet
git push origin StakingV2-v1.0.1-hotfix1-mainnet
# Create PR back to develop:
gh pr create --base develop --title "Hotfix: reentrancy fix" --body "..."
```

---

## Summary of Responsibilities

| Role | Can push to | Creates branches | Approves |
|---|---|---|---|
| Junior dev | feat/*, fix/* | feat/*, fix/* | - |
| Senior dev | feat/*, fix/*, chore/*, docs/* | Any except main | PRs to develop |
| Lead dev | develop, release/*, hotfix/* | Any | PRs to main |
| Security engineer | audit/* | audit/* | Security-sensitive PRs |
| CI bot | main (merge only) | - | - |
