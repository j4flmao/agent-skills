# Controller Runtime Deep Dive

controller-runtime is the foundational library for building Kubernetes controllers, providing Manager, Controller, Reconciler, Client, Cache, and informer abstractions.

## Manager

The Manager manages shared dependencies and controller lifecycle:

```go
import (
    "k8s.io/apimachinery/pkg/runtime"
    utilruntime "k8s.io/apimachinery/pkg/util/runtime"
    clientgoscheme "k8s.io/client-go/kubernetes/scheme"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/healthz"
    "sigs.k8s.io/controller-runtime/pkg/metrics/server"
)

func main() {
    scheme := runtime.NewScheme()
    utilruntime.Must(clientgoscheme.AddToScheme(scheme))
    
    mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
        Scheme: scheme,
        Metrics: server.Options{
            BindAddress: ":8080",
        },
        HealthProbeBindAddress: ":8081",
        LeaderElection: true,
        LeaderElectionID: "my-operator.example.com",
        Cache: cache.Options{
            DefaultNamespaces: map[string]cache.Config{
                "my-namespace": {},
            },
        },
    })
    if err != nil {
        setupLog.Error(err, "unable to start manager")
        os.Exit(1)
    }
    
    if err := mgr.AddHealthzCheck("healthz", healthz.Ping); err != nil {
        setupLog.Error(err, "unable to set up health check")
        os.Exit(1)
    }
    if err := mgr.AddReadyzCheck("readyz", healthz.Ping); err != nil {
        setupLog.Error(err, "unable to set up ready check")
        os.Exit(1)
    }
    
    setupLog.Info("starting manager")
    if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
        setupLog.Error(err, "problem running manager")
        os.Exit(1)
    }
}
```

## Controller Setup

Register controllers with the Manager:

```go
import (
    "sigs.k8s.io/controller-runtime/pkg/controller"
    "sigs.k8s.io/controller-runtime/pkg/handler"
    "sigs.k8s.io/controller-runtime/pkg/source"
)

func main() {
    // ...
    
    if err := ctrl.NewControllerManagedBy(mgr).
        For(&examplev1.MyApp{}).
        Owns(&appsv1.Deployment{}).
        Watches(
            &source.Kind{Type: &corev1.ConfigMap{}},
            handler.EnqueueRequestsFromMapFunc(func(ctx context.Context, obj client.Object) []reconcile.Request {
                return []reconcile.Request{
                    {NamespacedName: types.NamespacedName{
                        Name:      "myapp-instance",
                        Namespace: obj.GetNamespace(),
                    }},
                }
            }),
        ).
        WithOptions(controller.Options{
            MaxConcurrentReconciles: 5,
            RateLimiter: workqueue.DefaultControllerRateLimiter(),
        }).
        Complete(&MyAppReconciler{
            Client: mgr.GetClient(),
            Scheme: mgr.GetScheme(),
        })
}
```

## Reconciler Interface

```go
type Reconciler interface {
    Reconcile(context.Context, Request) (Result, error)
}

type Result struct {
    Requeue      bool
    RequeueAfter time.Duration
}
```

## Client

The client reads from cache and writes directly to API server:

```go
type Client interface {
    Get(ctx context.Context, key ObjectKey, obj Object, opts ...GetOption) error
    List(ctx context.Context, list ObjectList, opts ...ListOption) error
    Create(ctx context.Context, obj Object, opts ...CreateOption) error
    Update(ctx context.Context, obj Object, opts ...UpdateOption) error
    Delete(ctx context.Context, obj Object, opts ...DeleteOption) error
    Patch(ctx context.Context, obj Object, patch Patch, opts ...PatchOption) error
    DeleteAllOf(ctx context.Context, obj Object, opts ...DeleteAllOfOption) error
    Status() StatusWriter
}
```

## Cache and Informers

The cache stores Kubernetes objects and watches for changes:

```go
import (
    "sigs.k8s.io/controller-runtime/pkg/cache"
    "sigs.k8s.io/controller-runtime/pkg/client"
)

func (r *MyReconciler) setupCache(ctx context.Context) error {
    informer, err := r.Informer(ctx, &corev1.Pod{})
    if err != nil {
        return err
    }
    
    informer.AddEventHandler(cache.ResourceEventHandlerFuncs{
        AddFunc: func(obj interface{}) {
            logger.Info("pod added", "pod", obj)
        },
        UpdateFunc: func(oldObj, newObj interface{}) {
            logger.Info("pod updated")
        },
        DeleteFunc: func(obj interface{}) {
            logger.Info("pod deleted")
        },
    })
    return nil
}
```

## Leader Election

```go
mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
    LeaderElection:          true,
    LeaderElectionID:        "my-operator.example.com",
    LeaderElectionNamespace: "my-namespace",
    LeaseDuration:           &leaseDuration,
    RenewDeadline:           &renewDeadline,
    RetryPeriod:             &retryPeriod,
})
```

## Event Filters

```go
import (
    "sigs.k8s.io/controller-runtime/pkg/predicate"
)

func main() {
    // ...
    
    if err := ctrl.NewControllerManagedBy(mgr).
        For(&examplev1.MyApp{}, builder.WithPredicates(
            predicate.GenerationChangedPredicate{},
        )).
        Complete(reconciler)
}
```

## Webhook Integration

```go
import (
    "sigs.k8s.io/controller-runtime/pkg/webhook"
    "sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

func main() {
    hookServer := mgr.GetWebhookServer()
    hookServer.Register("/mutate-v1-pod", &webhook.Admission{
        Handler: &PodMutator{Client: mgr.GetClient()},
    })
    hookServer.Register("/validate-v1-pod", &webhook.Admission{
        Handler: &PodValidator{Client: mgr.GetClient()},
    })
}
```

## Key Components Summary

| Component | Purpose |
|-----------|---------|
| Manager | Shared dependencies, lifecycle, leader election |
| Controller | Watch sources, enqueue events, manage work queue |
| Reconciler | Business logic: diff desired vs actual state |
| Client | Read from cache, write to API server |
| Cache | Local store of K8s objects, watches for changes |
| Informer | List/Watch per resource type, event handlers |
| Work Queue | Rate-limited, retry-enabled event queue |
| Webhook Server | Admission and mutation webhooks |

controller-runtime abstracts Kubernetes API machinery complexity, providing a clean foundation for building production-grade controllers.
