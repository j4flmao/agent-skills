---
name: devops-pulumi
description: >
  Pulumi Infrastructure as Code using real programming languages (TypeScript, Python, Go, C#).
  Covers: Pulumi CLI, stack management, state backends, AWS/Azure/GCP providers, Kubernetes provider,
  component resources, Automation API, secrets, policy as code, migration from Terraform.
  Do NOT use for: Terraform, CloudFormation, or other IaC tools not using Pulumi.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, pulumi, iac, infrastructure, phase-5]
---

# Pulumi IaC

## Purpose
Provision, manage, and version cloud infrastructure using Pulumi's programming language approach, enabling real code constructs (loops, conditionals, functions, classes) for infrastructure definition.

## Agent Protocol

### Trigger
Exact user phrases: "Pulumi", "IaC", "infrastructure as code", "Pulumi stack", "Pulumi AWS", "Pulumi Kubernetes", "Automation API", "component resource", "Pulumi state", "Pulumi migrate".

### Input Context
Before activating, verify:
- Target cloud provider (AWS, Azure, GCP, Kubernetes) and region.
- Programming language preference (TypeScript, Python, Go, C#).
- Current state backend (Pulumi Cloud, S3, Azure Blob, GCS).
- Whether migrating from Terraform or creating new infrastructure.

### Output Artifact
Writes to `index.ts`, `__main__.py`, `main.go`, `Pulumi.yaml`, `Pulumi.{stack}.yaml`, and component resource classes.

### Response Format
Code files with Pulumi SDK imports, resource definitions, and stack configurations.

### Completion Criteria
This skill is complete when:
- [ ] Pulumi project initialized with `pulumi new`.
- [ ] Core infrastructure resources defined with proper typing.
- [ ] Stack configurations for all environments (dev, staging, prod).
- [ ] State backend configured and validated.
- [ ] `pulumi up` previews without errors.

### Max Response Length
Direct file write. No response text.

## Quick Start
`pulumi new aws-typescript` → Define VPC, subnets, security groups as classes → Configure dev/prod stacks via `Pulumi.{stack}.yaml` → `pulumi up` → Add component resources for reuse → Wire Automation API for self-service.

## Decision Tree: Pulumi vs Terraform
- Starting fresh with IaC → Pulumi (if team knows TypeScript/Python/Go) or Terraform (if team knows HCL)
- Need loops, conditionals, functions → Pulumi (real programming language)
- Existing Terraform codebase → Terraform (migration is costly but possible with tf2pulumi)
- Self-service platform for dev teams → Pulumi Automation API
- Multi-cloud with same abstractions → Pulumi (component resources abstract cloud specifics)
- Policy enforcement on IaC → Both: Pulumi CrossGuard or Terraform Sentinel/OPA
- Kubernetes-native IaC → Pulumi (Kubernetes provider with CRDs, Helm charts native)

## Core Workflow

### Step 1: Initialize Project
```bash
pulumi new aws-typescript --name my-infra --stack dev
```

### Step 2: Define Infrastructure with TypeScript
```typescript
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const vpcCidr = config.get("vpcCidr") || "10.0.0.0/16";
const environment = config.require("environment");

const vpc = new aws.ec2.Vpc("main", {
  cidrBlock: vpcCidr,
  enableDnsHostnames: true,
  enableDnsSupport: true,
  tags: { Name: "main", Environment: environment },
});

const subnets = config.requireObject<string[]>("availabilityZones").map((az, i) =>
  new aws.ec2.Subnet(`public-${i}`, {
    vpcId: vpc.id,
    cidrBlock: `10.0.${i}.0/24`,
    availabilityZone: az,
    mapPublicIpOnLaunch: true,
    tags: { Name: `public-${i}`, Environment: environment },
  })
);
```

### Step 3: Stack Configuration
```yaml
# Pulumi.prod.yaml
config:
  aws:region: us-east-1
  my-infra:vpcCidr: 10.0.0.0/16
  my-infra:instanceType: t3.large
  my-infra:environment: production
  my-infra:availabilityZones:
  - us-east-1a
  - us-east-1b
  - us-east-1c
  my-infra:dbPassword:
    secure: AAABAA...encrypted...
```

### Step 4: Component Resources
```typescript
export interface VpcStackArgs {
  cidrBlock: string;
  azs: string[];
  environment: string;
  tags?: Record<string, string>;
}

export class VpcStack extends pulumi.ComponentResource {
  public readonly vpc: aws.ec2.Vpc;
  public readonly publicSubnets: aws.ec2.Subnet[];
  public readonly privateSubnets: aws.ec2.Subnet[];

  constructor(name: string, args: VpcStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super("my:infra:VpcStack", name, args, opts);
    const tags = { ...args.tags, Environment: args.environment };

    this.vpc = new aws.ec2.Vpc(`${name}-vpc`, {
      cidrBlock: args.cidrBlock,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      tags: { ...tags, Name: `${name}-vpc` },
    }, { parent: this });

    this.publicSubnets = args.azs.map((az, i) =>
      new aws.ec2.Subnet(`${name}-public-${i}`, {
        vpcId: this.vpc.id,
        cidrBlock: incrementCidr(args.cidrBlock, i),
        availabilityZone: az,
        mapPublicIpOnLaunch: true,
        tags: { ...tags, Name: `${name}-public-${i}`, Type: "public" },
      }, { parent: this })
    );

    this.privateSubnets = args.azs.map((az, i) =>
      new aws.ec2.Subnet(`${name}-private-${i}`, {
        vpcId: this.vpc.id,
        cidrBlock: incrementCidr(args.cidrBlock, i + 100),
        availabilityZone: az,
        tags: { ...tags, Name: `${name}-private-${i}`, Type: "private" },
      }, { parent: this })
    );

    this.registerOutputs({
      vpcId: this.vpc.id,
      publicSubnetIds: this.publicSubnets.map(s => s.id),
      privateSubnetIds: this.privateSubnets.map(s => s.id),
    });
  }
}
```

### Step 5: Cross-Cloud Example (Python)
```python
import pulumi
import pulumi_aws as aws
import pulumi_gcp as gcp
import pulumi_azure as azure

config = pulumi.Config()
environment = config.require("cloud")

if environment == "aws":
    bucket = aws.s3.Bucket("data-lake",
        acl="private",
        versioning=aws.s3.BucketVersioningArgs(enabled=True),
        server_side_encryption_configuration=aws.s3.BucketServerSideEncryptionConfigurationArgs(
            rule=aws.s3.BucketServerSideEncryptionConfigurationRuleArgs(
                apply_server_side_encryption_by_default=aws.s3.BucketServerSideEncryptionConfigurationRuleApplyServerSideEncryptionByDefaultArgs(
                    sse_algorithm="AES256"
                )
            )
        ))
elif environment == "gcp":
    bucket = gcp.storage.Bucket("data-lake",
        location="US",
        uniform_bucket_level_access=True,
        versioning=gcp.storage.BucketVersioningArgs(enabled=True))
elif environment == "azure":
    bucket = azure.storage.StorageAccount("datalake",
        resource_group_name="rg-data",
        account_tier="Standard",
        account_replication_type="GRS")
```

### Step 6: Kubernetes Provider with Helm and CRDs
```typescript
import * as k8s from "@pulumi/kubernetes";
import * as helm from "@pulumi/kubernetes/helm";
import * as pulumi from "@pulumi/pulumi";

const k8sProvider = new k8s.Provider("k8s", {
  kubeconfig: config.require("kubeconfig"),
  enableServerSideApply: true,
});

const namespace = new k8s.core.v1.Namespace("app", {}, { provider: k8sProvider });

// Helm chart
const nginx = new helm.v3.Chart("nginx-ingress", {
  chart: "ingress-nginx",
  version: "4.10.0",
  fetchOpts: { repo: "https://kubernetes.github.io/ingress-nginx" },
  namespace: namespace.metadata.name,
  values: {
    controller: {
      service: { type: "LoadBalancer" },
      resources: {
        requests: { cpu: "100m", memory: "256Mi" },
        limits: { cpu: "500m", memory: "512Mi" },
      },
    },
  },
}, { provider: k8sProvider });

// CRD custom resource
const certManagerNamespace = new k8s.core.v1.Namespace("cert-manager", {}, { provider: k8sProvider });
const certManager = new k8s.apiextensions.CustomResource("cluster-issuer", {
  apiVersion: "cert-manager.io/v1",
  kind: "ClusterIssuer",
  metadata: { name: "letsencrypt-prod" },
  spec: {
    acme: {
      server: "https://acme-v02.api.letsencrypt.org/directory",
      email: "ops@example.com",
      privateKeySecretRef: { name: "letsencrypt-prod-key" },
      solvers: [{ http01: { ingress: { class: "nginx" } } }],
    },
  },
}, { provider: k8sProvider });
```

### Step 7: State Backend Comparison
| Backend | Pros | Cons | Best For |
|---------|------|------|----------|
| Pulumi Cloud | Managed, web UI, RBAC, audit, deployments | Vendor lock-in, cost | Teams, enterprise |
| AWS S3 | Cheap, well-known | No state locking by default (DynamoDB needed) | AWS-native teams |
| Azure Blob | Cheap, Azure-native | No state locking (Lease Blob needed) | Azure-native teams |
| GCS | Cheap, GCP-native | Object versioning for safety | GCP-native teams |
| Local | No infra needed | No sharing, no locking | Personal projects only |

```bash
# S3 backend config
pulumi login s3://my-pulumi-state?region=us-east-1

# Azure Blob backend
pulumi login azblob://my-pulumi-state

# GCS backend
pulumi login gs://my-pulumi-state

# Local
pulumi login --local
```

### Step 8: Automation API (Self-Service Platform)
```typescript
import * as pulumi from "@pulumi/pulumi/automation";
import { LocalWorkspace } from "@pulumi/pulumi/automation";

async function createEnv(envName: string, region: string, vpcCidr: string) {
  const projectName = "infra-self-service";
  const program = async () => {
    const aws = require("@pulumi/aws");
    const vpc = new aws.ec2.Vpc("vpc", {
      cidrBlock: vpcCidr,
      enableDnsHostnames: true,
      tags: { Name: envName, Environment: envName },
    });
    return { vpcId: vpc.id };
  };

  const stack = await LocalWorkspace.createOrSelectStack({
    stackName: envName,
    projectName,
    program,
  });

  // Configure stack
  await stack.setConfig("aws:region", { value: region });
  await workspace.installPlugin("aws", "v6.0.0");

  // Deploy
  const upResult = await stack.up({ onOutput: console.log });
  console.log(`VPC created: ${upResult.outputs.vpcId.value}`);
  return upResult;
}
```

### Step 9: Secrets Management
```bash
# Set secret
pulumi config set dbPassword "s3cret!" --secret

# Encrypted in Pulumi.{stack}.yaml
# Encryption: Pulumi Cloud managed, or bring your own key (AWS KMS, Azure KeyVault, GCP KMS)

# Refer in code
const dbPassword = config.requireSecret("dbPassword");

# AWS KMS encryption
pulumi stack change-secrets-provider "awskms://arn:aws:kms:us-east-1:123456789012:key/abc123"
```

### Step 10: Migration from Terraform
```bash
# 1. Export Terraform state
terraform state pull > terraform.tfstate

# 2. Convert Terraform to Pulumi (tf2pulumi)
tf2pulumi < terraform.tfstate > generated.ts

# 3. Import existing resources
pulumi import aws:ec2/vpc:Vpc main vpc-12345
pulumi import aws:ec2/subnet:Subnet public-0 subnet-abcde

# 4. Write Pulumi program and preview
pulumi preview
```

### Step 11: Policy as Code (CrossGuard)
```typescript
import { PolicyPack, validateResourceOfType } from "@pulumi/policy";
import * as aws from "@pulumi/aws";

new PolicyPack("aws-best-practices", {
  policies: [{
    name: "s3-enforce-encryption",
    description: "S3 buckets must have encryption enabled",
    enforcementLevel: "mandatory",
    validateResource: validateResourceOfType(aws.s3.Bucket, (bucket, args, report) => {
      if (!bucket.serverSideEncryptionConfiguration) {
        report("S3 bucket must have encryption enabled");
      }
    }),
  }, {
    name: "tag-required",
    description: "All resources must have Environment tag",
    enforcementLevel: "mandatory",
    validateResource: (args, report) => {
      const tags = args.props["tags"] || {};
      if (!tags["Environment"]) {
        report(`Missing required Environment tag`);
      }
    },
  }, {
    name: "ec2-instance-type",
    description: "Only allow approved EC2 instance types",
    enforcementLevel: "advisory",
    validateResource: validateResourceOfType(aws.ec2.Instance, (instance, args, report) => {
      const approved = ["t3.medium", "t3.large", "m5.large", "m5.xlarge"];
      if (!approved.includes(instance.instanceType)) {
        report(`Instance type ${instance.instanceType} not in approved list`);
      }
    }),
  }],
});
```

### Step 12: Pulumi Transforms
```typescript
import { pulumi } from "@pulumi/pulumi";

// Global transform to add tags to all AWS resources
pulumi.runtime.registerResourceTransform(async (args) => {
  if (args.type.startsWith("aws:")) {
    args.props["tags"] = {
      ...args.props["tags"],
      managedBy: "pulumi",
      project: pulumi.getProject(),
      stack: pulumi.getStack(),
    };
  }
  return { props: args.props, opts: args.opts };
});
```

### Step 13: Pulumi YAML (For HCL-Friendly Teams)
```yaml
name: my-infra
runtime: yaml
resources:
  vpc:
    type: aws:ec2/vpc:Vpc
    properties:
      cidrBlock: 10.0.0.0/16
      enableDnsHostnames: true
      tags:
        Name: main
        Environment: ${environment}
  webSubnet:
    type: aws:ec2/subnet:Subnet
    properties:
      vpcId: ${vpc.id}
      cidrBlock: 10.0.1.0/24
      availabilityZone: us-east-1a
variables:
  environment:
    fn::fromBase64: ${pulumi.stack}
```

### Step 14: Deploy
```bash
pulumi stack select dev
pulumi preview
pulumi up --yes

# Destroy
pulumi destroy --yes

# Stack operations
pulumi stack ls
pulumi stack init prod
pulumi stack rm dev
```

### Step 15: Stack References (Cross-Stack Dependencies)
```typescript
const infra = new pulumi.StackReference("acme/infrastructure/prod");
const vpcId = infra.getOutput("vpcId");
const subnetIds = infra.getOutput("publicSubnetIds");
```

## Rules & Constraints
- Never hardcode secrets — use `pulumi config set --secret`.
- Always use stack references for cross-stack dependencies.
- Never use `pulumi destroy` without reviewing the preview first.
- Component resources must always call `registerOutputs`.
- Use `pulumi.StackReference` instead of hardcoding stack outputs.
- Always configure S3/Blob/GCS backend for team environments.
- Enable `protect` on critical resources (databases, buckets).
- Use `ignoreChanges` sparingly and document why.
- Always pin provider versions in `Pulumi.yaml`.
- Never run `pulumi up` in CI/CD without `--skip-preview-on-merge` or explicit approval.

## Production Considerations
- Use separate stack per environment (dev, staging, prod) with config differences.
- Enable `protect: true` on RDS, S3 buckets, and other critical resources to prevent accidental deletion.
- Always review `pulumi preview` output before `pulumi up`.
- Use `pulumi policy` in CI/CD pipelines to enforce organizational standards.
- Store state in a shared backend (S3, Blob, GCS) for team collaboration.
- Use Pulumi Cloud for audit logging and deployment history.
- Register global transforms for consistent tagging across all resources.
- Set `retainOnDelete: true` on databases to prevent accidental data loss.
- Use `pulumi up --target` only for targeted updates in emergency scenarios.
- Secrets encryption: prefer cloud KMS (AWS KMS, Azure Key Vault, GCP KMS) for production.

## Anti-Patterns
- Storing secrets in stack config files without `--secret` — plaintext in version control.
- One monolithic stack containing all resources — breaks isolation.
- No stack references — hardcoded resource IDs between stacks.
- Not using component resources — duplicated code across projects.
- Using `pulumi destroy` without reviewing the plan.
- Running `pulumi up` in CI/CD without preview.
- Ignoring `pulumi preview` diffs that show unexpected resource recreation.
- Forgetting to call `registerOutputs` in component resources.
- Using local state backend in team environments — no locking.
- Not pinning provider versions — unexpected provider upgrades break state.
- Using `ignoreChanges` to silence drift instead of fixing it upstream.

## Troubleshooting
- State conflict: `pulumi stack export` and `pulumi stack import` for manual recovery.
- Resource pending creation: check cloud provider console, then `pulumi refresh`.
- Dependency error: verify stack references are correct, check output names.
- Provider auth failure: verify provider credentials, check `aws:region` config.
- Secrets decryption error: verify secrets provider key is accessible.
- Automation API timeout: increase `pulumi.auto.up` timeout parameter.
- CRD removal failure: remove finalizers from CR before `pulumi destroy`.
- `pulumi preview` showing unexpected diff: run `pulumi refresh` first.

## References
  - references/automation-api.md — Pulumi Automation API
  - references/aws-resources.md — Pulumi AWS Provider
  - references/kubernetes-provider.md — Pulumi Kubernetes Provider
  - references/programming-models.md — Pulumi Programming Models
  - references/pulumi-advanced.md — Pulumi Advanced Topics
  - references/pulumi-fundamentals.md — Pulumi Fundamentals
  - references/state-backends.md — Pulumi State Backends
## Handoff
After completing this skill:
- Next skill: **devops-crossplane** — control plane abstractions on top of Pulumi-provisioned infrastructure
- Pass context: Stack output references, component resource names, state backend location
