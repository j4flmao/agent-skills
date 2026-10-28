# Advanced Policy as Code: Distribution, Exceptions, Performance and Governance at Scale

Running policy as code across many clusters, accounts and teams: OPA bundles and decision logs, Kubernetes-native CEL admission policies, exception management, progressive enforcement, cloud-organization guardrails, application authorization with Cedar/OPA, policy performance, and measuring compliance.

## Policy Distribution

### OPA bundles
Policies and data are packaged as signed bundles served from an HTTP/OCI registry; OPA instances poll for updates.
```yaml
# opa config.yaml
services:
  policy-registry:
    url: https://registry.example.com
    credentials:
      bearer:
        token_path: /var/run/secrets/opa/token
bundles:
  platform:
    service: policy-registry
    resource: bundles/platform.tar.gz
    polling: { min_delay_seconds: 60, max_delay_seconds: 120 }
    signing:
      keyid: platform-signing-key
decision_logs:
  service: policy-registry
  reporting: { min_delay_seconds: 5, max_delay_seconds: 10 }
keys:
  platform-signing-key:
    algorithm: RS256
    key: |
      -----BEGIN PUBLIC KEY-----
      (public key in PEM format)
      -----END PUBLIC KEY-----
```
```bash
opa build -b policies/ --signing-key private.pem --signing-alg RS256 -o platform.tar.gz
opa test policies/ -v --coverage
```
Signed bundles prevent tampered policies from loading. Decision logs (with sensitive fields masked via `system.log.mask`) provide audit evidence.

### Kubernetes fleets
Store Gatekeeper/Kyverno/VAP manifests in a fleet GitOps repo; Argo CD or Flux apply them to every cluster with environment overlays (audit in dev first, enforce in prod after).

## Kubernetes CEL Admission Policies

ValidatingAdmissionPolicy is GA (Kubernetes 1.30) and runs in the API server without a webhook. Parameters let one policy serve many contexts:
```yaml
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicy
metadata:
  name: max-replicas
spec:
  paramKind:
    apiVersion: v1
    kind: ConfigMap
  matchConstraints:
    resourceRules:
      - apiGroups: ["apps"]
        apiVersions: ["v1"]
        operations: ["CREATE", "UPDATE"]
        resources: ["deployments"]
  variables:
    - name: maxReplicas
      expression: "int(params.data.maxReplicas)"
  validations:
    - expression: "object.spec.replicas <= variables.maxReplicas"
      messageExpression: "'replicas must be <= ' + string(variables.maxReplicas)"
---
apiVersion: admissionregistration.k8s.io/v1
kind: ValidatingAdmissionPolicyBinding
metadata:
  name: max-replicas-team-a
spec:
  policyName: max-replicas
  paramRef:
    name: replica-limits
    namespace: team-a
    parameterNotFoundAction: Deny
  matchResources:
    namespaceSelector:
      matchLabels: { team: a }
  validationActions: ["Deny"]
```
MutatingAdmissionPolicy (CEL-based mutation) arrived later as alpha/beta; check its status for your Kubernetes version. Kyverno also supports CEL expressions and can generate VAPs from its policies.

Choosing at scale: VAP for simple, high-volume validations (no webhook latency or availability risk); Kyverno/Gatekeeper for mutation, generation, image verification, external data and reporting.

## Exception Management

| Approach | Example |
|---|---|
| Engine-native exceptions | Kyverno `PolicyException` resources; Gatekeeper `excludedNamespaces` / match exclusions; VAP binding selectors |
| Data-driven allow lists | OPA data file of approved exceptions with expiry, evaluated by policy |
| Labels/annotations | Only if setting them requires separate privileges, otherwise teams self-exempt |

```yaml
apiVersion: kyverno.io/v2
kind: PolicyException
metadata:
  name: legacy-batch-root
  namespace: batch
  annotations:
    policy.example.com/ticket: SEC-482
    policy.example.com/expires: "2027-01-31"
spec:
  exceptions:
    - policyName: require-run-as-non-root
      ruleNames: [check-run-as-non-root]
  match:
    any:
      - resources:
          kinds: [Pod]
          namespaces: [batch]
          names: ["legacy-report-*"]
```
Rules: every exception has an owner, ticket, justification and expiry; a scheduled job reports expired exceptions; creating exceptions requires a different RBAC role than deploying workloads.

## Progressive Enforcement
```
new policy -> audit (report only, 1-2 weeks) -> warn (users see messages) -> enforce in non-prod -> enforce in prod
```
- Publish violation reports per team before enforcing.
- Track the "would deny" count; enforce when it reaches zero or remaining cases have exceptions.
- Keep a fast rollback (switch binding/rule back to audit via git).

## Cloud Organization Guardrails

| Provider | Mechanism | Example |
|---|---|---|
| AWS | Service control policies (SCPs) and resource control policies (RCPs) in AWS Organizations; AWS Config rules and conformance packs; Control Tower controls | Deny disabling CloudTrail; restrict regions; deny public S3 at org level |
| Azure | Azure Policy (deny, audit, modify, deployIfNotExists) at management-group scope; initiatives | Require tags, allowed locations, enforce diagnostics |
| Google Cloud | Organization Policy constraints (including custom constraints with CEL) | Restrict public IPs, domain-restricted sharing, allowed regions |

```json
{
  "Version": "2012-10-17",
  "Statement": [{
    "Sid": "DenyOutsideApprovedRegions",
    "Effect": "Deny",
    "NotAction": ["iam:*", "organizations:*", "sts:*", "support:*", "cloudfront:*", "route53:*"],
    "Resource": "*",
    "Condition": { "StringNotEquals": { "aws:RequestedRegion": ["eu-west-1", "eu-central-1"] } }
  }]
}
```
Manage these with IaC and the same review/test discipline as other policies; test SCP changes in a sandbox OU first.

## Application Authorization

| Engine | Model | Notes |
|---|---|---|
| OPA (sidecar or library) | Rego over request + data | Flexible; data sync is your responsibility |
| Cedar / Amazon Verified Permissions | RBAC + ABAC with schema validation and policy analysis | Fast evaluation, formally analyzable |
| OpenFGA / SpiceDB | Relationship-based (Zanzibar style) | Sharing and hierarchies |

```cedar
permit (
  principal in Group::"finance",
  action == Action::"approveInvoice",
  resource
)
when { resource.amount <= 10000 && resource.department == principal.department };
```

## Performance
- OPA: index-friendly rules (equality on input fields), avoid iterating large data sets per request, use partial evaluation for compile-time specialization, benchmark with `opa bench`.
- Gatekeeper/Kyverno: limit webhook scope with match selectors, exclude system namespaces carefully, set webhook timeouts and `failurePolicy` deliberately (Fail for security-critical, with HA replicas).
- Prefer VAP for simple checks to remove webhook latency.

## Measuring Compliance
| Metric | Source |
|---|---|
| Violations by policy/team/severity | Policy reports (Kyverno PolicyReport CRs, Gatekeeper audit, cloud compliance dashboards) |
| Deny events per day | Admission/audit logs, OPA decision logs |
| Open/expired exceptions | Exception inventory |
| Mean time to remediate | Ticketing integration |
| Policy test coverage | `opa test --coverage`, Kyverno CLI tests |

## Governance
- Policy owners per domain (security, platform, FinOps); a review board for new enforcing policies.
- Map policies to controls (CIS, NIST 800-53, ISO 27001, SOC 2) in metadata for audit evidence.
- Communicate changes with release notes; provide local tooling (`conftest`, `kyverno apply`) so teams test before pushing.

## Checklist
- [ ] Signed, versioned policy bundles/manifests distributed via GitOps
- [ ] VAP for simple validations; engine webhooks HA with explicit failure policies
- [ ] Exceptions as code with owner, ticket and expiry; separate RBAC
- [ ] Audit -> warn -> enforce rollout with violation reports
- [ ] Cloud org guardrails managed as code and sandbox-tested
- [ ] Decision logs masked and retained as evidence
- [ ] Compliance metrics reported per team
