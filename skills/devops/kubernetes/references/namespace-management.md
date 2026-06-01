# Kubernetes Namespace and Resource Management

## Namespace Strategies
Team-based: one namespace per team, RBAC bound to namespace. Environment-based: dev/staging/prod as separate namespaces. Tenant isolation: one namespace per tenant for SaaS. System namespaces: kube-system, ingress-nginx, monitoring separate by default. Namespace naming conventions: {team}-{env} format. Default deny network policies per namespace.

## Resource Quotas
apiVersion: v1; kind: ResourceQuota; scope: namespace-level. Hard limits for cpu, memory, pods, services, configmaps, secrets. ScopeSelector for specific priorities (BestEffort, NotTerminating). Quota for storage classes (requests.storage, persistentvolumeclaims). Monitor quota utilization with kubectl describe quota.

## Limit Ranges
Default resource requests/limits per container. Min/max constraints per container or pod. ratio constraint: maxLimitRequestRatio for CPU/memory burst. Apply per namespace, affects all new pods. Prevent runaway resource consumption.

## Priority Classes
system-node-critical, system-cluster-critical for system components. High priority for latency-sensitive workloads. Low priority for batch jobs. Preemption: higher priority evicts lower priority pods. Define priority classes cluster-wide.

## Pod Disruption Budgets
minAvailable: minimum pods that must remain running. maxUnavailable: maximum pods that can be down simultaneously. Applied to deployments, statefulsets, replicasets. Prevent workload disruption during node maintenance. Required for cluster autoscaler scale-down protection.

## Resource Management
Vertical Pod Autoscaler for automatic request/limit recommendations. Cluster Autoscaler for node-level scaling. Descheduler to evict pods from underutilized nodes. Node affinity and anti-affinity for workload placement. Taints and tolerations for dedicated nodes.

## References
- kubernetes-patterns-fundamentals.md -- Kubernetes Fundamentals
- k8s-resources.md -- Resource Management
