# GCP GKE

## Cluster Creation (Autopilot)
```bash
gcloud container clusters create-auto gke-prod \
  --region us-central1 \
  --project my-project \
  --release-channel regular

gcloud container clusters get-credentials gke-prod --region us-central1
```

## Cluster Creation (Standard)
```bash
gcloud container clusters create gke-prod \
  --region us-central1 \
  --node-locations us-central1-a,us-central1-b,us-central1-c \
  --num-nodes 3 \
  --machine-type e2-standard-4 \
  --enable-autoscaling --min-nodes 1 --max-nodes 10 \
  --workload-pool my-project.svc.id.goog \
  --network default --subnetwork default \
  --enable-private-nodes \
  --master-ipv4-cidr 172.16.0.0/28
```

## Node Pools
```bash
gcloud container node-pools create system-pool \
  --cluster gke-prod --region us-central1 \
  --machine-type e2-standard-4 --num-nodes 3 \
  --node-labels node-pool-type=system \
  --node-taints node-pool-type=system:NoSchedule

gcloud container node-pools create user-pool \
  --cluster gke-prod --region us-central1 \
  --machine-type e2-standard-8 \
  --enable-autoscaling --min-nodes 2 --max-nodes 20 \
  --node-labels node-pool-type=user

gcloud container node-pools create spot-pool \
  --cluster gke-prod --region us-central1 \
  --machine-type e2-standard-4 \
  --enable-autoscaling --min-nodes 0 --max-nodes 10 \
  --spot --node-labels node-pool-type=spot
```

## Workload Identity
```bash
gcloud iam service-accounts create myapp-sa --project my-project

gcloud iam service-accounts add-iam-policy-binding \
  myapp-sa@my-project.iam.gserviceaccount.com \
  --role roles/iam.workloadIdentityUser \
  --member "serviceAccount:my-project.svc.id.goog[myapp/myapp-sa]"

gcloud container clusters update gke-prod \
  --region us-central1 --workload-pool my-project.svc.id.goog
```
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: myapp-sa
  namespace: myapp
  annotations:
    iam.gke.io/gcp-service-account: myapp-sa@my-project.iam.gserviceaccount.com
```

## Networking
```bash
gcloud compute networks create gke-vpc --subnet-mode custom
gcloud compute networks subnets create gke-subnet \
  --network gke-vpc --region us-central1 \
  --range 10.0.0.0/16 \
  --secondary-range pods=10.1.0.0/16,services=10.2.0.0/20

gcloud compute routers nats create gke-nat \
  --router gke-router --region us-central1 \
  --auto-allocate-nat-external-ips
```

## GKE Gateway Controller
```yaml
apiVersion: gateway.networking.k8s.io/v1
kind: Gateway
metadata:
  name: external-http
spec:
  gatewayClassName: gke-l7-global-external-managed
  listeners:
  - name: http
    protocol: HTTP
    port: 80
```

## Monitoring
```bash
gcloud container clusters update gke-prod \
  --region us-central1 \
  --monitoring=SYSTEM,POD \
  --logging=SYSTEM,WORKLOAD
```

## Vertical Pod Autoscaling
```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: myapp-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: myapp
  updatePolicy:
    updateMode: Auto
  resourcePolicy:
    containerPolicies:
    - containerName: '*'
      minAllowed:
        cpu: 100m
        memory: 128Mi
      maxAllowed:
        cpu: "4"
        memory: 8Gi
```

## Cluster Upgrade
```bash
gcloud container clusters upgrade gke-prod \
  --region us-central1 \
  --master --cluster-version 1.29
gcloud container clusters upgrade gke-prod \
  --region us-central1 \
  --node-pool user-pool
```

## Key Points
- Use Autopilot for simplicity, Standard for control
- Workload Identity eliminates long-lived service account keys
- Separate system and user node pools with taints
- Spot node pools for fault-tolerant batch workloads
- GKE Gateway controller is the modern replacement for Ingress
- VPA recommends resource requests; HPA scales replicas; cluster autoscaler scales nodes
