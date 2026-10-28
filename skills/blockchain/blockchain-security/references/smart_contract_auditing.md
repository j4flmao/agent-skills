# Smart Contract Audit Readiness and Security Tooling Pipeline

What a team should do before, during and after an external audit, and how to wire static analysis, fuzzing, invariant testing and symbolic tools into CI so audits find deeper issues instead of basic ones. The audit firm's own phase-by-phase methodology is covered in `audit-methodology.md`.

## Why Readiness Matters
Audits are time-boxed. Every hour auditors spend on missing docs, failing builds or obvious lint findings is an hour not spent on logic and economic attacks. A prepared codebase also shortens fix-review cycles.

## Audit Readiness Checklist

| Area | Deliverable |
|---|---|
| Scope | Exact commit hash, list of in-scope files with nSLOC, out-of-scope items, deployed chain(s) |
| Build | One-command build and test (`forge build && forge test`), pinned compiler and dependency versions |
| Documentation | Architecture diagram, roles and privileges, external integrations, upgrade process, NatSpec on public functions |
| Invariants | Written list of properties that must always hold (solvency, supply conservation, access rules) |
| Threat model | Trusted parties, oracle assumptions, admin key custody, expected token types (fee-on-transfer, rebasing, ERC-777) |
| Tests | High branch coverage plus fuzz and invariant tests for core accounting |
| Known issues | List of accepted risks so auditors do not re-report them |
| Freeze | No code changes during the audit except agreed fixes |

## Tooling Pipeline

```
pre-commit:  forge fmt --check, solhint
CI (every PR):
  forge build --sizes
  forge test -vvv                       (unit + fuzz)
  forge test --match-contract Invariant (invariant suites)
  forge coverage --report lcov
  slither . --fail-high (triaged config)
  aderyn .                              (report artifact)
nightly / pre-release:
  long fuzzing campaigns (Echidna or Medusa)
  symbolic checks (Halmos) on critical math
  formal verification (Certora/SMTChecker) for core invariants if budget allows
```

### Foundry configuration
```toml
# foundry.toml
[profile.default]
solc_version = "0.8.28"
optimizer = true
optimizer_runs = 200
evm_version = "cancun"          # match the target chain
fuzz = { runs = 1000 }
invariant = { runs = 256, depth = 100, fail_on_revert = false }

[profile.ci]
fuzz = { runs = 10000 }
invariant = { runs = 1000, depth = 200 }
```
Run CI with `FOUNDRY_PROFILE=ci forge test`.

### Slither
```bash
pip install slither-analyzer        # or: uv tool install slither-analyzer
slither . --filter-paths "lib|test" --exclude-informational --sarif slither.sarif
slither-check-upgradeability . MyImplV1 --new-contract-name MyImplV2   # storage layout and initializer checks
```
Triage once, then keep a reviewed `slither.db.json`/config so CI fails only on new findings. Upload SARIF to code scanning for PR annotations.

### Aderyn (Rust static analyzer by Cyfrin)
```bash
aderyn . --output report.md
```

### Fuzzing and invariants
```solidity
contract VaultInvariants is StdInvariant, Test {
    Vault vault; Handler handler;

    function setUp() public {
        vault = new Vault(new MockERC20());
        handler = new Handler(vault);
        targetContract(address(handler));      // only call through the handler
    }

    function invariant_assetsCoverShares() public view {
        assertGe(vault.totalAssets(), vault.convertToAssets(vault.totalSupply()));
    }

    function invariant_noFreeShares() public view {
        assertEq(vault.totalSupply() == 0, vault.totalAssets() == 0);
    }
}
```
Handlers bound inputs (`bound(x, 1, 1e30)`), use multiple actors, and track ghost variables (sum of deposits) for comparison.

- **Echidna** and **Medusa** run property-based campaigns for hours with coverage guidance; both use Solidity property functions.
- **Halmos** symbolically executes Foundry-style tests (`check_` prefix) to prove properties for all inputs within bounds.
- **Certora Prover** verifies CVL rules; best for core invariants of high-value protocols.

### Other useful checks
| Check | Tool |
|---|---|
| Storage layout diff for upgrades | `forge inspect <C> storageLayout`, OpenZeppelin Upgrades plugin `validateUpgrade` |
| Contract size (24,576-byte limit, EIP-170) | `forge build --sizes` |
| Gas regressions | `forge snapshot --check` |
| Mainnet-fork integration tests | `forge test --fork-url $RPC_URL --fork-block-number <n>` |
| Dependency review | Pin `lib/` submodules or Soldeer versions; review diffs on update |

## Choosing Auditors and Scope
- Match expertise to the protocol type (AMM, lending, bridges, ZK circuits, account abstraction).
- Budget for at least one fix-review round.
- Combine approaches for high-value systems: private audit, competitive audit (Code4rena, Sherlock, Cantina), and an ongoing bug bounty (Immunefi or self-hosted).
- Bridges, oracles and governance timelocks deserve separate focused reviews.

## During the Audit
- Shared channel with a named engineer who answers within hours.
- Track findings in issues with severity, status and fix commit.
- Do not merge unrelated features into the audited branch.

## After the Audit
1. Fix findings in small, separate commits referencing finding IDs.
2. Add a regression test per finding.
3. Fix review by the auditors on the final commit.
4. Deploy exactly the reviewed commit; verify source on explorers and record the bytecode hash.
5. Publish the report and known risks.
6. Set up monitoring (Forta-style agents, OpenZeppelin Monitor, Tenderly alerts) and an incident response plan with pause/guardian procedures.
7. Re-audit significant changes; audits are point-in-time.

## Severity Triage (team-side)

| Severity | Typical meaning | Action |
|---|---|---|
| Critical/High | Direct loss or permanent freeze of funds, or protocol takeover | Fix before deployment, mandatory fix review |
| Medium | Loss under specific conditions, temporary DoS, broken core feature | Fix before deployment unless explicitly accepted |
| Low | Edge-case misbehavior, best-practice deviations | Fix or document |
| Informational / Gas | Clarity and efficiency | Optional |

## Pitfalls
- Auditing a moving target (changing commit).
- Treating a clean audit as proof of safety; audits sample, they do not prove.
- Deploying a different compiler setting or commit than the audited one.
- Ignoring off-chain components (keepers, bots, frontends, deploy scripts, admin multisig setup).

## Checklist
- [ ] Frozen commit, scope and docs delivered
- [ ] Static analysis triaged and enforced in CI
- [ ] Fuzz and invariant suites for core accounting
- [ ] Upgrade storage-layout checks automated
- [ ] Findings tracked, fixed with regression tests, fix-reviewed
- [ ] Monitoring, bug bounty and incident plan live at launch
