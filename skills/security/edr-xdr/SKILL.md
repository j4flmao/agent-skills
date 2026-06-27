---
name: edr-xdr
description: >
  Manage endpoint detection and response, EDR/XDR platforms, detection rules, and incident investigation.
  Use when the user asks about EDR, XDR, endpoint detection, CrowdStrike, Defender, SentinelOne, or detection rule.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, edr, phase-8]
---

# EDR/XDR

## Purpose
Design and manage endpoint detection and response capabilities including EDR/XDR platform selection, detection rule creation, and endpoint investigation workflows.

## Framework/Methodology

### DETECT-RESPOND Framework
A six-phase methodology for endpoint detection and response:

Phase 1 - Deploy: Install and configure EDR/XDR agents across all endpoints. Ensure coverage across operating systems, server workloads, and cloud instances. Validate telemetry quality and completeness.

Phase 2 - Enrich: Integrate EDR/XDR with threat intelligence feeds, SIEM, and other security tools. Enrich raw telemetry with context: user identity, asset criticality, threat actor TTPs, vulnerability data.

Phase 3 - Triage: Ingest and normalize alerts from all sources. Apply correlation rules, deduplication, and prioritization. Classify alerts by severity and confidence. Route to appropriate response team.

Phase 4 - Examine: Investigate alerts using EDR capabilities: process tree analysis, file reputation, network connections, registry changes, memory analysis. Determine scope and impact. Document findings.

Phase 5 - Contain: Isolate affected endpoints. Block malicious indicators. Kill malicious processes. Remove persistence mechanisms. Apply containment actions proportionate to threat.

Phase 6 - Treat: Remediate affected systems. Restore from clean backup if needed. Update detection rules. Deploy countermeasures. Conduct post-incident review. Feed intelligence back to detection pipeline.

### MITRE ATT&CK Mapping for EDR

The MITRE ATT&CK framework provides a common taxonomy for mapping detection coverage. Each EDR detection rule should map to specific ATT&CK techniques:

Initial Access (TA0001): Phishing attachments, exploitation of public-facing applications, trusted relationship abuse. EDR detects payload execution, process injection, or persistence.

Execution (TA0002): Command and scripting interpreter, PowerShell, WMI, scheduled task. EDR monitors process creation events, script execution, and command-line arguments.

Persistence (TA0003): Registry run keys, startup folders, service creation, scheduled tasks. EDR detects new services, registry modifications, and startup program registration.

Privilege Escalation (TA0004): Process injection, token manipulation, named pipe impersonation. EDR detects unusual parent-child process relationships and privilege changes.

Defense Evasion (TA0005): Disabling security tools, code signing, obfuscation, file deletion, process hollowing. EDR monitors security tool health, file modifications, and suspicious API calls.

Credential Access (TA0006): LSASS dumping, keylogging, credential harvesting from browsers. EDR detects sensitive process access, unusual API calls to credential stores.

Discovery (TA0007): System information discovery, account discovery, network service scanning. EDR detects reconnaissance commands and scanning behavior.

Lateral Movement (TA0008): RDP, SMB/WMI remote execution, SSH tunneling, Pass-the-Hash. EDR detects unusual remote connections, anomalous authentication patterns.

Collection (TA0009): Screen capture, clipboard data, browser data collection. EDR monitors for data collection APIs and unusual file access patterns.

Command and Control (TA0011): Beaconing, DNS tunneling, HTTPS to unusual domains, cloud API abuse. EDR detects anomalous outbound connections to new or risky destinations.

Exfiltration (TA0010): Large file transfers, archive creation before transfer, unusual outbound volumes. EDR monitors data volume per process, archive tool usage, and outbound connection patterns.

### XDR Correlation Layers

XDR extends EDR by correlating across multiple security layers:

Endpoint Layer: Process execution, file system changes, registry modifications, network connections, memory events. Traditional EDR scope.

Network Layer: Network flows, DNS queries, HTTP/HTTPS requests, TLS handshake metadata, IDS/IPS alerts. Correlated with endpoint events for full visibility.

Email Layer: Phishing detection, attachment analysis, URL reputation, email authentication (SPF/DKIM/DMARC), mailbox forwarding rules. Correlates email origin with endpoint execution.

Cloud Layer: Cloud API calls, infrastructure configuration changes, storage access patterns, identity behavior. Detects cloud-native threats and hybrid attacks.

Identity Layer: Authentication events, privilege changes, service account usage, anomalous logins, MFA failures. Correlates identity behavior with endpoint activity.

## Agent Protocol

### Trigger
- "EDR", "XDR", "endpoint detection", "endpoint response"
- "CrowdStrike", "Microsoft Defender", "SentinelOne", "Carbon Black"
- "detection rule", "endpoint detection rule", "endpoint investigation"
- "malware analysis", "endpoint forensics", "process investigation"
- "MDR", "managed detection", "endpoint isolation", "containment"

### Input Context
- If endpoint count, operating systems, and existing security tools are not provided, ask.

### Output Artifact
- Detection rule definitions, EDR configuration guides, investigation playbooks

### Response Format
```
## Platform
{EDR/XDR tool, configuration, coverage}

## Detection Rules
{Rules with logic, severity, response}

## Investigation
{Step-by-step endpoint investigation process}
```

### Completion Criteria
- [ ] EDR platform configured with proper coverage
- [ ] Detection rules defined for key techniques
- [ ] Investigation playbook created
- [ ] Response actions defined (isolation, containment)

## Workflow

### Step 1: Platform Selection and Deployment

Evaluate EDR/XDR platforms against requirements:
- Operating system coverage (Windows, macOS, Linux)
- Deployment model (SaaS, on-premises, hybrid)
- Detection capabilities (signature, behavioral, ML)
- Response capabilities (isolation, kill process, quarantine file)
- Integration capabilities (SIEM, SOAR, threat intelligence)
- Performance impact on endpoints
- Cost per endpoint

Popular platforms:
- CrowdStrike Falcon: Cloud-native, strong ML-based detection, broad OS support, real-time response
- Microsoft Defender for Endpoint: Deep Windows integration, strong for Microsoft shops, built-in XDR
- SentinelOne: Autonomous AI-driven detection and response, strong on Linux
- Palo Alto Cortex XDR: Network + endpoint integration, strong analytics
- Trend Micro / Sophos / Carbon Black: Strong enterprise footprints

Deployment planning:
- Pilot phase: deploy to 5% of endpoints, validate coverage, tune exclusions
- Staged rollout: 25% at a time, monitor for false positives and performance impact
- Full deployment: achieve 95%+ coverage across all endpoints
- Excluded systems: document why excluded, alternative protection

### Step 2: Detection Rule Engineering

Design detection rules mapping to MITRE ATT&CK techniques. Use multiple detection techniques for coverage depth:

Signature-based: Match known IoCs (file hashes, IPs, domains, registry keys). Low false positive rate but misses novel attacks. Update signatures from threat intelligence feeds.

Behavioral-based: Detect anomalous behavior patterns. Process creating child processes of cmd.exe, PowerShell executing encoded commands, LSASS process access. Higher detection rate for novel attacks.

ML-based: Train models on benign vs malicious behavior. Detect zero-day malware, fileless attacks, and living-off-the-land binaries. Requires careful tuning to avoid false positives.

Rule structure:
```
Rule Name: Suspicious PowerShell Execution
Technique: T1059.001 (PowerShell)
Severity: High
Description: Detects PowerShell executing encoded commands or downloading content
Logic: process_name = "powershell.exe" AND (command_line CONTAINS "-EncodedCommand" OR command_line CONTAINS "Invoke-WebRequest")
Response: Alert SOC, gather process memory dump
False Positive Tuning: Exclude approved automation scripts by path or hash
```

### Step 3: Alert Triage and Investigation

Build a structured triage process:

Tier 1 - Triage: Review alert details, verify alert validity, check historical context, determine initial severity. Escalate confirmed positives to Tier 2. Close false positives with tuning recommendation.

Tier 2 - Investigation: Deep dive into affected endpoints. Analyze process tree, parent-child relationships, network connections, file system changes, registry modifications. Determine scope (single endpoint vs lateral movement). Escalate to Tier 3 for complex incidents.

Tier 3 - Advanced Forensics: Memory analysis, timeline reconstruction, reverse engineering, threat actor attribution. Full incident response including containment, eradication, and recovery.

Investigation playbook template:
```
Alert: {Alert Name}
Severity: {Severity}
Status: {Open / Investigating / Contained / Resolved}

Initial Findings:
{What triggered the alert? Is it valid?}

Process Tree:
{Parent process -> Child process -> Network connection -> File created}

Scope Assessment:
{Affected endpoints, users, data}

Containment Actions:
{What has been isolated, blocked, or killed?}

Next Steps:
{Further investigation, remediation, intelligence sharing}
```

### Step 4: Response and Containment

Automated response actions:
- Endpoint isolation: Disconnect from network while preserving EDR communication
- Process termination: Kill identified malicious processes
- File quarantine: Move malicious files to secure quarantine
- Registry remediation: Remove persistence mechanisms
- User account disable: Disable compromised accounts

Manual response actions:
- Full system reimage: Rebuild from known-good image for deeply compromised systems
- Credential rotation: Rotate all credentials exposed on compromised system
- Network segmentation: Block lateral movement paths
- Forensic image: Capture full disk image for legal/adversarial purposes

Response SLAs:
- Critical (Ransomware, data exfiltration): Isolate within 5 minutes
- High (Lateral movement, privilege escalation): Isolate within 15 minutes
- Medium (Single endpoint, no lateral movement): Investigate within 1 hour
- Low (Informational, no confirmed malicious): Investigate within 4 hours

### Step 5: Continuous Improvement

Post-incident review questions:
- Should this alert have been caught earlier?
- Are there gaps in detection coverage?
- Did the response contain the threat quickly enough?
- What intelligence can be extracted and shared?
- What detection rules can be created or tuned?

Detection engineering feedback loop:
1. Incident occurs
2. Identify detection gaps
3. Create or tune detection rule
4. Test in staging environment
5. Deploy to production
6. Monitor for false positives
7. Validate effectiveness in next incident

## Common Pitfalls

Pitfall 1: Alert fatigue from poorly tuned detection rules. Too many false positives desensitize the SOC, causing real threats to be missed. Invest in tuning before increasing detection rule volume.

Pitfall 2: Incomplete endpoint coverage. EDR is only effective on endpoints where it is installed. Unmanaged endpoints (contractor machines, legacy systems, cloud instances) are blind spots.

Pitfall 3: Not mapping detections to MITRE ATT&CK. Without framework mapping, detection coverage is unmeasurable. You do not know which techniques you can detect and which are blind spots.

Pitfall 4: Delayed response to automated alerts. Automated detection without automated or fast manual response leaves a window of exposure. Define response SLAs and measure adherence.

Pitfall 5: Isolating endpoints without investigation. Blind isolation loses forensic data and may disrupt business operations. Investigate before containing unless immediate threat of data exfiltration.

Pitfall 6: No exclusions for legitimate software. Security tools, admin tools, monitoring agents, and backup software can trigger EDR alerts. Document and exclude known-good software to reduce noise.

Pitfall 7: Ignoring Linux and macOS endpoints. Many organizations deploy EDR only on Windows, leaving Linux servers and macOS workstations unprotected. Extend coverage to all platforms.

## Best Practices

Practice 1: Deploy EDR to all endpoints including servers, cloud instances, and container hosts. Endpoint coverage should exceed 95% of all systems. Track and remediate coverage gaps.

Practice 2: Use MITRE ATT&CK to measure detection coverage. Map each detection rule to specific techniques. Identify coverage gaps. Prioritize detection engineering for uncovered techniques.

Practice 3: Create a detection rule lifecycle. Propose -> Review -> Test in staging -> Deploy -> Monitor for false positives -> Tune -> Retire. Rules that are not maintained degrade in effectiveness.

Practice 4: Integrate EDR with SOAR for automated response. Common automations: isolate endpoint on ransomware detection, block IoCs across firewalls, create ticket for Tier 2 investigation.

Practice 5: Test detection rules with purple team exercises. Simulate adversary techniques and validate that EDR detects them. Purple team results drive detection engineering priorities.

Practice 6: Establish a false positive feedback loop. Analysts should have a simple mechanism to flag false positives. Track false positive rate per rule. Rules with > 10% false positive rate need tuning.

## Templates & Tools

### Detection Rule Template
```
# Detection Rule: {Rule Name}

## Metadata
- Rule ID: EDR-{NNN}
- ATT&CK Technique: {TXXXX.XXX}
- Severity: {Critical / High / Medium / Low}
- Confidence: {High / Medium / Low}
- Status: {Active / Tuning / Testing / Retired}

## Detection Logic
Platform: {CrowdStrike / Defender / SentinelOne}
Query/Language: {EventSearch / KQL / Deep Visibility}
Logic:
```
{platform-specific query}
```

## Response
- Automated: {Isolate endpoint / Kill process / Quarantine file}
- Manual: {Investigate scope / Check related alerts / Escalate}
- SLA: {Timeframe for response}

## Tuning
- Known False Positives: {list of known benign triggers}
- Exclusion Criteria: {paths, hashes, users to exclude}
- False Positive Rate: {current % / target < 5%}

## Testing
- Tested: {date}
- Test Scenario: {how tested}
- Test Result: {Detected correctly / Needs tuning}
```

### Incident Investigation Playbook Template
```
# Investigation Playbook: {Technique Name}

## Trigger
{What alert triggers this playbook?}

## Initial Triage (Tier 1)
- [ ] Verify alert validity
- [ ] Check process tree and parent-child relationships
- [ ] Review network connections
- [ ] Check file reputation
- [ ] Determine initial severity

## Deep Investigation (Tier 2)
- [ ] Analyze registry modifications
- [ ] Check scheduled tasks and services
- [ ] Review user account activity
- [ ] Search for lateral movement indicators
- [ ] Check cloud/identity correlated alerts

## Containment
- [ ] Isolate affected endpoint(s)
- [ ] Block indicators (IPs, domains, hashes)
- [ ] Kill malicious processes
- [ ] Remove persistence mechanisms
- [ ] Disable compromised accounts

## Remediation
- [ ] Scan and clean affected systems
- [ ] Rotate credentials
- [ ] Restore from clean backup if needed
- [ ] Update detection rules
- [ ] Document remediation steps

## Post-Incident
- [ ] Timeline reconstruction
- [ ] Root cause analysis
- [ ] Lessons learned
- [ ] Detection rule improvements
- [ ] Intelligence sharing
```

### Tools Reference
- EDR Platforms: CrowdStrike Falcon, Microsoft Defender for Endpoint, SentinelOne, Palo Alto Cortex XDR
- SIEM Integration: Splunk, Elastic Security, Azure Sentinel, QRadar
- SOAR Integration: Splunk SOAR, Palo Alto XSOAR, ServiceNow Security Operations
- Threat Intelligence: MITRE ATT&CK, VirusTotal, AlienVault OTX, MISP
- Forensics: Velociraptor, KAPE, Volatility, Autopsy
- Purple Team: Atomic Red Team, Caldera, Stratus Red Team

### EDR Coverage Scorecard
| ATT&CK Tactic | Techniques Covered | Techniques Total | Coverage % |
|---------------|-------------------|-----------------|------------|
| Initial Access| 8                 | 14              | 57%        |
| Execution     | 12                | 18              | 67%        |
| Persistence   | 15                | 22              | 68%        |
| Privilege Escalation | 10        | 16              | 63%        |
| Defense Evasion | 18              | 28              | 64%        |
| Credential Access | 6             | 11              | 55%        |
| Discovery     | 14                | 20              | 70%        |
| Lateral Movement | 7             | 13              | 54%        |
| Collection    | 5                 | 10              | 50%        |
| C2            | 11                | 17              | 65%        |
| Exfiltration  | 4                 | 9               | 44%        |
| **Total**     | **110**           | **178**         | **62%**    |

## Case Studies

### Case Study 1: Ransomware Outbreak Contained in Minutes
A manufacturing company with 5000 endpoints deployed CrowdStrike Falcon with ML-based detection. A ransomware variant (new, not signature-matched) began encrypting files on a single workstation. EDR behavioral detection flagged the mass file modification pattern within 30 seconds of encryption start. Automated isolation policy disconnected the endpoint. Total encryption damage: 200 files on one machine. No lateral movement occurred. Prior to EDR, similar ransomware incidents had taken 4-8 hours to detect and contained weeks of recovery.

### Case Study 2: Detection Engineering Program Build
A financial services company built a detection engineering program from scratch, starting with 35 detection rules covering the top-10 MITRE ATT&CK techniques used against their industry. Over 18 months, they grew to 180 rules covering 110 techniques. Key success factors: dedicated detection engineering team (2 FTEs), bi-weekly purple team exercises, false positive rate target of 3%, and quarterly rule review and cleanup.

### Case Study 3: XDR Correlation Uncovers Advanced Persistent Threat
A SaaS company using Microsoft 365 Defender (XDR) detected a low-confidence EDR alert on a developer workstation. XDR correlation revealed: the endpoint alert was preceded by a phishing email (MDO detected), followed by anomalous Azure AD authentication from a new location (identity layer). The XDR correlation created a high-confidence incident that would have been missed by any single sensor. Investigation uncovered a sophisticated credential access campaign targeting 3 additional employees. All compromised accounts were secured within 2 hours.

## Rules
- Every endpoint must have EDR agent installed and reporting within 24 hours of provisioning.
- Detection rules mapped to MITRE ATT&CK techniques with coverage measurement.
- Alert triage completed within SLAs: Critical 15 min, High 30 min, Medium 1 hour.
- False positive rate per rule tracked and kept under 5%.
- EDR agents excluded from known-good software to reduce noise.
- Platform coverage includes Windows, macOS, and Linux endpoints.
- EDR integration with SIEM enabled for centralized alert correlation.
- Automated response actions tested in staging before production enablement.
- Purple team exercises conducted quarterly to validate detection coverage.
- Detection rules reviewed and tuned quarterly for continued effectiveness.
- Incident investigation playbooks documented for top-20 ATT&CK techniques.
- Post-incident reviews conducted within 5 business days of containment.
- Intelligence from incidents fed back into detection engineering.
- Endpoint coverage audited weekly with remediation for gaps.
- EDR platform performance impact monitored and maintained under 3% CPU.
- Security tool exclusions reviewed quarterly for changes.

## References
  - references/detection-engineering.md -- Detection Engineering
  - references/edr-deployment.md -- EDR Deployment
  - references/edr-detection-rules.md -- EDR Detection Rule Patterns
  - references/edr-detection-engineering.md -- EDR Detection Engineering Reference
  - references/edr-platforms.md -- EDR/XDR Platform Comparison
  - references/edr-xdr-advanced.md -- EDR/XDR Advanced Topics
  - references/edr-xdr-fundamentals.md -- EDR/XDR Fundamentals
  - references/incident-investigation.md -- EDR Incident Investigation
  - references/xdr-correlation-analytics.md -- XDR Correlation and Analytics Reference
## Handoff
Alerts flow to siem-engineering for correlation. Investigation results feed threat-intelligence for IoC extraction.
## Implementation Patterns

### Observer Pattern for Event Handling
`
interface EventObserver<T> {
  onEvent(event: T): Promise<void>;
}

class EventBus<T> {
  private observers: Set<EventObserver<T>> = new Set();
  subscribe(observer: EventObserver<T>): void {
    this.observers.add(observer);
  }
  unsubscribe(observer: EventObserver<T>): void {
    this.observers.delete(observer);
  }
  async emit(event: T): Promise<void> {
    const results = Array.from(this.observers).map(o => o.onEvent(event));
    await Promise.allSettled(results);
  }
}
`

### Configuration-Driven Approach
`
config:
  defaults:
    timeout: 30s
    retryCount: 3
  overrides:
    production:
      timeout: 60s
      retryCount: 5
    development:
      timeout: 300s
      retryCount: 1
`

## Production Considerations

### Deployment Checklist
- [ ] Configuration validated against schema before startup
- [ ] Health check endpoints registered and monitored
- [ ] Graceful shutdown with draining period (30s timeout)
- [ ] Resource limits configured (CPU, memory, file descriptors)
- [ ] Log level set appropriate for environment
- [ ] Metrics endpoint secured and exposed
- [ ] Rate limiting configured per-tier
- [ ] TLS certificates valid and auto-renewing
- [ ] Database migrations run as separate deployment step
- [ ] Feature flags ready for gradual rollout

### Monitoring and Alerting
| Metric | Threshold | Severity | Action |
|--------|-----------|----------|--------|
| Error rate | > 1% over 5min | Critical | Page on-call |
| p99 latency | > 2s over 5min | Warning | Investigate |
| Throughput drop | > 50% over 1min | Critical | Check upstream |
| Queue depth | > 1000 over 1min | Warning | Scale consumers |
| Disk usage | > 85% | Warning | Clean or expand |
| Memory usage | > 90% heap | Critical | Restart or scale |

## Anti-Patterns

| Anti-Pattern | Symptom | Root Cause | Solution |
|-------------|---------|------------|----------|
| Premature optimization | Complex code for no measured benefit | Guessing instead of profiling | Measure first, optimize based on data |
| Copy-paste reuse | Duplicate code across codebase | Lack of abstraction | Extract shared logic into libraries |
| Gold-plating | Features with no current requirement | Over-engineering | YAGNI — build what's needed now |
| Magical thinking | Assumptions without validation | Skipping error handling | Handle all failure modes explicitly |

## Performance Optimization

### Caching Strategy
Cache hierarchy: L1 (in-memory local) → L2 (distributed Redis/Memcached) → L3 (CDN/Edge).
Cache invalidation: TTL-based (simple, stale), event-based (complex, fresh), write-through (consistent, higher write latency), write-behind (fast writes, eventual consistency).

### Resource Pooling
- Database connections: Pool of reusable connections (HikariCP, pgBouncer)
- HTTP connections: Keep-alive + connection pooling for external calls
- Thread pool: Bounded thread pools for async task execution

### Profiling Methodology
1. Establish baseline with production traffic profile
2. Profile CPU with sampling profiler (pprof, perf, async-profiler)
3. Profile memory with heap dumps and allocation tracking
4. Profile I/O with strace/perf trace for syscall analysis
5. Profile latency with distributed tracing (OpenTelemetry)
6. Identify bottleneck, formulate hypothesis, implement fix
7. Re-profile to verify improvement, repeat

## Security Considerations

### Threat Modeling (STRIDE)
- Spoofing: Identity validation, authentication
- Tampering: Integrity checks, digital signatures
- Repudiation: Audit logs, non-repudiation
- Information disclosure: Encryption, access control
- Denial of service: Rate limiting, resource quotas
- Elevation of privilege: Principle of least privilege

### Supply Chain Security
- Dependency scanning: Snyk, Dependabot, Trivy
- SBOM generation: CycloneDX or SPDX format
- Signed commits: GPG or SSH commit signing
- Artifact verification: Checksum validation, signature verification

### Secrets Management
- Secrets never in code — always in secrets manager (Vault, AWS Secrets Manager)
- Rotation policy: Rotate database credentials every 90 days
- Access audit: Log every secrets access, alert on anomalies
- Encryption at rest and in transit for all secrets
- Principle of least privilege: each service gets only its own secrets

## Rules
- Default-deny security posture — allow only explicitly required access.
- All inputs validated, all outputs encoded, all errors handled.
- Defend in depth — multiple layers of security controls.
- Fail securely — errors default to safe behavior.
- Log security-relevant events for audit and investigation.
- Keep dependencies updated — automate vulnerability scanning.
- Design for observability from day one, not as an afterthought.
- Document all architectural decisions with rationale.
- Review code for security, performance, and correctness before merging.