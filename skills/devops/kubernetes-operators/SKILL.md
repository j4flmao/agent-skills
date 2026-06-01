---
name: devops-kubernetes-operators
description: >
  Use when the user asks about Kubernetes operators, custom controllers,
  operator pattern, Kubebuilder, Operator SDK, custom resource definitions
  (CRD), reconciliation loops, or extending Kubernetes with custom resources.
  Covers: Kubebuilder project structure, controller-runtime patterns,
  finalizers, status subresource, webhooks, multi-version CRDs, operator
  testing with envtest, operator deployment with OLM, and operator design
  patterns.
  Do NOT use for: basic Kubernetes usage (kubernetes-patterns), Helm charts
  (helm-patterns), or general Kubernetes management.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, kubernetes-operators, kubebuilder, controller-runtime, phase-3]
---

# Kubernetes Operators

## Purpose
Build Kubernetes operators and custom controllers using Kubebuilder, Operator SDK, or raw controller-runtime to automate application management on Kubernetes. Covers CRD design, reconciliation loops, finalizers, webhooks, testing, and deployment.

## Agent Protocol

### Trigger
Exact user phrases: "Kubernetes operator", "operator", "custom controller", "Kubebuilder", "Operator SDK", "CRD", "Custom Resource Definition", "reconciliation loop", "reconcile", "controller-runtime", "finalizer", "admission webhook", "conversion webhook", "multi-version CRD", "envtest", "OLM", "Operator Lifecycle Manager", "operator pattern".

### Input Context
- Go programming experience level
- Kubernetes version targeted
- Operation to automate (backup, deploy, configure, clean up)
- Existing CRD structures (if any)
- Testing framework preference
- Deployment strategy (OLM, Helm, raw manifests)

### Output Artifact
Kubebuilder project scaffold, CRD type definitions, controller implementation (Go), webhook configuration, test files, and deployment manifests.

### Response Format
Go code, YAML manifests, and Makefile targets. No preamble. No postamble. No filler.

### Completion Criteria
- [ ] CRD types defined with validation markers
- [ ] Controller reconcile loop implemented
- [ ] Status subresource updated with observed state
- [ ] Finalizers for resource cleanup (if needed)
- [ ] Webhooks configured (validating/mutating, if needed)
- [ ] Tests pass (unit + envtest integration)
- [ ] RBAC manifests correct and scoped
- [ ] Deployment via OLM or Helm configured

## Architecture / Decision Trees

### When to Build an Operator

```
What are you managing?
  Application lifecycle (deploy, upgrade, backup) → Consider operator
  Single resource creation → Helm chart + ArgoCD (simpler)
  Multi-step orchestration across resources → Operator pattern

  Is the logic simple (create/delete static resources)?
    YES → Helm + lifecycle hooks
    NO → Operator (dynamic decision making needed)

  Do you need to respond to external events?
    YES → Operator (watch external state, reconcile)
    NO → Helm (static deployment)

  Do you need to manage stateful applications?
    YES → Operator (backup, restore, scale up/down, failover)
    NO → Helm + Kubernetes primitives

  Is your team comfortable with Go?
    YES → Kubebuilder (most features, best performance)
    NO → Python operator (kopf), Ansible operator, or Java (java-operator-sdk)
```

### Operator Implementation Comparison

| Approach | Language | CRD Generation | Testing | Complexity | Performance |
|----------|----------|----------------|---------|------------|-------------|
| Kubebuilder | Go | Built-in | envtest | Medium | Best |
| Operator SDK (Go) | Go | Built-in | envtest | Medium | Best |
| Operator SDK (Ansible) | Ansible | Manual | Molecule | Low | Moderate |
| Operator SDK (Helm) | Helm | Manual | Limited | Low | Moderate |
| Kopf | Python | Manual | pytest | Low | Moderate |
| Java Operator SDK | Java | Manual | JUnit | Medium | Good |
| Metacontroller | JS (Lambda) | Manual | Custom | Low | Good |

## Core Workflow

### Step 1: Project Scaffold with Kubebuilder

```bash
# Install Kubebuilder
curl -L -o kubebuilder https://go.kubebuilder.io/dl/latest/$(go env GOOS)/$(go env GOARCH)
chmod +x kubebuilder && sudo mv kubebuilder /usr/local/bin/

# Scaffold project
kubebuilder init --domain example.com --repo github.com/org/my-operator
kubebuilder create api --group batch --version v1 --kind BackupJob --resource=true --controller=true

# Project structure
# my-operator/
# ├── api/
# │   └── v1/
# │       ├── backupjob_types.go      # CRD type definitions
# │       ├── backupjob_webhook.go    # Optional webhooks
# │       ├── groupversion_info.go
# │       └── zz_generated.deepcopy.go
# ├── cmd/
# │   └── main.go                     # Entry point
# ├── config/
# │   ├── crd/                        # Generated CRD YAML
# │   ├── rbac/                       # RBAC manifests
# │   ├── manager/                    # Controller deployment
# │   ├── samples/                    # Example CRs
# │   └── webhook/                    # Webhook configuration
# ├── internal/
# │   └── controller/
# │       └── backupjob_controller.go # Reconciliation logic
# ├── Dockerfile
# ├── Makefile
# └── go.mod
```

### Step 2: CRD Type Definitions

```go
// api/v1/backupjob_types.go
package v1

import (
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
)

// BackupJobSpec defines the desired state
type BackupJobSpec struct {
    // Source defines the data source for backup
    // +kubebuilder:validation:Required
    Source BackupSource `json:"source"`

    // Destination defines where backup is stored
    // +kubebuilder:validation:Required
    Destination BackupDestination `json:"destination"`

    // Schedule in cron format (optional, for recurring backups)
    // +optional
    Schedule string `json:"schedule,omitempty"`

    // Retention policy in days
    // +kubebuilder:validation:Minimum=1
    // +kubebuilder:validation:Maximum=365
    // +kubebuilder:default=30
    RetentionDays int32 `json:"retentionDays,omitempty"`

    // Paused suspends scheduled backups
    // +optional
    Paused bool `json:"paused,omitempty"`
}

type BackupSource struct {
    // Type of source: "postgres", "mysql", "filesystem", "volume"
    // +kubebuilder:validation:Enum=postgres;mysql;filesystem;volume
    Type string `json:"type"`

    // Namespace where the source is located
    // +optional
    Namespace string `json:"namespace,omitempty"`

    // PVC name (for volume type)
    // +optional
    PVCName string `json:"pvcName,omitempty"`

    // Connection string (for database type)
    // +optional
    ConnectionSecret string `json:"connectionSecret,omitempty"`
}

type BackupDestination struct {
    // Storage type: "s3", "gcs", "azure", "nfs", "pvc"
    // +kubebuilder:validation:Required
    Type string `json:"type"`

    // Bucket name (for s3/gcs/azure)
    // +optional
    Bucket string `json:"bucket,omitempty"`

    // Path prefix within bucket
    // +optional
    Prefix string `json:"prefix,omitempty"`

    // Secret reference for credentials
    // +optional
    CredentialsSecret string `json:"credentialsSecret,omitempty"`
}

// BackupJobStatus defines the observed state
type BackupJobStatus struct {
    // Conditions represent the current state
    // +optional
    Conditions []metav1.Condition `json:"conditions,omitempty"`

    // LastBackupTime is the timestamp of the last backup
    // +optional
    LastBackupTime *metav1.Time `json:"lastBackupTime,omitempty"`

    // NextBackupTime is the next scheduled backup
    // +optional
    NextBackupTime *metav1.Time `json:"nextBackupTime,omitempty"`

    // BackupCount is the total successful backups
    // +optional
    BackupCount int32 `json:"backupCount,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:resource:shortName=bj
// +kubebuilder:printcolumn:name="Type",type="string",JSONPath=".spec.source.type"
// +kubebuilder:printcolumn:name="Schedule",type="string",JSONPath=".spec.schedule"
// +kubebuilder:printcolumn:name="Last Backup",type="date",JSONPath=".status.lastBackupTime"
// +kubebuilder:printcolumn:name="Age",type="date",JSONPath=".metadata.creationTimestamp"
type BackupJob struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`

    Spec   BackupJobSpec   `json:"spec,omitempty"`
    Status BackupJobStatus `json:"status,omitempty"`
}

// +kubebuilder:object:root=true
type BackupJobList struct {
    metav1.TypeMeta `json:",inline"`
    metav1.ListMeta `json:"metadata,omitempty"`
    Items           []BackupJob `json:"items"`
}

func init() {
    SchemeBuilder.Register(&BackupJob{}, &BackupJobList{})
}
```

### Step 3: Controller Reconciliation Loop

```go
// internal/controller/backupjob_controller.go
package controller

import (
    "context"
    "fmt"
    "time"

    batchv1 "github.com/org/my-operator/api/v1"
    corev1 "k8s.io/api/core/v1"
    apierrors "k8s.io/apimachinery/pkg/api/errors"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/runtime"
    "k8s.io/apimachinery/pkg/types"
    "k8s.io/client-go/tools/record"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/client"
    "sigs.k8s.io/controller-runtime/pkg/controller/controllerutil"
    "sigs.k8s.io/controller-runtime/pkg/log"
    "sigs.k8s.io/controller-runtime/pkg/reconcile"
)

// BackupJobReconciler reconciles BackupJob resources
type BackupJobReconciler struct {
    client.Client
    Scheme   *runtime.Scheme
    Recorder record.EventRecorder
}

const backupFinalizer = "backup.example.com/finalizer"

// +kubebuilder:rbac:groups=batch.example.com,resources=backupjobs,verbs=get;list;watch;create;update;patch;delete
// +kubebuilder:rbac:groups=batch.example.com,resources=backupjobs/status,verbs=get;update;patch
// +kubebuilder:rbac:groups=batch.example.com,resources=backupjobs/finalizers,verbs=update
// +kubebuilder:rbac:groups=batch,resources=jobs,verbs=get;list;watch;create;delete
// +kubebuilder:rbac:groups="",resources=events,verbs=create;patch

func (r *BackupJobReconciler) Reconcile(ctx context.Context, req ctrl.Request) (ctrl.Result, error) {
    logger := log.FromContext(ctx)

    // 1. Fetch the BackupJob CR
    backupJob := &batchv1.BackupJob{}
    if err := r.Get(ctx, req.NamespacedName, backupJob); err != nil {
        if apierrors.IsNotFound(err) {
            return ctrl.Result{}, nil
        }
        return ctrl.Result{}, err
    }

    // 2. Handle deletion with finalizer
    if !backupJob.DeletionTimestamp.IsZero() {
        return r.handleDeletion(ctx, backupJob)
    }

    // 3. Add finalizer if not present
    if !controllerutil.ContainsFinalizer(backupJob, backupFinalizer) {
        controllerutil.AddFinalizer(backupJob, backupFinalizer)
        if err := r.Update(ctx, backupJob); err != nil {
            return ctrl.Result{}, err
        }
        return ctrl.Result{Requeue: true}, nil
    }

    // 4. Check if scheduled backup is needed
    if backupJob.Spec.Schedule != "" && !backupJob.Spec.Paused {
        needsBackup, nextTime := r.evaluateSchedule(backupJob)
        if needsBackup {
            if err := r.executeBackup(ctx, backupJob); err != nil {
                logger.Error(err, "Failed to execute backup")
                r.Recorder.Event(backupJob, corev1.EventTypeWarning, "BackupFailed", err.Error())
                r.setCondition(ctx, backupJob, "BackupFailed", metav1.ConditionFalse, err.Error())
                return ctrl.Result{}, err
            }
            r.Recorder.Event(backupJob, corev1.EventTypeNormal, "BackupCompleted", "Backup executed successfully")
            r.setCondition(ctx, backupJob, "BackupCompleted", metav1.ConditionTrue, "Backup executed successfully")
        }

        // Requeue for next scheduled time
        if nextTime != nil {
            return ctrl.Result{RequeueAfter: time.Until(*nextTime)}, nil
        }
    }

    return ctrl.Result{}, nil
}

func (r *BackupJobReconciler) handleDeletion(ctx context.Context, backupJob *batchv1.BackupJob) (ctrl.Result, error) {
    logger := log.FromContext(ctx)

    if controllerutil.ContainsFinalizer(backupJob, backupFinalizer) {
        // Perform cleanup tasks
        logger.Info("Running cleanup for backup job", "name", backupJob.Name)

        // Remove all associated Kubernetes Jobs
        jobList := &batchv1.JobList{}
        if err := r.List(ctx, jobList, client.InNamespace(backupJob.Namespace),
            client.MatchingLabels{"backup-job": backupJob.Name}); err != nil {
            return ctrl.Result{}, err
        }
        for _, job := range jobList.Items {
            if err := r.Delete(ctx, &job); err != nil && !apierrors.IsNotFound(err) {
                return ctrl.Result{}, err
            }
        }

        controllerutil.RemoveFinalizer(backupJob, backupFinalizer)
        if err := r.Update(ctx, backupJob); err != nil {
            return ctrl.Result{}, err
        }
    }

    return ctrl.Result{}, nil
}

func (r *BackupJobReconciler) executeBackup(ctx context.Context, backupJob *batchv1.BackupJob) error {
    // Create a Kubernetes Job to perform the backup
    job := &batchv1.Job{
        ObjectMeta: metav1.ObjectMeta{
            GenerateName: fmt.Sprintf("backup-%s-", backupJob.Name),
            Namespace:    backupJob.Namespace,
            Labels: map[string]string{
                "backup-job": backupJob.Name,
            },
        },
        Spec: batchv1.JobSpec{
            Template: corev1.PodTemplateSpec{
                Spec: corev1.PodSpec{
                    RestartPolicy: corev1.RestartPolicyNever,
                    Containers: []corev1.Container{
                        {
                            Name:    "backup",
                            Image:   "backup-tool:latest",
                            Command: []string{"/bin/backup", "--source", backupJob.Spec.Source.Type},
                            Env: []corev1.EnvVar{
                                {Name: "BACKUP_DEST", Value: backupJob.Spec.Destination.Bucket},
                            },
                        },
                    },
                },
            },
        },
    }

    if err := controllerutil.SetControllerReference(backupJob, job, r.Scheme); err != nil {
        return err
    }

    if err := r.Create(ctx, job); err != nil {
        return fmt.Errorf("failed to create backup job: %w", err)
    }

    // Update status
    now := metav1.Now()
    backupJob.Status.LastBackupTime = &now
    backupJob.Status.BackupCount++
    return r.Status().Update(ctx, backupJob)
}

func (r *BackupJobReconciler) evaluateSchedule(backupJob *batchv1.BackupJob) (bool, *time.Time) {
    // Parse cron and determine if backup should run now
    // (simplified — use robfig/cron in production)
    return true, nil
}

func (r *BackupJobReconciler) setCondition(ctx context.Context, backupJob *batchv1.BackupJob,
    reason string, status metav1.ConditionStatus, message string) {

    cond := metav1.Condition{
        Type:               "Ready",
        Status:             status,
        LastTransitionTime: metav1.Now(),
        Reason:             reason,
        Message:            message,
    }

    backupJob.Status.Conditions = append(backupJob.Status.Conditions, cond)
    if err := r.Status().Update(ctx, backupJob); err != nil {
        log.FromContext(ctx).Error(err, "Failed to update status")
    }
}

// SetupWithManager wires the controller
func (r *BackupJobReconciler) SetupWithManager(mgr ctrl.Manager) error {
    return ctrl.NewControllerManagedBy(mgr).
        For(&batchv1.BackupJob{}).
        Owns(&batchv1.Job{}).
        Complete(r)
}
```

### Step 4: Webhooks

```go
// api/v1/backupjob_webhook.go
package v1

import (
    "fmt"
    "regexp"

    "k8s.io/apimachinery/pkg/runtime"
    ctrl "sigs.k8s.io/controller-runtime"
    logf "sigs.k8s.io/controller-runtime/pkg/log"
    "sigs.k8s.io/controller-runtime/pkg/webhook"
    "sigs.k8s.io/controller-runtime/pkg/webhook/admission"
)

// log is for logging
var backupjoblog = logf.Log.WithName("backupjob-resource")

// SetupWebhookWithManager registers webhooks
func (r *BackupJob) SetupWebhookWithManager(mgr ctrl.Manager) error {
    return ctrl.NewWebhookManagedBy(mgr).
        For(r).
        WithValidator(r).
        WithDefaulter(r).
        Complete()
}

// +kubebuilder:webhook:path=/mutate-batch-example-com-v1-backupjob,mutating=true,failurePolicy=fail,sideEffects=None,groups=batch.example.com,resources=backupjobs,verbs=create;update,versions=v1,name=mbackupjob.kb.io,admissionReviewVersions=v1

var _ webhook.Defaulter = &BackupJob{}

// Default implements webhook.Defaulter
func (r *BackupJob) Default() {
    backupjoblog.Info("default", "name", r.Name)

    if r.Spec.RetentionDays == 0 {
        r.Spec.RetentionDays = 30
    }

    if r.Spec.Destination.Bucket == "" {
        r.Spec.Destination.Bucket = "backups"
    }

    if r.Spec.Source.Namespace == "" {
        r.Spec.Source.Namespace = r.Namespace
    }
}

// +kubebuilder:webhook:path=/validate-batch-example-com-v1-backupjob,mutating=false,failurePolicy=fail,sideEffects=None,groups=batch.example.com,resources=backupjobs,verbs=create;update,versions=v1,name=vbackupjob.kb.io,admissionReviewVersions=v1

var _ webhook.Validator = &BackupJob{}

// ValidateCreate implements webhook.Validator
func (r *BackupJob) ValidateCreate() (admission.Warnings, error) {
    backupjoblog.Info("validate create", "name", r.Name)
    return r.validateBackupJob()
}

// ValidateUpdate implements webhook.Validator
func (r *BackupJob) ValidateUpdate(old runtime.Object) (admission.Warnings, error) {
    backupjoblog.Info("validate update", "name", r.Name)
    return r.validateBackupJob()
}

// ValidateDelete implements webhook.Validator
func (r *BackupJob) ValidateDelete() (admission.Warnings, error) {
    return nil, nil
}

func (r *BackupJob) validateBackupJob() (admission.Warnings, error) {
    // Validate source type
    validSources := map[string]bool{
        "postgres": true, "mysql": true, "filesystem": true, "volume": true,
    }
    if !validSources[r.Spec.Source.Type] {
        return nil, fmt.Errorf("invalid source type: %s", r.Spec.Source.Type)
    }

    // Validate destination type
    validDests := map[string]bool{
        "s3": true, "gcs": true, "azure": true, "nfs": true, "pvc": true,
    }
    if !validDests[r.Spec.Destination.Type] {
        return nil, fmt.Errorf("invalid destination type: %s", r.Spec.Destination.Type)
    }

    // Validate cron expression
    if r.Spec.Schedule != "" {
        // Use robfig/cron parser in production
        matched, _ := regexp.MatchString(`^(\S+\s+){4}\S+$`, r.Spec.Schedule)
        if !matched {
            return nil, fmt.Errorf("invalid cron expression: %s", r.Spec.Schedule)
        }
    }

    return nil, nil
}
```

### Step 5: Main Entry Point

```go
// cmd/main.go
package main

import (
    "flag"
    "os"

    batchv1 "github.com/org/my-operator/api/v1"
    "github.com/org/my-operator/internal/controller"
    "k8s.io/apimachinery/pkg/runtime"
    utilruntime "k8s.io/apimachinery/pkg/util/runtime"
    clientgoscheme "k8s.io/client-go/kubernetes/scheme"
    _ "k8s.io/client-go/plugin/pkg/client/auth/gcp"
    ctrl "sigs.k8s.io/controller-runtime"
    "sigs.k8s.io/controller-runtime/pkg/healthz"
    "sigs.k8s.io/controller-runtime/pkg/log/zap"
    "sigs.k8s.io/controller-runtime/pkg/metrics/server"
)

var (
    scheme   = runtime.NewScheme()
    setupLog = ctrl.Log.WithName("setup")
)

func init() {
    utilruntime.Must(clientgoscheme.AddToScheme(scheme))
    utilruntime.Must(batchv1.AddToScheme(scheme))
}

func main() {
    var metricsAddr string
    var enableLeaderElection bool
    var probeAddr string

    flag.StringVar(&metricsAddr, "metrics-bind-address", ":8080", "Metrics address")
    flag.StringVar(&probeAddr, "health-probe-bind-address", ":8081", "Health probe address")
    flag.BoolVar(&enableLeaderElection, "leader-elect", false, "Enable leader election")
    flag.Parse()

    ctrl.SetLogger(zap.New(zap.UseDevMode(true)))

    mgr, err := ctrl.NewManager(ctrl.GetConfigOrDie(), ctrl.Options{
        Scheme: scheme,
        Metrics: server.Options{
            BindAddress: metricsAddr,
        },
        HealthProbeBindAddress: probeAddr,
        LeaderElection:         enableLeaderElection,
        LeaderElectionID:       "backup-operator.example.com",
    })
    if err != nil {
        setupLog.Error(err, "unable to start manager")
        os.Exit(1)
    }

    if err = (&controller.BackupJobReconciler{
        Client:   mgr.GetClient(),
        Scheme:   mgr.GetScheme(),
        Recorder: mgr.GetEventRecorderFor("backup-operator"),
    }).SetupWithManager(mgr); err != nil {
        setupLog.Error(err, "unable to create controller")
        os.Exit(1)
    }

    if err = (&batchv1.BackupJob{}).SetupWebhookWithManager(mgr); err != nil {
        setupLog.Error(err, "unable to create webhook")
        os.Exit(1)
    }

    if err := mgr.AddHealthzCheck("healthz", healthz.Ping); err != nil {
        setupLog.Error(err, "unable to set up health check")
        os.Exit(1)
    }

    setupLog.Info("starting manager")
    if err := mgr.Start(ctrl.SetupSignalHandler()); err != nil {
        setupLog.Error(err, "problem running manager")
        os.Exit(1)
    }
}
```

### Step 6: Operator Testing with EnvTest

```go
// internal/controller/backupjob_controller_test.go
package controller

import (
    "context"
    "time"

    batchv1 "github.com/org/my-operator/api/v1"
    . "github.com/onsi/ginkgo/v2"
    . "github.com/onsi/gomega"
    metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"
    "k8s.io/apimachinery/pkg/types"
)

var _ = Describe("BackupJob controller", func() {
    const (
        BackupJobName      = "test-backupjob"
        BackupJobNamespace = "default"
        timeout            = time.Second * 30
        interval           = time.Millisecond * 250
    )

    Context("When creating a BackupJob", func() {
        It("Should set the default retention days", func() {
            By("Creating a new BackupJob")
            ctx := context.Background()
            backupJob := &batchv1.BackupJob{
                ObjectMeta: metav1.ObjectMeta{
                    Name:      BackupJobName,
                    Namespace: BackupJobNamespace,
                },
                Spec: batchv1.BackupJobSpec{
                    Source: batchv1.BackupSource{
                        Type: "postgres",
                    },
                    Destination: batchv1.BackupDestination{
                        Type:   "s3",
                        Bucket: "test-backups",
                    },
                },
            }
            Expect(k8sClient.Create(ctx, backupJob)).Should(Succeed())

            By("Checking the default retention days")
            createdBackupJob := &batchv1.BackupJob{}
            Eventually(func() (int32, error) {
                err := k8sClient.Get(ctx, types.NamespacedName{
                    Name:      BackupJobName,
                    Namespace: BackupJobNamespace,
                }, createdBackupJob)
                return createdBackupJob.Spec.RetentionDays, err
            }, timeout, interval).Should(Equal(int32(30)))
        })
    })

    Context("When a BackupJob has invalid source type", func() {
        It("Should be rejected by the webhook", func() {
            ctx := context.Background()
            backupJob := &batchv1.BackupJob{
                ObjectMeta: metav1.ObjectMeta{
                    Name:      "invalid-backupjob",
                    Namespace: BackupJobNamespace,
                },
                Spec: batchv1.BackupJobSpec{
                    Source: batchv1.BackupSource{
                        Type: "invalid-source",
                    },
                    Destination: batchv1.BackupDestination{
                        Type: "s3",
                    },
                },
            }
            Expect(k8sClient.Create(ctx, backupJob)).ShouldNot(Succeed())
        })
    })
})
```

### Step 7: Multi-Version CRD (Conversion Webhook)

```go
// api/v2/backupjob_types.go (new version)
package v2

import metav1 "k8s.io/apimachinery/pkg/apis/meta/v1"

type BackupJobSpec struct {
    Source      BackupSource `json:"source"`
    Destination BackupDestination `json:"destination"`
    Schedule    string `json:"schedule,omitempty"`
    // New field in v2
    Encryption  EncryptionConfig `json:"encryption,omitempty"`
    // v2 combines retention fields
    Retention   RetentionPolicy `json:"retention,omitempty"`
}

type EncryptionConfig struct {
    Enabled  bool   `json:"enabled"`
    KeyARN   string `json:"keyARN,omitempty"`
    KMSKeyID string `json:"kmsKeyID,omitempty"`
}

type RetentionPolicy struct {
    Days  int `json:"days"`
    Count int `json:"count,omitempty"`
}

// +kubebuilder:object:root=true
// +kubebuilder:subresource:status
// +kubebuilder:storageversion
// +kubebuilder:conversion:webhook,conversionURL=https://conversion.example.com/convert
type BackupJob struct {
    metav1.TypeMeta   `json:",inline"`
    metav1.ObjectMeta `json:"metadata,omitempty"`
    Spec              BackupJobSpec   `json:"spec,omitempty"`
    Status            BackupJobStatus `json:"status,omitempty"`
}
```

```go
// conversion.go
package webhook

import (
    "encoding/json"
    "net/http"

    v1 "github.com/org/my-operator/api/v1"
    v2 "github.com/org/my-operator/api/v2"
    "sigs.k8s.io/controller-runtime/pkg/webhook/conversion"
)

func (h *conversionHandler) convertV1ToV2(v1Obj *v1.BackupJob) *v2.BackupJob {
    v2Obj := &v2.BackupJob{}
    v2Obj.ObjectMeta = v1Obj.ObjectMeta
    v2Obj.Spec.Source = v2.BackupSource{...}  // map fields
    v2Obj.Spec.Destination = v2.BackupDestination{...}
    v2Obj.Spec.Schedule = v1Obj.Spec.Schedule
    v2Obj.Spec.Retention = v2.RetentionPolicy{Days: int(v1Obj.Spec.RetentionDays)}
    v2Obj.Status = convertStatus(v1Obj.Status)
    return v2Obj
}
```

## Production Considerations

### Operator Design Patterns
```
Owned Resources: Use controllerutil.SetControllerReference for GC
  — CR deleted → owned resources deleted automatically

Finalizers: For cleanup before CR deletion
  — Remove external resources (DNS, cloud resources, backups)
  — Handle graceful shutdown before CRD is removed

Status Subresource: Separate status from spec
  — Spec changes trigger reconciliation
  — Status updates don't trigger reconciliation (subresource)
  — Use conditions array (Ready, Degraded, Error)

Leader Election: One active controller, standby replicas
  — Set enable-leader-election=true for HA
  — Leader election ID must be unique per operator

Rate Limiting: Prevent reconciliation storms
  — Default: 1 req/sec burst 200
  — Tune based on external API rate limits
```

### Common Pitfalls

1. **No status subresource**: Clients can't observe the operator's state. Always implement status.
2. **Missing finalizers**: CR deletion leaves orphaned resources. Always clean up owned resources.
3. **Hot reconciliation loops**: Every reconcile must handle both success and error returns carefully. Use requeue with delay.
4. **Ignoring observed generation**: Track `metadata.generation` vs `status.observedGeneration` to know if spec has changed.
5. **No rate limiting**: External API calls in reconcile can hit rate limits. Implement backoff and rate limiting.
6. **Blocking webhooks without escape hatch**: If the webhook is down, no resources can be created. Set `failurePolicy: Ignore` for non-critical validations.
7. **Overly broad RBAC**: Operator service accounts should have the minimum permissions needed. Use kubebuilder annotations.
8. **No operator metrics**: You can't debug operator performance without metrics. Expose reconciliation count, duration, and error rate.
9. **Version skew**: Multi-version CRDs need conversion webhooks. Always test writes and reads across versions.
10. **Not testing with envtest**: Unit tests alone miss API server interaction. Always write envtest integration tests.

### Operator Metrics to Expose

```go
// metrics setup in main.go
import "sigs.k8s.io/controller-runtime/pkg/metrics"

var (
    reconcilerDuration = prometheus.NewHistogramVec(
        prometheus.HistogramOpts{
            Name:    "backup_operator_reconcile_duration_seconds",
            Help:    "Duration of reconciliation in seconds",
            Buckets: prometheus.DefBuckets,
        },
        []string{"name"},
    )
    reconcilerErrors = prometheus.NewCounterVec(
        prometheus.CounterOpts{
            Name: "backup_operator_reconcile_errors_total",
            Help: "Total reconciliation errors",
        },
        []string{"name", "error_type"},
    )
)

func init() {
    metrics.Registry.MustRegister(reconcilerDuration, reconcilerErrors)
}
```

## Compared With

| Aspect | Kubebuilder | Operator SDK (Go) | Operator SDK (Ansible) | Kopf (Python) |
|--------|-------------|-------------------|----------------------|---------------|
| CRD generation | Automatic | Automatic | Manual | Manual |
| Webhook support | Built-in | Built-in | Limited | Custom |
| Testing framework | envtest + Ginkgo | envtest + Ginkgo | Molecule | pytest |
| Reconciliation | controller-runtime | controller-runtime | Ansible Runner | Python asyncio |
| Deployment | OLM/Helm/Manifests | OLM/Helm/Manifests | OLM | Helm |
| Multi-version CRD | Conversion webhook | Conversion webhook | Manual | Manual |
| Go skill required | Yes | Yes | No | No |
| Performance | Best | Best | Moderate | Moderate |

## References
- references/controller-runtime.md — Controller Runtime Deep Dive
- references/finalizers-garbage.md — Finalizers, Garbage Collection, and Owner References
- references/kubernetes-operators-advanced.md — Kubernetes Operators Advanced Topics
- references/kubernetes-operators-fundamentals.md — Kubernetes Operators Fundamentals
- references/operator-patterns.md — Kubernetes Operator Design Patterns
- references/operator-sdk-guide.md — Operator SDK Guide
- references/testing-operators.md — Operator Testing
- references/conversion-webhooks.md — Multi-Version CRD with Conversion Webhooks
- references/operator-metrics.md — Operator Metrics and Observability
- references/olm-deployment.md — OLM Operator Deployment

## Handoff
Related skills: kubernetes-patterns (K8s resource patterns), helm-patterns (Helm chart design), gitops-advanced (GitOps with custom operators), policy-as-code (admission webhooks integration), monitoring (operator metrics and dashboards).
