# SOAR Playbook Patterns

## Playbook Structure
```
## Playbook: {Name}
Trigger: {Alert type, webhook, schedule, manual}
Requirements: {API keys, permissions, integrations}

## Steps:
1. {Action} → {Decision}
   ├─ Yes → {Next step}
   └─ No → {Alternative path}
```

## Common Playbooks

### Phishing Response
```
Trigger: Phishing alert from SIEM/Security gateway
Steps:
1. Extract URL + attachment hash from alert
2. Check URL reputation (VirusTotal, URLScan)
   ├─ Malicious → Block at proxy, add to blocklist
   └─ Unknown → Submit to sandbox, wait 5 min
3. Check attachment hash
   ├─ Known malware → Quarantine email, alert user
   └─ Unknown → Submit to sandbox
4. If user clicked:
   - Reset password
   - Enable MFA
   - Scan endpoint
5. Create case with all findings
6. Notify SOC via Slack/Teams
```

### Brute Force Mitigation
```
Trigger: 10+ failed logins + 1 success in 5 min
Steps:
1. Get source IP from alert
2. Check IP reputation
   ├─ Known malicious → Block at firewall
   └─ Unknown → Check geolocation
3. Identify affected account
4. Force password reset
5. Enable MFA if not already
6. Add to watchlist for 24h monitoring
7. Notify user + manager
8. Create case
```

### Malware Isolation
```
Trigger: Malware detection alert from EDR
Steps:
1. Isolate endpoint via EDR API
2. Check for lateral movement indicators
   ├─ Yes → Isolate connected endpoints, alert T2
   └─ No → Continue
3. Collect forensics (process tree, network logs, file artifacts)
4. Kill malicious process(es)
5. Remove persistence mechanism
6. Add IoCs to blocklist (IPs, hashes, domains)
7. Create case with timeline
8. Notify SOC manager for SEV1/SEV2
```

### IoC Enrichment
```
Trigger: New IoC from threat intel feed
Steps:
1. For each IoC:
   ├─ IP → Check VirusTotal, AlienVault, Shodan
   ├─ Domain → Whois, DNS history, passive DNS
   └─ Hash → VirusTotal, Hybrid Analysis
2. Check if IoC exists in SIEM logs (retrospective)
   ├─ Yes → Identify affected hosts, create incidents
   └─ No → Add to blocklist for proactive blocking
3. Update IoC database with enrichment data
4. Tag by confidence score
```

## Playbook Best Practices
- Always have a manual decision point for critical actions (isolation, password reset)
- Add delay/wait steps for sandbox analysis (5-10 min)
- Log every action with timestamp for audit
- Use parallel execution for independent checks
- Include rollback steps for each automated action
