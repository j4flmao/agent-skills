# Chaos Tools

## Litmus

### Installation

```bash
# Install Litmus via Helm
helm repo add litmus https://litmuschaos.github.io/litmus-helm
helm install chaos litmus/litmus \
  --namespace=litmus \
  --create-namespace \
  --set portal.frontend.service.type=LoadBalancer
```

### Experiment Definition (Pod Kill)

```yaml
apiVersion: litmuschaos.io/v1alpha1
kind: ChaosEngine
metadata:
  name: pod-kill-engine
  namespace: myapp
spec:
  appinfo:
    appns: myapp
    applabel: app=myapp-worker
    appkind: deployment
  chaosServiceAccount: pod-kill-sa
  experiments:
  - name: pod-delete
    spec:
      components:
        env:
        - name: TOTAL_CHAOS_DURATION
          value: "60"
        - name: CHAOS_INTERVAL
          value: "10"
        - name: FORCE
          value: "true"
        - name: TARGET_PODS
          value: "1"
      probe:
      - name: check-app-health
        type: httpProbe
        httpProbe/inputs:
          url: http://myapp-service.health
          insecureSkipVerify: false
        mode: Continuous
        runProperties:
          probeTimeout: 5
          interval: 1
          retry: 1
```

### ChaosHub Experiments

List of built-in experiments: pod-delete, node-cpu-hog, node-memory-hog,
network-latency, network-packet-loss, disk-fill, pod-network-corruption,
pod-autoscaler, pod-dns-error, pod-http-status-code.

## Chaos Mesh

### Installation

```bash
helm repo add chaos-mesh https://charts.chaos-mesh.org
helm install chaos-mesh chaos-mesh/chaos-mesh \
  --namespace=chaos-mesh \
  --create-namespace \
  --set chaosDaemon.runtime=containerd \
  --set chaosDaemon.socketPath=/run/containerd/containerd.sock
```

### Experiment Definition (Network Latency)

```yaml
apiVersion: chaos-mesh.org/v1alpha1
kind: NetworkChaos
metadata:
  name: network-delay
  namespace: myapp
spec:
  action: delay
  mode: one
  selector:
    namespaces: [myapp]
    labelSelectors:
      app: myapp-worker
  delay:
    latency: "2000ms"
    jitter: "500ms"
    correlation: "50"
  duration: "5m"
```

## Gremlin

### Installation (K8s)

```bash
# Deploy Gremlin agent as DaemonSet
kubectl create namespace gremlin
kubectl create secret generic gremlin-team-cert \
  --from-file=./gremlin_cert.pem \
  --from-file=./gremlin_private_key.pem \
  --namespace gremlin
helm install gremlin gremlin/gremlin \
  --namespace gremlin \
  --set gremlin.teamID=$TEAM_ID \
  --set gremlin.clusterID=prod-cluster
```

### Experiment via API

```bash
curl -X POST https://api.gremlin.com/v1/attacks/new \
  -H "Authorization: Bearer $GREMLIN_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "target": {
      "type": "random",
      "count": 1,
      "ephemeralContainers": true,
      "labels": {"app": "myapp-worker"}
    },
    "commands": [{
      "type": "cpu",
      "capacity": 1,
      "length": 60
    }]
  }'
```

## AWS FIS

```bash
# Create experiment template
aws fis create-experiment-template \
  --cli-input-json file://fis-pod-kill.json
```

```json
{
  "description": "Kill random pod in myapp cluster",
  "targets": {
    "myPods": {
      "resourceType": "aws:eks:pod",
      "resourceArns": [],
      "selectionMode": "COUNT(1)",
      "parameters": {
        "clusterArn": "arn:aws:eks:us-east-1:123456789:cluster/prod",
        "namespace": "myapp"
      }
    }
  },
  "actions": {
    "killPods": {
      "actionId": "aws:eks:inject-pod-kill",
      "parameters": {
        "duration": "PT60S"
      },
      "targets": {
        "Pods": "myPods"
      }
    }
  },
  "stopConditions": [{"source": "none"}]
}
```
