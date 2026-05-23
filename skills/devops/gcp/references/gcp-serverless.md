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
        run.googleapis.com/vpc-access-egress: private-ranges-only
    spec:
      containerConcurrency: 80
      timeoutSeconds: 300
      serviceAccountName: myapp-sa@my-project.iam.gserviceaccount.com
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
        env:
        - name: ENV
          value: prod
```

## Deploy via gcloud
```bash
gcloud builds submit --tag us-central1-docker.pkg.dev/my-project/myapp/myapp:latest
gcloud run deploy myapp \
  --image us-central1-docker.pkg.dev/my-project/myapp/myapp:latest \
  --region us-central1 --platform managed \
  --allow-unauthenticated --max-instances 10 --min-instances 0 \
  --concurrency 80 --cpu 2 --memory 1Gi \
  --set-env-vars "ENV=prod,DB_CONNECTION=prod-db" \
  --set-secrets "API_KEY=api-key:latest" \
  --vpc-connector my-connector --vpc-egress private-ranges-only \
  --service-account myapp-sa@my-project.iam.gserviceaccount.com
```

## Cloud Functions (2nd Gen)
```bash
gcloud functions deploy my-function --gen2 --region us-central1 \
  --runtime nodejs20 --source ./functions --entry-point handleRequest \
  --trigger-http --allow-unauthenticated --memory 256Mi --timeout 60s \
  --min-instances 0 --max-instances 10 \
  --set-env-vars "ENV=prod" \
  --service-account myapp-sa@my-project.iam.gserviceaccount.com

gcloud functions deploy process-order --gen2 --region us-central1 \
  --runtime python311 --source ./functions --entry-point process_order \
  --trigger-topic orders-created --memory 512Mi --timeout 540s
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
gcloud tasks queues create email-queue \
  --max-concurrent-dispatches 10 --max-attempts 3 \
  --min-backoff 10s --max-backoff 300s \
  --max-doublings 2 --dead-letter-topic email-dlq

gcloud tasks create-http-task \
  --queue email-queue \
  --url https://email-service/api/send \
  --body '{"to":"user@example.com","template":"welcome"}' \
  --headers "Content-Type=application/json" \
  --schedule-time "2026-05-23T10:00:00Z"
```

## Cost Management
```bash
gcloud run deploy myapp --max-instances 10 --min-instances 0 --region us-central1
gcloud run deploy myapp-dev --min-instances 0 --region us-central1
```
Set max instances to control cost (prevents runaway scaling). Min instances=0 for dev to scale to zero when idle. CPU-throttling=false ensures CPU is allocated during request processing. Enable billing exports to BigQuery for detailed cost analysis per service, per revision.

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
Add Cloud Deploy for progressive delivery: Skaffold renders manifests, Cloud Deploy promotes across targets (dev -> staging -> prod) with approval gates.

## Key Points
- Cloud Run is ideal for stateless HTTP services, Cloud Functions for event-driven processing
- Always set max-instances to control cost in production
- Use VPC connector for private network access from Cloud Run
- Secrets managed via Secret Manager, not env vars
- Eventarc routes events from 60+ GCP sources to Cloud Run/Functions
- Cloud Tasks with dead-letter topics for reliable async processing
- Cloud Build images are free — pay only for compute time
- Service account per microservice for least-privilege IAM
