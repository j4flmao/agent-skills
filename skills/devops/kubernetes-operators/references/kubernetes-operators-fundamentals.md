# Kubernetes Operator Fundamentals: CRD Design and Reconciliation Principles

The core ideas behind operators: designing a Custom Resource Definition (spec/status split, validation, conditions), the level-triggered reconcile contract, ownership, and scaffolding a project with Kubebuilder. Library details are in `controller-runtime.md`; finalizers in `finalizers-garbage.md`; testing in `testing-operators.md`.

## When to Write an Operator

| Need | Better option |
|---|---|
| Package and configure an app | Helm chart / Kustomize |
| Run a one-off task | Job / CronJob |
| Encode operational knowledge (backups, failover, upgrades, scaling) continuously | Operator |
| Expose a higher-level API over many resources for platform users | Operator or composition tools (Crossplane, KRO) |

Operators are long-lived software with on-call implications; write one when continuous reconciliation of domain logic is required.

## API Design

```go
// api/v1alpha1/database_types.go
type DatabaseSpec struct {
    // +kubebuilder:validation:Enum=postgres;mysql
    Engine string `json:"engine"`
    // +kubebuilder:validation:Pattern=`^\d+(\.\d+)?$`
    Version string `json:"version"`
    // +kubebuilder:validation:Minimum=1
    // +kubebuilder:validation:Maximum=7
    // +kubebuilder:default=1
    Replicas int32 `json:"replicas,omitempty"`
    // +kubebuilder:validation:XValidation:rule="self == oldSelf",message="storageClass is immutable"
    StorageClass string `json:"storageClass"`
    Storage resource.Quantity `json:"storage"`
}

type DatabaseStatus struct {
    ObservedGeneration int64              `json:"observedGeneration,omitempty"`
    Conditions         []metav1.Condition `json:"conditions,omitempty" patchStrategy:"merge" patchMergeKey:"type"`
    ReadyReplicas      int32              `json:"readyReplicas,omitempty"`
    Endpoint           string             `json:"endpoint,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:printcolumn:name="Ready",type=string,JSONPath=`.status.conditions[?(@.type=="Ready")].status`
// +kubebuilder:printcolumn:name="Age",type=date,JSONPath=`.metadata.creationTimestamp`
type Database struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`
    Spec   DatabaseSpec   `json:"spec,omitempty"`
    Status DatabaseStatus `json:"status,omitempty"`
}
```

Design rules:
- `spec` is desired state written by users; `status` is observed state written only by the controller (status subresource).
- Validate in the schema: enums, ranges, patterns, defaults, and CEL rules (`x-kubernetes-validations`) for cross-field and immutability checks. Webhooks only for what schema/CEL cannot express.
- Use `metav1.Condition` with standard types (`Ready`, `Progressing`, `Degraded`) and `observedGeneration` so clients know whether status reflects the latest spec.
- Start at `v1alpha1`; API evolution and conversion are covered in `kubernetes-operators-advanced.md`.
- Keep specs declarative: "replicas: 3", not "action: scale-up".

## The Reconcile Contract

- Level-triggered: reconcile reads the current object and the world, computes the difference, and acts; it does not depend on which event triggered it.
- Idempotent: running reconcile twice with no changes performs no writes.
- Return quickly: no long blocking operations; requeue with a delay to poll external progress.
- Owns errors: returning an error requeues with exponential backoff.

```go
func (r *DatabaseReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    log := logf.FromContext(ctx)

    var db v1alpha1.Database
    if err := r.Get(ctx, req.NamespacedName, &db); err != nil {
        return ctrl.Result{}, client.IgnoreNotFound(err)
    }

    sts := desiredStatefulSet(&db)
    if err := controllerutil.SetControllerReference(&db, sts, r.Scheme); err != nil {
        return ctrl.Result{}, fmt.Errorf("set owner on statefulset %s: %w", sts.Name, err)
    }
    if err := r.Patch(ctx, sts, client.Apply, client.FieldOwner("database-operator"), client.ForceOwnership); err != nil {
        return ctrl.Result{}, fmt.Errorf("apply statefulset for database %s: %w", req.NamespacedName, err)
    }

    var live appsv1.StatefulSet
    if err := r.Get(ctx, client.ObjectKeyFromObject(sts), &live); err != nil {
        return ctrl.Result{}, fmt.Errorf("get statefulset %s: %w", sts.Name, err)
    }
    ready := live.Status.ReadyReplicas == db.Spec.Replicas
    meta.SetStatusCondition(&db.Status.Conditions, metav1.Condition{
        Type: "Ready", Status: boolStatus(ready), Reason: readyReason(ready),
        ObservedGeneration: db.Generation,
    })
    db.Status.ObservedGeneration = db.Generation
    db.Status.ReadyReplicas = live.Status.ReadyReplicas
    if err := r.Status().Update(ctx, &db); err != nil {
        return ctrl.Result{}, fmt.Errorf("update status for database %s: %w", req.NamespacedName, err)
    }
    log.V(1).Info("reconciled", "ready", ready)
    if !ready {
        return ctrl.Result{RequeueAfter: 15 * time.Second}, nil
    }
    return ctrl.Result{}, nil
}
```

(`desiredStatefulSet`, `boolStatus` and `readyReason` are small helpers in the same package; `desiredStatefulSet` must set `TypeMeta` for server-side apply.)

## Ownership and Watches

- Owner references (`SetControllerReference`) make child objects garbage-collected with the parent and let the controller watch children (`Owns(&appsv1.StatefulSet{})`) so child changes trigger parent reconciles.
- Cross-namespace or cluster-scoped children cannot have namespaced owners; use labels + finalizers instead.

## Scaffolding with Kubebuilder

```bash
kubebuilder init --domain example.com --repo github.com/acme/database-operator
kubebuilder create api --group db --version v1alpha1 --kind Database --resource --controller
make manifests generate     # CRDs, RBAC, deepcopy from markers
make test                   # envtest-based tests
make docker-build docker-push IMG=registry.example.com/database-operator:v0.1.0
make deploy IMG=registry.example.com/database-operator:v0.1.0
```

RBAC comes from markers such as `// +kubebuilder:rbac:groups=apps,resources=statefulsets,verbs=get;list;watch;create;update;patch;delete`; grant only what the controller uses.

## Checklist
- [ ] Operator justified over Helm/composition
- [ ] Spec declarative and validated by schema/CEL; status via subresource
- [ ] Conditions with `observedGeneration`
- [ ] Reconcile idempotent, level-triggered, non-blocking
- [ ] Owner references and watches on children
- [ ] RBAC generated from markers with least privilege
