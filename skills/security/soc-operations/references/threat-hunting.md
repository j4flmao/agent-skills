# Threat Hunting in SOC

## Hunting Methodology

### Hypothesis-Driven Hunting
```
Hypothesis → Data Collection → Analysis → Pattern Identification → Response → Feedback
    ↑                                                                           │
    └─────────────────────────── Iterate ◄──────────────────────────────────────┘
```

### Hunting Hypothesis Examples
- "We expect to find instances of PowerShell being used outside of IT operations hours"
- "Adversaries targeting our sector commonly use Cobalt Strike — check for named pipe patterns"
- "If our perimeter controls were bypassed, attackers would likely use RDP for lateral movement"
- "Recent threat intel suggests a new IcedID variant — check for new scheduled tasks on endpoints"
- "Users in finance may be targeted by invoice-themed phishing — check for macro-enabled documents"

### Hypothesis Sources
| Source | Description | Frequency |
|--------|-------------|-----------|
| Threat Intelligence | Recent actor TTPs, campaigns | Daily |
| MITRE ATT&CK | Unexplored techniques in coverage matrix | Weekly |
| Incident Lessons Learned | FNs from recent incidents | Per incident |
| Industry Peers | ISAC advisories, sector alerts | Weekly |
| Internal Data | SIEM blind spots, unmonitored data sources | Monthly |
| Red Team Findings | Emulation results, gaps identified | Per engagement |

## IoC Hunting

### Indicator Types for Hunting

**File-Based IoCs:**
```
SHA256 hashes from threat intel feeds
YARA rules for malware family detection
File names, paths, and naming conventions
Alternate Data Stream (ADS) usage
Fileless malware patterns (registry-based, script-based)
```

**Network-Based IoCs:**
```
C2 IP addresses and domain names
Beaconing patterns (fixed interval check-ins)
DNS query anomalies (NXDOMAIN rates, TXT record size)
Unusual user-agent strings in HTTP traffic
SSL/TLS certificate anomalies (self-signed, expired)
Non-standard port usage for common protocols
```

**Behavioral IoCs:**
```
Process creation from Office applications (winword → cmd → powershell)
LSASS access by non-standard processes
Service installation from temp directories
Scheduled task creation outside maintenance windows
Registry Run key modifications
WMI event subscription creation
DLL sideloading from user-writable paths
```

### Hunting Query Examples

**PowerShell Hunting (SIEM query):**
```
source=WinEventLog:Microsoft-Windows-Sysmon/Operational EventCode=1
Image=powershell.exe
| eval encoded=if(CommandLine LIKE "%-enc%" OR CommandLine LIKE "%-EncodedCommand%", 1, 0)
| eval hidden=if(CommandLine LIKE "%-win%hidden%" OR CommandLine LIKE "%-WindowStyle Hidden%", 1, 0)
| eval download=if(CommandLine LIKE "%Net.WebClient%" OR CommandLine LIKE "%Invoke-WebRequest%" OR CommandLine LIKE "%System.Net.WebClient%", 1, 0)
| eval obfuscate=if(CommandLine LIKE "%%`%" OR CommandLine LIKE "%\\x%" OR CommandLine LIKE "%\\u00%", 1, 0)
| eval suspicion_score=encoded+hidden+download+obfuscate
| where suspicion_score > 1
| table _time, ComputerName, User, CommandLine, suspicion_score
```

**RDP Lateral Movement Hunting:**
```
source=WinEventLog:Security EventCode=4624 LogonType=10
| search dest_port=3389
| eval is_internal=if(like(src_ip, "10.%") OR like(src_ip, "192.168.%") OR like(src_ip, "172.1[6-9].%"), 1, 0)
| where is_internal=1
| stats count by src_ip, dest_ip, User
| where count > 5
| table src_ip, dest_ip, User, count
```

**DNS Beaconing Detection:**
```
source=dns_logs
| eval hour=strftime(_time, "%H")
| eval day=strftime(_time, "%A")
| stats count by query, src_ip, hour
| eventstats avg(count) as avg_count, stdev(count) as stdev_count by query, src_ip
| eval z_score=(count - avg_count) / stdev_count
| where z_score < 0.5 AND count > 100  # Regular intervals = low variance
| table query, src_ip, count, avg_count, stdev_count
```

## IoA (Indicator of Attack) Hunting

### Process Chain Analysis
```
Normal Chain:     explorer.exe → OUTLOOK.EXE → WINWORD.EXE
Suspicious Chain: explorer.exe → OUTLOOK.EXE → WINWORD.EXE → cmd.exe → powershell.exe

Normal Chain:     svchost.exe → trusted_service.exe
Suspicious Chain: svchost.exe → powershell.exe -enc <base64>

Normal Chain:     WINWORD.EXE → EXCEL.EXE (OLE embedding)
Suspicious Chain: WINWORD.EXE → wmic.exe process call create (exec)
```

### Parent-Child Anomaly Detection
```yaml
hunt_name: "Suspicious Parent-Child Process Relationships"
queries:
  - parent: "WINWORD.EXE, EXCEL.EXE, POWERPNT.EXE"
    child: "cmd.exe, powershell.exe, wscript.exe, cscript.exe, mshta.exe, regsvr32.exe"
    alert: "Office application spawning script host"

  - parent: "outlook.exe"
    child: "powershell.exe, cmd.exe, wscript.exe"
    alert: "Email client spawning shell"

  - parent: "explorer.exe, svchost.exe"
    child: "rundll32.exe, regsvr32.exe, msbuild.exe"
    alert: "System process spawning suspicious binary"
```

## Pyramid of Pain

```
                          ┌─────────────┐
                          │    Hash      │  ← Easy to change
                          ├─────────────┤
                          │    IP        │  ← Moderate to change
                          ├─────────────┤
                          │   Domain     │  ← Moderate to change
                          ├─────────────┤
                          │ Network/Host │  ← Harder to change
                          │   Artifacts  │
                          ├─────────────┤
                          │   Tools      │  ← Hard to change
                          ├─────────────┤
                          │   TTPs       │  ← Hardest to change
                          └─────────────┘
```

### Hunting by Pyramid Level
| Level | Hunting Focus | Example |
|-------|--------------|---------|
| Hash | Known bad file hashes | Cobalt Strike beacon hashes from intel |
| IP | C2 infrastructure, scanner IPs | IP reputation correlation |
| Domain | Malware C2, phishing domains | DGA detection, suspicious TLDs |
| Artifacts | File paths, registry keys, named pipes | Named pipe "\postex_*" for Cobalt Strike |
| Tools | Malware families, hacking tools | Mimikatz detection in process memory |
| TTPs | Behavioral patterns, techniques | LSASS access by non-standard processes |

### Hunting Maturity Model (HMM)

| Level | Name | Description | Capabilities |
|-------|------|-------------|--------------|
| 0 | Initial | Reactive, relies on automated alerting | No proactive hunting; only responds to alerts |
| 1 | Minimal | Some ad-hoc hunting, no formal process | Informal queries when time allows |
| 2 | Procedural | Formal hunting process with documented procedures | Scheduled hunts using playbooks |
| 3 | Innovative | Data-driven, automated hunting with machine learning | Custom analytics, anomaly detection |
| 4 | Leading | Automated, continuous hunting with feedback loop | Self-tuning models, automated response |

### HMM Progression Checklist
```
Level 0 → Level 1:
  □ Create hunting schedule (weekly/bi-weekly)
  □ Define top 3 hunting hypotheses
  □ Establish hunting documentation template
  □ Identify primary data sources for hunting

Level 1 → Level 2:
  □ Document hunt procedures as playbooks
  □ Create reusable hunting queries (KQL/SPL)
  □ Establish findings tracking and reporting
  □ Integrate threat intel into hunting hypotheses
  □ Schedule recurring hunts based on TTPs

Level 2 → Level 3:
  □ Implement baseline/statistical anomaly detection
  □ Automate data collection and initial analysis
  □ Develop ML models for behavioral anomalies
  □ Create hunting dashboards for visualization
  □ Establish metrics for hunt effectiveness

Level 3 → Level 4:
  □ Continuous, autonomous hunting operations
  □ Automated hypothesis generation from intel
  □ Self-tuning detection models
  □ Automated containment from hunt findings
  □ Hunting program metrics and reporting
```

## Hunting Data Sources

### Primary Sources
| Source | Use Case | Retention |
|--------|----------|-----------|
| Process creation logs | Process chain analysis | 90+ days |
| Network connections | Beaconing, C2 detection | 30+ days |
| DNS query logs | DGA, tunneling detection | 30+ days |
| Windows Event Logs | Auth anomalies, service creation | 90+ days |
| EDR telemetry | File/registry/process timeline | 30+ days |
| Proxy logs | Web traffic anomalies | 30+ days |
| Email logs | Phishing pattern analysis | 90+ days |
| Cloud audit logs | Cloud threat hunting | 365+ days |

## Hunting Cycle Output

### Hunt Report Template
```yaml
hunt:
  id: "HUNT-2026-005"
  title: "Cobalt Strike Named Pipe Hunting"
  hypothesis: "Adversaries using Cobalt Strike will create named pipes matching known patterns"
  source: "Threat Intelligence - Cobalt Strike 4.x analysis"
  data_sources:
    - "Windows Security Event ID 5145 (named pipe access)"
    - "Sysmon Event ID 17/18 (named pipe creation/access)"
  methodology:
    - "Collect all named pipe creation events from last 7 days"
    - "Filter for known CS named pipe patterns: postex_*, status_*, MSE*, *-[0-9]+"
    - "Correlate with process creation events on same host"
    - "Investigate matches for additional indicators"
  findings:
    - positive: 2
    - negative: 0
    - inconclusive: 3
  true_positives:
    - host: "DEV-FIN-023"
      pipe: "\postex_3c1f"
      process: "rundll32.exe"
      action: "Isolate host, investigate further"
  improvements:
    - "Added named pipe detection rule to SIEM"
    - "Created YARA rule for CS beacon memory scan"
    - "Updated EDR detection rules for named pipe anomalies"
```

### Hunting Metrics
| Metric | Description | Target |
|--------|-------------|--------|
| Hunts completed/month | Number of structured hunts | > 8 |
| Hypotheses tested | Total hypotheses per month | > 12 |
| True positive rate | TP / (TP + FP) from hunts | > 30% |
| Detection rules created | New rules from hunt findings | > 2/month |
| MITRE coverage increase | % new techniques covered | > 5%/quarter |
| Mean time to discover blind spots | Time to identify monitoring gaps | < 2 weeks |
