# Solana Tools & SDKs

## Solana CLI

The primary command-line tool for cluster interaction.

### Key Management

```bash
# Generate keypair
solana-keygen new --outfile ~/.config/solana/id.json

# Generate with mnemonic
solana-keygen new --no-bip39-passphrase -o keypair.json

# Recover from mnemonic
solana-keygen recover 'prompt://?full-path=keypair.json'

# View public key
solana-keygen pubkey keypair.json

# Verify keypair
solana-keygen verify <PUBKEY> keypair.json
```

### Cluster Commands

```bash
# Set cluster
solana config set --url mainnet-beta
solana config set --url devnet
solana config set --url testnet
solana config set --url localhost

# Check connection
solana cluster-version
solana genesis-hash
solana epoch-info

# Wallet
solana balance <ADDRESS>
solana airdrop 2             # devnet/testnet only, ~1 SOL/request
solana transfer <TARGET> 1.5 --allow-unfunded-recipient

# Validator info
solana validators
solana vote-account <VOTE_ACCOUNT>
solana leader-schedule
```

### Program Deployment

```bash
# Build (produces .so/.so.Z)
cargo build-bpf

# Deploy
solana program deploy target/deploy/my_program.so

# Deploy buffer (for multi-step)
solana program write-buffer target/deploy/my_program.so
solana program set-buffer-authority <BUFFER> --new-buffer-authority <NEW>

# Upgrade
solana program deploy target/deploy/my_program.so --program-id <PROGRAM_ID>

# Set upgrade authority to None (immutable)
solana program set-upgrade-authority <PROGRAM_ID> --new-upgrade-authority <NEW>
solana program set-upgrade-authority <PROGRAM_ID> --final

# Close program (reclaim SOL)
solana program close <PROGRAM_ID>

# Verify deployed bytecode
solana program show <PROGRAM_ID>
```

### Logging & Debugging

```bash
# Stream logs from a program
solana logs <PROGRAM_ID>

# Stream logs from any program (all)
solana logs

# Stream with filter
solana logs --url devnet | grep "Program log:" --line-buffered

# Confirm transaction
solana confirm <TX_SIGNATURE>

# Inspect transaction
solana transaction-status <TX_SIGNATURE>
```

### Account Inspection

```bash
# Read account data
solana account <ACCOUNT_ADDRESS>

# Dump account data to file
solana account <ACCOUNT_ADDRESS> --output-file account.bin

# Get account balance
solana balance <ACCOUNT_ADDRESS>

# Get rent-exempt minimum
solana rent 165
```

## Anchor CLI

The Anchor framework CLI for Solana program development.

### Project Lifecycle

```bash
# Init new project
anchor init my_project

# Build
anchor build

# Deploy
anchor deploy

# Run tests (starts local validator, deploys, runs tests)
anchor test

# Run tests against existing cluster
anchor test --provider.cluster devnet

# Test without auto-starting validator (use localhost)
anchor test --skip-local-validator

# Build only specific program
anchor build --program-name my_program

# Upgrade program
anchor upgrade target/deploy/my_program.so --program-id <PROGRAM_ID>
```

### Key Commands

```bash
# Generate types from IDL
anchor idl parse --file src/lib.rs > target/idl/my_program.json

# Verify build (deterministic)
anchor verify <PROGRAM_ID>

# List all programs in workspace
anchor list

# Migrate CLI (run deploy scripts)
anchor migrate

# Publish to Anchor Registry
anchor publish
```

### Anchor.toml Configuration

```toml
[provider]
cluster = "devnet"
wallet = "~/.config/solana/id.json"

[programs.devnet]
my_program = "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"

[scripts]
test = "yarn run ts-mocha -p tsconfig.json tests/**/*.ts"

[test]
genesis = [
  # Add programs to genesis for local test
  { address = "metaqbxxUerdq28cj1RbAWkYQm3ybzjb6a8bt518x1s",
    filename = "mpl_token_metadata.so" },
]
```

## SPL Token CLI

```bash
# Create SPL token mint
spl-token create-token

# Create token with specific decimals
spl-token create-token --decimals 6

# Create token with Token-2022
spl-token create-token --program-id TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb

# Create associated token account
spl-token create-account <MINT_ADDRESS>

# Mint tokens
spl-token mint <MINT_ADDRESS> 1000

# Transfer
spl-token transfer <MINT_ADDRESS> 100 --recipient <DEST_ATA>

# Burn
spl-token burn <MINT_ADDRESS> 50

# Check balance
spl-token balance <MINT_ADDRESS>

# List all token accounts for wallet
spl-token accounts

# Wrap SOL (create wSOL)
spl-token wrap 1.0

# Unwrap SOL
spl-token unwrap <WSOL_ACCOUNT>

# Enable freeze authority
spl-token authorize <MINT> freeze <FREEZE_AUTHORITY>

# Freeze token account
spl-token freeze <TOKEN_ACCOUNT>
```

## Metaplex CLI (Sugar)

For NFT/cNFT creation on Solana.

```bash
# Install Sugar
cargo install sugar-cli

# Initialize candy machine config
sugar launch

# Upload assets
sugar upload

# Deploy candy machine
sugar deploy

# Add config lines
sugar add

# Update candy machine
sugar update

# Mint an NFT
sugar mint

# Verify deployment
sugar verify

# Withdraw SOL from candy machine
sugar withdraw
```

## Web3.js (TypeScript/JS SDK)

```typescript
import { Connection, PublicKey, Transaction, SystemProgram, LAMPORTS_PER_SOL } from "@solana/web3.js";

// Connect
const connection = new Connection("https://api.mainnet-beta.solana.com");

// Read account
const account = await connection.getAccountInfo(new PublicKey("…"));
console.log(account?.lamports, account?.data);

// Send transaction
const tx = new Transaction().add(
    SystemProgram.transfer({
        fromPubkey: sender.publicKey,
        toPubkey: recipient,
        lamports: 0.1 * LAMPORTS_PER_SOL,
    })
);
const sig = await connection.sendTransaction(tx, [sender]);
await connection.confirmTransaction(sig);

// Read program accounts
const accounts = await connection.getProgramAccounts(
    new PublicKey("PROGRAM_ID"),
    {
        filters: [
            { dataSize: 165 },
            { memcmp: { offset: 0, bytes: "..." } },
        ],
    }
);
```

## Web3.py (Python SDK)

```python
from solana.rpc.api import Client
from solana.rpc.types import TxOpts
from solders.keypair import Keypair
from solders.system_program import transfer, TransferParams
from solders.pubkey import Pubkey

client = Client("https://api.devnet.solana.com")

# Airdrop
sig = client.request_airdrop(Pubkey.from_string("…"), 1_000_000_000)
client.confirm_transaction(sig)

# Send tx
tx = transfer(TransferParams(
    from_pubkey=sender.pubkey(),
    to_pubkey=Pubkey.from_string("…"),
    lamports=100_000_000,
))
sig = client.send_transaction(tx, sender)
```

## RPC Providers

| Provider | Endpoint | Free Tier |
|----------|----------|-----------|
| Public Mainnet | `https://api.mainnet-beta.solana.com` | Rate limited (25 req/10s) |
| Helius | `https://rpc.helius.xyz/?api-key=KEY` | 25k req/day |
| Triton | `https://rpc.triton.zone/KEY` | 5M CU/day |
| QuickNode | `https://solana.quiknode.pro/KEY` | Varies by plan |

```bash
# Helius WebSocket
wss://mainnet.helius-rpc.com/?api-key=KEY

# Triton gRPC (for geyser streaming)
grpc.triton.zone:443
```

## Solana Explorer

- **Mainnet**: `https://explorer.solana.com/`
- **Devnet**: `https://explorer.solana.com/?cluster=devnet`
- **Testnet**: `https://explorer.solana.com/?cluster=testnet`
- **Custom RPC**: `https://explorer.solana.com/?cluster=custom&customUrl=...`

## Solana Playground

Browser-based IDE for Solana development at `https://beta.solpg.io/`:
- In-browser Anchor compiler
- SPL token minting
- Devnet airdrop
- Built-in wallet
- Shareable projects
