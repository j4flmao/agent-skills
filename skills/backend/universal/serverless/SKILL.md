---
name: serverless
description: >
  Advanced serverless deployment and
  cold-start optimization skill.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
type: skill
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [serverless, aws, lambda, terraform]
---

# Serverless Mastery

## Purpose
Comprehensive serverless architecture management, focusing on AWS Lambda cold-start mitigation, Terraform IaC provisioning, and highly scalable event-driven patterns.

## Core Principles
1. Minimize deployment package size to reduce cold start latency.
2. Leverage provisioned concurrency for latency-sensitive endpoints.
3. Optimize execution environments using Graviton and minimal runtimes.
4. Apply principle of least privilege in IAM roles.
5. Use Infrastructure as Code (Terraform) for reproducible environments.

## Agent Protocol
- Triggers: "deploy lambda", "optimize cold start"
- Input Context Required: AWS credentials, source code, traffic patterns
- Output Artifact: Terraform plan, optimized deployment zip
- Response Formats:
  ```json
  {
    "status": "deployed",
    "lambda_arn": "arn:aws:lambda:us-east-1:123456789012:function:my-func",
    "cold_start_est_ms": 120
  }
  ```

## Decision Matrix
```text
Is workload latency-sensitive?
 +-- Yes --> Use Provisioned Concurrency
 +-- No --> Standard on-demand Lambda
```

## Detailed Architectural Overview
```text
[API Gateway] ---> [Lambda Function] ---> [DynamoDB]
                   (Graviton2/Python)
```

## Workflow Steps
Phase 1: Analysis
1. Inspect source
2. Identify deps
3. Measure size
4. Check limits

Phase 2: Optimization
1. Strip binaries
2. Bundle code
3. Set architecture
4. Tune memory

Phase 3: IaC Generation
1. Write main.tf
2. Define variables.tf
3. Setup outputs.tf
4. Provider config

Phase 4: Deployment
1. terraform init
2. terraform plan
3. terraform apply
4. verify state

Phase 5: Validation
1. Invoke lambda
2. Measure latency
3. Verify logs
4. End-to-end test

Phase 6: Monitoring
1. Setup CloudWatch
2. Create alarms
3. Dashboard config
4. Set alerts

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| Timeout | Cold start | Increase timeout or use provisioned concurrency |
| Missing Module | Bad bundling | Check deployment package contents |
| Access Denied | IAM role | Attach correct policies |
| Throttling | Concurrency limit | Request quota increase |
| High cost | Over-provisioned | Tune memory/concurrency |
| Missing logs | CW permissions | Add AWSLambdaBasicExecutionRole |

## Complete Execution Scenario
```text
Start -> Build -> Optimize -> Plan -> Apply -> Done
```

## Rules and Guidelines
1. Always bundle dependencies.
2. Never hardcode credentials.
3. Use Terraform state locking.
4. Tag all resources.
5. Implement dead-letter queues for async lambdas.

## Reference Guides
- [Architecture Guide](references/architecture.md)
- [Cold Start Opt](references/cold-start.md)
- [Terraform Core](references/terraform-core.md)
- [Security Model](references/security.md)
- [Monitoring Setup](references/monitoring.md)
- [Cost Tuning](references/cost.md)
- [Advanced Networking](references/networking.md)
- [CI/CD Pipelines](references/cicd.md)

## Handoff
Refer to `aws-core` skill for baseline AWS authentication.
<!-- Compression footer HTML comment -->
