# Environment Management

## Environment Architecture

```
┌───────────┐     ┌───────────┐     ┌───────────┐     ┌───────────┐
│  Devnet   │────►│  Testnet  │────►│  Staging  │────►│  Mainnet  │
│           │     │           │     │           │     │           │
│ ephemeral │     │ public TC │     │ testnet   │     │ production│
│ anvil/hh  │     │ goerli    │     │ fork +    │     │ real value│
│ custom ID │     │ sepolia   │     │ own depl. │     │ multi-sig │
└───────────┘     └───────────┘     └───────────┘     └───────────┘
```

## Configuration per Chain

### Ethereum Networks
```yaml
# config/chains/ethereum.yml
chains:
  devnet:
    chain_id: 31337
    name: "Hardhat Local"
    currency: ETH
    rpc_url: "http://127.0.0.1:8545"
    ws_url: "ws://127.0.0.1:8546"
    explorer_url: ""
    faucet_url: ""
    confirmations: 1
    gas:
      max_fee_per_gas: null
      max_priority_fee_per_gas: null
      gas_limit: 30000000

  sepolia:
    chain_id: 11155111
    name: "Sepolia Testnet"
    currency: SepoliaETH
    rpc_url: "https://sepolia.infura.io/v3/${INFURA_API_KEY}"
    ws_url: "wss://sepolia.infura.io/ws/v3/${INFURA_API_KEY}"
    explorer_url: "https://sepolia.etherscan.io"
    faucet_url: "https://faucet.sepolia.dev"
    confirmations: 2
    gas:
      max_fee_per_gas: 50
      max_priority_fee_per_gas: 2
      gas_limit: 3000000

  holesky:
    chain_id: 17000
    name: "Holesky Testnet"
    currency: ETH
    rpc_url: "https://holesky.infura.io/v3/${INFURA_API_KEY}"
    ws_url: "wss://holesky.infura.io/ws/v3/${INFURA_API_KEY}"
    explorer_url: "https://holesky.etherscan.io"
    faucet_url: "https://holesky-faucet.pk910.de"
    confirmations: 2

  mainnet:
    chain_id: 1
    name: "Ethereum Mainnet"
    currency: ETH
    rpc_url: "https://mainnet.infura.io/v3/${INFURA_API_KEY}"
    ws_url: "wss://mainnet.infura.io/ws/v3/${INFURA_API_KEY}"
    explorer_url: "https://etherscan.io"
    faucet_url: ""
    confirmations: 12
    gas:
      max_fee_per_gas: null
      max_priority_fee_per_gas: null
      gas_limit: 3000000
```

### Solana Networks
```yaml
chains:
  solana-devnet:
    chain_id: "devnet"
    name: "Solana Devnet"
    currency: SOL
    rpc_url: "https://api.devnet.solana.com"
    ws_url: "wss://api.devnet.solana.com"
    explorer_url: "https://explorer.solana.com/?cluster=devnet"
    faucet_url: "https://faucet.solana.com"
    confirmations: 1
    commitment: "confirmed"

  solana-mainnet:
    chain_id: "mainnet-beta"
    name: "Solana Mainnet"
    currency: SOL
    rpc_url: "https://api.mainnet-beta.solana.com"
    ws_url: "wss://api.mainnet-beta.solana.com"
    explorer_url: "https://explorer.solana.com"
    faucet_url: ""
    confirmations: 32
    commitment: "finalized"
```

### L2 Networks
```yaml
chains:
  arbitrum-sepolia:
    chain_id: 421614
    name: "Arbitrum Sepolia"
    currency: ETH
    rpc_url: "https://sepolia-rollup.arbitrum.io/rpc"
    explorer_url: "https://sepolia.arbiscan.io"
    confirmations: 5

  arbitrum-one:
    chain_id: 42161
    name: "Arbitrum One"
    currency: ETH
    rpc_url: "https://arb1.arbitrum.io/rpc"
    explorer_url: "https://arbiscan.io"
    confirmations: 12

  optimism-sepolia:
    chain_id: 11155420
    name: "Optimism Sepolia"
    currency: ETH
    rpc_url: "https://sepolia.optimism.io"
    explorer_url: "https://sepolia-optimism.etherscan.io"
    confirmations: 5

  optimism:
    chain_id: 10
    name: "OP Mainnet"
    currency: ETH
    rpc_url: "https://mainnet.optimism.io"
    explorer_url: "https://optimistic.etherscan.io"
    confirmations: 12

  polygon-amoy:
    chain_id: 80002
    name: "Polygon Amoy"
    currency: MATIC
    rpc_url: "https://rpc-amoy.polygon.technology"
    explorer_url: "https://www.oklink.com/amoy"
    confirmations: 5

  polygon:
    chain_id: 137
    name: "Polygon Mainnet"
    currency: MATIC
    rpc_url: "https://polygon-rpc.com"
    explorer_url: "https://polygonscan.com"
    confirmations: 12
```

## Environment Files

### .env.devnet
```bash
# Development Environment — Local Anvil Node
CHAIN_ID=31337
RPC_URL=http://127.0.0.1:8545
WS_URL=ws://127.0.0.1:8546
EXPLORER_URL=
FAUCET_URL=

# Deployer — from Anvil's default accounts (never commit real keys)
DEPLOYER_PRIVATE_KEY=0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80
DEPLOYER_ADDRESS=0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266

# Protocol addresses
TOKEN_ADDRESS=
VAULT_ADDRESS=
REGISTRY_ADDRESS=

# Gas (null = use estimated)
MAX_FEE_PER_GAS=
MAX_PRIORITY_FEE_PER_GAS=
GAS_LIMIT=30000000

# Monitoring
SENTRY_DSN=
```

### .env.testnet
```bash
# Testnet Environment — Sepolia
CHAIN_ID=11155111
RPC_URL=https://sepolia.infura.io/v3/${INFURA_API_KEY}
WS_URL=wss://sepolia.infura.io/ws/v3/${INFURA_API_KEY}
EXPLORER_URL=https://sepolia.etherscan.io
FAUCET_URL=https://faucet.sepolia.dev

# Deployer — CI-managed key from Vault
DEPLOYER_PRIVATE_KEY=${DEPLOYER_PRIVATE_KEY:?Must be set in CI secrets}
DEPLOYER_ADDRESS=0x...

# API keys (set in CI secrets, never in env file)
INFURA_API_KEY=${INFURA_API_KEY:?Must be set}
ETHERSCAN_API_KEY=${ETHERSCAN_API_KEY:?Must be set}

# Protocol addresses (populated after deploy)
TOKEN_ADDRESS=0x...
VAULT_ADDRESS=0x...

# Gas
MAX_FEE_PER_GAS=50
MAX_PRIORITY_FEE_PER_GAS=2
GAS_LIMIT=3000000

# Confirmations to wait
CONFIRMATIONS=2

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/yyy
```

### .env.mainnet
```bash
# Mainnet Environment — Production
CHAIN_ID=1
RPC_URL=https://mainnet.infura.io/v3/${INFURA_API_KEY}
WS_URL=wss://mainnet.infura.io/ws/v3/${INFURA_API_KEY}
EXPLORER_URL=https://etherscan.io
FAUCET_URL=

# Deployer — never stored as plaintext
# Use Vault: vault kv get -field=private_key secret/blockchain/mainnet/deployer
DEPLOYER_PRIVATE_KEY=${DEPLOYER_PRIVATE_KEY:?Must be set via Vault}
DEPLOYER_ADDRESS=0x...

# Multi-sig admin
MULTISIG_ADDRESS=0x...
TIMELOCK_ADDRESS=0x...

# API keys
INFURA_API_KEY=${INFURA_API_KEY:?Must be set}
ETHERSCAN_API_KEY=${ETHERSCAN_API_KEY:?Must be set}

# Protocol addresses
TOKEN_ADDRESS=0x...
VAULT_ADDRESS=0x...

# Gas — dynamic by default, set caps for safety
MAX_FEE_PER_GAS=100          # cap at 100 gwei
MAX_PRIORITY_FEE_PER_GAS=5    # cap at 5 gwei
GAS_LIMIT=3000000

# Security
CONFIRMATIONS=12
TX_SENDER=multisig            # only multisig can send

# Monitoring
SENTRY_DSN=https://xxx@sentry.io/yyy
```

## Registry Addresses

```typescript
// config/registry.ts
export interface Registry {
  chainId: number;
  tokens: Record<string, string>;
  protocols: Record<string, string>;
  deployer: string;
  multisig?: string;
}

const registries: Record<string, Registry> = {
  devnet: {
    chainId: 31337,
    tokens: {
      WETH: "0x...",   // deployed in setup
      USDC: "0x...",
      DAI: "0x...",
    },
    protocols: {
      Token: "0x...",
      Vault: "0x...",
      Router: "0x...",
    },
    deployer: "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266",
  },

  sepolia: {
    chainId: 11155111,
    tokens: {
      WETH: "0xfFf9976782d46CC05630D1f6eBAb20b232d6f0d",
      USDC: "0xda9d4f9b69ac6C22e444eD9aF0CfC043b85a54",
      DAI: "0x68194a729C2450ad26072b3D33ADaCbce5dfcDd",
    },
    protocols: {
      Token: "", // filled by CI
      Vault: "",
    },
    deployer: "0x...",
  },

  mainnet: {
    chainId: 1,
    tokens: {
      WETH: "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2",
      USDC: "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48",
      DAI: "0x6B175474E89094C44Da98b954EedeAC495271d0F",
    },
    protocols: {
      Token: "0x...", // deployed via multisig
      Vault: "0x...",
    },
    deployer: "0x...",
    multisig: "0x...",
  },
};
```

## Secrets Management

### Vault Integration — HashiCorp Vault
```hcl
# vault/policies/blockchain-deployer.hcl
path "secret/data/blockchain/*" {
  capabilities = ["read", "list"]
}

path "transit/encrypt/deployer-key" {
  capabilities = ["create", "update"]
}

path "transit/decrypt/deployer-key" {
  capabilities = ["create", "update"]
}
```

### Vault CLI Usage
```bash
# Write deployer key for testnet
vault kv put secret/blockchain/testnet/deployer \
  private_key="0x..." \
  address="0x..."

# Read in CI
vault kv get -field=private_key \
  secret/blockchain/testnet/deployer

# Write mainnet multisig config
vault kv put secret/blockchain/mainnet/multisig \
  owners='["0x...","0x...","0x..."]' \
  threshold=3

# Rotate RPC API key
vault kv put secret/blockchain/infura \
  api_key="new-key-here"
```

### GitHub Actions Secrets
```yaml
# .github/actions/load-secrets/action.yml
name: "Load Blockchain Secrets"
description: "Load secrets from Vault for blockchain deployments"
inputs:
  environment:
    description: "Target environment"
    required: true
    type: choice
    options: [testnet, staging, mainnet]

runs:
  using: "composite"
  steps:
    - name: Authenticate to Vault
      uses: hashicorp/vault-action@v2
      with:
        url: https://vault.example.com
        method: jwt
        role: ci-deployer
        secrets: |
          secret/data/blockchain/${{ inputs.environment }}/deployer private_key | DEPLOYER_PRIVATE_KEY;
          secret/data/blockchain/${{ inputs.environment }}/deployer address | DEPLOYER_ADDRESS;
          secret/data/blockchain/infura api_key | INFURA_API_KEY;
          secret/data/blockchain/etherscan api_key | ETHERSCAN_API_KEY;
```

## Deployment Promotion Flow

### Manual Promotion Script
```bash
#!/usr/bin/env bash
# promote.sh — Promote deployment through environments
set -euo pipefail

ENV=${1:-devnet}
CONTRACT=${2:-all}

case $ENV in
  devnet)
    echo "→ Deploying to devnet..."
    forge script script/Deploy.s.sol --fork-url http://127.0.0.1:8545 --broadcast -vvv
    forge script script/Verify.s.sol --fork-url http://127.0.0.1:8545
    echo "✓ Devnet deploy complete"
    ;;

  testnet)
    echo "→ Deploying to testnet (Sepolia)..."
    forge script script/Deploy.s.sol \
      --rpc-url sepolia \
      --private-key $(vault kv get -field=private_key secret/blockchain/testnet/deployer) \
      --broadcast \
      --verify \
      -vvv
    echo "✓ Testnet deploy complete"
    echo "→ Run smoke tests..."
    forge test --match-path test/smoke/* --rpc-url sepolia -vvv
    ;;

  staging)
    echo "→ Deploying to staging (Sepolia fork with test contracts)..."
    forge script script/Deploy.s.sol \
      --rpc-url sepolia \
      --private-key $(vault kv get -field=private_key secret/blockchain/staging/deployer) \
      --broadcast \
      -vvv
    echo "→ Deploying test protocol contracts..."
    forge script script/DeployTestProtocol.s.sol \
      --rpc-url sepolia \
      --broadcast \
      -vvv
    ;;

  mainnet)
    echo "⚠  MAINNET DEPLOYMENT — requires multisig approval"
    echo "→ Generating deploy transaction..."
    forge script script/Deploy.s.sol \
      --rpc-url mainnet \
      --private-key $(vault kv get -field=private_key secret/blockchain/mainnet/deployer) \
      --broadcast \
      --slow \
      --with-gas-price 50000000000 \
      -vvv
    echo "→ Submit to Gnosis Safe for final approval"
    echo "✓ Mainnet proposal created"
    ;;
esac
```

### CI Promotion Pipeline (GitHub Actions)
```yaml
name: Promote Deployment

on:
  workflow_dispatch:
    inputs:
      from:
        description: "Promote from environment"
        type: choice
        options: [devnet, testnet, staging]
        required: true
      to:
        description: "Promote to environment"
        type: choice
        options: [testnet, staging, mainnet]
        required: true

jobs:
  promote:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Validate promotion
        run: |
          case "${{ inputs.from }}-${{ inputs.to }}" in
            devnet-testnet|testnet-staging|staging-mainnet)
              echo "✓ Valid promotion path"
              ;;
            *)
              echo "✗ Invalid promotion: ${{ inputs.from }} → ${{ inputs.to }}"
              exit 1
              ;;
          esac

      - name: Deploy to target
        run: |
          ./scripts/promote.sh ${{ inputs.to }}

      - name: Run integration tests
        run: |
          forge test --match-path test/integration/* --rpc-url ${{ inputs.to }} -vvv
```
