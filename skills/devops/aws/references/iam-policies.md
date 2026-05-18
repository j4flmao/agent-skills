# IAM Policies

## Policy Structure

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["s3:GetObject"],
      "Resource": "arn:aws:s3:::my-bucket/*",
      "Condition": {
        "IpAddress": {
          "aws:SourceIp": "10.0.0.0/8"
        }
      }
    }
  ]
}
```

## Managed vs Inline

| Type | Scope | Max size | Use case |
|------|-------|----------|----------|
| AWS Managed | Cross-account | N/A | Common roles (Admin, ReadOnly) |
| Customer Managed | Cross-account | 6144 chars | Reusable, org-specific policies |
| Inline | Single Principal | 10240 chars | One-off, tightly scoped |

## Common Patterns

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3ReadWriteSpecificBucket",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::my-app-uploads",
        "arn:aws:s3:::my-app-uploads/*"
      ]
    },
    {
      "Sid": "DenyDeleteWithoutMFA",
      "Effect": "Deny",
      "Action": ["s3:DeleteObject"],
      "Resource": "arn:aws:s3:::my-app-uploads/*",
      "Condition": {
        "BoolIfExists": {
          "aws:MultiFactorAuthPresent": "false"
        }
      }
    }
  ]
}
```

## Trust Policies

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::123456789012:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "my-external-id"
        }
      }
    },
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    },
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::123456789012:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringLike": {
          "token.actions.githubusercontent.com:sub": "repo:org/repo:*"
        }
      }
    }
  ]
}
```

## Conditions

```json
{
  "Condition": {
    "StringEquals": {
      "aws:RequestedRegion": ["us-east-1", "eu-west-1"]
    },
    "StringNotEquals": {
      "aws:ResourceAccount": "123456789012"
    },
    "ArnEquals": {
      "aws:SourceArn": "arn:aws:lambda:us-east-1:123456789012:function:my-func"
    },
    "Bool": {
      "aws:SecureTransport": "true"
    },
    "DateGreaterThan": {
      "aws:CurrentTime": "2025-01-01T00:00:00Z"
    },
    "IpAddress": {
      "aws:SourceIp": ["203.0.113.0/24", "198.51.100.0/24"]
    },
    "StringLike": {
      "s3:prefix": ["public/*", "uploads/*"]
    },
    "Null": {
      "aws:RequestTag/Environment": "true"
    }
  }
}
```

## Permission Boundaries

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": "*",
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": ["us-east-1", "us-west-2"]
        }
      }
    },
    {
      "Effect": "Deny",
      "Action": [
        "iam:*",
        "organizations:*",
        "account:*"
      ],
      "Resource": "*"
    }
  ]
}
```

## Service Control Policies (SCP)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Action": [
        "ec2:RunInstances",
        "rds:CreateDBInstance"
      ],
      "Resource": "*",
      "Condition": {
        "StringNotEquals": {
          "aws:RequestedRegion": [
            "us-east-1",
            "us-west-2",
            "eu-west-1"
          ]
        }
      }
    },
    {
      "Effect": "Deny",
      "Action": [
        "s3:PutBucketPublicAccessBlock",
        "s3:PutBucketPolicy"
      ],
      "Resource": "*"
    }
  ]
}
```

## Least Privilege Checklist

- [ ] Use `Deny` for explicit blocks (MFA required, specific regions)
- [ ] Scope `Resource` to specific ARNs — never `*` unless necessary
- [ ] Use `Condition` for time, IP, MFA, and source constraints
- [ ] Prefer `aws:SourceArn` over `aws:SourceAccount` for cross-service access
- [ ] Permission boundaries for delegated admin
- [ ] SCPs at the organizational level for guardrails
- [ ] Use IAM Access Analyzer to validate policies
- [ ] Regular access reviews with IAM Last Accessed info
