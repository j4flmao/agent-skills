# Operator Testing

Testing Kubernetes operators requires envtest for unit/integration tests and kind for end-to-end validation.

## Envtest Setup

envtest runs a local API server and etcd for testing controllers without a real cluster:

```go
// controllers/suite_test.go
package controllers

import (
    "testing"
    "time"

    . "github.com/onsi/ginkgo/v2"
    . "github.com/onsi/gomega"
    "k8s.io/client-go/kubernetes/scheme"
    "k8s.io/client-go/rest"
    "sigs.k8s.io/controller-runtime/pkg/client"
    "sigs.k8s.io/controller-runtime/pkg/envtest"
    "sigs.k8s.io/controller-runtime/pkg/log/zap"

    examplev1alpha1 "github.com/org/my-operator/api/v1alpha1"
)

var cfg *rest.Config
var k8sClient client.Client
var testEnv *envtest.Environment

func TestControllers(t *testing.T) {
    RegisterFailHandler(Fail)
    RunSpecs(t, "Controller Suite")
}

var _ = BeforeSuite(func() {
    envtest.BinaryInstallationEnvironment.Install()
    
    testEnv = &envtest.Environment{
        CRDDirectoryPaths:     []string{filepath.Join("..", "config", "crd", "bases")},
        ErrorIfCRDPathMissing: true,
    }
    
    var err error
    cfg, err = testEnv.Start()
    Expect(err).NotTo(HaveOccurred())
    Expect(cfg).NotTo(BeNil())
    
    err = examplev1alpha1.AddToScheme(scheme.Scheme)
    Expect(err).NotTo(HaveOccurred())
    
    k8sClient, err = client.New(cfg, client.Options{Scheme: scheme.Scheme})
    Expect(err).NotTo(HaveOccurred())
})

var _ = AfterSuite(func() {
    By("tearing down the test environment")
    err := testEnv.Stop()
    Expect(err).NotTo(HaveOccurred())
})
```

## Table-Driven Reconciliation Tests

```go
func TestMyAppReconciler(t *testing.T) {
    tests := []struct {
        name    string
        cr      *examplev1.MyApp
        want    ctrl.Result
        wantErr bool
        check   func(t *testing.T, c client.Client)
    }{
        {
            name: "creates deployment with correct replicas",
            cr: &examplev1.MyApp{
                ObjectMeta: metav1.ObjectMeta{
                    Name:      "test-app",
                    Namespace: "default",
                },
                Spec: examplev1.MyAppSpec{
                    Replicas: 3,
                    Image:    "nginx:latest",
                },
            },
            want: ctrl.Result{RequeueAfter: 30 * time.Second},
            check: func(t *testing.T, c client.Client) {
                dep := &appsv1.Deployment{}
                err := c.Get(ctx, types.NamespacedName{
                    Name:      "test-app",
                    Namespace: "default",
                }, dep)
                assert.NoError(t, err)
                assert.Equal(t, int32(3), *dep.Spec.Replicas)
                assert.Equal(t, "nginx:latest", dep.Spec.Template.Spec.Containers[0].Image)
            },
        },
        {
            name: "handles deletion with finalizer cleanup",
            cr: &examplev1.MyApp{
                ObjectMeta: metav1.ObjectMeta{
                    Name:              "test-app-delete",
                    Namespace:         "default",
                    Finalizers:        []string{"finalizer.example.com"},
                    DeletionTimestamp: &metav1.Time{Time: time.Now()},
                },
            },
            want: ctrl.Result{},
            check: func(t *testing.T, c client.Client) {
                cr := &examplev1.MyApp{}
                err := c.Get(ctx, types.NamespacedName{
                    Name:      "test-app-delete",
                    Namespace: "default",
                }, cr)
                assert.Error(t, err) // should be deleted
            },
        },
    }
    
    for _, tt := range tests {
        t.Run(tt.name, func(t *testing.T) {
            ctx := context.Background()
            
            err := k8sClient.Create(ctx, tt.cr)
            assert.NoError(t, err)
            defer k8sClient.Delete(ctx, tt.cr)
            
            reconciler := &MyAppReconciler{
                Client: k8sClient,
                Scheme: scheme.Scheme,
            }
            
            result, err := reconciler.Reconcile(ctx, ctrl.Request{
                NamespacedName: types.NamespacedName{
                    Name:      tt.cr.Name,
                    Namespace: tt.cr.Namespace,
                },
            })
            
            if tt.wantErr {
                assert.Error(t, err)
            } else {
                assert.NoError(t, err)
            }
            assert.Equal(t, tt.want, result)
            
            if tt.check != nil {
                tt.check(t, k8sClient)
            }
        })
    }
}
```

## Integration Tests

```go
var _ = Describe("MyApp controller", func() {
    const (
        name      = "test-myapp"
        namespace = "default"
    )

    BeforeEach(func() {
        cr := &examplev1.MyApp{
            ObjectMeta: metav1.ObjectMeta{
                Name:      name,
                Namespace: namespace,
            },
            Spec: examplev1.MyAppSpec{
                Replicas: 2,
                Image:    "nginx:1.25",
            },
        }
        Expect(k8sClient.Create(ctx, cr)).Should(Succeed())
    })

    AfterEach(func() {
        cr := &examplev1.MyApp{}
        Expect(k8sClient.Get(ctx, types.NamespacedName{
            Name: name, Namespace: namespace,
        }, cr)).Should(Succeed())
        Expect(k8sClient.Delete(ctx, cr)).Should(Succeed())
    })

    It("should create a Deployment", func() {
        eventually(func() error {
            dep := &appsv1.Deployment{}
            return k8sClient.Get(ctx, types.NamespacedName{
                Name: name, Namespace: namespace,
            }, dep)
        }, time.Second*10, time.Millisecond*250).Should(Succeed())
    })
})
```

## E2E Tests with Kind

```go
// e2e/e2e_test.go
package e2e

import (
    "testing"
    "time"

    "github.com/stretchr/testify/assert"
    "github.com/stretchr/testify/require"
    "k8s.io/apimachinery/pkg/types"
    "sigs.k8s.io/controller-runtime/pkg/client"
)

func TestOperatorEndToEnd(t *testing.T) {
    cfg, err := getKubeConfig()
    require.NoError(t, err)
    
    c, err := client.New(cfg, client.Options{})
    require.NoError(t, err)
    
    t.Run("deploy operator and create CR", func(t *testing.T) {
        // Install CRDs
        err := kubectl("apply", "-f", "../config/crd")
        require.NoError(t, err)
        
        // Deploy operator
        err = kubectl("apply", "-f", "../config/manager")
        require.NoError(t, err)
        
        // Create sample CR
        err = kubectl("apply", "-f", "../config/samples/cache_v1alpha1_myapp.yaml")
        require.NoError(t, err)
        
        // Wait for deployment
        assert.Eventually(t, func() bool {
            dep := &appsv1.Deployment{}
            err := c.Get(ctx, types.NamespacedName{
                Name: "myapp-sample", Namespace: "default",
            }, dep)
            return err == nil && dep.Status.ReadyReplicas == *dep.Spec.Replicas
        }, 2*time.Minute, 5*time.Second)
    })
}
```

## Test Coverage Areas

| Area | Tool | Focus |
|------|------|-------|
| Unit | Go tests | Reconcile logic, CRD validation |
| Integration | envtest | Controller with real API server |
| E2E | kind | Full operator lifecycle |
| Performance | k6 + kind | Reconciliation latency, throughput |

## Makefile Test Targets

```makefile
# Run unit and integration tests
.PHONY: test
test: manifests generate fmt vet envtest
	KUBEBUILDER_ASSETS="$(shell $(ENVTEST) use $(ENVTEST_K8S_VERSION) --bin-dir $(LOCALBIN) -p path)" \
		go test ./... -coverprofile cover.out

# Run e2e tests with kind
.PHONY: test-e2e
test-e2e:
	kind create cluster --config e2e/kind-config.yaml
	kubectl apply -f config/crd
	kubectl apply -f config/manager
	kubectl wait --for=condition=Available deployment/my-operator-controller-manager
	go test ./e2e/... -v -count=1
	kind delete cluster

# Run with race detection
.PHONY: test-race
test-race: envtest
	KUBEBUILDER_ASSETS="$(shell $(ENVTEST) use $(ENVTEST_K8S_VERSION) --bin-dir $(LOCALBIN) -p path)" \
		go test -race ./...
```

Thorough testing at every level ensures operators behave correctly across creation, updates, deletion, and failure scenarios.
