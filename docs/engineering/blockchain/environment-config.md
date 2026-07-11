# Blockchain Environment Configuration Guide

## Overview

This document defines the standardized environment configuration for blockchain project deployment across all stages: devnet, testnet, staging, and mainnet. Every environment must follow the conventions below to ensure consistency across teams, tools, and CI/CD pipelines.

---

## Environment Matrix

### Devnet (Local Development)

| Property | Value |
|---|---|
| Tool | Anvil (Foundry), Hardhat node, or Ganache |
| Chain ID | Ephemeral (31337 for Anvil/Hardhat, a random for Ganache) |
| Pre-funded | 10+ accounts with 10000 ETH each |
| Mock tokens | Deploy mock ERC20 (MOCK_USDC, MOCK_WETH, MOCK_LINK) |
| Verification | None (skip or mock) |
| Reset | `anvil --fork-url $MAINNET_RPC` for mainnet fork |
| Gas | Free or minimal (1 wei) |
| Block time | Instant (0s) or time-adjustable via `evm_increaseTime` |

```bash
# Launch devnet with mainnet fork
anvil --fork-url https://eth-mainnet.g.alchemy.com/v2/$ALCHEMY_KEY \
      --fork-block-number 19500000 \
      --chain-id 31337 \
      --gas-limit 30000000
```

### Testnet

| Chain | Name | Chain ID | RPC Provider | Explorer | Faucet |
|---|---|---|---|---|---|
| Ethereum | Sepolia | 11155111 | Infura/Alchemy | sepolia.etherscan.io | sepoliafaucet.com |
| Ethereum | Holesky | 17000 | Infura/Alchemy | holesky.etherscan.io | holesky-faucet.net |
| Polygon | Amoy | 80002 | Alchemy/QuickNode | amoy.polygonscan.com | faucet.polygon.technology |
| Arbitrum | Sepolia | 421614 | Infura/Alchemy | sepolia.arbiscan.io | arbitrum.faucet |
| Optimism | Sepolia | 11155420 | Alchemy/QuickNode | sepolia-optimism.etherscan.io | optimismfaucet.xyz |
| Base | Sepolia | 84532 | Alchemy/Coinbase | sepolia.basescan.org | base-sepolia-faucet |
| Solana | devnet | 103 | Helius/QuickNode | explorer.solana.com | solfaucet.com |

### Staging

Staging is a testnet fork with production-like infrastructure.

| Component | Configuration |
|---|---|
| RPC | Dedicated Alchemy/QuickNode endpoint (not shared) |
| Fork | Fork testnet at specific block for deterministic state |
| Oracles | Testnet oracle feeds (Chainlink: ETH/USD, BTC/USD matic) |
| Multisig | Test Safe (3/5 signers with test keys) |
| Relayer | Local Gelato/Gelato testnet |
| Indexer | Test The Graph deployment |
| Subgraph | Pointed at staging subgraph |

```bash
# Staging fork command
anvil --fork-url https://sepolia.infura.io/v3/$INFURA_KEY \
      --fork-block-number 5500000 \
      --chain-id 11155111 \
      --block-time 12
```

### Mainnet

| Property | Requirement |
|---|---|
| RPC | Paid tier (Infura Growth / Alchemy Growth+ / QuickNode) |
| Wallet | Multisig (Gnosis Safe, 3/5 or 5/8) |
| Signer | Ledger/Trezor hardware wallet via Frame or Web3Auth |
| Gas | Pre-funded with >= 5 ETH for deployment |
| Proxy | ProxyAdmin owned by multisig |
| Timelock | 7-day delay on all upgrades |
| Monitoring | Tenderly, Forta, Defender Sentinels |
| Backup | Full deployment artifact backup on IPFS + S3 |

---

## Chain ID Reference

| Network | Chain ID | Hex | Currency |
|---|---|---|---|
| Ethereum Mainnet | 1 | 0x1 | ETH |
| Sepolia | 11155111 | 0xaa36a7 | SepETH |
| Holesky | 17000 | 0x4268 | HolETH |
| Polygon Mainnet | 137 | 0x89 | MATIC |
| Amoy (Polygon) | 80002 | 0x13882 | MATIC |
| Mumbai (deprecated) | 80001 | 0x13881 | MATIC |
| Arbitrum One | 42161 | 0xa4b1 | ETH |
| Arbitrum Sepolia | 421614 | 0x66eee | ETH |
| Optimism | 10 | 0xa | ETH |
| Optimism Sepolia | 11155420 | 0xaa37dc | ETH |
| Base | 8453 | 0x2105 | ETH |
| Base Sepolia | 84532 | 0x14a34 | ETH |
| Avalanche C-Chain | 43114 | 0xa86a | AVAX |
| Avalanche Fuji | 43113 | 0xa869 | AVAX |
| Solana Mainnet | 101 | - | SOL |
| Solana Devnet | 103 | - | SOL |
| BNB Smart Chain | 56 | 0x38 | BNB |
| BNB Testnet | 97 | 0x61 | tBNB |
| zkSync Era Mainnet | 324 | 0x144 | ETH |
| zkSync Sepolia | 300 | 0x12c | ETH |

---

## RPC Provider Configuration

### Infura

```yaml
# ~/.infura.yaml or INFURA_PROJECT_ID env var
ethereum:
  mainnet: https://mainnet.infura.io/v3/${INFURA_PROJECT_ID}
  sepolia: https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}
  holesky: https://holesky.infura.io/v3/${INFURA_PROJECT_ID}
  arbitrum: https://arbitrum-mainnet.infura.io/v3/${INFURA_PROJECT_ID}
  optimism: https://optimism-mainnet.infura.io/v3/${INFURA_PROJECT_ID}
```

### Alchemy

```yaml
# ALCHEMY_API_KEY env var
ethereum:
  mainnet: https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}
  sepolia: https://eth-sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}
  holesky: https://eth-holesky.g.alchemy.com/v2/${ALCHEMY_API_KEY}
polygon:
  mainnet: https://polygon-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}
  amoy: https://polygon-amoy.g.alchemy.com/v2/${ALCHEMY_API_KEY}
arbitrum:
  mainnet: https://arb-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}
optimism:
  mainnet: https://opt-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}
base:
  mainnet: https://base-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}
```

### Public RPCs (fallback only, not for production)

```yaml
ethereum:
  mainnet: https://eth.llamarpc.com
  sepolia: https://rpc.sepolia.org
```

---

## Configuration Template

```yaml
# config/ethereum-sepolia.yaml
chain:
  name: ethereum-sepolia
  chain_id: 11155111
  rpc_url: https://sepolia.infura.io/v3/${INFURA_KEY}
  ws_url: wss://sepolia.infura.io/ws/v3/${INFURA_KEY}
  explorer: https://sepolia.etherscan.io
  faucet: https://sepoliafaucet.com
  confirmations: 2
  gas:
    max_fee_per_gas: 50 gwei
    max_priority_fee_per_gas: 2 gwei

contracts:
  registry: "0x1234567890123456789012345678901234567890"
  tokens:
    USDC: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238"
    WETH: "0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14"
    LINK: "0x779877A7B0D9E8603169DdbD7836e478b4624789"

oracles:
  eth_usd: "0x694AA1769357215DE4FAC081bf1f309aDC325306"
  btc_usd: "0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43"

multisig:
  address: "0x..."
  threshold: 3
  owners:
    - "0xowner1"
    - "0xowner2"
    - "0xowner3"
    - "0xowner4"
    - "0xowner5"
```

---

## Environment Files

### `.env.local`

```bash
# === LOCAL DEVNET ===
CHAIN_ID=31337
RPC_URL=http://127.0.0.1:8545
PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
# This is Anvil account #0; never use on testnet/mainnet

# Optional: fork from mainnet
FORK_URL=https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_KEY}
FORK_BLOCK=19500000

# Mock token addresses (deployed on devnet)
MOCK_USDC=0x...
MOCK_WETH=0x...
MOCK_LINK=0x...

# Explorer (local blockscout or skip)
EXPLORER_URL=
VERIFY_CONTRACT=false
```

### `.env.testnet`

```bash
# === TESTNET: SEPOLIA ===
NETWORK=sepolia
CHAIN_ID=11155111
RPC_URL=https://sepolia.infura.io/v3/${INFURA_PROJECT_ID}
WS_URL=wss://sepolia.infura.io/ws/v3/${INFURA_PROJECT_ID}
EXPLORER_URL=https://sepolia.etherscan.io
VERIFY_CONTRACT=true
ETHERSCAN_API_KEY=${ETHERSCAN_API_KEY}

# Deployer
DEPLOYER_PRIVATE_KEY=${DEPLOYER_PRIVATE_KEY}
# Fund with faucet: https://sepoliafaucet.com
# Minimum: 0.5 ETH for deployment gas

# Multisig (test Safe)
MULTISIG_ADDRESS=0x...
MULTISIG_THRESHOLD=2
TEST_SIGNER_1=0x...
TEST_SIGNER_2=0x...

# Oracle feeds (testnet)
CHAINLINK_ETH_USD=0x694AA1769357215DE4FAC081bf1f309aDC325306
CHAINLINK_BTC_USD=0x1b44F3514812d835EB1BDB0acB33d3fA3351Ee43

# Gas
MAX_FEE_PER_GAS=50
MAX_PRIORITY_FEE_PER_GAS=2
GAS_LIMIT=3000000
```

### `.env.staging`

```bash
# === STAGING ===
NETWORK=staging
CHAIN_ID=11155111
RPC_URL=https://sepolia.g.alchemy.com/v2/${ALCHEMY_API_KEY}
FORK_URL=https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}
FORK_BLOCK=19500000
EXPLORER_URL=https://sepolia.etherscan.io

# Real testnet token addresses
USDC=0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238
WETH=0xfFf9976782d46CC05630D1f6eBAb18b2324d6B14
LINK=0x779877A7B0D9E8603169DdbD7836e478b4624789

# Oracle feeds (testnet proxies)
ORACLE_ETH_USD=0x694AA1769357215DE4FAC081bf1f309aDC325306
ORACLE_STALENESS_THRESHOLD=3600

# Multisig (test Safe)
STAGING_SAFE=0x...
STAGING_SAFE_THRESHOLD=3

# Monitoring
TENDERLY_PROJECT=${TENDERLY_PROJECT}
TENDERLY_USERNAME=${TENDERLY_USERNAME}
```

### `.env.mainnet`

```bash
# === MAINNET ===
NETWORK=mainnet
CHAIN_ID=1
RPC_URL=https://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}
WS_URL=wss://eth-mainnet.g.alchemy.com/v2/${ALCHEMY_API_KEY}
EXPLORER_URL=https://etherscan.io
VERIFY_CONTRACT=true
ETHERSCAN_API_KEY=${ETHERSCAN_API_KEY}

# NEVER store mainnet private key in .env
# Use hardware wallet via Frame/Ledger/Trezor
# Deploy via multisig only
MAINNET_MULTISIG=0x...
MAINNET_MULTISIG_THRESHOLD=5

# Real token addresses
USDC=0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48
WETH=0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2
LINK=0x514910771AF9Ca656af840dff83E8264EcF986CA
DAI=0x6B175474E89094C44Da98b954EedeAC495271d0F

# Production oracles
ORACLE_ETH_USD=0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419
ORACLE_BTC_USD=0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c
ORACLE_STALENESS_THRESHOLD=3600

# Gas
MAX_FEE_PER_GAS=100
MAX_PRIORITY_FEE_PER_GAS=3
GAS_LIMIT=5000000
# Typical mainnet deploy cost: 0.5-2 ETH

# Sentry/Tenderly monitoring
TENDERLY_PROJECT=${TENDERLY_PROJECT}
FORTA_BOT_ID=${FORTABOT_ID}
DEFENDER_TEAM_API_KEY=${DEFENDER_TEAM_API_KEY}
```

---

## Network-Specific Notes

### Solana

```bash
# .env.local.solana
ANCHOR_PROVIDER_URL=http://127.0.0.1:8899
ANCHOR_WALLET=~/.config/solana/id.json
SOLANA_NETWORK=localnet

# .env.testnet.solana
ANCHOR_PROVIDER_URL=https://api.devnet.solana.com
SOLANA_NETWORK=devnet
SOLANA_EXPLORER=https://explorer.solana.com/?cluster=devnet

# .env.mainnet.solana
ANCHOR_PROVIDER_URL=https://api.mainnet-beta.solana.com
SOLANA_NETWORK=mainnet-beta
SOLANA_EXPLORER=https://explorer.solana.com
```

### Sui

```bash
# .env.testnet.sui
SUI_NETWORK=testnet
SUI_RPC_URL=https://fullnode.testnet.sui.io
SUI_FAUCET_URL=https://faucet.testnet.sui.io
SUI_EXPLORER=https://suiexplorer.com/?network=testnet
```

---

## CI/CD Environment Variables

All secrets must be stored in CI/CD secrets manager (GitHub Actions / GitLab CI):

| Variable | Scope | Required |
|---|---|---|
| `INFURA_PROJECT_ID` | All networks | Yes |
| `ALCHEMY_API_KEY` | All networks | Yes |
| `ETHERSCAN_API_KEY` | Testnet + Mainnet | Yes |
| `POLYGONSCAN_API_KEY` | Polygon | Yes |
| `ARBISCAN_API_KEY` | Arbitrum | Yes |
| `DEPLOYER_PRIVATE_KEY` | Devnet + Testnet only | Yes |
| `MAINNET_DEPLOYER_PK` | Mainnet (never store in plaintext) | Only for CI |
| `TENDERLY_API_KEY` | Staging + Mainnet | Yes |
| `FORTAA_API_KEY` | Mainnet | Recommended |
| `SLACK_WEBHOOK` | All | Recommended |
