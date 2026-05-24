# Economic Security & MEV

## MEV Taxonomy

Maximal Extractable Value (MEV) is profit extracted from block production beyond standard rewards and fees.

**DEX Arbitrage:** The most common MEV. Bots monitor DEX pools for price discrepancies across venues and execute atomic buy-low-sell-high trades within a single block.

```
Pool A: ETH/USDC @ 2000
Pool B: ETH/USDC @ 2010
Arbitrage: Buy ETH at 2000 on A → Sell at 2010 on B
Profit: (2010 - 2000) - fees - gas
```

**Liquidation:** In lending protocols (Aave, Compound), if a position falls below the collateral ratio, liquidators repay debt and seize collateral at a discount. MEV searchers compete to be first to submit liquidation transactions.

```
Position: 100 ETH deposited, 50 ETH borrowed
LTV crosses threshold → seized by liquidator
Liquidator repays 50 ETH → receives 50 ETH + liquidation bonus
```

**Sandwich Attack:** Searcher observes a pending victim transaction, places a buy order before and a sell order after. The victim buys at an inflated price; the searcher profits from the spread.

```
1. Searcher buy tx (frontrun)
2. Victim buy tx (moves price up)
3. Searcher sell tx (backrun at higher price)
```

**NFT MEV:** Includes sniping (buying underpriced NFTs before listers notice), bid stuffing (manipulating order book), and trait-based arbitrage across marketplaces.

**Cross-Domain MEV:** MEV extracted across L1-L2 bridges or multiple rollups. Requires sequencer-level coordination. Most complex form, emerging with cross-chain messaging protocols.

## MEV Supply Chain

```
Searchers ──→ Builders ──→ Relays ──→ Proposers
    │             │           │           │
    ▼             ▼           ▼           ▼
 Find MEV    Construct     Validate   Propose
opportunities  blocks    & auction   blocks to
 & bundle   with bundles    bids      network
   txs
```

**Searchers:** Run complex algorithms to detect MEV opportunities. Submit bundles (ordered tx sequences) to builders. Pay bribes/priority fees.

**Builders:** Construct full execution payloads by selecting from the public mempool and searcher bundles. Optimize for fee revenue. Operate in a competitive market.

**Relays:** Act as intermediaries. Validate block legality (no invalid state transitions). Accept blinded bids from builders, forward the bid+header to proposers. Reveal the full body after proposer commits.

**Proposers (Validators):** Select the highest-bidding block header from relay auctions. Propose the block to the network. Earn MEV rewards on top of consensus rewards.

```
Builder submits: header + encrypted full body
Relay validates legality
Relay forwards header to proposer
Proposer signs and commits to header
Relay reveals full body
Proposer broadcasts full block
```

### MEV-Boost Relay Interaction

```go
package main

import (
    "bytes"
    "encoding/json"
    "net/http"
)

type BuilderBlockSubmission struct {
    Signature          string `json:"signature"`
    Message            struct {
        Slot           uint64 `json:"slot"`
        ParentHash     string `json:"parent_hash"`
        BlockHash      string `json:"block_hash"`
        BuilderPubkey  string `json:"builder_pubkey"`
        ProposerIndex  uint64 `json:"proposer_index"`
        GasLimit       uint64 `json:"gas_limit"`
        GasUsed        uint64 `json:"gas_used"`
        Value          string `json:"value"` // wei bid to proposer
    } `json:"message"`
}

type BidResponse struct {
    Slot      uint64 `json:"slot"`
    BlockHash string `json:"block_hash"`
    Value     string `json:"value"` // highest bid
}

func submitBlock(relayURL string, sub BuilderBlockSubmission) error {
    body, _ := json.Marshal(sub)
    resp, err := http.Post(
        relayURL+"/eth/v1/builder/blind_block",
        "application/json",
        bytes.NewReader(body),
    )
    return err
}

func getHeader(relayURL string, slot uint64, parentHash, pubkey string) (*BidResponse, error) {
    url := relayURL + "/eth/v1/builder/header/" +
        fmt.Sprintf("%d/%s/%s", slot, parentHash, pubkey)
    resp, err := http.Get(url)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    var bid BidResponse
    json.NewDecoder(resp.Body).Decode(&bid)
    return &bid, nil
}
```

## ePBS (Enshrined PBS)

Enshrined Proposer-Builder Separation builds PBS into the protocol layer rather than relying on external middleware (MEV-Boost).

**Protocol-Level Design:** Validators register as proposers. A separate builder role is protocol-native. The beacon chain handles builder selection, bid verification, and payment.

**Inclusion Lists (FOCIL):** FOCIL (First-Come, Inclusion List) prevents builder censorship. The proposer mandates a set of transactions that MUST be included. Builders construct blocks on top of the inclusion list.

```
Proposer creates inclusion list (IL):
  [tx1, tx2, tx3] ← non-censored transactions
Builders construct blocks containing IL + additional txs:
  [tx1, tx2, tx3, tx_searcher_1, tx_searcher_2]
Proposer picks highest-bidding valid block
```

**ePBS Benefits:**
- Censorship resistance via inclusion lists
- No relay trust assumptions (MEV-Boost requires honest relay)
- Protocol-enforced payment splitting
- Lower latency (no external relay hop)

## MEV-Boost

MEV-Boost is the current PBS implementation for Ethereum. It operates as sidecar software run alongside the validator client.

**Relay Network:** MEV-Boost relays form a network that connects builders to proposers. Relays are permissioned but monitors exist to detect misbehavior. Flashbots, BloXroute, Eden, and Ultra Sound are major relays.

**Blinded Blocks:** Builders construct full blocks but submit only the header (blinded) to proposers. The proposer signs the header without seeing the full body. The relay reveals the body after commitment.

**Payload Attributes:** The EL (Execution Layer) receives payload attributes from the CL (Consensus Layer) via the Engine API. These include timestamp, random/reveal, fee recipient, and withdrawals.

```
Validator CL ──→ Engine API ──→ EL
                  (forkchoiceUpdated, getPayload)
                      │
MEV-Boost sidecar ←──┘
    │
    ▼
Relay ──→ Builder
```

**MEV-Boost+ (ePBS Integration):** A proposed upgrade where MEV-Boost-style relay logic is merged with ePBS. Builders commit to blocks, proposers enforce inclusion lists, and the consensus layer handles payments.

### Searcher Bot Example

```python
import asyncio
from web3 import Web3
from flashbots import flashbots

class MEVSearcher:
    def __init__(self, w3: Web3, private_key: str):
        self.w3 = w3
        self.account = w3.eth.account.from_key(private_key)
        self.flashbots = flashbots(w3, self.account)

    async def scan_mempool(self):
        """Monitor pending transactions for arbitrage opportunities."""
        pending_filter = self.w3.eth.filter('pendingTransactions')
        while True:
            tx_hashes = pending_filter.get_new_entries()
            for tx_hash in tx_hashes:
                try:
                    tx = self.w3.eth.get_transaction(tx_hash)
                    if self.is_arbitrage_opportunity(tx):
                        bundle = self.build_arbitrage_bundle(tx)
                        await self.submit_bundle(bundle)
                except Exception:
                    continue
            await asyncio.sleep(0.1)

    def is_arbitrage_opportunity(self, tx) -> bool:
        """Check if pending tx creates price discrepancy."""
        # Simplified: check if tx interacts with known DEX pools
        if not tx.get('to'):
            return False
        return tx['to'].lower() in self.known_dex_addresses

    def build_arbitrage_bundle(self, trigger_tx) -> list:
        """Construct frontrun + trigger + backrun bundle."""
        return [
            self.build_frontrun_tx(trigger_tx),
            trigger_tx,
            self.build_backrun_tx(trigger_tx)
        ]

    async def submit_bundle(self, bundle: list):
        """Submit bundle via Flashbots relay."""
        block = self.w3.eth.block_number
        result = self.flashbots.send_bundle(
            bundle,
            target_block_number=block + 1,
        )
        return result

    def build_frontrun_tx(self, trigger_tx):
        return {
            'from': self.account.address,
            'to': '0xDEX_POOL_ADDRESS',
            'data': '0x...',  # swap calldata
            'gas': 200000,
            'maxFeePerGas': Web3.to_wei(100, 'gwei'),
            'maxPriorityFeePerGas': Web3.to_wei(10, 'gwei'),
            'nonce': self.w3.eth.get_transaction_count(self.account.address),
        }

    def build_backrun_tx(self, trigger_tx):
        # Reverse swap to capture profit
        return {
            'from': self.account.address,
            'to': '0x_DEX_POOL_ADDRESS',
            'data': '0x...',  # reverse swap calldata
            'gas': 200000,
            'maxFeePerGas': Web3.to_wei(100, 'gwei'),
            'maxPriorityFeePerGas': Web3.to_wei(10, 'gwei'),
            'nonce': self.w3.eth.get_transaction_count(self.account.address) + 1,
        }

async def main():
    w3 = Web3(Web3.HTTPProvider('https://eth-mainnet.g.alchemy.com/v2/YOUR_KEY'))
    searcher = MEVSearcher(w3, 'YOUR_PRIVATE_KEY')
    await searcher.scan_mempool()

asyncio.run(main())
```

## Economic Security Models

**Validator Bonding:** Validators stake capital (e.g., 32 ETH on Ethereum) which acts as collateral. Misbehavior leads to slashing. This makes attacks economically irrational — the cost of attacking exceeds potential gain.

```
Security Budget = Total Staked × Slashing Penalty Rate
Attack Cost = Security Budget × Byzantine Threshold
```

**Slashing Conditions (Ethereum):**
1. Double signing (proposing two blocks at same slot)
2. Surrounding votes (attesting such that one attestation surrounds another)
3. Equivocation (conflicting messages in consensus)

**Griefing Factors:** Measures the ratio of attacker loss to protocol loss. A high griefing factor means the attacker must lose more than they inflict on the network.

```
Griefing Factor = Protocol's Loss / Attacker's Loss
High griefing (>1): attacker hurts themselves more than the network
Low griefing (<1): attacker efficiently damages the network
```

## Game Theory

**Grim Trigger:** A single defection triggers permanent punishment. Applied in slashing — once a validator equivocates, their entire stake is slashed and they're ejected. Deters one-time attacks by making the cost total.

**Tit-for-Tat:** Reciprocate the opponent's previous action. In consensus, validators who see others following the protocol follow it; validators who see equivocation report it. Prevents retaliation spirals by cooperating first.

**Nash Equilibrium in Consensus:** A state where no validator can unilaterally improve their outcome by deviating. Honest validation is a Nash equilibrium when:
- Slashing penalties > rewards from attacking
- The discount rate is sufficiently low
- Other validators are expected to follow the protocol

```
Honest Revenue = Rewards − Operating Costs
Attack Revenue = MEV extraction − (Slashing Risk × Stake)
Nash Condition: Honest Revenue > Attack Revenue
```

## MEV Distribution

**Lido:** Liquid staking protocol. MEV rewards from Lido validators are pooled and distributed to stakers. Currently ~30% of ETH staked. Centralization concern due to dominant market share.

**Flashbots MEV-Share:** A protocol where users share their transaction order flow with searchers in exchange for a cut of the MEV. The user sets a reserve price; searchers bid for order flow inclusion. Revenues flow back to users instead of validators.

```
User submits tx → MEV-Share → encrypts with searcher
Searcher bids on tx inclusion
If bid > reserve, tx included + user gets rebate
```

**SUAVE (Single Unified Auction for Value Expression):** Flashbots' decentralized builder platform. SUAVE is a specialized chain for MEV:
- Searchers submit intents (what they want to execute)
- SUAVE chain runs privacy-preserving auctions
- Winners execute on any connected chain (Ethereum, L2s, other L1s)
- Decentralized block building removes relay trust

```
┌──────────┐     ┌──────────┐     ┌──────────┐
│ Searcher │     │ Searcher │     │ Searcher │
└─────┬────┘     └─────┬────┘     └─────┬────┘
      │                │                │
      └────────────────┬────────────────┘
                       │
               ┌───────▼────────┐
               │  SUAVE Chain   │
               │  (Private bids)│
               └───────┬────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
     Ethereum       Optimism    Arbitrum
```

## References

- Daian, P. et al. "Flash Boys 2.0: Frontrunning, Transaction Reordering, and Consensus Instability in Decentralized Exchanges." 2019.
- "MEV-Boost: Merge-ready Flashbots Architecture." Flashbots, 2022.
- "ePBS: Enshrined Proposer-Builder Separation." Ethereum Research, 2023.
- "SUAVE: An Alternative to Current MEV Markets." Flashbots, 2023.
- Buterin, V. "Inclusion Lists and FOCIL." Ethereum Research, 2024.
- "MEV-Share: User-Centric MEV Distribution." Flashbots, 2023.
