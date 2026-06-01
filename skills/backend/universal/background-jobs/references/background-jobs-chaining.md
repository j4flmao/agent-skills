# Background Jobs Chaining

## Linear Chaining

Execute jobs in sequence, where each job depends on the previous:

```typescript
// Bull queue flow producer
async function createOrderWorkflow(orderId: string): Promise<void> {
  const step1 = await queue.add('validate', { orderId });
  const step2 = await queue.add('reserve', { orderId }, { dependsOn: step1.id });
  const step3 = await queue.add('charge', { orderId }, { dependsOn: step2.id });
  await queue.add('notify', { orderId }, { dependsOn: step3.id });
}

// Worker handles each step
const worker = new Worker('*', async (job) => {
  switch (job.name) {
    case 'validate':
      return validateOrder(job.data.orderId);
    case 'reserve':
      return reserveStock(job.data.orderId);
    case 'charge':
      return processPayment(job.data.orderId);
    case 'notify':
      return sendConfirmation(job.data.orderId);
  }
});
```

## Parallel Fan-Out

One job triggers multiple parallel jobs:

```typescript
async function fanOut(orderId: string): Promise<void> {
  // All three run in parallel after this job completes
  const parent = await queue.add('order.placed', { orderId });

  await Promise.all([
    queue.add('email.receipt', { orderId }, { dependsOn: parent.id }),
    queue.add('inventory.decrement', { orderId }, { dependsOn: parent.id }),
    queue.add('analytics.track', { orderId }, { dependsOn: parent.id }),
  ]);
}
```

## Fan-In (Join)

Multiple jobs must complete before continuing:

```typescript
class FanInCoordinator {
  private pending = new Map<string, Set<string>>();

  async registerGroup(groupId: string, dependencies: string[]): Promise<void> {
    this.pending.set(groupId, new Set(dependencies));
  }

  async onJobComplete(jobId: string, groupId: string): Promise<boolean> {
    const pending = this.pending.get(groupId);
    if (!pending) return false;

    pending.delete(jobId);
    if (pending.size === 0) {
      // All dependencies complete — enqueue next step
      await queue.add('post-processing', { groupId });
      this.pending.delete(groupId);
      return true;
    }
    return false;
  }
}
```

## Conditional Branching

```typescript
const worker = new Worker('*', async (job) => {
  if (job.name === 'payment.process') {
    const result = await processPayment(job.data);

    if (result.status === 'approved') {
      await queue.add('order.fulfill', { orderId: job.data.orderId });
    } else if (result.status === 'pending_review') {
      await queue.add('order.hold', { orderId: job.data.orderId, reason: result.reason });
    } else {
      await queue.add('order.rejected', { orderId: job.data.orderId, reason: result.reason });
      await queue.add('notification.failure', { orderId: job.data.orderId });
    }
  }
});
```

## Timeout and Escalation

```typescript
// If a workflow step takes too long, escalate
const worker = new Worker('approval', async (job) => {
  // Check if this job has been running too long
  const elapsed = Date.now() - job.timestamp;
  const escalationTime = 24 * 60 * 60 * 1000; // 24 hours

  if (elapsed > escalationTime) {
    // Escalate to manager
    await queue.add('notification.escalate', {
      orderId: job.data.orderId,
      originalAssignee: job.data.assignee,
      reason: 'No response within 24 hours',
    });

    // Re-assign to manager
    return { assignedTo: 'manager@company.com', escalated: true };
  }

  // Normal processing
  return processApproval(job.data);
});
```

## Monitoring Chained Workflows

| Metric | What It Tracks | Alert |
|--------|---------------|-------|
| Workflow duration | Total time from start to completion | > 5 min for critical flows |
| Step duration | Per-step execution time | > 30s per step |
| Step failure rate | % of steps that fail | > 5% |
| Abandoned workflows | Workflows stuck mid-chain | > 0 |
| Fan-out completion | Time for all parallel steps to finish | > 1 min |
