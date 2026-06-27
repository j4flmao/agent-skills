# Deployment Pipelines

## Purpose
This document details deployment strategies and CI/CD pipeline architectures for modern PHP 8.3+ applications. It focuses on zero-downtime deployments, Docker containerization, and Kubernetes orchestration.

## Core Principles
1. Immutable Infrastructure
2. Automated Rollbacks
3. Zero Downtime Deployments
4. Configuration as Code
5. Parity between Dev, Staging, and Prod

## Detailed Architectural Overview
```text
+-------------------+       +-------------------+
|   Git Push        | ----> |   CI Server       |
|   (GitHub/GitLab) |       |   (Build & Test)  |
+-------------------+       +-------------------+
                                    |
                                    v
+-------------------+       +-------------------+
|   Deploy Phase    | <---- |   Container Reg.  |
|   (K8s / Envoyer) |       |   (Docker Image)  |
+-------------------+       +-------------------+
```

## Algorithms and Formulations
Deployment Success Rate:
$SR = \frac{Successful\ Deploys}{Total\ Deploys} \times 100\%$

## Decision Matrix
```text
Target Environment?
├── Bare Metal/VMs -> Use Deployer / Envoyer (Symlink deployments)
└── Cloud Native -> Use Docker + Kubernetes (Helm charts)
    ├── Need autoscaling? -> HPA (Horizontal Pod Autoscaler)
    └── Stateful data? -> StatefulSets or External managed DB
```

## Data Schemas
```yaml
# deploy.yaml
stages:
  - build
  - test
  - deploy
variables:
  PHP_VERSION: "8.3"
```

## Code Examples

### PHP 8.3+ (Deployment Webhook Handler)
```php
<?php
declare(strict_types=1);

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Symfony\Component\Process\Process;

class DeploymentController
{
    public function handleWebhook(Request $request)
    {
        // Verify github signature here...
        
        $process = new Process(['/usr/bin/deploy.sh']);
        $process->run();
        
        if (!$process->isSuccessful()) {
            return response()->json(['error' => 'Deployment failed'], 500);
        }
        
        return response()->json(['status' => 'Deployed successfully']);
    }
}
```

### Python (CI Status Monitor)
```python
import requests

def check_pipeline_status(repo: str, token: str):
    url = f"https://api.github.com/repos/{repo}/actions/runs"
    headers = {"Authorization": f"token {token}"}
    resp = requests.get(url, headers=headers).json()
    latest_run = resp['workflow_runs'][0]
    print(f"Latest deploy status: {latest_run['status']} - {latest_run['conclusion']}")
```

## Configuration Templates
```dockerfile
# Dockerfile
FROM php:8.3-fpm-alpine

RUN apk add --no-cache \
    postgresql-dev \
    libzip-dev \
    && docker-php-ext-install pdo_pgsql zip opcache

COPY . /var/www/html
WORKDIR /var/www/html

RUN chown -R www-data:www-data /var/www/html
USER www-data
```

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| Downtime during deploy| Hard overwrite of files| Use Symlink-based deploys |
| Missing Env Vars | Secrets not mapped | Sync secrets via Vault/K8s |
| DB Schema Mismatch | Migrations run late | Run migrations before routing traffic|
| High CPU on start | OPcache warming | Preload OPcache during build |
| Asset 404s | Cache not cleared | Run artisan optimize:clear |
| Container Crash | OOM Killed | Increase memory limits in K8s |

## Best Practices and Anti-Patterns
- **Best Practice**: Treat servers as cattle, not pets (Immutable).
- **Anti-Pattern**: SSH-ing into production to manually pull code and run `composer install`.





























































































































































































































































































































































































