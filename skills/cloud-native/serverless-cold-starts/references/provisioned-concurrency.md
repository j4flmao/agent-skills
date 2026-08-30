# Provisioned Concurrency

Cold starts are unacceptable for synchronous, user-facing APIs with strict P99 latency SLAs.

## Mechanics
Provisioned Concurrency instructs AWS to initialize a requested number of execution environments and keep them completely warm (Steps 1, 2, and 3 of the Cold Start timeline are completed in advance).

```mermaid
%%{init: {"theme": "default", "sequence": {"useMaxWidth": true}}}%%
sequenceDiagram
    participant API Gateway
    participant AWS Lambda (Warm)
    participant AWS Lambda (Cold)
    
    Note over AWS Lambda (Warm): Provisioned Environments<br/>waiting for invocation
    API Gateway->>AWS Lambda (Warm): Request 1 (Latency: 20ms)
    API Gateway->>AWS Lambda (Warm): Request 2 (Latency: 20ms)
    Note over API Gateway: Sudden Burst of Traffic!
    API Gateway->>AWS Lambda (Cold): Request 3 spills over to On-Demand
    Note over AWS Lambda (Cold): Firecracker Boots (500ms)<br/>JVM Starts (1.5s)
    AWS Lambda (Cold)-->>API Gateway: Response (Latency: 2020ms)
```

## Configuration & Economics
- **Cost**: You pay a continuous hourly rate for provisioned capacity, plus a smaller fee per invocation. It transitions Lambda from a purely variable cost to a semi-fixed cost.
- **Auto Scaling**: Application Auto Scaling can be configured to adjust the provisioned concurrency level based on schedule (e.g., scale up at 8 AM, scale down at 8 PM) or utilization metrics (`ProvisionedConcurrencyUtilization > 70%`).

```hcl
# Terraform Example
resource "aws_lambda_provisioned_concurrency_config" "example" {
  function_name                     = aws_lambda_function.example.function_name
  provisioned_concurrent_executions = 50
  qualifier                         = aws_lambda_function.example.version
}
```
