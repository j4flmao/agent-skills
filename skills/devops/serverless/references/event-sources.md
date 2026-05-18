# Event Sources

## API Gateway (REST API)

```yaml
functions:
  api:
    handler: src/handler.api
    events:
      - http:
          path: /users/{id}
          method: get
          cors:
            origin: "*"
            headers:
              - Content-Type
              - Authorization
            allowCredentials: false
          authorizer:
            name: cognitoAuthorizer
            type: COGNITO_USER_POOLS
            arn: !GetAtt UserPool.Arn
            claims:
              - email
              - sub
          request:
            parameters:
              paths:
                id: true
              querystrings:
                page: false
              headers:
                Authorization: true
```

## API Gateway (HTTP API)

```yaml
functions:
  httpApi:
    handler: src/handler.httpApi
    events:
      - httpApi:
          path: /items
          method: GET
          authorizer:
            name: jwtAuthorizer
            type: JWT
            identitySource: $request.header.Authorization
            issuerUrl: https://cognito-idp.us-east-1.amazonaws.com/us-east-1_abc123
            audience:
              - 1234567890
```

## SQS

```yaml
functions:
  queueProcessor:
    handler: src/handler.processQueue
    events:
      - sqs:
          arn: !GetAtt MyQueue.Arn
          batchSize: 10
          maximumBatchingWindowInSeconds: 5
          enabled: true
          functionResponseTypes:
            - ReportBatchItemFailures
```

```typescript
// Partial batch failure response
export const handler = async (event: SQSEvent) => {
  const failedIds: string[] = [];

  for (const record of event.Records) {
    try {
      await processMessage(record);
    } catch {
      failedIds.push(record.messageId);
    }
  }

  return {
    batchItemFailures: failedIds.map((id) => ({
      itemIdentifier: id,
    })),
  };
};
```

## S3 Events

```yaml
functions:
  imageProcessor:
    handler: src/handler.processImage
    events:
      - s3:
          bucket: my-uploads
          event: s3:ObjectCreated:*
          rules:
            - prefix: images/
            - suffix: .jpg
          existing: true
          forceDeploy: true
```

```typescript
export const handler = async (event: S3Event) => {
  for (const record of event.Records) {
    const { key, size } = record.s3.object;
    const bucket = record.s3.bucket.name;

    console.log(`Processing s3://${bucket}/${key} (${size} bytes)`);
    await processImage(bucket, key);
  }
};
```

## DynamoDB Streams

```yaml
functions:
  streamHandler:
    handler: src/handler.processStream
    events:
      - stream:
          type: dynamodb
          arn: !GetAtt MyTable.StreamArn
          batchSize: 100
          startingPosition: LATEST
          maximumRetryAttempts: 5
          maximumRecordAgeInSeconds: 86400
          bisectBatchOnFunctionError: true
          destinations:
            onFailure: !GetAtt FailureQueue.Arn
          filterPatterns:
            - eventName: [INSERT, MODIFY]
```

```typescript
export const handler = async (event: DynamoDBStreamEvent) => {
  for (const record of event.Records) {
    if (record.eventName === "INSERT") {
      const newItem = DynamoDB.Converter.unmarshall(
        record.dynamodb!.NewImage!
      );
      await handleInsert(newItem);
    }
  }
};
```

## EventBridge

```yaml
functions:
  eventBusHandler:
    handler: src/handler.handleEvent
    events:
      - eventBridge:
          eventBus: custom
          pattern:
            source:
              - aws.ec2
              - custom.myapp
            detail-type:
              - EC2 Instance State-change Notification
              - OrderCreated
            detail:
              state:
                - running
                - stopped
          inputTransformer:
            inputPathsMap:
              instance: $.detail.instance-id
              state: $.detail.state
            inputTemplate: |
              Instance <instance> is now <state>

# Scheduled events (CloudWatch Events)
functions:
  cronJob:
    handler: src/handler.cron
    events:
      - schedule: rate(10 minutes)
      - schedule: cron(0 6 * * ? *)  # Every day at 6AM UTC
```

## Kinesis

```yaml
functions:
  kinesisProcessor:
    handler: src/handler.processKinesis
    events:
      - stream:
          type: kinesis
          arn: !GetAtt MyStream.Arn
          batchSize: 100
          startingPosition: TRIM_HORIZON
          parallelizationFactor: 5
          tumblingWindowInSeconds: 60
```

## SNS

```yaml
functions:
  snsHandler:
    handler: src/handler.processNotification
    events:
      - sns:
          arn: !Ref MyTopic
          topicName: my-topic
          filterPolicy:
            event:
              - order_placed
              - order_cancelled
```

## ALB (Application Load Balancer)

```yaml
functions:
  albHandler:
    handler: src/handler.alb
    events:
      - alb:
          listenerArn: !Ref Listener
          priority: 1
          conditions:
            path: /api/*
            method: GET
```

## Event Source Selection

| Source | Trigger | Latency | Ordering | Use case |
|--------|---------|---------|----------|----------|
| API Gateway | Request/Response | Low | N/A | REST APIs, WebSocket |
| SQS | Message | Variable | Best-effort | Decoupling, async jobs |
| S3 | Object event | Minutes | Per bucket | Image processing, ETL |
| DynamoDB Streams | Table change | Seconds | Per shard | Change data capture |
| EventBridge | Event rule | Seconds | N/A | Event-driven architecture |
| Kinesis | Stream record | Seconds | Per shard | Real-time analytics |
| SNS | Topic message | Seconds | N/A | Pub/sub notifications |
| ALB | HTTP request | Low | N/A | Container migration path |
