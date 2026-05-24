# IAM Policy as Code

## Overview

IAM policy as code brings version control, review, testing, and automation to identity and access management. This reference covers Terraform IAM for AWS/Azure/GCP, policy generation, simulation, least privilege analysis, and permission boundaries.

## Terraform IAM — AWS

### IAM Role with Least Privilege
```hcl
# Production IAM role for ECS task
resource "aws_iam_role" "ecs_task_role" {
  name = "ecs-task-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
        Condition = {
          ArnLike = {
            "aws:SourceArn" = "arn:aws:ecs:${var.region}:${var.account_id}:task/${var.cluster_name}/*"
          }
        }
      }
    ]
  })

  tags = {
    Environment = var.environment
    ManagedBy   = "terraform"
    Owner       = "platform-team"
  }
}

# Minimal S3 permissions for specific bucket
resource "aws_iam_role_policy" "s3_limited_access" {
  name = "s3-limited-access"
  role = aws_iam_role.ecs_task_role.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject"
        ]
        Resource = [
          "arn:aws:s3:::app-data-${var.environment}",
          "arn:aws:s3:::app-data-${var.environment}/*"
        ]
        Condition = {
          StringEquals = {
            "s3:x-amz-server-side-encryption": "AES256"
          }
        }
      },
      {
        Effect = "Deny"
        Action = [
          "s3:DeleteObject",
          "s3:DeleteBucket",
          "s3:PutBucketPolicy"
        ]
        Resource = [
          "arn:aws:s3:::app-data-${var.environment}",
          "arn:aws:s3:::app-data-${var.environment}/*"
        ]
      }
    ]
  })
}
```

### IAM Policy Generation Module
```hcl
# modules/iam-policy/main.tf
variable "service_actions" {
  type = map(list(string))
  description = "Map of service to allowed actions"
  default = {
    s3  = ["GetObject", "PutObject"]
    ecs = ["RunTask", "StopTask", "DescribeTasks"]
    sqs = ["SendMessage", "ReceiveMessage", "DeleteMessage"]
  }
}

variable "resource_arns" {
  type = map(string)
  description = "Map of service to resource ARN patterns"
}

locals {
  statements = [
    for service, actions in var.service_actions : {
      Effect   = "Allow"
      Action   = [for a in actions : "${service}:${a}"]
      Resource = [var.resource_arns[service]]
    }
  ]
}

resource "aws_iam_policy" "generated" {
  name        = var.policy_name
  path        = "/generated/"
  description = "Auto-generated least privilege policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = concat(local.statements, [
      {
        Effect   = "Deny"
        Action   = "*"
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "aws:ResourceTag/Environment": var.environment
          }
        }
      }
    ])
  })
}
```

## Permission Boundaries

### AWS Permission Boundary
```hcl
# Permission boundary for developer roles
resource "aws_iam_policy" "developer_boundary" {
  name        = "developer-permission-boundary"
  description = "Permission boundary for developer IAM roles"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:Describe*",
          "ec2:RunInstances",
          "ec2:TerminateInstances",
          "s3:ListBucket",
          "s3:GetObject",
          "s3:PutObject",
          "lambda:InvokeFunction",
          "lambda:ListFunctions",
          "cloudwatch:Get*",
          "cloudwatch:List*",
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
      },
      {
        Effect = "Deny"
        Action = [
          "iam:*",
          "organizations:*",
          "kms:PutKeyPolicy",
          "kms:ScheduleKeyDeletion",
          "s3:PutBucketPolicy",
          "s3:DeleteBucket",
          "ec2:DeleteSecurityGroup"
        ]
        Resource = "*"
      },
      {
        Effect = "Deny"
        Action = "*"
        Resource = "*"
        Condition = {
          StringNotEquals = {
            "aws:ResourceTag/Environment": [
              "development",
              "staging"
            ]
          }
        }
      }
    ]
  })
}

# Apply boundary when creating a role
resource "aws_iam_role" "developer" {
  name = "developer-${var.username}"

  permissions_boundary = aws_iam_policy.developer_boundary.arn

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${var.account_id}:user/${var.username}"
        }
      }
    ]
  })
}
```

## Policy Simulation

### AWS IAM Policy Simulator
```python
import boto3
import json

iam = boto3.client('iam')

def simulate_policy(actions, resources, policy_document):
    """Simulate whether actions would be allowed under a policy"""
    response = iam.simulate_custom_policy(
        PolicyInputList=[json.dumps(policy_document)],
        ActionNames=actions,
        ResourceArns=resources
    )
    
    results = {}
    for result in response['EvaluationResults']:
        results[result['EvalActionName']] = {
            'allowed': result['EvalDecision'],
            'reasons': [
                {
                    'statement': match['MatchedStatements'][0]['SourcePolicyId']
                    if match['MatchedStatements'] else None,
                    'reason': match.get('DecidingEntity', '')
                }
                for match in result['MatchedStatements']
            ]
        }
    
    return results

# Test if a policy allows unintended privilege escalation
test_policy = {
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": ["iam:PassRole", "ec2:RunInstances"],
            "Resource": "*"
        }
    ]
}

result = simulate_policy(
    ["iam:PassRole", "ec2:RunInstances"],
    ["arn:aws:ec2:*:*:instance/*", "arn:aws:iam::*:role/*"],
    test_policy
)
print(json.dumps(result, indent=2))
```

### Automated Least Privilege Policy Generation
```python
import json
from collections import defaultdict

def generate_least_privilege_policy(cloudtrail_events, resource_arns=None):
    """Generate minimal IAM policy from CloudTrail usage data"""
    service_actions = defaultdict(set)
    resource_map = defaultdict(set)
    
    for event in cloudtrail_events:
        service = event['eventSource'].split('.')[0]
        action = event['eventName']
        resources = [
            r['ARN'] for r in event.get('resources', [])
            if r['ARN'] != 'arn:aws:*'
        ]
        
        service_actions[service].add(action)
        for r in resources:
            resource_map[f"{service}:{action}"].add(r)
    
    statements = []
    for service, actions in sorted(service_actions.items()):
        sorted_actions = sorted(actions)
        
        # Try to consolidate into wildcards
        if len(sorted_actions) > 3:
            # Group by action prefix
            prefixes = defaultdict(list)
            for action in sorted_actions:
                prefix = action.split('_')[0] if '_' in action else action[0:3]
                prefixes[prefix].append(action)
            
            consolidated = []
            for prefix, pref_actions in prefixes.items():
                if len(pref_actions) > 2:
                    consolidated.append(f"{service}:{prefix}*")
                else:
                    consolidated.extend([f"{service}:{a}" for a in pref_actions])
            
            action_list = consolidated
        else:
            action_list = [f"{service}:{a}" for a in sorted_actions]
        
        # Get resource ARNs for this service
        service_resources = set()
        for action in sorted_actions:
            key = f"{service}:{action}"
            if key in resource_map:
                service_resources.update(resource_map[key])
        
        statements.append({
            "Effect": "Allow",
            "Action": action_list,
            "Resource": list(service_resources) if service_resources else ["*"]
        })
    
    return {
        "Version": "2012-10-17",
        "Statement": statements
    }
```

## Terraform IAM — Azure

### Azure RBAC with Terraform
```hcl
# Azure custom role with least privilege
resource "azurerm_role_definition" "app_operator" {
  name        = "app-operator-${var.environment}"
  scope       = data.azurerm_subscription.current.id
  description = "Application operator role for production support"

  permissions {
    actions = [
      "Microsoft.Web/sites/read",
      "Microsoft.Web/sites/start/action",
      "Microsoft.Web/sites/stop/action",
      "Microsoft.Web/sites/config/read",
      "Microsoft.Web/sites/logs/read",
      "Microsoft.Insights/metrics/read",
      "Microsoft.Insights/diagnosticSettings/read"
    ]
    not_actions = [
      "Microsoft.Web/sites/config/write",
      "Microsoft.Web/sites/delete"
    ]
  }

  assignable_scopes = [
    "/subscriptions/${var.subscription_id}/resourceGroups/${var.app_rg}"
  ]
}

# Role assignment with PIM eligible
resource "azurerm_role_assignment" "app_operator_devops" {
  scope              = azurerm_role_definition.app_operator.scope
  role_definition_id = azurerm_role_definition.app_operator.role_definition_resource_id
  principal_id       = azuread_group.devops.object_id

  # Requires Azure AD PIM for elevation
  lifecycle {
    ignore_changes = [principal_id]
  }
}
```

### Azure Policy as Code
```hcl
# Azure Policy to restrict RBAC assignments
resource "azurerm_policy_definition" "restrict_owner_role" {
  name         = "restrict-owner-role"
  policy_type  = "Custom"
  mode         = "All"
  display_name = "Restrict Owner role assignments"

  metadata = jsonencode({
    category = "IAM"
    version  = "1.0.0"
  })

  policy_rule = jsonencode({
    if = {
      allOf = [
        {
          field  = "type"
          equals = "Microsoft.Authorization/roleAssignments"
        },
        {
          field  = "Microsoft.Authorization/roleAssignments/roleDefinitionId"
          equals = "/providers/Microsoft.Authorization/roleDefinitions/8e3af657-a8ff-443c-a75c-2fe8c4bcb635"
        }
      ]
    }
    then = {
      effect = "Deny"
    }
  })
}
```

## Terraform IAM — GCP

### GCP IAM with Terraform
```hcl
# GCP service account with specific roles
resource "google_service_account" "app_sa" {
  account_id   = "app-sa-${var.environment}"
  display_name = "Application Service Account"
  description  = "Service account for ${var.app_name} application"
}

# Minimal roles (not primitive roles)
resource "google_project_iam_member" "app_sa_roles" {
  for_each = toset([
    "roles/storage.objectViewer",
    "roles/pubsub.subscriber",
    "roles/logging.logWriter",
    "roles/monitoring.metricWriter"
  ])
  
  project = var.project_id
  role    = each.key
  member  = "serviceAccount:${google_service_account.app_sa.email}"
}

# Deny policy (GCP Deny policies are explicit)
resource "google_iam_deny_policy" "deny_public_access" {
  parent = "cloudresourcemanager.googleapis.com/projects/${var.project_id}"
  name   = "deny-public-bucket-access"

  rules {
    description = "Deny allUsers and allAuthenticatedUsers on storage"
    deny_rule {
      denied_principal {
        all_principals = true
      }
      exception_principals {
        service_accounts = ["service-${var.project_number}@gs-project-accounts.iam.gserviceaccount.com"]
      }
      denied_principals {
        all_principals = ["principalSet://goog/public:allUsers"]
      }
      denial_condition {
        title       = "block-anonymous-access"
        expression  = "resource.service == 'storage.googleapis.com' &&\nresource.type == 'storage.googleapis.com/Bucket'"
      }
    }
  }
}
```

## Least Privilege Analysis Tools

### Policy Sentry
```bash
# Generate least-privilege AWS IAM policy
policy_sentry create-policy \
  --template templates/actions.yml \
  --folder output/

# From CloudTrail usage
policy_sentry create-policy \
  --access-level read \
  --service s3

# Audit existing policies
policy_sentry audit \
  --existing-policy existing.json \
  --write-service-table
```

### Cloudsploit Permissions
```bash
# Scan for over-permissive policies
cloudsploit scan \
  --config config.js \
  --compliance aws-foundations

# Check specific IAM roles
cloudsploit scan \
  --config config.js \
  --service iam
```

## CI/CD Integration

### GitHub Actions IAM Validation
```yaml
name: IAM Policy Review
on:
  pull_request:
    paths:
      - 'terraform/iam/**'
      - 'policies/**'

jobs:
  validate-iam:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Validate Terraform IAM
        run: |
          terraform fmt -check
          terraform validate
          terraform plan -out=tfplan
      
      - name: Checkov IAM scanning
        uses: bridgecrewio/checkov-action@master
        with:
          directory: terraform/iam
          framework: terraform
          skip_check: CKV_AWS_111  # Skip known false positive
      
      - name: Policy Sentry audit
        run: |
          policy_sentry audit \
            --existing-policy terraform/iam/policies/production.json \
            --output-dir audit-reports/
      
      - name: IAM Access Analyzer policy validation
        run: |
          aws accessanalyzer validate-policy \
            --policy-type IDENTITY_POLICY \
            --policy-document file://terraform/iam/policies/production.json \
            --locale EN > validation-report.json
      
      - name: Post results
        uses: actions/github-script@v6
        with:
          script: |
            const fs = require('fs');
            const report = JSON.parse(fs.readFileSync('validation-report.json'));
            if (report.findings.length > 0) {
              core.setFailed('IAM policy validation found issues');
            }
```

## Naming Conventions and Organization

```hcl
# Standard IAM policy naming
locals {
  policy_name = "${var.service}-${var.environment}-${var.permission_level}"
  # Examples:
  #   ecs-production-readonly
  #   s3-staging-write
  #   lambda-development-execute
}

# Tag standards
variable "standard_tags" {
  default = {
    ManagedBy        = "terraform"
    Environment      = var.environment
    Owner            = var.team
    CostCenter       = var.cost_center
    DataClassification = var.data_classification
    Compliance       = var.compliance_framework
  }
}
```

## Best Practices

1. **Never use managed policies in production** — create custom scoped policies
2. **Use permission boundaries** for delegated administration
3. **Always version IAM policies** in source control
4. **Scan policies in CI** with Checkov, Policy Sentry, or tfsec
5. **Simulate policies** before deployment using IAM Access Analyzer
6. **Tag all IAM resources** for tracking and cost allocation
7. **Use infrastructure as code** (Terraform, Pulumi, CloudFormation)
8. **Rotate IAM keys** with automated lambda functions
9. **Audit all IAM changes** — enable CloudTrail/IAM Access Analyzer
10. **Implement separation of duties** — separate policy writer from policy deployer
