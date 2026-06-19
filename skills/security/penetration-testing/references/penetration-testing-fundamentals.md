# Penetration Testing Fundamentals

## Overview
Penetration testing (pentesting) simulates real-world attacks against systems, networks, and applications to identify security vulnerabilities before attackers do. Pentesting validates security controls, uncovers unknown weaknesses, and provides actionable remediation guidance.

## Core Concepts

### Concept 1: Pentest Types
- **Black box**: No prior knowledge — simulates external attacker
- **White box**: Full knowledge — source code, credentials, architecture docs
- **Gray box**: Partial knowledge — some credentials, limited documentation
- **External**: Tests internet-facing assets (web apps, APIs, VPNs, email)
- **Internal**: Tests from inside the network (simulates compromised insider or breached perimeter)
- **API testing**: Focuses on API endpoints, authentication, authorization, and business logic
- **Mobile testing**: Android and iOS application security testing

### Concept 2: Methodology Phases
1. **Reconnaissance**: Gather information about target (passive: OSINT; active: scanning)
2. **Scanning & Enumeration**: Identify open ports, services, versions, vulnerabilities
3. **Exploitation**: Attempt to exploit discovered vulnerabilities
4. **Post-exploitation**: Determine what access was gained, pivot to other systems
5. **Lateral movement**: Move through the network to reach high-value targets
6. **Reporting**: Document findings, risk ratings, remediation steps

### Concept 3: Common Vulnerability Classes
- **OWASP Top 10 Web**: Injection (SQL, XSS, RCE), broken auth, sensitive data exposure, XXE, broken access control, misconfiguration, XSS, insecure deserialization, known vulnerable components, insufficient logging
- **Network**: Open ports, default credentials, missing patches, weak encryption
- **Cloud**: Public storage, overly permissive IAM, unencrypted data, exposed credentials
- **API**: Broken object/function-level auth, excessive data exposure, rate limiting missing

### Concept 4: Risk Ratings
Standardized vulnerability severity (CVSS 3.1):
- **Critical (9.0-10.0)**: Remote code execution, authentication bypass on critical system
- **High (7.0-8.9)**: SQL injection, privilege escalation, sensitive data exposure
- **Medium (4.0-6.9)**: XSS, information disclosure, missing security headers
- **Low (0.1-3.9)**: Minor information leaks, missing best practices

## Implementation Guide

### Step 1: Scoping and Rules of Engagement
```yaml
pentest_engagement:
  scope:
    in_scope:
      - "https://app.example.com (web application)"
      - "https://api.example.com (REST API)"
      - "VPN endpoint: vpn.example.com"
      - "Email gateway: mail.example.com"
    out_of_scope:
      - "https://admin.example.com (requires approval)"
      - "https://payments.example.com (production payment processing)"
      - "Third-party services (SaaS, CDN, monitoring)"

  rules_of_engagement:
    - "Testing allowed: Mon-Fri 08:00-20:00 UTC"
    - "No destructive actions (DROP TABLE, DELETE, FORMAT)"
    - "No denial of service attacks"
    - "No social engineering without explicit approval"
    - "No phishing without explicit approval"
    - "Stop immediately if unexpected production impact occurs"

  communication:
    - "Primary contact: security@example.com"
    - "Emergency stop: +1-555-0123 (24/7)"
    - "Daily status updates at 17:00 UTC"
    - "Critical findings reported immediately"
```

### Step 2: Reconnaissance and Scanning
```bash
# Passive reconnaissance
whois example.com
dig example.com ANY
nslookup example.com
# Subdomain enumeration
subfinder -d example.com -o subdomains.txt
# Port scanning
nmap -sV -sC -p- -oA nmap_scan example.com
# Web technology fingerprinting
whatweb -v https://app.example.com
# Directory enumeration
gobuster dir -u https://app.example.com -w /usr/share/wordlists/dirbuster/common.txt
# Vulnerability scanning
nikto -h https://app.example.com -o nikto_report.html
```

### Step 3: Web Application Testing
```python
# Automated SQL injection testing with SQLMap
sqlmap -u "https://app.example.com/products?id=1" --batch --risk=3 --level=5

# Manual XSS testing
curl -X GET "https://app.example.com/search?q=<script>alert(1)</script>"

# API testing with custom Python script
import requests

def test_auth_bypass(endpoint):
    """Test for broken object-level authorization."""
    # Authenticate as user A
    session = requests.Session()
    session.post(f"{endpoint}/login", json={"user": "user_a", "pass": "pass_a"})

    # Try to access user B's data
    response = session.get(f"{endpoint}/api/users/user_b/profile")
    if response.status_code == 200:
        print(f"VULNERABLE: BOLA found at {endpoint}/api/users/user_b/profile")
        print(f"Accessed data: {response.json()}")
```

### Step 4: Reporting
```yaml
pentest_report:
  executive_summary:
    overview: "12-week assessment of web application and API"
    critical_findings: 2
    high_findings: 5
    medium_findings: 8
    low_findings: 12
    risk_overall: "High — critical vulnerabilities require immediate remediation"

  findings:
    - id: "PT-2026-001"
      title: "SQL Injection in Product Search"
      severity: critical
      cvss: 9.8
      description: "Unsantized user input in /api/products/search allows SQL injection"
      affected_asset: "https://api.example.com/api/products/search"
      remediation: "Use parameterized queries instead of string concatenation"
      effort: "1 day"
      references: ["OWASP SQL Injection", "CWE-89"]

    - id: "PT-2026-002"
      title: "Broken Object Level Authorization in User API"
      severity: high
      cvss: 7.5
      description: "Authenticated user can access other users' profile data via IDOR"
      affected_asset: "https://api.example.com/api/users/{id}/profile"
      remediation: "Implement server-side authorization checks for every object access"
      effort: "3 days"
      references: ["OWASP API Security Top 10: API1"]
```

## Best Practices
- Define clear scope and rules of engagement before testing begins
- Use both automated scanning and manual testing — automation misses business logic flaws
- Test authentication, authorization, input validation, and session management thoroughly
- Chain vulnerabilities to demonstrate real impact (low + low = critical)
- Document findings with clear, reproducible steps and remediation guidance
- Report critical findings immediately — don't wait for final report
- Retest after remediation to verify fixes
- Follow a standard methodology (OWASP Testing Guide, OSSTMM, PTES)
- Obtain written authorization before any testing
- Use isolated testing accounts and data — don't modify production data

## Common Pitfalls
- Testing only with automated scanners (misses business logic and complex vulnerabilities)
- No scope verification before scanning (accidentally testing out-of-scope assets)
- Destructive testing without authorization (damaging production data)
- Chaining vulnerabilities to demonstrate impact (requires careful coordination with client)
- Incomplete reporting (findings without reproducible steps or remediation guidance)
- No retesting after fixes (can't verify vulnerabilities are actually resolved)
- Testing without proper authorization (legal liability)
- False positives in automated scans not manually verified
- Not testing business logic (pricing manipulation, fraud, privilege escalation)

## Key Points
- Pentesting simulates real attacks to find vulnerabilities before attackers do
- Follow established methodology: recon → scanning → exploitation → post-exploitation → reporting
- Use both automated and manual testing techniques
- Test web, API, network, cloud, and mobile attack surfaces
- Risk-rate findings with CVSS: Critical, High, Medium, Low
- Report critical findings immediately, all findings in final report
- Retest after remediation to verify fixes
- Obtain written authorization and define scope before any testing
- Chain vulnerabilities to demonstrate business impact
