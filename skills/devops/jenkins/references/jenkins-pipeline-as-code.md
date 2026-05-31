# Jenkins Pipeline as Code

## Purpose
Provide comprehensive patterns and reference for implementing Jenkins pipelines as code. Covers declarative pipeline syntax in depth, shared library patterns, multibranch configuration, testing, and advanced pipeline techniques.

## Table of Contents
1. [Declarative Pipeline Reference](#declarative-pipeline-reference)
2. [Shared Library Patterns](#shared-library-patterns)
3. [Multibranch Pipeline Configuration](#multibranch-pipeline-configuration)
4. [Advanced Pipeline Techniques](#advanced-pipeline-techniques)
5. [Pipeline Testing and Validation](#pipeline-testing-and-validation)
6. [Pipeline as Code Governance](#pipeline-as-code-governance)
7. [Pipeline Performance Optimization](#pipeline-performance-optimization)

---

## Declarative Pipeline Reference

### Complete Syntax Reference

```groovy
pipeline {
    agent { /* agent configuration */ }
    tools { /* tool installations */ }
    stages {
        stage('name') {
            when { /* conditions */ }
            agent { /* stage-specific agent (optional) */ }
            environment { /* stage-specific env vars */ }
            steps { /* step execution */ }
            post { /* post-stage actions */ }
        }
    }
    post { /* global post actions */ }
    parameters { /* build parameters */ }
    triggers { /* build triggers */ }
    environment { /* global env vars */ }
    options { /* pipeline options */ }
    tools { /* tool auto-installation */ }
}
```

### Agent Directive

```groovy
// Any available agent
agent any

// None -- specify per stage
agent none

// Label-based (static agents)
agent { label 'linux && docker' }

// Docker container
agent {
    docker {
        image 'node:20'
        args '-v /tmp:/tmp'
        reuseNode true  // reuse workspace from previous stage
    }
}

// Docker with Dockerfile
agent { dockerfile true }

// Kubernetes pod template
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
'''
    }
}

// Stage-specific agent (overrides global)
stage('Build') {
    agent { docker { image 'maven:3.9' } }
    steps {
        sh 'mvn clean package'
    }
}
```

### Stages and Steps

```groovy
stages {
    // Sequential stages
    stage('Build') {
        steps { sh 'npm run build' }
    }

    // Parallel stages
    stage('Test Matrix') {
        parallel {
            stage('Unit Tests') {
                steps { sh 'npm run test:unit' }
            }
            stage('Integration Tests') {
                steps { sh 'npm run test:integration' }
            }
            stage('Lint') {
                steps { sh 'npm run lint' }
            }
        }
    }

    // Sequential within parallel
    stage('Deploy') {
        parallel {
            stage('Deploy Staging') {
                steps {
                    sh 'deploy staging'
                }
            }
            stage('Deploy Prod Approval') {
                steps {
                    input message: 'Deploy to production?'
                }
            }
        }
    }

    // Nested stages (with section)
    stage('Test') {
        stages {
            stage('Unit') { steps { ... } }
            stage('Integration') { steps { ... } }
        }
    }
}
```

### Post Section

```groovy
post {
    always {
        cleanWs()
        junit 'reports/**/*.xml'
    }
    success {
        slackSend(color: 'good', message: 'Pipeline succeeded')
    }
    failure {
        slackSend(color: 'danger', message: 'Pipeline failed')
    }
    unstable {
        emailText = "Build is unstable: ${env.BUILD_URL}"
    }
    changed {
        // Fires only when status changes from previous build
        echo 'Status changed'
    }
    aborted {
        echo 'Build was aborted'
    }
    regression {
        // Fires when current failure but previous was success
        echo 'Regression detected'
    }
    fixed {
        // Fires when current success but previous was failure
        echo 'Build fixed'
    }
}
```

### When Conditions

```groovy
when {
    // Simple branch condition
    branch 'main'

    // Expression
    expression { return env.BRANCH_NAME == 'main' }

    // Changeset
    changeset "**/*.java"

    // Triggered by specific cause
    triggeredBy 'TimerTrigger'
    triggeredBy cause: 'UserIdCause', detail: 'jenkins'

    // Building tag
    buildingTag()

    // Tag pattern
    tag pattern: "v*", comparator: "GLOB"

    // Environment variable
    environment name: 'DEPLOY', value: 'true'

    // All conditions must match (default)
    allOf {
        branch 'main'
        expression { return env.RUN_TESTS == 'true' }
    }

    // Any condition can match
    anyOf {
        branch 'main'
        branch 'release/*'
    }

    // Negate
    not { branch 'main' }

    // Before agent (check before allocating agent)
    beforeAgent true
}
```

### Options

```groovy
options {
    // Build discarder
    buildDiscarder(logRotator(numToKeepStr: '10', daysToKeepStr: '30'))

    // Timeout
    timeout(time: 1, unit: 'HOURS')

    // Retry
    retry(3)

    // Timestamps in console log
    timestamps()

    // Skip default checkout
    skipDefaultCheckout true

    // Preserve stash for rebuild
    preserveStashes(buildCount: 5)

    // Quiet period
    quietPeriod(10)

    // Disable concurrent builds
    disableConcurrentBuilds()

    // Skip stages that are not relevant
    skipStagesAfterUnstable()

    // Checkout to subdirectory
    checkoutToSubdirectory('src')

    // Parallel concurrency
    parallelsAlwaysFailFast()

    // Rate limiting
    rateLimitBuilds(amount: 5, duration: 'hour')
}
```

### Parameters

```groovy
parameters {
    string(name: 'DEPLOY_ENV', defaultValue: 'staging', description: 'Target environment')
    choice(name: 'VERSION', choices: ['1.0', '1.1', '2.0'], description: 'Version to deploy')
    booleanParam(name: 'RUN_SMOKE_TESTS', defaultValue: true, description: 'Run smoke tests')
    password(name: 'API_TOKEN', description: 'API token for deployment')
    text(name: 'RELEASE_NOTES', description: 'Release notes')
    file(name: 'CONFIG_FILE', description: 'Configuration file to deploy')
}
```

### Triggers

```groovy
triggers {
    // Poll SCM
    pollSCM('H/5 * * * *')

    // Cron
    cron('H 2 * * 0')

    // Upstream pipeline
    upstream(upstreamProjects: 'build-image', threshold: hudson.model.Result.SUCCESS)

    // Bitbucket webhook
    bitbucketPush()

    // GitHub webhook
    githubPush()
}
```

### Tools

```groovy
tools {
    maven 'Maven-3.9'
    jdk 'JDK-17'
    gradle 'Gradle-8.0'
    nodejs 'Node-20'
    dockerTool 'Docker-24'
}
```

### Environment

```groovy
environment {
    // Static values
    REGISTRY = 'ghcr.io'

    // Credentials
    DOCKER_TOKEN = credentials('docker-hub-token')

    // From sh command
    GIT_COMMIT_HASH = sh(script: 'git rev-parse HEAD', returnStdout: true).trim()

    // Override per stage
    DEPLOY_ENV = 'production'
}

stage('Deploy Staging') {
    environment {
        DEPLOY_ENV = 'staging'  // overrides global
    }
    steps {
        echo "Deploying to ${DEPLOY_ENV}"
    }
}
```

---

## Shared Library Patterns

### Library Structure

```
jenkins-shared-library/
  vars/
    dockerBuild.groovy      # Function: dockerBuild
    helmDeploy.groovy       # Function: helmDeploy
    notifySlack.groovy      # Function: notifySlack
    runTests.groovy         # Function: runTests
    scanImage.groovy        # Function: scanImage
  src/
    com/company/pipeline/
      DockerUtils.groovy    # Class: DockerUtils
      GitUtils.groovy       # Class: GitUtils
      SlackNotifier.groovy  # Class: SlackNotifier
      VersionManager.groovy # Class: VersionManager
  resources/
    templates/
      deployment.yaml
      Dockerfile.j2
    scripts/
      health-check.sh
  test/
    vars/
      dockerBuildSpec.groovy
    src/
      com/company/pipeline/
        DockerUtilsTest.groovy
  vars.groovy            # Optional: global configuration
  README.md
```

### Vars Function Patterns

```groovy
// vars/dockerBuild.groovy
// Basic pattern
def call(String imageName, String tag) {
    return {
        stage("Docker Build") {
            sh "docker build -t ${imageName}:${tag} ."
        }
    }
}

// Named parameters pattern (preferred)
def call(Map config) {
    return {
        def stageName = config.stageName ?: "Build Image"
        def image = config.image
        def tag = config.tag ?: env.BUILD_NUMBER
        def dockerfile = config.dockerfile ?: "Dockerfile"
        def buildArgs = config.buildArgs ?: ""

        stage(stageName) {
            sh """
                docker build \
                    -t ${image}:${tag} \
                    -f ${dockerfile} \
                    ${buildArgs} \
                    .
            """
        }
    }
}

// Pipeline step (no closure return)
def call(String message) {
    echo "[INFO] ${message}"
}
```

### Vars Usage

```groovy
// Jenkinsfile
@Library('my-shared-library@v1.2') _

pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                script {
                    dockerBuild(
                        image: 'ghcr.io/org/app',
                        tag: env.BUILD_NUMBER,
                        dockerfile: 'Dockerfile.prod'
                    )
                }
            }
        }
        stage('Deploy') {
            steps {
                script {
                    helmDeploy(
                        releaseName: 'my-app',
                        chartPath: './charts/app',
                        values: [replicas: 3, env: 'production']
                    )
                }
            }
        }
    }
    post {
        always {
            script {
                notifySlack(
                    channel: '#ci',
                    status: currentBuild.currentResult,
                    message: "Build ${env.BUILD_NUMBER}"
                )
            }
        }
    }
}
```

### Shared Library Source Classes

```groovy
// src/com/company/pipeline/DockerUtils.groovy
package com.company.pipeline

class DockerUtils {
    static String buildImage(String imageName, String tag, String dockerfile = 'Dockerfile') {
        return "docker build -t ${imageName}:${tag} -f ${dockerfile} ."
    }

    static String pushImage(String imageName, String tag) {
        return "docker push ${imageName}:${tag}"
    }

    static String tagImage(String sourceImage, String targetImage, String tag) {
        return "docker tag ${sourceImage}:${tag} ${targetImage}:${tag}"
    }

    static boolean imageExists(String imageName, String tag) {
        def result = "docker images -q ${imageName}:${tag}".execute().text.trim()
        return !result.isEmpty()
    }
}

// Usage in vars/dockerBuild.groovy
import com.company.pipeline.DockerUtils

def call(Map config) {
    return {
        stage(config.stageName ?: 'Docker Build') {
            sh DockerUtils.buildImage(config.image, config.tag, config.dockerfile)
        }
    }
}
```

### Library Loading Strategies

```groovy
// Global library (configured in Jenkins settings)
@Library('my-shared-library') _

// Versioned
@Library('my-shared-library@v1.2') _

// Multiple libraries
@Library(['my-shared-library@v1.2', 'other-lib@main']) _

// Dynamic loading
library 'my-shared-library@v1.2'

// With implicit version from configuration
library 'my-shared-library'

// External source
library identifier: 'my-lib@v1.0',
        retriever: modernSCM(
            [$class: 'GitSCMSource',
             remote: 'https://github.com/org/jenkins-lib.git',
             credentialsId: 'github-token']
        )
```

### Configuration with Global Variables

```groovy
// vars/config.groovy
class Config {
    static String registry = 'ghcr.io'
    static String slackChannel = '#ci'
    static Map<String, String> images = [
        node: 'node:20',
        docker: 'docker:24',
        kubectl: 'bitnami/kubectl:1.28'
    ]
}

// Usage in Jenkinsfile
@Library('my-shared-library') _
import static com.company.pipeline.Config.*

pipeline {
    agent {
        kubernetes {
            yaml """
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: node
    image: ${images.node}
    command: [cat]
    tty: true
"""
        }
    }
}
```

---

## Multibranch Pipeline Configuration

### Jenkins UI Configuration

```
Branch Sources:
  - GitHub: GitHub Organization / Individual Repository
  - GitLab: GitLab Organization / Project
  - Bitbucket: Bitbucket Team / Project
  - Generic: Git SCM

Build Triggers:
  - Pull Requests: build all open PRs
  - Push Events: build all branches
  - Scheduled: cron for branch indexing

Automatic Branch Discovery:
  - Discover branches (regex filter: main|release/.*|feature/.*)
  - Discover PRs (merged, current, both)
  - Discover tags (with filter: v.*)

Property Strategy:
  - All branches get same properties
  - Named branches get specific properties
    - main: discard old builds (30 days, 10 kept)
    - release/*: discard old builds (60 days, 20 kept)
```

### Jenkinsfile Branch Strategies

```groovy
// Branch-specific behavior
stage('Deploy') {
    when {
        anyOf {
            branch 'main'
            branch 'release/*'
            branch 'staging'
        }
    }
    steps {
        script {
            def env = env.BRANCH_NAME == 'main' ? 'production' : env.BRANCH_NAME
            sh "deploy-to ${env}"
        }
    }
}

// PR-specific behavior
stage('PR Check') {
    when {
        triggeredBy 'BranchEventCause'
    }
    steps {
        sh 'npm run pr-check'
    }
}

// Tag-specific behavior
stage('Release') {
    when {
        buildingTag()
        tag pattern: "v*", comparator: "GLOB"
    }
    steps {
        sh 'make release'
    }
}
```

### Branch Filter Configuration

```groovy
// Pipeline-level branch filter
pipeline {
    triggers {
        // Only run on specific branches
        pollSCM 'H/5 * * * *'
    }
}

// Jenkinsfile-based branch filtering
if (env.BRANCH_NAME ==~ /(main|release\/.*|hotfix\/.*)/) {
    // Full pipeline
} else {
    // Only build and test (no deploy)
}
```

---

## Advanced Pipeline Techniques

### Pipeline with Matrix

```groovy
pipeline {
    agent none
    stages {
        stage('Build Matrix') {
            matrix {
                axes {
                    axis {
                        name 'OS'
                        values 'linux', 'windows', 'mac'
                    }
                    axis {
                        name 'NODE_VERSION'
                        values '18', '20'
                    }
                }
                // Filters for valid combinations
                exclude {
                    axis {
                        name 'OS'
                        values 'windows'
                    }
                    axis {
                        name 'NODE_VERSION'
                        values '18'  // Node 18 not supported on Windows
                    }
                }
                agent {
                    label "${OS} && nodejs"
                }
                stages {
                    stage('Build') {
                        steps {
                            sh "npm run build -- ${NODE_VERSION}"
                        }
                    }
                    stage('Test') {
                        steps {
                            sh "npm run test:${OS}"
                        }
                    }
                }
                post {
                    always {
                        junit 'reports/**/*.xml'
                    }
                }
            }
        }
    }
}
```

### Pipeline with Input

```groovy
stage('Deploy Production') {
    agent none
    when { branch 'main' }
    steps {
        script {
            def userInput = input(
                id: 'approve',
                message: 'Deploy to production?',
                parameters: [
                    string(defaultValue: 'v1.0',
                           description: 'Version to deploy',
                           name: 'VERSION'),
                    booleanParam(defaultValue: false,
                                 description: 'Skip smoke tests',
                                 name: 'SKIP_SMOKE'),
                    choice(choices: ['us-east-1', 'eu-west-1', 'ap-southeast-1'],
                           description: 'Region to deploy',
                           name: 'REGION')
                ],
                submitterParameter: 'APPROVER'
            )
            echo "Approved by: ${userInput.APPROVER}"
            echo "Version: ${userInput.VERSION}"
            echo "Region: ${userInput.REGION}"
        }
    }
}
```

### Pipeline with Libraries and Dependencies

```groovy
@Library('shared-lib@v2') _

pipeline {
    agent any
    stages {
        stage('Build') {
            steps {
                script {
                    // Run multiple lib functions in parallel
                    parallel(
                        "Build Linux": { buildLinux() },
                        "Build Windows": { buildWindows() },
                        "Build Mac": { buildMac() }
                    )
                }
            }
        }
        stage('Integration Test') {
            steps {
                script {
                    // Wait for external pipeline
                    def build = build(
                        job: 'integration-test-suite',
                        parameters: [
                            string(name: 'BUILD_VERSION', value: env.BUILD_NUMBER)
                        ],
                        wait: true,
                        propagate: true
                    )
                    echo "Integration tests completed: ${build.result}"
                }
            }
        }
    }
}
```

### Conditional Stage Execution

```groovy
stage('Deploy') {
    when {
        expression {
            // Only deploy if changes in specific paths
            return changeset("deploy/**") || changeset("Dockerfile")
        }
    }
    steps {
        sh 'deploy.sh'
    }
}

// Skip if only documentation changed
stage('Build') {
    when {
        not {
            changeset "docs/**"
        }
    }
    steps {
        sh 'npm run build'
    }
}
```

### Error Handling

```groovy
stage('Risky Operation') {
    steps {
        script {
            try {
                sh 'risky-operation.sh'
            } catch (Exception e) {
                echo "Operation failed: ${e.message}"
                // Attempt recovery
                sh 'cleanup.sh'
                // Optionally re-throw
                error("Operation failed and could not be recovered")
            } finally {
                sh 'always-run.sh'
            }
        }
    }
}

// Catch specific errors
stage('API Call') {
    steps {
        script {
            try {
                sh 'curl -f https://api.example.com/deploy'
            } catch (Exception e) {
                if (e.getMessage().contains('returned status 503')) {
                    echo 'Service unavailable, will retry'
                    retry(3) {
                        sleep(30)
                        sh 'curl -f https://api.example.com/deploy'
                    }
                } else {
                    throw e
                }
            }
        }
    }
}
```

---

## Pipeline Testing and Validation

### Jenkinsfile Unit Testing

```groovy
// Test with JenkinsPipelineUnit framework
class JenkinsfileTest extends BasePipelineTest {
    @Test
    void testBuildStage() {
        def script = loadScript("Jenkinsfile")
        script.execute()

        // Verify stages ran
        printCallStack()
        assertJobStatusSuccess()
    }

    @Test
    void testDeployOnlyOnMain() {
        binding.setVariable('env', [BRANCH_NAME: 'feature/test'])
        def script = loadScript("Jenkinsfile")

        script.execute()
        assertFalse(containsCall('deploy'))
    }
}
```

### Shared Library Testing

```groovy
// test/vars/dockerBuildSpec.groovy
class DockerBuildSpec extends BasePipelineTest {
    @Test
    void testDockerBuildWithDefaultTag() {
        def lib = loadScript("vars/dockerBuild.groovy")
        def result = lib.call(image: 'myapp', tag: 'latest')

        assertNotNull(result)
        // Verify the returned closure contains docker build command
    }

    @Test
    void testDockerBuildWithCustomDockerfile() {
        def lib = loadScript("vars/dockerBuild.groovy")
        def result = lib.call(
            image: 'myapp',
            tag: 'v1',
            dockerfile: 'Dockerfile.prod'
        )

        assertNotNull(result)
    }
}
```

### Pipeline Linting

```bash
# Validate declarative pipeline syntax
curl -X POST -H "Content-Type: text/plain" \
    --data-binary @Jenkinsfile \
    "http://jenkins:8080/pipeline-model-converter/validate"

# Use Jenkins CLI
java -jar jenkins-cli.jar declarative-linter < Jenkinsfile
```

---

## Pipeline as Code Governance

### Branch Protection Rules

```
main branch:
  - Pipeline must pass before merge.
  - Deploy stage requires manual approval.
  - Only maintainers can bypass.

release/ branches:
  - Reduced pipeline (build + test only).
  - No production deployment.

feature/ branches:
  - Minimal pipeline (lint + unit test).
  - 30-minute timeout.

PR builds:
  - Full pipeline except deploy.
  - Results posted as PR check.
```

### Library Versioning Strategy

```
Semantic versioning for shared library:
  v1.0.0 = major.minor.patch
  Major: breaking API change.
  Minor: new functionality, backwards compatible.
  Patch: bug fixes.

Jenkinsfile pins to major.minor:
  @Library('my-lib@v1.2') _

Major version upgrades require:
  - Migration guide.
  - Deprecation period (2 cycles).
  - All pipelines updated before removal.
```

### Audit Trail

```
Pipeline events logged:
  - Who triggered the build.
  - What parameters were used.
  - What version of Jenkinsfile was executed.
  - What library version was loaded.
  - Console output preserved.

Compliance:
  - All production deployments have approval input steps.
  - Pipeline logs retained for 1 year.
  - Audit trail exportable for SOX/PCI reviews.
```

---

## Pipeline Performance Optimization

### Parallel Execution

```groovy
// Sequential: 30+ minutes
// Parallel (3 stages x 10 min each): 10 minutes
stage('Parallel Test') {
    parallel {
        stage('Unit') { steps { sh 'npm run test:unit' } }
        stage('Integration') { steps { sh 'npm run test:integration' } }
        stage('E2E') { steps { sh 'npm run test:e2e' } }
    }
}
```

### Build Cache

```groovy
// Cache node_modules across builds
pipeline {
    options {
        skipDefaultCheckout true
    }
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                // Restore cached node_modules
                stash name: 'node_modules'
            }
        }
        stage('Install') {
            steps {
                // Only install if cache miss
                script {
                    if (!fileExists('node_modules')) {
                        sh 'npm ci'
                        stash name: 'node_modules'
                    }
                }
            }
        }
    }
}
```

### Agent Utilization

```groovy
// Use agent none at pipeline level, specific agents per stage
pipeline {
    agent none
    stages {
        stage('Build') {
            agent { docker { image 'node:20' } }
            steps { sh 'npm run build' }
        }
        stage('Package') {
            agent { docker { image 'docker:24' } }
            steps { sh 'docker build -t app:latest .' }
        }
    }
}
```

## Handoff
`jenkins-security-hardening.md` for security configuration.
`../../cicd-pipeline/SKILL.md` for CI/CD architecture.
