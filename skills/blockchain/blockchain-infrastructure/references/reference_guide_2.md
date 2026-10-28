# Ethereum Validator Operations and Slashing Protection

Operating proof-of-stake validators safely: validator client setup, remote signing, slashing protection, migration between machines, MEV-Boost, and withdrawals. Key custody hardware (HSM, MPC) is covered in `kms-hsm.md`.

## Components

| Component | Role |
|-----------|------|
| Beacon node (CL) | Follows the chain, serves duties to the validator client |
| Validator client (VC) | Holds or reaches signing keys, signs attestations and blocks |
| Remote signer (optional) | Holds keys separately and enforces slashing protection (e.g. Web3Signer) |
| MEV-Boost (optional) | Sidecar that sources blocks from external builders via relays |
| Execution client | Required by the beacon node to build and validate payloads |

## Slashable Offences

| Offence | Cause in practice |
|---------|-------------------|
| Double proposal | Same key proposing two different blocks for one slot |
| Double vote | Two different attestations for the same target epoch |
| Surround vote | Attestation that surrounds or is surrounded by a previous one |

Nearly all real slashings come from running the same keys in two places at once (failover scripts, migrations, copy-paste of keystores). Missed duties only lose small rewards; slashing loses stake and forces exit.

**Rule: downtime is cheap, double-signing is expensive. Never automate failover that can start a second instance of the same keys.**

## Slashing Protection Database

Every VC keeps a local database of what it signed. EIP-3076 defines a JSON interchange format to move this history between clients or machines.

```bash
# Lighthouse: export before migration
lighthouse account validator slashing-protection export /backup/slashing.json --network mainnet

# Lighthouse: import on the new machine before starting
lighthouse account validator slashing-protection import /backup/slashing.json --network mainnet
```

Other clients (Teku, Prysm, Nimbus, Lodestar) provide equivalent export/import commands; the file format is interoperable.

## Safe Migration Procedure

1. Stop the old validator client and **disable its service** (so a reboot does not restart it).
2. Confirm on a block explorer or beacon API that the validators missed at least one or two epochs of attestations.
3. Export the slashing protection data from the old VC.
4. Remove or move the keystores off the old host.
5. Import keystores and slashing protection data on the new host.
6. Start the new VC, ideally with doppelganger protection enabled.

Doppelganger protection makes the VC listen for a couple of epochs for attestations from its keys before signing; if it sees them, it refuses to start signing. Lighthouse: `--enable-doppelganger-protection`; Teku: `--doppelganger-detection-enabled`; Prysm and Nimbus have equivalents.

## Remote Signing with Web3Signer

```
Validator client ──HTTP (eth2 signing API)──► Web3Signer ──► keystores / Vault / AWS KMS / HSM
                                                   │
                                          PostgreSQL slashing DB
```

```bash
web3signer \
  --key-store-path=/keys \
  --http-listen-host=0.0.0.0 --http-listen-port=9000 \
  --http-host-allowlist=vc.internal \
  eth2 \
  --network=mainnet \
  --slashing-protection-db-url=jdbc:postgresql://db:5432/web3signer \
  --slashing-protection-db-username=web3signer \
  --slashing-protection-db-password-file=/secrets/dbpass
```

- Multiple VCs may point to one Web3Signer because protection is enforced centrally in PostgreSQL, but do not run multiple Web3Signer instances with separate databases for the same keys.
- Protect the signer endpoint with mTLS and network policy; anyone who can call it can request signatures.

## Fee Recipient and MEV-Boost

```bash
mev-boost -mainnet -relay-check \
  -relays https://<relay-1>,https://<relay-2>
```

```bash
lighthouse bn ... --builder http://127.0.0.1:18550
lighthouse vc ... --suggested-fee-recipient 0xYourFeeRecipient
```

Check your client version's docs for how builder proposals are enabled on the validator client (flag names have changed across releases).

- Choose relays deliberately (censorship policy, reliability); relays are trusted to release payloads.
- The beacon node falls back to local block building if builders fail or the bid is invalid; keep the EL healthy for that fallback.
- Set the fee recipient explicitly per validator; a missing value can send priority fees to an unintended address.

## Withdrawal Credentials (post-Pectra)

| Prefix | Meaning |
|--------|---------|
| `0x00` | BLS withdrawal key; must be changed to an execution address to withdraw |
| `0x01` | Execution address; balances above 32 ETH are swept automatically |
| `0x02` | Compounding (EIP-7251, Pectra 2025); effective balance up to 2048 ETH, rewards compound |

- Pectra also added execution-layer triggerable exits (EIP-7002), letting the withdrawal address initiate an exit.
- Consolidating validators into `0x02` reduces operational overhead but concentrates risk per key; review slashing penalty implications before consolidating.
- The withdrawal address cannot be changed once set; verify it with multiple people.

## Key Handling

- Generate validator keys offline (`ethstaker-deposit-cli` or the staking-deposit-cli) on an air-gapped machine; back up the mnemonic offline in multiple locations.
- Keystores are encrypted (EIP-2335); store passwords separately from keystores.
- The mnemonic controls withdrawal credentials for `0x00` keys; treat it as the most sensitive secret.
- Validate deposit data against the official launchpad checks before depositing.

## Monitoring

- Attestation effectiveness, missed attestations, missed proposals, sync committee participation.
- Beacon node peer count and sync state; EL sync state.
- Alert on: VC not connected to BN, attestations missed for 2+ epochs, client version behind latest release before a fork.
- Watch for slashing events on your indices via the beacon API events stream.

## Pitfalls

- High-availability setups that run two VCs "just in case" → slashing.
- Restoring a VM snapshot of an old VC without its newer slashing DB.
- Clock drift; run NTP/chrony — duties are slot-timed.
- Using a single relay or a relay with poor uptime, then missing proposals.

## Checklist

- [ ] Exactly one active signer per key, enforced by process and tooling
- [ ] Slashing protection exported/imported on every migration
- [ ] Doppelganger protection enabled on restarts and migrations
- [ ] Remote signer (if used) with central PostgreSQL protection and restricted access
- [ ] Fee recipient set per validator; MEV relays reviewed
- [ ] Withdrawal credentials verified (`0x01`/`0x02`)
- [ ] Mnemonic backed up offline; keystore passwords stored separately
