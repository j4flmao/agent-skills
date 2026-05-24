# Process Modeling

## AS-IS vs TO-BE Modeling

### AS-IS Process Model
Documents the current state — how the process actually works today (not how it should work).

**Purpose**: Baseline for improvement, identify pain points, understand actual workflow
**Key questions**:
- What actually happens today (vs what the procedure says)?
- Where are the delays, rework loops, handoffs?
- Where do errors occur and what causes them?
- What workarounds exist and why?
- Who actually does each step (vs who is supposed to)?

**Method**: Observe, interview participants, shadow operations, analyze system logs

### TO-BE Process Model
Designs the future state — the improved process you want to implement.

**Purpose**: Define target state, design improvements, plan automation
**Key questions**:
- What would the ideal workflow look like?
- Which steps can be eliminated, automated, or streamlined?
- How do we reduce handoffs and cycle time?
- Where do we add compliance controls and monitoring?
- How does this integrate with adjacent processes?

**Gap analysis**: Document the delta between AS-IS and TO-BE to scope the implementation.

### Example Gap Analysis
```
| Dimension | AS-IS | TO-BE | Gap |
|-----------|-------|-------|-----|
| Cycle time | 5.2 days average | < 1 day | Eliminate manual approval step |
| Handoffs | 7 handoffs | 3 handoffs | Consolidate review stages |
| Error rate | 12% of orders | < 2% | Add validation at point of entry |
| Automation | 0% (all manual) | 80% automated | Build integration with ERP |
| Visibility | No tracking | Real-time dashboard | Add monitoring and alerts |
```

## Process Discovery Techniques

| Technique | Method | Best For | Time Required |
|-----------|--------|----------|---------------|
| **Stakeholder interview** | 1-on-1 structured interview | Complex knowledge, expert perspective | 1-2 hours per interviewee |
| **Workshop** | Group session with process walk-through | Alignment across multiple stakeholders | 2-4 hours per session |
| **Observation** | Shadow participants performing the work | Understanding actual vs documented process | 1-2 hours per shift |
| **System log analysis** | Extract event logs from system audit trails | Objective view of system-side process | 1-5 days (technical) |
| **Document review** | Read SOPs, training docs, compliance manuals | Understanding intended process | 2-8 hours |
| **Process mining** | Automated extraction from event logs | Data-driven process discovery | Tool setup + analysis |

### Process Discovery Interview Protocol
```
Interviewee: {role, tenure, involvement}
Process: {name}

Questions:
1. Walk me through your day when this process runs — start at the trigger
2. What systems and tools do you touch?
3. Who do you interact with? Who gives you input? Who receives your output?
4. What goes wrong most often?
5. What workarounds have you developed?
6. If you could change one thing, what would it be?
7. What would you never change? (what works well)
8. Are there exceptions or special cases? How do you handle them?
```

## Process Levels (L1-L5)

| Level | Name | Audience | Detail | Example |
|-------|------|----------|-------|---------|
| **L1** | Value Chain | C-level executives | End-to-end value streams, no swimlanes | "Order to Cash", "Procure to Pay" |
| **L2** | Process Group | Directors, VPs | Major process groups with handoffs | "Sales → Order Management → Fulfillment → Billing" |
| **L3** | Process | Managers, Architects | Detailed flow with swimlanes, all major paths | Full order fulfillment with departments |
| **L4** | Subprocess | Implementation team | Technical detail, decision criteria, exceptions | Order validation rules, payment gateway integration |
| **L5** | Task/Step | Developer, operator | Atomic instructions for a single task | SQL query, API call, screen field entry |

### When to Use Each Level
- **L1-L2**: Strategy, budget planning, organizational alignment
- **L3**: Process improvement projects, process ownership definition
- **L4**: Automation design, SOP documentation, compliance audits
- **L5**: Implementation, training materials, user guides

## Process Catalog

A structured inventory of all processes in the organization. Example:

```
Process Group: Order to Cash (L1)

| Process ID | Process Name (L2) | Owner | Criticality | L3 Count | Automated? |
|------------|-------------------|-------|-------------|----------|------------|
| O2C-01 | Order Management | Head of Sales | High | 4 | Partial |
| O2C-02 | Credit Check | Credit Manager | High | 2 | Yes |
| O2C-03 | Fulfillment | Ops Director | High | 3 | No |
| O2C-04 | Shipping | Logistics Lead | Medium | 2 | Partial |
| O2C-05 | Billing | Finance Director | High | 3 | Yes |
| O2C-06 | Collections | Credit Manager | Medium | 2 | Partial |
```

### Process Catalog Fields
- **Process ID**: Unique identifier for process reference
- **Process Name**: Clear, business-readable name
- **Owner**: Role/person accountable for process performance
- **Criticality**: High/Medium/Low based on business impact
- **Inputs**: What triggers the process
- **Outputs**: What the process produces
- **Dependencies**: Other processes, systems, or external entities
- **Metrics**: KPIs used to measure performance
- **Current state**: AS-IS status, automation level, known issues

## Process Ownership

### Process Owner Responsibilities
- Accountable for process performance and outcomes
- Maintains the process documentation
- Approves process changes and exceptions
- Coordinates with upstream and downstream process owners
- Monitors process metrics and drives improvement
- Serves as escalation point for process issues

### RACI for Process Management
```
| Activity | Process Owner | Process Participants | Enterprise Architect | QA/Compliance |
|----------|--------------|---------------------|--------------------|---------------|
| Define process | A | C | C | C |
| Document process | R | C | C | C |
| Execute process | I | R | I | I |
| Monitor metrics | A | C | C | R |
| Improve process | A | R | C | C |
| Audit compliance | I | C | I | A/R |
```

### Process Ownership Handoff
When a process owner changes:
1. Document current process metrics and trends
2. Document open improvement initiatives
3. Document known issues and pain points
4. Schedule overlap period for knowledge transfer
5. Introduce to upstream/downstream process owners

## References
- BPMN 2.0 Specification — OMG
- Business Process Management: A Comprehensive Survey — R. Dumas et al.
- Process Mining: Data Science in Action — Wil van der Aalst
- APQC Process Classification Framework — https://www.apqc.org/
