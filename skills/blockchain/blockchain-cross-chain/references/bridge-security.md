# Bridge Security

## Bridge Attack Taxonomy

### Major Exploits

| Bridge | Date | Loss | Root Cause |
|--------|------|------|------------|
| Wormhole | Feb 2022 | $326M | Solana contract bug — `ExecuteInstruction` did not properly validate the emitter address, allowing a fake VAA to be minted without Guardian approval. |
| Ronin | Mar 2022 | $625M | Private key compromise — 5 of 9 validator keys were stolen via social engineering of Axie DAO's Sky Mavis validator. |
| Nomad | Aug 2022 | $190M | Implementation bug — the `process` function's `_trusted_root` was initialized to `0x0`, making all messages pass verification. Automated MEV bots drained the bridge. |
| Harmony Horizon | Jun 2022 | $100M | Private key compromise — 2 of 5 multisig keys were stolen, enabling the attacker to initiate malicious withdrawals. |
| Multichain | Jul 2023 | $126M | Unclear — contract upgrades or private key compromise of the MPC address. Centralised MPC infrastructure failed. |
| BNB Bridge | Oct 2022 | $570M | IAVL tree proof verification bug in BSC's Tendermint light client — an empty proof could pass validation, allowing the attacker to mint 2M BNB. (Mostly recovered.) |
| Poly Network | Aug 2021 | $611M | Contract logic bug — `putCurEpochConPubKeyBytes` allowed overwriting the keeper set. (Funds returned.) |
| Qubit Finance | Jan 2022 | $80M | Incorrect token bridge logic — the deposit function did not validate that the sender had deposited ETH on the source chain. |

### Attack Vectors

1. **Private Key Compromise** (Ronin, Harmony, Multichain)
   - Attackers obtain validator/multisig keys through social engineering, phishing, or exploiting hot wallet infrastructure.
   - **Mitigation**: threshold signatures (t-of-n), hardware security modules (HSM), decentralized key rotation, robust key management policy.

2. **Smart Contract Bugs** (Wormhole, Nomad, Poly Network, Qubit)
   - Missing or incorrect validation of proofs, signatures, or state transitions.
   - **Mitigation**: extensive auditing, formal verification, fuzzing, invariant testing, bug bounties.

3. **Light Client / Consensus Bugs** (BNB Bridge)
   - Forged proofs that exploit vulnerabilities in the verification logic (e.g., empty Merkle proofs, incorrect hash computation).
   - **Mitigation**: independent verification implementations, differential fuzzing against known-good implementations.

4. **Economic Attacks** — Sandwich attacks on bridge swaps, MEV extraction from bridge transactions, oracle manipulation affecting bridge pricing.
   - **Mitigation**: rate limits, slippage protection, oracle diversification.

5. **Governance Attacks** — Attacker obtains governance control and upgrades bridge contracts to malicious implementations.
   - **Mitigation**: timelocks, multi-sig governance, veto mechanisms, immutable core contracts.

6. **Reorg Attacks** — Transaction reorg on the source chain after the destination chain has already processed the bridge message.
   - **Mitigation**: wait for finality (probabilistic), use reorg-resistant light clients, store source block confirmations as a parameter.

## Trust Model Spectrum

### External Validator / Oracle Bridges

- **Trust model**: N parties must attest to the message (validators, guardians, oracle + relayer).
- **Examples**: LayerZero, Wormhole, Axelar, Multichain.
- **Security**: depends on the honesty and security of the validator set. Slashing can align economic incentives.
- **Risk**: validator collusion, key compromise, governance attacks.

### Light Client Bridges

- **Trust model**: the bridge inherits the consensus security of the source chain. No external party can forge messages.
- **Examples**: IBC (Tendermint), Bridge of Worlds (ETH→Solana).
- **Security**: provably secure if the light client implementation is correct and the source chain's consensus is sound.
- **Risk**: implementation bugs in the light client, source chain consensus failure (unlikely for major chains).

### Optimistic Bridges

- **Trust model**: messages are assumed valid unless challenged during a dispute window.
- **Examples**: Nomad, Across (optimistic oracle).
- **Security**: requires at least one honest watcher to challenge invalid messages.
- **Risk**: if no watcher is active during the dispute window, an invalid message can pass. Economic security depends on bond sizes.

### ZK Bridges

- **Trust model**: validity proofs (zk-SNARKs/STARKs) cryptographically prove the correctness of a state transition.
- **Examples**: Succinct, zkBridge, Electron Labs.
- **Security**: as strong as the proof system and the circuit implementation.
- **Risk**: proving system bugs, trusted setup (for some SNARKs), high proving latency and cost.
- **Status**: rapidly improving; proving times are dropping from hours to minutes.

### Comparison

| Type | Trust Assumption | Security | Latency | Cost | Composability |
|------|-----------------|----------|---------|------|---------------|
| External Validator | Validator set honesty | Medium-High | Low-Medium | Medium | High |
| Light Client | Source chain consensus | High | Medium-High | High | Low-Medium |
| Optimistic | >= 1 honest watcher | Medium | High (window) | Low | Medium |
| ZK | Proof system soundness | Highest | Medium-High | High (proving) | Low-Medium |

## Watchtower Networks

- A **watchtower** is an off-chain service that monitors bridge operations and raises alerts on suspicious activity.
- Services: Eagle Eye (LayerZero DVN), Succinct's Warp, Nethermind's Watcher.
- Watchtowers can **block** execution (via ARM/DVN mechanisms) or simply emit alerts for manual review.
- For bridges without on-chain veto (e.g., Wormhole), watchtowers are limited to off-chain alerting.

## Security Checklist for Bridge Design

### 1. State Verification
- [ ] Are proofs verified on the destination chain?
- [ ] Are Merkle proofs constructed correctly (inclusion, non-inclusion)?
- [ ] Are the proof checking functions tested against invalid proofs?
- [ ] Is there a maximum proof size to prevent gas griefing?
- [ ] Are timestamps and block heights validated against a trusted source?

### 2. Signature Verification
- [ ] Are signatures verified against the correct public key set?
- [ ] Is the public key set updateable? How is it governed?
- [ ] Is signature replay protected (nonces, chain IDs, sequence numbers)?
- [ ] Are threshold signature schemes correctly implemented?
- [ ] Are revoked keys removed from the active set?

### 3. Token Handling
- [ ] Are native tokens (ETH, SOL) handled correctly — not just ERC-20/BEP-20?
- [ ] Is fee-on-transfer / rebasing token logic accounted for?
- [ ] Are tokens correctly escrowed (lock/unlock vs burn/mint)?
- [ ] Is there a cap on total minted supply for wrapped tokens?
- [ ] Are token mismatches prevented (USDC mapped to fake on destination)?

### 4. Finality
- [ ] Do you require sufficient confirmations before processing?
- [ ] Does the chain use probabilistic finality (ETH, Polygon)?
- [ ] Are reorgs handled (timeout, refutation)?
- [ ] Is the minimum confirmation count tested against real reorg data?

### 5. Failure Recovery
- [ ] Is there an emergency pause mechanism? Who controls it?
- [ ] Can stuck messages be manually executed?
- [ ] Can a channel/lane be re-opened after timeout?
- [ ] Are funds recoverable if the destination contract is paused?

### 6. Economics
- [ ] Are rate limits in place per token per time window?
- [ ] Is there a maximum total value locked (TVL) cap?
- [ ] Are relayer/gas fees prepaid or reimbursed?
- [ ] Is there a griefing attack prevention mechanism?

### 7. Governance & Upgrades
- [ ] Who can upgrade the bridge contracts?
- [ ] Is there a timelock on upgrades?
- [ ] Are upgrades transparent (immutable core, proxy pattern)?
- [ ] Can governance be hijacked (flash loan attack on governance token)?
