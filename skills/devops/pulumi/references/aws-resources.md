# Pulumi AWS Provider

## Overview

Pulumi's AWS provider wraps the full AWS SDK and manages all AWS services as first-class resources. Examples in TypeScript, Python, and Go.

## VPC and Networking

### TypeScript
```typescript
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const env = config.require("environment");
const vpcCidr = config.get("vpcCidr") || "10.0.0.0/16";

const vpc = new aws.ec2.Vpc("main", {
  cidrBlock: vpcCidr,
  enableDnsHostnames: true,
  enableDnsSupport: true,
  tags: { Name: `main-${env}`, Environment: env },
});

const azs = await aws.getAvailabilityZones({ state: "available" });
const azNames = azs.names.slice(0, 3);

const publicSubnets = azNames.map((az, i) =>
  new aws.ec2.Subnet(`public-${i}`, {
    vpcId: vpc.id,
    cidrBlock: `10.0.${i}.0/24`,
    availabilityZone: az,
    mapPublicIpOnLaunch: true,
    tags: { Name: `public-${env}-${i}`, Tier: "public" },
  })
);

const privateSubnets = azNames.map((az, i) =>
  new aws.ec2.Subnet(`private-${i}`, {
    vpcId: vpc.id,
    cidrBlock: `10.0.${i + 100}.0/24`,
    availabilityZone: az,
    tags: { Name: `private-${env}-${i}`, Tier: "private" },
  })
);

const igw = new aws.ec2.InternetGateway("igw", {
  vpcId: vpc.id,
  tags: { Name: `main-${env}` },
});

const eips = azNames.map((_, i) =>
  new aws.ec2.Eip(`nat-${i}`, {
    domain: "vpc",
    tags: { Name: `nat-${env}-${i}` },
  })
);

const natGateways = eips.map((eip, i) =>
  new aws.ec2.NatGateway(`nat-${i}`, {
    allocationId: eip.id,
    subnetId: publicSubnets[i].id,
    tags: { Name: `nat-${env}-${i}` },
  })
);

const publicRouteTable = new aws.ec2.RouteTable("public", {
  vpcId: vpc.id,
  routes: [{ cidrBlock: "0.0.0.0/0", gatewayId: igw.id }],
  tags: { Name: `public-${env}` },
});

publicSubnets.forEach((subnet, i) =>
  new aws.ec2.RouteTableAssociation(`public-rta-${i}`, {
    subnetId: subnet.id,
    routeTableId: publicRouteTable.id,
  })
);
```

### Python
```python
import pulumi
import pulumi_aws as aws

config = pulumi.Config()
env = config.require("environment")
vpc_cidr = config.get("vpcCidr", "10.0.0.0/16")

vpc = aws.ec2.Vpc("main",
    cidr_block=vpc_cidr,
    enable_dns_hostnames=True,
    enable_dns_support=True,
    tags={"Name": f"main-{env}", "Environment": env}
)

azs = aws.get_availability_zones(state="available")
az_names = azs.names[:3]

public_subnets = []
for i, az in enumerate(az_names):
    subnet = aws.ec2.Subnet(f"public-{i}",
        vpc_id=vpc.id,
        cidr_block=f"10.0.{i}.0/24",
        availability_zone=az,
        map_public_ip_on_launch=True,
        tags={"Name": f"public-{env}-{i}", "Tier": "public"}
    )
    public_subnets.append(subnet)
```

## EKS Cluster

### TypeScript
```typescript
import * as aws from "@pulumi/aws";
import * as awsx from "@pulumi/awsx";

const cluster = new aws.eks.Cluster("app", {
  roleArn: clusterRole.arn,
  vpcConfig: {
    subnetIds: [...privateSubnets.map(s => s.id)],
    endpointPrivateAccess: true,
    endpointPublicAccess: false,
    securityGroupIds: [clusterSg.id],
  },
  version: "1.29",
  enabledClusterLogTypes: ["api", "audit", "authenticator"],
  tags: { Environment: env },
});

// Node group
const nodeGroup = new aws.eks.NodeGroup("app-ng", {
  clusterName: cluster.name,
  nodeRoleArn: nodeRole.arn,
  subnetIds: privateSubnets.map(s => s.id),
  scalingConfig: {
    desiredSize: 3,
    minSize: 3,
    maxSize: 10,
  },
  instanceTypes: ["t3.medium"],
  amiType: "AL2_x86_64",
  diskSize: 50,
  labels: { "app": "workload" },
  tags: { "kubernetes.io/cluster/app": "owned" },
});

// OIDC provider for IRSA
const oidcProvider = new aws.iam.OpenIdConnectProvider("eks-oidc", {
  clientIdLists: ["sts.amazonaws.com"],
  thumbprintLists: ["9e99a48a9960b14926bb7f3b02e22da2b0ab7280"],
  url: cluster.identities[0].oidcs[0].issuer,
});

// Export kubeconfig
export const kubeconfig = pulumi.
  all([cluster.endpoint, cluster.certificateAuthority, cluster.name]).
  apply(([endpoint, ca, name]) => {
    return Buffer.from(JSON.stringify({
      apiVersion: "v1",
      clusters: [{ cluster: { server: endpoint, "certificate-authority-data": ca.data }, name }],
      contexts: [{ context: { cluster: name, user: "aws" }, name }],
      "current-context": name,
      kind: "Config",
      users: [{ name: "aws", user: { exec: { apiVersion: "client.authentication.k8s.io/v1beta1", command: "aws", args: ["eks", "get-token", "--cluster-name", name] } } }],
    })).toString("base64");
  });
```

## S3 Bucket with Best Practices

### TypeScript
```typescript
import * as aws from "@pulumi/aws";
import * as crypto from "crypto";

// Create KMS key
const key = new aws.kms.Key("s3-key", {
  description: "KMS key for S3 bucket encryption",
  deletionWindowInDays: 7,
  enableKeyRotation: true,
  policy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Principal: { AWS: "*" },
      Action: ["kms:Decrypt", "kms:GenerateDataKey"],
      Resource: "*",
      Condition: { StringEquals: { "kms:ViaService": "s3.amazonaws.com" } },
    }],
  }),
});

const bucket = new aws.s3.Bucket("assets", {
  bucket: `my-app-assets-${env}`,
  forceDestroy: env !== "production",
  tags: { Environment: env, Purpose: "Static assets" },
});

new aws.s3.BucketVersioning("assets-versioning", {
  bucket: bucket.id,
  versioningConfiguration: { status: "Enabled" },
});

new aws.s3.BucketServerSideEncryptionConfiguration("assets-encryption", {
  bucket: bucket.id,
  rules: [{
    applyServerSideEncryptionByDefault: {
      sseAlgorithm: "aws:kms",
      kmsMasterKeyId: key.keyId,
    },
  }],
});

new aws.s3.BucketPublicAccessBlock("assets-block-public", {
  bucket: bucket.id,
  blockPublicAcls: true,
  blockPublicPolicy: true,
  ignorePublicAcls: true,
  restrictPublicBuckets: true,
});
```

## IAM Roles and Policies

### TypeScript
```typescript
import * as aws from "@pulumi/aws";

// EKS cluster role
const clusterRole = new aws.iam.Role("eks-cluster", {
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Principal: { Service: "eks.amazonaws.com" },
      Action: "sts:AssumeRole",
    }],
  }),
});

new aws.iam.RolePolicyAttachment("eks-cluster-policy", {
  role: clusterRole.name,
  policyArn: "arn:aws:iam::aws:policy/AmazonEKSClusterPolicy",
});

new aws.iam.RolePolicyAttachment("eks-service-policy", {
  role: clusterRole.name,
  policyArn: "arn:aws:iam::aws:policy/AmazonEKSServicePolicy",
});

// IRSA for specific service account
const irsaRole = new aws.iam.Role("app-irsa", {
  assumeRolePolicy: pulumi.all([oidcProvider.url, oidcProvider.arn, aws.getCallerIdentity()])
    .apply(([url, arn, identity]) => JSON.stringify({
      Version: "2012-10-17",
      Statement: [{
        Effect: "Allow",
        Principal: { Federated: arn },
        Action: "sts:AssumeRoleWithWebIdentity",
        Condition: {
          StringEquals: {
            [`${url.replace("https://", "")}:sub`]: "system:serviceaccount:default:app-sa",
            [`${url.replace("https://", "")}:aud`]: "sts.amazonaws.com",
          },
        },
      }],
    })),
});

new aws.iam.RolePolicy("app-irsa-s3", {
  role: irsaRole.name,
  policy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Action: ["s3:GetObject", "s3:ListBucket"],
      Resource: ["arn:aws:s3:::my-app-assets/*", "arn:aws:s3:::my-app-assets"],
    }],
  }),
});
```

## Lambda Functions

### TypeScript
```typescript
import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";

// Lambda execution role
const lambdaRole = new aws.iam.Role("lambda-exec", {
  assumeRolePolicy: JSON.stringify({
    Version: "2012-10-17",
    Statement: [{
      Effect: "Allow",
      Principal: { Service: "lambda.amazonaws.com" },
      Action: "sts:AssumeRole",
    }],
  }),
});

new aws.iam.RolePolicyAttachment("lambda-basic", {
  role: lambdaRole.name,
  policyArn: "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole",
});

// Lambda function from container image
const fn = new aws.lambda.Function("api-handler", {
  role: lambdaRole.arn,
  packageType: "Image",
  imageUri: pulumi.interpolate`${ecrRepo.repositoryUrl}:latest`,
  timeout: 30,
  memorySize: 512,
  environment: {
    variables: {
      TABLE_NAME: table.name,
      BUCKET_NAME: bucket.bucket,
    },
  },
  tracingConfig: { mode: "Active" },
  tags: { Environment: env },
});

// Lambda from zip
const helloFn = new aws.lambda.Function("hello", {
  role: lambdaRole.arn,
  runtime: "nodejs20.x",
  handler: "index.handler",
  code: new pulumi.asset.AssetArchive({
    ".": new pulumi.asset.FileArchive("./dist/lambda"),
  }),
  publish: true,
  layers: [layer.arn],
});

// Function URL
const fnUrl = new aws.lambda.FunctionUrl("api-url", {
  functionName: fn.name,
  authorizationType: "AWS_IAM",
  cors: {
    allowOrigins: ["*"],
    allowMethods: ["GET", "POST", "PUT"],
    allowHeaders: ["Content-Type"],
    maxAge: 86400,
  },
});
```

## Best Practices

### Resource Naming
```typescript
// Consistent naming convention
const namePrefix = `${project}-${env}`;

new aws.ec2.Vpc(`${namePrefix}-vpc`, { ... });
new aws.s3.Bucket(`${namePrefix}-assets`, { ... });
new aws.rds.Instance(`${namePrefix}-db`, { ... });
```

### Tagging Strategy
```typescript
const defaultTags = {
  Environment: env,
  Project: project,
  ManagedBy: "Pulumi",
  CostCenter: config.get("costCenter") || "engineering",
  CreatedAt: new Date().toISOString(),
};
```

### Resource Protection
```typescript
// Protect production databases from accidental deletion
const db = new aws.rds.Instance("prod-db", { ... }, {
  protect: env === "production",
  retainOnDelete: env === "production",
});
```

### Error Handling
```typescript
try {
  const bucket = new aws.s3.Bucket("critical", { ... });
} catch (err) {
  // Handle bucket name collision or permission errors
  pulumi.log.error(`Failed to create bucket: ${err}`);
}
```
