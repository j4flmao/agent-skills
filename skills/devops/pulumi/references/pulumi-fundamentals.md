# Pulumi Fundamentals

Core Pulumi concepts and workflow: projects and stacks, resources and providers, inputs and outputs, configuration and secrets, resource options, stack references and the CLI lifecycle. Language-specific programming models are in `programming-models.md`; state backends in `state-backends.md`.

## Concepts

| Concept | Meaning |
|---------|---------|
| Project | Directory with `Pulumi.yaml`; one program in one language |
| Program | Code (TypeScript, Python, Go, C#, Java, YAML) that declares desired resources |
| Stack | An instance of the project (e.g. `dev`, `staging`, `prod`) with its own config and state |
| Resource | Managed cloud object; has a logical name (in Pulumi) and a physical name (in the cloud) |
| Provider | Plugin that talks to a cloud API (AWS, Azure, GCP, Kubernetes, ...) |
| State | Record of managed resources per stack, stored in a backend (Pulumi Cloud, S3, Azure Blob, GCS, local) |
| Engine | Diffs desired state against state and calls providers to create/update/delete |

## Project Layout

```yaml
# Pulumi.yaml
name: payments-infra
runtime:
  name: nodejs
  options:
    packagemanager: pnpm
description: Payments platform infrastructure
```

```yaml
# Pulumi.prod.yaml
config:
  aws:region: eu-central-1
  payments-infra:instanceCount: "3"
  payments-infra:dbPassword:
    secure: AAABAJ...        # encrypted by the stack's secrets provider
```

## A First Program (TypeScript)

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

const config = new pulumi.Config();
const env = pulumi.getStack();

const bucket = new aws.s3.BucketV2("artifacts", {
  tags: { env, owner: "payments" },
});

new aws.s3.BucketPublicAccessBlock("artifacts", {
  bucket: bucket.id,
  blockPublicAcls: true,
  blockPublicPolicy: true,
  ignorePublicAcls: true,
  restrictPublicBuckets: true,
});

export const bucketName = bucket.bucket;
```

Physical names get a random suffix by default (auto-naming), which allows replacements without name collisions. Set explicit names only when required. (Check your `@pulumi/aws` major version: newer majors rename some resources, e.g. `BucketV2` may become `Bucket` again.)

## Inputs and Outputs

- Resource properties are `Output<T>`: values known only after the resource is created (IDs, ARNs, endpoints).
- Pass outputs directly as inputs to other resources; Pulumi tracks the dependency.
- Transform outputs with `apply` or `pulumi.interpolate`; never read `.value` or `await` outputs inside the program.

```typescript
const url = pulumi.interpolate`https://${lb.dnsName}/health`;
const upper = bucket.bucket.apply(name => name.toUpperCase());
const combined = pulumi.all([db.address, db.port]).apply(([host, port]) => `${host}:${port}`);
```

Do not create resources inside `apply` callbacks: they will not show in previews correctly.

## Configuration and Secrets

```bash
pulumi config set instanceCount 3
pulumi config set --secret dbPassword          # prompts; stored encrypted
pulumi config set aws:region eu-central-1
pulumi config get dbPassword                   # decrypts if you have access
```

```typescript
const cfg = new pulumi.Config();
const count = cfg.requireNumber("instanceCount");
const dbPassword = cfg.requireSecret("dbPassword");   // Output<string> marked secret
```

- Secrets are encrypted in config and state; outputs derived from secrets stay secret (`pulumi.secret()` marks others).
- Secrets providers: Pulumi Cloud (default with the Pulumi Cloud backend), passphrase, AWS KMS, Azure Key Vault, GCP KMS, HashiCorp Vault (`pulumi stack init --secrets-provider awskms://...`).
- Pulumi ESC environments centralise shared config and secrets across stacks (see `pulumi-advanced.md`).

## Resource Options

| Option | Use |
|--------|-----|
| `dependsOn` | Explicit dependency not expressed through inputs |
| `parent` | Group child resources under a component |
| `protect: true` | Prevent deletion (production databases) |
| `ignoreChanges: ["tags"]` | Ignore drift on fields managed elsewhere |
| `deleteBeforeReplace` | Replace by deleting first (unique-name constraints) |
| `replaceOnChanges` | Force replacement when specific properties change |
| `aliases` | Rename or re-parent resources without recreating them |
| `provider` | Use an explicit provider instance (region/account/cluster) |
| `retainOnDelete` | Remove from state but leave the cloud resource |
| `import` | Adopt an existing cloud resource into state |

```typescript
const db = new aws.rds.Instance("main", { /* args */ }, { protect: true });

const usEast = new aws.Provider("us-east-1", { region: "us-east-1" });
const cert = new aws.acm.Certificate("cdn", { domainName: "cdn.example.com", validationMethod: "DNS" }, { provider: usEast });
```

## Stack References

```typescript
const network = new pulumi.StackReference("acme/network/prod");
const vpcId = network.getOutput("vpcId");
const privateSubnets = network.requireOutput("privateSubnetIds");
```

Split large estates into layered projects (network, data, apps) and connect them with stack references or ESC.

## CLI Lifecycle

```bash
pulumi login                         # Pulumi Cloud, or: pulumi login s3://bucket?region=eu-central-1
pulumi new aws-typescript            # scaffold
pulumi stack init prod
pulumi preview --diff                # what will change
pulumi up                            # apply (asks for confirmation)
pulumi refresh                       # reconcile state with actual cloud
pulumi stack output bucketName
pulumi destroy                       # delete all resources in the stack
pulumi stack rm prod                 # remove stack (after destroy)
pulumi import aws:s3/bucketV2:BucketV2 legacy legacy-bucket-name
```

In CI use `pulumi preview` on pull requests and `pulumi up --yes` on merge, with `--refresh` when drift is possible.

## Pulumi vs Terraform at a Glance

| Aspect | Pulumi | Terraform/OpenTofu |
|--------|--------|--------------------|
| Language | General-purpose languages (and YAML) | HCL |
| Abstraction | Classes, functions, packages | Modules |
| Testing | Unit tests with mocks in the language's test framework | `terraform test`, Terratest |
| Providers | Native and bridged Terraform providers | Terraform providers |
| State | Pulumi Cloud or self-managed backends | Remote backends |

## Pitfalls

- Creating resources inside `apply`, or using outputs as plain strings.
- Changing logical names without `aliases` (causes replacement).
- Storing secrets as plain config.
- One giant stack for everything (slow previews, wide blast radius).
- Forgetting `protect` on stateful production resources.

## Checklist

- [ ] One project per bounded area; stacks per environment
- [ ] Outputs passed as inputs; no resources created inside `apply`
- [ ] Secrets set with `--secret` and a managed secrets provider
- [ ] `protect` on databases and other stateful resources
- [ ] Preview on PR, `up` on merge
- [ ] Renames done with `aliases`
