# Pulumi Automation API

## Overview

The Automation API allows embedding Pulumi programmatically within applications. Unlike the CLI-based workflow that requires manual intervention, Automation API provides a programmatic interface to manage Pulumi stacks as a library.

## Key Concepts

- **Workspace**: Represents a Pulumi project, managing state and configuration.
- **Stack**: A deployment target environment within a workspace.
- **Program**: An inline function returning the infrastructure resources.
- **Deployment**: `up()`, `preview()`, `refresh()`, `destroy()` operations.

## Self-Service Infrastructure Platform

### TypeScript Example
```typescript
import { LocalWorkspace, InlineProgramArgs, LocalWorkspaceOptions } from "@pulumi/pulumi/automation";
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

interface InfraRequest {
  projectName: string;
  stackName: string;
  vpcCidr: string;
  instanceType: string;
  region: string;
}

async function provisionInfrastructure(request: InfraRequest): Promise<Record<string, any>> {
  const program = async () => {
    const vpc = new aws.ec2.Vpc("vpc", {
      cidrBlock: request.vpcCidr,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      tags: { Name: `${request.projectName}-vpc` },
    });

    const subnet = new aws.ec2.Subnet("subnet", {
      vpcId: vpc.id,
      cidrBlock: "10.0.1.0/24",
      tags: { Name: `${request.projectName}-subnet` },
    });

    const sg = new aws.ec2.SecurityGroup("sg", {
      vpcId: vpc.id,
      ingress: [{ protocol: "tcp", fromPort: 443, toPort: 443, cidrBlocks: ["0.0.0.0/0"] }],
      tags: { Name: `${request.projectName}-sg` },
    });

    return {
      vpcId: vpc.id,
      subnetId: subnet.id,
      securityGroupId: sg.id,
    };
  };

  const args: InlineProgramArgs = {
    stackName: request.stackName,
    projectName: request.projectName,
    program,
  };

  const workspace = await LocalWorkspace.createOrSelectStack(args);

  // Set stack configuration
  await workspace.setConfig("aws:region", { value: request.region });

  console.log("Running pulumi preview...");
  const preview = await workspace.preview();
  console.log(`Preview: ${preview.changeSummary}`);

  console.log("Running pulumi up...");
  const result = await workspace.up({ onOutput: console.log });

  console.log(`Deployment completed: ${result.summary.kind}`);
  return result.outputs;
}

// Usage
const result = await provisionInfrastructure({
  projectName: "self-service-infra",
  stackName: "team-alpha-dev",
  vpcCidr: "10.100.0.0/16",
  instanceType: "t3.medium",
  region: "us-east-1",
});

console.log(`VPC ID: ${result.vpcId.value}`);
```

### Python Example
```python
import asyncio
import pulumi
import pulumi_aws as aws
from pulumi.automation import LocalWorkspace, InlineProgramArgs, ProjectSettings


async def provision_environment(project_name: str, stack_name: str, vpc_cidr: str, region: str):
    def program():
        vpc = aws.ec2.Vpc("vpc",
            cidr_block=vpc_cidr,
            enable_dns_hostnames=True,
            tags={"Name": f"{project_name}-vpc"}
        )
        subnet = aws.ec2.Subnet("subnet",
            vpc_id=vpc.id,
            cidr_block="10.0.1.0/24",
            tags={"Name": f"{project_name}-subnet"}
        )
        pulumi.export("vpc_id", vpc.id)
        pulumi.export("subnet_id", subnet.id)

    args = InlineProgramArgs(
        project_name=project_name,
        stack_name=stack_name,
        program=program,
    )

    workspace = await LocalWorkspace.create_or_select_stack(args)
    await workspace.set_config("aws:region", pulumi.ConfigValue(value=region))

    preview = await workspace.preview()
    print(f"Preview: {preview.change_summary}")

    result = await workspace.up(on_output=print)
    return result.outputs


async def main():
    outputs = await provision_environment(
        project_name="platform-infra",
        stack_name="dev",
        vpc_cidr="10.0.0.0/16",
        region="us-west-2",
    )
    print(f"Outputs: {outputs}")

asyncio.run(main())
```

## Multi-Stage Deployment Pipeline

```typescript
import { LocalWorkspace } from "@pulumi/pulumi/automation";

interface DeploymentConfig {
  env: string;
  region: string;
  version: string;
}

async function deployService(config: DeploymentConfig) {
  const program = async () => {
    // Infrastructure resources...
    const cluster = new aws.ecs.Cluster("cluster", {
      tags: { Environment: config.env },
    });

    const taskDef = new aws.ecs.TaskDefinition("app", {
      family: `app-${config.env}`,
      cpu: "256",
      memory: "512",
      networkMode: "awsvpc",
      containerDefinitions: JSON.stringify([{
        name: "app",
        image: `myapp:${config.version}`,
        portMappings: [{ containerPort: 8080 }],
        environment: [{ name: "ENV", value: config.env }],
      }]),
    });

    const service = new aws.ecs.Service("app", {
      cluster: cluster.arn,
      taskDefinition: taskDef.arn,
      desiredCount: config.env === "production" ? 3 : 1,
      launchType: "FARGATE",
      networkConfiguration: {
        subnets: subnetIds,
        securityGroups: [sgId],
        assignPublicIp: false,
      },
    });

    return {
      serviceArn: service.id,
      clusterArn: cluster.id,
    };
  };

  const workspace = await LocalWorkspace.createOrSelectStack({
    projectName: "multi-stage-app",
    stackName: config.env,
    program,
  });

  // Stage 1: Preview
  const preview = await workspace.preview();
  if (preview.changeSummary?.same === undefined) {
    console.log("Changes detected, proceeding with deployment...");
  }

  // Stage 2: Deploy with progress reporting
  const result = await workspace.up({
    onOutput: (line) => console.log(`[${config.env}] ${line}`),
    color: "never",
  });

  // Stage 3: Post-deployment validation
  const outputs = result.outputs;
  console.log(`Service deployed: ${outputs.serviceArn.value}`);

  return outputs;
}

// Sequential deployment through environments
async function pipeline() {
  await deployService({ env: "dev", region: "us-east-1", version: "1.2.3" });
  await deployService({ env: "staging", region: "us-east-1", version: "1.2.3" });
  await deployService({ env: "production", region: "us-east-1", version: "1.2.3" });
}
```

## Drift Detection and Remediation

```typescript
import { LocalWorkspace } from "@pulumi/pulumi/automation";

async function detectAndRemediateDrift(stackName: string): Promise<boolean> {
  const workspace = await LocalWorkspace.selectStack({
    stackName,
    projectName: "production-infra",
    program: async () => { /* existing program */ },
  });

  // Run refresh to detect drift
  const refreshResult = await workspace.refresh({
    onOutput: console.log,
  });

  if (refreshResult.summary.resourceChanges?.update) {
    console.log(`Drift detected: ${refreshResult.summary.resourceChanges.update} resources changed`);
    return false;
  }

  // Check for manual changes that need remediation
  const preview = await workspace.preview();
  const changes = preview.changeSummary;

  if (changes.create || changes.update || changes.delete) {
    console.log("Infrastructure drift requires remediation");
    console.log(`Plan: ${JSON.stringify(changes)}`);

    // Auto-remediate (in production, require approval)
    if (process.env.AUTO_REMEDIATE === "true") {
      await workspace.up({ onOutput: console.log });
      return true;
    }
  }

  return false;
}
```

## Webhook-Driven Infrastructure

```typescript
import express from "express";
import { LocalWorkspace } from "@pulumi/pulumi/automation";

const app = express();
app.use(express.json());

app.post("/provision-environment", async (req, res) => {
  const { team, environment, githubRepo } = req.body;

  try {
    const workspace = await LocalWorkspace.createOrSelectStack({
      stackName: `${team}-${environment}`,
      projectName: "platform-infra",
      program: async () => {
        // Environment-specific resources
        const bucket = new aws.s3.Bucket("artifacts", {
          acl: "private",
          tags: { Team: team, Environment: environment },
        });

        const queue = new aws.sqs.Queue("build-queue", {
          tags: { Team: team, Environment: environment },
        });

        return {
          bucketName: bucket.id,
          queueUrl: queue.id,
        };
      },
    });

    await workspace.setConfig("aws:region", { value: "us-east-1" });
    const result = await workspace.up({ onOutput: console.log });

    res.json({
      status: "provisioned",
      outputs: {
        bucketName: result.outputs.bucketName.value,
        queueUrl: result.outputs.queueUrl.value,
      },
    });
  } catch (error) {
    console.error("Provisioning failed:", error);
    res.status(500).json({ status: "failed", error: error.message });
  }
});

app.listen(3000, () => console.log("Infrastructure API running on :3000"));
```

## Ephemeral Environments

```typescript
import { LocalWorkspace } from "@pulumi/pulumi/automation";
import { randomBytes } from "crypto";

async function createEphemeralEnvironment(prId: string) {
  const branchName = `pr-${prId}`;
  const stackName = `ephemeral-${branchName}`;

  const workspace = await LocalWorkspace.createOrSelectStack({
    stackName,
    projectName: "preview-envs",
    program: async () => {
      const vpc = new aws.ec2.Vpc("preview-vpc", {
        cidrBlock: `10.${Math.floor(Math.random() * 255)}.0.0/16`,
        tags: { Ephemeral: "true", PR: prId },
      });

      const cluster = new aws.ecs.Cluster("preview", {
        tags: { Ephemeral: "true", PR: prId },
      });

      return {
        vpcId: vpc.id,
        clusterArn: cluster.arn,
      };
    },
  });

  const result = await workspace.up({ onOutput: console.log });

  // Store mapping in a metadata store
  await storeEphemeralMapping(stackName, prId, result.outputs);

  return {
    stackName,
    outputs: result.outputs,
    cleanup: async () => {
      await workspace.destroy({ onOutput: console.log });
      await workspace.remove();
    },
  };
}

async function cleanupEphemeralEnvironment(prId: string) {
  const mapping = await getEphemeralMapping(prId);
  const workspace = await LocalWorkspace.selectStack({
    stackName: mapping.stackName,
    projectName: "preview-envs",
    program: async () => {},
  });

  await workspace.destroy({ onOutput: console.log });
  await workspace.remove();
}
```

## Best Practices

### Error Handling
```typescript
try {
  const result = await workspace.up();
} catch (e) {
  if (e.message.includes("conflict")) {
    // Handle concurrent modification
    await workspace.refresh();
    const result = await workspace.up();
  } else {
    throw e;
  }
}
```

### State Management
```typescript
// Export state for auditing
const stack = await workspace.exportStack();
await uploadToS3("pulumi-state-backup", `${stackName}-${Date.now()}.json`, JSON.stringify(stack));

// Import state
const stateJson = await downloadFromS3("pulumi-state-backup", "prod-20240101.json");
await workspace.importStack(JSON.parse(stateJson));
```

### Configuration Management
```typescript
// Set multiple configs at once
await workspace.setAllConfig({
  "aws:region": { value: "us-east-1" },
  "aws:profile": { value: "infra-admin" },
  "my-project:environment": { value: env },
});

// Set secrets
await workspace.setConfig("db-password", { value: "s3cret", secret: true });

// Get config with fallback
const config = await workspace.getAllConfig();
const region = config["aws:region"]?.value || "us-east-1";
```

### Concurrency Control
```typescript
// Use a semaphore to limit concurrent operations
import { Semaphore } from "async-mutex";

const deploySemaphore = new Semaphore(3);

async function deployWithConcurrencyLimit(config: DeploymentConfig) {
  const [_, release] = await deploySemaphore.acquire();
  try {
    return await deployService(config);
  } finally {
    release();
  }
}
```
