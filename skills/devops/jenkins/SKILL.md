---
name: jenkins
description: >
  Use this skill when designing Jenkins CI/CD pipelines — declarative pipeline, shared libraries, agent strategy, security, secrets, multibranch configuration. This skill enforces: declarative pipeline syntax, shared library functions returning closures, credential injection via withCredentials, cleanWs() in post always block. Do NOT use for: non-Jenkins CI/CD systems, infrastructure provisioning, application code patterns.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, jenkins, phase-5]
---

# Jenkins Patterns

## Purpose
Define and enforce Jenkins pipeline design, shared library structure, agent strategy, and security best practices.

## Agent Protocol

### Trigger
User request includes: `jenkins`, `jenkins pipeline`, `declarative pipeline`, `shared library`, `jenkinsfile`, `jenkins agent`, `jenkins security`, `groovy pipeline`, `multibranch`.

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
Produce the artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- Jenkinsfile with stages: checkout, build, test, scan, package, deploy
- Shared library with versioned functions
- Agent configured with Docker/K8s pod template
- Secrets injected via Jenkins credentials

### Max Response Length
4096 tokens

## Workflow

### Step 1: Write Declarative Pipeline
```groovy
// Jenkinsfile
pipeline {
    agent {
        kubernetes {
            yaml '''
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
    hostPath:
      path: /var/run/docker.sock
'''
        }
    }

    environment {
        DOCKER_REGISTRY = 'ghcr.io'
        IMAGE_NAME = "${DOCKER_REGISTRY}/${JOB_NAME}"
        IMAGE_TAG = "${env.BUILD_NUMBER}-${env.GIT_COMMIT.substring(0,7)}"
    }

    stages {
        stage('Checkout') {
            steps { checkout scm }
        }
        stage('Install') {
            steps { container('node') { sh 'npm ci' } }
        }
        stage('Lint') {
            steps { container('node') { sh 'npm run lint' } }
        }
        stage('Test') {
            steps { container('node') { sh 'npm test' } }
            post { always { junit 'reports/**/*.xml' } }
        }
        stage('Build') {
            steps { container('node') { sh 'npm run build' } }
        }
        stage('Docker Build') {
            steps { container('docker') { script { docker.build("${IMAGE_NAME}:${IMAGE_TAG}") } } }
        }
        stage('Docker Push') {
            when { branch 'main' }
            steps {
                container('docker') {
                    script {
                        docker.withRegistry("https://${DOCKER_REGISTRY}", 'ghcr-credentials') {
                            docker.image("${IMAGE_NAME}:${IMAGE_TAG}").push()
                            docker.image("${IMAGE_NAME}:${IMAGE_TAG}").push('latest')
                        }
                    }
                }
            }
        }
        stage('Deploy') {
            when { branch 'main' }
            steps { container('node') { sh "kubectl set image deployment/myapp myapp=${IMAGE_NAME}:${IMAGE_TAG}" } }
        }
    }
    post {
        always { cleanWs() }
        failure {
            slackSend(
                channel: '#ci-failures',
                color: 'danger',
                message: "Pipeline failed: ${env.JOB_NAME} #${env.BUILD_NUMBER} (<${env.BUILD_URL}|Open>)"
            )
        }
        success {
            slackSend(
                channel: '#ci-success',
                color: 'good',
                message: "Pipeline succeeded: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
            )
        }
    }
}
```

### Step 2: Create Shared Library Structure
```
vars/
  dockerBuild.groovy       # dockerBuild(stageName, imageName, tag)
  helmDeploy.groovy        # helmDeploy(releaseName, chartPath, values)
  notifySlack.groovy       # notifySlack(channel, status, message)
  scanImage.groovy         # scanImage(imageName, tag)
src/
  com/company/
    pipeline/
      Utils.groovy         # Utility functions
      Version.groovy       # Version management
resources/
  templates/
    deploy.yaml            # Deployment template snippets
```

### Step 3: Write Shared Library Functions
```groovy
// vars/dockerBuild.groovy
def call(String imageName, String tag, String dockerfile = 'Dockerfile') {
    return {
        stage("${env.STAGE_NAME}") {
            sh """
                docker build -t ${imageName}:${tag} -f ${dockerfile} .
            """
        }
    }
}

// vars/helmDeploy.groovy
def call(String releaseName, String chartPath, Map values = [:]) {
    return {
        stage("Deploy ${releaseName}") {
            sh """
                helm upgrade --install ${releaseName} ${chartPath} \
                    --namespace ${env.K8S_NAMESPACE} \
                    --set image.tag=${env.IMAGE_TAG} \
                    ${values.collect { k, v -> "--set ${k}=${v}" }.join(' ')} \
                    --wait --timeout 5m
            """
        }
    }
}
```

### Step 4: Select Agent Strategy

| Agent Type | When | Configuration |
|---|---|---|
| **Kubernetes pod** | Default, dynamic scaling | Pod template YAML |
| **Static agent** | Dedicated hardware, legacy | Label-based |
| **Docker agent** | Simple builds, no K8s | `agent { docker { image 'node:20' } }` |
| **EC2/cloud agent** | AWS native | EC2 Fleet plugin |

### Step 5: Manage Secrets
```groovy
// Using Jenkins credentials
withCredentials([
    string(credentialsId: 'docker-hub-token', variable: 'DOCKER_TOKEN'),
    usernamePassword(credentialsId: 'ghcr-creds', usernameVariable: 'GHCR_USER', passwordVariable: 'GHCR_PAT')
]) {
    sh """
        echo ${GHCR_PAT} | docker login ghcr.io -u ${GHCR_USER} --password-stdin
    """
}
```

### Step 6: Configure Multibranch Pipeline
```
Jenkinsfile at repository root
Branch sources: GitHub/GitLab/Bitbucket
Build triggers:
  - PR: build all PRs
  - Push: build all branches
  - Scheduled: nightly build for main
Automatic branch discovery:
  - Discover branches (regex: main, release/*)
  - Discover PRs (merged, current)
```

### Step 7: Apply Pipeline Security

| Rule | Implementation |
|---|---|
| **Script security** | `useSandbox = true` for all non-SCM pipelines |
| **Credential binding** | Only via `withCredentials`, never as env vars |
| **Approval** | ScriptApproval plugin for all `new` and `Class.forName` calls |
| **Branch restrictions** | Deploy stage only on `main` branch |

## Rules
- All pipelines use declarative syntax (not scripted) unless shared library.
- Shared library functions return closures; pipeline calls them with `script { ... }`.
- Credentials injected via `withCredentials` — never as plaintext env vars.
- Every stage produces junit XML or similar test report.
- Pipeline failure triggers Slack notification with build URL.
- `cleanWs()` in `post { always }` block.

## References

### Reference Files
- `references/jenkins-pipeline.md` — Advanced pipeline patterns, parallel stages, error handling
- `references/jenkins-best-practices.md` — Jenkins security, performance, plugin management

### Related Skills
- `devops/cicd-pipeline/SKILL.md` — CI/CD pipeline design principles
- `devops/helm-patterns/SKILL.md` — Helm deployment in CI/CD
- `devops/terraform/SKILL.md` — Terraform in CI/CD
- `devops/docker-patterns/SKILL.md` — Docker build and registry

## Handoff
Hand off to `devops/cicd-pipeline/SKILL.md` for CI/CD architecture. Hand off to `devops/helm-patterns/SKILL.md` for Helm deployment integration.
