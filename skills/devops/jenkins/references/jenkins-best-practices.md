# Jenkins Best Practices

## Pipeline Structure
- All pipelines declarative, not scripted (enforce with `pipeline {}` syntax).
- Shared library for reusable pipeline code; version-pin with branch/tag.
- Environment variables for config, not hardcoded values.
- `post { always { cleanWs() } }` to clean workspace and prevent disk exhaustion.
- Keep pipeline complexity low: if >50 lines, extract logic to shared library.

## Declarative Pipeline Template
```groovy
pipeline {
    agent { label 'linux' }
    options {
        timeout(time: 30, unit: 'MINUTES')
        buildDiscarder(logRotator(numToKeepStr: '10'))
        ansiColor('xterm')
    }
    environment {
        DOCKER_REGISTRY = 'registry.example.com'
    }
    stages {
        stage('Checkout') { steps { checkout scm } }
        stage('Lint') { steps { sh 'npm run lint' } }
        stage('Test') {
            parallel {
                stage('Unit') { steps { sh 'npm test' } }
                stage('Integration') { steps { sh 'npm run test:int' } }
            }
        }
        stage('Build') { steps { sh 'docker build -t app .' } }
        stage('Deploy') {
            when { branch 'main' }
            steps { sh './deploy.sh' }
        }
    }
    post {
        failure { emailext subject: "Build failed: ${env.JOB_NAME}", to: 'team@example.com' }
        always { cleanWs() }
    }
}
```

## Secret Management
- Credentials via `withCredentials([string(credentialsId: '...', variable: 'VAR')])`.
- Never use `env.VAR = 'secret'` — exposes in logs and build triggers.
- Credential IDs stored in Jenkins, not in Jenkinsfile.
- Use `maskPasswords()` plugin for additional log protection.
- Rotate credentials on a schedule; use `credentials()` binding for SSH keys, tokens.

## Shared Library Structure
```
vars/
  dockerBuild.groovy       # dockerBuild step
  notifySlack.groovy       # notifySlack step
src/org/example/
  PipelineUtils.groovy     # Helper classes
```
```groovy
// vars/dockerBuild.groovy
def call(String imageName, String tag) {
    sh "docker build -t ${imageName}:${tag} ."
    sh "docker push ${imageName}:${tag}"
}
```

## Agent Strategy
| Agent type | When to use |
|------------|-------------|
| `label 'linux'` | Default build agent |
| `docker { image 'node:20' }` | Containerized build; consistent tooling |
| `none` | Top-level; per-stage agent selection |
| `label 'windows'` | Windows-specific builds (e.g., .NET) |

## Pipeline Performance
- Use `parallel` for independent stages (lint + unit test).
- Use `when { beforeAgent true }` to skip stages without provisioning an agent.
- Archive only essential artifacts; use `fingerprint` for dependency tracking.
- Set build discarder: keep last 10 successful + last 5 failed builds.

## CI/CD Anti-Patterns
- Running `npm install` in every stage (run once, stash the result).
- Hardcoding environment URLs in Jenkinsfile (use `env` from Jenkins configuration).
- Long-running single stages (break into parallel steps).
- Triggering downstream jobs synchronously (use `build job: '...', wait: false` and `build finalizedBy`).
