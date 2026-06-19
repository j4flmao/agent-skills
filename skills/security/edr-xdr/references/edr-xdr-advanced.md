# EDR/XDR Advanced Topics

## Introduction
Advanced EDR/XDR covers custom detection engineering, XDR correlation across domains, automated threat hunting with TTP queries, EDR bypass techniques and countermeasures, and integrating EDR with SOAR for automated incident response.

## Custom Detection Engineering
```yaml
# Custom detection rule for Cobalt Strike beacon detection
detection:
  name: "Cobalt Strike Beacon Detection"
  techniques: ["T1055.012", "T1574.002"]
  indicators:
    - "Process injection into explorer.exe or svchost.exe"
    - "Named pipe patterns: \\.\pipe\msagent_* or \\.\pipe\postex_*"
    - "DNS queries to algorithmically generated domains (DGA)"
    - "HTTP beaconing with 60-second intervals"
    - "Mutex names: Global\XXXXXXXX (8 hex chars)"
  response:
    - severity: critical
    - actions:
      - isolate_endpoint: true
      - collect_memory_dump: true
      - block_ioc: ["process_hash", "c2_domain", "mutex_name"]
```

## XDR Correlation Across Domains
```
EDR Alert: Process injected into lsass.exe
    │
    ▼
SIEM Enrichment: User logged in from unusual geo
    │
    ▼
Email Security: User received phishing email 2 hours ago
    │
    ▼
Identity: User's MFA prompt was approved from unrecognized device
    │
    ▼
Conclusion: Credential theft via phishing → lateral movement likely
Automated Response: Isolate endpoint, revoke session tokens, reset credentials
```

## Automated Threat Hunting
```python
# Automated threat hunting queries
threat_hunting_queries = {
    "lateral_movement_rdp": """
        DeviceEvents
        | where ActionType == 'NetworkConnection'
        | where RemotePort == 3389
        | summarize ConnectionCount = count() by DeviceName, RemoteIP, InitiatingProcess
        | where ConnectionCount > 1
    """,
    "powershell_encoded": """
        DeviceProcessEvents
        | where FileName in ('powershell.exe', 'pwsh.exe')
        | where ProcessCommandLine contains '-EncodedCommand'
    """,
    "unusual_parent_child": """
        DeviceProcessEvents
        | where ParentFileName in ('winword.exe', 'excel.exe', 'outlook.exe')
        | where FileName in ('powershell.exe', 'cmd.exe', 'wscript.exe')
    """,
}
```

## EDR Bypass Techniques and Countermeasures
| Technique | Description | Countermeasure |
|-----------|-----------|---------------|
| Process injection | Inject into trusted process | Enable memory integrity (VBS) |
| DLL sideloading | Load malicious DLL via trusted EXE | Monitor module loads, enable AppLocker |
| Living-off-the-land | Use built-in tools (PowerShell, WMI) | Script block logging, constrained language mode |
| Kernel-mode rootkit | Hide processes from user-mode | Enable kernel-mode code signing |
| AMSI bypass | Disable script scanning | Enable AMSI, block known bypasses |
| Log tampering | Clear/alter event logs | Forward logs to SIEM immediately |
| Agent tampering | Stop/disable EDR agent | Enable tamper protection |

## Key Points
- Custom detection rules map specific adversary TTPs to EDR telemetry
- XDR correlates across endpoint, network, email, identity, and cloud domains
- Automated hunt queries proactively search for threats before alerts trigger
- Understand EDR bypass techniques to defense against them
- Integrate EDR with SOAR for automated incident response workflows
- Regular purple team exercises validate detection coverage
- Monitor EDR bypass attempts as high-severity alerts
- Use tamper protection to prevent agent disabling
