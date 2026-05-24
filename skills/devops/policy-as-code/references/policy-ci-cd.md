# Policy-as-Code in CI/CD

Integrate policy enforcement into CI/CD pipelines to validate IaC, configurations, container images, and deployments before they reach production.

## OPA Conftest for IaC Scanning

Conftest applies Rego policies to configuration files:

```bash
# Install
brew install conftest

# Scan a Terraform plan
terraform plan -out=plan.tfplan
terraform show -json plan.tfplan > plan.json
conftest test plan.json --policy policies/terraform/

# Scan Kubernetes manifests
conftest test deployment.yaml --policy policies/k8s/

# Scan Dockerfile
conftest test Dockerfile --policy policies/docker/

# Scan with namespace
conftest test deployment.yaml --namespace required_labels --policy policies/
```

### Conftest Policy Example

```rego
package main

deny[msg] {
    input.kind == "Deployment"
    not input.spec.template.spec.containers[_].resources.limits
    msg := "Containers must have resource limits defined"
}

deny[msg] {
    input.kind == "Pod"
    not input.spec.securityContext.runAsNonRoot
    msg := "Pod must run as non-root user"
}
```

### GitHub Actions with Conftest

```yaml
name: Policy Check
on: [pull_request]
jobs:
  policy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install conftest
        run: |
          curl -sSL https://github.com/open-policy-agent/conftest/releases/download/v0.54.0/conftest_0.54.0_Linux_x86_64.tar.gz | tar xz
          sudo mv conftest /usr/local/bin/
      - name: Scan K8s manifests
        run: |
          conftest test k8s/*.yaml \
            --policy policies/kubernetes \
            --fail-on-warn \
            --all-namespaces
      - name: Scan Terraform
        run: |
          terraform fmt -check
          terraform init
          terraform validate
          terraform plan -out=plan.tfplan
          terraform show -json plan.tfplan > plan.json
          conftest test plan.json --policy policies/terraform
```

## Trivy Policies

Trivy scans IaC, containers, and Kubernetes for security issues with custom policies:

```yaml
name: Trivy Policy Scan
on:
  push:
    branches: [main]
  pull_request:
jobs:
  trivy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Scan K8s manifests
        uses: aquasecurity/trivy-action@master
        with:
          scan-type: 'config'
          scan-ref: 'k8s/'
          severity: 'HIGH,CRITICAL'
          format: 'sarif'
          output: 'trivy-results.sarif'
          scanners: 'vuln,secret,config'
      - name: Upload results
        uses: github/codeql-action/upload-sarif@v3
        with:
          sarif_file: 'trivy-results.sarif'
```

### Custom Trivy Policies

```yaml
# trivy-policy/allow-privileged-escalation.rego
package builtin.kubernetes.allow_privilege_escalation

deny[msg] {
    container := input.containers[_]
    container.securityContext.allowPrivilegeEscalation != false
    msg := sprintf("Container %v must set allowPrivilegeEscalation=false", [container.name])
}
```

## Policy Testing in Pipelines

```yaml
name: Policy Test Suite
on: [pull_request]
jobs:
  test-policies:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install OPA
        run: |
          curl -sSL https://openpolicyagent.org/downloads/v0.63.0/opa_linux_amd64_static -o opa
          chmod +x opa && sudo mv opa /usr/local/bin/
      - name: Run OPA tests
        run: |
          opa test policies/kubernetes/ -v --coverage --format=json > coverage.json
          opa test policies/kubernetes/ -v
      - name: Check coverage threshold
        run: |
          COVERAGE=$(opa test policies/kubernetes/ --coverage --format=json | jq '.coverage')
          if (( $(echo "$COVERAGE < 80" | bc -l) )); then
            echo "Policy coverage $COVERAGE% is below 80% threshold"
            exit 1
          fi
```

## Gating Deployments

### ArgoCD Pre-sync Check

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: policy-check
  annotations:
    argocd.argoproj.io/hook: PreSync
    argocd.argoproj.io/hook-delete-policy: HookSucceeded
spec:
  template:
    spec:
      containers:
        - name: conftest
          image: openpolicyagent/conftest:v0.54.0
          command:
            - sh
            - -c
            - |
              kubectl get deployment myapp -o yaml > /tmp/deploy.yaml
              conftest test /tmp/deploy.yaml --policy /policies
          volumeMounts:
            - name: policies
              mountPath: /policies
      volumes:
        - name: policies
          configMap:
            name: deployment-policies
```

### Pipeline Gate

```yaml
name: Deployment Pipeline
on:
  push:
    branches: [main]
jobs:
  policy-gate:
    runs-on: ubuntu-latest
    outputs:
      passed: ${{ steps.check.outputs.passed }}
    steps:
      - uses: actions/checkout@v4
      - name: Run policy checks
        id: check
        run: |
          conftest test k8s/overlays/production/ --policy policies/production/
          echo "passed=true" >> $GITHUB_OUTPUT
  deploy:
    needs: [policy-gate]
    if: needs.policy-gate.outputs.passed == 'true'
    runs-on: ubuntu-latest
    steps:
      - name: Deploy
        run: echo "Deploying..."
```

## Multi-Stage Pipeline Policy

```yaml
jobs:
  lint:
    steps:
      - run: conftest test --policy policies/k8s-baseline/
  test:
    steps:
      - run: conftest test --policy policies/k8s-strict/
  security:
    steps:
      - run: trivy config --severity HIGH,CRITICAL k8s/
  pre-deploy:
    environment: production
    steps:
      - run: conftest test --policy policies/k8s-production/
```

Policy enforcement in CI/CD catches misconfigurations early, prevents policy violations from reaching production, and provides an audit trail of compliance checks.
