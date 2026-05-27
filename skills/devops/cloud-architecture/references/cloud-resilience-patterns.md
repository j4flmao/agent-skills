# Cloud Resilience Patterns

## Overview

Cloud resilience ensures that systems remain available and functional despite infrastructure failures, traffic spikes, and operational errors. This guide covers high-availability patterns, disaster recovery strategies, circuit breakers, bulkheads, chaos engineering, and multi-region architectures.

## High-Availability Patterns

```yaml
high_availability:
  multi_az_deployment:
    description: "Deploy across multiple Availability Zones within a region"
    compute:
      pattern: "Auto-scaling group with instances in 3 AZs — min 2 AZs"
      tolerance: "Lose 1 AZ without impact"
    database:
      pattern: "Primary in AZ-A, standby in AZ-B, read replica in AZ-C"
      failover: "Automatic — 30-120s DNS/Routing change"
    load_balancer: "Cross-zone load balancing — distribute traffic across all AZs"
    
  health_checks_and_auto_recovery:
    lb_health_check:
      path: "/health (application-level, not just TCP)"
      interval: "5-10 seconds"
      threshold: "3 consecutive failures = unhealthy"
      action: "Deregister from target group, terminate, auto-scaling replaces"
    asg_recovery:
      min_size: "2 (minimum for HA)"
      desired: "3+ (N+1 redundancy)"
      max: "5-10× desired (for traffic spikes)"
      
  stateless_architecture:
    principle: "Any instance can serve any request — no session affinity needed"
    session_data: "Externalize to Redis/ElastiCache, DynamoDB, or sticky-less JWT"
    benefit: "Failed instance replaced instantly — new instance takes traffic immediately"
```

## Disaster Recovery Strategies

```yaml
disaster_recovery:
  rto_rpo_definitions:
    rto_recovery_time_objective:
      definition: "Maximum acceptable time to restore service after disaster"
      typical_values:
        bronze: "24-48 hours"
        silver: "4-8 hours"
        gold: "1-2 hours"
        platinum: "<15 minutes"
    rpo_recovery_point_objective:
      definition: "Maximum acceptable data loss (measured in time)"
      typical_values:
        bronze: "24 hours"
        silver: "1 hour"
        gold: "5 minutes"
        platinum: "0 (zero data loss)"
        
  dr_strategies:
    backup_and_restore:
      rto: "24-48 hours"
      rpo: "24 hours"
      cost: "Low — storage costs only"
      description: "Regular backups to secondary region, restore on disaster"
      pattern: "Daily snapshots to S3/Glacier in DR region. On disaster: provision infra, restore from backup."
      
    pilot_light:
      rto: "4-8 hours"
      rpo: "1 hour"
      cost: "Medium — minimal running resources in DR"
      description: "Core infrastructure running in DR (DNS, databases), app servers scaled up on disaster"
      pattern: "Replicated databases running in DR. No application servers. On disaster: scale up app tier."
      
    warm_standby:
      rto: "1-2 hours"
      rpo: "5 minutes"
      cost: "High — scaled-down full environment in DR"
      description: "Full environment running at reduced capacity in DR region"
      pattern: "DR environment runs at 25-50% capacity. On disaster: scale up to 100%, switch DNS."
      
    multi_region_active_active:
      rto: "<15 minutes"
      rpo: "0 (near zero)"
      cost: "Very high — full production in both regions"
      description: "Both regions serve traffic simultaneously"
      pattern: "Global load balancer (Route53 latency, Global Accelerator). Data replicated bidirectionally or read-write in one region + read in others."
```

## Circuit Breaker Pattern

```yaml
circuit_breaker:
  states:
    closed:
      description: "Normal operation — requests pass through"
      failure_threshold: "Track consecutive failures"
      
    open:
      description: "Failing — requests blocked immediately"
      trigger: "Consecutive failures exceed threshold (default: 5)"
      action: "Fail fast — return error or cached response without calling downstream"
      timeout: "Circuit stays open for configured timeout (default: 30s)"
      
    half_open:
      description: "Testing recovery — limited requests allowed"
      trigger: "Open timeout expires"
      test_requests: "Allow N requests (default: 3) to test if downstream recovered"
      on_success: "Close circuit — resume normal operation"
      on_failure: "Reopen circuit — reset timeout (may increase exponentially)"
      
  implementation_considerations:
    monitoring:
      - "Track circuit state changes as metrics (closed, open, half-open)"
      - "Alert on frequent circuit state changes (stuttering)"
      - "Log every request rejection for debugging"
    configuration:
      - "Adjust thresholds per downstream service (critical services get lower thresholds)"
      - "Use exponential backoff for reopen timeout"
      - "Configure per-instance circuit state (not cluster-wide — isolates bad instances)"
    fallback:
      - "Cache: serve stale cached response when circuit is open"
      - "Degrade: return partial response or simplified version"
      - "Error: return 503 Service Unavailable with Retry-After header"
```

## Bulkhead Pattern

```yaml
bulkhead:
  principle: "Isolate resources so failure in one part doesn't cascade to others"
  
  connection_pools:
    pattern: "Dedicated connection pool per downstream service"
    configuration:
      service_a: "max 20 connections, queue size 50"
      service_b: "max 10 connections, queue size 25"
      service_c: "max 5 connections, queue size 10"
    benefit: "Service C being slow doesn't exhaust connections for Service A and B"
    
  thread_pools:
    pattern: "Separate thread pool for different workloads"
    partitioning:
      cpu_intensive: "2 threads (e.g., image processing, encryption)"
      io_bound: "20 threads (e.g., database queries, API calls)"
      background: "5 threads (e.g., report generation, batch jobs)"
    benefit: "CPU-intensive task can't starve IO threads"
    
  service_partitions:
    pattern: "Partition services by tenant, region, or customer tier"
    example:
      premium_tier: "Dedicated instances — no noisy neighbor impact"
      standard_tier: "Shared instances — partitioned by TenentId"
      free_tier: "Heavily shared — best effort performance"
```

## Chaos Engineering

```yaml
chaos_engineering:
  principles:
    - "Build confidence in system resilience through controlled experiments"
    - "Start with blast radius of 1 (one instance, one AZ, one region)"
    - "Automate experiments — manual chaos doesn't scale"
    - "Run in production (after proven in staging)"
    - "Stop experiment immediately if unexpected behavior detected"
    
  experiment_types:
    infrastructure:
      - "Terminate EC2 instance (random AZ)"
      - "Blackhole network traffic to one service"
      - "Stop database instance"
      - "Fill up disk on one instance"
      - "Introduce latency (network delay)"
    application:
      - "Return 500 errors from downstream service"
      - "Slow down API responses (1s, 3s, 10s)"
      - "Rate limit exceeded from third-party API"
      - "Memory exhaustion on one instance"
    data:
      - "Database connection pool exhausted"
      - "Cache cluster failure (Redis down)"
      - "Message queue backlog (millions of messages)"
      - "Data corruption in one table"
      
  maturity_model:
    level_1: "Manual chaos experiments in staging — document findings"
    level_2: "Automated experiments in staging — gameday schedule"
    level_3: "Automated experiments in production — low blast radius"
    level_4: "Continuous chaos — experiments run as part of deployment pipeline"
    level_5: "Self-healing — system detects and mitigates without human intervention"
```

## Graceful Degradation

```yaml
graceful_degradation:
  degraded_modes:
    read_only:
      trigger: "Database unavailable or corrupted"
      behavior: "Accept reads, reject writes with 503 and explanation"
    cache_only:
      trigger: "Backend service unavailable"
      behavior: "Serve from cache with freshness indicator"
    partial_data:
      trigger: "Some data sources unavailable"
      behavior: "Show available data with 'Some data unavailable' notice"
    queued_writes:
      trigger: "Primary database write path degraded"
      behavior: "Accept writes to local queue, acknowledge with delay warning"
      
  user_communication:
    transient_error: "Service temporarily unavailable — retrying automatically"
    degraded_service: "Some features unavailable — core functionality working"
    maintenance: "Scheduled maintenance — expected duration shown"
    capacity: "High traffic — degraded experience, try again later"
```

## Multi-Region Data Patterns

```yaml
multi_region_data:
  active_passive:
    description: "One region handles writes, other regions replicate and serve reads"
    data_flow: "Write to primary region → async replication to secondary regions"
    failover: "Promote passive region to active"
    consistency: "Eventually consistent — may lose last N writes on failover"
    database_patterns:
      - "RDS cross-region read replica"
      - "Aurora Global Database"
      - "Cloud SQL cross-region replica"
      
  active_active:
    description: "Multiple regions accept writes simultaneously"
    data_flow: "Write to local region → sync/async replication to other regions"
    conflict_resolution:
      last_write_wins: "Simple, common — may lose data"
      crdt: "Conflict-free replicated data types — automatic merge"
      application_level: "Custom merge logic per use case"
      manual: "Log conflicts for manual resolution — highest data integrity"
    database_patterns:
      - "DynamoDB Global Tables"
      - "Cosmos DB multi-region writes"
      - "Spanner (strong consistency across regions)"
      - "Aurora Global Database (write forwarding)"
```
