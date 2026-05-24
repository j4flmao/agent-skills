# MEV Infrastructure

## MEV Supply Chain Architecture

```
                         ┌─────────────┐
                         │  Searchers  │
                         │ (bots/algos)│
                         └──────┬──────┘
                                │ bundles
                         ┌──────┴──────┐
                         │  Builders   │
                         │ (blocks)    │
                         └──────┬──────┘
                                │ blinded blocks
                         ┌──────┴──────┐
                         │   Relays    │
                         │ (mev-boost) │
                         └──────┬──────┘
                                │ payloads
                         ┌──────┴──────┐
                         │  Proposers  │
                         │ (validators)│
                         └─────────────┘
```

- **Searchers**: monitor mempool for arbitrage, liquidation, sandwich opportunities; construct bundles of ordered transactions
- **Builders**: aggregate bundles + public mempool txs into blocks; compete to offer highest proposer payment
- **Relays**: middleware between builders and validators; validate block headers, relay blinded blocks, reveal payloads
- **Proposers**: validators that win the right to propose a slot; outsource block construction via mev-boost

```
Transaction flow:
  tx → mempool ─┬─→ searcher (bundle) ─→ builder ─→ relay ─→ proposer
                 └─→ builder (public mempool) ──────┘
```

## Flashbots Ecosystem

### Flashbots Protect
- Private transaction relay for end-users (wallet integration)
- Submits txs directly to Flashbots builder, bypassing public mempool
- Provides: front-running protection, reverting tx protection (simulation), no gas bidding wars
- API endpoint: `https://rpc.flashbots.net` (Ethereum mainnet)
- RPC methods: `eth_sendPrivateTransaction`, `eth_sendBundle`

### Flashbots MEV-Boost Relay
- The original mev-boost relay implementation (open-source)
- Supports the relay API spec: `getHeader`, `getPayload`, `submitBlock`
- Validator registration endpoint for proposer public keys
- Data API: `https://boost-relay-flashbots.net/relay/v1/data/` — proposer payouts, block production stats

### MEV-Share
- Searcher-mempool protocol: users submit txs with "hints" about what data they're willing to share
- Searchers compete to backrun or include txs in exchange for rebates
- Enables: backrunning, do-not-sandwich lists, custom searcher competition
- Supported by Flashbots builder and MEV-Share node (light client that connects to builders)

### Flashblocks (Preconfirmations)
- Pre-confirmation mechanism: validators sign ahead-of-time commitments to include txs
- Reduces slot time latency (sub-slot inclusion guarantees)
- Currently available on Flashbots mainnet relay testnet
- Enables: faster UX, CEX deposit speed improvements, L1-L2 bridges with lower latency

### MEV-Geth (Deprecated)
- Modified geth client for in-protocol MEV extraction (flashbots/mev-geth)
- Deprecated in favor of mev-boost middleware approach
- Historical significance: pioneered private relay + bundle submission

## Builder Infrastructure

### Titan Builder
- Largest builder by market share (2024+); built by Flashbots
- Features: JIT (just-in-time) bundle processing, OFA integration, high concurrency
- Supports all major relay endpoints

### Beaver Builder
- Operated by Beaver Build; second-largest market share
- Known for low latency and high relay acceptance rates
- Strong orderflow relationships with wallets and DEX aggregators

### Rsync Builder
- Open-source builder (flashbots/builder)
- Reference implementation for builder standards
- Uses: block templating engine, concurrent tx simulation, profitability calculator
- Common base for custom builder forks

### Custom Builders
- Self-operated by searchers and MEV shops for exclusive orderflow
- Built on rsync-builder or from scratch (Go/Rust)
- Key components:
  - Mempool listener (txpool subscription)
  - Bundle ingestion API (HTTP server)
  - Block building engine (ordered tx selection)
  - Relay submission client (HTTP to mev-boost relay)

### Orderflow Auctions (OFA)
- Mechanism where wallets/apps sell user tx orderflow to builders
- Participants: wallet (sells), searchers (bid), builder (includes best bid)
- Examples: Flashbots MEV-Share, Manifold, CoW Protocol's mev blossom
- Benefits: users get rebates (often 90% of MEV), wallets get rev-share, searchers get exclusive flow

## Relay Infrastructure

### Relay API (mev-boost)
```
GET  /eth/v1/builder/header/{slot}/{parent_hash}/{pubkey}
  → Returns blinded block header (builder-signed)
POST /eth/v1/builder/blinded_blocks
  → Proposer submits signed blinded block
POST /eth/v1/builder/validators
  → Register validators with relay (fee recipient, gas limit)
```

### submitBlock (Builder → Relay)
```bash
curl -X POST https://<relay>/relay/v1/builder/blocks \
  -H "Content-Type: application/json" \
  -d '{
    "message": {
      "slot": "8543680",
      "parent_hash": "0x...",
      "block_hash": "0x...",
      "builder_pubkey": "0x...",
      "proposer_pay": "100000000000000000",
      "gas_limit": "30000000",
      "gas_used": "15000000",
      "value": "100000000000000000"
    },
    "execution_payload": { ... },
    "signature": "0x..."
  }'
```

### Relay Types
| Relay          | URL (mainnet)                              | Operator     | Notes                            |
|----------------|--------------------------------------------|--------------|----------------------------------|
| Flashbots      | https://boost-relay-flashbots.net          | Flashbots    | Highest market share, open       |
| Agnostic       | https://agnostic-relay.net                 | Agnostic     | Low latency, permissionless      |
| UltraSound     | https://relay.ultrasound.money             | UltraSound   | Focus on high value payouts      |
| Aestus         | https://aestus.live                        | Aestus       | Neutral, reliable                |
| Eden Network   | https://relay.edennetwork.io               | Eden         | OFA-integrated relay             |
| Manifold       | https://relay.manifoldfinance.com          | Manifold     | MEV-Share compatible             |

### Relay Health Monitoring
```bash
# Check relay status
curl -s https://boost-relay-flashbots.net/eth/v1/builder/status | jq .

# Get recent block submissions
curl -s https://boost-relay-flashbots.net/relay/v1/data/bidtraces | jq '.[0:5]'

# Query validator registration
curl -s "https://boost-relay-flashbots.net/relay/v1/data/validator_registration?pubkey=0x..." | jq .

# Monitor relay latency
time curl -s -o /dev/null https://agnostic-relay.net/eth/v1/builder/status
```

## Searcher Infrastructure

### Node Connections
```python
# eth_call for simulation
import json, requests, web3

w3 = web3.Web3(web3.HTTPProvider("https://eth-mainnet.g.alchemy.com/v2/KEY"))

# Simulate tx with custom state override
result = w3.eth.call({
    "from": "0x...",
    "to": "0x...",
    "data": "0x...",
}, block_identifier="pending", state_override={
    "0x...": {"balance": hex(10**30)}  # override balance
})
```

### Mempool Monitoring
```python
# txpool.content — get pending transactions
pending = w3.eth.get_block("pending", full_transactions=True)

# WebSocket subscription for real-time mempool
from websockets import connect
async for msg in connect("wss://eth-mainnet.g.alchemy.com/v2/KEY"):
    tx = json.loads(msg)
    # parse and evaluate tx for MEV opportunities

# Listen for pending txs via newPendingTransactions filter
filter_id = w3.eth.filter("pending")
for tx_hash in w3.eth.get_filter_changes(filter_id):
    tx = w3.eth.get_transaction(tx_hash)
```

### Bundle Simulation
```python
# Simulate bundle using eth_callBundle (Flashbots RPC)
bundle = [{
    "txs": [signed_tx.hex()],
    "block_number": hex(block_num + 1),
    "coinbase": "0x...",
    "timestamp": int(time.time()),
}]

response = w3.provider.make_request("eth_callBundle", bundle)
# Check bundleHash, coinbaseDiff (profit), totalGasUsed
```

## Block Building Optimization

### Block Templating
- Start with base template: parent hash, slot, timestamp, fee recipient
- Fill from highest-priority orderflow first (OFA bundles, searcher bundles)
- Fill remaining space with public mempool txs (sorted by effective gas price)
- Apply block gas limit as hard constraint

### Concurrency (Parallel Tx Simulation)
- Use goroutine pool (Go builder) or tokio tasks (Rust builder) for batch simulation
- Simulate bundles serially within a bundle, bundles in parallel across bundles
- Group independent txs for parallel simulation — pre-compute state access sets
- Track conflicting state reads/writes to avoid non-deterministic ordering

### Profitability Calculation
```
Profit = (block_reward + priority_fees + proposer_payment) - (execution_cost + relay_fee)
```
- Block reward: network issuance (ETH, SOL, etc.)
- Priority fees: tips from txs included in the block
- Proposer payment: the sealed bid the builder commits to the relay
- Execution cost: infrastructure cost for simulation + submission
- Relay fee: percentage taken by relay operator (typically 0-1%)

### Ordering Strategies
- **Effective gas price (EGP) sort**: (priority_fee + base_fee per gas) → highest first for mempool txs
- **Bundle priority sort**: OFA bundles > searcher bundles > backrun bundles > mempool txs
- **Hybrid**: maximize proposer payment by simulating multiple candidate block orderings
- **MEV-Geth style**: miner-extractable value ordering (deprecated approach)

## Ethereum Relay Specification (MEV-Boost)

### Relay API Spec Overview
```
MEV-Boost Relay API (Ethereum Builder Specification):
- GET  /eth/v1/builder/status         → Health check
- GET  /eth/v1/builder/header/{slot}/{parent_hash}/{pubkey} → Get header
- POST /eth/v1/builder/blinded_blocks → Submit signed blinded block
- POST /eth/v1/builder/validators     → Register validators
```

### Blinded Block Validation
- Builder constructs execution payload, computes `block_hash`, wraps in `BlindedBeaconBlock` (omits body)
- Builder signs the blinded block header with their `builder_pubkey`
- Proposer selects the best header (highest `value`), signs blinded block, submits back to relay
- Relay validates: proposer signature, slot/parent_hash match, builder signature integrity
- Relay reveals full execution payload to proposer
- Proposer broadcasts full `SignedBeaconBlock` to network

### Builder-Signed Block Headers
```json
{
  "version": "bellatrix",
  "data": {
    "message": {
      "slot": "8543680",
      "parent_hash": "0x...",
      "block_hash": "0x...",
      "fee_recipient": "0x...",
      "gas_limit": "30000000",
      "gas_used": "15000000",
      "value": "100000000000000000",
      "pubkey": "0x..."
    },
    "signature": "0x..."
  }
}
```

## Self-Hosting

### Running a Relay
```bash
# Build from flashbots/mev-boost-relay
git clone https://github.com/flashbots/mev-boost-relay.git
cd mev-boost-relay

# Configure relay
cat > config.yaml <<EOF
network: mainnet
listen_addr: 0.0.0.0:9062
relay_secret_key: "0x..."

# Ethereum endpoints
eth1_endpoint: "http://localhost:8545"
beacon_node_endpoint: "http://localhost:3500"

# Builder API
builder_api_enabled: true
builder_api_listen_addr: 0.0.0.0:9063

# Databases
redis_endpoint: "localhost:6379"
postgres_dsn: "postgres://user:pass@localhost:5432/relay"
EOF

# Run relay
./mev-boost-relay
```

### Relay Requirements
| Component      | Requirement                   | Notes                                |
|----------------|-------------------------------|--------------------------------------|
| Network        | 1-10 Gbps, <10ms to CL+EL    | Latency to beacon + execution nodes  |
| CPU            | 16+ vCPU                     | Heavy concurrent bundle validation   |
| RAM            | 64GB+                        | State caching for eth_call           |
| Storage        | 2TB+ SSD (NVMe preferred)    | Execution node archival data         |
| ETH1 node      | Archival geth/erigon          | Needed for `eth_call` state queries  |
| Beacon node    | Lighthouse/Prysm/Lodestar     | CL interaction for slot tracking     |
| Redis          | For payload caching           | Reduces re-validation load           |
| PostgreSQL     | For registration + logs       | Proposer/builder data persistence    |

### Failover Strategy
- Active-passive relay pair with shared Redis + PostgreSQL
- Health checks against both EL and CL nodes
- DNS failover (TTL 30s) for relay endpoint
- Multi-region deployment (us-east-1 primary, eu-west-1 standby)
- Automatic slot handoff: if primary misses 2 consecutive slots, standby activates
- Builder-side: submit to all relays, relay-side: accept from all builders

## Monitoring

### Relay Uptime and Performance
```bash
# mev-relay-monitoring — Prometheus + Grafana
# Metrics exposed by relay:
#   relay_builder_submissions_total
#   relay_valid_payloads_total
#   relay_invalid_payloads_total
#   relay_header_request_duration_ms
#   relay_payload_reveal_duration_ms

# Prometheus scrape config
scrape_configs:
  - job_name: "mev-relay"
    scrape_interval: 10s
    static_configs:
      - targets:
          - "relay-primary:9064"
          - "relay-standby:9064"
```

### Builder Market Share
```bash
# Query builder stats from relay data API
curl -s "https://boost-relay-flashbots.net/relay/v1/data/builder_blocks_received" | jq '. |
  group_by(.builder_pubkey) |
  map({builder: .[0].builder_pubkey[:10], blocks: length}) |
  sort_by(.blocks) | reverse | .[0:10]'
```

### Proposer Payment Distribution
```yaml
# Grafana dashboard panels:
- Slot proposer payouts (bar chart, last 1000 slots)
- Builder payment distribution (histogram, by builder)
- Relay profit share (builder_payment - proposer_payment)
- Block proposal latency (time from slot start to reveal)
- Bundle inclusion rate (bundles_included / bundles_submitted per builder)
- Relay health: header response time p50/p95/p99, error rate
```

## Code: Simple Relay Query
```bash
#!/usr/bin/env bash
# query-relay.sh — Fetch block header from relay

RELAY="https://boost-relay-flashbots.net"
SLOT="8543680"
PARENT_HASH="0x0000000000000000000000000000000000000000000000000000000000000000"
PUBKEY="0x..."

# Headers endpoint
curl -s "$RELAY/eth/v1/builder/header/$SLOT/$PARENT_HASH/$PUBKEY" | jq .

# Status check
curl -s "$RELAY/eth/v1/builder/status" | jq .

# Validator registration
curl -s "$RELAY/relay/v1/data/validator_registration" \
  -d '{"pubkey": "0x...", "fee_recipient": "0x...", "gas_limit": "30000000", "timestamp": "1234567890", "signature": "0x..."}' | jq .
```

## Code: Builder Submission Script
```python
#!/usr/bin/env python3
"""submit-block.py — Submit a block to mev-boost relay"""

import json, requests, time, os
from eth_account import Account
from eth_account.messages import encode_defunct

RELAY = "https://boost-relay-flashbots.net"
BUILDER_KEY = os.environ["BUILDER_PRIVATE_KEY"]
account = Account.from_key(BUILDER_KEY)

def submit_block(slot: int, parent_hash: str, payload: dict, value: int):
    msg = {
        "slot": str(slot),
        "parent_hash": parent_hash,
        "builder_pubkey": account.address,
        "proposer_pay": str(value),
        "gas_limit": str(payload["gas_limit"]),
        "gas_used": str(payload["gas_used"]),
        "block_hash": payload["block_hash"],
    }

    message_hash = encode_defunct(text=json.dumps(msg, sort_keys=True))
    signature = account.sign_message(message_hash).signature.hex()

    body = {
        "message": msg,
        "execution_payload": payload,
        "signature": f"0x{signature}",
    }

    resp = requests.post(
        f"{RELAY}/relay/v1/builder/blocks",
        json=body,
        headers={"Content-Type": "application/json"},
        timeout=5,
    )
    return resp.json()

# Usage
# result = submit_block(8543680, "0xparent...", execution_payload, 10**18)
# print(json.dumps(result, indent=2))
```
