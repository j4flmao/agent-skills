# CSPM Platforms

## Platform Comparison

### Wiz
Wiz is a cloud-native CSPM platform that performs agentless scanning via cloud APIs.

**Key Capabilities:**
- **CNAPP** — Unified CSPM + CWPP + CIEM + vulnerability management
- **Agentless scanning** — Leverages cloud APIs, no agents required
- **Graph-based analysis** — Maps all cloud resources and their relationships
- **Toxic combination detection** — Finds risk chains that combine low-severity issues into critical attack paths

**Deployment:**
```yaml
# Wiz connector onboarding (Terraform)
module "wiz-connector" {
  source = "wiz.io/cloud-connector/aws"
  version = "1.2.0"

  name            = "production-connector"
  external_id     = "wiz-external-id-prod"
  role_name       = "WizReadOnlyRole"
  scan_containers = true
  scan_vms        = true
  scan_serverless = true
  regions         = ["us-east-1", "us-west-2", "eu-west-1"]
}

# Wiz K8s cluster connector
module "wiz-k8s-connector" {
  source = "wiz.io/k8s-connector/helm"
  version = "1.0.0"
  cluster_name = "production-eks"
  wiz_api_url  = "https://api.us3.wiz.io"
}
```

**Wiz Security Graph Query:**
```graphql
{
  cloudAccount(id: "123456789012") {
    issues(filter: {severity: [CRITICAL, HIGH], status: OPEN}) {
      nodes {
        id
        severity
        name
        platform
        createdAt
        resource {
          id
          name
          type
          cloudPlatform
          tags {
            key
            value
          }
        }
        remediation
      }
    }
  }
}
```

### Prisma Cloud (Palo Alto Networks)
Comprehensive CNAPP with deep compliance coverage.

**Key Capabilities:**
- Real-time visibility across multi-cloud environments
- 800+ out-of-box compliance policies
- Serverless vulnerability scanning
- Host vulnerability management with Twistlock
- Network security visualization

**Policy Configuration:**
```json
{
  "policy": {
    "name": "AWS S3 Public Read Access",
    "policyType": "config",
    "severity": "high",
    "rule": {
      "name": "S3 bucket publicly readable",
      "criteria": {
        "resourceType": "aws_s3_bucket",
        "field": "acl.publicRead",
        "value": true
      }
    },
    "remediation": {
      "cliScript": "aws s3api put-bucket-acl --bucket {{BUCKET_NAME}} --acl private",
      "description": "Update bucket ACL to private"
    },
    "complianceStandard": ["CIS AWS Benchmark v1.5", "SOC 2"]
  }
}
```

### AWS Security Hub
Native AWS CSPM aggregating findings from GuardDuty, Inspector, Config, and IAM Access Analyzer.

**Multi-Account Architecture:**
```yaml
# AWS Organizations — Security Hub delegated admin
Resources:
  SecurityHubAdmin:
    Type: AWS::SecurityHub::Hub
    Properties:
      Tags:
        Environment: security
        Automation: cspm

  SecurityHubMember:
    Type: AWS::SecurityHub::Member
    Properties:
      AccountId: "111111111111"
      Email: "security-team@example.com"

# Enable standards across organization
  SecurityHubStandard:
    Type: AWS::SecurityHub::Standard
    Properties:
      StandardsArn: "arn:aws:securityhub:::ruleset/cis-aws-foundations-benchmark/v/1.4.0"
      StandardsSubscriptionRequest:
        StandardsArn: "arn:aws:securityhub:us-east-1::standards/cis-aws-foundations-benchmark/v/1.4.0"
```

**Custom Insight:**
```json
{
  "Name": "Critical S3 exposures",
  "Filters": {
    "SeverityLabel": [{"Value": "CRITICAL", "Comparison": "EQUALS"}],
    "ResourceType": [{"Value": "AwsS3Bucket", "Comparison": "EQUALS"}],
    "WorkflowStatus": [{"Value": "NEW", "Comparison": "EQUALS"}]
  },
  "GroupByAttribute": "ResourceId"
}
```

### Azure Security Center (Defender for Cloud)
Native Azure CSPM with Microsoft Defender plans.

**Policy Initiatives:**
```json
{
  "properties": {
    "displayName": "CIS Microsoft Azure Foundations Benchmark v2.0",
    "policyType": "BuiltIn",
    "metadata": {
      "category": "Regulatory Compliance",
      "version": "2.0"
    },
    "parameters": {}
  }
}
```

**Defender Plans:**
```powershell
# Enable Defender plans via PowerShell
Set-AzSecurityPricing -Name "VirtualMachines" -PricingTier "Standard"
Set-AzSecurityPricing -Name "SqlServers" -PricingTier "Standard"
Set-AzSecurityPricing -Name "AppServices" -PricingTier "Standard"
Set-AzSecurityPricing -Name "StorageAccounts" -PricingTier "Standard"
Set-AzSecurityPricing -Name "KeyVaults" -PricingTier "Standard"
```

### GCP Security Command Center (SCC)
Native GCP security and risk management platform.

**Organization Policy:**
```bash
# Enable SCC at org level
gcloud services enable securitycenter.googleapis.com \
  --organization=123456789

# Set up service accounts for automated scanning
gcloud scc settings service-accounts enable \
  --organization=123456789

# Create custom module
gcloud scc custom-modules create \
  --organization=123456789 \
  --display-name="Public Bucket Detection" \
  --enablement-state=ENABLED \
  --custom-config=config.yaml
```

**Config YAML:**
```yaml
# config.yaml for custom module
custom_config:
  predicate: "resource.iamPolicy.bindings.exists(b, b.role == 'roles/storage.objectViewer' && b.members.exists(m, m.startsWith('allUsers')))"
  resource_selector:
    resource_types:
      - "storage.googleapis.com/Bucket"
  severity: HIGH
  description: "Detect publicly accessible GCS buckets"
  recommendation: "Remove allUsers from bucket IAM"
```

### Orca Security
Agentless, side-scanning CSPM with risk prioritization.

**Key Differentiators:**
- SideScanning technology — Reads block storage snapshots, no agents
- Context-aware risk prioritization with attack path analysis
- 100% coverage across all cloud resources
- Alert fatigue reduction with grouped findings

### Lacework
Polygraph-based CSPM with behavioral ML detection.

**Key Differentiators:**
- Polygraph data platform — Graphs all cloud interactions
- Behavioral baselines — ML-learned normal behavior
- Container and Kubernetes security
- Compliance reporting for SOC 2, PCI DSS, ISO 27001

## Selection Criteria

| Criteria | Wiz | Prisma Cloud | Security Hub | Azure SC | GCP SCC | Orca | Lacework |
|----------|-----|-------------|-------------|----------|---------|------|----------|
| Multi-cloud | AWS/Azure/GCP/K8s | AWS/Azure/GCP/K8s | AWS | Azure | GCP | AWS/Azure/GCP | AWS/Azure/GCP |
| Agentless | API-based | API-based | Native | Native | Native | SideScan | Agent |
| Vulnerability mgmt | Yes | Yes | Via Inspector | Yes | Yes | Yes | Yes |
| CIEM | Yes | Yes | Via Access Analyzer | Limited | Limited | Yes | Yes |
| K8s security | Yes | Yes | Limited | Yes | Yes | Yes | Yes |
| Compliance frameworks | 20+ | 30+ | 10+ | 15+ | 10+ | 15+ | 20+ |
| Attack path analysis | Yes | Yes | No | Limited | No | Yes | Partial |
| IaC scanning | Yes | Yes | No | No | No | Yes | Yes |
