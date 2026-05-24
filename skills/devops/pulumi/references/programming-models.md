# Pulumi Programming Models

## Overview

Pulumi supports TypeScript, Python, Go, and C# as first-class languages for infrastructure definition. Each language has idiomatic patterns, project structures, and SDK conventions. This reference covers all four language models for building Pulumi projects.

## TypeScript

### Project Structure
```
my-infra/
├── index.ts              # Entry point — resource definitions
├── Pulumi.yaml           # Project metadata
├── Pulumi.dev.yaml       # Dev stack configuration
├── Pulumi.prod.yaml      # Prod stack configuration
├── tsconfig.json
├── package.json
├── node_modules/
├── components/           # Component resources
│   ├── vpc.ts
│   ├── cluster.ts
│   └── index.ts
└── utils/
    ├── tags.ts
    └── naming.ts
```

### Basic Resource Definition
```typescript
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const env = config.require("environment");

const bucket = new aws.s3.Bucket("assets", {
  acl: "private",
  versioning: { enabled: true },
  forceDestroy: env === "dev",
  tags: { Environment: env },
});
```

### Component Resource Pattern
```typescript
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

export interface VpcArgs {
  cidrBlock: string;
  azs: string[];
  enableNat: boolean;
  tags?: Record<string, string>;
}

export class VpcComponent extends pulumi.ComponentResource {
  public readonly vpc: aws.ec2.Vpc;
  public readonly publicSubnets: aws.ec2.Subnet[];
  public readonly privateSubnets: aws.ec2.Subnet[];
  public readonly vpcId: pulumi.Output<string>;

  constructor(name: string, args: VpcArgs, opts?: pulumi.ComponentResourceOptions) {
    super("my:infra:VpcComponent", name, args, opts);

    const tags = { ...args.tags, Name: name };

    this.vpc = new aws.ec2.Vpc(`${name}`, {
      cidrBlock: args.cidrBlock,
      enableDnsHostnames: true,
      enableDnsSupport: true,
      tags,
    }, { parent: this, ...opts });

    this.publicSubnets = args.azs.map((az, i) =>
      new aws.ec2.Subnet(`${name}-public-${i}`, {
        vpcId: this.vpc.id,
        cidrBlock: `10.0.${i}.0/24`,
        availabilityZone: az,
        mapPublicIpOnLaunch: true,
        tags: { ...tags, Tier: "public" },
      }, { parent: this })
    );

    this.privateSubnets = args.azs.map((az, i) =>
      new aws.ec2.Subnet(`${name}-private-${i}`, {
        vpcId: this.vpc.id,
        cidrBlock: `10.0.${i + 100}.0/24`,
        availabilityZone: az,
        tags: { ...tags, Tier: "private" },
      }, { parent: this })
    );

    this.vpcId = this.vpc.id;
    this.registerOutputs({
      vpcId: this.vpc.id,
      publicSubnetIds: this.publicSubnets.map(s => s.id),
      privateSubnetIds: this.privateSubnets.map(s => s.id),
    });
  }
}
```

### Async Patterns
```typescript
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// Use pulumi.all for combining outputs
const vpc = new aws.ec2.Vpc("main", { cidrBlock: "10.0.0.0/16" });
const subnets = [0, 1, 2].map(i =>
  new aws.ec2.Subnet(`subnet-${i}`, {
    vpcId: vpc.id,
    cidrBlock: `10.0.${i}.0/24`,
  })
);

// Combine multiple outputs
const subnetIds = pulumi.all(subnets.map(s => s.id));

// Use output apply for transformations
const tagsOutput = pulumi.output(vpc.tags).apply(t => ({
  ...t,
  ManagedBy: "Pulumi",
}));
```

## Python

### Project Structure
```
my-infra/
├── __main__.py
├── Pulumi.yaml
├── Pulumi.dev.yaml
├── Pulumi.prod.yaml
├── requirements.txt
├── components/
│   ├── __init__.py
│   ├── vpc.py
│   └── cluster.py
└── utils/
    ├── __init__.py
    └── tags.py
```

### Basic Resource Definition
```python
import pulumi
import pulumi_aws as aws

config = pulumi.Config()
environment = config.require("environment")

bucket = aws.s3.Bucket("assets",
    acl="private",
    versioning=aws.s3.BucketVersioningArgs(
        enabled=True
    ),
    force_destroy=(environment == "dev"),
    tags={"Environment": environment}
)
```

### Component Resource Pattern
```python
import pulumi
import pulumi_aws as aws
from typing import Optional, List

class VpcComponent(pulumi.ComponentResource):
    def __init__(self, name: str, cidr_block: str, azs: List[str],
                 enable_nat: bool = True,
                 tags: Optional[dict] = None,
                 opts: Optional[pulumi.ResourceOptions] = None):
        super().__init__("my:infra:VpcComponent", name, None, opts)
        tags = tags or {}

        self.vpc = aws.ec2.Vpc(f"{name}",
            cidr_block=cidr_block,
            enable_dns_hostnames=True,
            enable_dns_support=True,
            tags={"Name": name, **tags},
            opts=pulumi.ResourceOptions(parent=self)
        )

        self.public_subnets = []
        for i, az in enumerate(azs):
            subnet = aws.ec2.Subnet(f"{name}-public-{i}",
                vpc_id=self.vpc.id,
                cidr_block=f"10.0.{i}.0/24",
                availability_zone=az,
                map_public_ip_on_launch=True,
                tags={"Name": f"{name}-public-{i}", "Tier": "public", **tags},
                opts=pulumi.ResourceOptions(parent=self)
            )
            self.public_subnets.append(subnet)

        self.register_outputs({
            "vpc_id": self.vpc.id,
            "public_subnet_ids": [s.id for s in self.public_subnets]
        })
```

## Go

### Project Structure
```
my-infra/
├── main.go
├── Pulumi.yaml
├── Pulumi.dev.yaml
├── Pulumi.prod.yaml
├── go.mod
├── go.sum
└── components/
    └── vpc.go
```

### Basic Resource Definition
```go
package main

import (
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/s3"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi/config"
)

func main() {
	pulumi.Run(func(ctx *pulumi.Context) error {
		cfg := config.New(ctx, "")
		env := cfg.Require("environment")

		bucket, err := s3.NewBucket(ctx, "assets", &s3.BucketArgs{
			Acl:     pulumi.String("private"),
			Tags: pulumi.StringMap{
				"Environment": pulumi.String(env),
			},
		})
		if err != nil {
			return err
		}

		ctx.Export("bucketName", bucket.Bucket)
		ctx.Export("bucketArn", bucket.Arn)
		return nil
	})
}
```

### Component Resource Pattern
```go
package components

import (
	"github.com/pulumi/pulumi-aws/sdk/v6/go/aws/ec2"
	"github.com/pulumi/pulumi/sdk/v3/go/pulumi"
)

type VpcComponent struct {
	pulumi.ResourceState
	Vpc             *ec2.Vpc
	PublicSubnets   []*ec2.Subnet
	PrivateSubnets  []*ec2.Subnet
	VpcId           pulumi.StringOutput
}

type VpcArgs struct {
	CidrBlock string
	Azs       []string
	Tags      map[string]string
}

func NewVpcComponent(ctx *pulumi.Context, name string, args *VpcArgs,
	opts ...pulumi.ResourceOption) (*VpcComponent, error) {

	component := &VpcComponent{}
	err := ctx.RegisterComponentResource("my:infra:VpcComponent", name, component, opts...)
	if err != nil {
		return nil, err
	}

	vpc, err := ec2.NewVpc(ctx, name, &ec2.VpcArgs{
		CidrBlock:          pulumi.String(args.CidrBlock),
		EnableDnsHostnames: pulumi.Bool(true),
		EnableDnsSupport:   pulumi.Bool(true),
		Tags: pulumi.StringMap{
			"Name": pulumi.String(name),
		},
	}, pulumi.Parent(component))
	if err != nil {
		return nil, err
	}
	component.Vpc = vpc

	for i, az := range args.Azs {
		subnet, err := ec2.NewSubnet(ctx, name+"-public-"+fmt.Sprint(i), &ec2.SubnetArgs{
			VpcId:              vpc.ID(),
			CidrBlock:          pulumi.String(fmt.Sprintf("10.0.%d.0/24", i)),
			AvailabilityZone:   pulumi.String(az),
			MapPublicIpOnLaunch: pulumi.Bool(true),
		}, pulumi.Parent(component))
		if err != nil {
			return nil, err
		}
		component.PublicSubnets = append(component.PublicSubnets, subnet)
	}

	component.VpcId = vpc.ID().ToStringOutput()
	if err := ctx.RegisterResourceOutputs(component, pulumi.Map{
		"vpcId": vpc.ID(),
	}); err != nil {
		return nil, err
	}

	return component, nil
}
```

## C#

### Project Structure
```
my-infra/
├── Program.cs
├── MyInfra.csproj
├── Pulumi.yaml
├── Pulumi.dev.yaml
├── Pulumi.prod.yaml
└── Components/
    └── VpcComponent.cs
```

### Basic Resource Definition
```csharp
using Pulumi;
using Pulumi.Aws.S3;
using Pulumi.Aws.S3.Inputs;

class MyStack : Stack
{
    public MyStack()
    {
        var config = new Config();
        var env = config.Require("environment");

        var bucket = new Bucket("assets", new BucketArgs
        {
            Acl = "private",
            Versioning = new BucketVersioningArgs
            {
                Enabled = true
            },
            Tags = new InputMap<string>
            {
                { "Environment", env }
            }
        });

        this.BucketName = bucket.Bucket;
        this.BucketArn = bucket.Arn;
    }

    [Output]
    public Output<string> BucketName { get; set; }

    [Output]
    public Output<string> BucketArn { get; set; }
}
```

### Component Resource Pattern
```csharp
using Pulumi;
using Pulumi.Aws.Ec2;
using Pulumi.Aws.Ec2.Inputs;
using System.Collections.Generic;
using System.Linq;

namespace MyInfra.Components
{
    public class VpcComponentArgs : ResourceArgs
    {
        public Input<string> CidrBlock { get; set; }
        public InputList<string> Azs { get; set; }
        public InputMap<string> Tags { get; set; }
    }

    public class VpcComponent : ComponentResource
    {
        public Output<string> VpcId { get; private set; }

        public VpcComponent(string name, VpcComponentArgs args, ComponentResourceOptions? opts = null)
            : base("my:infra:VpcComponent", name, args, opts)
        {
            var vpc = new Vpc(name, new VpcArgs
            {
                CidrBlock = args.CidrBlock,
                EnableDnsHostnames = true,
                EnableDnsSupport = true,
                Tags = args.Tags,
            }, new CustomResourceOptions { Parent = this });

            VpcId = vpc.Id;
            this.RegisterOutputs(new Dictionary<string, object?>
            {
                { "VpcId", vpc.Id }
            });
        }
    }
}
```

## Language Selection Guide

| Feature | TypeScript | Python | Go | C# |
|---------|-----------|--------|----|----|
| Type Safety | Strong ($++) | Optional ($+) | Strong ($+++) | Strong ($+++) |
| Async Patterns | Native async/await | Async/await | Goroutines | async/await |
| Ecosystem | npm | PyPI | Go modules | NuGet |
| Learning Curve | Low | Low | Medium | Medium |
| IDE Support | Excellent | Excellent | Good | Excellent |
| Component Resources | Class-based | Class-based | Function + struct | Class-based |

## Best Practices

1. **Language-idiomatic naming**: Use camelCase (TS/Go), snake_case (Python), PascalCase (C#) as appropriate.
2. **Component resources**: Always call `registerOutputs` to expose important attributes.
3. **Error handling**: Use `try/catch` (Python/TS/C#) or error returns (Go) around resource creation.
4. **Type safety**: Define interfaces/types/structs for all component resource arguments.
5. **Exports**: Always export essential stack outputs for stack references and CI/CD pipelines.
