# GCP Compute

## Compute Engine (GCE)

| Machine Family | Use Case | vCPU:Memory |
|---------------|----------|-------------|
| General-purpose (N2, N2D) | Balanced workloads | 1:4 |
| Compute-optimized (C2, C2D) | High-performance computing | 1:8 |
| Memory-optimized (M1, M2) | Large in-memory databases | 1:16+ |
| Accelerator-optimized | ML, GPU workloads | With GPU/TPU |

```bash
# Create VM
gcloud compute instances create web-server \
  --zone=us-central1-a \
  --machine-type=e2-standard-2 \
  --image-family=ubuntu-2204-lts \
  --image-project=ubuntu-os-cloud \
  --boot-disk-size=50GB \
  --boot-disk-type=pd-ssd \
  --tags=http-server,https-server

# Create instance template for MIG
gcloud compute instance-templates create web-template \
  --machine-type=e2-standard-2 \
  --image-family=ubuntu-2204-lts \
  --tags=http-server
```

## GKE (Google Kubernetes Engine)

| Mode | Control Plane | Nodes | Use Case |
|------|---------------|-------|----------|
| Standard | Google-managed | Customer-managed | Full control |
| Autopilot | Google-managed | Google-managed | Hands-off, efficiency |

```bash
# Create GKE cluster (Standard)
gcloud container clusters create prod-cluster \
  --region=us-central1 \
  --node-locations=us-central1-a,us-central1-b \
  --num-nodes=3 \
  --machine-type=e2-standard-4 \
  --enable-autoscaling --min-nodes=3 --max-nodes=30 \
  --workload-pool=my-project.svc.id.goog

# Create GKE cluster (Autopilot)
gcloud container clusters create-auto autopilot-cluster \
  --region=us-central1
```

## Cloud Run

```bash
# Deploy container
gcloud run deploy my-service \
  --image=gcr.io/my-project/my-image:v1 \
  --region=us-central1 \
  --platform=managed \
  --allow-unauthenticated \
  --memory=512Mi \
  --cpu=1 \
  --max-instances=100 \
  --min-instances=2 \
  --concurrency=80

# Schedule Cloud Run job
gcloud run jobs create daily-batch \
  --image=gcr.io/my-project/batch:v1 \
  --tasks=10 \
  --parallelism=3 \
  --task-timeout=30m
```

## Cloud Functions (2nd gen)

```bash
# Deploy HTTP function
gcloud functions deploy hello-world \
  --runtime=nodejs20 \
  --region=us-central1 \
  --trigger-http \
  --allow-unauthenticated \
  --memory=256MB \
  --timeout=60s

# Deploy event-driven function
gcloud functions deploy process-upload \
  --runtime=python312 \
  --region=us-central1 \
  --trigger-event-filters=type=google.cloud.storage.object.v1.finalize \
  --trigger-event-filters=bucket=my-upload-bucket
```

## App Engine

| Environment | Scaling | Use Case |
|-------------|---------|----------|
| Standard | Auto-scale to zero | Web apps, APIs |
| Flexible | Manual/auto/managed | Custom runtimes, background processes |

## Batch

```bash
# Submit batch job
gcloud batch jobs submit my-batch-job \
  --location=us-central1 \
  --config=job-config.yaml
```
