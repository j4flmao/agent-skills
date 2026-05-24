# Operator SDK Guide

The Operator SDK provides frameworks for building Kubernetes operators using Go, Ansible, or Helm.

## Operator Types

| Type | Language | Use Case | Learning Curve |
|------|----------|----------|----------------|
| Go | Golang | Complex logic, high performance | Steep |
| Ansible | YAML/Playbooks | Configuration management | Moderate |
| Helm | Helm charts | Simple deployment automation | Low |

## Scaffolding a Go Operator

```bash
# Install Operator SDK
curl -Lo operator-sdk https://github.com/operator-framework/operator-sdk/releases/download/v1.35.0/operator-sdk_linux_amd64

# Initialize project
operator-sdk init --domain=example.com --repo=github.com/org/my-operator

# Create API and controller
operator-sdk create api \
  --group=cache \
  --version=v1alpha1 \
  --kind=MyApp \
  --resource=true \
  --controller=true
```

## Project Structure

```
my-operator/
├── api/
│   └── v1alpha1/
│       ├── myapp_types.go        # CRD spec and status types
│       ├── myapp_webhook.go      # admission/mutation webhooks
│       └── zz_generated.deepcopy.go  # auto-generated deep copy methods
├── config/
│   ├── crd/                      # generated CRD manifests
│   ├── manager/                  # controller Deployment, ServiceAccount
│   ├── rbac/                     # ClusterRole, ClusterRoleBinding
│   ├── samples/                  # example CRs
│   └── webhook/                  # webhook configuration
├── controllers/
│   ├── myapp_controller.go       # reconciliation logic
│   └── suite_test.go             # envtest test suite
├── Dockerfile                    # multi-stage build
├── Makefile                      # build, test, deploy targets
├── go.mod / go.sum
└── main.go                       # entry point, Manager setup
```

## Controller Structure

```go
package controllers

import (
    "context"
    "fmt"
    "time"

    appsv1 "k8s.io/api/apps/v1"
    corev1 "k8s.io/api/core/v1"
    "k8s.io/apimachinery/pkg/api/errors"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
    "sigs.k8s.io/controller-runtime/pkg/log"

    examplev1alpha1 "github.com/org/my-operator/api/v1alpha1"
)

type MyAppReconciler struct {
    client.Client
    Scheme *runtime.Scheme
}

func (r *MyAppReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    logger := log.FromContext(ctx)
    
    var myapp examplev1alpha1.MyApp
    if err := r.Get(ctx, req.NamespacedName, &myapp); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }
    
    desiredDeployment := r.buildDeployment(&myapp)
    if err := r.applyDeployment(ctx, &myapp, desiredDeployment); err != nil {
        return ctrl.Result{}, err
    }
    
    desiredService := r.buildService(&myapp)
    if err := r.applyService(ctx, &myapp, desiredService); err != nil {
        return ctrl.Result{}, err
    }
    
    if err := r.updateStatus(ctx, &myapp); err != nil {
        return ctrl.Result{}, err
    }
    
    return ctrl.Result{RequeueAfter: 30 * time.Second}, nil
}
```

## Watches (Ansible Operator)

```yaml
# watches.yaml
- version: v1alpha1
  group: example.com
  kind: MyApp
  playbook: /opt/ansible/playbook.yml
  vars:
    greeting: Hello from Ansible
  reconcilePeriod: 30s
  manageStatus: true
  watchDependentResources: true
```

## Helm Operator

```yaml
# watches.yaml
- version: v1alpha1
  group: example.com
  kind: MyApp
  chart: /opt/helm/myapp-chart
  reconcilePeriod: 60s
  overrideValues:
    image:
      tag: latest
  watchDependentResources: true
  maxConcurrentReconciles: 3
```

## Reconciliation Loop Pattern

```go
func (r *MyAppReconciler) reconcile(ctx context.Context, cr *examplev1alpha1.MyApp) error {
    desired := r.buildResources(cr)
    current, err := r.getCurrentResources(ctx, cr)
    if err != nil {
        return err
    }
    diffs := diffResources(desired, current)
    for _, d := range diffs {
        switch d.Action {
        case "create":
            if err := r.Create(ctx, d.Resource); err != nil {
                return err
            }
        case "update":
            if err := r.Update(ctx, d.Resource); err != nil {
                return err
            }
        case "delete":
            if err := r.Delete(ctx, d.Resource); err != nil {
                return err
            }
        }
    }
    return r.updateStatus(ctx, cr)
}
```

## Common Patterns

| Pattern | Implementation |
|---------|---------------|
| Create or Update | `controllerutil.CreateOrUpdate` |
| Delete with cleanup | Finalizer pattern |
| Dependency management | Requeue on missing dependencies |
| Status updates | Separate subreconciler |
| Rate limiting | Work queue with rate limiter |

## Building and Deploying

```bash
# Build and push
make docker-build docker-push IMG=registry.example.com/my-operator:v1.0.0

# Deploy
make deploy IMG=registry.example.com/my-operator:v1.0.0

# Run locally (outside cluster)
make run

# Run tests
make test
```

The Operator SDK abstracts away much of the boilerplate, letting you focus on business logic while providing production-ready scaffolding.
