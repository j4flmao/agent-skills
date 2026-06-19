# Threat Intelligence Fundamentals

## Overview
Threat intelligence is evidence-based knowledge about existing or emerging threats to an organization. It enables proactive defense by informing security decisions with adversary context — who is targeting you, what methods they use, and how to detect and prevent their attacks.

## Core Concepts

### Concept 1: Intelligence Types by Audience
| Type | Audience | Purpose | Timeframe |
|------|----------|---------|-----------|
| **Strategic** | Executives, CISO | High-level trends, risk posture, business impact | Months-years |
| **Operational** | SOC managers, IR team | Incoming campaigns, threat actor TTPs | Weeks-months |
| **Tactical** | SOC analysts | IOCs, detection rules, adversary behaviors | Days-weeks |
| **Technical** | Detection engineers | Specific technical indicators (IPs, hashes, domains) | Hours-days |

### Concept 2: The Intelligence Cycle
1. **Requirements**: Define what intelligence is needed (Priority Intelligence Requirements)
2. **Collection**: Gather data from open-source, commercial, government, and internal sources
3. **Processing**: Normalize, deduplicate, and enrich raw data
4. **Analysis**: Interpret processed data to produce actionable intelligence
5. **Dissemination**: Deliver intelligence to stakeholders in appropriate format
6. **Feedback**: Evaluate intelligence effectiveness and refine requirements

### Concept 3: IoCs vs TTPs
- **IoC (Indicator of Compromise)**: Specific artifacts indicating compromise (IP address, file hash, domain)
  - Low confidence without context
  - Short shelf life (hours-days)
  - Easy to automate detection
  
- **TTP (Tactics, Techniques, Procedures)**: Behavioral descriptions of adversary actions
  - High confidence, hard to evade
  - Long shelf life (months-years)
  - Requires skilled analysis to implement

### Concept 4: Threat Intelligence Sources
- **OSINT (Open Source)**: Public reports, blogs, Twitter, Telegram, Shodan, Censys
- **Commercial**: Recorded Future, Mandiant, CrowdStrike, Anomali, ThreatConnect
- **ISACs/ISAOs**: Sector-specific sharing (FS-ISAC for financial, H-ISAC for healthcare)
- **Government**: CISA, FBI Flash, NCSC, CERT-EU
- **Internal**: Historical incident data, SIEM data, EDR telemetry

## Implementation Guide

### Step 1: TIP (Threat Intelligence Platform) Configuration
```yaml
threat_intel_pipeline:
  collection:
    osint:
      - source: "AlienVault OTX"
        type: "API"
        interval: "hourly"
        feeds:
          - "URLs"
          - "IPs"
          - "Domains"
          - "File Hashes"

      - source: "MISP"
        type: "API"
        interval: "daily"
        feeds:
          - "CIRCL"
          - "COVID-19 Cyber Threats"
          - "Ransomware Groups"

    commercial:
      - source: "Recorded Future"
        type: "API"
        interval: "real-time"
        feeds:
          - "IP Reputation"
          - "Domain Risk"
          - "Vulnerability Intelligence"

  processing:
    deduplication:
      field: "indicator_value"
      keep: "highest_severity"
    enrichment:
      - "whois"
      - "reverse_dns"
      - "geoip"
      - "palo_alto_wildfire"

  analysis:
    tagging:
      - "malware_family"
      - "campaign"
      - "actor"
      - "sector_target"
    scoring:
      model: "weighted"
      factors:
        - source_reputation: 0.3
        - age: 0.2
        - related_alerts: 0.3
        - context: 0.2
```

### Step 2: STIX/TAXII Integration
```python
# TAXII client for consuming threat intelligence
from stix2 import TAXIIClient

class IntelConsumer:
    """Consume threat intelligence via TAXII 2.1."""

    def __init__(self, taxii_url: str, api_key: str):
        self.client = TAXIIClient(
            url=taxii_url,
            user="apikey",
            password=api_key,
        )

    def get_collections(self) -> list[dict]:
        """List available collections."""
        return self.client.get_collections()

    def get_indicators(self, collection_id: str, added_after: str) -> list[dict]:
        """Get indicators added after timestamp."""
        return self.client.get_indicators(
            collection_id=collection_id,
            added_after=added_after,
        )

    def populate_siem_blocklist(self, indicators: list[dict]) -> int:
        """Add malicious IPs to firewall blocklist."""
        blocked = 0
        for ind in indicators:
            if ind.get("type") == "ipv4-addr" and ind.get("confidence", 0) >= 80:
                ip = ind["value"]
                self._block_ip(ip)
                blocked += 1
        return blocked
```

### Step 3: CTI Report Template
```markdown
# Threat Intelligence Report: [Campaign Name]

## Overview
- **Date**: [Date]
- **Triage Level**: [Critical/High/Medium/Low]
- **Affected Sector(s)**: [Target industries]
- **Attribution**: [Threat actor or group name]

## Key Findings
1. [Finding 1]
2. [Finding 2]
3. [Finding 3]

## Indicators of Compromise
| Type | Value | Confidence | First Seen |
|------|-------|------------|------------|
| IPv4 | 192.0.2.1 | High | 2026-06-01 |
| Domain | malicious[.]com | High | 2026-06-01 |
| SHA256 | abc... | Medium | 2026-06-05 |

## TTPs (MITRE ATT&CK)
- **Initial Access**: T1566 (Phishing)
- **Execution**: T1059 (Command and Scripting Interpreter)
- **Persistence**: T1136 (Create Account)
- **C2**: T1071 (Application Layer Protocol)

## Recommended Actions
1. [Action 1]
2. [Action 2]
3. [Action 3]

## Status & Next Steps
- [Current actions]
- [Pending items]
```

### Step 4: Intelligence-Driven Detection Rule
```python
# Detection rule based on threat intelligence
# APT29 (Cozy Bear) techniques: T1055.001 (DLL Injection) + T1003 (Credential Dumping)

def detect_apt29_activity():
    """Detect APT29 credential dumping pattern."""
    return correlation(
        rule_name="APT29 Credential Dumping",
        conditions=[
            # DLL injection into LSASS
            "event_id == 4688 AND process_name == 'lsass.exe' AND parent_process NOT IN (winlogon.exe, services.exe)",
            "OR",
            # Mimikatz detection
            "event_id == 4688 AND process_name IN (mimikatz.exe, procdump.exe, comsvcs.dll)",
            "OR",
            # Suspicious named pipe (PSEXESVC)
            "event_id == 5145 AND share_name == '\\PSEXESVC$'",
        ],
        mitre_id=["T1055.001", "T1003"],
        severity="CRITICAL",
        notification="Immediate isolation required",
    )
```

## Best Practices
- Align intelligence collection with Priority Intelligence Requirements (PIRs)
- Consume intelligence from multiple sources — no single source is complete
- Focus on TTPs over IoCs — IoCs expire quickly, TTPs are more durable
- Automate IOC ingestion into security tools (firewalls, SIEM, EDR)
- Produce intelligence in formats appropriate to the audience
- Measure intelligence effectiveness: how many alerts did intel generate?
- Share intelligence responsibly with ISACs and partners
- Regularly update and expire old indicators
- Correlate external intelligence with internal telemetry
- Train analysts to produce and consume intelligence

## Common Pitfalls
- Collecting intelligence without clear requirements — overwhelming data, no value
- Over-reliance on IoCs — adversaries change IoCs faster than you can block them
- No integration with security tools — intelligence sits in a platform, not in detection
- Ignoring false positives — blocking legitimate services based on stale IoCs
- Intelligence not shared with relevant teams — SOC, IR, vulnerability management
- No feedback loop — don't know if intelligence is useful or accurate
- Over-classifying intelligence unnecessarily — reduces sharing and collaboration
- Intelligence plateau — same sources, same types, no evolution
- Not prioritizing intelligence — trying to consume everything, failing at all
- Analysis paralysis — collecting but never producing actionable intelligence

## Key Points
- Threat intelligence provides context about adversaries and their methods
- Types: Strategic (executive), Operational (SOC), Tactical (analyst), Technical (IOCs)
- Intelligence cycle: Requirements → Collection → Processing → Analysis → Dissemination → Feedback
- Focus on TTPs (behaviors) more than IoCs (indicators) — TTPs are more durable
- Use PIRs to focus intelligence collection on what matters to your organization
- Automate IOC ingestion into SIEM, EDR, and firewall tools
- Share intelligence responsibly with ISAC and peer organizations
- Measure intelligence effectiveness and close the feedback loop
- Produce intelligence in formats appropriate to each audience
- Integrate multiple intelligence sources for comprehensive coverage
