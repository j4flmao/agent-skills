---
name: threat-intelligence
description: >
  Manage threat intelligence feeds, IoC/TTP management, threat hunting, and MITRE ATT&CK mapping.
  Use when the user asks about threat intelligence, CTI, threat feed, IoC, TTP, MITRE ATT&CK, threat hunting, or intelligence lifecycle.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, threat-intel, phase-8]
---

# Threat Intelligence

## Purpose
Manage cyber threat intelligence operations including feed management, IoC/TTP handling, threat hunting, and MITRE ATT&CK mapping. Provide actionable intelligence to SIEM detection rules, SOC operations, and risk management decisions.

## Agent Protocol

### Trigger
- "threat intelligence", "CTI", "threat feed", "threat intel", "intelligence"
- "IoC", "indicator of compromise", "TTP", "MITRE ATT&CK", "attack chain"
- "threat hunting", "hunt hypothesis", "proactive hunting"
- "intelligence lifecycle", "strategic intelligence", "tactical intelligence"
- "threat actor", "campaign", "TTP mapping", "threat landscape"

### Input Context
- Industry vertical (finance, healthcare, tech, government, critical infrastructure)
- Threat model and risk assessment documentation
- Existing intelligence sources (OSINT, commercial feeds, ISACs)
- Current security tools capable of consuming intelligence (SIEM, EDR, firewall, TIP)
- SOC maturity level and threat hunting capability

### Output Artifact
Threat intelligence reports (strategic/tactical/operational), IoC lists with context, ATT&CK mappings, hunting hypotheses.

### Response Format
```
## Intelligence Summary
{Relevant threats, actors, campaigns with relevance assessment}

## IoC/TTP Details
{Indicators with context, confidence, MITRE mapping, recommended actions}

## Hunting Recommendations
{Hypotheses, data sources, queries, expected findings}
```

### Completion Criteria
- [ ] Intelligence sources identified and prioritized by relevance
- [ ] IoC management process defined (collection, validation, enrichment, distribution, retirement)
- [ ] TTP mapping to MITRE ATT&CK completed for priority threats
- [ ] Threat hunting plan with hypotheses tied to intelligence
- [ ] Intelligence sharing and feedback mechanisms established
- [ ] CTI reporting cadence and templates defined

## Architecture / Decision Trees

### Intelligence Source Selection Decision Tree

```
What is the primary intelligence need?
├── Strategic (long-term trends, threat actor motivations, risk decisions)
│   ├── Industry ISACs (FS-ISAC, Health-ISAC, IT-ISAC)
│   ├── Vendor reports (Mandiant, CrowdStrike, Recorded Future)
│   ├── Government sources (CISA, NCSC, ENISA)
│   └── Open-source intelligence reports (The DFIR Report, VX Underground)
├── Operational (upcoming attacks, campaigns, malware variants)
│   ├── Commercial feeds (Recorded Future, Anomali, ThreatConnect)
│   ├── ISAC threat intelligence feeds
│   ├── MISP sharing communities
│   └── Dark web monitoring (Flashpoint, Digital Shadows)
└── Tactical (IoCs: IPs, domains, hashes, YARA rules)
    ├── Open-source feeds (AlienVault OTX, URLhaus, PhishTank)
    ├── Commercial feeds (VirusTotal, Proofpoint ET Intelligence)
    ├── MISP (self-managed, community shared)
    └── Automated feeds via TIP platform

What is the team's CTI maturity?
├── Level 1 (Initial): No dedicated CTI → Use open-source feeds + vendor reports
├── Level 2 (Defined): Part-time CTI → Add ISAC membership + commercial feeds
├── Level 3 (Managed): Dedicated CTI analyst → Full TIP platform + dark web monitoring
├── Level 4 (Measured): CTI team → Custom intelligence production + threat actor tracking
└── Level 5 (Optimized): Intelligence-driven org → Automated intel-to-detection pipeline
```

### Intelligence Classification Decision Tree

```
Is the intelligence actionable by existing tools?
├── YES → Can it be automated?
│   ├── YES (IP block, domain sinkhole, hash detection) → Feed to SIEM/EDR/firewall
│   └── NO (requires analyst judgment) → Create CTI note, brief SOC team
└── NO → Is it strategic context?
    ├── YES → Intelligence report for leadership / risk register
    └── NO → Archive for reference, no immediate action

What is the confidence level of the intelligence?
├── HIGH (confirmed by 2+ reliable sources) → Immediate action, automated
├── MEDIUM (single reliable source or multiple moderate sources) → Review before action
└── LOW (unverified, social media, single source) → Monitor only, no action

Is the intelligence relevant to your industry/region/tech stack?
├── YES → Prioritize processing
└── NO → Archive for reference
```

## Workflow

### Step 1: Intelligence Requirements Definition

Define Priority Intelligence Requirements (PIRs) aligned to business risk:

```yaml
priority_intelligence_requirements:
  pir_01:
    question: "Which threat actors are targeting our industry (financial services) in the current quarter?"
    priority: "P1"
    source: "ISAC reports, vendor threat briefs, dark web monitoring"
    consumer: "CISO, risk management, SOC manager"
    update: "Monthly"

  pir_02:
    question: "What are the latest ransomware variants and TTPs affecting our region?"
    priority: "P1"
    source: "Ransomware tracking feeds, The DFIR Report, BleepingComputer"
    consumer: "SOC, detection engineering, incident response"
    update: "Weekly"

  pir_03:
    question: "Are there active campaigns exploiting vulnerabilities in our technology stack?"
    priority: "P2"
    source: "CISA KEV, vendor security advisories, exploit monitoring"
    consumer: "Vulnerability management, detection engineering, IT operations"
    update: "Continuous (feeds) + Weekly summary"

  pir_04:
    question: "What is the current phishing infrastructure targeting our employees?"
    priority: "P2"
    source: "PhishTank, URLhaus, email gateway telemetry"
    consumer: "SOC Tier 1 triage, email security team"
    update: "Continuous (real-time feed)"

  pir_05:
    question: "What are the emerging TTPs for cloud infrastructure attacks?"
    priority: "P3"
    source: "Cloud security research, vendor blogs, incident reports"
    consumer: "Cloud security team, detection engineering"
    update: "Monthly"
```

### Step 2: Intelligence Collection

**OSINT Collection Sources:**

```yaml
osint_sources:
  threat_actor_news:
    - "The DFIR Report — detailed incident reports with IOCs"
    - "Mandiant Advantage — threat actor tracking"
    - "CrowdStrike blog — adversary profiles"
    - "VX Underground — malware source code and analysis"
    - "BleepingComputer — ransomware and breach news"
    - "KrebsOnSecurity — investigative security journalism"
    - "SANS ISC — internet storm center daily diaries"

  ioc_feeds:
    - "AlienVault OTX — 100K+ daily IoCs, community curated"
    - "URLhaus — malware distribution URLs (real-time)"
    - "PhishTank — phishing URLs (verified)"
    - "Spamhaus DROP — known malicious IPs"
    - "Abuse.ch Feodo Tracker — C2 server tracking"
    - "CISA AIS — automated indicator sharing (US gov)"
    - "MISP communities — sector-specific sharing"

  exploit_monitoring:
    - "CISA Known Exploited Vulnerabilities (KEV) — actively exploited CVEs"
    - "Exploit-DB — proof of concept exploits"
    - "Metasploit — module updates"
    - "GitHub monitoring — PoC exploit discovery"
    - "Project Zero bug tracker — 90-day disclosure timeline"

  dark_web:
    - "Flashpoint — dark web forum monitoring (commercial)"
    - "Recorded Future — dark web intelligence (commercial)"
    - "Digital Shadows — digital risk monitoring (commercial)"
```

**Automated Collection Pipeline:**
```python
import requests
import json
from datetime import datetime, timedelta
from typing import List, Dict

class ThreatIntelCollector:
    def __init__(self, config: Dict):
        self.sources = config['sources']
        self.tip_api = config['tip_api_endpoint']
        self.tip_token = config['tip_api_token']

    def collect_otx(self, api_key: str, days_back: int = 1) -> List[Dict]:
        """Collect pulses from AlienVault OTX."""
        pulses = []
        since = (datetime.utcnow() - timedelta(days=days_back)).isoformat()
        url = f"https://otx.alienvault.com/api/v1/pulses/subscribed"
        headers = {"X-OTX-API-KEY": api_key}

        response = requests.get(url, headers=headers,
                                params={"limit": 50, "modified_since": since})
        if response.status_code == 200:
            data = response.json()
            for pulse in data.get("results", []):
                pulses.append({
                    "source": "alienvault_otx",
                    "id": pulse["id"],
                    "name": pulse["name"],
                    "description": pulse["description"],
                    "tags": pulse.get("tags", []),
                    "tlp": pulse.get("TLP", "amber"),
                    "indicators": [
                        {"type": i["type"], "value": i["indicator"]}
                        for i in pulse.get("indicators", [])
                    ],
                    "collected_at": datetime.utcnow().isoformat(),
                    "reference": pulse.get("reference")
                })
        return pulses

    def collect_cisa_kev(self) -> List[Dict]:
        """Collect Known Exploited Vulnerabilities from CISA."""
        url = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"
        response = requests.get(url)
        vulns = []
        if response.status_code == 200:
            data = response.json()
            for vuln in data.get("vulnerabilities", []):
                vulns.append({
                    "source": "cisa_kev",
                    "cve_id": vuln["cveID"],
                    "name": vuln["vulnerabilityName"],
                    "date_added": vuln["dateAdded"],
                    "due_date": vuln["dueDate"],
                    "required_action": vuln["requiredAction"],
                    "known_to_be_used_in_ransomware": vuln.get("knownRansomwareCampaignUse", "Unknown"),
                    "collected_at": datetime.utcnow().isoformat()
                })
        return vulns

    def push_to_tip(self, indicators: List[Dict], feed_name: str):
        """Push collected indicators to Threat Intelligence Platform."""
        payload = {
            "feed": feed_name,
            "indicators": indicators,
            "collected_at": datetime.utcnow().isoformat()
        }
        headers = {
            "Authorization": f"Bearer {self.tip_token}",
            "Content-Type": "application/json"
        }
        response = requests.post(f"{self.tip_api}/indicators/bulk", json=payload, headers=headers)
        return response.status_code == 200

    def collect_all(self):
        """Run all collectors."""
        results = {"otx": [], "cisa": [], "errors": []}
        for source_name, source_config in self.sources.items():
            try:
                if source_name == "alienvault_otx":
                    results["otx"] = self.collect_otx(source_config["api_key"])
                elif source_name == "cisa_kev":
                    results["cisa"] = self.collect_cisa_kev()
            except Exception as e:
                results["errors"].append({"source": source_name, "error": str(e)})
        return results
```

### Step 3: Indicator (IoC) Management

**IoC Lifecycle:**
```
Collection → Normalization → Deduplication → Enrichment → Scoring → Distribution → Monitoring → Retirement
```

**IoC Scoring and Prioritization:**
```python
def score_indicator(indicator: Dict) -> int:
    """Score an indicator from 0-100 based on confidence and relevance."""
    score = 0

    # Source reliability
    source_scores = {
        "cisa": 100, "mandiant": 95, "crowdstrike": 90,
        "alienvault_otx_verified": 70, "urlhaus": 65,
        "phistank_verified": 60, "misp_trusted": 75,
        "alienvault_otx_unverified": 30, "social_media": 10
    }
    score += source_scores.get(indicator.get("source", ""), 20)

    # Age recency (higher for newer)
    age_hours = indicator.get("age_hours", 72)
    if age_hours < 1: score += 30
    elif age_hours < 6: score += 25
    elif age_hours < 24: score += 20
    elif age_hours < 72: score += 15
    else: score += 5

    # Indicator type priority
    type_scores = {
        "C2_domain": 40, "malware_hash": 35, "phishing_url": 30,
        "malicious_ip": 25, "email_address": 20, "registry_key": 15
    }
    score += type_scores.get(indicator.get("type", ""), 10)

    # Relevance to industry
    if indicator.get("industry_relevant"): score += 20
    if indicator.get("tech_stack_relevant"): score += 15

    # Corroboration (multiple sources)
    if indicator.get("source_count", 1) >= 3: score += 25
    elif indicator.get("source_count", 1) >= 2: score += 15

    return min(score, 100)
```

**IoC Distribution Rules:**

| Score | Action | Automation | Consumer |
|-------|--------|------------|----------|
| 80-100 | Block/Isolate immediately | Automated | Firewall, EDR, DNS sinkhole |
| 60-79 | Alert and investigate | Semi-automated (Tier 1 review) | SIEM correlation rule |
| 40-59 | Monitor for activity | Automated monitor (SIEM search) | SIEM watchlist |
| 20-39 | Log for reference | Manual review | Threat intel platform |
| 0-19 | Discard | Automated discard | None |

### Step 4: MITRE ATT&CK Mapping

**TTP Mapping Template:**
```yaml
threat_actor_profile:
  name: "APT-XX (Fancy Bear variant)"
  aliases: ["APT28", "Sofacy", "Fancy Bear", "Strontium"]
  motivation: "Political espionage, geopolitical advantage"
  target_sectors: ["Government", "Defense", "Think Tanks", "Media"]
  target_regions: ["Europe", "North America", "Eastern Europe"]

  known_ttps:
    initial_access:
      - technique: "T1566.001 — Spearphishing Attachment"
        observed: "Lure documents with malicious macros"
        detection: "Email gateway macro detection, EDR macro execution monitoring"
      - technique: "T1190 — Exploit Public-Facing Application"
        observed: "CVE-2023-XXXX exploitation in VPN appliances"
        detection: "NIDS signatures, vuln scanner, EDR post-exploit"

    execution:
      - technique: "T1204.002 — User Execution: Malicious File"
        observed: "Users double-click weaponized documents"
        detection: "EDR process creation events, User Behavior Analytics"
      - technique: "T1059.001 — PowerShell"
        observed: "PowerShell download cradle for second stage"
        detection: "PowerShell logging (ScriptBlock, Module), EDR command-line capture"

    persistence:
      - technique: "T1547.001 — Registry Run Keys / Startup Folder"
        observed: "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run"
        detection: "EDR registry monitoring, Sysmon Event ID 13"

    defense_evasion:
      - technique: "T1055.001 — Process Injection: DLL Injection"
        observed: "Inject into explorer.exe or svchost.exe"
        detection: "EDR API call monitoring, memory scanning"
      - technique: "T1027 — Obfuscated Files or Information"
        observed: "Base64-encoded PowerShell, XOR-encrypted payloads"
        detection: "Base64 decode patterns, entropy analysis"

    credential_access:
      - technique: "T1003.001 — LSASS Memory"
        observed: "Mimikatz or comsvcs.dll dump"
        detection: "EDR LSASS access monitoring, Windows Defender Credential Guard"

    lateral_movement:
      - technique: "T1021.006 — Windows Remote Management"
        observed: "WinRM for remote command execution"
        detection: "Windows Event 91 (WinRM), network log analysis"

    command_and_control:
      - technique: "T1071.001 — Web Protocols"
        observed: "HTTPS to compromised legitimate websites"
        detection: "TLS JA3 fingerprinting, domain reputation, beaconing analysis"
      - technique: "T1573.001 — Symmetric Cryptography"
        observed: "Custom XOR or AES encrypted C2 traffic"
        detection: "Traffic entropy analysis, packet timing analysis"

    exfiltration:
      - technique: "T1048.003 — Exfiltration Over Unencrypted Protocol"
        observed: "FTP/SMB exfiltration to staging server"
        detection: "Large outbound file transfers, DLP alerts"
```

**Detection Coverage Scoring:**
```python
def calculate_coverage_score(mapped_ttps: Dict, active_detections: List[str]) -> Dict:
    """
    Calculate detection coverage percentage for mapped TTPs.
    Returns coverage stats per tactic.
    """
    tactic_coverage = {}
    total_techniques = 0
    covered_techniques = 0

    for tactic, techniques in mapped_ttps.items():
        total = len(techniques)
        covered = sum(1 for t in techniques if t['technique'] in active_detections)
        tactic_coverage[tactic] = {
            "total": total,
            "covered": covered,
            "coverage_pct": round(covered / total * 100, 1) if total > 0 else 0,
            "techniques": {
                "covered": [t['technique'] for t in techniques if t['technique'] in active_detections],
                "gaps": [t['technique'] for t in techniques if t['technique'] not in active_detections]
            }
        }
        total_techniques += total
        covered_techniques += covered

    return {
        "overall_coverage_pct": round(covered_techniques / total_techniques * 100, 1) if total_techniques > 0 else 0,
        "tactics": tactic_coverage,
        "total_techniques": total_techniques,
        "covered_techniques": covered_techniques,
        "next_priorities": sorted(
            [t for tactics in tactic_coverage.values() for t in tactics['techniques']['gaps']],
            key=lambda t: t.get('priority', 99)
        )[:5]
    }
```

### Step 5: Threat Hunting

**Hunt Hypothesis Generation:**

```yaml
hunt_hypotheses:
  h_01:
    hypothesis: "Threat actors may be using PowerShell without -EncodedCommand to avoid detection"
    threat_intel_basis: "Recent campaigns observed using splatted parameters and obfuscated string concatenation"
    data_sources: ["Windows Event 4104 (PowerShell ScriptBlock)", "EDR process command line"]
    query: "index=windows EventCode=4104 ScriptBlockText=* -not ScriptBlockText=*-EncodedCommand* -not ScriptBlockText=*DownloadString* | eval length=len(ScriptBlockText) | where length > 500"
    expected_findings: "Obfuscated PowerShell scripts with unusual parameter passing"
    ttp_mapping: "T1059.001"

  h_02:
    hypothesis: "Adversaries may be using living-off-the-land binaries (LOLBins) for lateral movement"
    threat_intel_basis: "Increasing use of MSBuild, InstallUtil, and Mshta for bypassing application allowlisting"
    data_sources: ["Windows Event 4688 (Process Creation)", "EDR parent-child process tree"]
    query: "index=windows EventCode=4688 (Image=*\\msbuild.exe OR Image=*\\installutil.exe OR Image=*\\mshta.exe) | stats count by ParentImage, CommandLine"
    expected_findings: "LOLBin execution from unusual parent processes (Office, browser, email client)"
    ttp_mapping: "T1218.005, T1218.004, T1218.005"

  h_03:
    hypothesis: "Attackers may be using DNS tunneling for C2 communication"
    threat_intel_basis: "DNS tunneling remains effective and increasingly used by APT groups"
    data_sources: ["DNS logs (query volume, entropy)", "Zeek DNS logs"]
    query: "index=dns | eval domain_length=len(query) | eval subdomain_count=mvcount(split(query, '.')) | eval entropy=... | where domain_length > 30 AND subdomain_count > 5 | stats count by query, src_ip"
    expected_findings: "Unusual DNS query patterns: high frequency, long subdomains, high entropy, TXT queries"
    ttp_mapping: "T1572"

  h_04:
    hypothesis: "Recently disclosed CVE-2026-XXXX may be exploited in our environment"
    threat_intel_basis: "CISA KEV added CVE-2026-XXXX with active exploitation reports"
    data_sources: ["Application logs for affected software", "EDR for post-exploitation indicators", "IDS/IPS signatures"]
    queries:
      - "Search for affected software version in inventory (CMDB, vulnerability scanner)"
      - "Search for exploit-related process creation patterns post-announcement"
      - "Check for new outbound connections from systems running affected software"
    expected_findings: "No exploitation found, or exploitation detected with containment needed"
    ttp_mapping: "T1190"
```

**Hunt Execution Process:**
1. **Hypothesis**: Form clear hypothesis based on threat intelligence
2. **Data Collection**: Identify and query relevant data sources
3. **Analysis**: Review results, look for patterns, anomalies, and IOCs
4. **Triage**: Investigate findings, confirm benign or escalate
5. **Documentation**: Record findings, update detection rules, feed back to intelligence
6. **Metrics**: Track hypotheses tested, confirmed findings, new detection rules created

### Step 6: Intelligence Reporting

**Reporting Cadence:**

| Report Type | Audience | Frequency | Content |
|-------------|----------|-----------|---------|
| Flash Alert | SOC, IR team, system owners | As needed (within 1 hour of critical intel) | Active threat, IoCs, immediate actions |
| Daily Brief | SOC analysts | Daily (shift start) | New IoCs, overnight alerts, trending threats, CVE updates |
| Weekly Threat Summary | SOC manager, detection engineering | Weekly | Campaign analysis, TTP changes, detection coverage gaps |
| Monthly CTI Report | CISO, risk management, IT leadership | Monthly | Industry threat landscape, actor activity, relevance assessment, recommendations |
| Quarterly Threat Assessment | Board, executive team | Quarterly | Strategic threat landscape, risk posture changes, security program effectiveness |

**CTI Report Template:**
```markdown
# THREAT INTELLIGENCE BRIEF — MONTHLY SUMMARY
Date: June 2026
Classification: TLP:AMBER
Prepared by: CTI Team

## Executive Summary
{2-3 sentence overview of the month's most significant threats and their relevance to the organization}

## Industry Threat Landscape
- {Threat actor activity relevant to our industry}
- {New TTPs observed in the wild}
- {Attack campaigns targeting similar organizations}

## Relevant Threat Actors
| Actor | Activity This Month | Relevance | Action Required |
|-------|-------------------|------------|-----------------|
| ACTOR-A | New phishing campaign targeting CFOs | HIGH (finance team targeted) | User awareness training |
| ACTOR-B | Ransomware deployment via VPN vuln | MEDIUM (VPN version patched) | Verify patch compliance |

## Critical Vulnerabilities (CISA KEV)
| CVE | Affected Tech | Impact | Status in Our Environment |
|-----|--------------|--------|-------------------------|
| CVE-2026-XXXX | Product Y | RCE | [Patched / Unpatched / Not applicable] |

## New Detection Rules Created
| Rule Name | ATT&CK Technique | Data Source | Status |
|-----------|-----------------|-------------|--------|
| PowerShell Obfuscation | T1059.001 | Windows Event 4104 | Active |

## IoC Statistics
| Indicator Type | Collected | Reviewed | Distributed | Blocked |
|---------------|-----------|----------|-------------|---------|
| IP Addresses | 1,234 | 800 | 450 | 12 |
| Domains | 567 | 400 | 200 | 5 |
| File Hashes | 890 | 600 | 300 | 8 |
| URLs | 2,100 | 1,500 | 750 | 25 |

## Intelligence Gaps
- {What we don't know about current threats}
- {Recommendations for additional intelligence sources}

## Recommendations
1. {Priority action for SOC/detection engineering}
2. {Priority action for vulnerability management}
3. {Priority action for risk management}
```

### Step 7: Intelligence Sharing and TLP Handling

**TLP Classification:**

| TLP Level | Description | Sharing Restriction |
|-----------|-------------|-------------------|
| TLP:RED | Not for disclosure | Limited to named recipients only |
| TLP:AMBER | Limited disclosure | Share within organization and clients on need-to-know basis |
| TLP:AMBER+STRICT | Limited disclosure | Share only within organization |
| TLP:GREEN | Limited disclosure | Share with peers and partner organizations |
| TLP:CLEAR | No restrictions | Share freely, subject to copyright |

**Sharing Platforms:**

| Platform | Type | Use Case |
|----------|------|----------|
| MISP (Malware Information Sharing Platform) | Self-hosted | Community sharing, automated IoC exchange |
| ISAC Portals | Industry-specific | Sector-specific threat intelligence sharing |
| CISA AIS (Automated Indicator Sharing) | US Government | Bi-directional IoC sharing with CISA |
| TIP Platform (ThreatConnect, Anomali, Recorded Future) | Commercial | Centralized intelligence management |

### Step 8: Intelligence-Driven Detection Engineering

**Intelligence-to-Detection Pipeline:**
```
Raw Intelligence → Analyze & Enrich → Create Detection → Test → Deploy → Measure → Feedback
```

**Example: CISA KEV to Detection Rule:**

Input CISA KEV entry:
```json
{
  "cveID": "CVE-2026-XXXX",
  "vendorProject": "Vendor Y",
  "product": "Product Z",
  "vulnerabilityName": "Product Z Remote Code Execution",
  "dateAdded": "2026-05-28",
  "shortDescription": "Product Z contains an RCE vulnerability in the web interface",
  "requiredAction": "Apply updates per vendor instructions.",
  "knownRansomwareCampaignUse": "Known"
}
```

Generated detection rules:
```spl
# Splunk - Detect exploitation attempts
index=proxy sourcetype=stream:http
| search uri=*ProductZ* AND (uri=*/admin/* OR uri=*/api/*)
| eval threat_actor_cve = "CVE-2026-XXXX"
| eval severity = "critical"
| eval urgency = "high"
| eval recommendation = "Immediately patch Product Z. Investigate for post-exploitation activity."
```

```yaml
# Wazuh - Detect vulnerable software version
<rule id="100050" level="10">
  <if_sid>500</if_sid>
  <field name="win.eventdata.product">Product Z</field>
  <field name="win.eventdata.version" type="pcre2">^([0-9]\.|1[0-4]\.)</field>
  <description>CVE-2026-XXXX: Product Z RCE - vulnerable version detected</description>
  <mitre>
    <id>T1190</id>
  </mitre>
</rule>
```

## Common Pitfalls

### Pitfall 1: Collecting Everything, Using Nothing
Collecting intelligence from 50+ feeds generates noise and obscures relevant threats. Focus on quality over quantity. Align collection to PIRs. Prune feeds that don't generate actionable intelligence.

### Pitfall 2: IoCs Without Context
Distributing IP addresses without context (malware C2 vs phishing URL vs scanner) wastes analyst time. Always include: indicator type, confidence, source, age, associated threat actor, recommended action.

### Pitfall 3: Tactical Overemphasis
Focusing only on IoCs misses strategic intelligence. IoCs expire quickly (70% are useful for < 30 days). TTPs provide longer-lasting detection value. Balance tactical (IoCs) with operational (campaigns) and strategic (trends).

### Pitfall 4: No Feedback Loop
Intelligence that never gets validated (was the IoC useful? Did we detect anything?) creates blind trust in feeds. Implement feedback: analyst marks IoC as "detected", "false positive", or "not seen". Use feedback to tune feed quality scoring.

### Pitfall 5: Ignoring False Positives from Feeds
Some intelligence feeds have 30-50% false positive rates. Without validation, FPs erode trust in CTI. Validate high-severity IoCs before distribution. Use verified feeds for automated actions.

### Pitfall 6: Intelligence Not Integrated into Tools
CTI team produces reports but intelligence never reaches SIEM, EDR, or firewall. Automated IoC distribution via TIP platform. Strategic intelligence should influence detection rule priorities.

### Pitfall 7: No Threat Hunting Program
Intelligence collected but never used for proactive hunting. Intelligence without hunting is passive. Use each intelligence report to generate at least one hunt hypothesis.

### Pitfall 8: One-Size-Fits-All Reporting
The same intelligence report does not serve analysts, managers, and executives. Tailor reports: tactical for SOC, operational for detection engineering, strategic for leadership.

### Pitfall 9: Intelligence Hoarding
Not sharing intelligence with peers, ISACs, or CISA. Intelligence sharing improves collective defense. Implement TLP classification to share appropriately. Participate in ISAC intelligence working groups.

### Pitfall 10: No Intelligence-Led Testing
Without purple team validation, you don't know if intelligence has improved detection. Use intelligence to drive purple team scenarios. Validate detection rules against real adversary TTPs.

## Best Practices

- Define Priority Intelligence Requirements (PIRs) aligned to business risk — collect what you need
- Implement TLP classification for all intelligence products (RED/AMBER/GREEN/CLEAR)
- Use TIP platform (MISP, ThreatConnect, Anomali) for centralized intelligence management
- Automate IoC ingestion from Tier 1 feeds (CISA KEV, AlienVault OTX, MISP)
- Score indicators by confidence, age, source reliability, and relevance before distribution
- Generate detection rules from CISA KEV entries within 24 hours of publication
- Map all intelligence to MITRE ATT&CK for measurable coverage analysis
- Conduct threat hunting based on intelligence — every CTI report should produce at least one hunt hypothesis
- Measure CTI effectiveness: detection rate improvement, intelligence-to-detection latency, feed quality scores
- Participate in ISAC or industry sharing groups for sector-specific intelligence
- Conduct quarterly intelligence gap analysis — what don't we know?
- Maintain TTP/actor profiles for the top 10 threat actors targeting your industry

## Performance Considerations

- IoC half-life: 70% of IP-based IoCs are obsolete after 30 days; domain IoCs last 60-90 days; hash-based IoCs last 12+ months
- Feed volume: a single OSINT feed can produce 10K+ IoCs daily. Automated dedup and scoring essential
- Detection engineering: intelligence-to-detection rule should take < 4 hours for critical threats, < 24 hours for high
- MISP performance: 100K events manageable on 4 vCPU, 16GB RAM instance. Scale with Redis caching
- SIEM correlation: threat intel lookups add 10-100ms per event. Cache intel in memory, update hourly
- False positive rate: commercial feeds typically 5-15% FP; OSINT feeds 20-50% FP. Validate before auto-action

## Rules

- No intelligence feed consumed without documented source and confidence scoring
- All intelligence products must have TLP classification (RED/AMBER/GREEN/CLEAR)
- IoCs older than 30 days must be reviewed before automated action
- CISA KEV vulnerabilities must be assessed for relevance within 24 hours of publication
- All detection rules based on intelligence must reference the source intelligence
- Hunt hypotheses must be generated from each significant intelligence report
- CTI feedback loop must be closed within 7 days (did the intelligence produce value?)
- Intelligence sharing must comply with TLP classification and legal agreements
- Quarterly intelligence gap analysis must be performed and reported
- Threat actor profiles must be updated within 30 days of significant TTP changes

## References
  - references/cti-lifecycle.md — Threat Intelligence Lifecycle
  - references/osint-collection.md — OSINT Collection
  - references/threat-hunting.md — Threat Hunting
  - references/threat-intelligence-advanced.md — Threat Intelligence Advanced Topics
  - references/threat-intelligence-fundamentals.md — Threat Intelligence Fundamentals
  - references/ti-platforms.md — Threat Intelligence Platforms
  - references/ti-sharing.md — Threat Intelligence Sharing
## Handoff
IoC feeds integrated with siem-engineering for detection rules. TTP mapping informs soc-operations for analyst workflows.
