# Static Analysis and Linting for Solidity in CI

Static analyzers find classes of bugs without running code: reentrancy patterns, unchecked return values, dangerous `delegatecall`, shadowing, missing access control signals. They are cheap to run on every commit and complement tests. This reference covers Slither, Aderyn, Solhint, `forge lint`/`forge fmt`, Semgrep rules, and how to manage findings without drowning in noise.

## Tool Overview

| Tool | Type | Strength |
|------|------|----------|
| Slither (Trail of Bits) | Python, SlithIR-based detectors | Broad detector set (~90+), printers, upgradeability checks, `slither-check-erc` |
| Aderyn (Cyfrin) | Rust, AST-based | Fast, Markdown report suited to audits and PR comments |
| Solhint | Linter | Style and security rules, configurable |
| `forge fmt` | Formatter | Consistent formatting, `--check` in CI |
| `forge lint` | Foundry linter | Built-in lints (naming, gas, some high-severity patterns) in recent Foundry versions |
| Semgrep (e.g. Decurity rules) | Pattern matching | Custom org-specific rules |
| Mythril / symbolic tools | Symbolic execution | Deeper but slow; use selectively |

## Slither

```bash
pipx install slither-analyzer      # or: uv tool install slither-analyzer
slither .                           # auto-detects Foundry/Hardhat
slither . --filter-paths "lib/|test/|script/" --exclude-informational --exclude-low
slither . --sarif slither.sarif     # for GitHub code scanning
slither . --print human-summary
slither . --print inheritance-graph
slither-check-upgradeability . MyContractV1 --new-contract-name MyContractV2
slither-check-erc . MyToken --erc erc20
```

### Configuration

```json
// slither.config.json
{
  "filter_paths": "lib/|test/|script/",
  "exclude_informational": true,
  "exclude_optimization": true,
  "detectors_to_exclude": "naming-convention,solc-version"
}
```

### Triage Suppression

```solidity
// slither-disable-next-line reentrancy-events
token.safeTransfer(to, amount);
```

Every suppression needs a justification in the PR. Prefer fixing the pattern (checks-effects-interactions, `nonReentrant`) over silencing it.

## High-Value Slither Detectors

| Detector | Finds |
|----------|-------|
| `reentrancy-eth`, `reentrancy-no-eth` | State changes after external calls |
| `arbitrary-send-eth`, `arbitrary-send-erc20` | Funds sent to user-controlled addresses / `transferFrom` from arbitrary `from` |
| `unchecked-transfer`, `unchecked-lowlevel` | Ignored return values |
| `controlled-delegatecall` | `delegatecall` to user-supplied address |
| `suicidal`, `unprotected-upgrade` | Unprotected `selfdestruct` / initializer |
| `uninitialized-state`, `uninitialized-storage` | Uninitialised variables |
| `divide-before-multiply` | Precision loss |
| `incorrect-equality` | Strict equality on balances (`==`) |
| `tx-origin` | Authorization via `tx.origin` |
| `weak-prng` | Randomness from block values |

## Aderyn

```bash
cyfrinup                 # installs aderyn
aderyn .                 # writes report.md
aderyn . --output report.json
```

Aderyn's Markdown report groups findings by severity with code locations; attach it to PRs or audit prep packages.

## Solhint

```json
// .solhint.json
{
  "extends": "solhint:recommended",
  "rules": {
    "compiler-version": ["error", "0.8.28"],
    "func-visibility": ["error", { "ignoreConstructors": true }],
    "reason-string": "off",
    "custom-errors": "warn",
    "avoid-low-level-calls": "warn",
    "no-inline-assembly": "warn"
  }
}
```

```bash
npx solhint 'src/**/*.sol'
```

## Formatting and Foundry Lints

```bash
forge fmt --check            # fail CI on unformatted code
forge lint                   # recent Foundry versions; configure in foundry.toml [lint]
```

## GitHub Actions Pipeline

```yaml
name: static-analysis
on: [pull_request]
permissions:
  contents: read
  security-events: write
jobs:
  analyze:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { submodules: recursive }
      - uses: foundry-rs/foundry-toolchain@v1
      - run: forge fmt --check
      - run: forge build --build-info
      - uses: crytic/slither-action@v0.4.1
        id: slither
        with:
          fail-on: medium
          sarif: results.sarif
          ignore-compile: true
      - uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: ${{ steps.slither.outputs.sarif }}
```

Pin actions to versions (or commit SHAs for supply-chain hardening) and update via Dependabot.

## Managing Findings

1. **Baseline** existing findings once (triaged list with owner and decision).
2. **Gate** only on new medium/high findings in PRs.
3. **Suppress** with inline comments plus justification; review suppressions in audit prep.
4. **Track** false-positive rates per detector; disable detectors that only produce noise for your codebase, documented in config.

## What Static Analysis Will Not Catch

- Business-logic errors (wrong fee formula, broken accounting invariants).
- Economic attacks (oracle manipulation, flash-loan-based price attacks).
- Cross-contract assumptions about external protocols.

Use invariant testing, fork tests, formal verification and manual review for these (see sibling references).

## Checklist

- [ ] `forge fmt --check` and Solhint in CI
- [ ] Slither (and optionally Aderyn) on every PR, SARIF uploaded
- [ ] Dependencies (`lib/`) excluded from analysis
- [ ] Gate on new medium/high findings; baseline documented
- [ ] Each suppression justified and reviewed before audits
- [ ] Upgradeable contracts checked with `slither-check-upgradeability`
