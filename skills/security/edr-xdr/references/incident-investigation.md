# EDR Incident Investigation

## Investigation Phases

### Phase 1: Alert Triage (15 min)
1. Verify alert is not a known false positive
2. Check alert severity and confidence score
3. Review initial telemetry: process, user, endpoint
4. Check if endpoint is already isolated or compromised
5. Escalate if: critical severity, admin user, sensitive system, lateral movement

### Phase 2: Scope Analysis (1-2 hours)
1. Process tree analysis — how did the process start?
2. Timeline reconstruction — what happened when?
3. Network connections — where did it connect?
4. File operations — what files were created/modified?
5. User activity — what did the user do before/during/after?
6. Check other endpoints for same indicators

### Phase 3: Containment
1. Isolate affected endpoints
2. Block malicious IoCs at firewall/proxy
3. Disable compromised user accounts
4. Reset credentials for affected accounts
5. Preserve forensic evidence (memory dump, disk image)

### Phase 4: Eradication
1. Remove malware from affected endpoints
2. Patch exploited vulnerabilities
3. Remove persistence mechanisms
4. Update detection rules for future prevention

### Phase 5: Recovery
1. Restore systems from clean backup (if needed)
2. Monitor for re-infection
3. Conduct post-incident review
4. Update playbooks and detection rules

## EDR Investigation Queries
```kql
// CrowdStrike — process tree
DeviceProcessEvents
| where DeviceName == "target-endpoint"
| where Timestamp between (datetime(2026-06-01 14:00) .. datetime(2026-06-01 15:00))
| project Timestamp, FileName, ProcessCommandLine, ParentFileName, AccountName
| order by Timestamp asc

// Network connections
DeviceNetworkEvents
| where DeviceName == "target-endpoint"
| where Timestamp between (datetime(2026-06-01 14:00) .. datetime(2026-06-01 15:00))
| project Timestamp, RemoteIP, RemotePort, LocalIP, InitiatingProcess
| order by Timestamp asc
```

## Key Points
- Triage alerts within 15 minutes — validate and escalate
- Analyze process tree, network connections, file operations
- Contain before investigating — isolate endpoints immediately
- Preserve forensic evidence before remediation
- Update detection rules after each incident
- Conduct post-incident review within 1 week
