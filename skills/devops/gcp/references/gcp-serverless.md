# GCP Serverless

## Cloud Run Service

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: myapp
  namespace: my-project
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: "10"
        autoscaling.knative.dev/minScale: "1"
        run.googleapis.com/cpu-throttling: "false"
    spec:
      containerConcurrency: 80
      timeoutSeconds: 300
      containers:
      - image: us-central1-docker.pkg.dev/my-project/myapp/myapp:latest
        ports:
        - containerPort: 8080
        resources:
          limits:
            cpu: "2"
            memory: 1Gi
        startupProbe:
          tcpSocket:
            port: 8080
          initialDelaySeconds: 0
          periodSeconds: 10
          failureThreshold: 3
```

## Deploy via gcloud

```bash
# Build and deploy
gcloud builds submit --tag us-central1-docker.pkg.dev/my-project/myapp/myapp:latest
gcloud run deploy myapp \
  --image us-central1-docker.pkg.dev/my-project/myapp/myapp:latest \
  --region us-central1 \
  --platform managed \
  --allow-unauthenticated \
  --max-instances 10 \
  --min-instances 0 \
  --concurrency 80 \
  --cpu 2 \
  --memory 1Gi \
  --set-env-vars "ENV=prod,DB_CONNECTION=prod-db" \
  --set-secrets "API_KEY=api-key:latest" \
  --vpc-connector my-connector \
  --vpc-egress private-ranges-only
```

## Cloud Functions (2nd Gen)

```bash
# HTTP function
gcloud functions deploy my-function \
  --gen2 \
  --region us-central1 \
  --runtime nodejs20 \
  --source ./functions \
  --entry-point handleRequest \
  --trigger-http \
  --allow-unauthenticated \
  --memory 256Mi \
  --timeout 60s \
  --min-instances 0 \
  --max-instances 10 \
  --set-env-vars "ENV=prod"

# Event-driven function (Pub/Sub)
gcloud functions deploy process-order \
  --gen2 \
  --region us-central1 \
  --runtime python311 \
  --source ./functions \
  --entry-point process_order \
  --trigger-topic orders-created \
  --memory 512Mi \
  --timeout 540s
```

## Eventarc

```yaml
apiVersion: eventing.knative.dev/v1
kind: Trigger
metadata:
  name: order-trigger
spec:
  broker: default
  filter:
    attributes:
      type: google.cloud.pubsub.topic.v1.messagePublished
  subscriber:
    ref:
      apiVersion: serving.knative.dev/v1
      kind: Service
      name: order-processor
```

## Cloud Tasks

```bash
# Create queue
gcloud tasks queues create email-queue \
  --max-concurrent-dispatches 10 \
  --max-attempts 3 \
  --min-backoff 10s \
  --max-backoff 300s

# Create task
gcloud tasks create-http-task \
  --queue email-queue \
  --url https://email-service/api/send \
  --body '{"to":"user@example.com","template":"welcome"}' \
  --headers "Content-Type=application/json"
```

## Cost Management

```bash
# Set max instances to control cost
gcloud run deploy myapp --max-instances 10 --region us-central1

# Set min instances = 0 for dev
gcloud run deploy myapp-dev --min-instances 0 --region us-central1

# Enable cost breakdown
# Billing exports to BigQuery for detailed cost analysis
```

## Cloud Build CI/CD

```yaml
steps:
- name: 'gcr.io/cloud-builders/docker'
  args: ['build', '-t', 'us-central1-docker.pkg.dev/$PROJECT_ID/myapp/myapp:$SHORT_SHA', '.']
- name: 'gcr.io/cloud-builders/docker'
  args: ['push', 'us-central1-docker.pkg.dev/$PROJECT_ID/myapp/myapp:$SHORT_SHA']
- name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
  entrypoint: gcloud
  args: ['run', 'deploy', 'myapp', '--image', 'us-central1-docker.pkg.dev/$PROJECT_ID/myapp/myapp:$SHORT_SHA', '--region', 'us-central1']
substitutions:
  _REGION: us-central1
options:
  logging: CLOUD_LOGGING_ONLY
```
