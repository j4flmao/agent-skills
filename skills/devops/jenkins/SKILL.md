---
name: jenkins
description: >
  Use this skill when designing Jenkins CI/CD pipelines -- declarative pipeline, shared libraries, agent strategy, security, secrets, multibranch configuration. This skill enforces: declarative pipeline syntax, shared library functions returning closures, credential injection via withCredentials, cleanWs() in post always block. Do NOT use for: non-Jenkins CI/CD systems, infrastructure provisioning, application code patterns.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsuf: true
tags: [devops, jenkins, phase-5]
---

# Jenkins Patterns

## Purpose
Define and enforce Jenkins pipeline design, shared library structure, agent strategy,
and security best practices. Covers declarative pipeline syntax, shared library patterns,
agent management, secret injection, and multibranch configuration.

## Framework and Methodology

### Pipeline Architecture
Jenkins pipelines follow a structured execution model:

```
Declarative Pipeline (preferred):
  - Structure: pipeline { agent { ... } stages { ... } post { ... } }
  - Benefits: simpler syntax, validation, Blue Ocean visualization, input/skip/parallel.
  - Limitations: limited programmatic control, must use script block for complex logic.

Scripted Pipeline:
  - Structure: node { stage('name') { ... } }
  - Benefits: full Groovy flexibility, complex conditionals, dynamic stages.
  - Limitations: harder to validate, no structural enforcement, less visualization support.

Guidance:
  - Use declarative for all new pipelines.
  - Use shared library for complex logic (keeps Jenkinsfile clean).
  - Only use scripted when declarative cannot express the pattern.
```

### Shared Library Design
```
vars/        - Global functions callable from pipeline.
src/         - Utility classes and helpers.
resources/   - Static files used by pipeline.

Function pattern:
  - Each function in vars/ is a separate file.
  - Function name = file name.
  - Returns a closure for deferred execution.
  - Accepts named parameters for clarity.
```

### Agent Strategy
Match agent type to workload characteristics:

```
Kubernetes Pod: default for cloud-native, dynamic scaling.
Static Agent: dedicated hardware, legacy systems, GPU workloads.
Docker Agent: simple builds where container isolation suffices.
EC2/Cloud Agent: AWS-native environments, spot instances.
```

## Agent Protocol

### Trigger
User request includes: `jenkins`, `jenkins pipeline`, `declarative pipeline`,
`shared library`, `jenkinsfile`, `jenkins agent`, `jenkins security`,
`groovy pipeline`, `multibranch`.

### Input Context
- Jenkins version and plugins
- Pipeline type (declarative, scripted, shared library)
- Agent infrastructure (K8s, static, EC2)
- Current CI/CD pain points

### Output Artifact
A markdown document containing:
- Jenkinsfile template (declarative pipeline)
- Shared library structure and conventions
- Agent strategy (Kubernetes pod template)
- Secret management (credentials, vault)
- Pipeline security (sandbox, approval)
- Multibranch pipeline configuration
- Notification and reporting

### Response Format
Produce the artifact directly. No preamble, no postamble, no explanations.
No filler, no hedging, no transitions. Compress output.

### Completion Criteria
- Jenkinsfile with stages: checkout, build, test, scan, package, deploy
- Shared library with versioned functions
- Agent configured with Docker/K8s pod template
- Secrets injected via Jenkins credentials

### Max Response Length
4096 tokens

## Workflow

### Step 1: Write Declarative Pipeline
Standard Jenkinsfile template with checkout, install, lint, test, build, docker, deploy stages.
Use post for notifications and cleanup.

### Step 2: Create Shared Library Structure
Organize vars/ with reusable pipeline functions.
Organize src/ with utility classes.
Organize resources/ with static templates.

### Step 3: Write Shared Library Functions
Functions return closures for use inside script block.
Parameters for configuration, defaults for common values.

### Step 4: Select Agent Strategy
Match agent type to workload. Prefer Kubernetes for dynamic scaling.
Define pod templates with all required containers.

### Step 5: Manage Secrets
Use withCredentials for credential injection.
Never hardcode secrets in Jenkinsfile or shared library.
Prefer Jenkins credential store over environment variables.

### Step 6: Configure Multibranch Pipeline
Define branch sources, build triggers, and automatic discovery.
Branch filter regex for main and release branches.

### Step 7: Apply Pipeline Security
Sandbox for untrusted pipelines. Script approval for new method calls.
Branch restrictions for deploy stages.

### Step 8: Implement Notifications
Slack integration for pipeline status.
Email for failure notifications.
Dashboard for pipeline health overview.

## Common Pitfalls

1. **Scripted pipeline for everything**: harder to parse, maintain, and visualize. Use declarative.
2. **Hardcoded credentials in Jenkinsfile**: security risk. Use withCredentials.
3. **Missing cleanWs() in post always**: agents accumulate workspace files over time.
4. **No test report publishing**: lost visibility into test trends.
5. **Overly complex shared library functions**: one function does too much. Keep focused.
6. **Single-agent assumption**: pipeline breaks if agent type changes.
7. **Missing checkout scm**: each stage assumes git repo is present without explicit checkout.
8. **No parallel execution**: slow pipelines. Run independent stages in parallel.
9. **Ignoring pipeline security**: users can write dangerous Groovy. Enforce sandbox.
10. **No versioning in library**: breaking changes break all pipelines.

## Best Practices

- Use declarative pipeline syntax for all new pipelines.
- Keep Jenkinsfile minimal -- push complexity to shared library.
- Each pipeline stage produces a clear artifact or report.
- Use parallel for independent stages to reduce total build time.
- Set timeout per stage to prevent hung builds.
- Use buildDiscard to limit stored artifacts.
- Test shared library changes in a separate branch before merging.
- Version shared library and pin Jenkinsfile to specific version.
- Use environment directive for configuration, not inline strings.
- Monitor Jenkins performance: queue time, executor usage.

## Compared With

| Feature | Jenkins | GitHub Actions | GitLab CI | CircleCI |
|---|---|---|---|---|
| Pipeline syntax | Groovy | YAML | YAML | YAML |
| Shared library | Yes (vars + classes) | Composite actions | Includes | Orbs |
| Agent types | K8s, static, cloud, docker | GitHub-hosted, self-hosted | Runner, K8s | Docker, machine |
| Multibranch | Native | Workflow triggers | Branch pipelines | Dynamic config |
| Security model | Sandbox, approval | OIDC, environments | Protected vars | Contexts |
| Plugin ecosystem | Largest | Growing (marketplace) | Moderate | Moderate |
| Complexity | High | Low | Medium | Medium |

## Templates and Tools

### Jenkinsfile Template
```groovy
pipeline {
    agent { kubernetes { yaml podTemplate } }
    environment {
        REGISTRY = 'ghcr.io'
        IMAGE = "${REGISTRY}/${JOB_NAME}"
    }
    stages {
        stage('Checkout') { steps { checkout scm } }
        stage('Install') { steps { container('node') { sh 'npm ci' } } }
        stage('Test') { steps { container('node') { sh 'npm test' } } }
        stage('Build') { steps { container('node') { sh 'npm run build' } } }
    }
    post { always { cleanWs() } }
}
```

### Shared Library Function Template
```groovy
// vars/dockerBuild.groovy
def call(Map config) {
    return {
        stage(config.stageName ?: 'Docker Build') {
            sh "docker build -t ${config.image}:${config.tag} ."
        }
    }
}
```

### Pod Template Template
```yaml
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: node
    image: node:20
    command: [cat]
    tty: true
  - name: docker
    image: docker:24
    command: [cat]
    tty: true
    volumeMounts:
    - mountPath: /var/run/docker.sock
      name: docker-sock
  volumes:
  - name: docker-sock
    hostPath: { path: /var/run/docker.sock }
```

## Rules
- All pipelines use declarative syntax unless shared library requires scripted.
- Shared library functions return closures; pipeline calls them with script block.
- Credentials injected via withCredentials -- never as plaintext env vars.
- Every stage produces junit XML or similar test report.
- Pipeline failure triggers Slack notification with build URL.
- cleanWs() in post always block.
- Pipeline has timeout at stage level (minimum 10 min per stage).
- No shared library function exceeds 100 lines.
- Jenkinsfile does not contain credentials, tokens, or secrets.
- Multibranch pipeline uses branch filter regex -- never discover all branches.
- Deploy stage limited to main branch only.
- Pipeline library versioned and tested before applying to all projects.
- Build artifacts discarded after 30 days (max 10 builds).
- Every stage uses explicit container context (container('name') for K8s).
- Pipeline errors must surface in Blue Ocean visualization (not just console).

## References
  - references/jenkins-advanced.md -- Jenkins Advanced Topics
  - references/jenkins-best-practices.md -- Jenkins Best Practices
  - references/jenkins-fundamentals.md -- Jenkins Fundamentals
  - references/jenkins-ops.md -- Jenkins Operations
  - references/jenkins-pipeline.md -- Jenkins Pipeline Reference
  - references/jenkins-shared-libraries.md -- Jenkins Shared Libraries
  - references/jenkins-pipeline-as-code.md -- Jenkins Pipeline as Code
  - references/jenkins-security-hardening.md -- Jenkins Security Hardening

## Handoff
Hand off to `devops/cicd-pipeline/SKILL.md` for CI/CD architecture.
Hand off to `devops/helm-patterns/SKILL.md` for Helm deployment integration.
