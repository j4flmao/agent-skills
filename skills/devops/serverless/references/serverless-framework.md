# Serverless Framework

## Project Structure

```
my-service/
├── src/
│   ├── handlers/
│   │   ├── users.ts
│   │   └── orders.ts
│   ├── lib/
│   │   ├── db.ts
│   │   └── validation.ts
│   └── middleware/
│       └── auth.ts
├── resources/
│   ├── dynamodb.yml
│   ├── s3.yml
│   └── iam.yml
├── serverless.yml
├── package.json
├── tsconfig.json
└── .env
```

## serverless.yml Reference

```yaml
# Full reference
service: my-app

frameworkVersion: "4"

plugins:
  - serverless-esbuild
  - serverless-iam-roles-per-function
  - serverless-offline
  - serverless-prune-plugin

custom:
  stage: ${opt:stage, 'dev'}
  region: ${opt:region, 'us-east-1'}
  esbuild:
    bundle: true
    minify: true
    sourcemap: true
    platform: node
    target: node22
  prune:
    automatic: true
    number: 3
  alerts:
    definitions:
      functionErrors:
        metric: Errors
        threshold: 1
        period: 300
        comparisonOperator: GreaterThanThreshold
    topics:
      alarm:
        topic: !Ref AlertTopic

params:
  dev:
    tableName: my-app-dev
  prod:
    tableName: my-app-prod

provider:
  name: aws
  runtime: nodejs22.x
  region: ${self:custom.region}
  stage: ${self:custom.stage}
  architecture: arm64
  memorySize: 512
  timeout: 30
  logRetentionInDays: 7
  versionFunctions: true
  deploymentBucket:
    name: ${self:service}-${self:provider.stage}-deploy
    maxPreviousDeploymentArtifacts: 5
  environment:
    SERVICE: ${self:service}
    STAGE: ${self:provider.stage}
    NODE_OPTIONS: "--enable-source-maps"
  tracing:
    lambda: true
    apiGateway: true
  iam:
    role:
      statements:
        - Effect: Allow
          Action:
            - xray:PutTraceSegments
            - xray:PutTelemetryRecords
          Resource: "*"

functions:
  createUser:
    handler: src/handlers/users.createUser
    events:
      - http:
          path: /users
          method: post
          cors: true
          authorizer:
            type: COGNITO_USER_POOLS
            authorizerId: !Ref ApiGatewayAuthorizer

resources:
  Resources:
    MyTable:
      Type: AWS::DynamoDB::Table
      Properties:
        TableName: ${param:tableName}
        BillingMode: PAY_PER_REQUEST
        AttributeDefinitions:
          - AttributeName: pk
            AttributeType: S
          - AttributeName: sk
            AttributeType: S
        KeySchema:
          - AttributeName: pk
            KeyType: HASH
          - AttributeName: sk
            KeyType: RANGE
  Outputs:
    MyTableArn:
      Value: !GetAtt MyTable.Arn
```

## Multi-Stage Deployment

```bash
# Deploy to specific stages
sls deploy --stage dev
sls deploy --stage staging
sls deploy --stage production

# Deploy single function (faster iteration)
sls deploy function -f createUser --stage dev

# Invoke locally
sls invoke local -f createUser -p event.json

# Stream logs
sls logs -f createUser -t

# Rollback
sls rollback --timestamp 2025-01-01T00:00:00
```

## Common Plugins

| Plugin | Purpose |
|--------|---------|
| `serverless-esbuild` | TypeScript/JS bundling |
| `serverless-offline` | Local Lambda + API Gateway emulation |
| `serverless-iam-roles-per-function` | Per-function IAM roles |
| `serverless-prune-plugin` | Remove old Lambda versions |
| `serverless-domain-manager` | Custom domain + API mapping |
| `serverless-wsgi` | Python Flask/Django support |
| `serverless-python-requirements` | Python dependency bundling |
| `serverless-step-functions` | Step Functions integration |
| `serverless-dotenv-plugin` | .env → environment variables |
| `serverless-plugin-canary-deployments` | Canary/linear deployments |

## Stage-Specific Configuration

```yaml
params:
  dev:
    domain: dev.example.com
    logRetention: 7
  staging:
    domain: staging.example.com
    logRetention: 30
  prod:
    domain: example.com
    logRetention: 90

provider:
  logRetentionInDays: ${param:logRetention}
  environment:
    DOMAIN: ${param:domain}
    TABLE_NAME: !Ref MyTable
```

## Variable Resolution

```yaml
# Reference sources
${self:service}              # Current service name
${self:provider.stage}       # Current stage
${opt:stage, 'dev'}          # CLI option with default
${env:REGION}                # Environment variable
${ssm:/myapp/api-key}        # SSM Parameter Store
${ssm:/myapp/db-url~true}    # SSM (decrypted with KMS)
${s3:my-bucket/config.json}  # S3 object content
${file(./config.json):key}   # Local file reference
${cf:stack.OutputKey}        # CloudFormation output
```

## CI/CD Integration

```yaml
# GitHub Actions
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npx sls deploy --stage production
        env:
          AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
          AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          AWS_REGION: us-east-1
```
