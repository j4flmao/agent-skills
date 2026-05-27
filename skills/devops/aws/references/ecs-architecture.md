# ECS Architecture and Patterns

## Overview
Amazon ECS (Elastic Container Service) is a fully managed container orchestration service. It supports both AWS Fargate (serverless) and EC2 launch types. This reference covers cluster architecture, service definitions, task definitions, networking, auto scaling, and CI/CD integration.

## Cluster Architecture

### Cluster Types
```yaml
# Fargate cluster (serverless)
Resources:
  FargateCluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: prod-fargate
      CapacityProviders:
        - FARGATE
        - FARGATE_SPOT
      DefaultCapacityProviderStrategy:
        - CapacityProvider: FARGATE
          Weight: 1
        - CapacityProvider: FARGATE_SPOT
          Weight: 0

# EC2 cluster
  EC2Cluster:
    Type: AWS::ECS::Cluster
    Properties:
      ClusterName: prod-ec2
      ClusterSettings:
        - Name: containerInsights
          Value: enabled
```

## Task Definitions

### Fargate Task Definition
```json
{
  "family": "web-app",
  "networkMode": "awsvpc",
  "requiresCompatibilities": ["FARGATE"],
  "cpu": "512",
  "memory": "1024",
  "executionRoleArn": "arn:aws:iam::account:role/ecsTaskExecutionRole",
  "taskRoleArn": "arn:aws:iam::account:role/appTaskRole",
  "containerDefinitions": [
    {
      "name": "app",
      "image": "account.dkr.ecr.us-east-1.amazonaws.com/app:latest",
      "essential": true,
      "portMappings": [
        {
          "containerPort": 8080,
          "protocol": "tcp"
        }
      ],
      "environment": [
        { "name": "NODE_ENV", "value": "production" }
      ],
      "secrets": [
        { "name": "DB_PASSWORD", "valueFrom": "arn:aws:ssm:/prod/db/password" }
      ],
      "logConfiguration": {
        "logDriver": "awslogs",
        "options": {
          "awslogs-group": "/ecs/web-app",
          "awslogs-region": "us-east-1",
          "awslogs-stream-prefix": "ecs"
        }
      },
      "healthCheck": {
        "command": ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"],
        "interval": 30,
        "timeout": 5,
        "retries": 3,
        "startPeriod": 60
      }
    }
  ]
}
```

### Sidecar Pattern
```json
{
  "containerDefinitions": [
    {
      "name": "app",
      "image": "app:latest",
      "essential": true,
      "portMappings": [{"containerPort": 3000}]
    },
    {
      "name": "envoy",
      "image": "envoyproxy/envoy:v1.28-latest",
      "essential": true,
      "portMappings": [{"containerPort": 9901}],
      "dependsOn": [
        {
          "containerName": "app",
          "condition": "HEALTHY"
        }
      ]
    },
    {
      "name": "datadog-agent",
      "image": "datadog/agent:latest",
      "essential": false,
      "environment": [
        {"name": "DD_API_KEY", "valueFrom": "arn:aws:ssm:/dd/api_key"}
      ]
    }
  ]
}
```

## Service Definitions

### Service with ALB
```json
{
  "serviceName": "web-app-service",
  "cluster": "prod-fargate",
  "taskDefinition": "web-app:42",
  "desiredCount": 3,
  "launchType": "FARGATE",
  "platformVersion": "1.4.0",
  "networkConfiguration": {
    "awsvpcConfiguration": {
      "subnets": ["subnet-abc", "subnet-def"],
      "securityGroups": ["sg-123"],
      "assignPublicIp": "ENABLED"
    }
  },
  "loadBalancers": [
    {
      "targetGroupArn": "arn:aws:elasticloadbalancing:...:targetgroup/web-app/abc",
      "containerName": "app",
      "containerPort": 8080
    }
  ],
  "healthCheckGracePeriodSeconds": 60,
  "deploymentConfiguration": {
    "deploymentCircuitBreaker": {
      "enable": true,
      "rollback": true
    },
    "maximumPercent": 200,
    "minimumHealthyPercent": 100
  },
  "schedulingStrategy": "REPLICA"
}
```

## Service Auto Scaling

### Target Tracking
```json
{
  "scalableTarget": {
    "serviceNamespace": "ecs",
    "scalableDimension": "ecs:service:DesiredCount",
    "minCapacity": 2,
    "maxCapacity": 20
  },
  "scalingPolicies": [
    {
      "policyName": "cpu-scaling",
      "policyType": "TargetTrackingScaling",
      "targetTrackingScalingPolicyConfiguration": {
        "targetValue": 70.0,
        "predefinedMetricSpecification": {
          "predefinedMetricType": "ECSServiceAverageCPUUtilization"
        },
        "scaleInCooldown": 60,
        "scaleOutCooldown": 30
      }
    },
    {
      "policyName": "memory-scaling",
      "policyType": "TargetTrackingScaling",
      "targetTrackingScalingPolicyConfiguration": {
        "targetValue": 80.0,
        "predefinedMetricSpecification": {
          "predefinedMetricType": "ECSServiceAverageMemoryUtilization"
        },
        "scaleInCooldown": 60,
        "scaleOutCooldown": 30
      }
    },
    {
      "policyName": "alb-request-scaling",
      "policyType": "TargetTrackingScaling",
      "targetTrackingScalingPolicyConfiguration": {
        "targetValue": 1000.0,
        "predefinedMetricSpecification": {
          "predefinedMetricType": "ALBRequestCountPerTarget",
          "resourceLabel": "app/web-app-alb/abc/targetgroup/web-app/xyz"
        }
      }
    }
  ]
}
```

## Networking

### VPC Architecture
```yaml
Resources:
  ECSVPC:
    Type: AWS::EC2::VPC
    Properties:
      CidrBlock: 10.0.0.0/16

  PublicSubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref ECSVPC
      CidrBlock: 10.0.1.0/24
      MapPublicIpOnLaunch: true

  PrivateSubnet:
    Type: AWS::EC2::Subnet
    Properties:
      VpcId: !Ref ECSVPC
      CidrBlock: 10.0.2.0/24

  ECSClusterSG:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: ECS tasks security group
      VpcId: !Ref ECSVPC
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 8080
          ToPort: 8080
          SourceSecurityGroupId: !Ref ALBSecurityGroup
```

### Service Discovery
```yaml
Resources:
  Namespace:
    Type: AWS::ServiceDiscovery::PrivateDnsNamespace
    Properties:
      Name: internal.example.com
      Vpc: !Ref ECSVPC

  ServiceDiscovery:
    Type: AWS::ServiceDiscovery::Service
    Properties:
      Name: api
      DnsConfig:
        NamespaceId: !Ref Namespace
        DnsRecords:
          - Type: A
            TTL: 60
      HealthCheckCustomConfig:
        FailureThreshold: 1
```

## CI/CD Integration

### CodePipeline with ECS
```yaml
Resources:
  Pipeline:
    Type: AWS::CodePipeline::Pipeline
    Properties:
      Stages:
        - Name: Source
          Actions:
            - ActionTypeId:
                Category: Source
                Provider: ECR
              Configuration:
                RepositoryName: app-repo
                ImageTag: latest

        - Name: Deploy
          Actions:
            - ActionTypeId:
                Category: Deploy
                Provider: ECS
              Configuration:
                ClusterName: prod-fargate
                ServiceName: web-app-service
                FileName: imagedefinitions.json
```

## Key Points
- Fargate eliminates server management; EC2 launch type offers more control
- Task definitions describe container configuration as JSON
- Services maintain desired count of running tasks
- ALB integration distributes traffic across tasks
- Auto scaling uses CloudWatch metrics for target tracking
- Service discovery enables internal DNS for inter-service communication
- Deployment circuit breaker prevents bad deployments
- Sidecar pattern runs auxiliary containers alongside the main app
- Use Secrets Manager or SSM Parameter Store for sensitive data
- awslogs driver sends container logs to CloudWatch
- IAM task roles grant permissions to containers
- Capacity providers manage Fargate Spot and On-Demand mixing
