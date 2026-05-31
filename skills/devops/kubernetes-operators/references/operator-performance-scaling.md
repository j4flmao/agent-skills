# Kubernetes Operators: Performance and Scaling

## Overview

Kubernetes operators are controllers that run continuously, watching resources and reconciling state. As managed resource counts grow into the hundreds or thousands, operator performance becomes critical. Slow reconciliation creates drift, missed events cascade into outages, and unoptimized controllers consume cluster resources inefficiently. This reference provides deep architecture for building operators that scale from managing dozens to tens of thousands of custom resources.

## Core Architecture Concepts

### Reconciliation Throughput

Operator performance is measured by reconciliation throughput: how many resources per second the controller can process while maintaining correctness.

Reconciliation Throughput = Worker Count / Average Reconciliation Time

Each reconciliation cycle: Watch Event → Queue → Dequeue → Fetch CR → Fetch Related Resources → Diff → Apply Changes → Update Status → Requeue/Done

### Scaling Dimensions

Operators scale across multiple dimensions:
- CR count: Number of custom resources managed
- Resource depth: Number and complexity of sub-resources per CR
- Cluster size: Number of nodes, namespaces, and total API objects
- Event rate: Frequency of changes to managed resources
- Concurrency: Number of simultaneous reconciliations

## Architecture Decision Trees

### Worker Pool Configuration

Worker Pool Sizing:
- Low throughput (< 100 CRs): 1-5 workers. Simple, low overhead, sufficient.
- Medium throughput (100-1000 CRs): 5-20 workers. Configurable, bounded by API calls.
- High throughput (1000-10000 CRs): 20-100 workers. Requires rate limiting, batching.
- Extreme throughput (10000+ CRs): 100+ workers. Sharded controllers, partitioned queues.

### Informer vs Watcher Selection

- SharedInformerFactory: Default for most operators. Caches objects, reduces API calls. Higher memory usage.
- Watcher only: No cache, direct API calls. Lower memory, higher API usage. For infrequent changes.
- Delta informer: Processes create/update/delete deltas. More processing, better for state machines.
- Metadata-only informer: Only metadata, not full objects. Lower memory, limited reasoning.

### Rate Limiting Strategy

- Token bucket: Simple, burstable. Good for most controllers.
- Leaky bucket: Smooth rate, no bursts. Good for steady-state workloads.
- Exponential backoff: Increases delay on failure. Essential for error handling.
- Per-item vs global: Per-item prevents one bad CR from starving others. Global prevents API overload.

## Implementation Strategies

### Optimized Reconciliation Loop

Create a reconciliation loop that minimizes API calls and leverages caching:

1. Use cached readers for read operations: Avoid live API calls for reads. Informer cache is eventually consistent within seconds.
2. Batch status updates: Aggregate status changes and update periodically, not after every sub-operation.
3. Selective requeue: Use requeueAfter for periodic reconciliation only when needed. Use requeue immediately for transient errors.
4. Event filtering: Pre-filter watch events in predicate functions to avoid triggering reconciliation for irrelevant changes.
5. Status sub-resource: Always use Status().Update() instead of updating the main CR object for status changes.

### Controller-Level Caching

Cache expensive computations that are reused across reconciliations:

- External system state: Cache cloud provider API responses, database connections, DNS lookups
- Template rendering results: Cache rendered manifests for common configurations
- Dependency graphs: Cache resource dependency relationships when topology is stable
- Credential validation: Cache authentication tokens with appropriate TTL

Cache invalidation strategies:
- Time-based TTL: Simple, acceptable staleness
- Event-based: Invalidate on relevant watch events
- Generation-based: Invalidate when CR generation changes

### Rate Limiting and Backpressure

Implement multiple layers of rate control to protect both the operator and the systems it manages:

API Priority and Fairness integration: Use Kubernetes API priority levels to ensure operator requests get appropriate QPS. Configure max-in-flight limits per controller to prevent resource starvation.

Work queue with backpressure: Instead of unbounded queues, use bounded queues with backpressure signals. When the queue exceeds capacity, apply admission control to prevent memory exhaustion.

External API rate limiting: For operators that manage cloud resources, implement client-side rate limiting that matches provider limits. Use token buckets with per-resource-type limits.

## Integration Patterns

### Sharded Controllers

For operators managing resources across cluster boundaries:

Controller sharding splits responsibility by label selector, namespace, or custom partitioning. Each shard runs independently with its own worker pool and cache. Shard coordination ensures each resource is processed by exactly one controller instance.

Shard rebalancing handles node failures and controller scaling events. When a shard controller fails, its resources are redistributed among remaining shards. Leader election determines shard assignment.

### Multi-Resource Orchestration

Operators managing complex applications must coordinate multiple resource types efficiently:

Topological sort dependencies before creation. Create resources in dependency order, starting with foundational resources (ConfigMaps, Secrets) and progressing to dependent resources (Deployments, Services).

Parallel creation of independent resources reduces total reconciliation time. Use errgroup or similar constructs to fan out operations across independent resource types.

Status aggregation collects status from all sub-resources before updating CR status. This provides a coherent view of the entire application state in a single status update.

## Performance Optimization

### Reducing API Calls

Each Kubernetes API call adds latency and consumes API server capacity. Minimize calls through:

- Bulk operations: Use client-side batching for resource creation. Replace individual creates with server-side apply.
- Informer cache: Read from cache instead of live API for all non-critical reads. Cache is updated via watches with minimal latency.
- Resource version tracking: Use resourceVersion in list calls for incremental updates. Avoid full list/relist cycles.
- Field selectors: Use field selectors instead of label selectors when possible. Field selectors are index-backed.
- Partial object retrieval: Request only needed fields using field selectors and label selectors in list operations.

### Memory Management

Operators can consume significant memory through informer caches and work queues:

| Strategy | Memory Impact | Performance Impact | Best For |
|----------|--------------|-------------------|----------|
| Full informer cache | High (full objects) | Fast (no API on read) | Most operators |
| Metadata-only informer | Low (metadata only) | Medium (limited data) | Large clusters |
| Transformed informer | Medium (transformed) | Fast (pre-processed) | Complex operators |
| Lazy loading | Low (on-demand) | Slow (API on read) | Infrequent access |

### Watch Event Batching

Kubernetes watches deliver events one at a time. Batching reduces processing overhead:

- De-duplicate watch events: Multiple rapid updates to the same resource coalesce into one reconciliation
- Debounce period: Brief delay before starting reconciliation to batch related events
- Generation check: Skip reconciliation if a newer event is already queued for the same resource

## Security Considerations

### Operator Privilege Escalation

As operators scale to manage more resources, their RBAC scope expands. Each new resource type added to the operator's managed set increases the blast radius of a compromise.

Minimize operator RBAC to only the resources the operator actually manages. Use separate ServiceAccounts for different controllers within a single operator. Implement webhook validation for all CR mutations to provide a secondary validation layer.

### Watch Event Security

Watch events can leak information through event metadata. When an operator watches resources across namespaces, it has visibility into those resources' existence and metadata.

Use namespaced scopes where possible instead of cluster-scoped watches. Restrict watch event access to operators with a legitimate need. Audit operator watch patterns for unexpected behavior.

## Operational Excellence

### Performance Monitoring

Key performance indicators for operator health:

| Metric | Warning | Critical | Action |
|--------|---------|----------|--------|
| Reconciliation latency p99 | > 5s | > 30s | Increase workers, optimize loop |
| Work queue depth | > 100 | > 1000 | Scale workers, check for stuck reconciliations |
| Error rate | > 1% | > 5% | Debug errors, check external dependencies |
| Memory usage | > 200MB | > 500MB | Tune cache, reduce object retention |
| API call rate | > 80% limit | > 95% limit | Implement client-side rate limiting |
| Watch reconnection rate | > 1/hour | > 10/hour | Check connectivity, API server health |

### Operator Profiling

When operator performance degrades, systematic profiling identifies bottlenecks:

1. CPU profiling: Identify hot loops in reconciliation code. Use pprof or equivalent.
2. Memory profiling: Identify cache growth patterns and memory leaks. Check for unbounded queues.
3. API call profiling: Count and categorize API calls. Look for N+1 query patterns.
4. Block profiling: Identify goroutines blocked on I/O or locks. Check for deadlocks.
5. Trace profiling: End-to-end trace of a single reconciliation. Use OpenTelemetry.

## Testing Strategy

### Performance Testing

| Test | Methodology | Target |
|------|-------------|--------|
| Scale test | Create N CRs, measure steady-state reconciliation | 1000 CRs under 1s avg latency |
| Stress test | Create CRs at maximum rate, measure queue depth | Queue depth < 100 at 10 CRs/sec |
| Longevity test | Run operator for 24+ hours, measure memory growth | Memory growth < 10% over 24h |
| API limit test | Simulate API server throttling, verify operator behavior | Graceful degradation, no crash |
| Chaos test | Kill operator pod, verify recovery and re-reconciliation | All CRs reconciled within 5 min |
| Concurrent update test | Multiple CR updates simultaneously, verify consistency | No conflicts, all updates processed |

### Performance Benchmarking Framework

`go
// Benchmark reconciliation throughput
func BenchmarkReconciliation(b *testing.B) {
    // Setup test environment
    env := setupTestEnvironment(b)
    defer env.Teardown()
    
    // Create CRs
    for i := 0; i < b.N; i++ {
        cr := createTestCR(fmt.Sprintf("benchmark-%d", i))
        require.NoError(b, env.Client.Create(ctx, cr))
    }
    
    // Wait for all CRs to be reconciled
    env.WaitForReconciliation(b.N)
    
    // Report metrics
    b.ReportMetric(float64(b.N)/b.Elapsed().Seconds(), "crs-per-second")
}
`

## Common Pitfalls

| Pitfall | Symptom | Resolution |
|---------|---------|------------|
| Unbounded worker pool | Memory exhaustion, API server overload | Cap workers at reasonable maximum |
| Missing rate limiting | API server throttling, operator degraded | Client-side rate limiting per client |
| Cache coherency assumptions | Stale reads cause incorrect reconciliation | Understand cache consistency guarantees |
| Synchronous external calls | Slow reconciliation, queue backup | Async external calls with status tracking |
| Status update on every change | Excessive API writes, contention | Batch status updates, use generation tracking |
| Full list on every reconciliation | High API load, slow startup | Informer cache for list operations |
| Ignoring resource versions | Stale data used in reconciliation | Track resource versions for consistency |
| Memory leak from unbounded caches | OOM kills, pod cycling | Bound cache size, implement eviction |
| Blocking watch handler | All resources delayed, cascading lag | Non-blocking event handlers |
| Over-fetching related resources | Slow reconciliation, high memory | Selective field queries, lazy loading |

## Key Takeaways

- Operator performance is determined by reconciliation throughput: worker count divided by average reconciliation time
- Informer caching is the most impactful optimization — cache reads avoid API calls and reduce latency by orders of magnitude
- Worker pool sizing must account for API rate limits, external dependency capacity, and per-reconciliation resource usage
- Rate limiting is essential at multiple layers: API calls, work queue depth, and external service requests
- Memory management through bounded caches, transformed informers, and selective caching prevents OOM at scale
- Watch event batching and deduplication reduces unnecessary reconciliation work
- Sharded controllers enable horizontal scaling for operators managing resources across cluster boundaries
- Performance monitoring must track reconciliation latency, queue depth, error rate, and API call rate
- Performance testing at scale (1000+ CRs) is essential before production deployment
- The most common performance issue is synchronous I/O in the reconciliation loop — async patterns with status tracking solve this
- Operator profiling should be a regular practice, not a post-incident activity
- Client-side rate limiting is the operator's responsibility, not the API server's — well-behaved operators manage their own resource consumption
