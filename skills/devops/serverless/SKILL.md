---
name: serverless
description: >
  Use this skill when the user says 'serverless', 'Lambda', 'Cloud Functions',
  'cold start', 'function optimization', 'event source', 'Serverless Framework',
  'SAM', 'AWS Lambda', 'Azure Functions', 'Google Cloud Functions', 'Function
  as a Service', 'FaaS', 'SQS Lambda', 'S3 event', 'API Gateway Lambda',
  'provisioned concurrency', 'Lambda layer', 'Lambda container image'.
  Covers: Lambda functions, cold start mitigation, function optimization, event
  sources, Serverless Framework, SAM, IAM for Lambda, monitoring.
  Do NOT use this for: EC2, ECS, EKS, or container orchestration.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, serverless, lambda, faas, phase-5]
---

# Serverless

## Purpose
Build and optimize serverless functions using AWS Lambda and the Serverless Framework.

## Agent Protocol

### Trigger
Exact user phrases: "serverless", "Lambda", "Cloud Functions", "cold start", "function optimization", "event source", "Serverless Framework", "SAM", "provisioned concurrency", "Lambda layer", "Lambda container image", "SQS Lambda", "S3 event", "API Gateway Lambda".

### Input Context
Before activating, verify:
- Cloud provider (AWS, GCP, Azure).
- Runtime (Node.js, Python, Go, Java, .NET, Rust).
- Event source (API Gateway, SQS, S3, DynamoDB Streams, EventBridge).
- Cold start sensitivity (latency requirements).

### Output Artifact
Writes to `serverless.yml`, `template.yaml` (SAM), `function.zip` build scripts, and/or Terraform for Lambda.

### Response Format
serverless.yml, SAM template, or Terraform HCL with no extraneous explanation.

No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
This skill is complete when:
- [ ] Function handler is defined with appropriate runtime and memory.
- [ ] Event source is configured and IAM permissions are scoped.
- [ ] Cold start mitigation is applied (provisioned concurrency or SnapStart).
- [ ] Environment variables and secrets are configured.
- [ ] Monitoring (CloudWatch, X-Ray) and error handling are in place.

### Max Response Length
Direct file write. No response text.

## Quick Start
serverless.yml: service definition → function with handler + runtime + memory → event trigger (HTTP, SQS, S3) → IAM role → CloudWatch logs. Deploy with `sls deploy`.

## When to Use This Skill
- Building new serverless APIs with API Gateway + Lambda
- Processing S3 uploads, SQS messages, or DynamoDB Streams
- Optimizing existing Lambda functions for performance and cost
- Migrating from monolithic apps to event-driven serverless

## Core Workflow

### Step 1: Serverless Framework Setup
```yaml
# serverless.yml
service: my-api

frameworkVersion: "4"

provider:
  name: aws
  runtime: nodejs22.x
  region: us-east-1
  stage: ${opt:stage, 'dev'}
  architecture: arm64
  memorySize: 512
  timeout: 30
  logRetentionInDays: 14
  tracing:
    lambda: true
    apiGateway: true
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - dynamodb:GetItem
            - dynamodb:PutItem
            - dynamodb:Query
          Resource: !GetAtt MyTable.Arn

functions:
  createUser:
    handler: src/handlers/users.createUser
    events:
      - http:
          path: /users
          method: post
          cors: true
    environment:
      TABLE_NAME: !Ref MyTable
      REGION: ${self:provider.region}

resources:
  Resources:
    MyTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${self:service}-${self:provider.stage}-users
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: id
            AttributeType: S
        KeySchema:
          - AttributeName: id
            KeyType: HASH
```

### Step 2: Lambda Handler
```typescript
// src/handlers/users.ts
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";
import { randomUUID } from "node:crypto";

const client = DynamoDBDocumentClient.from(new DynamoDBClient({}));

interface CreateUserEvent {
  body: string;
}

interface User {
  id: string;
  name: string;
  email: string;
  createdAt: string;
}

export const createUser = async (event: CreateUserEvent) => {
  const body: Omit<User, "id" | "createdAt"> = JSON.parse(event.body);

  const user: User = {
    id: randomUUID(),
    ...body,
    createdAt: new Date().toISOString(),
  };

  await client.send(
    new PutCommand({
      TableName: process.env.TABLE_NAME,
      Item: user,
    })
  );

  return {
    statusCode: 201,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(user),
  };
};
```

### Step 3: Event Sources
```yaml
# SQS trigger
functions:
  orderProcessor:
    handler: src/handlers/orders.processOrder
    events:
      - sqs:
          arn: !GetAtt OrderQueue.Arn
          batchSize: 10
          maximumBatchingWindowInSeconds: 5
          functionResponseTypes:
            - ReportBatchItemFailures

# S3 event trigger
functions:
  imageProcessor:
    handler: src/handlers/images.processImage
    events:
      - s3:
          bucket: my-uploads-bucket
          event: s3:ObjectCreated:*
          rules:
            - prefix: uploads/
            - suffix: .jpg
          existing: true

# DynamoDB Streams
functions:
  streamProcessor:
    handler: src/handlers/streams.processStream
    events:
      - stream:
          type: dynamodb
          arn: !GetAtt MyTable.StreamArn
          batchSize: 100
          startingPosition: LATEST
          maximumRetryAttempts: 3

# EventBridge
functions:
  eventHandler:
    handler: src/handlers/events.handleEvent
    events:
      - eventBridge:
          pattern:
            source:
              - aws.ec2
            detail-type:
              - EC2 Instance State-change Notification
```

### Step 4: Cold Start Mitigation
```yaml
# Provisioned Concurrency
functions:
  latencySensitive:
    handler: src/handlers/latency.handler
    provisionedConcurrency: 5
    reservedConcurrency: 20
    events:
      - http:
          path: /fast
          method: get

# SnapStart (Java only)
functions:
  javaFunction:
    handler: com.example.Handler
    runtime: java21
    snapStart:
      applyOn: PublishedVersions

# Lambda@Edge (pre-warmed)
functions:
  edgeFunction:
    handler: src/handlers/edge.handler
    events:
      - cloudFront:
          eventType: viewer-request
          includeBody: false
```

### Step 5: Monitoring and Error Handling
```yaml
# DLQ configuration
functions:
  fragileProcessor:
    handler: src/handlers/fragile.handler
    onError: !Ref FragileDLQ
    maximumRetryAttempts: 2
    maximumEventAgeInSeconds: 3600
    destinations:
      onSuccess: !Ref SuccessTopic
      onFailure: !Ref FailureTopic

# DLQ resource
resources:
  Resources:
    FragileDLQ:
      Type: AWS::SQS::Queue
      Properties:
        QueueName: ${self:service}-${self:provider.stage}-fragile-dlq
        MessageRetentionPeriod: 1209600  # 14 days
```

## Rules & Constraints
- Never hardcode secrets — use environment variables with KMS encryption or Parameter Store
- Always set `reservedConcurrency` for critical functions to prevent throttling
- Set `memorySize` between 512-1024 for balanced cost/performance
- Enable Lambda Insights and X-Ray tracing for all production functions
- Use ARM64 (Graviton) architecture for 20% cost savings and better cold starts
- Configure DLQs and retry policies for async event sources
- Set `logRetentionInDays` to avoid infinite CloudWatch log growth
- Prefer `ReportBatchItemFailures` for SQS partial batch failures

## Output Format
`serverless.yml`, SAM `template.yaml`, or Terraform Lambda resources.

## References
  - references/event-sources.md — Event Sources
  - references/function-optimization.md — Function Optimization
  - references/lambda-basics.md — Lambda Basics
  - references/serverless-advanced.md — Serverless Advanced Topics
  - references/serverless-framework.md — Serverless Framework
  - references/serverless-fundamentals.md — Serverless Fundamentals
## Handoff
After completing this skill:
- Next skill: **aws** — VPC, IAM roles, API Gateway configuration
- Pass context: function names, event sources, IAM role ARNs
