# Smart Contract Deployment Standard Operating Procedure

## Scope

This SOP covers all smart contract deployments across devnet, testnet, staging, and mainnet environments. Every deployment must follow this procedure regardless of chain or tooling.

---

## Pre-Deployment Checklist

### Code Readiness

- [ ] Contracts compiled with correct Solidity version (specified in `pragma` and `foundry.toml`/`hardhat.config.ts`)
- [ ] Solidity optimizer settings match production intent: runs >= 200, enabled = true
- [ ] All unit tests pass: `forge test` or `npx hardhat test`
- [ ] Integration tests pass against forked mainnet: `forge test --fork-url $RPC_URL`
- [ ] Fuzz tests run with at least 10000 runs: `FOUNDRY_FUZZ_RUNS=10000 forge test`
- [ ] Invariant tests run with at least 1000 runs: `forge test --invoke-runs 1000`
- [ ] Slither analysis clean: `slither . --exclude-dependencies --filter-paths "lib/"` — no high/critical findings
- [ ] External audit completed for contracts being deployed (at least 1 audit, 2 recommended for mainnet)
- [ ] Bug bounty program active on Immunefi or Hats Finance (mainnet only)
- [ ] Gas snapshot generated and compared to previous baseline: `forge snapshot`

### Operational Readiness

- [ ] Deployment configuration file prepared: `deploy/config/<network>.yaml` with all addresses
- [ ] Deployer account funded with sufficient native token for gas
  - Devnet: funded automatically
  - Testnet: minimum 0.5 ETH per deployment
  - Mainnet: minimum 5 ETH per deployment (calculate: `gas_limit * gas_price`)
- [ ] For upgrades: proxy admin address known, implementation address prepared
- [ ] Upgrades: storage layout checked via `forge inspect MyContract storageLayout`
- [ ] For mainnet: timelock delay configured (minimum 7 days), queue prepared
- [ ] Multisig signers confirmed available for signing window (mainnet)
- [ ] Explorer API keys set (Etherscan, Polygonscan, Arbiscan, Sourcify)
- [ ] Monitoring dashboard configured (Tenderly, Forta, Defender)

### Gas Calculation Template

```bash
# Estimated gas cost = gas_used * gas_price
forge create src/MyContract.sol:MyContract --gas-estimate
# For Hardhat:
npx hardhat run scripts/deploy.ts --network sepolia --gas
```

| Component | Est. Gas | Est. Cost (50 gwei ETH = $2500) |
|---|---|---|
| Simple ERC20 deploy | ~1,500,000 | $187.50 |
| Upgradeable proxy deploy | ~2,500,000 | $312.50 |
| Complex DeFi protocol (all contracts) | ~10,000,000 | $1,250.00 |
| Multisig transaction | ~50,000 | $6.25 |

---

## Deployment Flow by Environment

### 1. Devnet

```bash
# Start local node with fork
anvil --fork-url $FORK_URL --fork-block-number 19500000

# Deploy via Foundry
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url http://127.0.0.1:8545 \
  --broadcast \
  --private-key 0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80

# Deploy via Hardhat
npx hardhat run scripts/deploy.ts --network localhost
```

Validation:
- [ ] Contracts deployed and addresses logged
- [ ] Constructor args correct
- [ ] Owner set to deployer address
- [ ] Basic state reads work (totalSupply, balanceOf)

### 2. Testnet

```bash
# Deploy with Foundry (single contract)
forge create src/MyContract.sol:MyContract \
  --rpc-url sepolia \
  --private-key $DEPLOYER_PRIVATE_KEY \
  --constructor-args 0x... 1000000 \
  --verify \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Deploy with Foundry script
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url sepolia \
  --broadcast \
  --verify \
  --private-key $DEPLOYER_PRIVATE_KEY \
  -vvvv

# Deploy with Hardhat
npx hardhat run scripts/deploy.ts \
  --network sepolia \
  --verify
```

Validation:
- [ ] Contract verified on explorer
- [ ] Constructor args match expected values
- [ ] Owner set to deployer (or test multisig)
- [ ] Integration tests pass against deployed contracts
- [ ] Transactions submitted with correct gas parameters

### 3. Staging

Staging deploys through a test multisig to the testnet fork.

```bash
# 1. Create deployment transaction data
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url staging \
  --json > deploy_data.json

# 2. Submit to test Safe
npx hardhat run scripts/submit-to-safe.ts \
  --network staging \
  --safe $STAGING_SAFE \
  --data deploy_data.json

# 3. Collect signatures (3-of-5 threshold)
npx hardhat run scripts/collect-signatures.ts \
  --safe $STAGING_SAFE \
  --nonce $NONCE

# 4. Execute via Safe
npx hardhat run scripts/execute-safe.ts \
  --network staging \
  --safe $STAGING_SAFE
```

Validation:
- [ ] Same process as mainnet (live rehearsal)
- [ ] All monitoring alerts configured and tested
- [ ] Subgraph indexing working correctly
- [ ] dApp integration tested against staging contracts

### 4. Mainnet

```bash
# 1. Generate deployment calldata (offline)
forge script script/Deploy.s.sol:DeployScript \
  --rpc-url mainnet \
  --json \
  --sig "run()" > mainnet_deploy.json

# 2. Create Safe transaction (via Safe{Wallet} UI or CLI)
safe-tx create \
  --safe $MAINNET_SAFE \
  --to $DEPLOYER_CONTRACT \
  --data $(cat mainnet_deploy.json | jq -r '.transaction.data') \
  --value 0

# 3. Sign with hardware wallets (3-of-5 threshold)
# Each signer connects via Ledger/Trezor to Safe{Wallet}

# 4. Execute after threshold met
safe-tx execute \
  --safe $MAINNET_SAFE \
  --nonce $NONCE

# 5. Verify on explorer
forge verify-contract \
  $DEPLOYED_ADDRESS \
  src/MyContract.sol:MyContract \
  --chain-id 1 \
  --etherscan-api-key $ETHERSCAN_API_KEY
```

Validation (Mainnet):
- [ ] Contract verified on Etherscan
- [ ] Ownership transferred to multisig
- [ ] Proxy admin owned by timelock/multisig
- [ ] Emergency pause functions callable by pauser role
- [ ] No unexpected renounced ownership
- [ ] All events emitted correctly

---

## Post-Deployment Procedure

### Verification

```bash
# Foundry verification
forge verify-contract \
  $ADDRESS \
  src/MyContract.sol:MyContract \
  --chain-id $CHAIN_ID \
  --constructor-args $(cast abi-encode "constructor(address,uint256)" $OWNER 1000000) \
  --etherscan-api-key $ETHERSCAN_API_KEY

# Hardhat verification
npx hardhat verify \
  --network $NETWORK \
  $ADDRESS \
  $OWNER 1000000

# Sourcify verification (auto via Hardhat/Foundry plugin)
# Blockscout (for Polygon, BSC, etc.)
npx hardhat verify --network polygon $ADDRESS $ARGS
```

### Monitoring Setup

```bash
# Tenderly: add contract to dashboard
tenderly contract add \
  --network $NETWORK \
  --address $ADDRESS \
  --project $TENDERLY_PROJECT

# Defender Sentinels
npx hardhat run scripts/setup-sentinels.ts --network mainnet

# Forta bot
npm run forta:deploy -- --bot-id $FORTABOT_ID --network $NETWORK
```

### Deployment Registry

Record every deployment in `deployments/registry.json`:

```json
{
  "MyContract": {
    "address": "0x...",
    "chainId": 1,
    "network": "mainnet",
    "version": "v1.0.0",
    "gitCommit": "a1b2c3d4e5f6...",
    "gitTag": "MyContract-v1.0.0-mainnet",
    "deployer": "0x... (multisig address)",
    "timestamp": "2026-05-24T10:00:00Z",
    "txHash": "0x...",
    "verificationTx": "0x...",
    "auditReport": "https://...",
    "dependencies": {
      "proxyAdmin": "0x...",
      "proxy": "0x..."
    },
    "notes": "Initial production deployment"
  }
}
```

### dApp Configuration Update

```bash
# Update frontend config
cat > src/config/contracts.ts << EOF
export const CONTRACTS = {
  MyContract: {
    [ChainId.MAINNET]: "0x...",
    [ChainId.SEPOLIA]: "0x...",
    [ChainId.HOLESKY]: "0x..."
  }
};
EOF
```

### Post-Deployment Integration Tests

```bash
# Run against live contracts
forge test --match-path test/integration/*.t.sol \
  --rpc-url $RPC_URL \
  --chain-id $CHAIN_ID \
  -vvv

# Verify all state variables
npx hardhat run scripts/verify-state.ts --network $NETWORK
```

---

## Emergency Procedures

### Emergency Pause

```bash
# Call pause via multisig
cast send $CONTRACT_ADDRESS "pause()" \
  --rpc-url $RPC_URL \
  --private-key $SIGNER_KEY

# Or via Safe
safe-tx create \
  --safe $MULTISIG \
  --to $CONTRACT_ADDRESS \
  --data "0x8456cb59" # keccak("pause()")
```

| Action | Multisig Threshold | Timelock |
|---|---|---|
| Pause | 2-of-5 | Bypass (immediate) |
| Unpause | 3-of-5 | 0 delay |
| Upgrade | 3-of-5 or 5-of-8 | 7 days |
| Fund recovery | 5-of-8 | 14 days |

### Upgrade Flow

```
1. Deploy new implementation → record address
2. Create upgrade proposal via multisig
3. Queue in timelock → 7-day waiting period
4. Execute upgrade → ProxyAdmin.upgradeTo(newImpl)
5. Verify storage compatibility
6. Deploy new implementation to all environments
7. Update deployment registry
```

### Fund Recovery

```bash
# If contract has withdraw function:
cast send $CONTRACT_ADDRESS "withdraw(address,uint256)" \
  $RECIPIENT $AMOUNT \
  --rpc-url $RPC_URL \
  --private-key $MULTISIG_SIGNER

# Emergency drain (if implemented):
cast send $CONTRACT_ADDRESS "emergencyDrain(address,address)" \
  $TOKEN $RECIPIENT \
  --rpc-url $RPC_URL
```

---

## Forge Deployment Script Template

```solidity
// script/Deploy.s.sol
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {Script} from "forge-std/Script.sol";
import {MyContract} from "../src/MyContract.sol";

contract DeployScript is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address owner = vm.envAddress("MULTISIG_ADDRESS");
        uint256 initialSupply = vm.envUint("INITIAL_SUPPLY");

        vm.startBroadcast(deployerPrivateKey);

        MyContract contract_ = new MyContract(owner, initialSupply);
        vm.label(address(contract_), "MyContract");

        vm.stopBroadcast();

        console2.log("MyContract deployed at:", address(contract_));
        console2.log("Owner:", owner);
        console2.log("Initial supply:", initialSupply);
    }
}
```

## Hardhat Deployment Script Template

```typescript
// scripts/deploy.ts
import { ethers, network, run } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);
  console.log("Balance:", ethers.formatEther(await ethers.provider.getBalance(deployer.address)));

  const MyContract = await ethers.getContractFactory("MyContract");
  const multisig = process.env.MULTISIG_ADDRESS!;
  const supply = ethers.parseEther("1000000");

  const contract = await MyContract.deploy(multisig, supply, {
    maxFeePerGas: ethers.parseUnits("50", "gwei"),
    maxPriorityFeePerGas: ethers.parseUnits("2", "gwei"),
  });

  await contract.waitForDeployment();
  const address = await contract.getAddress();
  console.log("MyContract deployed to:", address);

  if (network.name !== "hardhat" && network.name !== "localhost") {
    await run("verify:verify", {
      address,
      constructorArguments: [multisig, supply],
    });
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
```
