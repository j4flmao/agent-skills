# OPA/Rego Policy Patterns

## Basic Constraint Template
`ego
package k8s.requiredlabels

violation[{"msg": msg}] {
    provided := {label | input.review.object.metadata.labels[label]}
    required := {"app", "team", "environment"}
    missing := required - provided
    count(missing) > 0
    msg := sprintf("Missing labels: %v", [missing])
}
`

## Common Policies
| Policy | Rule | Severity |
|--------|------|----------|
| Privileged containers | containers[].securityContext.privileged = true | Critical |
| Host network access | spec.hostNetwork = true | High |
| Resource limits | containers[].resources.limits == undefined | Medium |
| Allowed registries | image startswith "mycompany.com/" | High |
| Ingress HTTPS | tls == undefined | Medium |

## Policy Testing
`ego
package k8s.requiredlabels

test_all_labels_present {
    result := violation with input as {"review": {"object": {"metadata": {"labels": {"app": "test", "team": "myteam", "environment": "prod"}}}}}
    count(result) == 0
}
`
"@ | Set-Content -Path "D:\j4flmao-org\skills\devops\policy-as-code\references\opa-rego-patterns.md" -Encoding UTF8

@"
# Kyverno Policies

## Validate Policy
`yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: require-readiness-probe
spec:
  validationFailureAction: Audit
  rules:
  - name: check-readiness-probe
    match:
      any:
      - resources:
          kinds: ["Pod"]
    validate:
      message: "Pods must have a readiness probe"
      pattern:
        spec:
          containers:
          - readinessProbe:
              httpGet:
                path: "?*"
`

## Mutate Policy
`yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: add-sidecar
spec:
  rules:
  - name: inject-sidecar
    match:
      any:
      - resources:
          kinds: ["Pod"]
    mutate:
      patchStrategicMerge:
        spec:
          containers:
          - name: sidecar
            image: mycompany/sidecar:latest
`

## Generate Policy
`yaml
apiVersion: kyverno.io/v1
kind: ClusterPolicy
metadata:
  name: generate-networkpolicy
spec:
  rules:
  - name: generate-default-deny
    match:
      any:
      - resources:
          kinds: ["Namespace"]
    generate:
      kind: NetworkPolicy
      name: default-deny
      synchronize: true
`
"@ | Set-Content -Path "D:\j4flmao-org\skills\devops\policy-as-code\references\kyverno-policies.md" -Encoding UTF8

@"
# Policy CI/CD Integration

## Testing in CI
`yaml
# GitHub Actions for OPA policy testing
- name: Test OPA policies
  run: |
    opa test ./policies/ -v
    conftest test --policy ./policies/ deployment.yaml
`

## Audit Mode
- Deploy new policies in Audit mode first
- Monitor violations for 2 weeks
- Review with team leads
- Switch to Enforce mode after review
- Have a rollback plan for each policy

## Policy as Code Workflow
1. Developer writes policy in Rego/YAML
2. PR review: policy correctness, no false positives
3. CI test: unit tests pass, no breaking changes
4. Deploy to audit mode in staging
5. Monitor for 1 week
6. Deploy to audit mode in production
7. Monitor for 1 week
8. Switch to enforce mode
