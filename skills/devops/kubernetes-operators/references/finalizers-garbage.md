# Finalizers, Garbage Collection, and Owner References

Kubernetes uses owner references and finalizers to manage resource lifecycle and cleanup.

## Owner References

Owner references cascade deletions from parent to child resources:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
  uid: 1234-5678-abcd
---
apiVersion: v1
kind: ConfigMap
metadata:
  name: myapp-config
  ownerReferences:
    - apiVersion: apps/v1
      kind: Deployment
      name: myapp
      uid: 1234-5678-abcd
      controller: true
      blockOwnerDeletion: true
```

### Setting in Go

```go
import (
    "sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
)

func (r *MyAppReconciler) buildDeployment(cr *examplev1.MyApp) *appsv1.Deployment {
    dep := &appsv1.Deployment{
        ObjectMeta: metav1.ObjectMeta{
            Name:      cr.Name,
            Namespace: cr.Namespace,
        },
        Spec: appsv1.DeploymentSpec{...},
    }
    
    if err := controllerutil.SetOwnerReference(cr, dep, r.Scheme); err != nil {
        return nil
    }
    return dep
}
```

## Finalizers

Finalizers block deletion until cleanup completes:

```go
const myFinalizer = "finalizer.example.com"

func (r *MyAppReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    var cr examplev1.MyApp
    if err := r.Get(ctx, req.NamespacedName, &cr); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }
    
    if cr.GetDeletionTimestamp().IsZero() {
        if !controllerutil.ContainsFinalizer(&cr, myFinalizer) {
            controllerutil.AddFinalizer(&cr, myFinalizer)
            if err := r.Update(ctx, &cr); err != nil {
                return ctrl.Result{}, err
            }
        }
    } else {
        if controllerutil.ContainsFinalizer(&cr, myFinalizer) {
            if err := r.cleanupExternalResources(ctx, &cr); err != nil {
                return ctrl.Result{}, err
            }
            controllerutil.RemoveFinalizer(&cr, myFinalizer)
            if err := r.Update(ctx, &cr); err != nil {
                return ctrl.Result{}, err
            }
        }
        return ctrl.Result{}, nil
    }
    
    // Normal reconciliation
    return r.reconcileResources(ctx, &cr)
}
```

### Finalizer in YAML

```yaml
apiVersion: example.com/v1
kind: MyApp
metadata:
  name: my-instance
  finalizers:
    - my-operator.example.com/cleanup
spec:
  replicas: 3
```

## Garbage Collection Policies

### Foreground Deletion (default)

```yaml
metadata:
  ownerReferences:
    - apiVersion: apps/v1
      kind: Deployment
      name: myapp
      uid: 1234
      blockOwnerDeletion: true
```

Foreground deletion makes children dependents wait for deletion propagation.

### Background Deletion

```go
if err := r.Delete(ctx, &cr, client.PropagationPolicy(metav1.DeletePropagationBackground)); err != nil {
    return ctrl.Result{}, err
}
```

### Orphan Deletion

```go
if err := r.Delete(ctx, &cr, client.PropagationPolicy(metav1.DeletePropagationOrphan)); err != nil {
    return ctrl.Result{}, err
}
```

## Cleanup Logic Pattern

```go
func (r *MyAppReconciler) cleanupExternalResources(ctx context.Context, cr *examplev1.MyApp) error {
    logger := log.FromContext(ctx)
    
    if cr.Spec.DatabaseName != "" {
        logger.Info("dropping database", "db", cr.Spec.DatabaseName)
        if err := r.dropDatabase(cr.Spec.DatabaseName); err != nil {
            return fmt.Errorf("failed to drop database: %w", err)
        }
    }
    
    if cr.Spec.BucketName != "" {
        logger.Info("deleting S3 bucket", "bucket", cr.Spec.BucketName)
        if err := r.deleteS3Bucket(cr.Spec.BucketName); err != nil {
            return fmt.Errorf("failed to delete bucket: %w", err)
        }
    }
    
    logger.Info("cleanup complete")
    return nil
}
```

## Blocking vs Non-Blocking Finalizers

| Type | Behavior | Use Case |
|------|----------|----------|
| Blocking | Resource stays until removed | External resource cleanup |
| Non-blocking | Finalizer self-removes | Logging, metrics |
| Cascading | Blocks children deletion | Hierarchical cleanup |

## Owner Reference vs Finalizer

| Mechanism | Purpose | Direction |
|-----------|---------|-----------|
| Owner Reference | Cascade deletion | Parent → Child |
| Finalizer | Block deletion until cleanup | Self-referencing |

## Testing Finalizer Logic

```go
func TestFinalizerCleanup(t *testing.T) {
    cr := &examplev1.MyApp{
        ObjectMeta: metav1.ObjectMeta{
            Name:              "test-instance",
            Namespace:         "default",
            Finalizers:        []string{myFinalizer},
            DeletionTimestamp: &metav1.Time{Time: time.Now()},
        },
    }
    
    result, err := reconciler.Reconcile(ctx, ctrl.Request{
        NamespacedName: types.NamespacedName{
            Name:      "test-instance",
            Namespace: "default",
        },
    })
    
    assert.NoError(t, err)
    assert.False(t, result.Requeue)
}
```

## Best Practices

- Always remove finalizers after successful cleanup, or the resource will be stuck
- Use `controllerutil.AddFinalizer` and `controllerutil.RemoveFinalizer` helpers
- Never remove finalizers owned by other controllers
- Check `DeletionTimestamp.IsZero()` before applying finalizers
- Use `IgnoreNotFound` when deleting resources during cleanup
- Test finalizer behavior in envtest to avoid stuck resources in production

Proper finalizer and owner reference management ensures clean resource lifecycle and prevents resource leaks in your operator.
