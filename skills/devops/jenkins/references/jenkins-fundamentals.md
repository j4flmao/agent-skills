# Jenkins Fundamentals: Architecture and Configuration as Code

Core Jenkins concepts and how to run a reproducible controller: architecture, job types, plugin pinning, Configuration as Code (JCasC), and seeding jobs. Pipeline syntax is in `jenkins-pipeline-as-code.md`; security hardening in `jenkins-security-hardening.md`; HA/backup in `jenkins-ops.md`.

## Architecture

| Component | Role |
|-----------|------|
| Controller | Web UI, configuration, scheduling, build records, plugin host |
| Agent | Executes builds; connects via inbound (WebSocket/TCP JNLP) or outbound SSH |
| Executor | A build slot on a node |
| Label | Tag used to route builds to suitable agents (`linux && docker`) |
| Cloud | Plugin that provisions ephemeral agents (Kubernetes, EC2, Docker) |
| Workspace | Per-job directory on the agent |
| `JENKINS_HOME` | Controller state: config XML, jobs, build history, plugins, secrets |

Rule: run **zero executors on the controller** (`numExecutors: 0`); builds on the controller can read `JENKINS_HOME` secrets.

## Job Types

| Type | Use |
|------|-----|
| Pipeline | `Jenkinsfile`-defined pipeline for one branch/repo |
| Multibranch Pipeline | Discovers branches and PRs in one repository automatically |
| Organization Folder | Discovers repositories in a GitHub org / Bitbucket project / GitLab group |
| Freestyle | Legacy UI-configured jobs; avoid for new work |

Prefer Organization Folders or Multibranch with `Jenkinsfile` in each repo so pipelines are versioned with code.

## Running the Controller in a Container

```dockerfile
FROM jenkins/jenkins:lts-jdk21
COPY plugins.txt /usr/share/jenkins/ref/plugins.txt
RUN jenkins-plugin-cli --plugin-file /usr/share/jenkins/ref/plugins.txt
COPY casc/ /var/jenkins_home/casc/
ENV CASC_JENKINS_CONFIG=/var/jenkins_home/casc
ENV JAVA_OPTS="-Djenkins.install.runSetupWizard=false"
```

`plugins.txt` (pin versions for reproducibility; update deliberately):

```
configuration-as-code:<version>
workflow-aggregator:<version>
git:<version>
kubernetes:<version>
job-dsl:<version>
credentials-binding:<version>
matrix-auth:<version>
```

- Pin the base image tag (e.g. a specific `X.Y.Z-lts-jdk21`) in production rather than floating `lts`.
- Build the image in CI, test it, then deploy; never install plugins through the UI in production.

## Jenkins Configuration as Code (JCasC)

```yaml
# casc/jenkins.yaml
jenkins:
  systemMessage: "Managed by JCasC - changes in the UI will be overwritten"
  numExecutors: 0
  securityRealm:
    oic:                                   # OpenID Connect plugin; key names vary by plugin version
      clientId: "${OIDC_CLIENT_ID}"
      clientSecret: "${OIDC_CLIENT_SECRET}"
      wellKnownOpenIDConfigurationUrl: "https://login.example.com/.well-known/openid-configuration"
  authorizationStrategy:
    globalMatrix:
      entries:
        - group:
            name: "jenkins-admins"
            permissions: ["Overall/Administer"]
        - group:
            name: "engineering"
            permissions: ["Overall/Read", "Job/Read", "Job/Build"]
  clouds:
    - kubernetes:
        name: "k8s"
        namespace: "jenkins-agents"
        jenkinsUrl: "http://jenkins.jenkins.svc:8080"
        containerCapStr: "50"
unclassified:
  location:
    url: "https://jenkins.example.com/"
credentials:
  system:
    domainCredentials:
      - credentials:
          - string:
              scope: GLOBAL
              id: "sonar-token"
              secret: "${SONAR_TOKEN}"
```

- `${VAR}` values come from environment variables, files (Kubernetes Secrets mounted as files), or secret-source plugins (Vault, AWS Secrets Manager).
- Export the current config from **Manage Jenkins → Configuration as Code → View Configuration** to bootstrap the YAML, then clean it up.
- Reload via the UI/API or restart; keep the YAML in Git and review changes.
- Exact YAML keys depend on plugin versions; validate with the JCasC schema endpoint or a test controller in CI.

## Seeding Jobs with Job DSL

```yaml
# casc/jobs.yaml
jobs:
  - script: >
      organizationFolder('acme') {
        organizations {
          github {
            repoOwner('acme')
            credentialsId('github-app')
          }
        }
        projectFactories {
          workflowMultiBranchProjectFactory { scriptPath('Jenkinsfile') }
        }
        orphanedItemStrategy { discardOldItems { numToKeep(10) } }
      }
```

This creates an organization folder that discovers all repositories with a `Jenkinsfile`.

## Minimal Declarative Pipeline

```groovy
pipeline {
  agent { label 'linux' }
  options {
    timeout(time: 30, unit: 'MINUTES')
    buildDiscarder(logRotator(numToKeepStr: '30'))
    disableConcurrentBuilds()
  }
  stages {
    stage('Build') { steps { sh './gradlew build' } }
    stage('Test')  { steps { sh './gradlew test' } }
  }
  post {
    always { junit 'build/test-results/test/*.xml' }
  }
}
```

## Credentials Basics

| Type | Use in pipeline |
|------|-----------------|
| Username/password | `withCredentials([usernamePassword(credentialsId: 'x', usernameVariable: 'U', passwordVariable: 'P')])` |
| Secret text | `withCredentials([string(credentialsId: 'sonar-token', variable: 'TOKEN')])` |
| SSH key | `sshagent(['deploy-key']) { sh 'git push' }` |
| GitHub App | Preferred for GitHub SCM; short-lived installation tokens |

Credentials are masked in logs, but masking is best effort; never `echo` them or write them to files that are archived.

## Upgrades

- Follow the LTS line; read the upgrade guide for each LTS (Java baseline changes, removed APIs).
- Update plugins in the image, test on a staging controller with representative jobs, then roll out.
- Back up `JENKINS_HOME` before upgrades (see `jenkins-ops.md`).

## Pitfalls

- UI-only configuration that cannot be reproduced after a disk failure.
- Unpinned plugins changing behaviour between restarts.
- Builds running on the controller.
- Hundreds of freestyle jobs with copy-pasted shell steps instead of shared libraries.

## Checklist

- [ ] Controller image built in CI with pinned LTS and plugins
- [ ] JCasC YAML in Git; no manual UI configuration
- [ ] Zero executors on the controller; ephemeral agents via a cloud
- [ ] Organization folders / multibranch with `Jenkinsfile` in repos
- [ ] SSO + matrix authorization by groups
- [ ] Secrets injected from a secret store, not stored in YAML
