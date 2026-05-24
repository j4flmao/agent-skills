# BPMN 2.0 Elements

## Flow Objects

### Events (Circles)
Events represent something that happens during a process. Three types based on position:

| Event Type | Start | Intermediate | End |
|------------|-------|-------------|-----|
| **None** | Unspecified trigger | — | Unspecified end |
| **Message** | Message arrives | Send/receive message | Message sent |
| **Timer** | Time-based trigger | Delay, cycle, timeout | — |
| **Error** | — | Catch error | Throw error (end) |
| **Escalation** | — | Catch escalation | Escalation raised |
| **Signal** | Signal received | Catch/throw signal | Signal thrown |
| **Link** | — | Off-page connector | Off-page connector |
| **Conditional** | Condition met | Evaluate condition | — |
| **Compensation** | — | Trigger compensation | Compensation |
| **Terminate** | — | — | Terminate all paths |

**Start Events** trigger a process. Each process must have exactly one start event (by BPMN spec).

**End Events** terminate a process path. A process can have multiple end events.

**Intermediate Events** occur between activities. Catch events wait for something to happen; throw events trigger something.

### Activities (Rounded Rectangles)
| Activity | Description |
|----------|-------------|
| **Task** | Atomic activity that cannot be broken down further |
| **User Task** | Performed by a human with a system |
| **Service Task** | Automated service call (API, function, web service) |
| **Script Task** | Executes a script automatically |
| **Business Rule Task** | Evaluates business rules (often DMN-based) |
| **Manual Task** | Performed by a human without system assistance |
| **Send Task** | Sends a message to an external participant |
| **Receive Task** | Waits for a message from an external participant |
| **Subprocess (collapsed)** | Container for a set of activities shown as a single task |
| **Subprocess (expanded)** | Container showing all nested activities |
| **Event Subprocess** | Subprocess triggered by an event; can interrupt or not |

### Gateways (Diamonds)
| Gateway | Behavior |
|---------|----------|
| **Exclusive (X)** | Only one path is taken based on condition |
| **Parallel (+)** | All outgoing paths are taken simultaneously |
| **Inclusive (O)** | One or more paths taken based on conditions |
| **Event-Based** | Path taken based on which event occurs first |
| **Parallel Event-Based** | All events trigger parallel continuation |
| **Complex** | Complex condition defines which paths are taken |

## Connecting Objects

| Object | Notation | Purpose |
|--------|----------|---------|
| **Sequence Flow** | Solid arrow | Order of activities (which path to take) |
| **Message Flow** | Dashed arrow, open arrowhead | Communication between pools |
| **Association** | Dotted line, open arrow | Link artifacts to flow elements |

### Sequence Flow Conditions
```
[Check payment method]
    |
    ├── [condition: credit card] → [Process credit card]
    │
    └── [condition: bank transfer] → [Process bank transfer]
```

Conditions are written as expressions on the connecting lines. Default flow (no condition) is used when no other condition matches.

## Swimlanes

### Pool
A pool represents a participant in the process (organization, role, system). One process typically has one pool containing the flow. External participants are represented as separate pools.

### Lane
A sub-partition within a pool, typically representing a department, role, or system. Activities are placed in the lane of the actor responsible for them.

```
┌─────────────────────────────────────────────────┐
│ Pool: E-commerce System                          │
├─────────────────────────────────────────────────┤
│ Lane: Customer Service                           │
│  [Validate Order]                                │
├─────────────────────────────────────────────────┤
│ Lane: Payment System                             │
│  [Charge Card] → [Confirm Payment]               │
├─────────────────────────────────────────────────┤
│ Lane: Warehouse                                  │
│                     [Pick Items] → [Ship Order]  │
└─────────────────────────────────────────────────┘
```

### Pools and Message Flow
- Sequence flow never crosses pool boundaries
- Message flow connects elements in different pools
- A pool without a process is a "black box pool" — its internal process is hidden

## Artifacts

| Artifact | Notation | Purpose |
|----------|----------|---------|
| **Data Object** | Rectangle with folded corner | Documents input/output of activities |
| **Data Store** | Cylinder | Persistent data (database, file system) |
| **Group** | Dashed rounded rectangle | Logical grouping without semantics |
| **Text Annotation** | Open rectangle with line | Additional explanation for a flow element |

## Markers

| Marker | Applied To | Meaning |
|--------|-----------|---------|
| Loop (circular arrow) | Activity | Activity repeats while condition is true |
| Multi-instance (parallel lines) | Activity | Multiple instances run in parallel |
| Multi-instance (sequential lines) | Activity | Multiple instances run sequentially |
| Compensation (undo arrow) | Activity | Compensating action for rollback |
| Ad-hoc (tilde) | Subprocess | Subprocess where tasks happen in any order |
| Transaction (double border) | Subprocess | Transactional behavior with compensation |

## BPMN XML Example

```xml
<?xml version="1.0" encoding="UTF-8"?>
<definitions xmlns="http://www.omg.org/spec/BPMN/20100524/MODEL"
  xmlns:bpmndi="http://www.omg.org/spec/BPMN/20100524/DI"
  targetNamespace="http://bpmn.io/schema/bpmn">
  
  <process id="orderProcess" name="Order Fulfillment" isExecutable="true">
    <startEvent id="start" name="Order Received" />
    
    <sequenceFlow id="flow1" sourceRef="start" targetRef="validateOrder" />
    
    <userTask id="validateOrder" name="Validate Order" />
    
    <sequenceFlow id="flow2" sourceRef="validateOrder" targetRef="checkPayment" />
    
    <exclusiveGateway id="checkPayment" name="Payment OK?" />
    
    <sequenceFlow id="flow3" sourceRef="checkPayment" targetRef="processPayment">
      <conditionExpression xsi:type="tFormalExpression">
        <![CDATA[${paymentValidated == true}]]>
      </conditionExpression>
    </sequenceFlow>
    
    <sequenceFlow id="flow4" sourceRef="checkPayment" targetRef="rejectOrder">
      <conditionExpression xsi:type="tFormalExpression">
        <![CDATA[${paymentValidated == false}]]>
      </conditionExpression>
    </sequenceFlow>
    
    <serviceTask id="processPayment" name="Process Payment" 
      implementation="##WebService" />
    
    <endEvent id="end" name="Order Completed" />
    
    <endEvent id="rejectEnd" name="Order Rejected" />
  </process>
</definitions>
```

## References
- BPMN 2.0 Specification — Object Management Group (OMG)
- BPMN 2.0 Handbook — Methods, Concepts, Case Studies
- Camunda BPMN Reference — https://docs.camunda.org/manual/latest/reference/bpmn20/
- BPMN by Example — OMG (2010)
