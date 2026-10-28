# Running Blockchain Nodes on Kubernetes

Patterns for operating stateful blockchain nodes (Ethereum EL/CL pairs, L2 nodes, Cosmos, Solana RPC) on Kubernetes: StatefulSets, local storage, P2P networking, probes, upgrades, and scaling RPC capacity. Bare-metal and Ansible deployment are in `node-deployment.md`.

## When Kubernetes Fits

| Good fit | Poor fit |
|----------|----------|
| Fleets of RPC nodes behind a proxy | A single validator where simplicity matters most |
| Many networks/environments (devnet, testnet, mainnet) | Solana validators needing kernel tuning and dedicated hosts |
| Teams already running K8s with GitOps | Clusters without local NVMe or with heavy CPU limits |

Kubernetes adds scheduling, rollout, and observability tooling but does not make a node "stateless": each replica still owns hundreds of GB to multiple TB of data.

## StatefulSet with Paired Containers

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata: { name: eth-mainnet, namespace: nodes }
spec:
  serviceName: eth-mainnet
  replicas: 2
  podManagementPolicy: Parallel
  selector: { matchLabels: { app: eth-mainnet } }
  template:
    metadata: { labels: { app: eth-mainnet } }
    spec:
      terminationGracePeriodSeconds: 300      # let the EL flush state on shutdown
      affinity:
        podAntiAffinity:
          requiredDuringSchedulingIgnoredDuringExecution:
            - labelSelector: { matchLabels: { app: eth-mainnet } }
              topologyKey: kubernetes.io/hostname
      containers:
        - name: execution
          image: ethereum/client-go:<pinned>
          args: ["--mainnet", "--datadir=/data", "--http", "--http.addr=0.0.0.0",
                 "--http.api=eth,net,web3", "--authrpc.addr=127.0.0.1",
                 "--authrpc.jwtsecret=/secrets/jwt.hex", "--metrics", "--metrics.addr=0.0.0.0"]
          ports:
            - { name: rpc, containerPort: 8545 }
            - { name: p2p-tcp, containerPort: 30303, protocol: TCP }
            - { name: p2p-udp, containerPort: 30303, protocol: UDP }
          resources:
            requests: { cpu: "4", memory: 32Gi }
            limits: { memory: 32Gi }
          volumeMounts:
            - { name: el-data, mountPath: /data }
            - { name: jwt, mountPath: /secrets, readOnly: true }
          readinessProbe:
            exec:
              command: ["sh", "-c", "geth attach --exec 'eth.syncing' /data/geth.ipc | grep -q false"]
            periodSeconds: 30
          livenessProbe:
            tcpSocket: { port: 8545 }
            initialDelaySeconds: 120
        - name: consensus
          image: sigp/lighthouse:<pinned>
          args: ["lighthouse", "bn", "--network=mainnet", "--datadir=/data",
                 "--execution-endpoint=http://127.0.0.1:8551", "--execution-jwt=/secrets/jwt.hex",
                 "--checkpoint-sync-url=https://<trusted-checkpoint-provider>", "--http", "--http-address=0.0.0.0"]
          volumeMounts:
            - { name: cl-data, mountPath: /data }
            - { name: jwt, mountPath: /secrets, readOnly: true }
      volumes:
        - name: jwt
          secret: { secretName: eth-jwt, defaultMode: 0400 }
  volumeClaimTemplates:
    - metadata: { name: el-data }
      spec:
        accessModes: [ReadWriteOnce]
        storageClassName: local-nvme
        resources: { requests: { storage: 4Ti } }
    - metadata: { name: cl-data }
      spec:
        accessModes: [ReadWriteOnce]
        storageClassName: local-nvme
        resources: { requests: { storage: 500Gi } }
```

Putting EL and CL in the same pod keeps the Engine API on localhost. Size storage from current client documentation plus headroom.

## Storage Classes

| Option | Pros | Cons |
|--------|------|------|
| Local PV (static or via local-path / TopoLVM / OpenEBS LVM) | Highest IOPS, lowest latency | Pod pinned to node; node loss = resync or restore |
| Cloud block storage with provisioned IOPS | Survives node loss, snapshots | Cost; latency higher than local NVMe |
| Network filesystems (NFS, CephFS) | Shared | Too slow for chain databases; avoid |

With local PVs, plan recovery via `VolumeSnapshot`s (if the CSI driver supports them), periodic off-node backups, or rapid resync from a peer node's snapshot.

## P2P Networking

Nodes need inbound P2P connectivity for healthy peer counts.

| Approach | Notes |
|----------|-------|
| `hostPort` / `hostNetwork` | Simple; one pod per node per port; advertise the node's public IP |
| NodePort per replica | Use a per-pod Service selecting `statefulset.kubernetes.io/pod-name`; set the client's advertised port to the NodePort |
| LoadBalancer per replica | Stable public IP per pod; cost per LB |

Advertise the external address explicitly (Geth `--nat extip:<ip>`, Lighthouse `--enr-address`, `--enr-tcp-port`, `--enr-udp-port`), often via an init container that discovers the node IP.

## RPC Access

- Expose RPC through an internal Service to an RPC proxy (method allow-lists, caching, rate limits) — see `rpc-infrastructure.md`.
- Route only to ready (synced) pods; the readiness probe above removes lagging nodes from Service endpoints.
- WebSocket subscriptions are long-lived; configure the proxy for connection draining during rollouts.

## Upgrades and Disruptions

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata: { name: eth-mainnet }
spec:
  maxUnavailable: 1
  selector: { matchLabels: { app: eth-mainnet } }
```

- `updateStrategy: RollingUpdate` with `partition` lets you canary a new client version on one replica first.
- Give generous `terminationGracePeriodSeconds`; killing an EL mid-write can corrupt the database or force long recovery.
- Avoid CPU limits (CFS throttling causes missed blocks during spikes); set requests sized for peak and memory limit = request.
- Coordinate cluster node drains (Karpenter, cluster autoscaler) with PDBs; consider `karpenter.sh/do-not-disrupt` annotations for nodes with local data.

## Helm and GitOps

- Community charts such as ethpandaops `ethereum-helm-charts` cover many EL/CL clients; review defaults (ports, probes, resources) before production.
- Manage per-network values files in Git and deploy via Argo CD or Flux; pin chart and image versions.
- Store the JWT secret and any validator material via External Secrets (`external-secrets.io/v1`) or Sealed Secrets, never in values files.

## Validators on Kubernetes

Possible but risky: rescheduling or a stuck old pod can result in two signers. If used:

- `replicas: 1`, `podManagementPolicy: OrderedReady`, and a remote signer with slashing protection (Web3Signer + PostgreSQL).
- Never use Deployments for validator clients (rolling updates start the new pod before the old one stops).

## Monitoring

- Scrape EL/CL metrics with ServiceMonitors; dashboard sync lag (head block vs reference), peer counts, disk usage, RPC latency.
- Alert when ready replicas fall below the number required to serve traffic.

## Pitfalls

- Network storage too slow; node never catches up.
- No advertised external address; peers cannot dial in.
- Short grace period corrupting the database on each rollout.
- Shared JWT secret mounted with world-readable permissions.

## Checklist

- [ ] StatefulSet with anti-affinity and PDB
- [ ] Local NVMe or provisioned-IOPS storage, backup path defined
- [ ] P2P ports reachable and advertised correctly
- [ ] Readiness based on sync status; liveness on process only
- [ ] No CPU limits; memory request = limit
- [ ] Versions pinned; canary via StatefulSet partition
- [ ] Secrets via External Secrets or Sealed Secrets
