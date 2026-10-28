---
name: kubernetes-internals
description: >
  Use this skill when the user says 'kubernetes internals', 'etcd raft', 'resourceVersion', 'watch cache', 'informers and list-watch', 'admission chain', 'kubelet pod lifecycle', 'cri cni csi', 'apiserver request flow', 'optimistic concurrency kubernetes', 'etcd compaction defrag'. Explains the Kubernetes control plane under the hood — etcd/Raft and MVCC, apiserver request pipeline and watch cache, controller reconciliation, kubelet with CRI/CNI/CSI — to debug and tune clusters. Do NOT use for: component overview and deployment strategies (kubernetes-architecture), writing controllers (cloud-native-k8s-operators), workload YAML patterns (cloud-native-kubernetes-patterns).
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [devops, kubernetes, etcd, raft, apiserver, kubelet, cni, internals]
---

# Kubernetes Control Plane Internals

## Purpose
Kubernetes is a set of independent control loops coordinating through one strongly consistent API. Knowing how writes are persisted, how watches are served, and how the kubelet realizes pods explains conflicts (409), "too old resource version" (410), slow API servers, and pods stuck in `ContainerCreating`.

## Agent Protocol

### Trigger
"kubernetes internals", "etcd raft", "resourceVersion", "watch cache", "list-watch", "admission chain", "kubelet pod lifecycle", "CRI CNI CSI", "apiserver request flow", "optimistic concurrency", "etcd defrag".

### Input Context
- Cluster size (nodes, pods, objects), managed vs self-managed control plane.
- Symptom: latency, errors (409/410/429), etcd alarms, stuck pods.

### Output Artifact
Explanation + diagnostic commands + tuning. No file unless requested.

### Response Format
```
Layer: {etcd|apiserver|controller|scheduler|kubelet|CRI|CNI|CSI}
Mechanism: {...}
Evidence: {metric / log / command}
Action: {fix or tuning}
```

### Completion Criteria
- [ ] Symptom attributed to a specific layer with evidence.
- [ ] Tuning suggestions are safe for the managed/self-managed context.

## 1. etcd: Raft + MVCC
- **Raft:** one leader; writes go to the leader, which appends to its log and replicates `AppendEntries` to followers; an entry commits when a majority persists it. 3 members tolerate 1 failure, 5 tolerate 2. More members = slower writes.
- **MVCC:** every write creates a new revision of the keyspace; old revisions are retained until **compaction** (the apiserver compacts every 5 minutes by default via `--etcd-compaction-interval`). Compaction frees logical space; **defragmentation** returns disk space to the filesystem (run per member, one at a time — it blocks that member).
- **Quota:** default backend quota 2 GiB (`--quota-backend-bytes`, commonly raised to 8 GiB). Exceeding it raises a `NOSPACE` alarm and etcd becomes read-only until compaction + defrag + `etcdctl alarm disarm`.
- Disk latency dominates etcd performance: watch `etcd_disk_wal_fsync_duration_seconds` (p99 should stay well under ~10 ms) and `etcd_server_leader_changes_seen_total`.

```bash
etcdctl endpoint status --write-out=table --cluster
etcdctl alarm list
etcdctl defrag --endpoints=https://10.0.0.11:2379   # one member at a time
```

## 2. kube-apiserver Request Pipeline
`TLS → authentication → audit → impersonation → API priority & fairness → authorization (RBAC/Node/Webhook) → mutating admission (webhooks, MutatingAdmissionPolicy) → schema validation → validating admission (ValidatingAdmissionPolicy, webhooks) → etcd write`
- **resourceVersion** is derived from the etcd revision. Updates send the object's `resourceVersion`; if it changed meanwhile, the write fails with **409 Conflict** (optimistic concurrency). Clients re-read and retry.
- **Watch cache:** the apiserver keeps a cache of recent events per resource type and serves most LIST/WATCH requests from memory. A watch from a `resourceVersion` older than the cache window returns **410 Gone ("too old resource version")** → clients relist.
- **API Priority and Fairness** (`FlowSchema`, `PriorityLevelConfiguration`) queues/limits requests per flow; rejected requests get 429. Misbehaving controllers doing full LISTs are a common cause of apiserver overload.
- Large LISTs: clients should paginate (`limit`/`continue`) or use informers; streaming lists (WatchList) reduce memory spikes in newer versions.

## 3. Controllers and the Informer Pattern
Controllers LIST once, then WATCH; a shared informer keeps a local cache and an indexer, event handlers enqueue object keys into a rate-limited work queue, and workers reconcile from cache state. Leader election uses `Lease` objects in `coordination.k8s.io`.

```go
func (c *Controller) reconcile(ctx context.Context, key string) error {
	ns, name, err := cache.SplitMetaNamespaceKey(key)
	if err != nil {
		return err
	}
	obj, err := c.lister.Deployments(ns).Get(name) // from informer cache
	if apierrors.IsNotFound(err) {
		return nil // deleted; owned objects are garbage collected
	}
	if err != nil {
		return err
	}
	desired := desiredReplicaSet(obj)
	current, err := c.rsLister.ReplicaSets(ns).Get(desired.Name)
	if apierrors.IsNotFound(err) {
		_, err = c.client.AppsV1().ReplicaSets(ns).Create(ctx, desired, metav1.CreateOptions{})
		return err
	}
	if err != nil {
		return err
	}
	if !equality.Semantic.DeepEqual(current.Spec, desired.Spec) {
		updated := current.DeepCopy() // never mutate cache objects
		updated.Spec = desired.Spec
		_, err = c.client.AppsV1().ReplicaSets(ns).Update(ctx, updated, metav1.UpdateOptions{})
		return err // 409 → requeued with backoff
	}
	return nil
}
```

## 4. Scheduler
Watches pods with empty `spec.nodeName`; runs **filter** plugins (resources, taints, affinity, topology spread, volume binding) then **score** plugins; writes a `Binding`. Unschedulable pods go to a backoff queue; `kubectl describe pod` shows the filter reasons ("0/12 nodes are available: 3 Insufficient cpu, ...").

## 5. Kubelet and Node Interfaces
- Watches pods bound to its node (Node authorizer limits what it can read).
- **CRI** (gRPC to containerd/CRI-O): `RunPodSandbox` (creates the pause/sandbox and network namespace) → CNI `ADD` → `PullImage` → `CreateContainer` → `StartContainer`.
- **CNI**: runtime invokes the plugin binary (config in `/etc/cni/net.d`) with `ADD`/`DEL`/`CHECK`; plugin creates the interface (veth/netkit/ENI), assigns IP via IPAM, sets routes.
- **CSI**: `NodeStageVolume`/`NodePublishVolume` mount volumes; controller-side `CreateVolume`/`ControllerPublishVolume` handled by the CSI controller + external-provisioner/attacher sidecars.
- Probes, eviction under node pressure (`memory.available`, `nodefs.available` thresholds), status updates, and **node heartbeats** via `Lease` objects in `kube-node-lease` (cheap) plus periodic NodeStatus.
- Resource metrics come from the kubelet's `/metrics/resource` endpoint (cAdvisor is embedded in the kubelet for container stats).

| Pod stuck in | Usual layer |
|---|---|
| `Pending` | Scheduler (resources, affinity, PVC binding) |
| `ContainerCreating` | CNI (IP exhaustion), CSI (attach/mount), image pull |
| `CrashLoopBackOff` | Application / config / probes |
| `Terminating` | Finalizers, unreachable node, volume detach |

## Diagnostics
```bash
kubectl get --raw='/readyz?verbose'
kubectl get --raw /metrics | grep -E 'apiserver_request_duration_seconds_bucket|apiserver_flowcontrol_rejected_requests_total' | head
kubectl get flowschemas,prioritylevelconfigurations
kubectl get events -A --sort-by=.lastTimestamp | tail -30
journalctl -u kubelet --since "15 min ago"        # on the node
crictl pods; crictl ps -a; crictl logs <id>
```

## Anti-Patterns
- etcd on network disks with high fsync latency, or co-located with noisy workloads.
- Controllers polling with LIST in loops instead of informers.
- Mutating objects from the informer cache (corrupts cache for all consumers).
- Admission webhooks with `failurePolicy: Fail`, long timeouts, and a single replica.
- Huge objects (multi-MB ConfigMaps/CRs); etcd's default request limit is ~1.5 MiB.

## Checklist
- [ ] etcd: SSD/NVMe, fsync latency monitored, compaction + scheduled defrag, backups (`etcdctl snapshot save`) tested.
- [ ] apiserver: APF configured, audit logging, webhook timeouts low.
- [ ] Controllers use informers, paginate, back off on 409/429.
- [ ] Node: kubelet eviction thresholds and reserved resources (`kubeReserved`/`systemReserved`) set.

## References
- Related skills: `skills/devops/orchestration/kubernetes-architecture/SKILL.md`, `skills/cloud-native/k8s-operators/SKILL.md`, `skills/devops/kubernetes/SKILL.md`.
