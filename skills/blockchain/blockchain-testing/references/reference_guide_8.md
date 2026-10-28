# CI/CD Pipeline for Smart Contract Testing

A layered CI pipeline for Solidity projects: fast checks on every push, deeper fuzzing and fork tests on pull requests, long invariant and mutation campaigns nightly, and gated, reproducible deployments. Examples use GitHub Actions and Foundry; the structure applies to other CI systems.

## Pipeline Stages

| Stage | Trigger | Contents | Target duration |
|-------|---------|----------|-----------------|
| 1. Fast checks | Every push | `forge fmt --check`, `forge build --sizes`, unit tests (low fuzz runs), Solhint | Minutes |
| 2. PR checks | Pull request | Fuzz with CI profile, invariants (moderate depth), fork tests, gas snapshot check, Slither, coverage | Under ~20 min |
| 3. Nightly | Schedule | Deep invariants, Echidna/Medusa campaigns, mutation testing, fork tests on latest blocks | Hours |
| 4. Release | Tag / manual approval | Reproducible build, verify bytecode, deploy via script to testnet then mainnet with multisig | Gated |

## Workflow: Push and PR

```yaml
name: contracts
on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read

env:
  FOUNDRY_PROFILE: ci

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: recursive
      - uses: foundry-rs/foundry-toolchain@v1
        with:
          version: stable           # or pin an exact release for reproducibility
      - name: Format
        run: forge fmt --check
      - name: Build (fail on contracts over EIP-170 size limit)
        run: forge build --sizes
      - name: Unit + fuzz + invariant
        run: forge test -vvv --no-match-path 'test/fork/*'
      - name: Gas snapshot
        run: forge snapshot --check --no-match-test 'testFuzz_|invariant_' --no-match-path 'test/fork/*'

  fork:
    if: github.event_name == 'pull_request'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { submodules: recursive }
      - uses: foundry-rs/foundry-toolchain@v1
      - uses: actions/cache@v4
        with:
          path: ~/.foundry/cache/rpc
          key: rpc-${{ hashFiles('test/fork/**') }}
      - run: forge test --match-path 'test/fork/*' -vvv
        env:
          MAINNET_RPC_URL: ${{ secrets.MAINNET_RPC_URL }}
```

Notes:
- Secrets are not available to PRs from forks by default; fork tests should skip gracefully when the RPC variable is missing.
- `forge build --sizes` exits non-zero when a contract exceeds the 24,576-byte runtime limit.

## Nightly Deep Testing

```yaml
name: nightly
on:
  schedule:
    - cron: "0 2 * * *"
  workflow_dispatch:

jobs:
  invariants:
    runs-on: ubuntu-latest
    timeout-minutes: 240
    steps:
      - uses: actions/checkout@v4
        with: { submodules: recursive }
      - uses: foundry-rs/foundry-toolchain@v1
      - run: forge test --match-path 'test/invariant/*'
        env:
          FOUNDRY_INVARIANT_RUNS: 1000
          FOUNDRY_INVARIANT_DEPTH: 500
          FOUNDRY_FUZZ_RUNS: 50000
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: invariant-failures
          path: cache/invariant
```

Foundry persists failing invariant sequences under `cache/invariant/failures/` and replays them on the next run; upload them on failure so developers can reproduce locally.

Optional jobs: Echidna or Medusa campaigns with a stored corpus (cache the corpus directory between runs), Gambit/slither-mutate mutation testing on critical contracts.

## Determinism and Reproducibility

| Source of flakiness | Fix |
|---------------------|-----|
| Random fuzz seeds | Fine for discovery; record the failing seed/counterexample, add a concrete regression test |
| Unpinned fork block | Pin blocks in fork tests |
| Floating compiler version | Pin `solc_version` and EVM version in `foundry.toml` |
| Unpinned dependencies | Git submodules at fixed commits, or Soldeer with a lockfile |
| Toolchain drift | Pin Foundry version in CI |

Every fuzz/invariant failure found in CI becomes a named unit test with the counterexample inputs.

## Deployment Stage

- Deploy with Forge scripts (`forge script script/Deploy.s.sol --rpc-url $RPC --broadcast --verify`), never ad hoc transactions.
- Use a hardware wallet (`--ledger`), a keystore (`--account deployer` created with `cast wallet import`), or a remote signer; never put private keys in CI environment variables for mainnet.
- For protocol-owned contracts, the script proposes transactions to a Safe multisig or timelock; humans approve.
- Run the deployment script against a fork in CI first (`forge script ... --fork-url $MAINNET_RPC_URL` without `--broadcast`) and assert post-deploy state with a verification script.
- Verify source on block explorers (`--verify` with Etherscan v2 multichain API key, or Sourcify) and record addresses in a committed deployments registry (`broadcast/` artifacts plus a curated JSON).
- Protect the deploy job with a GitHub Environment requiring reviewers.

## Pre-Audit Gate

Before freezing code for an audit, require: green nightly runs for a week, coverage report, Slither baseline with justified suppressions, mutation results for core contracts, documented invariants, and a deployment rehearsal on a fork.

## Checklist

- [ ] Fast stage under a few minutes on every push
- [ ] Fork, gas, static analysis and coverage on PRs
- [ ] Nightly deep invariants/fuzzing with persisted failures and corpora
- [ ] Toolchain, compiler, dependencies and fork blocks pinned
- [ ] Deploy via scripts, rehearsed on fork, signed outside CI, approved via protected environment
- [ ] Every CI-found counterexample turned into a regression test
