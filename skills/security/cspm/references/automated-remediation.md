# Automated Remediation for CSPM

## Overview

Automated remediation enables immediate corrective action when cloud resources deviate from security policies. This reduces MTTR from days to minutes for known misconfigurations.

## AWS Config Auto-Remediation

### AWS Config Rules with Auto-Remediation
```yaml
# CloudFormation — S3 public read remediation
ConfigRemediationS3PublicRead:
  Type: AWS::Config::RemediationConfiguration
  Properties:
    ConfigRuleName: s3-bucket-public-read-prohibited
    TargetType: SSM_DOCUMENT
    TargetId: AWS-DisableS3BucketPublicRead
    Parameters:
      AutomationAssumeRole:
        ResourceValue:
          Value: RESOURCE_ID
    Automatic: true
    MaximumAutomaticAttempts: 5
    RetryAttemptSeconds: 60
```

### Custom SSM Automation Document
```yaml
# SSM Automation — Enforce S3 bucket encryption
schemaVersion: "0.3"
description: "Enable S3 bucket default encryption"
assumeRole: "arn:aws:iam::{{AutomationAssumeRole}}:role/RemediationRole"
mainSteps:
  - name: GetBucketName
    action: "aws:executeScript"
    inputs:
      InputPayload:
        BucketName: "{{BucketName}}"
      Script: |
        import json
        def handler(event, context):
            return {"BucketName": event["Payload"]["BucketName"]}
    outputs:
      - Name: BucketName
        Selector: "$.Payload.BucketName"
        Type: String

  - name: EnableEncryption
    action: "aws:executeAwsApi"
    inputs:
      Service: s3
      Api: PutBucketEncryption
      Bucket: "{{GetBucketName.BucketName}}"
      ServerSideEncryptionConfiguration:
        Rules:
          - ApplyServerSideEncryptionByDefault:
              SSEAlgorithm: AES256
    isEnd: true
```

### EventBridge → Lambda Remediation
```json
{
  "detail-type": ["Config Configuration History"],
  "source": ["aws.config"],
  "detail": {
    "configRuleName": ["s3-bucket-public-read-prohibited"],
    "newEvaluationResult": {
      "complianceType": ["NON_COMPLIANT"]
    }
  }
}
```

**Lambda function:**
```python
import boto3
import json

s3 = boto3.client('s3')

def lambda_handler(event, context):
    # Extract resource ID from Config event
    resource_id = event['detail']['resourceId']
    
    # Block all public access
    s3.put_public_access_block(
        Bucket=resource_id,
        PublicAccessBlockConfiguration={
            'BlockPublicAcls': True,
            'IgnorePublicAcls': True,
            'BlockPublicPolicy': True,
            'RestrictPublicBuckets': True
        }
    )
    
    # Remove any bucket policies allowing public access
    try:
        current_policy = s3.get_bucket_policy(Bucket=resource_id)
        # Parse and remove public statements
        policy = json.loads(current_policy['Policy'])
        policy['Statement'] = [
            s for s in policy['Statement']
            if not is_public_statement(s)
        ]
        s3.put_bucket_policy(
            Bucket=resource_id,
            Policy=json.dumps(policy)
        )
    except:
        pass  # No policy to update
    
    # Log remediation action
    print(f"Remediated S3 bucket {resource_id}: public access blocked")
    return {'statusCode': 200, 'body': f'Remediated {resource_id}'}

def is_public_statement(statement):
    principal = statement.get('Principal', {})
    if principal == '*' or principal.get('AWS') == '*':
        return True
    if 'Condition' not in statement:
        return True
    return False
```

## Azure Policy Auto-Remediation

### Built-in Policy Definitions
```json
{
  "properties": {
    "displayName": "Audit VMs that do not use managed disks",
    "policyType": "BuiltIn",
    "mode": "All",
    "parameters": {
      "effect": {
        "type": "String",
        "defaultValue": "Audit"
      }
    },
    "policyRule": {
      "if": {
        "field": "type",
        "equals": "Microsoft.Compute/virtualMachines"
      },
      "then": {
        "effect": "[parameters('effect')]"
      }
    }
  }
}
```

### Remediation Task Configuration
```powershell
# Create remediation task for non-compliant resources
$policy = Get-AzPolicyAssignment -Name "require-sql-encryption"

Start-AzPolicyRemediation `
  -Name "sql-encryption-remediation-2026-05" `
  -PolicyAssignmentId $policy.PolicyAssignmentId `
  -ResourceDiscoveryMode "ReEvaluateCompliance"
```

### Custom Azure Policy with DeployIfNotExists
```json
{
  "properties": {
    "displayName": "Deploy NSG flow logs to storage",
    "mode": "Indexed",
    "policyRule": {
      "if": {
        "field": "type",
        "equals": "Microsoft.Network/networkSecurityGroups"
      },
      "then": {
        "effect": "DeployIfNotExists",
        "details": {
          "type": "Microsoft.Network/networkWatchers/flowLogs",
          "existenceCondition": {
            "field": "Microsoft.Network/networkWatchers/flowLogs/targetResourceId",
            "equals": "[field('id')]"
          },
          "deployment": {
            "properties": {
              "mode": "incremental",
              "template": {
                "$schema": "https://schema.management.azure.com/schemas/2019-04-01/deploymentTemplate.json#",
                "contentVersion": "1.0.0.0",
                "parameters": {
                  "nsgId": { "type": "string" }
                },
                "resources": [
                  {
                    "type": "Microsoft.Network/networkWatchers/flowLogs",
                    "name": "[concat('NetworkWatcher_eastus/flowlog-', last(split(parameters('nsgId'),'/')))]",
                    "location": "[resourceGroup().location]",
                    "properties": {
                      "targetResourceId": "[parameters('nsgId')]",
                      "enabled": true,
                      "retentionPolicy": { "days": 90, "enabled": true },
                      "storageId": "[resourceId('Microsoft.Storage/storageAccounts', 'flowlogsstorage')]"
                    }
                  }
                ]
              }
            }
          }
        }
      }
    }
  }
}
```

## GCP Org Policies

### Organization Policy Constraints
```yaml
# Restrict VM external IPs
constraints:
  - constraint: "compute.vmExternalIpAccess"
    listPolicy:
      allValues: DENY
    - constraint: "storage.uniformBucketLevelAccess"
    booleanPolicy:
      enforced: true
    - constraint: "iam.disableServiceAccountKeyUpload"
      booleanPolicy:
        enforced: true
```

### GCP Policy Controller (Gatekeeper/OPA)
```yaml
# OPA constraint — enforce bucket labels
apiVersion: constraints.gatekeeper.sh/v1beta1
kind: GCPStorageBucketLabelsConstraint
metadata:
  name: require-bucket-labels
spec:
  match:
    kinds:
      - apiGroups: ["storage.cnrm.cloud.google.com"]
        kinds: ["StorageBucket"]
  parameters:
    required_labels:
      - environment
      - data_classification
      - owner
---
# Constraint template
apiVersion: templates.gatekeeper.sh/v1beta1
kind: ConstraintTemplate
metadata:
  name: gcpstoragebucketlabelsconstraint
spec:
  crd:
    spec:
      names:
        kind: GCPStorageBucketLabelsConstraint
  targets:
    - target: admission.k8s.gatekeeper.sh
      rego: |
        package storage
        violation[{"msg": msg}] {
          bucket := input.review.object
          required_label := input.parameters.required_labels[_]
          not bucket.spec.labels[required_label]
          msg := sprintf("Bucket %v missing required label: %v", [bucket.name, required_label])
        }
```

## Event-Driven Remediation Architecture

### Multi-Cloud Remediation Framework
```yaml
remediation_framework:
  triggers:
    - source: aws_config
      target: aws_lambda
    - source: azure_policy
      target: azure_automation
    - source: gcp_scc
      target: gcp_cloud_function
    - source: wiz_webhook
      target: generic_webhook
    - source: prisma_cloud
      target: generic_webhook

  remediation_types:
    immediate:
      - s3_public_block
      - security_group_restrict
      - disable_public_rdp_ssh
      - enable_encryption
      - remove_unused_roles
      - rotate_keys
    approval_required:
      - delete_resource
      - modify_iam_policy
      - change_network_architecture
    notification:
      - log_only
      - create_ticket
      - alert_team

  approval_workflow:
    auto_remediate:
      - severity: CRITICAL
        action: immediate
        notify: [slack, pagerduty]
    require_ticket:
      - severity: HIGH
        action: create_ticket
        auto_fix_after: 24h
        if_no_response: auto_fix
    manual:
      - severity: MEDIUM
      - severity: LOW
```

### Slack Notification for Remediation
```json
{
  "blocks": [
    {
      "type": "header",
      "text": {"type": "plain_text", "text": "🚨 Auto-Remediation Triggered"}
    },
    {
      "type": "section",
      "fields": [
        {"type": "mrkdwn", "text": "*Resource:*\nmy-public-bucket"},
        {"type": "mrkdwn", "text": "*Type:*\nAWS::S3::Bucket"},
        {"type": "mrkdwn", "text": "*Finding:*\nPublic read access enabled"},
        {"type": "mrkdwn", "text": "*Action:*\nBlocked public access"},
        {"type": "mrkdwn", "text": "*Status:*\n✅ Remediated"}
      ]
    }
  ]
}
```

## Best Practices

1. **Start with log-only mode** for 30 days before enabling auto-remediation
2. **Tag resources** to exclude certain resources from auto-remediation (e.g., `auto-remediate: false`)
3. **Set remediation timeouts** — kill runaway remediations after 30 seconds
4. **Audit trail** — every auto-remediation must be logged to SIEM
5. **Rollback capability** — maintain previous state for rollback
6. **Rate limit** — max N remediations per hour to avoid API throttling
7. **Exception process** — documented exception approvals for bypassing remediation
8. **Test in non-production** first before enabling in production accounts
