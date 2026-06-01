# BPMN Modeling Advanced Topics

## Introduction
Advanced BPMN topics cover executable process models, integration with automation engines, DMN decision tables, performance analysis through process mining, and enterprise-wide process modeling governance.

## Executable Process Models (Level 4-5)

### BPMN 2.0 XML Structure
```xml
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
             targetNamespace="http://example.com/process">
  <process id="orderProcess" name="Order Fulfillment" isExecutable="true">
    <startEvent id="start" name="Order Received" />
    <serviceTask id="validatePayment" name="Validate Payment"
                 implementation="paymentService.validate" />
    <exclusiveGateway id="paymentStatus" name="Payment OK?" />
    <endEvent id="end" name="Order Completed" />
    <sequenceFlow id="sf1" sourceRef="start" targetRef="validatePayment" />
    <sequenceFlow id="sf2" sourceRef="validatePayment" targetRef="paymentStatus" />
    <sequenceFlow id="sf3" sourceRef="paymentStatus" targetRef="end">
      <conditionExpression>${paymentStatus == 'APPROVED'}</conditionExpression>
    </sequenceFlow>
  </process>
</definitions>
```

### Camunda-Specific Extensions
```xml
<serviceTask id="chargeCard" name="Charge Credit Card"
             camunda:class="com.example.ChargeCardDelegate"
             camunda:retryTimeCycle="R3/PT10S" />
<errorEventDefinition id="paymentError" errorRef="paymentFailed" />
```

### Implementation Patterns per Engine

| Pattern | Camunda 8 | Flowable | Temporal |
|---------|-----------|----------|----------|
| Service task | Job worker in Go/Java/JS | Spring bean delegate | Activity implementation |
| User task | Tasklist API | Form integration | Signal with external handler |
| Timer catch | Cron or duration | Cron or duration | Timer/Delay workflow |
| Message catch | Message correlation | Message event subscription | Signal with workflow ID |
| Business rule | DMN decision | DMN decision | Embedded decision logic |
| Error boundary | BPMN error + escalation | Error boundary event | Exception + retry policy |

## DMN Decision Tables for Automation

### DMN XML Example
```xml
<decision id="shippingDecision" name="Determine Shipping Method">
  <decisionTable hitPolicy="UNIQUE">
    <input id="orderTotal" label="Order Total" typeRef="number" />
    <input id="customerTier" label="Customer Tier" typeRef="string" />
    <output id="shippingMethod" label="Shipping Method" typeRef="string" />
    <rule id="r1">
      <inputEntry><text>> 100</text></inputEntry>
      <inputEntry><text>"PREMIUM"</text></inputEntry>
      <outputEntry><text>"EXPRESS"</text></outputEntry>
    </rule>
  </decisionTable>
</decision>
```

### FEEL Expressions (Friendly Enough Expression Language)
```
// Context to evaluate
{ "total": 150, "tier": "PREMIUM" }

// Returns "EXPRESS"
shippingDecision(total, tier)
```

### DMN Design Principles
| Principle | Explanation |
|-----------|-------------|
| Single purpose | One decision per table |
| Complete | Every input combination has an output |
| Consistent | No overlapping rules with different outputs |
| Atomic | Each rule tests one condition |
| Testable | Every rule can be validated independently |

## Advanced Gateway Patterns

### Complex Gateway
Used for complex synchronization conditions that cannot be expressed with AND/OR/XOR:
- Example: "Continue when 3 out of 5 parallel paths complete"
- Use sparingly — most complex conditions can be refactored into simpler patterns

### Event Subprocess
Interrupting and non-interrupting event subprocesses handle exceptions at the process level:
- Interrupting: cancels the parent activity
- Non-interrupting: runs in parallel with the parent activity
- Use for: SLA violations, timeout handling, cancellation requests

### Transaction Subprocess
Boundary for ACID transaction behavior:
- Cancel end event triggers compensation
- All completed activities in the transaction are compensated
- Use for: financial transactions, inventory reservations

## Process Mining Integration

### What is Process Mining?
Process mining extracts process models from event logs (database audit trails, application logs, system events). It compares the discovered model with the designed model to find deviations.

### Application
| Use Case | Method | Outcome |
|----------|--------|---------|
| Conformance checking | Compare event log to BPMN model | Detect deviations |
| Performance analysis | Annotate BPMN with timing data | Identify bottlenecks |
| Model discovery | Generate BPMN from event logs | Discover actual process |
| Social network analysis | Map handoffs between resources | Role optimization |

### Process Mining Tools
| Tool | Vendor | Features |
|------|--------|----------|
| Celonis | Celonis | Full process mining suite, object-centric |
| Disco | Fluxicon | Lightweight, fast model discovery |
| PM4Py | Open source | Python-based process mining library |
| Signavio | SAP | Process modeling + mining |
| ARIS | Software AG | Enterprise process analysis |

## Enterprise Process Governance

### Process Repository Structure
```
/processes/
  /domain/
    /L1-value-chain/
    /L2-process-flows/
    /L3-detailed/
    /L4-executable/
    /L5-technical/
  /shared/
    /subprocesses/
    /decision-tables/
    /data-objects/
```

### Version Control
- Store BPMN XML in Git alongside code
- Version DMN tables in the same repository
- Link process models to stories and ADRs
- Review process changes in pull requests

### Review Cadence
| Review Type | Frequency | Participants |
|-------------|-----------|--------------|
| Model validation | Per change | Process owner + participants |
| Performance review | Quarterly | Process owner + analyst |
| Governance review | Annually | Process council |
| Compliance audit | Per audit cycle | Compliance + auditor |

## Performance Optimization Patterns

### Reducing Cycle Time
| Pattern | Application | Expected Impact |
|---------|-------------|----------------|
| Parallelize sequential tasks | Independent activities | 30-50% reduction |
| Automate manual decisions | Simple rule-based decisions | 50-80% reduction |
| Remove approval steps | Low-value approvals | 20-40% reduction |
| Reduce handoffs | Resequence activities | 15-25% reduction |

### Scaling Automation
| Strategy | Description | When to Use |
|----------|-------------|-------------|
| Retry with backoff | Failed service tasks retry | Transient failures |
| Queue-based decoupling | Service tasks write to queue | High-volume processing |
| Bulk processing | Aggregate items for batch | Similar tasks, low urgency |
| Parallel execution | Fan-out service tasks | Independent items |

## Error Handling Advanced Patterns

### Compensation
If a transaction fails mid-process, already-completed activities need to be rolled back:
- Each compensatable activity has a compensation handler
- A cancel end event triggers compensation
- Compensation runs in reverse order of completion

### Escalation
Non-fatal issues that require human intervention:
- Escalation events route to a manager/owner
- The original process continues or waits
- Escalation can happen at any level

### Retry with Exponential Backoff
```
Service Task: Process Payment
Retry: R3/PT10S, R3/PT30S, R3/PT5M
Max retries: 9 (3 attempts at each interval)
Escalation: After all retries exhausted → Manual review
```

## Tool-Specific Automation Setup

### Camunda 8
- Deploy: `zbctl deploy process.bpmn`
- Workers: Job worker in Go, Java, JS, or Python
- Tasks: Service tasks, user tasks, business rule tasks
- Forms: Camunda Tasklist for user tasks
- DMN: Deploy alongside BPMN

### Temporal
- Workflows: Code-defined (Go, Java, TS, Python)
- Activities: Atomic task implementations
- Signals: External trigger mechanism
- Queries: Read workflow state
- Retry: Built-in with configurable policies

## Key Points
- Executable processes require careful implementation planning
- DMN tables must be complete, consistent, and testable
- Process mining reveals the gap between designed and actual processes
- Error handling patterns prevent process failures from becoming system failures
- Version control for process models is as important as code
- Match automation engine to process complexity
- Event-based gateways handle real-world uncertainty
- Compensation is essential for transaction integrity
- Retry policies must account for idempotency
- Governance prevents process model proliferation
