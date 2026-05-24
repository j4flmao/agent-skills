# Incident and Problem Management

## Introduction

Incident management restores normal service operation as quickly as possible while minimizing business impact. Problem management diagnoses root causes and prevents recurrence. Together they form the core of ITIL service operations.

## Incident Management

### Incident Definition
An unplanned interruption to an IT service or reduction in quality. Incidents are deviations from expected service behavior.

### Incident Priority Matrix
| Priority | Definition | Response Time | Resolution Time | Escalation |
|----------|------------|---------------|-----------------|------------|
| P1 -- Critical | Service down affecting all users, major business impact | <= 15 minutes | <= 4 hours | Incident Manager, IT Director |
| P2 -- High | Service severely degraded, significant user impact | <= 30 minutes | <= 8 hours | Incident Manager, Service Owner |
| P3 -- Medium | Service partially affected, workaround available | <= 2 hours | <= 48 hours | Team Lead |
| P4 -- Low | Minor issue, no business impact | <= 8 hours | <= 5 business days | Service Desk |

### Incident Lifecycle
1. **Detection and Logging**: User reports or monitoring tool detects
2. **Categorization**: Assign category and subcategory for trending
3. **Prioritization**: Determine priority based on impact and urgency
4. **Initial Diagnosis**: Service desk attempts first-line resolution
5. **Escalation**: Functional (to technical team) or hierarchical (to management)
6. **Investigation and Diagnosis**: Technical team identifies root cause
7. **Resolution and Recovery**: Apply fix or workaround
8. **Closure**: Verify with user, update record, categorize resolution

### Major Incident Process
A major incident has significant business impact and requires dedicated management.

| Step | Activity | Owner | Duration |
|------|----------|-------|----------|
| 1 | Declare major incident | Service Desk | Immediate |
| 2 | Assemble bridge call | Incident Manager | <= 5 minutes |
| 3 | Assign major incident lead | Incident Manager | <= 10 minutes |
| 4 | Communicate to stakeholders | Communications Lead | Ongoing |
| 5 | Investigate and resolve | Technical Teams | Per SLA |
| 6 | Service restoration | Technical Teams | Priority |
| 7 | Major incident review | Incident Manager | Within 5 business days |

### Major Incident Communication Template
```
Subject: [MAJOR INCIDENT] P1 -- {Service Name} -- {Status}
Current Status: Investigating / Resolved / Monitoring
Impact: {affected systems, users, business processes}
Start Time: {timestamp}
Estimated Resolution: {ETA or TBD}
Bridge: {conference details}
Next Update: {time}
Incident Lead: {name}
```

## Problem Management

### Problem Definition
The underlying cause of one or more incidents. Problems are identified through trend analysis of incidents or root cause analysis of major incidents.

### Problem vs. Incident

| Aspect | Incident | Problem |
|--------|----------|---------|
| Focus | Restore service | Find root cause |
| Activities | Diagnosis, workaround, resolution | Analysis, investigation, permanent fix |
| Timeline | Hours to days | Days to weeks |
| Priority | Based on business impact | Based on frequency and severity |
| Outcome | Service restored | Known error identified or root cause eliminated |
| Process | Reactive (triggered by incident) | Proactive (trend analysis) or Reactive (triggered by incident) |

### Problem Management Process

#### Reactive Problem Management
1. **Problem Detection**: Identify through incident clustering or major incident review
2. **Problem Logging**: Record in problem management system with reference incidents
3. **Categorization**: Assign category, impact, and priority
4. **Investigation and Diagnosis**: Root cause analysis (RCA)
5. **Workaround Creation**: Document temporary fix if possible
6. **Known Error Record**: Create known error record (moved to KEDB)
7. **Resolution**: Identify permanent fix (change request may be required)
8. **Closure**: Verify fix effectiveness, update knowledge base

#### Proactive Problem Management
1. **Trend Analysis**: Analyze incident data for patterns and recurring issues
2. **Target Identification**: Select high-value or high-frequency problems
3. **Cost Justification**: Calculate cost of resolution vs. cost of incidents
4. **Investigation**: Analyze infrastructure and processes for weaknesses
5. **Recommendation**: Suggest preventive actions to service management

### Known Error Database (KEDB)

| Field | Description | Example |
|-------|-------------|---------|
| KEDB ID | Unique identifier | KEDB-001234 |
| Error Description | Description of the known error | Memory leak in application module X |
| Affected Services | Services impacted | Payment Gateway Service |
| Symptoms | Observable effects | Gradual performance degradation over 72 hours |
| Root Cause | Underlying cause | Unreleased database connections |
| Workaround | Temporary fix to restore service | Restart application service every 48 hours |
| Permanent Fix | Final resolution scheduled | Upgrade to application version 5.2 |
| Related Problems | Linked problem IDs | PRB-000567 |
| Related Incidents | Linked incident IDs | INC-001234, INC-001235 |
| Status | Active / Resolved / Pending Change | Active |

## Root Cause Analysis (RCA)

### RCA Methodologies
| Methodology | Approach | Best For |
|-------------|----------|----------|
| 5 Whys | Iterative questioning to drill to root cause | Simple to moderately complex problems |
| Fishbone Diagram | Categorize causes (People, Process, Technology, etc.) | Multi-factor problems |
| Fault Tree Analysis | Top-down deductive failure analysis | Complex system failures |
| Kepner-Tregoe | Structured rational analysis process | Decision-making under uncertainty |

### RCA Report Structure
```
1. Incident Summary
   - Incident ID, date, affected service, business impact
2. Timeline
   - Chronological sequence of events
3. Root Cause
   - Direct and contributing causes identified
4. Contributing Factors
   - Systemic issues that enabled the incident
5. Resolution
   - Actions taken to restore service
6. Corrective Actions
   - Permanent fixes with owners and deadlines
7. Preventive Measures
   - Changes to prevent recurrence
8. Lessons Learned
   - Process improvements identified
```

### Problem Priority Matrix
| Priority | Criteria | Target Resolution |
|----------|----------|-------------------|
| Critical | Frequent P1 incidents, major business risk | <= 5 business days |
| High | Recurring incidents, significant business impact | <= 15 business days |
| Medium | Multiple incidents, moderate impact | <= 30 business days |
| Low | Occasional incidents, minimal impact | Next release cycle |

## Workaround Management

### Workaround Criteria
- Restores service functionality
- Does not introduce security risk
- Is documented in KEDB
- Has clear applicability conditions
- Is time-boxed with permanent fix planned

### Workaround Lifecycle
Identify -> Validate -> Document -> Communicate -> Apply -> Track -> Replace with permanent fix
