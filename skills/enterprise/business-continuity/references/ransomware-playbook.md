# Ransomware Playbook

## Assumption
Attacker has admin in part of your environment. Backups in the same trust domain are compromised too.
The only safe restore source is an **immutable, offline, or air-gapped backup**.

## Pre-Incident Controls (must exist BEFORE the attack)

```
1. Immutable backups
   - Object-lock S3 (governance + compliance mode), retention 30+ days
   - Tape rotation (offline, weekly full + daily incremental)
   - Separate cloud account / vendor for backup repo (different identity domain)

2. Network segmentation
   - Backup network isolated; backup hosts not domain-joined
   - Admin tier separated from prod tier separated from corp tier

3. Privilege controls
   - No standing prod admin; JIT elevation with approval + logging
   - MFA on every privileged path (hardware key, not SMS)
   - Backup credentials rotated monthly, sealed in vault

4. Detection
   - EDR on every host (CrowdStrike, SentinelOne, Microsoft Defender)
   - Honey tokens (fake AWS access keys with CloudTrail alarms)
   - Unusual file-encryption rate alerts on file servers
   - Volume of unusual S3/storage delete operations

5. Tabletop drills
   - Quarterly ransomware tabletop with legal + comms + exec
   - Annual restore-from-immutable drill
```

## Phase 1: Detect + Contain (Hour 0–1)

```
T+0    Detection: EDR alert / mass file rename / failing services
T+5m   Declare incident; convene war room
T+10m  Isolate: network-fence affected segments (firewall block, ACL)
T+15m  Pause CI/CD (prevent attacker spreading via pipelines)
T+20m  Rotate suspect credentials from clean device
T+30m  Snapshot affected systems for forensics (do not power off)
T+45m  Engage IR retainer firm (Mandiant, CrowdStrike, etc.)
T+60m  Legal + insurer notified (insurance often requires notification ≤ 72h)
```

## Phase 2: Assess (Hour 1–6)

- What's encrypted? What's exfiltrated? Both?
- Scope: hosts, accounts, data classes affected
- Initial vector: phishing? exposed RDP? supply-chain? insider?
- Are backups intact? Test restore one critical asset from immutable repo first

## Phase 3: Decide (Hour 6–24)

```
Three options (no good ones):

A. Restore from immutable backup
   Pros: clean recovery, no payment, no legal risk
   Cons: data loss back to last clean backup, slow restore (days)

B. Decrypt with vendor / community tool (if known ransomware family)
   Pros: faster than restore, no payment
   Cons: tool may not exist; check nomoreransom.org

C. Pay ransom (LAST RESORT, may be illegal depending on actor)
   Pros: fastest if decryption keys work (~70% reliability)
   Cons: legal exposure (OFAC sanctions list), funds criminals, no guarantee,
         50% pay-and-re-attacked rate within 12 months

DO NOT pay without legal review and insurer approval.
```

## Phase 4: Recover (Day 1–30)

```
1. Build clean recovery environment (fresh accounts, fresh network, fresh creds)
2. Restore data from immutable backup to clean env
3. Forensic clean each restored system before connecting to broader network
4. Replay transactions from RPO gap (CDC log, audit log)
5. Phased return to production:
     - Tier-1 critical services first (revenue protection)
     - Read-only mode until full verification
     - Full write resume after end-to-end smoke
6. Customer comms in waves as services restored
```

## Phase 5: Post-Recovery (Day 30–90)

- Root cause analysis (full kill chain documented)
- Initial-vector remediation (patch / config / training)
- Tabletop redrill with new learnings
- Insurance claim filed with full evidence package
- Regulator notifications (GDPR 72h breach, state breach laws)
- Customer notification (per legal advice)
- Long-term: SOC maturity uplift, zero-trust migration

## Communications During Ransomware

```
DO say (public):
- "We are responding to a security incident"
- "Investigation in progress"
- "Customer data protection is our priority"
- Concrete impact when verified

DO NOT say (public):
- "Ransomware" (until confirmed and legal-approved)
- Threat actor name (helps them)
- Ransom amount
- Decryption status
- Customer count until verified
- Speculation on root cause

Internal: full transparency to crisis team; need-to-know elsewhere.
External attorneys handle regulator / law-enforcement comms.
```

## Anti-Patterns

- "We have backups, we're fine" → unless tested immutable, they're encrypted too
- Powering off infected systems → destroys forensic evidence
- Restoring without forensics → reinfection within hours
- Paying without legal review → OFAC violation, board liability
- Public comms before legal review → discovery exposure in litigation
- Skipping post-incident hardening → 60% chance of re-attack within 18 months

## Required Contacts (have these in a printed binder, not online)

- IR retainer hotline
- Cyber insurance claims line
- External legal (data + regulatory)
- Law enforcement (FBI IC3 / Interpol / local cybercrime unit)
- Key vendor security contacts (cloud provider, EDR, identity provider)
- Crisis PR firm
- Exec home phone numbers
