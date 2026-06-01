# Serverless Observability

## Structured Logging
JSON format: timestamp, level, requestId, message, service, region. AWS Lambda: use Lambda powertools for Python/Node/Java. Correlation ID: propagate across function invocations and downstream calls. Log levels: DEBUG (dev), INFO (prod), ERROR (exceptions). Cold start marker: log INIT_START, REPORT separately.

## Distributed Tracing
AWS X-Ray: instrument Lambda, API Gateway, DynamoDB, SQS. Active tracing on Lambda: EnableActiveTracing: true. Trace propagation: X-Amzn-Trace-Id header from API Gateway. Segment for function execution, subsegments for downstream calls. Sampling: 10% for high-traffic functions, 100% for errors.

## Metrics
Custom metrics in CloudWatch: EMF (Embedded Metric Format) for structured logs. Business metrics: orders processed, users created, payment success rate. Performance metrics: duration, memory used, cold start count. Error metrics: error count, error rate by function version. Concurrency metrics: concurrent executions, throttles.

## Cold Start Monitoring
Cold start duration metric: P50, P95, P99. Provisioned concurrency: pre-warm function instances. SnapStart (Java): reduce cold start from 6s to <200ms. Cold start by runtime: Python fastest, Java/C# slowest. Warm start ratio: cold starts / total invocations.

## Cost Monitoring
Cost per invocation: 128MB pricing * duration seconds. Cost per million invocations: $0.20 (requests) + compute. Cost anomalies: daily cost tracking and alerting. Memory optimization: find optimal memory for lowest cost per invocation. Idle function detection: no invocations > 30 days.

## Monitoring Dashboard
CloudWatch dashboard per service: errors, duration, throttles, concurrency. X-Ray service map for service dependency visualization. Custom dashboard: Grafana with Lambda CloudWatch data source. Alarms: error rate > 1%, duration > p99 threshold, throttle > 0. SLA tracking: uptime, response time, error budget.

## References
- serverless-fundamentals.md -- Fundamentals
- lambda-basics.md -- Lambda Basics
- function-optimization.md -- Optimization
- event-sources.md -- Event Sources
- serverless-framework.md -- Serverless Framework
