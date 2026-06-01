# Kubernetes Scheduling and Pod Placement

## Node Affinity
requiredDuringSchedulingIgnoredDuringExecution: hard constraint, must match node labels. preferredDuringSchedulingIgnoredDuringExecution: soft constraint, weights 1-100. Match expressions: In, NotIn, Exists, DoesNotExist, Gt, Lt. Node selectors: simple equality, planning. Weight-based scoring for preferred affinity.

## Pod Affinity and Anti-Affinity
Pod affinity: co-locate pods on same node/topology. Pod anti-affinity: spread pods across nodes/zones. TopologyKey: kubernetes.io/hostname, topology.kubernetes.io/zone. preferred (soft) vs required (hard) constraints. Impact: hard constraints reduce scheduling flexibility.

## Taints and Tolerations
Taint effect: NoSchedule, PreferNoSchedule, NoExecute. Node taints: dedicated=gpu:NoSchedule, env=prod:NoExecute. Pod toleration: key, operator, value, effect, tolerationSeconds. Taints prevent scheduling, tolerations allow it. NoExecute evicts existing pods without toleration.

## Topology Spread Constraints
maxSkew: maximum difference in pod count across topology domains. topologyKey: zone, hostname, or custom label. whenUnsatisfiable: DoNotSchedule (hard) or ScheduleAnyway (soft). Use with pod anti-affinity for balanced pod distribution. Required for multi-zone HA.

## Pod Priority and Preemption
PriorityClass: value (higher = more important). Preemption: higher priority pod evicts lower priority pods. Non-preempting: allow priority but no preemption. Critical pods: use PriorityClass with high value. Preemption causes pod disruptions.

## Descheduling
Descheduler: evicts pods from underutilized or overutilized nodes. Strategies: RemoveDuplicates, LowNodeUtilization, HighNodeUtilization. Solve fragmentation and imbalance. Prevents pods from staying on poorly placed nodes. Run as CronJob, not continuously.

## References
- kubernetes-patterns-fundamentals.md -- Fundamentals
- k8s-scheduling.md -- Scheduling
- k8s-resources.md -- Resource Management
