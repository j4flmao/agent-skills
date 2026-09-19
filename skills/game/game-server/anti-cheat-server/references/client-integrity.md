---
title: Client Integrity and Attestation
description: Attestation checks, executable integrity, module drift detection, platform attestation and optionality for privacy.
---

# Client Integrity — Deep Reference

## 1. The Premise

You can't *stop* memory hacks with server logic, but you can *raise the cost*: a client that must sign/attest costs more to modify. Every byte of attestation is a pacing mechanism, not a purity gate.

## 2. The Attestation Handshake

At join (and periodically, 30–60 s + on load):
```
server → client: challenge {seed, mode}
client → server: report {
   moduleList hash,
   exe checksum (HMAC over PE bytes),
   buildId, platformId,
   patchLevel,
}
server: compare report to the accepted manifest for buildId
        drift > tolerated → suspicious (not instant-ban)
```

The report is HMAC'd with a per-session key so a replay of another player's attestation fails.

## 3. Cross-Session Drift Detection

The most reliable signal isn't a single report — it's **drift across the fleet**:

| Signal | Meaning |
|--------|---------|
| PE checksum differs from 99.9% fleet | modified binary |
| Module list contains unknown DLL | injected |
| cmdline/dev flags present on prod | debug/dev build |
| Attestation fails at join (policy) | anomalous binary |

Store per-player `lastReportHash`; a *silent* change where it should be stable (patch-equal) = drift. Transparency: rarely bans alone; feeds the response tier (§ anti-cheat-server).

## 4. Platform Attestation (Where It Exists)

- Consoles: OS-level attestation (obligatory, strong). Detect cheaters at the platform level.
- PC: hardware-attestation (TPM/RAS) is *optional*, privacy-sensitive. Offer it as "enhanced integrity" opt-in (some titles make it required for ranked).
- Mobile: OS signing/attestation APIs are common.

Design: **make attestation layered**. A platform that can't attest still plays (casual); the strongest gates only for ranked/comp where the stakes justify it.

## 5. The Integrity Ring

- Attest on: join, patch-change, 60 s periodic, cooldown-expire.
- **Cheat-relative metric**: measure attestation *latency* + *variability*; a modified binary that answers oddly fast or slow is itself anomalous.
- Keep the checksum *cheap*: hash a slice of code pages (not the whole binary) at randomized offsets (costs high for the cheater, low for us).

## 6. Anti-Replay

- Nonce per challenge (random, single-use) — replaying an old attestation fails.
- Nonce tied to session token: an attacker can't borrow a "clean" attestation across accounts.

## 7. Privacy & Legal Care

- Only collect what's needed: PE checksums, module names, buildId — **not** arbitrary system data.
- Telmetry retention limits + the evidence being wire-data only (no keystroke/pixel harvesting).
- Document the att/test policy in the privacy policy; make opt-out = casual-only (never data-void-exploit).

## 8. Telemetry It Feeds

Same `evidence` packet for the central service: attestation results + drift flag + latency. Anomaly layer weighs integrity (low weight, passive) + behavior (high weight).

## 9. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Single checksum trusting | fleet drift + variance |
| Replayable attestation | nonce |
| Attestation = ban (rape privacy) | layered + optional + evidence |
| Check only at join | periodic |
| Over-weigh a platform quirk | normalize per-platform |

## 10. Checklist

- [ ] Attest: join + periodic + load.
- [ ] Fleet-drift detection (not single report).
- [ ] HMAC/Nonce (anti-replay).
- [ ] Layered by ranked/casual + opt-out.
- [ ] Telemetry feeds central service.
- [ ] Privacy policy covers the attest scope.