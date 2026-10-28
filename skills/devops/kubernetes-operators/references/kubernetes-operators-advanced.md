# Advanced Operator Topics: API Versioning, Conversion, Webhooks and Server-Side Apply

Evolving a CRD API safely across versions, conversion webhooks, admission webhooks vs CEL, server-side apply ownership in controllers, and safe upgrades of operators in live clusters. Performance and leader election are in `operator-performance-scaling.md`; OLM packaging in `operator-lifecycle-management.md`.

## API Version Lifecycle

| Stage | Compatibility expectation |
|---|---|
| `v1alpha1` | May change incompatibly; not for production data you cannot migrate |
| `v1beta1` | Fields stable-ish; changes come with conversion |
| `v1` | No breaking changes; new fields optional with defaults |

A CRD can serve multiple versions; exactly one is the storage version.

```yaml
spec:
  versions:
  - name: v1beta1
    served: true
    storage: false
    deprecated: true
    deprecationWarning: "db.example.com/v1beta1 Database is deprecated; use v1"
  - name: v1
    served: true
    storage: true
  conversion:
    strategy: Webhook
    webhook:
      conversionReviewVersions: ["v1"]
      clientConfig:
        service: {name: database-operator-webhook, namespace: database-system, path: /convert}
```

`strategy: None` only works when schemas are identical apart from the version name.

## Conversion in controller-runtime (Hub and Spoke)

Mark the storage version as hub; every other version converts to and from it.

```go
// api/v1/database_conversion.go
func (*Database) Hub() {}

// api/v1beta1/database_conversion.go
func (src *Database) ConvertTo(dstRaw conversion.Hub) error {
    dst := dstRaw.(*v1.Database)
    dst.ObjectMeta = src.ObjectMeta
    dst.Spec.Engine = src.Spec.Engine
    dst.Spec.Version = src.Spec.Version
    dst.Spec.Storage = v1.StorageSpec{Size: src.Spec.StorageSize, Class: src.Spec.StorageClass} // field restructured in v1
    dst.Status.Conditions = src.Status.Conditions
    return nil
}

func (dst *Database) ConvertFrom(srcRaw conversion.Hub) error {
    src := srcRaw.(*v1.Database)
    dst.ObjectMeta = src.ObjectMeta
    dst.Spec.Engine = src.Spec.Engine
    dst.Spec.Version = src.Spec.Version
    dst.Spec.StorageSize = src.Spec.Storage.Size
    dst.Spec.StorageClass = src.Spec.Storage.Class
    dst.Status.Conditions = src.Status.Conditions
    return nil
}
```

Rules:
- Round-trip must be lossless: fields that exist only in the newer version are preserved in an annotation when converting down, and restored when converting up.
- Test round-trips with fuzzing (`k8s.io/apimachinery/pkg/api/apitesting/fuzzer`) or table tests for every field.
- The conversion webhook is in the request path for every read/write of non-storage versions; if it is down, API calls for those versions fail. Run it with multiple replicas and a PDB.

## Storage Version Migration

Objects stay stored in the version they were written in until rewritten. Before removing an old version from `spec.versions`:
1. Switch `storage: true` to the new version.
2. Rewrite all objects (a no-op update per object, or the Storage Version Migrator, or kube-storage-version-migrator jobs).
3. Remove the old version from `status.storedVersions` of the CRD (patch the status) once no objects use it.
4. Then stop serving and remove the old version.

## Validation: Schema, CEL, Webhooks

| Mechanism | Use for |
|---|---|
| OpenAPI schema (types, enums, ranges, patterns) | Field-level validation |
| CEL `x-kubernetes-validations` | Cross-field rules, immutability (`self == oldSelf`), transition rules |
| Validating admission policy (`ValidatingAdmissionPolicy`, GA in 1.30) | Cluster-wide CEL policies without running a webhook |
| Validating webhook | Checks needing external lookups or complex logic |
| Mutating webhook / CRD defaults | Defaulting (prefer schema `default`) |

CEL validation ratcheting (GA in recent Kubernetes versions) lets existing invalid values remain when unchanged, so new stricter rules do not block unrelated updates.

```yaml
x-kubernetes-validations:
- rule: "self.replicas <= 1 || self.engine == 'postgres'"
  message: "replication is only supported for postgres"
- rule: "!has(oldSelf.storageClass) || self.storageClass == oldSelf.storageClass"
  message: "storageClass is immutable"
```

Webhook hygiene: `failurePolicy: Fail` only for critical policies, explicit `timeoutSeconds` (≤ 10), `namespaceSelector`/`objectSelector` excluding system namespaces and the operator's own namespace, cert rotation via cert-manager.

## Server-Side Apply in Controllers

Apply desired child state with a stable field manager instead of get-modify-update:

```go
desired := &appsv1.StatefulSet{
    TypeMeta:   metav1.TypeMeta{APIVersion: "apps/v1", Kind: "StatefulSet"},
    ObjectMeta: metav1.ObjectMeta{Name: db.Name, Namespace: db.Namespace},
    Spec:       buildSpec(db),
}
if err := r.Patch(ctx, desired, client.Apply,
    client.FieldOwner("database-operator"), client.ForceOwnership); err != nil {
    return fmt.Errorf("apply statefulset %s/%s: %w", db.Namespace, db.Name, err)
}
```

Benefits: the controller only owns fields it sets; other actors (HPA on `replicas`, users adding annotations) keep theirs; no conflicts from stale `resourceVersion`. Only include fields you intend to own; setting a field to its zero value claims ownership of it. Typed apply configurations (`applyconfigurations` packages) avoid accidental zero values.

## Operator Upgrades in Live Clusters

- New controller version must handle objects created by the previous version (missing new fields, old conditions).
- Roll out CRD changes before the controller that depends on them; never remove served versions in the same release that stops writing them.
- Use leader election so old and new pods never reconcile concurrently during rollout.
- Changing child resource templates triggers updates of all children at once; stagger with rate-limited reconciles or a rollout strategy in the spec.

## Pitfalls
- Removing a version still listed in `status.storedVersions`.
- Lossy conversion dropping fields on round-trip.
- Single-replica conversion webhook: an outage blocks API access to the CRD.
- Webhooks intercepting their own namespace or kube-system: deadlocks during outages.
- Update-based reconcile overwriting fields owned by other controllers.

## Checklist
- [ ] Version plan with hub/spoke conversion and round-trip tests
- [ ] Storage version migration before removing old versions
- [ ] Schema + CEL validation first; webhooks only when necessary and scoped
- [ ] Server-side apply with a stable field manager for children
- [ ] Upgrade path tested from the previous operator release with existing objects
