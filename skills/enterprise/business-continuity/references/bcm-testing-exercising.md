# BCM Testing and Exercising

## Overview

This reference covers the design, execution, and evaluation of Business Continuity Management (BCM) tests and exercises. It provides detailed guidance on tabletop exercises, technical failover drills, full-scale BCP exercises, chaos engineering, after-action reviews, and continuous improvement programs.

## Testing Framework

### EXERCISE Methodology

A six-phase approach to BCM testing:

Phase 1 - Establish: Define exercise objectives, scope, scenarios, success criteria, and participants. Align with regulatory requirements and organizational risk appetite.

Phase 2 - eXecute: Conduct the exercise according to the scenario plan. Observe participant actions, decisions, and communication. Document timeline and deviations from expected behavior.

Phase 3 - Evaluate: Assess performance against success criteria. Identify strengths, weaknesses, gaps, and improvement opportunities. Measure against RTO/RPO targets.

Phase 4 - Report: Produce after-action report documenting findings, root causes, and recommendations. Distribute to participants and leadership.

Phase 5 - Improve: Assign action items from findings. Track remediation to closure. Update runbooks, procedures, and training materials.

Phase 6 - Cycle: Schedule next exercise incorporating lessons learned. Escalate scope and complexity progressively.

### Exercise Types and Cadence

| Exercise Type | Frequency | Duration | Participants | Complexity |
|---------------|-----------|----------|--------------|------------|
| Tabletop exercise | Quarterly | 1-2 hours | Management + key staff | Low |
| Technical failover drill | Semi-annual | 2-4 hours | Engineering team | Medium |
| Integrated communications drill | Semi-annual | 1 hour | Communications + leadership | Low |
| Full BCP exercise | Annual | 4-8 hours | All stakeholders | High |
| Vendor failover test | Annual | 1-2 hours | Engineering + vendor | Medium |
| Chaos engineering experiment | Quarterly | 2-4 hours | Engineering | High |

### Progressive Complexity Model

Start simple, increase complexity over time:

Year 1 Focus: Basic awareness and single-system failover
- Tabletop: simple scenario (server room fire)
- Technical: single-database failover
- Validation: RTO met, team knew roles

Year 2 Focus: Multi-system coordination
- Tabletop: complex scenario (ransomware)
- Technical: full application failover (multi-region)
- Communications: customer notification drill
- Validation: RTO met with cross-team coordination

Year 3 Focus: Integrated and realistic scenarios
- Tabletop: compound scenario (vendor failure + regional outage)
- Technical: simultaneous failover of multiple Tier-1 services
- Full integrated: end-to-end with vendor fallback, comms, and recovery
- Chaos: random production failure injection
- Validation: RTO met under realistic conditions, team handled stress

## Tabletop Exercises

### Exercise Design

Scenario Selection:
- Vary scenarios across exercises (not always the same one)
- Use real near-misses and industry incidents as inspiration
- Include a surprise inject halfway through (new information that changes the situation)
- Test decision-making under pressure, not just procedure execution

Scenario Sources:
- Previous year's real incidents
- Industry BCM publications (cyber attacks, natural disasters)
- Risk register top items
- Audit findings and compliance requirements
- "What keeps you up at night" from executive team

### Tabletop Format

Standard 2-hour tabletop agenda:

```
0:00-0:10 - Introduction and scenario briefing
  - Exercise objectives
  - Scenario description (disclosed now)
  - Participant roles and rules

0:10-0:30 - Initial response
  - First 15 minutes of the incident
  - Decision: Is this a declared incident? Who decides?
  - Decision: What comms go out immediately?

0:30-0:50 - Escalation
  - T+30 minutes, situation worsening
  - New information injected
  - Decision: Escalate to Sev-1? Involve executives?

0:50-1:10 - Recovery planning
  - T+60 minutes, situation understood
  - Decision: Failover or wait? Manual workaround?
  - Decision: Customer communication approach?

1:10-1:30 - Extended scenario
  - New inject: secondary failure or complication
  - Decision: Full failover? Vendor fallback activation?

1:30-1:50 - Post-incident
  - Incident resolved (or in recovery)
  - Decision: Post-incident review timing and scope
  - Decision: What gets communicated externally?

1:50-2:00 - Debrief and lessons
  - What went well?
  - What would we do differently?
  - Immediate action items
```

### Tabletop Facilitation Guide

Before the exercise:
- Prepare scenario injects on cards
- Set up communication channels (Slack, Zoom)
- Brief observers (they take notes, do not participate)
- Confirm participant attendance

During the exercise:
- Present scenario injects on schedule
- Do not let participants research answers (test knowledge, not Google skills)
- Push for decisions under time pressure
- Note where the team gets stuck or disagrees
- Keep time strictly

After the exercise:
- Facilitate debrief discussion
- Capture action items with owners
- Do not assign blame (this is a learning exercise)
- Thank participants for their time and candor

### Sample Tabletop Scenarios

1. Regional Cloud Outage: "AWS us-east-1 has experienced a full control plane outage. All services in us-east-1 are unavailable. It has been 10 minutes and there is no ETA for restoration. Your service runs in us-east-1 with a warm standby in us-west-2."

2. Ransomware: "The IT team reports that all database servers are showing ransomware notes. The backups for the last 7 days are also encrypted. One database (user-data) was on immutable backup storage. You are at T+0 of the incident."

3. Insider Threat: "The security team detected a large data export from the CRM system at 3 AM. The export was performed using the admin account of a recently terminated employee whose access was not revoked. It is now 8 AM and 100k customer records have been exfiltrated."

4. Supply Chain Attack: "A critical third-party library used by your application has been compromised. The CVE disclosure indicates it has been in your production environment for 6 weeks. You need to decide whether to take the service offline or continue operating with the vulnerable library."

5. Key Person Loss: "Your lead database administrator, the only person who knows the master encryption key and the DR failover procedure, was in a car accident and is unavailable. You need to failover the database due to a storage array failure. It is Friday at 5 PM."

## Technical Failover Drills

### Drill Types

Documented Failover: Execute the failover procedure from the runbook. Validate that the procedure is correct and complete. Measure time to complete.

Automated Failover: Trigger the automated failover mechanism. Validate that automation works without manual intervention. Measure time from trigger to recovery.

Chaos-Induced Failover: Introduce a real failure (kill a service, disconnect a network, corrupt data). Observe whether failover triggers automatically. Validate that monitoring detects and response mechanisms activate.

Negative Testing: Introduce conditions that should NOT trigger failover. Validate that the system distinguishes between failure and normal conditions.

### Failover Drill Checklist

Pre-Drill:
- [ ] Drill schedule communicated to all stakeholders
- [ ] Drill scope documented (what will fail, what will not)
- [ ] Blast radius controls in place (prevent real customer impact)
- [ ] Monitoring configured for drill tracking
- [ ] Rollback procedure documented
- [ ] Communication templates prepared ("This is a drill" messaging)
- [ ] Observers assigned to document timeline
- [ ] Stakeholder notified of drill start

During Drill:
- [ ] Failure or trigger initiated at T+0
- [ ] Detection time recorded (alert fires)
- [ ] Response time recorded (team acknowledges)
- [ ] Failover initiated time recorded
- [ ] Failover completion time recorded (service available)
- [ ] Data validation completed
- [ ] Rollback capability verified (if applicable)
- [ ] Communication sent at expected intervals
- [ ] All steps documented with timestamps

Post-Drill:
- [ ] Service verified healthy and all monitoring green
- [ ] Cleanup completed (no test artifacts in production)
- [ ] After-action debrief conducted
- [ ] Action items captured in tracking system
- [ ] Report distributed to stakeholders

### Measuring Failover Success

Primary Metrics:
- Detection time: Time from failure to alert
- Decision time: Time from alert to failover decision
- Execution time: Time from decision to service available
- Total Recovery Time: Detection + Decision + Execution
- Data Loss: Number of transactions lost (measure RPO adherence)
- Error Budget Consumption: Impact on availability SLA

Secondary Metrics:
- Runbook accuracy: Were procedures correct? How many deviations?
- Automation effectiveness: What percentage of steps were automated?
- Human error rate: How many mistakes were made under pressure?
- Communication effectiveness: Were stakeholders informed on time?
- Vendor responsiveness: Did vendors meet their escalation SLAs?

### Multi-Service Failover Coordination

When multiple Tier-1 services need to failover simultaneously:

Dependency ordering: Failover downstream dependencies first, then upstream services. Database before API, API before UI.

Communication synchronization: Coordinate status page updates, customer notifications, and internal updates to provide a unified message.

Capacity management: Verify destination region has capacity for all failed-over services. Activate additional capacity before initiating failover.

Testing approach: Start with one service at a time, then two simultaneously, then all Tier-1. Each level adds complexity and coordination overhead.

## Full BCP Exercise

### Exercise Scope

A full BCP exercise tests the entire organization's ability to respond to and recover from a major disruption:

In Scope:
- All Tier-1 and Tier-2 services
- Crisis communication plan (internal and external)
- Vendor fallback activation
- Alternate work arrangements (remote work, alternate site)
- Executive decision-making and escalation
- Regulatory notification procedures
- Insurance claim process notification

Not in Scope (typically):
- Financial transactions (use test accounts)
- Customer-facing communications (draft only, not send)
- Legal proceedings (notify but do not simulate)
- Physical security incidents (security team separate exercise)

### Full Exercise Schedule

```
Day 1 - Planning:
  T-4 weeks: Exercise objectives and scenario approved by executive
  T-2 weeks: All participants confirmed and briefed on exercise mechanics
  T-1 week: Infrastructure prepared (test environments ready)
  T-1 day: Final briefing for exercise controllers

Day 2 - Exercise Execution:
  07:00 - Controllers inject initial scenario
  07:15 - First alert expected
  07:30 - Incident commander declared, war room opened
  08:00 - First status page update
  09:00 - Technical failover initiated
  10:00 - Vendor fallback activated
  11:00 - Customer communication drafted and approved
  12:00 - Mid-exercise review (status check with controllers)
  13:00 - Recovery phase started
  14:00 - Services declared recovered
  15:00 - Customer communication: all-clear message
  16:00 - Post-incident review initiated
  17:00 - Exercise ends, controller debrief

Day 3 - After-Action:
  09:00 - Initial findings review with participants
  10:00 - Action items drafted, owners assigned
  14:00 - Executive summary prepared and distributed
```

### Controller Role

Exercise controllers are responsible for:
- Injecting scenario events on schedule
- Simulating external parties (vendors, customers, regulators, press)
- Observing participant actions and decisions (not participating)
- Maintaining realism (e.g., simulating system responses, not revealing it is a test)
- Ensuring safety (intervening if exercise might cause real damage)
- Documenting observations for after-action report

Controllers should have:
- Complete knowledge of the exercise scenario
- Authority to end the exercise if needed
- Communication channel separate from participants
- Experience with BCM and incident response

## Vendor Failover Testing

### Vendor Fallback Activation Test

Test the process of switching from a primary vendor to the designated fallback:

Test scenarios:
1. DNS switch: Change DNS to point to alternative provider. Measure propagation time.
2. API key switch: Activate secondary API key. Validate traffic flows to fallback.
3. Configuration change: Modify application configuration to use fallback endpoint. Measure time and error rate during transition.
4. Manual process activation: Execute manual workaround procedure. Validate that the team can follow the runbook under time pressure.

Vendor testing considerations:
- Coordinate with vendors (they may have rate limits or throttling)
- Test in staging first, then production with limited traffic
- Document actual switchover time (vs documented SLA)
- Validate fallback capacity (the fallback may not handle full load)
- Test both directions: switch to fallback and switch back

## Chaos Engineering

### Integration with BCM Testing

Chaos engineering validates that the system survives unexpected failures:

GameDay approach:
1. Define hypothesis: "System will continue serving traffic if us-east-1 AZ fails"
2. Define blast radius: traffic limited to 5% of production users
3. Introduce failure: Terminate all EC2 instances in one AZ
4. Observe: Does the system behave as expected?
5. Record: Metrics, observations, unexpected behaviors
6. Remediate: Fix gaps identified

BCM-focused chaos experiments:
- Kill a database primary (validate automated failover)
- Block network to a cloud provider region (validate multi-region routing)
- Expire TLS certificates (validate monitoring detects)
- Saturate CPU on 50% of nodes (validate auto-scaling)
- Introduce packet loss on cross-region link (validate replication resilience)

### Safety Mechanisms

Before running chaos experiments in production:
- Define a clear stop condition (if error rate > X, abort)
- Maintain a manual abort button (process kill switch)
- Start with low blast radius, increase gradually
- Run during low-traffic periods initially
- Have the rollback plan ready before starting
- Communicate the experiment schedule broadly
- Document lessons even from aborted experiments

## After-Action Review (AAR)

### AAR Structure

An effective after-action review has five sections:

1. Timeline: Chronological sequence of events with timestamps. Objective facts only.

2. What Went Well: Actions, decisions, or processes that worked as expected. Reinforce these.

3. What Went Wrong: Actions, decisions, or processes that failed. Focus on system, not individuals.

4. Gaps and Root Causes: Systematic issues identified. Not just symptoms.

5. Action Items: Specific, measurable, owned, dated improvements.

### Root Cause Analysis for BCM Gaps

Common root cause categories:

Process Gaps:
- Runbook missing or inaccurate
- Decision authority unclear
- Communication template not available
- Escalation path not documented
- Too many manual steps

Technology Gaps:
- Monitoring did not detect the failure
- Automation script failed or was not available
- Insufficient capacity in failover region
- Replication lag higher than assumed
- Backup could not be restored in RTO

People Gaps:
- Roles and responsibilities not clear
- Team member not available during incident
- Lack of training on specific procedure
- Decision paralysis under pressure
- Communication breakdown between teams

### Action Item Tracking

Each action item from an AAR should include:
- ID: Unique identifier
- Description: What needs to be done
- Owner: Person accountable
- Due Date: When it must be completed
- Priority: Critical / High / Medium / Low
- Status: Open / In Progress / Verified / Closed
- Verification Method: How to confirm completion

Track in the same system used for operational issues (Jira, Asana, etc.). Include in weekly operational review until closure.

## Testing Program Maturity

### Maturity Levels

Level 1 - Ad Hoc: Tests conducted irregularly. Often only when required by compliance. No standard methodology. Results not tracked.

Level 2 - Defined: Test schedule established. Tabletop exercises and basic technical drills conducted. After-action reports produced. Some action items tracked.

Level 3 - Managed: All exercise types executed on schedule. Comprehensive metrics collected. Action items tracked to closure. Test scope covers all Tier-1 services.

Level 4 - Integrated: Exercises coordinate across teams and vendors. Chaos engineering integrated into testing program. Progressive complexity model followed. Findings drive continuous improvement.

Level 5 - Optimized: Testing program is risk-driven (scenarios based on current threat landscape). Automated chaos experiments run continuously. Results published and reviewed by executive leadership. Testing investment proportional to risk.

### Maturity Assessment

For each exercise type, assess:
1. Frequency: Is it happening as often as needed?
2. Coverage: Are all Tier-1 services tested? All failure scenarios?
3. Quality: Are after-action reports thorough? Are action items tracked?
4. Improvement: Is the exercise scope and complexity increasing? Are previous findings resolved?

Target: Level 3 minimum for regulated industries. Level 4 for critical infrastructure. Level 5 for advanced security programs.

## Documentation and Record Keeping

### Records to Maintain

For compliance and improvement, maintain:
- Exercise schedule (rolling 12 months)
- Exercise plans and scenarios (per exercise)
- Participant attendance records
- After-action reports (with timeline)
- Action item register (with closure evidence)
- Annual testing program summary (for executive and board)
- Regulatory compliance mapping (which exercise satisfies which requirement)

### Record Retention

- Exercise records: Minimum 3 years (or per regulatory requirement)
- After-action reports: Minimum 5 years
- Action item tracking: Until closure + 1 year
- Testing program summaries: Minimum 7 years
- Regulatory compliance evidence: Per regulatory requirement (SOC2: 2 years, ISO 22301: 3 years, PCI: 3 years, GDPR: 6 years)
