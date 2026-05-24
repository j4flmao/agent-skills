# Cloud Foundry and Code Engine

## Cloud Foundry

### Manifest Configuration

```yaml
# manifest.yml
applications:
- name: api-service
  memory: 512M
  instances: 3
  disk_quota: 1G
  buildpack: sdk-for-nodejs
  command: npm start
  random-route: false
  routes:
  - route: api.myapp.example.com
  - route: api-internal.myapp.example.com
  services:
  - my-database
  - my-redis
  - my-logging
  env:
    NODE_ENV: production
    OPTIMIZE_MEMORY: "true"
    LOG_LEVEL: info
  health-check-type: http
  health-check-http-endpoint: /health
  health-check-invocation-timeout: 5
  timeout: 60
---
# manifest with multiple apps
applications:
- name: frontend
  memory: 256M
  instances: 2
  buildpack: staticfile_buildpack
  routes:
  - route: www.myapp.example.com
  path: frontend-dist/
- name: api
  memory: 512M
  instances: 3
  buildpack: java_buildpack
  path: api/target/api.jar
  env:
    JBP_CONFIG_OPEN_JDK_JRE: '{ jre: { version: 21.+ } }'
  services:
  - my-database
- name: worker
  memory: 256M
  instances: 1
  buildpack: nodejs_buildpack
  command: node worker.js
  no-route: true
  env:
    QUEUE_NAME: tasks
```

### Services

```yaml
# Create and bind service instances
# cf create-service databases-for-postgresql standard my-database
# cf create-service redis standard my-redis
# cf bind-service api-service my-database
# cf restage api-service

# User-provided services
# cf create-user-provided-service my-external-api \
#   -p '{"url":"https://api.external.com","key":"abc123"}'
---
# manifest with user-provided service
applications:
- name: api
  services:
  - my-external-api
```

### Buildpacks

| Language | Buildpack | Detection |
|----------|-----------|-----------|
| Java | java_buildpack | pom.xml, build.gradle |
| Node.js | nodejs_buildpack | package.json |
| Python | python_buildpack | requirements.txt, setup.py |
| Ruby | ruby_buildpack | Gemfile |
| Go | go_buildpack | go.mod |
| PHP | php_buildpack | composer.json |
| Static files | staticfile_buildpack | Staticfile |
| .NET Core | dotnet_core_buildpack | *.csproj |
| Binary | binary_buildpack | No detection |

### Auto-Scaling

```bash
# Install auto-scaling plugin
ibmcloud plugin install auto-scaling

# Create auto-scaling policy
cat > scaling-policy.json << 'EOF'
{
  "instance_min_count": 2,
  "instance_max_count": 10,
  "scaling_rules": [
    {
      "metric_type": "cpu",
      "stat_window_seconds": 120,
      "breach_duration_seconds": 300,
      "threshold": 70,
      "operator": ">=",
      "cool_down_seconds": 120,
      "adjustment": "+1"
    },
    {
      "metric_type": "memory",
      "stat_window_seconds": 120,
      "breach_duration_seconds": 600,
      "threshold": 85,
      "operator": ">=",
      "cool_down_seconds": 180,
      "adjustment": "+1"
    },
    {
      "metric_type": "cpu",
      "stat_window_seconds": 120,
      "breach_duration_seconds": 300,
      "threshold": 30,
      "operator": "<=",
      "cool_down_seconds": 120,
      "adjustment": "-1"
    }
  ]
}
EOF

# Attach policy
ibmcloud app-autoscaler policy-update api-service --policy-file scaling-policy.json

# View policy
ibmcloud app-autoscaler policy-get api-service
```

### CLI Commands

```bash
# Login and target
ibmcloud target --cf-api https://api.us-south.cf.cloud.ibm.com -o my-org -s production

# Push an app
cf push api-service

# List apps
cf apps

# View app logs
cf logs api-service --recent

# Tail logs
cf logs api-service

# Scale manually
cf scale api-service -i 5 -m 1G

# SSH into container
cf ssh api-service

# Create service
cf create-service databases-for-postgresql standard my-database

# Bind service
cf bind-service api-service my-database

# Restage (rebuild with new env/services)
cf restage api-service

# Blue-green deploy
cf push api-service-green
cf map-route api-service-green myapp.example.com -n api
cf unmap-route api-service myapp.example.com -n api
cf delete api-service
cf rename api-service-green api-service

# Set env
cf set-env api-service NODE_ENV production
cf restage api-service

# List buildpacks
cf buildpacks

# View service instances
cf services

# Enable auto-scaling
ibmcloud app-autoscaler policy-update api-service --policy-file scaling-policy.json
```

## Code Engine

### Project and Apps

```hcl
resource "ibm_code_engine_project" "serverless" {
  name              = "production-serverless"
  resource_group_id = data.ibm_resource_group.default.id
}

resource "ibm_code_engine_app" "api" {
  project_id = ibm_code_engine_project.serverless.id
  name       = "api-service"
  image_reference = "us.icr.io/myapp/api:latest"

  scale_min_instances = 2
  scale_max_instances = 10
  scale_cpu_limit     = "2"
  scale_memory_limit  = "4G"

  run_env = {
    "NODE_ENV" = "production"
    "LOG_LEVEL" = "info"
  }

  # Image registry access
  image_secret = ibm_code_engine_secret.registry.name
}

resource "ibm_code_engine_secret" "registry" {
  project_id = ibm_code_engine_project.serverless.id
  name       = "registry-secret"
  format     = "registry"
  format_data = {
    server   = "us.icr.io"
    username = "iamapikey"
    password = var.ibm_api_key
  }
}
```

### Jobs and Cron Jobs

```hcl
# One-time job
resource "ibm_code_engine_job" "batch" {
  project_id = ibm_code_engine_project.serverless.id
  name       = "nightly-batch"
  image_reference = "us.icr.io/myapp/batch:latest"
  scale_cpu_limit    = "4"
  scale_memory_limit = "8G"
  run_env = {
    "JOB_TYPE" = "processing"
  }
}

# Cron job (scheduled job)
resource "ibm_code_engine_job_run" "daily_batch" {
  project_id = ibm_code_engine_project.serverless.id
  job_name   = ibm_code_engine_job.batch.name
  cron_schedule = "0 2 * * *"
}
```

### Builds

```hcl
# Code Engine build from source
resource "ibm_code_engine_build" "api" {
  project_id = ibm_code_engine_project.serverless.id
  name       = "api-build"
  source_url = "https://github.com/myorg/api-repo"
  source_context_dir = "/api"
  strategy_name = "dockerfile"
  dockerfile    = "Dockerfile"
  output_image  = "us.icr.io/myapp/api:latest"
  output_secret = ibm_code_engine_secret.registry.name
}
```

### CLI Commands

```bash
# Create project
ibmcloud ce project create --name production-serverless

# Select project
ibmcloud ce project select -n production-serverless

# Create application
ibmcloud ce app create \
  --name api-service \
  --image us.icr.io/myapp/api:latest \
  --min-scale 2 --max-scale 10 \
  --cpu 2 --memory 4G \
  --env NODE_ENV=production

# List apps
ibmcloud ce app list

# Get app URL
ibmcloud ce app get --name api-service

# Create job
ibmcloud ce job create \
  --name nightly-batch \
  --image us.icr.io/myapp/batch:latest \
  --cpu 4 --memory 8G

# Run job
ibmcloud ce job run --name nightly-batch

# Create cron job
ibmcloud ce job create \
  --name daily-batch \
  --image us.icr.io/myapp/batch:latest \
  --schedule "0 2 * * *"

# Create build
ibmcloud ce build create \
  --name api-build \
  --source https://github.com/myorg/api-repo \
  --dockerfile Dockerfile \
  --image us.icr.io/myapp/api:latest

# View logs
ibmcloud ce app logs --name api-service
ibmcloud ce jobrun logs --name <job-run-name>

# List project bindings
ibmcloud ce project list

# Delete resources
ibmcloud ce app delete --name api-service
ibmcloud ce project delete --name production-serverless
```

### Code Engine Limits

| Resource | Limit |
|----------|-------|
| Min instances | 0 (scale to zero) |
| Max instances | 10 (default, higher available) |
| CPU per instance | 0.25 - 8 vCPU |
| Memory per instance | 0.5 - 8 GB |
| Request timeout | 10 min (configurable) |
| Concurrent requests | 1K+ per instance |
| Build timeout | 60 min |

## Best Practices

- Use Cloud Foundry for traditional 12-factor apps with existing buildpacks
- Use Code Engine for containerized apps needing scale-to-zero or batch jobs
- Never hardcode credentials — use CF user-provided services or CE secrets
- Use blue-green deployments in CF for zero-downtime updates
- Enable auto-scaling in CF with appropriate thresholds
- Use Code Engine cron jobs for scheduled batch processing
- Pin buildpack versions in manifest.yml for reproducible builds
- Set health checks on all CF apps (http or port-based)
- Use the `no-route` option for worker apps (no external traffic)
- Tag CF orgs and spaces by environment (dev, staging, production)
- Monitor both CF and CE apps with IBM Cloud Monitoring (Sysdig)
