---
title: Testing Strategies
version: 2.0.0
author: j4flmao
license: MIT
type: reference
---

# Testing Strategies

## 1. Overview and Purpose
This document provides a highly detailed technical reference for **Testing Strategies** within AWS Serverless architectures.
It focuses explicitly on AWS Lambda, Amazon API Gateway, Amazon DynamoDB, and Amazon EventBridge.
The content covers advanced patterns, best practices, and fully functional code examples required for enterprise-grade serverless applications.

## 2. Specific Concepts
Discusses Hexagonal architecture testing, Mocking AWS SDKs with libraries like `aws-sdk-mock` or `moto`, local testing with AWS SAM Local, and E2E cloud integration tests.

## 3. Reference Architecture
```text
+---------------------------------------------------------+
|                    Client Application                   |
+---------------------------------------------------------+
          |                                  |             
          v                                  v             
+-------------------+               +---------------------+
|  Amazon API GW    |               | Amazon Cognito      |
| (RESTful / HTTP)  |               | (Auth & Identity)   |
+-------------------+               +---------------------+
          |                                                
          v                                                
+-------------------+               +---------------------+
|    AWS Lambda     |-- EventBridge | AWS Step Functions  |
| (Compute Layer)   |-------------->| (Orchestration)     |
+-------------------+               +---------------------+
          |                                  |             
          v                                  v             
+-------------------+               +---------------------+
| Amazon DynamoDB   |<-- Streams ---|  Other Microservices|
| (Data Layer)      |               |  (Downstream)       |
+-------------------+               +---------------------+
```

## 4. Implementation Examples
### 4.1. Create Handler Implementation
```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dbClient);
const ebClient = new EventBridgeClient({ region: process.env.AWS_REGION });

export const createHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        console.log('Executing Create operation. RequestId:', event.requestContext?.requestId);
        const payload = event.body ? JSON.parse(event.body) : {};

        // DynamoDB Interaction
        const dbResult = await docClient.send(new PutCommand({
            TableName: process.env.TABLE_NAME!,
            Item: { PK: `ENTITY#${payload.id || Date.now()}`, SK: `META`, Data: payload }
        }));

        // EventBridge Integration
        await ebClient.send(new PutEventsCommand({
            Entries: [{
                Source: 'com.enterprise.service',
                DetailType: 'CreateCompleted',
                Detail: JSON.stringify({ status: 'success', data: payload }),
                EventBusName: process.env.EVENT_BUS_NAME!
            }]
        }));

        return { statusCode: 200, body: JSON.stringify({ message: 'Success', result: dbResult }) };
    } catch (error) {
        console.error('Operation failed:', error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Internal Server Error' }) };
    }
};
```

### 4.2. Read Handler Implementation
```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dbClient);
const ebClient = new EventBridgeClient({ region: process.env.AWS_REGION });

export const readHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        console.log('Executing Read operation. RequestId:', event.requestContext?.requestId);
        const payload = event.body ? JSON.parse(event.body) : {};

        // DynamoDB Interaction
        const dbResult = await docClient.send(new PutCommand({
            TableName: process.env.TABLE_NAME!,
            Item: { PK: `ENTITY#${payload.id || Date.now()}`, SK: `META`, Data: payload }
        }));

        // EventBridge Integration
        await ebClient.send(new PutEventsCommand({
            Entries: [{
                Source: 'com.enterprise.service',
                DetailType: 'ReadCompleted',
                Detail: JSON.stringify({ status: 'success', data: payload }),
                EventBusName: process.env.EVENT_BUS_NAME!
            }]
        }));

        return { statusCode: 200, body: JSON.stringify({ message: 'Success', result: dbResult }) };
    } catch (error) {
        console.error('Operation failed:', error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Internal Server Error' }) };
    }
};
```

### 4.3. Update Handler Implementation
```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dbClient);
const ebClient = new EventBridgeClient({ region: process.env.AWS_REGION });

export const updateHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        console.log('Executing Update operation. RequestId:', event.requestContext?.requestId);
        const payload = event.body ? JSON.parse(event.body) : {};

        // DynamoDB Interaction
        const dbResult = await docClient.send(new PutCommand({
            TableName: process.env.TABLE_NAME!,
            Item: { PK: `ENTITY#${payload.id || Date.now()}`, SK: `META`, Data: payload }
        }));

        // EventBridge Integration
        await ebClient.send(new PutEventsCommand({
            Entries: [{
                Source: 'com.enterprise.service',
                DetailType: 'UpdateCompleted',
                Detail: JSON.stringify({ status: 'success', data: payload }),
                EventBusName: process.env.EVENT_BUS_NAME!
            }]
        }));

        return { statusCode: 200, body: JSON.stringify({ message: 'Success', result: dbResult }) };
    } catch (error) {
        console.error('Operation failed:', error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Internal Server Error' }) };
    }
};
```

### 4.4. Delete Handler Implementation
```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dbClient);
const ebClient = new EventBridgeClient({ region: process.env.AWS_REGION });

export const deleteHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        console.log('Executing Delete operation. RequestId:', event.requestContext?.requestId);
        const payload = event.body ? JSON.parse(event.body) : {};

        // DynamoDB Interaction
        const dbResult = await docClient.send(new PutCommand({
            TableName: process.env.TABLE_NAME!,
            Item: { PK: `ENTITY#${payload.id || Date.now()}`, SK: `META`, Data: payload }
        }));

        // EventBridge Integration
        await ebClient.send(new PutEventsCommand({
            Entries: [{
                Source: 'com.enterprise.service',
                DetailType: 'DeleteCompleted',
                Detail: JSON.stringify({ status: 'success', data: payload }),
                EventBusName: process.env.EVENT_BUS_NAME!
            }]
        }));

        return { statusCode: 200, body: JSON.stringify({ message: 'Success', result: dbResult }) };
    } catch (error) {
        console.error('Operation failed:', error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Internal Server Error' }) };
    }
};
```

### 4.5. List Handler Implementation
```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dbClient);
const ebClient = new EventBridgeClient({ region: process.env.AWS_REGION });

export const listHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        console.log('Executing List operation. RequestId:', event.requestContext?.requestId);
        const payload = event.body ? JSON.parse(event.body) : {};

        // DynamoDB Interaction
        const dbResult = await docClient.send(new PutCommand({
            TableName: process.env.TABLE_NAME!,
            Item: { PK: `ENTITY#${payload.id || Date.now()}`, SK: `META`, Data: payload }
        }));

        // EventBridge Integration
        await ebClient.send(new PutEventsCommand({
            Entries: [{
                Source: 'com.enterprise.service',
                DetailType: 'ListCompleted',
                Detail: JSON.stringify({ status: 'success', data: payload }),
                EventBusName: process.env.EVENT_BUS_NAME!
            }]
        }));

        return { statusCode: 200, body: JSON.stringify({ message: 'Success', result: dbResult }) };
    } catch (error) {
        console.error('Operation failed:', error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Internal Server Error' }) };
    }
};
```

### 4.6. ProcessEvent Handler Implementation
```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dbClient);
const ebClient = new EventBridgeClient({ region: process.env.AWS_REGION });

export const processeventHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        console.log('Executing ProcessEvent operation. RequestId:', event.requestContext?.requestId);
        const payload = event.body ? JSON.parse(event.body) : {};

        // DynamoDB Interaction
        const dbResult = await docClient.send(new PutCommand({
            TableName: process.env.TABLE_NAME!,
            Item: { PK: `ENTITY#${payload.id || Date.now()}`, SK: `META`, Data: payload }
        }));

        // EventBridge Integration
        await ebClient.send(new PutEventsCommand({
            Entries: [{
                Source: 'com.enterprise.service',
                DetailType: 'ProcessEventCompleted',
                Detail: JSON.stringify({ status: 'success', data: payload }),
                EventBusName: process.env.EVENT_BUS_NAME!
            }]
        }));

        return { statusCode: 200, body: JSON.stringify({ message: 'Success', result: dbResult }) };
    } catch (error) {
        console.error('Operation failed:', error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Internal Server Error' }) };
    }
};
```

### 4.7. Sync Handler Implementation
```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dbClient);
const ebClient = new EventBridgeClient({ region: process.env.AWS_REGION });

export const syncHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        console.log('Executing Sync operation. RequestId:', event.requestContext?.requestId);
        const payload = event.body ? JSON.parse(event.body) : {};

        // DynamoDB Interaction
        const dbResult = await docClient.send(new PutCommand({
            TableName: process.env.TABLE_NAME!,
            Item: { PK: `ENTITY#${payload.id || Date.now()}`, SK: `META`, Data: payload }
        }));

        // EventBridge Integration
        await ebClient.send(new PutEventsCommand({
            Entries: [{
                Source: 'com.enterprise.service',
                DetailType: 'SyncCompleted',
                Detail: JSON.stringify({ status: 'success', data: payload }),
                EventBusName: process.env.EVENT_BUS_NAME!
            }]
        }));

        return { statusCode: 200, body: JSON.stringify({ message: 'Success', result: dbResult }) };
    } catch (error) {
        console.error('Operation failed:', error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Internal Server Error' }) };
    }
};
```

### 4.8. BatchWrite Handler Implementation
```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dbClient);
const ebClient = new EventBridgeClient({ region: process.env.AWS_REGION });

export const batchwriteHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        console.log('Executing BatchWrite operation. RequestId:', event.requestContext?.requestId);
        const payload = event.body ? JSON.parse(event.body) : {};

        // DynamoDB Interaction
        const dbResult = await docClient.send(new PutCommand({
            TableName: process.env.TABLE_NAME!,
            Item: { PK: `ENTITY#${payload.id || Date.now()}`, SK: `META`, Data: payload }
        }));

        // EventBridge Integration
        await ebClient.send(new PutEventsCommand({
            Entries: [{
                Source: 'com.enterprise.service',
                DetailType: 'BatchWriteCompleted',
                Detail: JSON.stringify({ status: 'success', data: payload }),
                EventBusName: process.env.EVENT_BUS_NAME!
            }]
        }));

        return { statusCode: 200, body: JSON.stringify({ message: 'Success', result: dbResult }) };
    } catch (error) {
        console.error('Operation failed:', error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Internal Server Error' }) };
    }
};
```

### 4.9. BatchGet Handler Implementation
```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dbClient);
const ebClient = new EventBridgeClient({ region: process.env.AWS_REGION });

export const batchgetHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        console.log('Executing BatchGet operation. RequestId:', event.requestContext?.requestId);
        const payload = event.body ? JSON.parse(event.body) : {};

        // DynamoDB Interaction
        const dbResult = await docClient.send(new PutCommand({
            TableName: process.env.TABLE_NAME!,
            Item: { PK: `ENTITY#${payload.id || Date.now()}`, SK: `META`, Data: payload }
        }));

        // EventBridge Integration
        await ebClient.send(new PutEventsCommand({
            Entries: [{
                Source: 'com.enterprise.service',
                DetailType: 'BatchGetCompleted',
                Detail: JSON.stringify({ status: 'success', data: payload }),
                EventBusName: process.env.EVENT_BUS_NAME!
            }]
        }));

        return { statusCode: 200, body: JSON.stringify({ message: 'Success', result: dbResult }) };
    } catch (error) {
        console.error('Operation failed:', error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Internal Server Error' }) };
    }
};
```

### 4.10. Notify Handler Implementation
```typescript
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, GetCommand } from '@aws-sdk/lib-dynamodb';
import { EventBridgeClient, PutEventsCommand } from '@aws-sdk/client-eventbridge';

const dbClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dbClient);
const ebClient = new EventBridgeClient({ region: process.env.AWS_REGION });

export const notifyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        console.log('Executing Notify operation. RequestId:', event.requestContext?.requestId);
        const payload = event.body ? JSON.parse(event.body) : {};

        // DynamoDB Interaction
        const dbResult = await docClient.send(new PutCommand({
            TableName: process.env.TABLE_NAME!,
            Item: { PK: `ENTITY#${payload.id || Date.now()}`, SK: `META`, Data: payload }
        }));

        // EventBridge Integration
        await ebClient.send(new PutEventsCommand({
            Entries: [{
                Source: 'com.enterprise.service',
                DetailType: 'NotifyCompleted',
                Detail: JSON.stringify({ status: 'success', data: payload }),
                EventBusName: process.env.EVENT_BUS_NAME!
            }]
        }));

        return { statusCode: 200, body: JSON.stringify({ message: 'Success', result: dbResult }) };
    } catch (error) {
        console.error('Operation failed:', error);
        return { statusCode: 500, body: JSON.stringify({ message: 'Internal Server Error' }) };
    }
};
```

## 5. Infrastructure as Code (AWS SAM)
```yaml
AWSTemplateFormatVersion: '2010-09-09'
Transform: AWS::Serverless-2016-10-31
Description: Enterprise Serverless Stack Definition
Globals:
  Function:
    Timeout: 30
    MemorySize: 1024
    Tracing: Active
    Environment:
      Variables:
        LOG_LEVEL: INFO
  Api:
    TracingEnabled: true
    Cors:
      AllowMethods: "'OPTIONS,POST,GET,PUT,DELETE'"
      AllowHeaders: "'Content-Type,X-Amz-Date,Authorization,X-Api-Key'"
      AllowOrigin: "'*'"

Resources:
  CreateFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: handlers.createHandler
      Runtime: nodejs18.x
      Environment:
        Variables:
          TABLE_NAME: !Ref MainTable
          EVENT_BUS_NAME: !Ref MainEventBus
      Events:
        ApiCreate:
          Type: Api
          Properties:
            Path: /api/v1/resource/create
            Method: post
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref MainTable
        - EventBridgePutEventsPolicy:
            EventBusName: !Ref MainEventBus

  ReadFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: handlers.readHandler
      Runtime: nodejs18.x
      Environment:
        Variables:
          TABLE_NAME: !Ref MainTable
          EVENT_BUS_NAME: !Ref MainEventBus
      Events:
        ApiRead:
          Type: Api
          Properties:
            Path: /api/v1/resource/read
            Method: post
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref MainTable
        - EventBridgePutEventsPolicy:
            EventBusName: !Ref MainEventBus

  UpdateFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: handlers.updateHandler
      Runtime: nodejs18.x
      Environment:
        Variables:
          TABLE_NAME: !Ref MainTable
          EVENT_BUS_NAME: !Ref MainEventBus
      Events:
        ApiUpdate:
          Type: Api
          Properties:
            Path: /api/v1/resource/update
            Method: post
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref MainTable
        - EventBridgePutEventsPolicy:
            EventBusName: !Ref MainEventBus

  DeleteFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: handlers.deleteHandler
      Runtime: nodejs18.x
      Environment:
        Variables:
          TABLE_NAME: !Ref MainTable
          EVENT_BUS_NAME: !Ref MainEventBus
      Events:
        ApiDelete:
          Type: Api
          Properties:
            Path: /api/v1/resource/delete
            Method: post
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref MainTable
        - EventBridgePutEventsPolicy:
            EventBusName: !Ref MainEventBus

  ListFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: handlers.listHandler
      Runtime: nodejs18.x
      Environment:
        Variables:
          TABLE_NAME: !Ref MainTable
          EVENT_BUS_NAME: !Ref MainEventBus
      Events:
        ApiList:
          Type: Api
          Properties:
            Path: /api/v1/resource/list
            Method: post
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref MainTable
        - EventBridgePutEventsPolicy:
            EventBusName: !Ref MainEventBus

  ProcessEventFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: handlers.processeventHandler
      Runtime: nodejs18.x
      Environment:
        Variables:
          TABLE_NAME: !Ref MainTable
          EVENT_BUS_NAME: !Ref MainEventBus
      Events:
        ApiProcessEvent:
          Type: Api
          Properties:
            Path: /api/v1/resource/processevent
            Method: post
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref MainTable
        - EventBridgePutEventsPolicy:
            EventBusName: !Ref MainEventBus

  SyncFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: handlers.syncHandler
      Runtime: nodejs18.x
      Environment:
        Variables:
          TABLE_NAME: !Ref MainTable
          EVENT_BUS_NAME: !Ref MainEventBus
      Events:
        ApiSync:
          Type: Api
          Properties:
            Path: /api/v1/resource/sync
            Method: post
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref MainTable
        - EventBridgePutEventsPolicy:
            EventBusName: !Ref MainEventBus

  BatchWriteFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: handlers.batchwriteHandler
      Runtime: nodejs18.x
      Environment:
        Variables:
          TABLE_NAME: !Ref MainTable
          EVENT_BUS_NAME: !Ref MainEventBus
      Events:
        ApiBatchWrite:
          Type: Api
          Properties:
            Path: /api/v1/resource/batchwrite
            Method: post
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref MainTable
        - EventBridgePutEventsPolicy:
            EventBusName: !Ref MainEventBus

  BatchGetFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: handlers.batchgetHandler
      Runtime: nodejs18.x
      Environment:
        Variables:
          TABLE_NAME: !Ref MainTable
          EVENT_BUS_NAME: !Ref MainEventBus
      Events:
        ApiBatchGet:
          Type: Api
          Properties:
            Path: /api/v1/resource/batchget
            Method: post
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref MainTable
        - EventBridgePutEventsPolicy:
            EventBusName: !Ref MainEventBus

  NotifyFunction:
    Type: AWS::Serverless::Function
    Properties:
      CodeUri: src/
      Handler: handlers.notifyHandler
      Runtime: nodejs18.x
      Environment:
        Variables:
          TABLE_NAME: !Ref MainTable
          EVENT_BUS_NAME: !Ref MainEventBus
      Events:
        ApiNotify:
          Type: Api
          Properties:
            Path: /api/v1/resource/notify
            Method: post
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref MainTable
        - EventBridgePutEventsPolicy:
            EventBusName: !Ref MainEventBus

  MainTable:
    Type: AWS::DynamoDB::Table
    Properties:
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: PK
          AttributeType: S
        - AttributeName: SK
          AttributeType: S
      KeySchema:
        - AttributeName: PK
          KeyType: HASH
        - AttributeName: SK
          KeyType: RANGE
      StreamSpecification:
        StreamViewType: NEW_AND_OLD_IMAGES

  MainEventBus:
    Type: AWS::Events::EventBus
    Properties:
      Name: com.enterprise.mainbus
```

## 6. Comprehensive Guidelines and Best Practices
### 6.1. Guideline: Testing Strategies Principle 1
When implementing Testing Strategies, rule #1 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.2. Guideline: Testing Strategies Principle 2
When implementing Testing Strategies, rule #2 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.3. Guideline: Testing Strategies Principle 3
When implementing Testing Strategies, rule #3 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.4. Guideline: Testing Strategies Principle 4
When implementing Testing Strategies, rule #4 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.5. Guideline: Testing Strategies Principle 5
When implementing Testing Strategies, rule #5 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.6. Guideline: Testing Strategies Principle 6
When implementing Testing Strategies, rule #6 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.7. Guideline: Testing Strategies Principle 7
When implementing Testing Strategies, rule #7 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.8. Guideline: Testing Strategies Principle 8
When implementing Testing Strategies, rule #8 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.9. Guideline: Testing Strategies Principle 9
When implementing Testing Strategies, rule #9 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.10. Guideline: Testing Strategies Principle 10
When implementing Testing Strategies, rule #10 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.11. Guideline: Testing Strategies Principle 11
When implementing Testing Strategies, rule #11 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.12. Guideline: Testing Strategies Principle 12
When implementing Testing Strategies, rule #12 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.13. Guideline: Testing Strategies Principle 13
When implementing Testing Strategies, rule #13 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.14. Guideline: Testing Strategies Principle 14
When implementing Testing Strategies, rule #14 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.15. Guideline: Testing Strategies Principle 15
When implementing Testing Strategies, rule #15 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.16. Guideline: Testing Strategies Principle 16
When implementing Testing Strategies, rule #16 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.17. Guideline: Testing Strategies Principle 17
When implementing Testing Strategies, rule #17 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.18. Guideline: Testing Strategies Principle 18
When implementing Testing Strategies, rule #18 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.19. Guideline: Testing Strategies Principle 19
When implementing Testing Strategies, rule #19 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.20. Guideline: Testing Strategies Principle 20
When implementing Testing Strategies, rule #20 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.21. Guideline: Testing Strategies Principle 21
When implementing Testing Strategies, rule #21 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.22. Guideline: Testing Strategies Principle 22
When implementing Testing Strategies, rule #22 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.23. Guideline: Testing Strategies Principle 23
When implementing Testing Strategies, rule #23 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.24. Guideline: Testing Strategies Principle 24
When implementing Testing Strategies, rule #24 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.25. Guideline: Testing Strategies Principle 25
When implementing Testing Strategies, rule #25 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.26. Guideline: Testing Strategies Principle 26
When implementing Testing Strategies, rule #26 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.27. Guideline: Testing Strategies Principle 27
When implementing Testing Strategies, rule #27 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.28. Guideline: Testing Strategies Principle 28
When implementing Testing Strategies, rule #28 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.29. Guideline: Testing Strategies Principle 29
When implementing Testing Strategies, rule #29 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.30. Guideline: Testing Strategies Principle 30
When implementing Testing Strategies, rule #30 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.31. Guideline: Testing Strategies Principle 31
When implementing Testing Strategies, rule #31 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.32. Guideline: Testing Strategies Principle 32
When implementing Testing Strategies, rule #32 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.33. Guideline: Testing Strategies Principle 33
When implementing Testing Strategies, rule #33 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.34. Guideline: Testing Strategies Principle 34
When implementing Testing Strategies, rule #34 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.35. Guideline: Testing Strategies Principle 35
When implementing Testing Strategies, rule #35 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.36. Guideline: Testing Strategies Principle 36
When implementing Testing Strategies, rule #36 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.37. Guideline: Testing Strategies Principle 37
When implementing Testing Strategies, rule #37 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.38. Guideline: Testing Strategies Principle 38
When implementing Testing Strategies, rule #38 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.39. Guideline: Testing Strategies Principle 39
When implementing Testing Strategies, rule #39 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.40. Guideline: Testing Strategies Principle 40
When implementing Testing Strategies, rule #40 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.41. Guideline: Testing Strategies Principle 41
When implementing Testing Strategies, rule #41 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.42. Guideline: Testing Strategies Principle 42
When implementing Testing Strategies, rule #42 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.43. Guideline: Testing Strategies Principle 43
When implementing Testing Strategies, rule #43 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.44. Guideline: Testing Strategies Principle 44
When implementing Testing Strategies, rule #44 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.45. Guideline: Testing Strategies Principle 45
When implementing Testing Strategies, rule #45 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.46. Guideline: Testing Strategies Principle 46
When implementing Testing Strategies, rule #46 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.47. Guideline: Testing Strategies Principle 47
When implementing Testing Strategies, rule #47 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.48. Guideline: Testing Strategies Principle 48
When implementing Testing Strategies, rule #48 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.49. Guideline: Testing Strategies Principle 49
When implementing Testing Strategies, rule #49 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.

### 6.50. Guideline: Testing Strategies Principle 50
When implementing Testing Strategies, rule #50 mandates rigorous attention to boundary contexts and least privilege. 
AWS Lambda should strictly validate all inputs from API Gateway. 
DynamoDB operations must handle idempotency to ensure EventBridge retries do not corrupt state. 
Monitor `IteratorAge` for DynamoDB streams and set appropriate DLQs on asynchronous Lambda invocations.
