# On-Chain Randomness and Commit-Reveal Patterns

Blockchains are deterministic, so "randomness" must come from somewhere that participants cannot predict or bias. This reference compares randomness sources and shows commit-reveal and VRF patterns for lotteries, NFT reveals, games and fair ordering.

## Why Naive Sources Fail

| Source | Problem |
|--------|---------|
| `block.timestamp` | Known before inclusion; proposers have some control |
| `blockhash(block.number - 1)` | Public once the block exists; anyone can compute outcome before acting; only last 256 blocks available |
| `block.prevrandao` (post-Merge) | RANDAO output; a proposer can bias by withholding a block (losing the reward); value known one block ahead |
| `keccak256(msg.sender, nonce)` | Fully predictable to the caller |

Attack shape: a contract checks the outcome inside the same transaction and reverts if it loses, retrying until it wins. Any randomness readable in the same transaction as the bet is exploitable.

## Option Matrix

| Approach | Trust | Latency | Cost | Fit |
|----------|-------|---------|------|-----|
| Commit-reveal (users) | Participants; last revealer can withhold | 2+ tx rounds | Low | Small games, sealed bids |
| Commit-reveal + future `prevrandao` | Proposer bias is limited but non-zero | Few blocks | Low | Low-value outcomes |
| Chainlink VRF v2.5 | Oracle network + on-chain proof verification | 1 callback | LINK or native fee | Lotteries, NFT traits, games |
| Drand / threshold beacons | Beacon network | Beacon period | Low | Off-chain or bridged use |
| Pyth Entropy, other oracle RNGs | Provider + commitment scheme | 1 callback | Fee | Alternatives to VRF |

## Commit-Reveal

Phase 1: participants submit `commitment = keccak256(abi.encode(value, salt, msg.sender))`.
Phase 2: after the commit deadline, they reveal `value` and `salt`; the contract checks the hash.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract SealedBid {
    struct Commit { bytes32 hash; uint64 committedAt; bool revealed; }

    mapping(address => Commit) public commits;
    uint64 public immutable commitEnd;
    uint64 public immutable revealEnd;
    uint256 public constant DEPOSIT = 0.1 ether;

    error WrongPhase();
    error BadReveal();

    constructor(uint64 commitDuration, uint64 revealDuration) {
        commitEnd = uint64(block.timestamp) + commitDuration;
        revealEnd = commitEnd + revealDuration;
    }

    function commit(bytes32 hash) external payable {
        if (block.timestamp >= commitEnd || msg.value != DEPOSIT) revert WrongPhase();
        commits[msg.sender] = Commit(hash, uint64(block.timestamp), false);
    }

    function reveal(uint256 bid, bytes32 salt) external {
        if (block.timestamp < commitEnd || block.timestamp >= revealEnd) revert WrongPhase();
        Commit storage c = commits[msg.sender];
        if (c.revealed || keccak256(abi.encode(bid, salt, msg.sender)) != c.hash) revert BadReveal();
        c.revealed = true;
        _recordBid(msg.sender, bid);
        // deposit returned on reveal; unrevealed deposits forfeited
    }

    function _recordBid(address bidder, uint256 bid) internal { /* track highest */ }
}
```

Design rules:
- Include `msg.sender` in the commitment so others cannot copy a commitment and reveal.
- Use a high-entropy `salt` (32 random bytes generated client-side with a CSPRNG).
- Require a deposit and forfeit it on non-reveal; otherwise the last revealer can withhold to influence the result.
- Use `abi.encode`, not `abi.encodePacked`, to avoid ambiguous encodings.

## Chainlink VRF v2.5 Consumer

```solidity
import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

contract Raffle is VRFConsumerBaseV2Plus {
    uint256 public immutable subId;
    bytes32 public immutable keyHash;
    mapping(uint256 => uint256) public requestToRound;

    constructor(address coordinator, uint256 subId_, bytes32 keyHash_) VRFConsumerBaseV2Plus(coordinator) {
        subId = subId_; keyHash = keyHash_;
    }

    function drawWinner(uint256 round) external onlyOwner {
        uint256 requestId = s_vrfCoordinator.requestRandomWords(VRFV2PlusClient.RandomWordsRequest({
            keyHash: keyHash,
            subId: subId,
            requestConfirmations: 3,
            callbackGasLimit: 200_000,
            numWords: 1,
            extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: false}))
        }));
        requestToRound[requestId] = round;
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata words) internal override {
        uint256 round = requestToRound[requestId];
        _settle(round, words[0]);   // keep cheap; must not revert
    }

    function _settle(uint256 round, uint256 rnd) internal { /* pick winner = rnd % entrants */ }
}
```

Check the Chainlink docs for the coordinator address and key hashes per network; parameters differ by chain.

VRF consumer rules:
- Freeze inputs (entrant list) before requesting; do not let users act between request and fulfillment in ways that depend on the result.
- `fulfillRandomWords` must not revert and should stay within `callbackGasLimit`; do heavy work in a later transaction.
- Do not re-request or cancel based on the outcome.
- Derive multiple values with `uint256(keccak256(abi.encode(word, i)))` rather than requesting many words.

## Modulo Bias

`rnd % n` is biased when `2^256` is not a multiple of `n`; with a 256-bit word and small `n` the bias is negligible. For exact uniformity use rejection sampling.

## NFT Reveal Pattern

1. Mint with hidden metadata and a committed `provenanceHash` of the final ordered metadata.
2. After mint-out, request one VRF word and compute `startingIndex = word % supply`.
3. Token `i` maps to metadata `(i + startingIndex) % supply`.

## Pitfalls

- Using `prevrandao` for high-value outcomes.
- Allowing the caller to observe the outcome and revert in the same transaction.
- Commit without deposit (selective reveal attack).
- VRF callback that reverts, leaving the round stuck.
- Hard-coding coordinator addresses copied from another network.

## Checklist

- [ ] Randomness source matched to value at stake
- [ ] Outcome not observable in the same transaction as the bet
- [ ] Commitments bind sender, use salt, require deposit
- [ ] VRF callback minimal, non-reverting, with request-to-context mapping
- [ ] Inputs frozen between request and fulfillment
