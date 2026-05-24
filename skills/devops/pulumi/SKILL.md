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

## When to Use This Skill
- Building multi-environment cloud infrastructure with real programming languages
- Reusable infrastructure components (component resources)
- Self-service infrastructure via Automation API
- Migrating from Terraform/HCL to programming language IaC
- Kubernetes infrastructure with native Kubernetes provider

## Core Workflow

### Step 1: Initialize Project
```bash
pulumi new aws-typescript --name my-infra --stack dev
```

### Step 2: Define Infrastructure
```typescript
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const vpcCidr = config.get("vpcCidr") || "10.0.0.0/16";

const vpc = new aws.ec2.Vpc("main", {
  cidrBlock: vpcCidr,
  enableDnsHostnames: true,
  enableDnsSupport: true,
  tags: { Name: "main", Environment: config.require("environment") },
});
```

### Step 3: Stack Configuration
```yaml
# Pulumi.prod.yaml
config:
  aws:region: us-east-1
  my-infra:vpcCidr: 10.0.0.0/16
  my-infra:instanceType: t3.large
  my-infra:environment: production
```

### Step 4: Component Resources
```typescript
export class VpcStack extends pulumi.ComponentResource {
  public readonly vpc: aws.ec2.Vpc;
  public readonly publicSubnets: aws.ec2.Subnet[];

  constructor(name: string, args: VpcStackArgs, opts?: pulumi.ComponentResourceOptions) {
    super("my:infra:VpcStack", name, args, opts);

    this.vpc = new aws.ec2.Vpc(`${name}-vpc`, { ... }, { parent: this });
    this.publicSubnets = args.azs.map((az, i) =>
      new aws.ec2.Subnet(`${name}-public-${i}`, { ... }, { parent: this })
    );
    this.registerOutputs({ vpc: this.vpc.id, publicSubnets: this.publicSubnets.map(s => s.id) });
  }
}
```

### Step 5: Deploy
```bash
pulumi stack select dev
pulumi preview
pulumi up --yes
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

## References
- `references/programming-models.md` — TypeScript, Python, Go, C# project structure
- `references/state-backends.md` — S3, Azure Blob, GCS, Cloud, self-managed
- `references/aws-resources.md` — AWS provider: VPC, EKS, S3, IAM, Lambda
- `references/kubernetes-provider.md` — Kubernetes provider, Helm, CRDs, operator
- `references/automation-api.md` — Self-service infra, multi-stage deployments

## Handoff
After completing this skill:
- Next skill: **devops-crossplane** — control plane abstractions on top of Pulumi-provisioned infrastructure
- Pass context: Stack output references, component resource names, state backend location
