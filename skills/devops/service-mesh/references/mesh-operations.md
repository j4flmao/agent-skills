# Service Mesh Operations

## Upgrade Procedure

### Istio Upgrade

```bash
# 1. Pre-check
istioctl x precheck

# 2. Install canary revision
istioctl install --set revision=canary -y

# 3. Verify canary control plane
istioctl proxy-status

# 4. Relabel namespaces for new revision
kubectl label ns default istio.io/rev=canary --overwrite

# 5. Roll pods to inject new sidecar
kubectl rollout restart deployment -n default

# 6. Verify all proxies on new revision
istioctl proxy-status | grep default

# 7. Remove old control plane
istioctl uninstall --revision 1-20-0 -y
```

### Linkerd Upgrade

```bash
linkerd version
linkerd check --pre
linkerd upgrade | kubectl apply --prune -l linkerd.io/control-plane-ns=linkerd -f -
linkerd check
```

## Troubleshooting

| Symptom | Diagnosis | Fix |
|---------|-----------|-----|
| Sidecar not injected | `kubectl describe pod`, check namespace label, webhook | Add label, restart pod, check webhook config |
| 503 errors in mesh | `istioctl proxy-status`, check endpoints | Verify DestinationRule circuit breaker, subset labels |
| High sidecar memory | `istioctl proxy-config clusters`, check connection count | Reduce connection pool limits, upgrade Envoy |
| mTLS failure | `istioctl authn tls-check`, check PeerAuthentication | Verify PeerAuthentication mode, cert expiry |
| Gateway connection refused | `istioctl proxy-status gateway` | Check gateway pod, ServiceEntry for external |
| Pilot high CPU | `istioctl dashboard pilot`, check xDS pushes | Reduce service mesh size, optimize VirtualServices |

## Performance Tuning

| Parameter | Default | High Traffic Tuning |
|-----------|---------|-------------------|
| Sidecar CPU request | 100m | 500m-1 CPU |
| Sidecar memory request | 128Mi | 512Mi-1Gi |
| Envoy worker threads | 2 | Half CPU cores |
| Access log sampling | 100% | 1% (production) |
| `EXCLUDE_INBOUND_PORTS` | none | Add 22, 8443 for health probes |
| `PILOT_MAX_REQUESTS_PER_CONNECTION` | 50 | 100 for large clusters |

## Multi-Cluster Mesh

| Model | Setup | Best For |
|-------|-------|----------|
| Multi-primary | Each cluster hosts its own control plane, east-west gateway for cross-cluster | Independent teams, fault isolation |
| Primary-remote | Single control plane manages remote cluster | Centralized management |
| Mesh federation | Independent meshes share specific services | Organizational boundaries |

```bash
# Multi-primary setup
istioctl install --set profile=production --set meshConfig.accessLogFile=/dev/stdout
kubectl create namespace istio-system
kubectl create secret generic cacerts -n istio-system \
  --from-file=ca-cert.pem ... # Same root CA for both clusters
istioctl create-remote-secret --name=cluster-2 | kubectl apply -f -
```

## VM Workload Expansion

```bash
# Register VM
istioctl x workload entry configure -f workloadgroup.yaml -o output-dir

# On VM
bash output-dir/install.sh
```

```yaml
apiVersion: networking.istio.io/v1
kind: WorkloadGroup
metadata:
  name: legacy-vm
spec:
  template:
    ports:
      http: 8080
    serviceAccount: legacy-vm-sa
```

## Egress Control

| Pattern | When |
|---------|------|
| ServiceEntry + TLS origination | External HTTPS APIs |
| Egress Gateway | Audited outbound traffic, security policy |
| Block-all-egress | Strict security, explicit allowlist |
| Wildcard ServiceEntry | Dev/test environments |
