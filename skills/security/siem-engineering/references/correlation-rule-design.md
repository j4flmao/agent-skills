# Correlation Rule Design

## Rule Design Framework

### MITRE ATT&CK Alignment
Map each correlation rule to MITRE ATT&CK:
- **TA**: Tactic (Initial Access, Execution, Persistence, etc.)
- **T####**: Technique (T1078: Valid Accounts, T1133: External Remote Services)
- **T####.###**: Sub-technique

### Rule Template
```yaml
rule_template:
  id: "CR-001"
  name: "Multiple Failed Logins"
  mitre_id: "T1110"  # Brute Force
  tactis: ["Credential Access"]
  log_source:
    - "Windows Security Log (4625)"
    - "Linux /var/log/auth.log"
    - "Cloud provider login audit"
  condition:
    aggregate: "count of failed logins"
    group_by: ["src_ip", "target_user"]
    window: "5 minutes"
    threshold: 10
  severity: "HIGH"
  response:
    - "Block src_ip at firewall"
    - "Alert SOC"
    - "Disable target_user account if 20+ failures"
  false_positive_indicators:
    - "VPN gateway health check user"
    - "Legacy application with wrong service account"
    - "Misconfigured SSO with credential caching"
```

## Common Detection Patterns
| Pattern | Description | Example |
|---------|-------------|---------|
| Threshold-based | Count exceeded in time window | 10 failed logins in 5 minutes |
| Sequence-based | Events occur in specific order | Create user → Add to admin group → Export SAM |
| Missing event | Expected event didn't occur | User logged in but no 2FA prompt |
| Beaconing | Regular connections at fixed intervals | DNS query every 60s to C2 domain |
| Anatomaly | Deviation from baseline | User logins from geographic anomaly |
| Correlation | Multiple event types from different sources | Login from foreign IP + first-time admin PowerShell |

## Key Points
- Every correlation rule should map to MITRE ATT&CK technique
- Document false positive indicators to speed up triage
- Test rules with atomic red team simulation
- Start with threshold-based rules, graduate to sequence and anomaly
- Use watchlist and exception lists for known false positive sources
- Review rule performance quarterly: which rules generate alerts vs which find real threats
