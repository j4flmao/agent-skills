# Threat Modeling for Blockchain Systems

## STRIDE Adapted for Blockchain

### Spoofing — Identity & Authenticity
| Vector | Blockchain Variant | Example |
|--------|-------------------|---------|
| Sybil attack | Attacker creates many identities to dominate consensus or voting | Governance proposal passed by whale splitting holdings across 100 wallets |
| Fake contract deployment | Malicious contract impersonating a known protocol | Fake Uniswap V3 deployer on L2, users approve infinite allowance |
| Signature replay | Same signature replayed on different chains or contracts | Permit2-style signatures replayed across Ethereum + Polygon |
| Phishing via tx simulation | Fake `eth_sign` / `personal_sign` requests | Wallet signs a "gasless" permit that drains NFTs |

### Tampering — Data & State Integrity
| Vector | Blockchain Variant | Example |
|--------|-------------------|---------|
| Oracle manipulation | Attacker moves oracle price via flash loan + swap | Mango Markets $114M — manipulated SOL/USD oracle pyth |
| Storage collision | Unexpected storage slot overlap in upgradeable contracts | Proxy storage collision between implementation versions |
| Uninitialized proxy | `initialize()` not called → attacker sets admin | Parity multi-sig wallet bug |
| Cross-contract reentrancy | State read from one contract becomes stale | L1 messenger → L2 bridge reentrancy (Nomad $190M) |

### Repudiation — Audit Trail
| Vector | Blockchain Variant | Mitigation |
|--------|-------------------|------------|
| Missing event emit | State change invisible to off-chain indexers | Emit events for every state mutation |
| L2 → L1 message gaps | Messages dropped without on-chain record | Nonce-based message tracking with forced inclusion |
| MEV bundle censorship | Builder omits tx from block | ePBS (enshrined proposer-builder separation) |

### Information Disclosure — Privacy
| Vector | Blockchain Variant | Example |
|--------|-------------------|---------|
| Mempool visibility | Pending txs visible to searchers before inclusion | Sandwich attack on a large swap |
| MEV frontrunning | Attacker sees orderflow and places before it | Sniper buys before a large NFT listing |
| Storage read | Anyone reads private storage variables | "Private" variables visible on-chain; `private` only hides from other contracts |

### Denial of Service — Availability
| Vector | Blockchain Variant | Example |
|--------|-------------------|---------|
| Gas griefing | Attacker forces expensive operations via loops or storage | 0xSifu $32M — gas grief in withdraw logic |
| Block stuffing | Spam transactions to fill block gas limit | Ethereum blocks stuffed during ENS DAO airdrop claim |
| Revert bombing | Malicious fallback reverts unwrapping in a batch | ERC-721 batch send blocked by one non-compliant token |
| Selfdestruct removal | Contract removed via `selfdestruct` → any read reverts | Used in yield aggregator attacks to break accounting |

### Elevation of Privilege — Access Control
| Vector | Blockchain Variant | Example |
|--------|-------------------|---------|
| Missing `onlyOwner` | Critical function accessible by anyone | `setFee()` without modifier |
| Role confusion | `msg.sender` vs `tx.origin` mismatch | `transferOwnership(tx.origin)` in multi-sig context |
| Delegatecall hijack | Attacker calls `delegatecall` to a malicious implementation | Parity wallet $150M — library suicide via delegatecall |
| Timelock bypass | Timelock circumvented via flash loan governance attack | Beanstalk $182M — flash loan governance takeover |

## Blockchain-Specific Attack Vectors

### Flash Loan Attacks
1. Borrow large capital → manipulate oracle → exploit protocol → repay
2. Multi-protocol: flash loan → swap on A → deposit inflated collateral to B → drain B
3. Governance: flash loan → accumulate voting power → pass malicious proposal → repay

```ascii
Flash Loan $100M → Manipulate Oracle/AMM → Exploit Protocol → Repay Loan
```

### Reentrancy Variants
| Variant | Description | Protection |
|---------|-------------|------------|
| Classic | External call before state update | CEI pattern |
| Cross-function | Same contract, different function shares state | Mutex/reentrancy guard |
| Cross-contract | A → B → A where A and B share state | Read-only reentrancy guard |
| Read-only | Non-mutative call that reads stale state | View function reentrancy lock |
| ERC-777/ERC-1155 | Callback hooks in token transfer | Checks-effects-interactions |

### Oracle Manipulation
Cost to manipulate = liquidity_in_window × price_impact_percent

```
Cost_to_manipulate(L, p, f) = L × |p_target - p_spot| / p_spot × (1 + f)
```
Where L = pool liquidity in manipulation window, p = price, f = swap fee

### Sandwich Attacks
```
Original: User → AMM (swap 100 DAI → ETH)
Sandwich: Attacker_buy → User → AMM → Attacker_sell
Profit: Attacker extracts ~(slippage × size / 2)
```

## Attack Trees for Common DeFi Patterns

### AMM (Constant Product, `x*y=k`)
```
BREAK AMM INVARIANT
├── 1. Manipulate pool balance
│    ├── Flash loan + large swap
│    ├── Donate to pool (inflate k)
│    └── Skim fees without providing
├── 2. Exploit price calculation
│    ├── Precision loss rounding
│    ├── Oracle price divergence
│    └── Fee rounding in swap math
├── 3. Liquidity manipulation
│    ├── Concentrated range bait
│    ├── JIT liquidity sandwich
│    └── Withdrawal griefing
└── 4. Rebase token accounting
```

### Lending Protocol
```
DRAIN LENDING PROTOCOL
├── 1. Oracle manipulation
│    ├── Manipulate spot price → inflate collateral → borrow max
│    ├── Manipulate TWAP → bypass guard → liquidate at unfair price
│    └── Stale price → borrow on old high price → dump
├── 2. Economic exploit
│    ├── Donation attack → rounding → share manipulation → steal
│    └── Interest rate manipulation → inflate borrow rate
├── 3. Access control
│    ├── Uninitialized proxy → set admin
│    └── Timelock bypass → governance takeover
└── 4. Bridge replay → mint wrapped tokens on multiple chains
```

### Yield Aggregator / Vault
```
STEAL FROM YIELD VAULT
├── 1. Share price manipulation
│    ├── Donation → inflate share price → first depositor griefing
│    └── Decimal mismatch between deposit token and shares
├── 2. Strategy compromise
│    ├── Wrong AMM address → deposits routed to attacker pool
│    └── Harvester DoS → keep fees accruing without compounding
└── 3. Emergency exit bypass
```

### Bridge / Cross-Chain
```
DRAIN CROSS-CHAIN BRIDGE
├── 1. Validate fake message
│    ├── Signature verification bypass
│    ├── Validator key compromise
│    └── Insufficient message validation
├── 2. Replay message
│    ├── Same message executed on 2 chains
│    └── Non-replay nonce not enforced
└── 3. Fake deposit → generate event L1 without transfer → mint L2
```

## Example Threat Model: Constant Product AMM

```
THREAT MODEL: Uniswap V2-style AMM
───────────────────────────────────

ASSETS:
- Pool tokens (LP shares)
- Swap fees accumulated
- User funds in liquidity
- Oracle price (via TWAP)

TRUST BOUNDARIES:
- Factory contract (trusted)
- Router contract (trusted)
- Pairs (untrusted among each other)
- External ERC-20 tokens (untrusted)

ACTS:
- EOA trader
- EOA liquidity provider
- MEV searcher
- Flash loan attacker
- Oracle frontrunner

ASSUMPTIONS:
- ERC-20 follows standard (no fee-on-transfer, no rebase)
- No flash loan from same pool in same tx
- Oracle TWAP period ≥ 30 min
```

## Example Threat Model: Lending Protocol

```
THREAT MODEL: Aave-style Lending
──────────────────────────────────

ASSETS:
- Deposited collateral (aToken value)
- Borrowed assets
- Liquidation bonuses
- Protocol reserve

TRUST BOUNDARIES:
- Pool contract (trusted)
- Price oracle (trusted but attackable)
- Liquidation bot network (trustless)
- Governance multisig (highly trusted)

ACTS:
- Depositor
- Borrower
- Liquidator (bot)
- Governance admin
- Oracle price submitter

ASSUMPTIONS:
- Oracle returns price within ±2% of market
- At least 1 liquidator active per market
- Governance timelock ≥ 48h
```

## References
- Immunefi Threat Model Template: `https://immunefi.com/`
- OWASP Smart Contract Top 10
- SWC Registry: `https://swcregistry.io/`
- Trail of Bits "Threat Modeling Blockchain Systems" talk
