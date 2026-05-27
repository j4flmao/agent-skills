# Lambda Triggers and Event Sources

## Overview
AWS Lambda functions are triggered by various event sources including API Gateway, S3, SQS, SNS, DynamoDB Streams, Kinesis, EventBridge, and more. This reference covers event source mappings, invocation patterns, error handling, and best practices for each trigger type.

## Synchronous Invocations

### API Gateway REST
```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    const { userId } = event.pathParameters!;
    const body = JSON.parse(event.body || '{}');
    const method = event.httpMethod;

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        message: `User ${userId} processed`,
        data: body,
      }),
    };
  } catch (error) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' }),
    };
  }
};
```

### API Gateway HTTP API
```typescript
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';

export const handler = async (
  event: APIGatewayProxyEventV2
): Promise<APIGatewayProxyResultV2> => {
  const { routeKey, pathParameters, queryStringParameters } = event;

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      route: routeKey,
      params: pathParameters,
      query: queryStringParameters,
    }),
  };
};
```

## Asynchronous Invocations

### S3 Event Notifications
```python
import json
import boto3
from urllib.parse import unquote_plus

s3 = boto3.client('s3')
rekognition = boto3.client('rekognition')

def handler(event, context):
    for record in event['Records']:
        bucket = record['s3']['bucket']['name']
        key = unquote_plus(record['s3']['object']['key'])

        # Process new S3 object
        response = rekognition.detect_labels(
            Image={
                'S3Object': {
                    'Bucket': bucket,
                    'Name': key
                }
            },
            MaxLabels=10
        )

        # Store results in DynamoDB
        dynamodb = boto3.resource('dynamodb')
        table = dynamodb.Table('ImageLabels')
        table.put_item(
            Item={
                'imageKey': key,
                'labels': [
                    label['Name']
                    for label in response['Labels']
                ],
                'timestamp': context.aws_request_id
            }
        )

    return {'statusCode': 200}
```

### SQS Queue Trigger
```python
import json
from typing import Dict, Any

def handler(event: Dict[str, Any], context: Any) -> Dict[str, Any]:
    failed_messages = []

    for record in event['Records']:
        try:
            message = json.loads(record['body'])
            process_message(message)
        except Exception as e:
            print(f"Failed to process message: {e}")
            failed_messages.append(record['messageId'])

    # Return failed message IDs for DLQ processing
    return {
        'batchItemFailures': [
            {'itemIdentifier': msg_id}
            for msg_id in failed_messages
        ]
    }
```

### SNS Topic Subscription
```typescript
import { SNSEvent, SNSHandler } from 'aws-lambda';

export const handler: SNSHandler = async (event: SNSEvent) => {
  for (const record of event.Records) {
    const message = JSON.parse(record.Sns.Message);
    const subject = record.Sns.Subject || 'No Subject';

    console.log(`Processing SNS: ${subject}`);

    // Route based on message attributes
    const type = record.Sns.MessageAttributes?.type?.Value;

    switch (type) {
      case 'order_created':
        await handleOrderCreated(message);
        break;
      case 'payment_failed':
        await handlePaymentFailed(message);
        break;
      default:
        await handleGenericNotification(message);
    }
  }
};
```

## Stream-Based Triggers

### DynamoDB Streams
```python
import json
from decimal import Decimal

class DecimalEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, Decimal):
            return float(obj)
        return super().default(obj)

def handler(event, context):
    for record in event['Records']:
        event_name = record['eventName']  # INSERT, MODIFY, REMOVE
        dynamodb_data = record['dynamodb']

        # New image (after the change)
        if 'NewImage' in dynamodb_data:
            new_image = {k: decode_value(v) for k, v in dynamodb_data['NewImage'].items()}

        # Old image (before the change)
        if 'OldImage' in dynamodb_data:
            old_image = {k: decode_value(v) for k, v in dynamodb_data['OldImage'].items()}

        # Perform action based on event type
        if event_name == 'INSERT':
            sync_to_elasticsearch(new_image)
        elif event_name == 'MODIFY':
            update_elasticsearch(new_image)
        elif event_name == 'REMOVE':
            remove_from_elasticsearch(old_image['id'])

    return {'processed': len(event['Records'])}

def decode_value(value):
    """Convert DynamoDB JSON to regular JSON."""
    for dtype, val in value.items():
        if dtype == 'S': return val
        if dtype == 'N': return Decimal(val)
        if dtype == 'BOOL': return val
        if dtype in ('NULL',): return None
        if dtype == 'M': return {k: decode_value(v) for k, v in val.items()}
        if dtype == 'L': return [decode_value(v) for v in val]
        if dtype == 'SS': return set(val)
        if dtype == 'NS': return set(Decimal(v) for v in val)
    return value
```

### Kinesis Streams
```python
import base64
import json

def handler(event, context):
    records = []

    for record in event['Records']:
        # Kinesis data is base64 encoded
        payload = base64.b64decode(record['kinesis']['data']).decode('utf-8')
        data = json.loads(payload)

        # Process the record
        processed = transform_record(data)
        records.append(processed)

    # Batch write to destination
    if records:
        write_batch_to_redshift(records)

    return {'processedCount': len(records)}
```

## Event-Driven Patterns

### EventBridge Rules
```typescript
import { EventBridgeEvent, Context } from 'aws-lambda';

export const handler = async (
  event: EventBridgeEvent<string, any>,
  context: Context
) => {
  const detailType = event['detail-type'];
  const detail = event.detail;

  switch (detailType) {
    case 'OrderCreated':
      await handleNewOrder(detail);
      break;

    case 'PaymentConfirmed':
      await handlePayment(detail);
      break;

    case 'UserSignedUp':
      await sendWelcomeEmail(detail);
      break;

    default:
      console.log(`Unknown event type: ${detailType}`);
  }
};
```

## Error Handling Patterns

### DLQ Configuration
```yaml
# SAM template.yaml
Resources:
  ProcessFunction:
    Type: AWS::Serverless::Function
    Properties:
      Events:
        SQSQueue:
          Type: SQS
          Properties:
            Queue: !GetAtt InputQueue.Arn
            BatchSize: 10
            MaximumBatchingWindowInSeconds: 5
      DeadLetterQueue:
        Type: SQS
        Target: !GetAtt DeadLetterQueue.Arn
      Policies:
        - SQSPollerPolicy:
            QueueName: !Ref InputQueue
```

### Retry Behavior
```python
import random
import time

def handler_with_retry(event, context):
    max_retries = 3
    retry_count = 0

    while retry_count < max_retries:
        try:
            result = process_event(event)
            return result
        except ThrottlingException as e:
            wait_time = (2 ** retry_count) + random.uniform(0, 1)
            time.sleep(wait_time)
            retry_count += 1
        except NonRetryableException:
            raise  # Don't retry non-retryable errors

    raise Exception(f"Failed after {max_retries} retries")
```

## Key Points
- Synchronous triggers (API Gateway, ALB) return responses directly
- Asynchronous triggers (S3, SNS) use internal Lambda retry queue
- Stream-based triggers (DynamoDB, Kinesis) poll for new records
- SQS triggers support batch processing with partial failure reporting
- EventBridge enables loosely coupled event-driven architectures
- DLQs capture failed events for later reprocessing
- Lambda destination configures async invocation results
- BatchSize and MaximumBatchingWindowInSeconds control stream batching
- Use reserved concurrency to prevent throttling of critical functions
- Event filtering reduces unnecessary invocations
- IAM execution roles define what resources Lambda can access
- Provisioned concurrency reduces cold starts for latency-sensitive triggers
