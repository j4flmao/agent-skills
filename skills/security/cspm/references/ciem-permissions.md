# CIEM — Cloud Infrastructure Entitlement Management

## Overview

CIEM focuses on managing and securing cloud identities and their permissions. It discovers over-privileged roles, unused permissions, privilege escalation paths, and provides recommendations for right-sizing IAM policies.

## Permission Analysis

### AWS IAM — Finding Over-Privileged Roles
```json
{
  "RoleName": "developer-role",
  "PermissionsBoundary": null,
  "AttachedPolicies": ["arn:aws:iam::aws:policy/AdministratorAccess"],
  "ServicesAccessed": ["S3", "EC2", "Lambda", "DynamoDB"],
  "ServicesUsed": ["S3", "EC2"],
  "UnusedServices": ["Lambda", "DynamoDB"],
  "PrivilegeLevel": "CRITICAL_OVER_PRIVILEGED",
  "Recommendation": "Replace AdministratorAccess with scoped policies"
}

{
  "RoleName": "ci-deploy-role",
  "PermissionsBoundary": "arn:aws:iam::123456789012:policy/DeployBoundary",
  "EffectivePermissions": {
    "s3:PutObject": "specific_bucket/*",
    "ecs:UpdateService": "specific_cluster",
    "iam:PassRole": "specific_deploy_role"
  },
  "UsedPermissions": {
    "last_90_days": ["s3:PutObject", "ecs:UpdateService"],
    "unused_last_90_days": ["iam:PassRole"],
    "recommendation": "Remove iam:PassRole if not needed"
  }
}
```

### IAM Access Analyzer Findings
```python
import boto3

access_analyzer = boto3.client('accessanalyzer')

def analyze_permissions(account_id):
    findings = access_analyzer.list_findings(
        analyzerArn=f'arn:aws:access-analyzer:{region}:{account_id}:analyzer/root',
        sort={'attributeName': 'updatedAt', 'orderBy': 'DESC'}
    )
    
    active_findings = [
        f for f in findings['findings'] 
        if f['status'] == 'ACTIVE'
    ]
    
    over_privileged = []
    for finding in active_findings:
        if finding['resourceType'] == 'AWS::IAM::Role':
            analysis = analyze_principal_usage(finding['resource'])
            if analysis['unused_actions']:
                over_privileged.append({
                    'role': finding['resource'],
                    'unused': analysis['unused_actions'],
                    'recommendation': analysis['recommended_policy']
                })
    
    return over_privileged

def analyze_principal_usage(role_arn):
    # Query AWS CloudTrail for last 90 days of actions
    trail = boto3.client('cloudtrail')
    events = trail.lookup_events(
        LookupAttributes=[
            {'AttributeKey': 'ResourceName', 'AttributeValue': role_arn}
        ],
        StartTime=datetime(2026, 2, 24),
        EndTime=datetime(2026, 5, 24)
    )
    
    used_actions = set()
    for event in events['Events']:
        used_actions.add(event.get('EventName'))
    
    # Compare with allowed actions
    iam = boto3.client('iam')
    attached_policies = iam.list_attached_role_policies(RoleName=role_arn.split('/')[-1])
    allowed_actions = get_allowed_actions(attached_policies)
    
    unused = allowed_actions - used_actions
    return {
        'unused_actions': list(unused),
        'used_actions': list(used_actions),
        'recommended_policy': generate_minimal_policy(used_actions)
    }
```

## Unused Permissions Identification

### Azure AD — Entra ID Permissions
```powershell
# Discover unused Azure AD roles
$roles = Get-AzureADDirectoryRole
foreach ($role in $roles) {
    $members = Get-AzureADDirectoryRoleMember -ObjectId $role.ObjectId
    $audit = Get-AzureADAuditDirectoryLogs `
        -Filter "activityDisplayName eq 'Add member to role'" `
        -Top 1000
    
    $roleUsage = @{
        Role = $role.DisplayName
        Members = $members.Count
        LastUsed = $audit.CreatedDateTime | Sort-Object -Descending | Select-Object -First 1
        DaysSinceLastUse = (Get-Date) - $lastUsed
    }
    
    if ($roleUsage.DaysSinceLastUse -gt 90) {
        Write-Warning "Stale privileged role assignment: $($role.DisplayName)"
    }
}
```

### GCP IAM Recommender
```bash
# List IAM recommendations
gcloud recommender recommendations list \
  --project=my-project \
  --location=global \
  --recommender=google.iam.policy.Recommender \
  --format="json"

# Apply IAM recommendation
gcloud recommender recommendations mark-claimed \
  RECOMMENDATION_ID \
  --project=my-project \
  --location=global \
  --recommender=google.iam.policy.Recommender

# Check unused permissions for a service account
gcloud iam service-accounts get-iam-policy \
  my-sa@my-project.iam.gserviceaccount.com \
  --format="json" | jq '.bindings[] | select(.members[] | contains("user:"))'
```

## Privilege Escalation Paths

### AWS Privilege Escalation Vectors
```json
{
  "iam:PassRole": {
    "risk": "HIGH",
    "description": "Passing a role with broader permissions to an EC2 instance or Lambda",
    "example": "Attach a role with S3 full access to a Lambda function, then exfiltrate data",
    "mitigation": "Restrict iam:PassRole to specific roles with permission boundaries"
  },
  "iam:CreatePolicyVersion": {
    "risk": "CRITICAL",
    "description": "Set a new default policy version to grant additional permissions",
    "example": "Create a policy version with full access, set as default, use the new permissions",
    "mitigation": "Use permission boundaries and monitor policy version changes"
  },
  "iam:SetDefaultPolicyVersion": {
    "risk": "CRITICAL",
    "description": "Change a policy to a version with broader permissions",
    "example": "Revert to an old version with AdministratorAccess",
    "mitigation": "Delete older, more permissive policy versions"
  },
  "lambda:UpdateFunctionCode": {
    "risk": "HIGH",
    "description": "Modify Lambda code executed under a different IAM role",
    "example": "Upload malicious Lambda code that uses the attached IAM role's permissions",
    "mitigation": "Restrict Lambda update permissions to specific functions"
  },
  "ec2:RunInstances + iam:PassRole": {
    "risk": "CRITICAL",
    "description": "Launch EC2 with a privileged role and access instance metadata",
    "example": "Launch instance with admin role, curl 169.254.169.254/latest/meta-data/iam/security-credentials/",
    "mitigation": "Use IMDSv2, restrict iam:PassRole"
  }
}
```

### Azure Privilege Escalation Vectors
```json
{
  "Microsoft.Authorization/roleAssignments/write": {
    "risk": "CRITICAL",
    "description": "Assign privileged role to your account or a managed identity",
    "example": "Assign Owner role to your user on a subscription",
    "mitigation": "Use Privileged Identity Management (PIM) for role assignments"
  },
  "Microsoft.ManagedIdentity/userAssignedIdentities/assign/action": {
    "risk": "HIGH",
    "description": "Assign a managed identity with privileged permissions to a resource you control",
    "example": "Assign an identity with Key Vault access to a compromised VM",
    "mitigation": "Restrict identity assignment at management group level"
  }
}
```

## Right-Sizing Permissions

### Policy Generation from Usage
```python
def generate_minimal_policy(actions, resources):
    """Generate least-privilege policy based on actual usage"""
    service_actions = {}
    
    for action in actions:
        service = action.split(':')[0]
        if service not in service_actions:
            service_actions[service] = []
        service_actions[service].append(action)
    
    statements = []
    for service, s_actions in service_actions.items():
        # Group similar actions into wildcard patterns
        if len(s_actions) > 5:
            # Get all actions for this service and restrict
            wildcard_actions = [
                f"{service}:{a.split(':')[1].split()[0]}*"
                for a in s_actions
                if len(a.split(':')[1]) > 3
            ]
            statements.append({
                "Effect": "Allow",
                "Action": list(set(wildcard_actions)),
                "Resource": resources if resources else ["*"]
            })
        else:
            statements.append({
                "Effect": "Allow",
                "Action": s_actions,
                "Resource": resources if resources else ["*"]
            })
    
    return {"Version": "2012-10-17", "Statement": statements}
```

## CIEM Tools Comparison

| Feature | AWS IAM Access Analyzer | Azure AD PIM | GCP IAM Recommender | Third-party (Wiz, Prisma) |
|---------|------------------------|-------------|---------------------|--------------------------|
| Unused permissions | Yes | Yes | Yes | Yes |
| Privilege escalation paths | Limited | No | No | Yes |
| Permission right-sizing | Recommendations | PIM roles | Recommendations | Full |
| Cross-cloud view | AWS only | Azure only | GCP only | Multi-cloud |
| Historical analysis | 90 days | 30 days | 90 days | Custom |
| Automated remediation | Manual | PIM activation | Manual | Auto-remediate |
| Anomaly detection | No | Risky sign-ins | No | ML-based |
| Report export | CSV/JSON | CSV | CSV/JSON | PDF/CSV/API |

## CIEM Implementation Workflow

1. **Discovery** — Inventory all principals (users, roles, service accounts, managed identities)
2. **Usage analysis** — Analyze CloudTrail/LAD/GCP Audit Logs for 90+ days
3. **Finding classification** — Categorize by unused actions, over-privileged, escalation risk
4. **Risk scoring** — Score each finding by blast radius + likelihood
5. **Remediation planning** — Generate least-privilege policies, schedule changes
6. **Approval workflow** — Auto-ticket for high-risk changes, notify owners
7. **Implementation** — Apply permission boundaries, reduce policies, remove unused roles
8. **Verification** — Run policy simulation to verify no breakage
9. **Continuous monitoring** — Recurring scans with automated CIEM reporting
