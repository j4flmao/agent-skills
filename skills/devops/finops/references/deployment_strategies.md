# Rolling Out Cost Optimizations Safely

Cost changes are production changes: a rightsizing that saves 30% and causes an outage is a net loss. This reference covers how to sequence, stage, verify and roll back cost optimizations, including commitment purchases, which cannot be rolled back at all.

## Sequencing: Order of Operations

Do the reversible, waste-removing steps before locking in discounts, otherwise you commit to capacity you are about to eliminate.

| Order | Step | Reversible? | Typical owner |
|-------|------|-------------|---------------|
| 1 | Delete waste (orphaned volumes, idle load balancers, old snapshots) | Partly (backups first) | Platform |
| 2 | Schedule non-prod off-hours | Yes | Platform + teams |
| 3 | Rightsize (instance size, requests/limits, DB tier) | Yes | Service teams |
| 4 | Modernize (newer generation, ARM, managed/serverless) | Yes, with effort | Service teams |
| 5 | Move interruptible work to spot | Yes | Service teams |
| 6 | Buy commitments for the remaining steady baseline | No (term 1 or 3 years) | FinOps |

## Change Classes

| Class | Examples | Rollout |
|-------|----------|---------|
| Low risk | Delete unattached volume with snapshot, S3 lifecycle to IA for logs, dev schedules | Standard change, batch weekly |
| Medium risk | Instance/node rightsizing, reducing replica counts, autoscaling target changes | Canary per service, monitored window |
| High risk | DB instance class change, storage class change for hot data, region/AZ topology change | Change review, maintenance window, tested rollback |
| Irreversible | Savings Plans, RIs, CUDs, reservations | Approval workflow, staged purchases |

## Rightsizing Rollout Pattern

1. **Baseline**: capture p50/p95/p99 CPU, memory, latency, error rate over at least 14 days covering weekly peaks and any month-end batch.
2. **Recommend**: from Compute Optimizer / Azure Advisor / GCP Recommender or VPA in recommendation mode (`updateMode: "Off"`).
3. **Canary**: change one instance, one node pool, or one replica set slice.
4. **Observe**: compare SLO indicators to baseline for at least one full peak cycle.
5. **Expand**: roll to the rest in batches.
6. **Record**: log the change with expected monthly savings; verify actual savings in billing data after one billing cycle.

### Kubernetes requests via VPA recommendation

```yaml
apiVersion: autoscaling.k8s.io/v1
kind: VerticalPodAutoscaler
metadata:
  name: api-vpa
spec:
  targetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: api
  updatePolicy:
    updateMode: "Off"        # recommend only; apply via Git after review
  resourcePolicy:
    containerPolicies:
      - containerName: "*"
        minAllowed: {cpu: 100m, memory: 128Mi}
        maxAllowed: {cpu: "2", memory: 4Gi}
```

```bash
kubectl get vpa api-vpa -o jsonpath='{.status.recommendation.containerRecommendations}'
```

Apply the recommendation through the normal GitOps pipeline so the change is reviewed and revertible. Do not run VPA in `Auto` mode together with an HPA scaling on the same CPU/memory metric.

### Instance family change with an Auto Scaling group

```bash
# New launch template version with the smaller / newer type
aws ec2 create-launch-template-version --launch-template-id lt-0abc \
  --source-version 3 --launch-template-data '{"InstanceType":"m7g.large"}'

# Instance refresh with checkpoints acts as the canary
aws autoscaling start-instance-refresh --auto-scaling-group-name api-asg \
  --preferences '{"MinHealthyPercentage":90,"CheckpointPercentages":[10,50,100],"CheckpointDelay":1800,"AutoRollback":true}'
```

Moving to ARM (Graviton, Ampere/Cobalt, Axion) needs multi-arch images (`docker buildx build --platform linux/amd64,linux/arm64`) and a test pass on ARM before the refresh.

## Commitment Purchase Strategy

Commitments are priced against a forecast; mistakes last the full term.

- **Measure the floor**: use the minimum hourly on-demand-equivalent spend over the last 30 to 90 days, after steps 1 to 5 above, not the average.
- **Ladder purchases**: buy a portion now and more each month or quarter. Staggered terms expire at different times, keeping flexibility.
- **Prefer flexible instruments**: AWS Compute Savings Plans over EC2 Instance Savings Plans or standard RIs when future instance families are uncertain; Azure savings plan for compute over reservations when the VM mix changes.
- **Target coverage, not 100%**: leave the variable portion on on-demand and spot. Track utilization (are commitments used?) and coverage (how much eligible spend is covered?).
- **Approval**: purchases go through a FinOps role with a ticket that records the forecast, term, payment option and expected savings.

```bash
aws ce get-savings-plans-purchase-recommendation \
  --savings-plans-type COMPUTE_SP --term-in-years ONE_YEAR \
  --payment-option NO_UPFRONT --lookback-period-in-days THIRTY_DAYS
```

## Shift-Left: Cost in the Delivery Pipeline

- Infracost (or the cloud's pricing calculator API) comments the monthly cost delta on infrastructure pull requests.
- Policy-as-code (OPA/Conftest, Checkov, Azure Policy in CI) fails PRs that violate cost guardrails: disallowed SKUs, missing tags, unbounded autoscaling.
- Preview environments are created per PR and destroyed on merge or after a TTL.

```rego
package cost

deny[msg] {
  r := input.resource_changes[_]
  r.type == "aws_instance"
  not startswith(r.change.after.instance_type, "t")
  input.variables.environment.value == "dev"
  msg := sprintf("%s: only burstable instances allowed in dev", [r.address])
}
```

## Verification and Rollback

| Signal | Source | Action if bad |
|--------|--------|---------------|
| SLO burn rate rises | Monitoring | Revert the change (Git revert, previous launch template) |
| Throttling / OOMKilled | Kubernetes events, CloudWatch | Restore previous requests/limits |
| Expected savings not visible after one cycle | Billing export | Investigate: commitment already covered it, or usage moved elsewhere |
| Spot interruption rate high | Interruption notices | Diversify instance types or fall back to on-demand |

## Checklist

- [ ] Waste removal and rightsizing done before buying commitments
- [ ] Each change classified by risk with a matching rollout
- [ ] Baseline metrics captured over a full business cycle
- [ ] Canary + automatic rollback for fleet-wide changes
- [ ] Commitment purchases laddered, approved, and tracked for utilization
- [ ] Savings verified in billing data, not only estimated
