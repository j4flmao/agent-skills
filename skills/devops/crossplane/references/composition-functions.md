# Crossplane Composition Functions

## Overview

Composition Functions extend Crossplane with programmatic logic written in general-purpose languages (Go, Python, TypeScript). Unlike the declarative patch/transform system, functions allow arbitrary computation, external API calls, and complex decision-making during composition.

## Architecture

```
                    ┌──────────────┐
                    │  Composition │
                    │  (Function)  │
                    └──────┬───────┘
                           │ gRPC
                    ┌──────▼───────┐
                    │  Crossplane  │
                    │  Core        │
                    │              │
                    │ RunFunction  │
                    │ Request      │
                    │              │
                    │ RunFunction  │
                    │ Response     │
                    └──────┬───────┘
                           │
              ┌────────────┼────────────┐
              │            │            │
         ┌────▼───┐  ┌────▼───┐  ┌────▼───┐
         │Mgd Res │  │Mgd Res │  │Mgd Res │
         │   A    │  │   B    │  │   C    │
         └────────┘  └────────┘  └────────┘
```

## Function Deployment Models

### Container Functions
Functions run as sidecar containers alongside Crossplane.

```yaml
apiVersion: pkg.crossplane.io/v1
kind: Function
metadata:
  name: function-custom-logic
spec:
  package: xpkg.upbound.io/my-org/function-custom-logic:v0.1.0
```

### gRPC Functions
Functions communicate via gRPC with Crossplane core.

```protobuf
service CompositionFunctionService {
  rpc RunFunction(RunFunctionRequest) returns (RunFunctionResponse);
}
```

## Go Functions

### Using the Go SDK
```go
package main

import (
    "github.com/crossplane/function-sdk-go"
    "github.com/crossplane/function-sdk-go/request"
    "github.com/crossplane/function-sdk-go/response"
)

func main() {
    if err := function.Serve(&Function{}); err != nil {
        panic(err)
    }
}

type Function struct{}

func (f *Function) RunFunction(req *request.Request) (*response.Response, error) {
    rsp := response.New(req)

    // Get desired composite resource
    composite := req.GetCompositeResource()

    // Get observed composed resources
    observed := req.GetObservedComposedResources()

    // Read function input parameters
    input := req.GetFunctionInput()

    // Custom logic: validate, transform, enrich
    env := composite.Resource.GetString("spec.parameters.environment")
    region := composite.Resource.GetString("spec.parameters.region")

    // Set defaults
    if env == "" {
        env = "development"
    }

    // Create desired composed resources
    desired := rsp.GetDesiredComposedResources()

    switch env {
    case "development":
        // Minimal resources for dev
        desired.AddResource("rds-instance", createSmallRDS(region))
    case "production":
        // Full HA setup for prod
        desired.AddResource("rds-instance", createLargeRDS(region))
        desired.AddResource("rds-replica", createReadReplica(region))
        desired.AddResource("elasticache", createCacheCluster(region))
    }

    // Set connection details
    rsp.SetConnectionDetails(map[string][]byte{
        "host":     []byte("database.example.com"),
        "port":     []byte("5432"),
    })

    return rsp, nil
}

func createSmallRDS(region string) *unstructured.Unstructured {
    return &unstructured.Unstructured{
        Object: map[string]interface{}{
            "apiVersion": "rds.aws.upbound.io/v1beta1",
            "kind":       "Instance",
            "spec": map[string]interface{}{
                "forProvider": map[string]interface{}{
                    "region":           region,
                    "engine":           "postgres",
                    "dbInstanceClass":  "db.t3.small",
                    "allocatedStorage": 20,
                },
            },
        },
    }
}
```

### Testing Go Functions
```go
package main

import (
    "testing"
    "github.com/crossplane/function-sdk-go/resource"
    "github.com/crossplane/function-sdk-go/request"
    "github.com/google/go-cmp/cmp"
)

func TestRunFunction_DevEnvironment(t *testing.T) {
    fn := &Function{}

    req := request.New()
    req.SetCompositeResource(&resource.Composite{
        Object: map[string]interface{}{
            "spec": map[string]interface{}{
                "parameters": map[string]interface{}{
                    "environment": "development",
                    "region":      "us-east-1",
                },
            },
        },
    })

    rsp, err := fn.RunFunction(req)
    if err != nil {
        t.Fatalf("RunFunction() error = %v", err)
    }

    desired := rsp.GetDesiredComposedResources()
    if len(desired) != 1 {
        t.Errorf("Expected 1 resource for dev, got %d", len(desired))
    }

    // Verify RDS instance has small instance class
    for _, r := range desired {
        instanceClass := r.Resource.GetString("spec.forProvider.dbInstanceClass")
        if instanceClass != "db.t3.small" {
            t.Errorf("Expected db.t3.small, got %s", instanceClass)
        }
    }
}

func TestRunFunction_ProductionEnvironment(t *testing.T) {
    fn := &Function{}

    req := request.New()
    req.SetCompositeResource(&resource.Composite{
        Object: map[string]interface{}{
            "spec": map[string]interface{}{
                "parameters": map[string]interface{}{
                    "environment": "production",
                    "region":      "us-east-1",
                },
            },
        },
    })

    rsp, err := fn.RunFunction(req)
    if err != nil {
        t.Fatalf("RunFunction() error = %v", err)
    }

    desired := rsp.GetDesiredComposedResources()
    if len(desired) != 3 {
        t.Errorf("Expected 3 resources for prod, got %d", len(desired))
    }
}
```

## Python Functions

### Using the Python SDK
```python
import crossplane.function as fn
from crossplane.function import resource, request, response


class CustomFunction(fn.CompositionFunction):
    def run_function(self, req: request.Request) -> response.Response:
        rsp = response.Response(req)

        composite = req.composite_resource
        parameters = composite["spec"].get("parameters", {})
        env = parameters.get("environment", "development")
        region = parameters.get("region", "us-east-1")
        storage_gb = parameters.get("storageGB", 20)

        if env == "production":
            # Production: HA with replica
            rsp.desired.composed["rds-primary"] = resource.Composed(
                api_version="rds.aws.upbound.io/v1beta1",
                kind="Instance",
                spec={
                    "forProvider": {
                        "region": region,
                        "engine": "postgres",
                        "engineVersion": "15.3",
                        "dbInstanceClass": "db.r5.large",
                        "allocatedStorage": storage_gb,
                        "multiAZ": True,
                        "backupRetentionPeriod": 30,
                        "deletionProtection": True,
                    }
                },
            )

            rsp.desired.composed["rds-replica"] = resource.Composed(
                api_version="rds.aws.upbound.io/v1beta1",
                kind="Instance",
                spec={
                    "forProvider": {
                        "region": f"{region}a",
                        "engine": "postgres",
                        "dbInstanceClass": "db.r5.large",
                        "sourceDbInstanceIdentifier": None,
                    }
                },
            )
        else:
            # Dev: single instance, no protection
            rsp.desired.composed["rds-instance"] = resource.Composed(
                api_version="rds.aws.upbound.io/v1beta1",
                kind="Instance",
                spec={
                    "forProvider": {
                        "region": region,
                        "engine": "postgres",
                        "dbInstanceClass": "db.t3.small",
                        "allocatedStorage": 20,
                    }
                },
            )

        return rsp


if __name__ == "__main__":
    fn.serve(CustomFunction())
```

### Testing Python Functions
```python
import pytest
from crossplane.function import request
from my_function import CustomFunction


def test_dev_environment():
    fn = CustomFunction()
    req = request.Request(
        composite_resource={
            "spec": {
                "parameters": {
                    "environment": "development",
                    "region": "us-west-2",
                }
            }
        },
    )

    rsp = fn.run_function(req)
    assert len(rsp.desired.composed) == 1
    assert "rds-instance" in rsp.desired.composed


def test_production_environment():
    fn = CustomFunction()
    req = request.Request(
        composite_resource={
            "spec": {
                "parameters": {
                    "environment": "production",
                    "region": "eu-west-1",
                    "storageGB": 500,
                }
            }
        },
    )

    rsp = fn.run_function(req)
    assert len(rsp.desired.composed) == 2
    assert rsp.desired.composed["rds-primary"]["spec"]["forProvider"]["multiAZ"] is True


def test_defaults():
    fn = CustomFunction()
    req = request.Request(
        composite_resource={
            "spec": {
                "parameters": {},
            }
        },
    )

    rsp = fn.run_function(req)
    assert rsp.desired.composed["rds-instance"]["spec"]["forProvider"]["dbInstanceClass"] == "db.t3.small"
```

## TypeScript Functions

### Using the TypeScript SDK
```typescript
import { Function, serve } from '@crossplane/function-sdk-ts';
import { RunFunctionRequest, RunFunctionResponse } from '@crossplane/function-sdk-ts/proto/v1';

class MyFunction implements Function {
  async runFunction(req: RunFunctionRequest): Promise<RunFunctionResponse> {
    const composite = req.observed?.composite?.resource;
    const params = composite?.spec?.parameters || {};
    const env = params.environment || 'development';
    const region = params.region || 'us-east-1';
    const storageGB = params.storageGB || 20;

    const desired: Record<string, any> = {};

    if (env === 'production') {
      desired['rds-primary'] = {
        apiVersion: 'rds.aws.upbound.io/v1beta1',
        kind: 'Instance',
        spec: {
          forProvider: {
            region,
            engine: 'postgres',
            dbInstanceClass: 'db.r5.large',
            allocatedStorage: storageGB,
            multiAZ: true,
            backupRetentionPeriod: 30,
            deletionProtection: true,
          },
        },
      };

      desired['rds-replica'] = {
        apiVersion: 'rds.aws.upbound.io/v1beta1',
        kind: 'Instance',
        spec: {
          forProvider: {
            region: `${region}a`,
            engine: 'postgres',
            dbInstanceClass: 'db.r5.large',
          },
        },
      };
    } else {
      desired['rds-instance'] = {
        apiVersion: 'rds.aws.upbound.io/v1beta1',
        kind: 'Instance',
        spec: {
          forProvider: {
            region,
            engine: 'postgres',
            dbInstanceClass: 'db.t3.small',
            allocatedStorage: Math.min(storageGB, 20),
          },
        },
      };
    }

    return {
      desired: {
        resources: desired,
      },
      connectionDetails: {
        host: Buffer.from('database.example.com'),
        port: Buffer.from('5432'),
      },
    };
  }
}

serve(new MyFunction());
```

## Composition with Function Pipeline

```yaml
apiVersion: apiextensions.crossplane.io/v1
kind: Composition
metadata:
  name: function-pipeline-composition
spec:
  compositeTypeRef:
    apiVersion: database.example.org/v1alpha1
    kind: XPostgreSQLInstance

  # Use pipeline mode instead of resources mode
  mode: Pipeline

  pipeline:
  - step: 1
    functionRef:
      name: function-auto-ready
    input:
      apiVersion: auto-ready.fn.crossplane.io/v1alpha1
      kind: AutoReady

  - step: 2
    functionRef:
      name: function-custom-logic
    input:
      apiVersion: custom-logic.fn.example.org/v1alpha1
      kind: CustomLogic
      spec:
        defaultStorageGB: 20
        productionProtection: true

  - step: 3
    functionRef:
      name: function-patch-and-transform
    input:
      apiVersion: pt.fn.crossplane.io/v1beta1
      kind: Resources
      spec:
        resources:
        - name: security-group
          base:
            apiVersion: ec2.aws.upbound.io/v1beta1
            kind: SecurityGroup
            spec:
              forProvider:
                ingress:
                - fromPort: 5432
                  toPort: 5432
                  protocol: tcp
```

## Composition Function Best Practices

1. **Stateless**: Functions should be stateless — all state comes from the request.
2. **Deterministic**: Same input should always produce the same output.
3. **Fast**: Keep function execution under 30 seconds; use external APIs sparingly.
4. **Idempotent**: Multiple invocations with same inputs should produce same results.
5. **Resource Limits**: Set CPU/memory limits on function containers.
6. **Testing**: Write unit tests for all logic paths (dev, staging, prod).
7. **Error Handling**: Return clear error messages for invalid inputs.
8. **Versioning**: Version functions independently from compositions.
9. **Observability**: Add structured logging and metrics in functions.
10. **Input Validation**: Always validate function input parameters before processing.
