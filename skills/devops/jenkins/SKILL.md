---
name: jenkins
description: >
  Use this skill when the user says 'jenkins', 'jenkins pipeline',
  'jenkinsfile', 'declarative pipeline', 'scripted pipeline',
  'jenkins shared library', 'jenkins agent', 'jenkins node',
  'jenkins plugin', 'jenkins blue ocean', 'jenkins credentials',
  'jenkins multibranch', 'jenkins folder', 'jenkins job',
  'jenkins groovy', 'pipeline as code', 'agent any', 'post
  block', 'when block', 'parallel pipeline', 'stage',
  'declarative pipeline', 'scripted pipeline', 'pipeline
  syntax', 'jenkinsfile best practices', 'jenkins security',
  'jenkins high availability', 'jenkins backup', 'jenkins
  casC', 'configuration as code', 'jenkins operator',
  'jcasc', 'shared library', 'pipeline utility steps',
  'jenkinsfile generator'.
  Covers: Jenkins pipeline development, shared libraries,
  multibranch pipelines, security hardening, high availability,
  configuration as code, plugin management, and operations.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [devops, jenkins, ci-cd, pipeline, phase-4]
---

# Jenkins

## Purpose
Design, configure, and operate Jenkins for CI/CD pipelines with declarative/scripted pipelines, shared libraries, multibranch automation, security hardening, and high availability.

## Agent Protocol

### Trigger
Exact user phrases: "jenkins", "jenkins pipeline", "jenkinsfile", "declarative pipeline", "scripted pipeline", "shared library", "multibranch pipeline", "jenkins agent", "jenkins credentials", "generative AI", "pipeline as code", "jcasc", "configuration as code", "jenkins operator".

### Input Context
- Jenkins version and installation method (war, Docker, Helm, OC/K8s Operator).
- Pipeline type (Declarative or Scripted).
- Credentials and secrets management approach.
- Agent configuration (static, dynamic, Kubernetes, Docker).
- Shared library usage and structure.
- Plugin list (especially security-critical ones).

### Output Artifact
Jenkinsfile, shared library Groovy, CasC YAML, or Helm values for Jenkins deployment.

### Response Format
Groovy (Jenkinsfile or shared library) or YAML. No preamble.

### Completion Criteria
- [ ] Jenkinsfile written with stages, agent, environment, post, when.
- [ ] Declarative pipeline with proper error handling (post always, try-catch).
- [ ] Credentials configured (username-password, SSH, secret text, file).
- [ ] Jenkins Configuration as Code (CasC) defined for reproducible setup.
- [ ] Shared library created with reusable pipeline steps.
- [ ] Multibranch pipeline configured for PR-based workflows.
- [ ] Security: CSRF protection, agent → master access control, credential binding.
- [ ] High availability: external database, shared storage, load balancer.

### Max Response Length
400 lines.

## Quick Start
Install via `helm install jenkins jenkins/jenkins -f values.yaml` → Access UI → Create Multibranch Pipeline pointing to GitHub repo → Jenkinsfile in repo root → Define stages (Checkout → Build → Test → Deploy) → Set up credentials → Run pipeline → Monitor.

## Decision Tree: Pipeline Types
| Feature | Declarative | Scripted |
|---------|-------------|----------|
| **Structured** | Yes (stage > steps) | Free-form Groovy |
| **Error handling** | post blocks | try-catch-finally |
| **Parallel** | `parallel` directive | `parallel` in script block |
| **When conditions** | `when` directive | if-else Groovy |
| **Input/approval** | `input` directive | `input` step |
| **Matrix** | `matrix` directive | Loops + parallel |
| **Best for** | 90% of pipelines | Complex conditional logic |
| **Recommendation** | Start here | Only when declarative can't express |

## Core Workflow

### Step 1: Declarative Pipeline
```groovy
pipeline {
    agent {
        kubernetes {
            yaml '''
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: ci
    image: jenkins/inbound-agent:latest
    command:
    - cat
    tty: true
  - name: docker
    image: docker:24-cli
    command:
    - cat
    tty: true
    volumeMounts:
    - name: docker-socket
      mountPath: /var/run/docker.sock
  - name: sonar
    image: sonarsource/sonar-scanner-cli:latest
    command:
    - cat
    tty: true
  volumes:
  - name: docker-socket
    hostPath:
      path: /var/run/docker.sock
'''
            defaultContainer: 'ci'
        }
    }

    environment {
        DOCKER_REGISTRY = 'ghcr.io/myorg'
        APP_NAME = 'my-service'
        DOCKER_TAG = "${env.BRANCH_NAME}-${env.BUILD_NUMBER}"
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timestamps()
        ansiColor('xterm')
        disableConcurrentBuilds()
        timeout(time: 30, unit: 'MINUTES')
    }

    triggers {
        pollSCM('H/5 * * * *')
    }

    parameters {
        choice(name: 'ENVIRONMENT', choices: ['dev', 'staging', 'prod'], description: 'Deploy target')
        booleanParam(name: 'SKIP_TESTS', defaultValue: false, description: 'Skip test stage')
    }

    stages {
        stage('Checkout') {
            steps {
                checkout scmGit(
                    branches: [[name: '*/main']],
                    userRemoteConfigs: [[url: 'https://github.com/myorg/my-service.git']]
                )
            }
        }

        stage('Lint') {
            steps {
                container('ci') {
                    sh 'npm run lint'
                }
            }
        }

        stage('Test') {
            when {
                expression { !params.SKIP_TESTS }
            }
            parallel {
                stage('Unit') {
                    steps {
                        container('ci') {
                            sh 'npm run test:unit'
                        }
                    }
                }
                stage('Integration') {
                    steps {
                        container('ci') {
                            sh 'npm run test:integration'
                        }
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                container('sonar') {
                    withSonarQubeEnv('SonarQube') {
                        sh 'sonar-scanner'
                    }
                }
            }
        }

        stage('Build') {
            steps {
                container('docker') {
                    sh """
                        docker build -t ${DOCKER_REGISTRY}/${APP_NAME}:${DOCKER_TAG} .
                        docker push ${DOCKER_REGISTRY}/${APP_NAME}:${DOCKER_TAG}
                    """
                }
            }
        }

        stage('Deploy') {
            when {
                expression { params.ENVIRONMENT != 'dev' }
            }
            input {
                message "Deploy ${APP_NAME}:${DOCKER_TAG} to ${params.ENVIRONMENT}?"
                ok "Deploy"
                parameters {
                    string(name: 'APPROVER', defaultValue: '', description: 'Your name')
                }
            }
            steps {
                container('ci') {
                    sh """
                        helm upgrade --install ${APP_NAME} ./charts/${APP_NAME} \
                            --namespace ${params.ENVIRONMENT} \
                            --set image.tag=${DOCKER_TAG}
                    """
                }
            }
        }
    }

    post {
        always {
            cleanWs()
        }
        success {
            emailext(
                to: 'team@example.com',
                subject: "SUCCESS: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                body: "Pipeline completed successfully."
            )
        }
        failure {
            emailext(
                to: 'team@example.com',
                subject: "FAILURE: ${env.JOB_NAME} - ${env.BUILD_NUMBER}",
                body: "Pipeline failed at ${env.STAGE_NAME}."
            )
        }
        unstable {
            echo 'Pipeline result is unstable'
        }
    }
}
```

### Step 2: Shared Library Structure
```
vars/
├── dockerBuild.groovy          # Call as: dockerBuild('myapp', '1.0.0')
├── deployHelm.groovy           # Call as: deployHelm('myapp', 'staging')
├── notifySlack.groovy          # Call as: notifySlack('SUCCESS')
└── withMavenSettings.groovy    # Call as: withMavenSettings { ... }
src/
├── org/mycompany/
│   ├── PipelineUtils.groovy
│   ├── DockerHelper.groovy
│   └── SecurityScanner.groovy
resources/
└── org/mycompany/
    └── templates/
        └── deployment.yaml
```

```groovy
// vars/dockerBuild.groovy
def call(String imageName, String imageTag, String dockerfile = 'Dockerfile') {
    return {
        stage("Docker Build: ${imageName}") {
            sh """
                docker build -t ${imageName}:${imageTag} -f ${dockerfile} .
                docker tag ${imageName}:${imageTag} ${imageName}:latest
            """
        }
    }
}

// vars/notifySlack.groovy
def call(String buildStatus, String channel = '#ci-cd') {
    def color = buildStatus == 'SUCCESS' ? 'good' : (buildStatus == 'FAILURE' ? 'danger' : 'warning')
    def message = """
        {
            "attachments": [{
                "color": "${color}",
                "text": "Job: ${env.JOB_NAME}\\nStatus: ${buildStatus}\\nBuild: ${env.BUILD_NUMBER}\\nURL: ${env.BUILD_URL}",
                "mrkdwn": true
            }]
        }
    """
    sh "curl -X POST -H 'Content-type: application/json' --data '${message}' ${SLACK_WEBHOOK_URL}"
}

// src/org/mycompany/DockerHelper.groovy
package org.mycompany

class DockerHelper implements Serializable {
    private final String registry

    DockerHelper(String registry) {
        this.registry = registry
    }

    String buildAndPush(String appName, String tag) {
        sh "docker build -t ${registry}/${appName}:${tag} ."
        sh "docker push ${registry}/${appName}:${tag}"
        return "${registry}/${appName}:${tag}"
    }

    String scanImage(String imageName) {
        return sh(
            script: "trivy image --severity HIGH,CRITICAL --exit-code 0 ${imageName}",
            returnStdout: true
        ).trim()
    }
}
```

### Step 3: Shared Library Usage in Pipeline
```groovy
// Jenkinsfile with shared library
@Library('my-shared-library@main') _

pipeline {
    agent any

    environment {
        REGISTRY = 'ghcr.io/myorg'
        APP_NAME = 'my-service'
    }

    stages {
        stage('Build') {
            steps {
                script {
                    dockerBuild(APP_NAME, env.BUILD_NUMBER)
                }
            }
        }

        stage('Scan') {
            steps {
                script {
                    def helper = new org.mycompany.DockerHelper(env.REGISTRY)
                    def report = helper.scanImage("${APP_NAME}:${env.BUILD_NUMBER}")
                    echo report
                }
            }
        }

        stage('Deploy') {
            steps {
                script {
                    deployHelm(APP_NAME, params.ENVIRONMENT)
                }
            }
        }
    }

    post {
        always {
            script {
                notifySlack(currentBuild.currentResult)
            }
        }
    }
}
```

### Step 4: Configuration as Code (CasC)
```yaml
# jenkins-casc.yaml
jenkins:
  systemMessage: "Jenkins configured by Configuration as Code"
  numExecutors: 0
  mode: NORMAL
  scmCheckoutRetryCount: 3

  securityRealm:
    saml:
      binding: "urn:oasis:names:tc:SAML:2.0:bindings:HTTP-Redirect"
      displayNameAttributeName: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name"
      groupsAttributeName: "groups"
      idpMetadataConfiguration:
        url: "https://idp.example.com/saml/metadata"
      maximumAuthenticationLifetime: 86400

  authorizationStrategy:
    roleBased:
      roles:
        global:
          - name: "admin"
            permissions:
              - "Overall/Administer"
            assignments:
              - "admin-team"
          - name: "developer"
            permissions:
              - "Overall/Read"
              - "Job/Build"
              - "Job/Cancel"
              - "Job/Read"
              - "Job/Workspace"
              - "Run/Update"
              - "SCM/Tag"
            assignments:
              - "developers"
          - name: "viewer"
            permissions:
              - "Overall/Read"
              - "Job/Read"
            assignments:
              - "authenticated"

  crumbIssuer:
    standard:
      excludeClientIPFromCrumb: true

  remotingSecurity:
    enabled: true

unclassified:
  location:
    url: "https://jenkins.example.com"

  gitSCM:
    globalConfigName: "jenkins"
    globalConfigEmail: "jenkins@example.com"

  mailer:
    charset: "UTF-8"
    defaultSuffix: "@example.com"

credentials:
  system:
    domainCredentials:
      - credentials:
          - string:
              scope: GLOBAL
              id: "docker-hub-token"
              secret: "${DOCKER_HUB_TOKEN}"
              description: "Docker Hub access token"
          - usernamePassword:
              scope: GLOBAL
              id: "github-credentials"
              username: "${GITHUB_USERNAME}"
              password: "${GITHUB_TOKEN}"
              description: "GitHub credentials"
          - sshUserPrivateKey:
              scope: GLOBAL
              id: "deploy-key"
              username: "jenkins"
              privateKeySource:
                directEntry:
                  privateKey: "${DEPLOY_SSH_KEY}"
              description: "SSH deploy key"
```

### Step 5: Kubernetes Agent Pod Template
```yaml
# Helm values for Jenkins on K8s with dynamic agents
controller:
  installPlugins:
    - kubernetes:latest
    - workflow-aggregator:latest
    - git:latest
    - configuration-as-code:latest
    - role-strategy:latest
    - saml:latest
    - blueocean:latest
  JCasC:
    authorizationStrategy: roleBased
  resources:
    requests:
      cpu: "1"
      memory: "2Gi"
    limits:
      cpu: "2"
      memory: "4Gi"
  ingress:
    enabled: true
    hostName: jenkins.example.com
    tls:
      - secretName: jenkins-tls

agent:
  enabled: true
  volumes:
    - type: HostPath
      hostPath: /var/run/docker.sock
      mountPath: /var/run/docker.sock
  podTemplates:
    - name: "nodejs"
      label: "nodejs"
      containers:
        - name: node
          image: node:22
          command: "/bin/sh -c cat"
          ttyEnabled: true
          resourceRequestCpu: "500m"
          resourceRequestMemory: "512Mi"
          resourceLimitCpu: "2"
          resourceLimitMemory: "2Gi"
    - name: "python"
      label: "python"
      containers:
        - name: python
          image: python:3.12
          command: "/bin/sh -c cat"
          ttyEnabled: true
    - name: "golang"
      label: "golang"
      containers:
        - name: go
          image: golang:1.22
          command: "/bin/sh -c cat"
          ttyEnabled: true
    - name: "docker"
      label: "docker"
      containers:
        - name: docker
          image: docker:24-cli
          command: "/bin/sh -c cat"
          ttyEnabled: true
          privileged: true
      volumes:
        - hostPath: /var/run/docker.sock
          mountPath: /var/run/docker.sock

persistence:
  enabled: true
  size: 50Gi
```

### Step 6: Multibranch Pipeline Configuration
```groovy
// Jenkinsfile for multibranch pipeline
pipeline {
    agent any

    triggers {
        // Build PRs and branches
        eventTrigger {
            enabled(true)
        }
    }

    stages {
        stage('Credential Check') {
            steps {
                script {
                    // Use credential binding for secret access
                    withCredentials([
                        string(credentialsId: 'sonar-token', variable: 'SONAR_TOKEN'),
                        usernamePassword(credentialsId: 'docker-hub', usernameVariable: 'DOCKER_USER', passwordVariable: 'DOCKER_PASS')
                    ]) {
                        sh """
                            docker login -u ${DOCKER_USER} -p ${DOCKER_PASS}
                            sonar-scanner -Dsonar.login=${SONAR_TOKEN}
                        """
                    }
                }
            }
        }

        stage('Branch-specific Logic') {
            when {
                expression { env.BRANCH_NAME == 'main' }
            }
            steps {
                script {
                    env.DEPLOY_ENABLED = 'true'
                }
            }
        }

        stage('PR Comment') {
            when {
                changeRequest()
            }
            steps {
                script {
                    // Post test results as PR comment
                    def testResults = sh(script: 'npm run test:ci', returnStdout: true)
                    publishReport(testResults)
                }
            }
        }
    }

    post {
        pullRequest {
            // Update PR status
            updateGithubPullRequestStatus()
        }
    }
}
```

### Step 7: Pipeline with Quality Gates
```groovy
pipeline {
    agent any

    tools {
        nodejs 'node-22'
        maven 'maven-3'
    }

    stages {
        stage('Static Analysis') {
            parallel {
                stage('ESLint') {
                    steps { sh 'npm run lint' }
                }
                stage('Secret Scan') {
                    steps {
                        sh 'trufflehog --regex --entropy=False https://github.com/myorg/myapp'
                    }
                }
                stage('Dependency Check') {
                    steps {
                        sh 'npm audit --audit-level=high'
                    }
                }
            }
        }

        stage('Quality Gate') {
            steps {
                timeout(time: 5, unit: 'MINUTES') {
                    input message: 'Proceed with build?', ok: 'Continue'
                }
            }
        }

        stage('Build & Publish') {
            steps {
                script {
                    def dockerHelper = new org.mycompany.DockerHelper('ghcr.io/myorg')
                    def image = dockerHelper.buildAndPush('myapp', env.BUILD_NUMBER)
                    dockerHelper.scanImage(image)
                }
            }
        }
    }
}
```

### Step 8: Security Hardening
```yaml
# CasC snippet for security
jenkins:
  # Enable security
  disableRememberMe: false
  executors:
    - name: "built-in"
      numExecutors: 0        # Disable built-in executor
      mode: EXCLUSIVE

  # Agent to master security
  slaveAgentPort: 50000
  agentProtocols:
    - "JNLP4-connect"
    - "Ping"

security:
  remoting:
    enabled: false           # Disable old remoting protocol
  sSHD:
    port: -1                 # Disable SSH

unclassified:
  # Markup formatter security
  markupFormatter:
    rawHtml:
      disableSyntaxHighlighting: true
  # Git plugin security
  gitSCM:
    allowSecondFetch: false
    createAccountBasedOnEmail: false
```

### Step 9: High Availability
```yaml
# Helm values for HA Jenkins
controller:
  replicaCount: 2
  image:
    tag: "2.452.1-jdk17"
  # External database (PostgreSQL)
  database:
    driver: org.postgresql.Driver
    url: "jdbc:postgresql://postgres-rds:5432/jenkins"
    user: jenkins
    passwordSecret: jenkins-db-password
    
  # Shared storage for JENKINS_HOME
  persistence:
    enabled: true
    existingClaim: jenkins-home-pvc
    
  # Load balancer health check
  healthProbes: true
  readinessProbe:
    path: "/login"
    initialDelaySeconds: 120
    periodSeconds: 30
    failureThreshold: 10
    
  serviceAnnotations:
    service.beta.kubernetes.io/aws-load-balancer-ssl-cert: "arn:aws:acm:..."
    service.beta.kubernetes.io/aws-load-balancer-backend-protocol: "http"

# Backup configuration
backup:
  enabled: true
  schedule: "0 2 * * *"
  image:
    repository: "maorfr/kubectl"
    tag: "latest"
  volumeMounts:
    - name: jenkins-home
      mountPath: /var/jenkins_home
  s3:
    bucket: "jenkins-backups"
    prefix: "daily/"
```

### Step 10: Plugin Management
```groovy
// Plugin management via script
@NonCPS
def installPlugins(String... plugins) {
    def jenkins = Jenkins.instance
    def updateCenter = jenkins.updateCenter
    plugins.each { plugin ->
        def installer = updateCenter.getPlugin(plugin).deploy()
        installer.get()
    }
}

// Or use CasC
jenkins:
  installState:
    initial: true
  numExecutors: 0
  pluginManager:
    pluginUpdateCheck: true
```

## Rules
- Always use Declarative pipeline for new projects; use Scripted only when declarative doesn't fit.
- Use `post` blocks for cleanup and notifications — never put them in stages.
- Use `when` for conditional stage execution — avoids complex Groovy conditionals.
- Pin agent container versions (node:22, python:3.12) — `latest` breaks builds unpredictably.
- Every pipeline must have a timeout to prevent runaway builds.
- Use `buildDiscarder` to limit artifact retention in all pipelines.
- Credentials via `withCredentials` binding — never `sh "echo ${PASSWORD}"`.
- Load shared libraries via `@Library` — never inline duplicate code.
- Use CasC for managing Jenkins configuration — avoid UI changes.
- Disable the built-in executor — use agents for all workloads.
- Enforce HTTPS with a valid certificate for production Jenkins.

## Production Considerations
- Use external PostgreSQL or MySQL for Jenkins' internal DB — H2 is not production-safe.
- Split JENKINS_HOME to NFS/EFS/FSx for active/passive HA.
- Set up automated backup of JENKINS_HOME — restore tested quarterly.
- Use Jenkins Operator for Kubernetes deployment if managing multiple instances.
- Rotate Jenkins admin credentials and agent secrets periodically.
- Monitor Jenkins JVM heap usage — OOM kills the master.
- Pin Jenkins version — auto-updates can break plugins.
- Use resource quotas on K8s agents to prevent resource exhaustion.
- Limit concurrent builds per node to prevent I/O saturation.
- Use `GitHub Branch Source` plugin for native GitHub integration.
- Configure `globalPipelineProperties` for env vars available to all pipelines.

## Anti-Patterns
- Using built-in executors for builds — kills master performance.
- Putting secrets in environment variables — visible in logs and API.
- `agent any` without label — builds run on random agents.
- No `post { always { cleanWs() } }` — disk fills up with workspace data.
- No timeout on pipeline — runaway builds consume agents.
- Groovy outside `steps` block in Declarative — mixing syntax.
- `buildDiscarder` not set — fill up storage with old artifacts.
- Manual plugin management — use CasC or Operator.
- Single Jenkins master — no HA, downtime during updates.
- Long `sh` scripts in Jenkinsfile — extract to shared library or Makefile.
- H2 database in production — data loss on restart.
- Multibranch pipeline without PR trigger — stale branches waste resources.

## References
  - references/jenkins-advanced.md — Jenkins Advanced Topics
  - references/jenkins-fundamentals.md — Jenkins Fundamentals
  - references/jenkins-casc.md — Configuration as Code
  - references/jenkins-shared-libraries.md — Shared Library Development
  - references/jenkins-security.md — Security Hardening Guide
  - references/jenkins-ha.md — High Availability Configuration
  - references/jenkins-kubernetes.md — Jenkins on Kubernetes
  - references/jenkins-pipeline-patterns.md — Pipeline Pattern Catalog
## Handoff
- `devops-cicd-pipeline` for CI/CD pipeline design and integration.
- `devops-github-actions` for comparing/transitioning to GitHub Actions.
- `devops-gitlab-ci` for GitLab CI migration considerations.
- `devops-kubernetes` for running Jenkins on Kubernetes.
- `devops-security` for secrets management and pipeline security.
- `devops-monitoring` for Jenkins monitoring and heap management.
