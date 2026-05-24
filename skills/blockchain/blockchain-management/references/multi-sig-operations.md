# Multi-Sig Operations

## Overview

Multi-signature wallets (multi-sigs) are the operational backbone of DAOs and protocol treasuries. Gnosis Safe is the industry standard. TimelockController adds mandatory waiting periods for execution.

---

## 1. Gnosis Safe

### 1.1 Setup

**Core Components:**

| Component | Description |
|-----------|-------------|
| Owners | Addresses authorized to sign transactions |
| Threshold | Minimum number of confirmations required (e.g., 3/5) |
| Modules | External contracts that execute logic on Safe |
| Guards | Pre/post validation hooks before transaction execution |

**Deploy Safe (TypeScript — Safe SDK):**

```typescript
import Safe from '@safe-global/protocol-kit'
import { EthersAdapter } from '@safe-global/protocol-kit'
import { ethers } from 'ethers'

const setup = async () => {
  const ethAdapter = new EthersAdapter({
    ethers,
    signerOrProvider: signer
  })

  const safeFactory = await Safe.createSafeFactory({
    ethAdapter,
    safeVersion: '1.4.1'
  })

  const safe = await safeFactory.deploySafe({
    safeAccountConfig: {
      owners: ['0xOwner1...', '0xOwner2...', '0xOwner3...', '0xOwner4...', '0xOwner5...'],
      threshold: 3, // 3/5 for operations
    }
  })

  console.log(`Safe deployed at: ${safe.getAddress()}`)
}
```

**Threshold Configuration by Operation Type:**

| Operation Type | Recommended Threshold | Signer Pool |
|---------------|----------------------|-------------|
| Non-critical (parameter tweaks) | 3/5 | Core team |
| Treasury (transfers > $100k) | 5/9 | Team + community |
| Contract upgrades | 5/9 + timelock | Team + community + advisors |
| Emergency pause | 2/3 | Core team only |
| Full ownership transfer | 6/9 + 30d timelock | All stakeholders |

### 1.2 Transaction Flow

```
Submit → Confirm (× threshold) → Execute
   |            |                    |
Create tx    Collect sigs        On-chain execution
(nonce N)   (off-chain)         (gas paid by executor)
```

**Transaction Service API:**

```typescript
// Submit transaction to Safe Transaction Service
const txData = {
  to: '0xRecipient...',
  value: '1000000000000000000', // 1 ETH in wei
  data: '0x',
  nonce: 5, // Must match next Safe nonce
  operation: 0, // 0 = CALL, 1 = DELEGATECALL
  safeTxGas: 0,
  baseGas: 0,
  gasPrice: '0',
  gasToken: '0x000...',
  refundReceiver: '0x000...',
  safeTxHash: '0x...' // Hash signed by proposer
}

// POST /v1/safes/{address}/multisig-transactions/
// Confim: POST /v1/multisig-transactions/{txId}/confirmations/
```

**Nonce Management:**

- Nonce increments sequentially per Safe
- Replacing a stuck transaction: submit same nonce with higher `safeTxGas`
- Avoid nonce gaps — incomplete nonces block all future transactions
- Emergency: use `execTransaction` directly (bypasses service) with threshold signatures

### 1.3 Modules

Modules extend Safe functionality.

**Zodiac Roles (most popular):**

```solidity
// Role-based access control for Safe
// Deploy RolesModifier, configure allowed targets and functions

// Role configuration (pseudocode):
// Role: "Treasury Manager"
// Allowed targets: [UniswapRouter, AavePool]
// Allowed functions: [swapExactTokensForTokens, supply, withdraw]
// Execution delay: 0
// Allowance: 100 ETH/month

// Role: "Protocol Admin"
// Allowed targets: [ProtocolProxyAdmin]
// Allowed functions: [upgrade]
// Execution delay: 48 hours
// Allowance: unlimited
```

**Allowance Module:**

```typescript
// Delegate spending limits to addresses without full signing power
const allowanceModule = await safe.getModule('AllowanceModule')
await allowanceModule.setAllowance(
  delegateAddress,   // Who can spend
  tokenAddress,      // USDC or ETH
  amount,            // Spending limit
  resetTimeMin,      // Reset period (e.g., 1 month)
  resetBaseMin       // Reset basis (0 = absolute)
)
```

**Bridge Module:**

- Wormhole / LayerZero relay for cross-chain Safe operations
- Single proposal on mainnet Safe → execute on multiple chains

### 1.4 Guards

Transaction Guards run pre/post validation on every Safe transaction.

```solidity
interface ISafeGuard {
    function checkTransaction(
        address to, uint256 value, bytes memory data,
        Enum.Operation operation, uint256 safeTxGas,
        uint256 baseGas, uint256 gasPrice,
        address gasToken, address payable refundReceiver,
        bytes memory signatures, address msgSender
    ) external view;

    function checkAfterExecution(bytes32 txHash, bool success) external view;
}
```

**Guard Use Cases:**

| Guard Type | Logic | Example |
|-----------|-------|---------|
| Allowed targets guard | Reject if `to` not in whitelist | Only known protocol addresses |
| Value cap guard | Reject if `value` > limit | Max 100 ETH per tx |
| Rate limit guard | Reject if too frequent | Max 1 tx per 24h |
| Deadline guard | Reject if outside window | Only execute 9am-5pm UTC |

---

## 2. TimelockController

OpenZeppelin's TimelockController adds mandatory delay between proposal and execution.

### 2.1 Configuration

```solidity
// MinimalDelay: 48 hours for non-critical, 7 days for critical
TimelockController timelock = new TimelockController(
    7 days,                    // minDelay
    proposers,                 // addresses that can schedule
    executors,                 // addresses that can execute (empty = anyone)
    address(admin)             // admin
);
```

**Roles:**

| Role | Permission | Security |
|------|-----------|----------|
| PROPOSER_ROLE | Schedule transactions | Multi-sig controlled |
| EXECUTOR_ROLE | Execute after delay | Typically any (E OA) |
| CANCELLER_ROLE | Cancel pending transactions | Multi-sig controlled |
| DEFAULT_ADMIN_ROLE | Manage roles | Multi-sig controlled |

### 2.2 Operation Flow

```
Proposer schedules tx ──> Timelock queue ──> Delay passes ──> Executor runs tx
                              |
                        Canceller can cancel
                        (before execution)
```

**Bypass Mode (Emergency):**

```solidity
// Only for genuine emergencies. Bypass timelock.
// timelock.updateDelay(0); // setting delay to 0 effectively bypasses
// REVERT to restore delay after emergency.
```

---

## 3. Multi-Sig Key Management

### 3.1 Hardware Wallet Setup

| Wallet | Supported Chains | Security Level |
|--------|-----------------|----------------|
| Ledger Nano S/X | EVM, Solana, Polkadot | Secure element, CC EAL5+ |
| Trezor Model T | EVM primarily | Open source, certified |
| GridPlus Lattice1 | EVM, DeFi optimized | Enclave, PCI-compliant |

**Best Practice:** Each signer should use a hardware wallet (Ledger/Trezor) — never store keys in browser extension wallets for production multi-sigs.

### 3.2 Key Holder Distribution

Geographic and organizational diversity prevents single-point compromise.

| Dimension | Requirement |
|-----------|-------------|
| Minimum signers | 5 of 9 for treasury operations |
| Geographic zones | ≥3 different countries/regions |
| Organizational roles | Core team, advisor, community rep |
| Backup signers | 2 additional offline backups |
| No single party | Each signer independently verified |

### 3.3 Backup & Recovery

```typescript
// Backup paths:
// 1. Mnemonic phrase (24 words) in bank vault
// 2. Shamir Secret Sharing (SLIP-39) across trusted parties
// 3. Social recovery via Eigenlayer or similar

// SLIP-39 example: 5 shares, threshold 3
// Share 1: "theory romance..." → Vault
// Share 2: "fossil drama..." → Board member
// Share 3: "crystal bonus..." → Legal counsel
// Share 4: "dragon embark..." → CTO (offline)
// Share 5: "jungle abuse..." → Investor rep
```

---

## 4. Security Operations

### 4.1 Deploy-Queue-Execute

```
1. Deploy contract(s) via standard EOA or deployer contract
2. Verify on block explorer (Sourcify, Etherscan)
3. Queue timelock execution: timelock.schedule(targets, values, datas, predecessor, salt, delay)
4. Wait for timelock delay (e.g., 7 days)
5. Execute: timelock.execute(targets, values, datas, predecessor, salt)
```

**Script (Hardhat):**

```typescript
import { ethers } from 'hardhat'

async function main() {
  const timelock = await ethers.getContractAt('TimelockController', '0x...')

  const targets = ['0xTarget...']
  const values = [0]
  const payloads = ['0x...'] // encoded function call

  const predecessor = ethers.ZeroHash
  const salt = ethers.hexlify(ethers.randomBytes(32))

  // Step 1: Schedule (called by PROPOSER)
  const delay = 7 * 24 * 3600 // 7 days
  const scheduleTx = await timelock.schedule(targets, values, payloads, predecessor, salt, delay)
  await scheduleTx.wait()

  console.log(`Scheduled. Execute at block ${await ethers.provider.getBlockNumber() + confirm('Wait for delay?')}`)

  // Step 2: Execute after delay (called by EXECUTOR)
  const executeTx = await timelock.execute(targets, values, payloads, predecessor, salt)
  await executeTx.wait()
}
```

### 4.2 Transaction Simulation

Always simulate before executing on mainnet:

- **Tenderly**: simulate full transaction including state changes
- **Safe Simulator**: built into Safe UI
- **Fork testing**: hardhat fork + tenderly debug

### 4.3 Monitoring

| Tool | Purpose |
|------|---------|
| OpenZeppelin Defender | Monitor, automate, relay |
| Safe Alert | Email/Slack on pending/executed transactions |
| Tenderly Webhooks | Custom alert rules |
| Forta Network | Detect anomalous Safe transactions |
| Custom (The Graph) | Index Safe events |

---

## 5. Comparison Table

| Feature | Gnosis Safe | TimelockController |
|---------|-------------|-------------------|
| Minimum signers | 2 (configurable) | N/A |
| Delay per tx | No native delay | MinDelay enforced |
| Modules | Yes (Zodiac, Allowance, Bridge) | Role-based only |
| Guards | Yes (arbitrary logic) | No |
| Gas efficiency | Higher (multi-call) | Lower (separate schedule + execute) |
| Cross-chain | Module-based | Native planned |
| Upgradeability | Proxy-supported | Admin-managed roles |
| Best for | Daily operations | Governance-enforced delays |

**Recommendation:** Use Gnosis Safe for operational transactions (trading, bridging, payments). Wrap Safe with TimelockController for governance-controlled operations (upgrades, parameter changes). Never skip timelock for contract upgrades.
