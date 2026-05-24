# Process Automation

## BPMN to Workflow Automation

### Mapping BPMN Elements to Code

| BPMN Element | Automation Implementation |
|-------------|--------------------------|
| **Start Event** | Trigger: webhook, message queue, schedule, form submission |
| **User Task** | Human task: form/task list in Camunda Tasklist, custom UI |
| **Service Task** | Service call: REST API, gRPC, function invocation, Java delegate |
| **Script Task** | Inline script: JavaScript/Groovy/Python (use sparingly) |
| **Business Rule Task** | DMN decision table or rules engine (Drools, Easy Rules) |
| **Send Task** | Message broker: Kafka, RabbitMQ, webhook |
| **Receive Task** | Awaiting message on queue or webhook callback |
| **Exclusive Gateway** | if/else, switch statement, routing condition |
| **Parallel Gateway** | Parallel execution: CompletableFuture, fork/join, threads |
| **Event-Based Gateway** | Race condition: Promise.race, first-response-wins |
| **Boundary Event** | Exception handler, timeout handler, circuit breaker |
| **Subprocess** | Encapsulated function/method, microservice call |
| **Transaction Subprocess** | Distributed transaction: Saga pattern, 2PC, compensation |
| **Timer Event** | Scheduled job, cron, delay queue |
| **Message Event** | Async messaging: queue produce/consume |

## Automation Platforms

### Camunda Platform 8 (SaaS/self-managed)
- **Modeler**: Web-based BPMN 2.0, DMN, and forms editor
- **Zeebe Engine**: Cloud-native, horizontally scalable, event-driven
- **Tasklist**: Built-in user task UI
- **Operate**: Process monitoring and troubleshooting
- **Optimize**: Process analytics and reporting
- **Language**: Java, Node.js, Go, C#, Python client libraries

**Camunda 7** (older, self-managed only):
- Embedded or standalone engine
- Java-based, Spring Boot integration
- REST API and Java API

### Flowable
- Open-source BPMN platform (forked from Activiti)
- DMN and CMMN support
- Strong Spring Boot integration
- Lightweight embeddable engine
- Designed for Java/Jakarta EE environments

### Temporal
- Workflow-as-code (not visual BPMN modeling)
- SDKs in TypeScript, Go, Java, Python, .NET
- Handles: retries, timeouts, durable execution, saga patterns
- Best for: microservice orchestration, long-running workflows
- No native BPMN diagram support (code-only workflow definitions)

### Platform Selection Guide
```
| Criteria | Camunda | Flowable | Temporal |
|----------|---------|----------|----------|
| Visual modeling | ✅ Native | ✅ Native | ❌ Code-only |
| DMN support | ✅ Built-in | ✅ Built-in | ❌ (custom) |
| Developer SDKs | Java, JS, Go, .NET, Python | Java, REST | TS, Go, Java, Python, .NET |
| Deployment model | Self-managed, SaaS | Self-managed only | Self-managed, Cloud |
| Horizontal scaling | ✅ (Zeebe) | ⚠️ (limited) | ✅ |
| Long-running workflows | ✅ | ✅ | ✅ (best in class) |
| Compensation/Saga | ✅ (by modeling) | ✅ (by modeling) | ✅ (native) |
| Best for | Visual process automation | Java-heavy orgs | Code-first microservice orchestration |
```

## DMN Decision Tables

### DMN Structure
**Decision**: The overall decision being made
**Inputs**: The data the decision depends on
**Outputs**: The result of the decision
**Rules**: The mapping of inputs to outputs

### Hit Policies
| Policy | Behavior | Use Case |
|--------|----------|----------|
| **Unique (U)** | Exactly one rule matches | Simple mappings |
| **First (F)** | First matching rule wins | Prioritized rules |
| **Collect (C)** | All matching rules contribute | Aggregation, sum, list |
| **Rule Order (R)** | All matching rules in order | Sequential processing |
| **Output Order (O)** | All rules sorted by priority | Prioritized outputs |
| **Any (A)** | Any rule (they must all be equivalent) | Interchangeable rules |

### Example: Loan Approval Decision Table
```
Decision: Approve Loan
Hit Policy: First (F)

| Input 1: Credit Score | Input 2: Loan Amount | Input 3: Employment | Output: Decision |
|-----------------------|---------------------|---------------------|-----------------|
| > 750                 | -                   | -                   | APPROVED        |
| 650-750               | < 100,000           | Full-time           | APPROVED        |
| 650-750               | < 100,000           | Part-time           | REVIEW          |
| 650-750               | > 100,000           | -                   | DECLINED        |
| < 650                 | -                   | -                   | DECLINED        |
```

### DMN XML Example
```xml
<decision id="loanDecision" name="Loan Approval">
  <decisionTable id="decisionTable" hitPolicy="FIRST">
    <input id="input1" label="Credit Score">
      <inputExpression typeRef="double" />
    </input>
    <input id="input2" label="Loan Amount">
      <inputExpression typeRef="double" />
    </input>
    <output id="output1" label="Decision" typeRef="string" />
    <rule id="rule1">
      <inputEntry><text>> 750</text></inputEntry>
      <inputEntry><text>-</text></inputEntry> <!-- any value -->
      <outputEntry><text>"APPROVED"</text></outputEntry>
    </rule>
  </decisionTable>
</decision>
```

## Process Simulation

### Why Simulate
- Validate process design before implementation
- Identify bottlenecks and resource constraints
- Estimate cycle time and throughput under different volumes
- Compare alternative designs with data
- Build confidence for investment decisions

### Simulation Parameters

| Parameter | Description | Source |
|-----------|-------------|--------|
| **Arrival rate** | How often the process starts (per hour/day) | Historical data, business forecast |
| **Processing time** | Duration of each task (mean, distribution) | Observation, system logs, expert estimate |
| **Resource allocation** | How many people/systems handle each task | Org chart, shift schedule |
| **Condition probability** | Likelihood of each gateway path | Historical data, business rules |
| **Error rate** | How often tasks fail or need rework | Historical data, QA reports |

### Simulation Example
```
Process: Order Fulfillment
Arrival rate: 100 orders/day (Poisson distribution)
Resources: 3 order processors, 2 warehouse pickers

Baseline (AS-IS):
- Average cycle time: 5.2 hours
- 95th percentile: 12.8 hours
- Resource utilization: Processors 65%, Pickers 85%

Proposed (TO-BE) — Add 1 picker:
- Average cycle time: 3.1 hours (-40%)
- 95th percentile: 7.2 hours
- Resource utilization: Processors 68%, Pickers 72%
- Cost: $60k/year for additional picker
```

## Automation Best Practices

- Model the AS-IS first, then the TO-BE — never skip current-state analysis
- Each service task should be idempotent — retries must be safe
- Use error boundary events for expected failures, escalation for unexpected
- Set realistic timeouts on all service calls (2-5x the P95 response time)
- Monitor: process instance count, cycle time per activity, error rate
- Test the process engine separately from the service implementations
- Version all process definitions — changing a running process is complex
- Use process instance correlation keys to handle long-running async flows
- Keep service tasks stateless — all state should be in the process engine

## References
- Camunda Documentation — https://docs.camunda.org/
- Flowable Documentation — https://www.flowable.com/open-source/docs
- Temporal Documentation — https://docs.temporal.io/
- DMN Specification — OMG (https://www.omg.org/spec/DMN/)
- Workflow Management Coalition — https://www.wfmc.org/
