# Pulumi Kubernetes Provider

## Overview

Pulumi's Kubernetes provider manages Kubernetes resources natively. Unlike Helm-only approaches, it supports the full Kubernetes resource model as typed resources in any Pulumi-supported language.

## Provider Configuration

### Basic Setup
```typescript
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

// Using kubeconfig file
const k8sProvider = new k8s.Provider("k8s", {
  kubeconfig: kubeconfigContent,
  namespace: "default",
});

// Using context from current kubeconfig
const provider = new k8s.Provider("k8s", {
  context: "my-cluster",
});

// Using service account (in-cluster)
const inClusterProvider = new k8s.Provider("k8s", {});
```

### EKS-Specific Provider
```typescript
import * as aws from "@pulumi/aws";
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";

const cluster = new aws.eks.Cluster("app", { ... });

const kubeconfig = pulumi.all([cluster.endpoint, cluster.certificateAuthority, cluster.name]).
  apply(([endpoint, ca, name]) => {
    return JSON.stringify({
      apiVersion: "v1",
      clusters: [{ cluster: { server: endpoint, "certificate-authority-data": ca.data }, name }],
      contexts: [{ context: { cluster: name, user: "aws" }, name }],
      "current-context": name,
      kind: "Config",
      users: [{ name: "aws", user: { exec: { apiVersion: "client.authentication.k8s.io/v1beta1", command: "aws", args: ["eks", "get-token", "--cluster-name", name] } } }],
    });
  });

const provider = new k8s.Provider("eks", {
  kubeconfig: kubeconfig,
});
```

## Native Kubernetes Resources

### Namespace
```typescript
const ns = new k8s.core.v1.Namespace("team-apps", {
  metadata: {
    name: "team-apps",
    labels: { "team": "platform", "environment": "prod" },
    annotations: { "sla": "critical" },
  },
});
```

### Deployment and Service
```typescript
import * as k8s from "@pulumi/kubernetes";

const appLabels = { app: "nginx", version: "1.25" };

const deployment = new k8s.apps.v1.Deployment("nginx", {
  metadata: { namespace: ns.metadata.name },
  spec: {
    replicas: 3,
    selector: { matchLabels: appLabels },
    template: {
      metadata: { labels: appLabels },
      spec: {
        containers: [{
          name: "nginx",
          image: "nginx:1.25-alpine",
          ports: [{ containerPort: 80 }],
          resources: {
            requests: { cpu: "100m", memory: "128Mi" },
            limits: { cpu: "500m", memory: "256Mi" },
          },
          readinessProbe: {
            httpGet: { path: "/", port: 80 },
            initialDelaySeconds: 5,
          },
          livenessProbe: {
            httpGet: { path: "/", port: 80 },
            periodSeconds: 10,
          },
        }],
        affinity: {
          podAntiAffinity: {
            preferredDuringSchedulingIgnoredDuringExecution: [{
              weight: 100,
              podAffinityTerm: {
                labelSelector: { matchLabels: appLabels },
                topologyKey: "kubernetes.io/hostname",
              },
            }],
          },
        },
        topologySpreadConstraints: [{
          maxSkew: 1,
          topologyKey: "topology.kubernetes.io/zone",
          whenUnsatisfiable: "ScheduleAnyway",
          labelSelector: { matchLabels: appLabels },
        }],
      },
    },
  },
}, { provider });

const service = new k8s.core.v1.Service("nginx-svc", {
  metadata: {
    namespace: ns.metadata.name,
    annotations: {
      "service.beta.kubernetes.io/aws-load-balancer-type": "nlb-ip",
      "service.beta.kubernetes.io/aws-load-balancer-scheme": "internal",
    },
  },
  spec: {
    selector: appLabels,
    ports: [{ port: 80, targetPort: 80, protocol: "TCP" }],
    type: "LoadBalancer",
  },
}, { provider });
```

### ConfigMap and Secret
```typescript
import * as k8s from "@pulumi/kubernetes";

const configMap = new k8s.core.v1.ConfigMap("app-config", {
  metadata: { namespace: ns.metadata.name },
  data: {
    "app.properties": `log.level=INFO
metrics.enabled=true
cache.ttl=300`,
  },
});

const secret = new k8s.core.v1.Secret("db-creds", {
  metadata: { namespace: ns.metadata.name },
  stringData: {
    DB_HOST: "postgres.internal",
    DB_PORT: "5432",
    DB_USER: "app_user",
    DB_PASSWORD: pulumi.secret("s3cur3p@ss"), // encrypted in state
  },
}, { provider });
```

### Ingress
```typescript
new k8s.networking.v1.Ingress("app-ingress", {
  metadata: {
    namespace: ns.metadata.name,
    annotations: {
      "kubernetes.io/ingress.class": "nginx",
      "cert-manager.io/cluster-issuer": "letsencrypt-prod",
      "nginx.ingress.kubernetes.io/ssl-redirect": "true",
      "nginx.ingress.kubernetes.io/rate-limit": "100r/s",
    },
  },
  spec: {
    tls: [{ hosts: ["app.example.com"], secretName: "app-tls" }],
    rules: [{
      host: "app.example.com",
      http: {
        paths: [{
          path: "/api",
          pathType: "Prefix",
          backend: {
            service: { name: service.metadata.name, port: { number: 80 } },
          },
        }],
      },
    }],
  },
}, { provider });
```

## Helm Charts

### Basic Helm Chart
```typescript
import * as k8s from "@pulumi/kubernetes";

const certManager = new k8s.helm.v3.Chart("cert-manager", {
  chart: "cert-manager",
  repositoryOpts: {
    repo: "https://charts.jetstack.io",
  },
  version: "1.14.5",
  namespace: "cert-manager",
  createNamespace: true,
  values: {
    installCRDs: true,
    replicaCount: 2,
    tolerations: [{ key: "CriticalAddonsOnly", operator: "Exists" }],
    webhook: { tolerations: [{ key: "CriticalAddonsOnly", operator: "Exists" }] },
  },
}, { provider, protect: false });

// Access values from chart
const cmResources = certManager.getResource("v1/Namespace", "cert-manager", "cert-manager");
```

### Helm Chart with Custom Values
```typescript
const ingressNginx = new k8s.helm.v3.Chart("ingress-nginx", {
  chart: "ingress-nginx",
  repositoryOpts: {
    repo: "https://kubernetes.github.io/ingress-nginx",
  },
  version: "4.9.1",
  namespace: "ingress-nginx",
  values: {
    controller: {
      service: {
        type: "LoadBalancer",
        annotations: {
          "service.beta.kubernetes.io/aws-load-balancer-type": "nlb",
          "service.beta.kubernetes.io/aws-load-balancer-scheme": "internet-facing",
        },
      },
      config: {
        "use-forwarded-headers": "true",
        "proxy-body-size": "10m",
        "ssl-redirect": "true",
      },
      autoscaling: {
        enabled: true,
        minReplicas: 2,
        maxReplicas: 10,
        targetCPUUtilizationPercentage: 70,
      },
      resources: {
        requests: { cpu: "200m", memory: "500Mi" },
        limits: { cpu: "1", memory: "1Gi" },
      },
    },
    defaultBackend: { enabled: true },
  },
}, { provider });
```

## Custom Resource Definitions (CRDs)

### Creating CRDs and CRs
```typescript
import * as k8s from "@pulumi/kubernetes";
import * as pulumi from "@pulumi/pulumi";
import * as random from "@pulumi/random";

// Create a CRD
const crd = new k8s.apiextensions.v1.CustomResourceDefinition("database-crd", {
  metadata: { name: "databases.mycompany.io" },
  spec: {
    group: "mycompany.io",
    names: {
      kind: "Database",
      listKind: "DatabaseList",
      plural: "databases",
      singular: "database",
    },
    scope: "Namespaced",
    versions: [{
      name: "v1",
      served: true,
      storage: true,
      schema: { openAPIV3Schema: { type: "object", properties: { spec: { type: "object", properties: { engine: { type: "string" }, version: { type: "string" }, storageGB: { type: "integer" } } } } } },
      subresources: { status: {} },
    }],
  },
}, { provider });

// Create a custom resource
const password = new random.RandomPassword("db-pass", {
  length: 24,
  special: true,
});

const myDb = new k8s.apiextensions.CustomResource("my-db", {
  apiVersion: "mycompany.io/v1",
  kind: "Database",
  metadata: { namespace: ns.metadata.name },
  spec: {
    engine: "postgres",
    version: "15",
    storageGB: 50,
  },
}, {
  provider,
  dependsOn: [crd], // CRD must be established before CR
});
```

## Operator Pattern

### Deploying Operators
```typescript
// Deploy the Crossplane provider
const crossplaneProvider = new k8s.helm.v3.Chart("crossplane-provider-aws", {
  chart: "provider-aws",
  repositoryOpts: {
    repo: "https://charts.crossplane.io/stable",
  },
  version: "v1.4.0",
  namespace: "crossplane-system",
  values: {
    package: {
      pullPolicy: "IfNotPresent",
    },
  },
}, { provider, dependsOn: [crossplaneSystem] });

// Deploy a Prometheus Operator
const kubePromStack = new k8s.helm.v3.Chart("kube-prometheus-stack", {
  chart: "kube-prometheus-stack",
  repositoryOpts: {
    repo: "https://prometheus-community.github.io/helm-charts",
  },
  version: "56.0.0",
  namespace: "monitoring",
  values: {
    grafana: {
      persistence: { enabled: true, size: "10Gi" },
      ingress: { enabled: true, hosts: ["grafana.example.com"] },
    },
    prometheus: {
      prometheusSpec: {
        retention: "30d",
        retentionSize: "50GB",
        resources: { requests: { cpu: "500m", memory: "2Gi" } },
      },
    },
  },
}, { provider });
```

## Best Practices

### Resource Ordering
```typescript
// Use dependsOn for explicit ordering
const app = new k8s.apps.v1.Deployment("app", { ... }, {
  provider,
  dependsOn: [configMap, secret, service],
});

// Use apply for implicit ordering
const dbUrl = pulumi.interpolate`postgres://${secret.metadata.name}:5432/app`;
```

### Helm Chart Best Practices
1. Always pin chart versions to avoid unexpected upgrades.
2. Use `createNamespace: true` for isolated workloads.
3. Set resource limits on all Helm-installed controllers.
4. Use `repositoryOpts` with specific repo URL, not generic index.
5. Override values through code, not separate values files.

### Security
```typescript
// Never hardcode secrets
const apiKey = config.requireSecret("api-key");

const secret = new k8s.core.v1.Secret("api-key", {
  stringData: { API_KEY: apiKey },
});
```

### Namespace Management
```typescript
// Create namespaces per environment
const environments = ["dev", "staging", "prod"];
environments.forEach(env => {
  new k8s.core.v1.Namespace(env, {
    metadata: {
      name: `app-${env}`,
      labels: { environment: env, "istio-injection": "enabled" },
    },
  }, { provider });
});
```
