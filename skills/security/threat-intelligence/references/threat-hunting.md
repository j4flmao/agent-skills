# Threat Hunting

## Hunt Methodology

### Hypothesis-Driven Hunting
1. **Formulate Hypothesis** — Based on threat intel, new TTP, or gap analysis
2. **Collect Data** — Identify data sources, time range, scope
3. **Apply Techniques** — Use analytics, statistical baselines, pattern matching
4. **Analyze Results** — Review findings, confirm or refute hypothesis
5. **Document** — Record methodology, findings, and IoCs

### Common Hunt Hypotheses

| Hypothesis | Data Sources | Technique |
|------------|-------------|-----------|
| "Lateral movement via RDP from non-admin workstations" | Windows Event 4624/4625, RDP logs | Logon type 10, source/dest mapping |
| "PowerShell executed without logging enabled" | Event 4104, 4103 | Filter for script block logging disabled |
| "DNS queries to known DGA domains" | DNS logs | Entropy analysis, NXDOMAIN ratio |
| "Process running from user profile directories" | Sysmon Event 1 | Filter on Image path anomalies |
| "Scheduled tasks created by non-admin users" | Event 4698, Sysmon 13 | User vs group policy SID validation |

### Pyramid of Pain
```
                    TTPs (Hardest)
                  Tools
                Network/Host Artifacts
              Domain Names
            IP Addresses
          Hash Values (Easiest)
```

## Hunting Cadence
- **Daily**: Alert triage, known IoC sweep (30 min)
- **Weekly**: Hypothesis-driven hunt (2 hours)
- **Monthly**: TTP gap analysis, detection coverage review (4 hours)
- **Quarterly**: Full purple team exercise (1-2 days)

## Tools
| Tool | Purpose | Notes |
|------|---------|-------|
| EDR | Endpoint telemetry, process tree | CrowdStrike Falcon, Defender |
| SIEM | Correlate across data sources | Splunk, Elastic |
| Threat Intel Platform | IoC/TTP enrichment | MISP, ThreatConnect |
| Network Analysis | PCAP, flow logs | Zeek, Wireshark |
| Sandbox | File/URL analysis | Any.Run, Joe Sandbox |
| YARA/Sigma | Custom detection rules | Open-source rule format |
