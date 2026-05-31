# Progressive Delivery: Multi-Cluster and Multi-Region

## Overview

Progressive delivery across multiple clusters and geographic regions introduces complexity beyond single-cluster canary deployments. Traffic distribution, consistency guarantees, observability aggregation, and rollback coordination must account for the heterogeneous nature of multi-cluster environments. This reference provides deep architecture for implementing progressive delivery across Kubernetes clusters spanning regions, cloud providers, and deployment topologies.

## Core Architecture Concepts

### Multi-Cluster Deployment Topologies

```
Topology Types:
├── Hub-and-Spoke: Central control plane manages regional clusters
│   ├── Coordinator: ArgoCD Hub, Flux Controller
│   ├── Consistency: Strong (hub writes, spoke reads)
│   └── Use case: Centralized platform team
│
├── Mesh: Peer clusters with mutual awareness
│   ├── Coordinator: Istio Mesh, ClusterMesh (Cilium)
│   ├── Consistency: Eventual (peer propagation)
│   └── Use case: Multi-region active-active
│
├── Cell-Based: Independent deployment cells with isolation
│   ├── Coordinator: Cell router, global load balancer
│   ├── Consistency: Independent per cell
│   └── Use case: Fault isolation, compliance (data residency)
│
└── Staged Rollout: Sequential cluster promotion
    ├── Coordinator: ArgoCD ApplicationSet
    ├── Consistency: Ordered deployment
    └── Use case: Gradual production rollout
```

### Multi-Region Progressive Delivery Flow

```
Canary Progression Across Regions:
[Dev Cluster] → [Staging Cluster] → [Canary Region] → [Secondary Region] → [All Regions]
     ↓                ↓                   ↓                   ↓                   ↓
   Smoke test     Integration       5% traffic          25% traffic         100% traffic
                   + perf test      + metrics            + metrics           + monitoring
                                    + analysis           + analysis          + steady state

Each stage gates the next:
├── Stage 1: Dev — functional validation, no traffic
├── Stage 2: Staging — load test, integration test
├── Stage 3: Canary region — real traffic, limited blast radius
├── Stage 4: Secondary — increased traffic, validated model
└── Stage 5: Global — complete rollout, monitoring for regression
```

### Decision Tree: Rollout Strategy Selection

```
Multi-Cluster Strategy Selection
├── Same cloud provider, multiple regions
│   ├── Latency-sensitive → Staged rollout (warm up each region)
│   └── Cost-optimized → Rolling region-by-region
├── Multi-cloud (AWS + GCP + Azure)
│   ├── Consistency-critical → Cell-based, independent per cloud
│   └── DR-primary → Hub-and-spoke from primary cloud
├── Hybrid (on-prem + cloud)
│   ├── Data residency → Cell-based with location constraints
│   └── Burst capacity → Canary cloud, then on-prem
└── Edge + core
    ├── Latency-critical → Canary core first, then edge
    └── Consistency-critical → Canary edge first (lower impact)
```

## Architecture Decision Trees

### Traffic Routing Across Clusters

```
Global Traffic Distribution
├── DNS-based → Latency-based routing (AWS Route53, Google Cloud DNS)
├── Anycast → Global IP anycast (Cloudflare, Fastly)
├── Service mesh mesh → Istio multi-primary, Cilium ClusterMesh
├── Global load balancer → Google Global LB, AWS Global Accelerator
└── Edge gateway → API gateway with multi-cluster backends
```

### Consistency Strategy

```
Data Consistency Across Rollouts
├── Stateless services → No consistency concern
├── Session-based → Sticky sessions, session replication
├── Read-after-write → Read-your-writes consistency
├── Eventual consistency → Async replication, conflict resolution
└── Strong consistency → Global database (Spanner, CockroachDB)
```

### Rollback Coordination

```
Multi-Cluster Rollback Strategy
├── Per-cluster independent rollback → Each cluster rolls back independently
├── Coordinated global rollback → All clusters roll back simultaneously
├── Phased rollback → Roll back canary regions first, then secondary
├── Partial rollback → Roll back only affected clusters
└── Automatic vs manual → Automated for critical SLO violations, manual for business decisions
```

## Implementation Strategies

### ArgoCD ApplicationSet for Multi-Cluster Rollouts

ArgoCD ApplicationSet with cluster generator enables multi-cluster progressive delivery:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: multi-cluster-canary
spec:
  generators:
    - clusters:
        selector:
          matchLabels:
            rollout-phase: canary-first
        values:
          weight: "5"
    - clusters:
        selector:
          matchLabels:
            rollout-phase: canary-second
        values:
          weight: "25"
    - clusters:
        selector:
          matchLabels:
            rollout-phase: production
        values:
          weight: "100"
  
  template:
    metadata:
      name: '{{name}}-myapp'
    spec:
      project: default
      source:
        repoURL: https://github.com/team/app-config
        targetRevision: HEAD
        path: 'clusters/{{name}}/myapp'
        helm:
          parameters:
            - name: canary.weight
              value: '{{values.weight}}'
      destination:
        server: '{{server}}'
        namespace: myapp
      syncPolicy:
        automated:
          prune: true
          selfHeal: true
  
  strategy:
    type: canary
    canary:
      steps:
        - matchExpressions:
            - key: rollout-phase
              operator: In
              values:
                - canary-first
          maxCluster: 100%
          # Wait for analysis before proceeding
        - matchExpressions:
            - key: rollout-phase
              operator: In
              values:
                - canary-second
          maxCluster: 100%
        - matchExpressions:
            - key: rollout-phase
              operator: In
              values:
                - production
          maxCluster: 100%
```

### Flagger Multi-Cluster Canary

Flagger supports multi-cluster canary with mesh-based traffic routing:

```yaml
apiVersion: flagger.app/v1beta1
kind: Canary
metadata:
  name: myapp
  namespace: prod
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  
  # Multi-cluster service mesh routing
  service:
    port: 80
    targetPort: 8080
    gateways:
      - istio-system/multi-cluster-gateway
    hosts:
      - myapp.global.example.com
  
  analysis:
    interval: 60s
    threshold: 5
    maxWeight: 50
    stepWeight: 10
    
    metrics:
      - name: request-success-rate
        thresholdRange:
          min: 99
        interval: 1m
      - name: request-duration
        thresholdRange:
          max: 500
        interval: 1m
    
    webhooks:
      - name: multi-cluster-analysis
        type: rollout
        url: http://canary-analyzer.observability:8080/analyze
        timeout: 30s
        metadata:
          clusters: "us-east-1,eu-west-1,ap-southeast-1"
          aggregation: "global-error-rate"
```

### Cilium ClusterMesh for Multi-Region Canary

Cilium ClusterMesh enables service discovery and traffic routing across clusters:

```yaml
# Global service for canary routing
apiVersion: v1
kind: Service
metadata:
  name: myapp-global
  annotations:
    service.cilium.io/global: "true"
spec:
  type: ClusterIP
  selector:
    app: myapp
---
# Multi-cluster service export
apiVersion: cilium.io/v2
kind: CiliumServiceExport
metadata:
  name: myapp-global
spec:
  service:
    name: myapp-global
    namespace: prod
---
# Traffic policy for canary weight across clusters
apiVersion: cilium.io/v2
kind: CiliumClusterwideNetworkPolicy
metadata:
  name: canary-traffic
spec:
  nodeSelector:
    matchLabels:
      "cilium.io/operator": "true"
  egress:
    - toServices:
        - name: myapp-global
          namespace: prod
      trafficPolicy:
        canary:
          clusters:
            - name: us-east-1
              weight: 100
            - name: eu-west-1
              weight: 10   # canary region
            - name: ap-southeast-1
              weight: 0    # not yet deployed
```

## Integration Patterns

### Global Load Balancer Integration

```hcl
# Terraform: Global load balancer with canary support
resource "aws_globalaccelerator_accelerator" "main" {
  name            = "myapp-global"
  ip_address_type = "IPV4"
  enabled         = true
}

resource "aws_globalaccelerator_endpoint_group" "canary" {
  listener_arn          = aws_globalaccelerator_listener.main.arn
  endpoint_group_region = "us-east-1"
  traffic_dial_percentage = 5  # canary region gets 5%
  
  endpoint_configuration {
    endpoint_id = aws_lb.us-east-1.arn
    weight      = 100
  }
}

resource "aws_globalaccelerator_endpoint_group" "secondary" {
  listener_arn          = aws_globalaccelerator_listener.main.arn
  endpoint_group_region = "eu-west-1"
  traffic_dial_percentage = 25
  
  endpoint_configuration {
    endpoint_id = aws_lb.eu-west-1.arn
    weight      = 100
  }
}

resource "aws_globalaccelerator_endpoint_group" "production" {
  listener_arn          = aws_globalaccelerator_listener.main.arn
  endpoint_group_region = "ap-southeast-1"
  traffic_dial_percentage = 100
  
  endpoint_configuration {
    endpoint_id = aws_lb.ap-southeast-1.arn
    weight      = 100
  }
}
```

### Multi-Region Observability Aggregation

```yaml
# Thanos query for cross-region canary analysis
apiVersion: v1
kind: ConfigMap
metadata:
  name: thanos-query-config
  namespace: observability
data:
  thanos.yaml: |
    type: QUERY
    stores:
      - us-east-1-thanos-store:10901
      - eu-west-1-thanos-store:10901
      - ap-southeast-1-thanos-store:10901
    
    query:
      auto-downsampling: true
      max-concurrent: 20
      timeout: 1m
    
    # Cross-region canary analysis queries
    rules:
      - record: global:canary:error_rate
        expr: |
          sum by (version) (
            rate(http_requests_total{status=~"5.."}[5m])
          )
          / 
          sum by (version) (
            rate(http_requests_total[5m])
          )
      
      - record: region:canary:error_rate
        expr: |
          sum by (region, version) (
            rate(http_requests_total{status=~"5.."}[5m])
          )
          / 
          sum by (region, version) (
            rate(http_requests_total[5m])
          )
```

## Performance Optimization

### Multi-Region Synchronization

| Aspect | Optimization | Trade-off |
|--------|-------------|-----------|
| Configuration sync | GitOps with polling interval 3m vs webhook 10s | Polling reduces load |
| Traffic shifting | Gradual, coordinated across regions | Slower rollout |
| Metric aggregation | Store-side deduplication | Query time reduction |
| Rollback propagation | Parallel rollback across clusters | Resource contention |
| Canary promotion | Per-region independent gates | Longer total rollout time |

### Latency-Aware Canary Progression

Progressive delivery across regions must account for network latency between clusters:

```
├── Same-region canary: 30-second analysis intervals
├── Cross-region canary: 60-second analysis intervals (account for metric propagation)
├── Cross-continent canary: 120-second analysis intervals (significant latency)
└── Global canary: 5-minute analysis windows (aggregation delay)
```

## Security Considerations

### Multi-Cluster Credential Management

Each cluster in a multi-region rollout requires its own deployment credentials. A compromise in one cluster must not affect others:

| Credential Type | Isolation Strategy | Rotation |
|-----------------|--------------------|----------|
| Deployment tokens | Per-cluster service accounts | Hourly, automated |
| Container registry | Per-region registry with replication | Token per registry |
| Secret store access | Per-cluster Vault instance | Dynamic secrets |
| Monitoring API keys | Per-region observability account | Monthly |
| Git access | Read-only deploy keys per cluster | Revoked on cluster teardown |

### Cross-Region Data Flow

When rolling out across regions, data flow between regions creates security and compliance considerations:

- Data leaving a region may violate data residency requirements
- Observability data aggregated across regions may reveal sensitive business information
- Rollback commands issued from one region may not be trusted in another region
- Compliance requirements (GDPR, SOC 2) may differ per region

```yaml
# Region-specific policy enforcement
metadata:
  annotations:
    compliance.data-residency: "eu-only"
    compliance.regulations: "GDPR"
spec:
  analysis:
    metrics:
      - name: region-specific-success-rate
        interval: 1m
        query: |
          # Only aggregate within same region
          sum(
            rate(http_requests_total{region="eu-west-1"}[5m])
          )
```

## Operational Excellence

### Multi-Region Rollout Runbook

| Phase | Action | Duration | Success Criteria |
|-------|--------|----------|------------------|
| Pre-rollout | Verify all clusters healthy, check SLOs | 10 min | All clusters green |
| Region 1 canary (5%) | Deploy to us-east-1, 5% traffic | 15 min | Metrics pass 5 min |
| Region 1 full (100%) | Promote to 100% in us-east-1 | 10 min | Steady state achieved |
| Region 1 validation | Extended monitoring | 30 min | No latent issues |
| Region 2 canary (25%) | Deploy to eu-west-1, 25% traffic | 15 min | Metrics pass |
| Region 2 full (100%) | Promote in eu-west-1 | 10 min | Steady state |
| Region 3 rollout | Deploy to ap-southeast-1 | 15 min | Metrics pass |
| Global verification | All regions at 100% | 60 min | Global SLOs met |
| Post-rollout | Monitor for 24h, gather feedback | 24h | No rollback needed |

### Rollback Coordination

When a multi-cluster rollout needs rollback, coordinate across regions:

```yaml
# Global rollback procedure
rollback:
  triggers:
    - condition: "global_error_rate > 1% for 2 minutes"
      action: "instant_global_rollback"
    - condition: "any_region_error_rate > 5%"
      action: "rollback_affected_cluster"
    - condition: "p99_latency > 1s in 2+ regions"
      action: "global_rollback_after_approval"
  
  execution:
    - stage: "halt_global_traffic"
      action: "revert_all_global_lb_traffic_to_previous_version"
      duration: "immediate"
    - stage: "rollback_deployments"
      action: "revert_all_deployments_to_previous_version"
      duration: "2-5 minutes"
    - stage: "verify_rollback"
      action: "confirm_all_clusters_on_previous_version"
      duration: "1 minute"
    - stage: "restore_traffic"
      action: "restore_global_lb_traffic"
      duration: "immediate"
```

## Testing Strategy

### Multi-Cluster Canary Testing

| Test | Method | Success Criteria |
|------|--------|------------------|
| Traffic routing verification | Deploy canary to one region, verify weight | Correct traffic percentage |
| Cross-region metric aggregation | Deploy canary to 2+ regions, query global metric | Aggregated view matches region views |
| Regional rollback isolation | Trigger rollback in one region, verify others unaffected | Only affected region rolls back |
| Global rollback coordination | Trigger global rollback, verify all regions | All regions roll back within 2 minutes |
| Network partition resilience | Simulate region outage during canary | Canary pauses, existing traffic unaffected |
| Data consistency | Verify data across regions after rollout | No divergence, conflict resolution works |
| Latency impact | Measure cross-region analysis latency | Analysis completes within interval |

## Common Pitfalls

| Pitfall | Symptom | Resolution |
|---------|---------|------------|
| Globally consistent rollback assumption | Network partition leaves some clusters on new version | Independent per-cluster rollback with global coordination mark |
| Metric aggregation window mismatch | Canary appears to pass but region-specific issues hidden | Per-region and global analysis required |
| Traffic routing latency | Canary analysis completes before traffic reaches canary | Synchronize analysis start with traffic propagation |
| Credential synchronization failure | Some clusters can't pull new container image | Image replication across registries, pre-warming |
| Configuration drift across clusters | Clusters have different environment variables | GitOps with centralized config, per-cluster overrides |
| Compliance inconsistency | Some regions require data residency for canary metrics | Per-region observability, no cross-border metric aggregation |
| Load balancer propagation delay | DNS TTL causes traffic to reach old or wrong version | Low TTL during rollouts, use weight-based routing |
| Parallel canary interference | Two canaries running simultaneously affect analysis | Serial canary execution, queue management |
| Rollback race conditions | Partial rollback leaves cluster mix of versions | Ordered rollback steps, confirmation at each stage |
| Observability pipeline saturation | Cross-region metric queries overload Thanos/Cortex | Query limits, pre-aggregation, targeted queries |

## Key Takeaways

- Multi-cluster progressive delivery requires a topology choice (hub-and-spoke, mesh, cell-based, or staged) that matches organizational structure and compliance requirements
- Traffic routing across clusters must account for DNS propagation, load balancer behavior, and service mesh capabilities — not all traffic is created equal across regions
- Observability aggregation is the hardest technical challenge; metrics, traces, and logs from different regions must be queryable as a unified view while respecting data residency
- Rollback coordination must handle network partitions, partial failures, and credential differences — design for the worst case where one cluster cannot be reached
- Each region should progress through progressive delivery independently once organizational confidence is established; global rollouts can accelerate after the first successful region
- Data consistency strategy drives the rollout architecture — stateless services are easy, stateful services require careful consideration of replication and conflict resolution
- Per-cluster credentials are essential for security isolation; a compromise in one region must not propagate to others
- Compliance requirements may prevent cross-region observability aggregation; metric collection and analysis must respect data residency boundaries
- Test multi-cluster rollouts with network partitions intentionally — the rollback procedure must work even when some clusters are unreachable
- Automation of cross-region coordination should be supported by manual override capabilities for exceptional circumstances
