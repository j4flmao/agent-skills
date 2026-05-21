# AWS API Gateway

## Gateway Types

| Type | Protocol | Use Case | Pricing |
|---|---|---|---|
| **REST API** | HTTP/HTTPS | Full-featured API management | Per call + data transfer |
| **HTTP API** | HTTP/HTTPS | Low-latency, lower cost | Per call (cheaper) |
| **WebSocket API** | WebSocket | Real-time bidirectional | Per connection + messages |
| **Private API** | HTTP | Internal VPC-only APIs | Per call + VPC endpoint |

## SAM Template — REST API with Cognito Auth

```yaml
AWSTemplateFormatVersion: "2010-09-09"
Transform: AWS::Serverless-2016-10-31

Parameters:
  StageName:
    Type: String
    Default: prod

Globals:
  Function:
    Timeout: 10
    MemorySize: 512
    Runtime: nodejs22.x
    Tracing: Active
    Environment:
      Variables:
        TABLE_NAME: !Ref DataTable

Resources:
  ApiGateway:
    Type: AWS::Serverless::Api
    Properties:
      StageName: !Ref StageName
      TracingEnabled: true
      EndpointConfiguration:
        Type: REGIONAL
      Auth:
        DefaultAuthorizer: CognitoAuthorizer
        Authorizers:
          CognitoAuthorizer:
            UserPoolArn: !GetAtt UserPool.Arn
      MethodSettings:
        - ResourcePath: "/*"
          HttpMethod: "*"
          LoggingLevel: INFO
          DataTraceEnabled: false
          MetricsEnabled: true
          ThrottlingRateLimit: 100
          ThrottlingBurstLimit: 50

  UserPool:
    Type: AWS::Cognito::UserPool
    Properties:
      UserPoolName: my-api-users
      Policies:
        PasswordPolicy:
          MinimumLength: 8
      AutoVerifiedAttributes:
        - email

  UserPoolClient:
    Type: AWS::Cognito::UserPoolClient
    Properties:
      UserPoolId: !Ref UserPool
      GenerateSecret: false

  CreateUserFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handlers/users.createUser
      CodeUri: ./src
      Events:
        CreateUser:
          Type: Api
          Properties:
            RestApiId: !Ref ApiGateway
            Path: /users
            Method: POST
            Auth:
              Authorizer: CognitoAuthorizer
      Policies:
        - DynamoDBCrudPolicy:
            TableName: !Ref DataTable

  DataTable:
    Type: AWS::DynamoDB::Table
    Properties:
      BillingMode: PAY_PER_REQUEST
      AttributeDefinitions:
        - AttributeName: id
          AttributeType: S
      KeySchema:
        - AttributeName: id
          KeyType: HASH
```

## HTTP API — Lower Cost, Higher Performance

```yaml
# HTTP API for public endpoints
HttpApiGateway:
  Type: AWS::Serverless::HttpApi
  Properties:
    StageName: !Ref StageName
    CorsConfiguration:
      AllowOrigins:
        - "https://app.example.com"
      AllowMethods:
        - GET
        - POST
        - PUT
        - DELETE
      AllowHeaders:
        - Authorization
        - Content-Type
      MaxAge: 600
    DefaultRouteSettings:
      ThrottlingRateLimit: 100
      ThrottlingBurstLimit: 50

  GetOrdersFunction:
    Type: AWS::Serverless::Function
    Properties:
      Handler: handlers/orders.getOrders
      CodeUri: ./src
      Events:
        GetOrders:
          Type: HttpApi
          Properties:
            ApiId: !Ref HttpApiGateway
            Path: /orders
            Method: GET
      Policies:
        - DynamoDBReadPolicy:
            TableName: !Ref OrdersTable
```

## Private API Gateway (VPC Internal)

```yaml
PrivateApiGateway:
  Type: AWS::ApiGateway::RestApi
  Properties:
    Name: private-api
    EndpointConfiguration:
      Types:
        - PRIVATE
      VpcEndpointIds:
        - !Ref ApiGatewayVPCE

ApiGatewayVPCE:
  Type: AWS::EC2::VPCEndpoint
  Properties:
    ServiceName: !Sub "com.amazonaws.${AWS::Region}.execute-api"
    VpcId: !Ref VpcId
    SubnetIds:
      - !Ref PrivateSubnetA
      - !Ref PrivateSubnetB
    SecurityGroupIds:
      - !Ref ApiGatewaySG
```

## Usage Plans and API Keys

```yaml
UsagePlan:
  Type: AWS::ApiGateway::UsagePlan
  Properties:
    Description: "Free tier usage plan"
    ApiStages:
      - ApiId: !Ref ApiGateway
        Stage: prod
        Throttle:
          /orders/GET:
            BurstLimit: 20
            RateLimit: 10
    Throttle:
      BurstLimit: 100
      RateLimit: 50
    Quota:
      Limit: 10000
      Period: MONTH

ApiKey:
  Type: AWS::ApiGateway::ApiKey
  Properties:
    Description: "Free tier client key"
    Enabled: true
    StageKeys:
      - RestApiId: !Ref ApiGateway
        Stage: prod

UsagePlanKey:
  Type: AWS::ApiGateway::UsagePlanKey
  Properties:
    KeyId: !Ref ApiKey
    KeyType: API_KEY
    UsagePlanId: !Ref UsagePlan
```

## Custom Domain + TLS

```yaml
CustomDomain:
  Type: AWS::ApiGateway::DomainName
  Properties:
    DomainName: api.example.com
    CertificateArn: !Ref CertificateArn
    EndpointConfiguration:
      Types:
        - REGIONAL

BasePathMapping:
  Type: AWS::ApiGateway::BasePathMapping
  Properties:
    DomainName: !Ref CustomDomain
    RestApiId: !Ref ApiGateway
    Stage: prod

# Route53 alias
DnsRecord:
  Type: AWS::Route53::RecordSet
  Properties:
    HostedZoneId: !Ref HostedZoneId
    Name: api.example.com
    Type: A
    AliasTarget:
      DNSName: !GetAtt CustomDomain.RegionalDomainName
      HostedZoneId: !GetAtt CustomDomain.RegionalHostedZoneId
```

## Lambda Authorizer (Custom Auth)

```yaml
TokenAuthorizer:
  Type: AWS::ApiGateway::Authorizer
  Properties:
    Name: custom-jwt-authorizer
    RestApiId: !Ref ApiGateway
    Type: TOKEN
    AuthType: CUSTOM
    AuthorizerUri: !Sub "arn:aws:apigateway:${AWS::Region}:lambda:path/2015-03-31/functions/${AuthorizerFunction.Arn}/invocations"
    AuthorizerResultTtlInSeconds: 300
    IdentitySource: method.request.header.Authorization

AuthorizerFunction:
  Type: AWS::Serverless::Function
  Properties:
    Handler: handlers/authorizer.authorize
    CodeUri: ./src
    Policies:
      - Statement:
          - Effect: Allow
            Action: es:ESHttpPost
            Resource: "*"
```

### Authorizer Lambda (Node.js)

```javascript
// handlers/authorizer.js
export const authorize = async (event) => {
  const token = event.authorizationToken?.replace("Bearer ", "");
  // Verify token (JWT, custom auth, etc.)
  const effect = isValid(token) ? "Allow" : "Deny";
  return {
    principalId: userId,
    policyDocument: {
      Version: "2012-10-17",
      Statement: [{
        Action: "execute-api:Invoke",
        Effect: effect,
        Resource: event.methodArn,
      }],
    },
    context: {
      userId: userId,
      roles: roles.join(","),
    },
  };
};
```

## VPC Link (Private Integration)

```yaml
VpcLink:
  Type: AWS::ApiGateway::VpcLink
  Properties:
    Name: internal-services-link
    TargetArns:
      - !Ref NlbArn

NLB:
  Type: AWS::ElasticLoadBalancingV2::NetworkLoadBalancer
  Properties:
    Name: internal-gateway-nlb
    Scheme: internal
    Subnets:
      - !Ref PrivateSubnetA
      - !Ref PrivateSubnetB

NLBTargetGroup:
  Type: AWS::ElasticLoadBalancingV2::TargetGroup
  Properties:
    Port: 8080
    Protocol: TCP
    VpcId: !Ref VpcId
    Targets:
      - Id: !Ref InternalService1
        Port: 8080
```

## Request Validation

```yaml
# SAM request validation
RequestValidator:
  Type: AWS::ApiGateway::RequestValidator
  Properties:
    Name: full-validator
    RestApiId: !Ref ApiGateway
    ValidateRequestBody: true
    ValidateRequestParameters: true

# Model for request body validation
CreateUserModel:
  Type: AWS::ApiGateway::Model
  Properties:
    RestApiId: !Ref ApiGateway
    ContentType: application/json
    Name: CreateUserRequest
    Schema:
      type: object
      required:
        - name
        - email
      properties:
        name:
          type: string
          minLength: 2
          maxLength: 100
        email:
          type: string
          pattern: "^[\\w.-]+@[\\w.-]+\\.\\w+$"
        age:
          type: integer
          minimum: 0
          maximum: 150
```

## Canary Deployments

```yaml
# Deploy with canary via SAM or CLI
# CLI:
aws apigateway create-deployment --rest-api-id abc123 --stage prod
aws apigateway update-stage \
  --rest-api-id abc123 \
  --stage-name prod \
  --patch-operations op=replace,path=/canarySettings/percentTraffic,value=10

# Promote canary:
aws apigateway update-stage \
  --rest-api-id abc123 \
  --stage-name prod \
  --patch-operations op=replace,path=/canarySettings/percentTraffic,value=0

# Rollback:
aws apigateway update-stage \
  --rest-api-id abc123 \
  --stage-name prod \
  --patch-operations "op=replace,path=/variables/version,value=v1"
```

## CloudWatch Logging and Metrics

```yaml
# Per-stage logging
ApiGateway:
  Type: AWS::Serverless::Api
  Properties:
    StageName: !Ref StageName
    AccessLogSetting:
      DestinationArn: !GetAtt GatewayLogGroup.Arn
      Format: >
        {"requestId":"$context.requestId",
         "ip":"$context.identity.sourceIp",
         "caller":"$context.identity.caller",
         "user":"$context.identity.user",
         "requestTime":"$context.requestTime",
         "httpMethod":"$context.httpMethod",
         "resourcePath":"$context.resourcePath",
         "status":$context.status,
         "protocol":"$context.protocol",
         "responseLength":$context.responseLength,
         "integrationLatency":"$context.integrationLatency",
         "latency":"$context.custom.latency"}

# Key metrics (automatically emitted):
# - 4xxError, 5xxError
# - Count, IntegrationLatency, Latency
# - CacheHitCount, CacheMissCount

# Dashboard widget:
# {
#   "metrics": [
#     ["AWS/ApiGateway", "Count", { "stat": "Sum", "period": 60 }],
#     ["AWS/ApiGateway", "4xxError", { "stat": "Sum", "period": 60 }],
#     ["AWS/ApiGateway", "5xxError", { "stat": "Sum", "period": 60 }],
#     ["AWS/ApiGateway", "Latency", { "stat": "p99", "period": 60 }]
#   ],
#   "period": 60,
#   "stat": "Average",
#   "region": "us-east-1",
#   "title": "API Gateway Metrics"
# }
```

## WAF Integration

```yaml
# AWS WAF Web ACL for API Gateway
WebACL:
  Type: AWS::WAFv2::WebACL
  Properties:
    Name: api-gateway-acl
    Scope: REGIONAL
    DefaultAction:
      Allow: {}
    Rules:
      - Name: AWS-AWSManagedRulesCommonRuleSet
        Priority: 0
        OverrideAction:
          None: {}
        Statement:
          ManagedRuleGroupStatement:
            VendorName: AWS
            Name: AWSManagedRulesCommonRuleSet
        VisibilityConfig:
          SampledRequestsEnabled: true
          CloudWatchMetricsEnabled: true
          MetricName: AWSCommonRules

      - Name: RateLimitRule
        Priority: 1
        Action:
          Block: {}
        Statement:
          RateBasedStatement:
            Limit: 2000
            AggregateKeyType: IP
        VisibilityConfig:
          SampledRequestsEnabled: true
          CloudWatchMetricsEnabled: true
          MetricName: RateLimit

  Association:
    Type: AWS::WAFv2::WebACLAssociation
    Properties:
      ResourceArn: !Sub "arn:aws:apigateway:${AWS::Region}::/restapis/${ApiGateway}/stages/${StageName}"
      WebACLArn: !GetAtt WebACL.Arn
```
