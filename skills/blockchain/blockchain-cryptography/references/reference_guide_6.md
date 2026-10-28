# Verifiable Randomness: VRFs, RANDAO and Randomness Beacons

Blockchains are deterministic, so any randomness a contract reads from chain state can be predicted or influenced by someone (validators, sequencers, or users who simulate the transaction). This reference covers why naive on-chain randomness fails, how verifiable random functions (VRFs) and beacons work, and how to integrate them safely.

## Why `block.timestamp` and Blockhash Are Not Random

| Source | Who can influence or predict it |
|--------|--------------------------------|
| `block.timestamp` | Block proposer, within protocol limits |
| `blockhash(n)` | Proposer can withhold a block; only last 256 blocks available, zero otherwise |
| `block.prevrandao` (post-Merge) | Proposer can bias by one bit per slot by choosing to miss a slot; value of the next slot is known one block ahead |
| `keccak256(msg.sender, nonce)` | Fully predictable to the caller |
| Same-transaction evaluation | Caller can revert if the outcome is unfavorable (simulate-and-revert) |

Any lottery that settles in the same transaction as the bet is exploitable by a contract that calls it and reverts on a loss.

## Verifiable Random Functions

A VRF is a keyed function that outputs a pseudorandom value plus a proof that the value was computed correctly with a known public key:

```text
(output, proof) = VRF_prove(sk, alpha)
VRF_verify(pk, alpha, proof) -> output or INVALID
```

Properties (RFC 9381, ECVRF):
- **Uniqueness**: for a given `pk` and input `alpha`, only one output verifies; the key holder cannot choose among outputs.
- **Pseudorandomness**: without `sk`, the output is indistinguishable from random.
- **Verifiability**: anyone with `pk` can check the proof.

The key holder still learns the output first and could refuse to publish it (withholding). Systems mitigate this with economic penalties, multiple oracles, or by fixing `alpha` to a value the key holder could not anticipate when committing.

Uses beyond dApp randomness: leader election in Algorand and Cardano (Ouroboros Praos), private lottery-based committee selection.

## Chainlink VRF Request-Fulfill Pattern

The contract requests randomness, and an oracle fulfills in a later transaction with a proof verified on-chain by the coordinator.

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {VRFConsumerBaseV2Plus} from "@chainlink/contracts/src/v0.8/vrf/dev/VRFConsumerBaseV2Plus.sol";
import {VRFV2PlusClient} from "@chainlink/contracts/src/v0.8/vrf/dev/libraries/VRFV2PlusClient.sol";

contract Raffle is VRFConsumerBaseV2Plus {
    bytes32 public immutable keyHash;
    uint256 public immutable subId;
    mapping(uint256 => uint256) public roundOfRequest;
    uint256 public currentRound;
    bool public drawing;

    constructor(address coordinator, bytes32 _keyHash, uint256 _subId)
        VRFConsumerBaseV2Plus(coordinator)
    {
        keyHash = _keyHash;
        subId = _subId;
    }

    function draw() external onlyOwner {
        require(!drawing, "draw pending");
        drawing = true;                      // freeze entries before randomness exists
        uint256 requestId = s_vrfCoordinator.requestRandomWords(
            VRFV2PlusClient.RandomWordsRequest({
                keyHash: keyHash,
                subId: subId,
                requestConfirmations: 3,
                callbackGasLimit: 200_000,
                numWords: 1,
                extraArgs: VRFV2PlusClient._argsToBytes(VRFV2PlusClient.ExtraArgsV1({nativePayment: false}))
            })
        );
        roundOfRequest[requestId] = currentRound;
    }

    function fulfillRandomWords(uint256 requestId, uint256[] calldata randomWords) internal override {
        uint256 round = roundOfRequest[requestId];
        // pick winner = entries[round][randomWords[0] % entries.length]; keep this callback cheap
        drawing = false;
        currentRound = round + 1;
    }
}
```

Check the current Chainlink documentation for the coordinator address, key hash and package paths for your network; they differ by chain and by VRF version.

Integration rules:
- **Freeze inputs before requesting**: no entries, bets or parameter changes after the request, otherwise participants react to pending randomness.
- **Never revert in the fulfillment callback**: if it reverts the coordinator will not retry; store the word and process it in a separate transaction if logic is heavy.
- **Match request IDs** to the state they belong to.
- **Request confirmations**: more confirmations reduce reorg risk on chains where reorgs are common.
- **Derive multiple values** from one word with `uint256(keccak256(abi.encode(word, i)))` instead of requesting many words when that is sufficient.
- Use `% n` only when `n` is far smaller than `2^256`; modulo bias is negligible then.

## RANDAO (Ethereum Consensus)

Each proposer reveals a BLS signature over the epoch number; the RANDAO mix is updated by XOR with the hash of that reveal. Contracts access the mix of the previous block via `block.prevrandao` (EIP-4399).

- Cheap and native, but biasable: the last proposer(s) before a lookahead point can choose between revealing or skipping (losing rewards), giving one bit of influence each.
- Predictable shortly in advance: the value for block N+1 is known by the time block N is produced.
- Acceptable for low-value uses where a bias of a few bits and short-term predictability do not matter; use future-block commitments (commit now, use the `prevrandao` of a block several epochs ahead) to reduce predictability.

## drand and Threshold Randomness Beacons

drand (League of Entropy) publishes rounds of randomness produced by threshold BLS signatures over the round number:

```text
randomness_round = SHA256(BLS_threshold_signature(round))
```

- Unbiasable and unpredictable as long as fewer than the threshold of nodes collude.
- Publicly verifiable with the group public key; each round is produced at a fixed period.
- Supports timelock encryption: encrypt to a future round so data can be decrypted only once that round's signature exists.
- On-chain use requires verifying a BLS signature (BLS12-381 precompiles from EIP-2537 make this practical on EVM chains that support them) or trusting a relayer.

## Commit-Reveal Among Participants

```text
1. Each participant i commits c_i = H(r_i || salt_i || context)
2. After all commits, each reveals r_i, salt_i
3. result = H(r_1 || r_2 || ... || r_n)
```

The last revealer can see the others and choose not to reveal (one-bit bias). Mitigate with slashed deposits for non-revealers, VDF delays (verifiable delay functions make the result unknowable until after the reveal deadline), or a beacon as a fallback.

## Selecting a Source

| Requirement | Source |
|-------------|--------|
| High-value outcomes (NFT rarity, lotteries, game loot) | VRF oracle with request-fulfill pattern, or drand with on-chain verification |
| Low-value, tolerant of slight bias | `block.prevrandao` of a future block |
| Participants must jointly generate | Commit-reveal with penalties, optionally VDF |
| Validator / leader election | Protocol VRF or threshold beacon |
| Unpredictable until a future time | drand timelock or VDF |

## Checklist

- [ ] No randomness from timestamp, blockhash or caller-controlled data for value-bearing outcomes
- [ ] Outcome resolved in a later transaction than the user's action
- [ ] Inputs frozen before randomness is requested
- [ ] Fulfillment callbacks never revert and stay within gas limits
- [ ] Request IDs mapped to state; replays rejected
- [ ] Withholding and last-revealer bias addressed by design
