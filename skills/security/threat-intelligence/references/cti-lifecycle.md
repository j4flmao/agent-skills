# Threat Intelligence Lifecycle

## Phases
1. **Planning & Direction** — Define intelligence requirements (tiers, sectors, actors)
2. **Collection** — Gather data from feeds, OSINT, closed sources, internal telemetry
3. **Processing** — Normalize, deduplicate, enrich, score
4. **Analysis** — Extract IoCs, map TTPs, assess relevance and confidence
5. **Dissemination** — Publish to SIEM, SOAR, analysts, stakeholders
6. **Feedback** — Refine requirements based on gaps and effectiveness

## Intelligence Tiers

| Tier | Audience | Timeframe | Example |
|------|----------|-----------|---------|
| Strategic | Executives, CISO | Quarterly | Threat landscape report, industry trends |
| Operational | SOC Manager, Threat Hunters | Weekly | Campaign analysis, actor TTP changes |
| Tactical | SOC Analysts, Engineers | Daily | IoCs, detection rules, adversary bulletins |
| Technical | Detection Engineers | Real-time | Indicators, YARA rules, Sigma rules |

## MITRE ATT&CK Mapping

### Key Tactics (Enterprise)
| Tactic | ID | Description |
|--------|----|-------------|
| Initial Access | TA0001 | Entry vector (phishing, exploit, valid accounts) |
| Execution | TA0002 | Run malicious code (PowerShell, script, scheduled task) |
| Persistence | TA0003 | Maintain access (registry, service, startup) |
| Privilege Escalation | TA0004 | Gain higher permissions (UAC bypass, token theft) |
| Defense Evasion | TA0005 | Avoid detection (process hollowing, obfuscation) |
| Credential Access | TA0006 | Steal credentials (LSASS, keylogging, Kerberoasting) |
| Discovery | TA0007 | Recon internal environment (net commands, AD queries) |
| Lateral Movement | TA0008 | Move between hosts (RDP, SMB, WinRM) |
| Collection | TA0009 | Gather data (clipboard, screenshot, archive) |
| Command & Control | TA0011 | C2 communication (HTTP, DNS, custom protocol) |
| Exfiltration | TA0010 | Steal data (compress, encrypt, upload) |
| Impact | TA0040 | Disrupt availability (ransomware, wiper, DDoS) |

### Confidence Scoring
| Score | Label | Description |
|-------|-------|-------------|
| 80-100 | High | Confirmed by multiple sources, internally validated |
| 50-79 | Medium | Single source, but credible; some validation |
| 20-49 | Low | Unverified, single OSINT source |
| 0-19 | None | Rumors, unconfirmed reports, no evidence |
