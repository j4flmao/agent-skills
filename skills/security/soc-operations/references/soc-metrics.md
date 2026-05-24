# SOC Metrics and Reporting

## Key Performance Indicators

### Time-Based Metrics

**Mean Time to Detect (MTTD)**
- Time from compromise/incident start to initial detection
- Target: < 1 hour for critical, < 4 hours for high
- Measurement: Alert creation timestamp - earliest evidence timestamp
- Improvement: Better detection rules, broader log coverage, threat intel integration

**Mean Time to Respond (MTTR)**
- Time from detection to containment/response
- Target: < 30 min for critical, < 2 hours for high
- Measurement: First response action timestamp - alert creation timestamp
- Improvement: Automated playbooks, pre-approved containment actions, runbook efficiency

**Mean Time to Triage (MTTT)**
- Time from alert creation to initial triage completion
- Target: < 10 min for critical, < 30 min for high
- Measurement: Triage completion timestamp - alert creation timestamp
- Improvement: Alert prioritization, T1 training, enrichment automation

**Mean Time to Resolve (MTTR2)**
- Time from detection to full resolution and closure
- Target: < 4 hours for critical, < 24 hours for high
- Measurement: Case closure timestamp - alert creation timestamp
- Improvement: Root cause analysis efficiency, remediation playbooks

### Volume Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| Alert Volume (daily) | Total alerts generated | < 500/day |
| Actionable Alerts | Alerts requiring investigation | < 100/day |
| Incident Volume (weekly) | Incidents created | 5-20/week |
| Escalation Rate | % escalated T1 to T2 | 10-20% |
| Auto-Closed Alerts | % closed by SOAR/automation | > 30% |

### Quality Metrics

| Metric | Description | Target |
|--------|-------------|--------|
| False Positive Rate | % of alerts confirmed FP | < 10% |
| True Positive Rate | % of alerts confirmed TP | > 60% |
| Missed Detection Rate | % of known attacks missed | < 5% |
| Detection Coverage | % MITRE ATT&CK techniques monitored | > 60% |
| Documentation Quality | Analyst case note quality score | > 80% |
| SLA Compliance | % alerts within SLA per severity | > 95% |

### Efficiency Metrics
| Metric | Description | Target |
|--------|-------------|--------|
| Alerts per Analyst/Shift | Average throughput | 30-50 |
| Cases per Analyst/Week | Incident handling capacity | 10-20 |
| Automation Rate | % of steps automated | > 50% |
| Playbook Coverage | % of scenarios with runbooks | > 80% |
| Tool Uptime | % uptime for SOC tools | > 99.5% |

## Alert Volume Trends

### Trend Analysis Dimensions
| Dimension | Questions to Answer |
|-----------|-------------------|
| By Rule | Which rules generate the most alerts? Highest FP rate? |
| By Source | Which log sources produce the most alerts? |
| By Time | Are there daily/weekly/seasonal patterns? |
| By Severity | Distribution across Low/Med/High/Critical |
| By Category | Which threat categories dominate? |
| By Entity | Which users/hosts/departments generate most alerts? |

### Monthly Alert Trend Report
```
Alert Volume Trend (Last 12 Months):
Month        Total   Critical   High   Medium   Low    FP Rate
2026-05      8,450    12        145    1,893    6,400   8.2%
2026-04      9,100    15        168    2,104    6,813   9.1%
2026-03      7,800    8         132    1,745    5,915   7.5%
2026-02      8,950    18        190    2,256    6,486   10.3%
2026-01      9,200    22        210    2,410    6,558   12.1%

Trend: Decreasing 8.2% YoY due to tuning efforts
Notable: Critical alerts down 45% from January peak
Action: Review high volume rules (83% of alert volume from top 5 rules)
```

## False Positive Analysis

### FP Trend Dashboard
| Rule Name | Total Alerts | FPs | FP Rate | Trend | Action |
|-----------|-------------|-----|---------|-------|--------|
| Suspicious PowerShell | 1,200 | 240 | 20.0% | Stable | Schedule tuning |
| Brute Force Detection | 850 | 42 | 4.9% | Improving | Monitor |
| Process from Office | 620 | 186 | 30.0% | Worsening | Immediate review |
| Beaconing Detection | 310 | 15 | 4.8% | New | Wait for more data |
| LSASS Access | 98 | 3 | 3.1% | New | Acceptable |

### FP Reduction Initiatives
| Initiative | Rules Affected | Expected FP Reduction | Timeline |
|-----------|---------------|----------------------|----------|
| VPN IP allowlist | Brute Force, GeoIP | 30% | Week 1 |
| Admin tool whitelist | Suspicious PowerShell | 40% | Week 2 |
| Office macro controls | Process from Office | 50% | Week 3-4 |
| SIEM tuning pass | All rules | 15% overall | Monthly |

## Coverage Metrics

### MITRE ATT&CK Coverage
```
Tactic                   Techniques   Covered   % Covered   Rules
Initial Access (TA0001)        10         7        70%       15
Execution (TA0002)             12         9        75%       22
Persistence (TA0003)           19        12        63%       18
Privilege Escalation (TA0004)  13         8        62%       14
Defense Evasion (TA0005)       42        18        43%       25
Credential Access (TA0006)     17        12        71%       20
Discovery (TA0007)             30        15        50%       12
Lateral Movement (TA0008)      9          7        78%       10
Collection (TA0009)            17         8        47%        6
C2 (TA0011)                    16         9        56%       15
Exfiltration (TA0010)          9          5        56%        5
Impact (TA0040)                13         8        62%       11

Overall Coverage:             207       118       57%      173
Target for coverage:          > 60%
```

### Coverage Gap Analysis
| Uncovered Technique | Risk | Priority | Remediation |
|-------------------|------|----------|-------------|
| T1562.001 (Disable/Modify Tools) | High | P1 | Add EDR tamper detection rule |
| T1546.015 (Component Object Model Hijacking) | Medium | P2 | Add registry monitoring rule |
| T1055.012 (Process Hollowing) | High | P1 | Add memory scanning detection |
| T1574.002 (DLL Sideloading) | Medium | P2 | Add file integrity monitoring |

## Executive Reporting

### Weekly SOC Report Template
```
SOC Weekly Report
Week 20, 2026
Prepared for: CISO

KEY METRICS
Total Alerts:         8,450                Down 12% WoW
Incidents Opened:     112                  Up 8% WoW
MTTD:                 45 min               Down 15% WoW
MTTR:                 1h 20min             Down 10% WoW
FP Rate:              8.2%                 Down 1.3% WoW
Open Incidents:       18                   Down 4 WoW

TOP THREATS THIS WEEK
1. Phishing - credential harvesting (23 incidents)
2. Brute force attacks on VPN (18 incidents)
3. Ransomware precursor activity (7 incidents)

HIGHLIGHTS
- New detection rules for Log4j variants deployed
- Phishing drill results showing improved user awareness
- SIEM tuning reduced total alert volume by 12%

ITEMS REQUIRING ATTENTION
- EDR coverage gap on legacy Windows 7 endpoints (42 hosts)
- VPN log source latency exceeding SLA (avg 8 min delay)
- Two SOC analyst positions still unfilled

CLOSING INCIDENTS THIS WEEK
- 18 incidents closed with root cause identified
- Average resolution time: 3.2 hours
- All critical incidents resolved within SLA
```

### Monthly Executive Summary Template
```
EXECUTIVE SUMMARY - May 2026

OVERALL SOC HEALTH: Good

HEADLINES
- MTTD improved to 45 min (target: 60 min)
- No major security incidents this month
- Two new detection rules added for Cobalt Strike

RISK LANDSCAPE
- Elevated: Ransomware targeting healthcare sector (not in our sector)
- Stable: Phishing volume consistent with previous months
- Decreased: Exploit attempts against perimeter (patching effective)

METRICS HIGHLIGHTS
                     This Month   Last Month   Target
MTTD                 45 min       53 min       < 60 min
MTTR                 1h 20min     1h 45min     < 2 hours
FP Rate              8.2%         9.5%         < 10%
Alert Volume         8,450        9,100        < 8,000
Coverage             57%          55%          > 60%

INVESTMENT NEEDED
1. Additional log storage for compliance retention
2. Threat intel platform upgrade (Q3 budget cycle)
3. Purple team exercise (August)
```

## Board-Level Dashboard

### Dashboard KPIs
| Indicator | Current | Status | Trend |
|-----------|---------|--------|-------|
| Security Incidents | 112 this month | Green | Stable |
| Mean Time to Detect | 45 min | Green | Improving |
| Mean Time to Respond | 1h 20min | Green | Improving |
| Critical/High Alerts | 157 | Amber | Increasing |
| Remediation Rate | 94% within SLA | Green | Stable |
| Open Risk Items | 12 | Amber | Decreasing |

### Risk Score Trend
| Month | Security Risk Score | Target |
|-------|-------------------|--------|
| May 2026 | 68/100 | < 70 |
| Apr 2026 | 72/100 | < 70 |
| Mar 2026 | 75/100 | < 70 |
| Feb 2026 | 78/100 | < 70 |

### Budget Efficiency
| Item | Monthly Cost | Cost per Alert | Industry Benchmark |
|------|-------------|---------------|-------------------|
| SOC Staff | $120,000 | $14.20 | $15-20 |
| SIEM Licensing | $45,000 | $5.33 | $4-8 |
| EDR Licensing | $30,000 | $3.55 | $3-5 |
| Threat Intel | $15,000 | $1.78 | $1-3 |

## Reporting Cadence
| Report | Frequency | Audience | Content |
|--------|-----------|----------|---------|
| Daily Ops Report | Daily | SOC Team | Alerts, incidents, open cases |
| Weekly SOC Summary | Weekly | SOC Manager | Metrics, trends, issues |
| Monthly Executive | Monthly | CISO, Board | KPIs, risk, budget, strategy |
| Quarterly Review | Quarterly | CISO, Audit | Coverage, maturity, roadmap |
| Annual Report | Yearly | Board, Regulators | Full year analysis, improvements |

## Dashboard Tools
- Real-time: Grafana, Splunk dashboards for live alert monitoring
- Daily: SOC shift dashboard with current metrics
- Weekly: Automated report generation from SIEM/SOAR
- Monthly: Executive summary with trend analysis
- Custom: Per-team dashboards (T1 triage, T2 investigation, threat hunting)
