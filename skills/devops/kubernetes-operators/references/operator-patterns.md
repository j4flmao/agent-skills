# Kubernetes Operator Design Patterns

## Operator Patterns
| Pattern | Description | Example |
|---------|-------------|---------|
| Controller | Watch and reconcile custom resources | Deploy app, manage config |
| Operator with Helm | Use Helm chart as deployment template | Complex app deployment |
| Operator with Sidecar | Inject sidecar containers | Service mesh, monitoring |
| Prometheus Exporter | Export CR status as metrics | Database health metrics |

## Reconciliation Best Practices
- Always use exponential backoff for requeue
- Set status conditions (Ready, Degraded, Error)
- Emit Kubernetes events for important state changes
- Use finalizers for cleanup on deletion
- Handle race conditions with resource versions
- Test with envtest (integration test framework)

## Common CRD Patterns
- Spec: desired state (user input)
- Status: observed state (controller output)
- Conditions: machine-readable status indicators
