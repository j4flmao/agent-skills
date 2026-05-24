# Pentest Reporting Template

## Overview

A penetration test report communicates findings to both technical and non-technical stakeholders. This reference provides a structured template for executive summaries, detailed technical findings with CVSS scoring, remediation guidance, evidence artifacts, and retesting methodology.

## Report Structure

```yaml
report_structure:
  1. Executive Summary
  2. Scope and Methodology
  3. Risk Summary
  4. Detailed Findings (sorted by severity)
  5. Evidence Artifacts
  6. Remediation Roadmap
  7. Retesting Results
  8. Methodology and Tools
  9. Limitations
```

## Executive Summary Template

```
# Penetration Test Report — [Client Name]

**Test Date:** [Start Date] – [End Date]
**Test Type:** [External/Internal/Web App/Cloud] Penetration Test
**Testers:** [Names]
**Classification:** CONFIDENTIAL

## Executive Summary

[Client Name] engaged [Company Name] to conduct a [type] penetration test
against [target scope] from [date] to [date].

### Risk Profile

| Severity | Count |
|----------|-------|
| Critical | X |
| High     | X |
| Medium   | X |
| Low      | X |
| Info     | X |

**Overall Risk Rating:** [Critical / High / Medium / Low]

### Key Findings

1. **[Finding Name]** (Critical) — Brief description of the most critical finding
2. **[Finding Name]** (High) — Brief description  
3. **[Finding Name]** (High) — Brief description

### Critical Findings Detail

**Finding 1: [Title]**
- *Impact:* [What an attacker could do]
- *Likelihood:* [How likely this is to be exploited]
- *Business Risk:* [Business impact if exploited]
- *Immediate Recommendation:* [Quick fix]

### Strengths (What went well)
- [Positive observations: good security controls found]

### Summary
[2-3 paragraph executive summary written for non-technical stakeholders]

---

**Disclaimer:** This report contains confidential information about the security
posture of [Client Name]. Distribution should be limited to authorized personnel.
```

## Detailed Finding Template

```
## [Severity] — [Finding Name]

**Finding ID:** FIND-[XX]
**CVSSv3.1 Score:** X.X (Vector: AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H)
**CWE/CVE:** CWE-XX / CVE-YYYY-NNNN

### Description
[Technical description of the vulnerability including what it is, how it works,
and where it exists in the application/infrastructure.]

### Impact
[Description of what an attacker could achieve by exploiting this finding.
Include worst-case scenario and business impact.]

### Affected Resources
| Resource | Location |
|----------|----------|
| [Host/URL] | [Full path or IP] |
| [Endpoint] | [API path] |

### Proof of Concept

**Step 1:** [Recon/Setup]
```bash
# Command or code demonstrating the issue
curl -X GET "https://target.com/vulnerable-endpoint?id=1' UNION SELECT 1,2,sql_version(),4--"
```

**Step 2:** [Exploitation]
```bash
# Continue the POC
```

**Screenshot:**
[Reference to screenshot in evidence artifacts]

### Remediation

**Short-term Fix (Immediate):**
- [First thing to do to mitigate the risk]

**Long-term Fix (Permanent):**
- [Complete solution to prevent reoccurrence]

**References:**
- [OWASP link]
- [CWE/CVE reference]
- [Vendor documentation]

### Re-test Notes
| Attempt | Date | Tester | Status |
|---------|------|--------|--------|
| Initial | YYYY-MM-DD | Name | Open |
| Re-test | YYYY-MM-DD | Name | [Fixed/Partially Fixed/Not Fixed] |

### Timeline
| Date | Event |
|------|-------|
| YYYY-MM-DD | Finding discovered |
| YYYY-MM-DD | Reported to client |
| YYYY-MM-DD | Remediation provided |
| YYYY-MM-DD | Re-test completed |
```

## CVSS Scoring Reference

### CVSSv3.1 Scoring Table
```
SCORE RANGES:
  None:    0.0
  Low:     0.1 – 3.9
  Medium:  4.0 – 6.9
  High:    7.0 – 8.9
  Critical: 9.0 – 10.0

BASE METRIC GROUP:
  Attack Vector (AV):
    Network (N) — Remote, over network
    Adjacent (A) — Same network segment
    Local (L) — Local access required
    Physical (P) — Physical access required

  Attack Complexity (AC):
    Low (L) — No special conditions
    High (H) — Special conditions required

  Privileges Required (PR):
    None (N) — No authentication
    Low (L) — Basic user privileges
    High (H) — Admin/root privileges

  User Interaction (UI):
    None (N) — No user action needed
    Required (R) — User must take action

  Scope (S):
    Unchanged (U) — Vulnerability in same authority
    Changed (C) — Can affect resources beyond authorization

  Confidentiality (C):
    None (N) / Low (L) / High (H)

  Integrity (I):
    None (N) / Low (L) / High (H)

  Availability (A):
    None (N) / Low (L) / High (H)
```

### CVSS Calculator
```python
def calculate_cvss(av, ac, pr, ui, s, c, i, a):
    """Calculate CVSSv3.1 Base Score"""
    weights = {
        "AV": {"N": 0.85, "A": 0.62, "L": 0.55, "P": 0.2},
        "AC": {"L": 0.77, "H": 0.44},
        "PR": {"N": 0.85, "L": 0.62, "H": 0.27},
        "UI": {"N": 0.85, "R": 0.62},
        "C": {"H": 0.56, "L": 0.22, "N": 0},
        "I": {"H": 0.56, "L": 0.22, "N": 0},
        "A": {"H": 0.56, "L": 0.22, "N": 0},
    }
    
    # Calculate Impact Sub-Score (ISS)
    iss = 1 - ((1 - weights["C"][c]) * (1 - weights["I"][i]) * (1 - weights["A"][a]))
    
    # Impact
    if s == "U":
        impact = 6.42 * iss
    else:
        impact = 7.52 * (iss - 0.029) - 3.25 * ((iss - 0.02) ** 15)
    
    # Exploitability
    exploitability = 8.22 * weights["AV"][av] * weights["AC"][ac] * weights["PR"][pr] * weights["UI"][ui]
    
    # Base Score
    if impact <= 0:
        return 0
    
    if s == "U":
        base = min(impact + exploitability, 10)
    else:
        base = min(1.08 * (impact + exploitability), 10)
    
    # Round to 1 decimal
    return round(base, 1)

# Example: Remote code execution on a web server
score = calculate_cvss("N", "L", "N", "N", "C", "H", "H", "H")
print(f"CVSS Score: {score} (Critical)")  # ~10.0
```

## Risk Classification Matrix

```yaml
risk_matrix:
  critical:
    description: "Immediate remediation required. Exploitation likely with high impact."
    cvss_range: "9.0-10.0"
    remediation_sla: "24-48 hours"
    examples:
      - Remote code execution
      - SQL injection with data extraction
      - Domain admin compromise
      - Public cloud bucket with sensitive data

  high:
    description: "Remediate as soon as possible. Significant security impact."
    cvss_range: "7.0-8.9"
    remediation_sla: "5-10 business days"
    examples:
      - Stored XSS
      - Privilege escalation
      - Weak authentication
      - Sensitive data exposure

  medium:
    description: "Remediate within normal patch cycle. Moderate security impact."
    cvss_range: "4.0-6.9"
    remediation_sla: "30-60 days"
    examples:
      - Reflected XSS
      - Missing security headers
      - Information disclosure
      - Weak TLS configuration

  low:
    description: "Remediate when convenient. Minor security impact."
    cvss_range: "0.1-3.9"
    remediation_sla: "90 days"
    examples:
      - Banner/version disclosure
      - Missing HTTP security headers
      - Cookie without Secure flag
      - Unnecessary open ports
```

## Evidence Artifacts

```yaml
evidence_organization:
  structure:
    - screenshots/
    - network-scans/
    - exploitation-scripts/
    - exfiltrated-data/
    - logs/

  screenshot_naming:
    pattern: "{FINDING-ID}_{step}_{description}.png"
    example: "FIND-01_1_sql_injection_union_select.png"

  script_naming:
    pattern: "{FINDING-ID}_exploit.{py/sh/ps1}"
    example: "FIND-05_exploit.ps1"

  evidence checklist:
    - "Network scan results (nmap, masscan)"
    - "Web application crawl/screenshots"
    - "Exploitation output (commands typed, results)"
    - "Extracted data samples (not full data sets)"
    - "SQL map queries and results"
    - "Burp Suite project file"
    - "Metasploit console logs"
    - "CrackMapExec results"
    - "BloodHound JSON data"
    - "Captured password hashes (not cracked)"
```

## Finding Severity Statistics

```yaml
statistics:
  by_type:
    - "Web Application: X"
    - "Network Infrastructure: X"
    - "Active Directory: X"
    - "Cloud: X"
    - "Mobile: X"
    - "API: X"

  by_severity:
    - "Critical: X"
    - "High: X"
    - "Medium: X"
    - "Low: X"

  metrics:
    total_findings: X
    auth_tests_performed: X
    endpoints_tested: X
    hosts_scanned: X
    test_hours: X
```

## Remediation Roadmap Template

```
## Remediation Roadmap

### Phase 1 — Immediate (0-30 days)
| Finding ID | Finding | Owner | Target Date |
|------------|---------|-------|-------------|
| FIND-01 | [Critical finding] | [Owner] | [Date] |
| FIND-02 | [Critical finding] | [Owner] | [Date] |

### Phase 2 — Short-term (30-60 days)
| Finding ID | Finding | Owner | Target Date |
|------------|---------|-------|-------------|
| FIND-03 | [High finding] | [Owner] | [Date] |
| FIND-04 | [High finding] | [Owner] | [Date] |

### Phase 3 — Long-term (60-90 days)
| Finding ID | Finding | Owner | Target Date |
|------------|---------|-------|-------------|
| FIND-05 | [Medium finding] | [Owner] | [Date] |
| FIND-06 | [Medium finding] | [Owner] | [Date] |
```

## Retesting Methodology

```yaml
retesting:
  process:
    - "Client provides remediation list and timeline"
    - "Review remediation actions and verify completeness"
    - "Re-attack each finding with original POC"
    - "Escalate if remediation is partial (bypass attempts)"
    - "Document retest status for each finding"
    - "Provide final retest report"

  status_definitions:
    Fixed:
      - "Original exploit no longer works"
      - "No bypass found"
      - "Control properly implemented"
    Partially_Fixed:
      - "Original exploit blocked"
      - "Bypass found with different technique"
      - "Edge case remains vulnerable"
    Not_Fixed:
      - "No remediation evident"
      - "Original exploit still works"
      - "Incorrect remediation applied"

  retest_scoping:
    - "100% of Critical and High findings"
    - "Sampling of Medium findings (20-30%)"
    - "Pre-defined Low findings only"
```

## Report Distribution

```yaml
distribution:
  full_technical_report:
    - "CISO"
    - "Security Team Lead"
    - "IT Infrastructure Lead"
    - "Application Development Lead"

  executive_summary_only:
    - "CEO / Board of Directors"
    - "VP of Engineering"
    - "Legal / Compliance"
```
