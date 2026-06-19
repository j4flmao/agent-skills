# Finding Management for SAST/DAST

## Triage Workflow

### Step 1: Deduplication
- Hash-based dedup: same file + same finding type = duplicate
- Location-based dedup: same vulnerability class at same endpoint
- Cross-tool correlation: SAST SQL injection + DAST SQL injection = same root cause

### Step 2: Prioritization
```python
def prioritize_finding(finding: dict) -> int:
    """Calculate priority score (higher = fix first)."""
    score = 0
    # Severity
    severity_weights = {"critical": 100, "high": 50, "medium": 20, "low": 5}
    score += severity_weights.get(finding.get("severity", "low"), 0)
    # Exploitability
    if finding.get("exploit_publicly_available"):
        score += 30
    if finding.get("requires_auth"):
        score -= 10
    # Business impact
    if finding.get("affects_pii"):
        score += 40
    if finding.get("affects_pci"):
        score += 50
    # Confidence
    if finding.get("tool") == "SAST":
        score -= 10  # Lower confidence
    return score
```

### Step 3: Remediation SLAs
| Severity | Fix SLA | Verification |
|----------|---------|-------------|
| Critical | 24 hours | Rescan immediately |
| High | 72 hours | Rescan within sprint |
| Medium | 2 weeks | Next scheduled scan |
| Low | 1 month | Next scheduled scan |

## Key Points
- Deduplicate findings across tools using hashes and location matching
- Prioritize by severity + exploitability + business impact
- Define clear SLAs for each severity level
- Track false positive rate per tool to evaluate tool effectiveness
- Cross-reference SAST and DAST findings for the same vulnerability
- Automate triage where possible but require human review for critical decisions
