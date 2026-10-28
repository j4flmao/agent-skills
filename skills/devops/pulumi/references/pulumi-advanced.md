# Pulumi Advanced Topics

Advanced Pulumi practices for platform teams: reusable component resources and multi-language packages, Pulumi ESC for configuration and secrets, policy as code, transforms, dynamic providers, refactoring and imports, drift detection, deployment automation and performance of large stacks. Fundamentals are in `pulumi-fundamentals.md`; Automation API in `automation-api.md`; testing in `pulumi-testing.md`.

## Component Resources

```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

export interface ServiceBucketArgs {
  team: pulumi.Input<string>;
  versioning?: boolean;
}

export class ServiceBucket extends pulumi.ComponentResource {
  public readonly bucketName: pulumi.Output<string>;

  constructor(name: string, args: ServiceBucketArgs, opts?: pulumi.ComponentResourceOptions) {
    super("acme:storage:ServiceBucket", name, {}, opts);

    const bucket = new aws.s3.BucketV2(name, { tags: { team: args.team } }, { parent: this });
    new aws.s3.BucketPublicAccessBlock(name, {
      bucket: bucket.id,
      blockPublicAcls: true, blockPublicPolicy: true, ignorePublicAcls: true, restrictPublicBuckets: true,
    }, { parent: this });
    new aws.s3.BucketServerSideEncryptionConfigurationV2(name, {
      bucket: bucket.id,
      rules: [{ applyServerSideEncryptionByDefault: { sseAlgorithm: "aws:kms" } }],
    }, { parent: this });
    if (args.versioning ?? true) {
      new aws.s3.BucketVersioningV2(name, { bucket: bucket.id, versioningConfiguration: { status: "Enabled" } }, { parent: this });
    }

    this.bucketName = bucket.bucket;
    this.registerOutputs({ bucketName: this.bucketName });
  }
}
```

Rules: unique type token (`package:module:Type`), `parent: this` on children, `registerOutputs` at the end, child names derived from the component name to avoid collisions.

### Multi-Language Components

Author a component once and consume it from every Pulumi language:
- Package the component as a Pulumi plugin/provider with a schema; recent Pulumi versions can infer the schema from TypeScript, Python, Go or C# component classes and let other languages consume it with `pulumi package add <git-url-or-path>`.
- Version releases with semver and publish through a private registry (Pulumi Cloud private registry) or Git tags.

## Pulumi ESC (Environments, Secrets, Configuration)

```yaml
# ESC environment: acme/prod-aws
values:
  aws:
    login:
      fn::open::aws-login:
        oidc:
          roleArn: arn:aws:iam::123456789012:role/pulumi-esc
          sessionName: pulumi-prod
  secrets:
    fn::open::aws-secrets:
      region: eu-central-1
      login: ${aws.login}
      get:
        dbPassword:
          secretId: prod/payments/db-password
  dbPassword: ${secrets.dbPassword}
  environmentVariables:
    AWS_ACCESS_KEY_ID: ${aws.login.accessKeyId}
    AWS_SECRET_ACCESS_KEY: ${aws.login.secretAccessKey}
    AWS_SESSION_TOKEN: ${aws.login.sessionToken}
  pulumiConfig:
    aws:region: eu-central-1
    payments:dbPassword: ${dbPassword}
```

```yaml
# Pulumi.prod.yaml
environment:
  - acme/prod-aws
```

- Short-lived cloud credentials via OIDC instead of static keys.
- Compose environments (imports) for shared base config.
- `esc run acme/prod-aws -- aws s3 ls` injects the same values into any CLI.
- Prefer pulling secrets from the source store (`fn::open::aws-secrets`, Vault, Azure Key Vault, GCP Secret Manager) over storing them inline.

## Policy as Code (CrossGuard)

```typescript
import { PolicyPack, validateResourceOfType } from "@pulumi/policy";
import * as aws from "@pulumi/aws";

new PolicyPack("acme-baseline", {
  policies: [
    {
      name: "rds-encrypted",
      description: "RDS instances must be encrypted at rest",
      enforcementLevel: "mandatory",
      validateResource: validateResourceOfType(aws.rds.Instance, (db, args, reportViolation) => {
        if (!db.storageEncrypted) reportViolation("Set storageEncrypted: true");
      }),
    },
  ],
});
```

```bash
pulumi preview --policy-pack ./policy        # local
# Pulumi Cloud: enforce policy packs per stack group org-wide
```

Enforcement levels: `advisory`, `mandatory`, `disabled`; also stack-level validation (`validateStack`) for cross-resource rules. Pulumi also provides pre-built compliance policy packs in Pulumi Cloud.

## Transforms

```typescript
pulumi.runtime.registerResourceTransform(args => {
  if (args.props["tags"] !== undefined || args.type.startsWith("aws:")) {
    args.props["tags"] = { ...(args.props["tags"] ?? {}), costCenter: "payments", managedBy: "pulumi" };
    return { props: args.props, opts: args.opts };
  }
  return undefined;
});
```

`transforms` (resource option) and `registerResourceTransform` (stack-wide) replace the older `transformations` API and also apply to resources inside multi-language components. Prefer provider `defaultTags` (AWS) for tagging when available.

## Dynamic Providers

For APIs without a provider, implement CRUD in TypeScript or Python (`pulumi.dynamic.Resource`). Keep them small and idempotent; for anything substantial, build a real provider (Pulumi Provider SDK in Go) or use an existing Terraform provider via `pulumi package add terraform-provider <name>`.

## Refactoring and Imports

| Task | Approach |
|------|----------|
| Rename resource or move into a component | `aliases: [{ name: "old" }]` or `{ parent: pulumi.rootStackResource }` |
| Move resources between stacks | `pulumi state move` (recent CLI versions) or export/import of state |
| Adopt existing resources | `pulumi import` (bulk with a JSON file) generates code; or `import` resource option |
| Remove from state without deleting | `pulumi state delete <urn>` or `retainOnDelete` before removal |
| Convert from Terraform | `pulumi convert --from terraform`; or reference Terraform state outputs |

Always run `pulumi preview` after refactors and confirm zero replacements.

## Drift Detection and Deployments

- `pulumi refresh --preview-only` shows drift between state and the cloud; schedule it (Pulumi Deployments drift detection or a CI cron) and alert.
- Pulumi Deployments runs `preview`/`up` remotely triggered by Git pushes, API calls or schedules; review stacks create ephemeral stacks per pull request and destroy them on merge.
- TTL stacks auto-destroy temporary environments.

## Large Stacks and Performance

- Split by lifecycle and blast radius (network, shared data, per-service stacks).
- `--parallel` controls concurrent resource operations; raise for wide stacks within provider rate limits.
- Use `--target` sparingly for emergencies; it skips dependency checks.
- Avoid huge `apply` chains and synchronous invokes at program start; use output-form invokes (`getXOutput`) to keep the graph lazy.
- Keep provider versions pinned in lockfiles; upgrade deliberately with preview.

## Kubernetes and Pulumi

- Use explicit `k8s.Provider` per cluster, with kubeconfig from the cluster resource output.
- Server-side apply is the default in recent `@pulumi/kubernetes` versions; set `enableServerSideApply` explicitly if you rely on it.
- Helm: `helm.v4.Chart` renders charts into individual resources; `helm.v3.Release` delegates to Helm; choose based on whether you want Pulumi to own each object.

## Checklist

- [ ] Shared patterns as versioned components (multi-language if consumed across languages)
- [ ] ESC environments with OIDC credentials; no static cloud keys in CI
- [ ] Mandatory policy packs enforced on production stacks
- [ ] Tags and defaults applied via transforms or provider defaults
- [ ] Refactors use aliases/state move; previews show no replacements
- [ ] Scheduled drift detection; review stacks for PRs
- [ ] Stacks split for blast radius and preview speed
