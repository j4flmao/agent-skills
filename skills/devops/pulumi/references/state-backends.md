# Pulumi State Backends

## Overview

Pulumi tracks resource state to map infrastructure to your code. Multiple state backends are supported, each with different tradeoffs for team collaboration, security, and operational complexity.

## Backend Comparison

| Feature | Pulumi Cloud | S3 (AWS) | Azure Blob | GCS | Self-Managed |
|---------|-------------|----------|------------|-----|--------------|
| State Locking | Built-in | DynamoDB required | Lease-based | Object hold | Manual |
| Team Collaboration | Native | Manual/CI | Manual/CI | Manual/CI | Manual |
| Secrets | Built-in | KMS | Azure Key Vault | Cloud KMS | KMS |
| History | Full timeline | Via CI | Via CI | Via CI | None |
| Cost | Per-user free tier | S3 + DynamoDB | Blob storage | GCS storage | Free |
| Audit Logs | Yes | CloudTrail | Monitor | Cloud Audit | Custom |
| Policy Enforcement | Crossguard | Manual | Manual | Manual | Manual |

## Pulumi Cloud Backend

### Configuration
```yaml
# Pulumi.yaml (default: uses Pulumi Cloud)
backend:
  url: https://app.pulumi.com
```

### Stack Organization
```
my-org/
├── my-project/
│   ├── dev/          # Stack
│   ├── staging/      # Stack
│   └── prod/         # Stack
```

### Access Tokens
```bash
# Login with access token
pulumi login --access-token pul-xxxxxxxxxx

# OR login interactively
pulumi login

# Use environment variable
export PULUMI_ACCESS_TOKEN=pul-xxxxxxxxxx
```

### Features
- **State History**: Full timeline of every deployment
- **Secrets Encryption**: Automatic encryption with per-stack keys
- **RBAC**: Team, organization, and project-level permissions
- **Deployments**: Run pulumi up in the cloud (Pulumi Deployments)
- **Webhooks**: Trigger actions on stack events
- **Audit Trail**: Who did what and when

## S3 Backend (AWS)

### Configuration
```yaml
# Pulumi.yaml
backend:
  url: s3://my-pulumi-state?region=us-east-1&endpoint=https://s3.custom.com
```

### Setup with State Locking
```bash
# Create S3 bucket
aws s3 mb s3://my-pulumi-state --region us-east-1

# Enable versioning
aws s3api put-bucket-versioning \
  --bucket my-pulumi-state \
  --versioning-configuration Status=Enabled

# Enable encryption
aws s3api put-bucket-encryption \
  --bucket my-pulumi-state \
  --server-side-encryption-configuration '{
    "Rules": [{"ApplyServerSideEncryptionByDefault": {"SSEAlgorithm": "AES256"}}]
  }'

# Create DynamoDB table for state locking
aws dynamodb create-table \
  --table-name pulumi-state-lock \
  --attribute-definitions AttributeName=LockID,AttributeType=S \
  --key-schema AttributeName=LockID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST
```

### Login
```bash
# Login with default AWS credentials
pulumui login s3://my-pulumi-state

# With specific profile
AWS_PROFILE=infra-admin pulumi login s3://my-pulumi-state

# With assume role
aws sts assume-role --role-arn arn:aws:iam::123456789012:role/PulumiAdmin
export AWS_ACCESS_KEY_ID=xxx AWS_SECRET_ACCESS_KEY=xxx AWS_SESSION_TOKEN=xxx
pulumi login s3://my-pulumi-state
```

### Bucket Policy
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:*",
      "Resource": "arn:aws:s3:::my-pulumi-state/*",
      "Condition": {
        "Bool": { "aws:SecureTransport": "false" }
      }
    },
    {
      "Effect": "Deny",
      "Principal": "*",
      "Action": "s3:DeleteBucket",
      "Resource": "arn:aws:s3:::my-pulumi-state"
    }
  ]
}
```

## Azure Blob Storage Backend

### Configuration
```yaml
# Pulumi.yaml
backend:
  url: azblob://pulumi-state?storage_account=mystorageacct
```

### Setup
```bash
# Create storage account and container
az storage account create --name mystorageacct --resource-group pulumi-rg --sku Standard_GRS
az storage container create --name pulumi-state --account-name mystorageacct

# Login
pulumi login azblob://pulumi-state?storage_account=mystorageacct
```

### Authentication Methods
```bash
# 1. Azure CLI (recommended for local dev)
az login
pulumi login azblob://pulumi-state?storage_account=mystorageacct

# 2. Storage Account Key
STORAGE_KEY=$(az storage account keys list --account-name mystorageacct --query "[0].value" -o tsv)
export AZURE_STORAGE_KEY=$STORAGE_KEY

# 3. SAS Token
SAS_TOKEN=$(az storage container generate-sas --account-name mystorageacct --name pulumi-state --permissions rwdl --expiry 2025-12-31)
export AZURE_STORAGE_SAS_TOKEN=$SAS_TOKEN

# 4. Managed Identity
az vm identity assign
export AZURE_USE_MSI=true
```

## GCS Backend (Google Cloud Storage)

### Configuration
```yaml
# Pulumi.yaml
backend:
  url: gs://my-pulumi-state
```

### Setup
```bash
# Create bucket
gsutil mb gs://my-pulumi-state/

# Enable versioning
gsutil versioning set on gs://my-pulumi-state/

# Set lifecycle policy
cat <<EOF > lifecycle.json
{
  "rule": [
    { "action": { "type": "Delete" }, "condition": { "age": 365 } }
  ]
}
EOF
gsutil lifecycle set lifecycle.json gs://my-pulumi-state/

# Login
pulumi login gs://my-pulumi-state
```

### IAM Permissions
```
Storage Object Admin (roles/storage.objectAdmin)
  → Get, List, Create, Delete objects in the state bucket
```

## Self-Managed Backend (Local)

### Configuration
```yaml
# Pulumi.yaml
backend:
  url: file://./.pulumi-state
```

### Usage
```bash
pulumi login --local

# Stacks stored in:
# .pulumi/stacks/<project>/<stack>.json
```

### When to Use Self-Managed
- Personal development environments
- CI/CD ephemeral environments
- Evaluation and proof-of-concept work
- Offline development

## Stack References

Stack references allow reading outputs from one stack in another, even across backends.

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Reference another stack
const infraRef = new pulumi.StackReference("organization/infrastructure/prod");

// Get VPC ID from infra stack
const vpcId = infraRef.requireOutput("vpcId");

// Get subnet IDs
const privateSubnetIds = infraRef.requireOutput("privateSubnetIds");

// Use in resource creation
const rds = new aws.rds.Instance("app-db", {
  dbSubnetGroupName: new aws.rds.SubnetGroup("db-subnets", {
    subnetIds: privateSubnetIds,
  }).name,
  vpcSecurityGroupIds: [sgId],
});
```

### Cross-Backend Stack References
```bash
# Stack reference format for different backends
# Same Pulumi Cloud organization:
pulumi.StackReference("org/project/stack")

# Different Pulumi Cloud org:
pulumi.StackReference("other-org/project/stack")

# With local/file backend:
# Not directly supported — use CI to export and share
```

## State Migration

### Migrate from Local to Pulumi Cloud
```bash
# 1. Login to target backend
pulumi login

# 2. Migrate all stacks (script)
for stack in $(pulumi stack ls --json | jq -r '.[].name'); do
  pulumi stack select $stack
  pulumi stack export --file stack.json
  pulumi stack import --file stack.json
done
```

### Migrate Between Backends
```bash
# Export current state
pulumi stack export --stack dev > dev-state.json

# Login to new backend
pulumi login s3://new-pulumi-state

# Select a new stack (create if needed)
pulumi stack init dev

# Import state to new backend
pulumi stack import --stack dev --file dev-state.json

# Verify
pulumi stack --stack dev
```

## Best Practices

### Backend Selection by Team Size
- **Solo developers**: Self-managed (local) or Pulumi Cloud free tier
- **Small team (2-10)**: Pulumi Cloud or S3 with DynamoDB locking
- **Growing team (10-50)**: Pulumi Cloud (team tier) for audit trail
- **Enterprise (50+)**: Pulumi Cloud Enterprise for RBAC, SAML/SSO, policy

### Security
1. Always enable encryption at rest for S3, Blob, GCS backends.
2. Use short-lived credentials (STS, SAS tokens) for CI/CD access.
3. Restrict state bucket access to the smallest IAM role possible.
4. Enable bucket versioning to recover from accidental state deletion.
5. Never store state on ephemeral CI runners without push to remote.

### CI/CD Integration
```yaml
# GitHub Actions with S3 backend
- name: Configure Pulumi
  run: |
    pulumi login s3://my-pulumi-state
    pulumi stack select ${{ env.PULUMI_STACK }}
  env:
    AWS_ACCESS_KEY_ID: ${{ secrets.AWS_ACCESS_KEY_ID }}
    AWS_SECRET_ACCESS_KEY: ${{ secrets.AWS_SECRET_ACCESS_KEY }}

# GitLab CI with Pulumi Cloud
pulumi:
  script:
    - pulumi login --access-token $PULUMI_ACCESS_TOKEN
    - pulumi stack select $PULUMI_STACK
    - pulumi up --yes
```
