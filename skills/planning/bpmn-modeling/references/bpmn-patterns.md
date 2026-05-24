# BPMN Patterns

## Parallel Gateway Pattern

### Split (AND-Split)
All outgoing paths execute simultaneously. Use when multiple tasks can happen concurrently.

```
    ┌──────────────┐
    │ Order Placed │
    └──────┬───────┘
           │
      ┌────+────┐
      │ Parallel│
      │ Gateway │
      └────┬────┘
      /         \
     v           v
┌────────┐  ┌─────────┐
│Process │  │  Update │
│Payment │  │Inventory │
└───┬────┘  └────┬────┘
     \           /
      \         /
       v       v
      ┌────+────┐
      │ Parallel│  ← MUST have a merging gateway
      │ Gateway │
      └────┬────┘
           v
    ┌──────────────┐
    │  Ship Order  │
    └──────────────┘
```

**Rule**: Every parallel split must have a corresponding parallel merge. Unbalanced gateways cause the process to hang.

### When to Use
- Independence: tasks don't depend on each other's output
- Performance: parallel execution reduces overall cycle time
- Example: send email notification AND update database in parallel

## Exclusive Gateway Pattern (XOR-Split)

### Exclusive Decision
Exactly one path is taken based on a condition.

```
    ┌────────────────┐
    │  Payment Amount│
    └───────┬────────┘
            │
       ┌────X────┐
       │Exclusive│
       └────┬────┘
      /     |     \
     v      v      v
  [< $100] [= $100-$1000] [> $1000]
     |         |           |
     v         v           v
┌────────┐ ┌────────┐ ┌──────────────┐
│Instant │ │Normal  │ │ Requires     │
│Approve │ │Process │ │Manager Approval │
└────────┘ └────────┘ └──────────────┘
```

**Default flow**: One outgoing path should be marked as default (no condition). Used when no other condition matches.

## Inclusive Gateway Pattern (OR-Split)

One or more paths are taken based on conditions. Use when multiple conditions can be true simultaneously.

```
    ┌────────────┐
    │  Configure │
    │   Product  │
    └─────┬──────┘
          │
     ┌────O────┐
     │Inclusive│
     └────┬────┘
      /         \
     v           v
┌────────┐  ┌──────────┐
│Add UPS │  │ Add SSD  │  ← both can be selected
└────────┘  └──────────┘
     \           /
      \         /
       v       v
      ┌────O────┐
      │Inclusive│  ← MUST match the split
      └────┬────┘
           v
    ┌──────────────┐
    │  Calculate   │
    │    Total     │
    └──────────────┘
```

**Rule**: Inclusive gateways are harder to implement correctly. Prefer parallel + exclusive where possible.

## Event-Based Gateway

The process waits for one of several events and follows the path of whichever event occurs first.

```
    ┌──────────────┐
    │  Awaiting    │
    │  Response    │
    └──────┬───────┘
           │
      ┌────★────┐
      │ Event-  │
      │ Based   │
      └────┬────┘
      /         \
     v           v
┌────────┐  ┌──────────┐
│Receive │  │ Timer    │
│Response│  │ (24 hrs) │
└───┬────┘  └────┬─────┘
    |            |
    v            v
┌────────┐  ┌──────────┐
│Process │  │ Escalate │
│Response│  │          │
└────────┘  └──────────┘
```

### When to Use
- Awaiting human response with a timeout
- Competing external triggers
- Request-response with deadline

## Subprocess Patterns

### Embedded Subprocess
A self-contained process within a parent process. Has its own start and end events.

```
┌────────────────────────────────────┐
│         Validate Order             │ ← Subprocess
│  ┌────┐   ┌─────┐   ┌────────┐   │
│  │Check│ → │Check│ → │Decision│   │
│  │Items│   │Price│   │  OK?   │   │
│  └────┘   └─────┘   └───┬────┘   │
│                          v        │
│                     [Approve/Reject]│
└────────────────────────────────────┘
```

### Event Subprocess
A subprocess triggered by an event, not by the main flow. Can be interrupting or non-interrupting.

```
Main Flow: ─────[Process Order]─────[Ship Order]─────
                     │
                     │ (interrupting)
                     v
             ┌─────────────────┐
             │ Cancel Order    │ ← Event Subprocess
             │ (customer      │
             │  cancellation) │
             └─────────────────┘
```

### Transaction Subprocess
A subprocess with ACID-like transaction semantics. If any step fails, all completed steps are compensated/rolled back.

```
┌─── Transaction: Process Payment ───────────────────┐
│  ┌─────────┐   ┌──────────┐   ┌──────────────┐    │
│  │  Reserve │ → │  Charge  │ → │  Confirm     │    │
│  │  Funds   │   │  Card    │   │  Payment     │    │
│  └─────────┘   └──────────┘   └──────────────┘    │
│                        Cancel Handler:             │
│  [IF ANY FAILS] → Release funds, log error         │
└────────────────────────────────────────────────────┘
```

## Loops and Multi-Instance

### Loop Activity
An activity that repeats until a condition is met.

```
┌──────┐
│Retry │ ← repeats 3 times max, or until success
│API   │
│Call  │
└──────┘
```

### Multi-Instance (Parallel)
Multiple instances run concurrently. Example: approve each line item in a purchase order.

```
┌──────────────────────┐
│ Approve Line Items   │ ← Multi-instance parallel
│ (for each line item) │
└──────────────────────┘
```

### Multi-Instance (Sequential)
Instances run one after another. Example: audit each transaction in order.

```
┌──────────────────────┐
│ Review Each Document │ ← Multi-instance sequential
│ (for each document)  │
└──────────────────────┘
```

## Error and Exception Handling

### Error Boundary Event
An intermediate event on the boundary of an activity or subprocess. Catches errors thrown by the activity.

```
            Error
         ╔══╩══╗
┌────────║──────╨──────────┐
│        ║ Process Payment │
│        ║                 │
└────────║─────────────────┘
         ║
         v
┌────────────────┐
│ Handle Payment │
│ Failure        │
│ (retry/cancel) │
└────────────────┘
```

### Escalation Boundary Event
Similar to error events but for non-critical escalations. The parent process can continue.

### Compensation
An activity that undoes the effects of a completed activity. Marked with the compensation marker.

## Common Anti-Patterns

| Anti-Pattern | Problem | Fix |
|-------------|---------|-----|
| Unbalanced gateway | More splits than merges | Ensure every split has a corresponding merge |
| Implicit gateway | Decision without a gateway symbol | Add explicit gateway |
| Missing default flow | No fallback when no condition matches | Add default condition on exclusive gateway |
| Dangling activities | Activity with no outgoing flow (not an end) | Connect to end event |
| Message flow to same pool | Inter-pool message used within a pool | Use sequence flow instead |
| Event subprocess without trigger | Subprocess never starts | Ensure event-based trigger is correct |
| Too many levels | 4+ levels of subprocess nesting | Flatten or combine subprocesses |

## References
- Workflow Patterns Initiative — http://www.workflowpatterns.com/
- BPMN 2.0 by Example — OMG (2010)
- BPMN Method and Style — Bruce Silver
- Camunda BPMN Patterns — https://camunda.com/bpmn/
