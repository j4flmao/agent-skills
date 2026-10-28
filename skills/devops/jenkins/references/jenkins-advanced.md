# Jenkins Advanced: Kubernetes Agents, Pipeline Internals, and Scale

Advanced Jenkins topics: ephemeral Kubernetes agents with pod templates, caching, Pipeline CPS internals and their pitfalls, durability and resumption, resource locking, and controller scaling. Fundamentals and JCasC are in `jenkins-fundamentals.md`; shared libraries in `jenkins-shared-libraries.md`.

## Kubernetes Agents

The Kubernetes plugin creates one pod per build (or per `node` block) and deletes it afterwards. Each pod contains the `jnlp` agent container plus tool containers.

```groovy
pipeline {
  agent {
    kubernetes {
      defaultContainer 'gradle'
      yaml '''
apiVersion: v1
kind: Pod
spec:
  serviceAccountName: ci-builder
  securityContext:
    runAsNonRoot: true
    runAsUser: 1000
    fsGroup: 1000
  containers:
    - name: gradle
      image: gradle:8.14-jdk21
      command: ["sleep"]
      args: ["infinity"]
      resources:
        requests: { cpu: "1", memory: 2Gi }
        limits: { memory: 4Gi }
      volumeMounts:
        - { name: gradle-cache, mountPath: /home/gradle/.gradle }
    - name: kaniko
      image: gcr.io/kaniko-project/executor:debug
      command: ["sleep"]
      args: ["infinity"]
  volumes:
    - name: gradle-cache
      persistentVolumeClaim: { claimName: gradle-cache }
'''
    }
  }
  stages {
    stage('Build') { steps { sh 'gradle build --no-daemon' } }
    stage('Image') {
      steps {
        container('kaniko') {
          sh '/kaniko/executor --context . --destination registry.example.com/app:${GIT_COMMIT}'
        }
      }
    }
  }
}
```

- Tool containers need a long-running command (`sleep infinity`) so steps can `exec` into them.
- Do not mount the host Docker socket; build images with daemonless builders (BuildKit rootless, Buildah, or Kaniko — note Kaniko was archived by Google in 2025, so prefer actively maintained alternatives or a maintained fork).
- Put agent pods in a dedicated namespace with ResourceQuota, NetworkPolicy, and a minimal ServiceAccount.
- Define reusable pod templates in JCasC (cloud `templates`) or shared libraries rather than repeating YAML.

## Caching Strategies

| Approach | Notes |
|----------|-------|
| ReadWriteMany PVC for dependency caches | Simple; concurrent writers can corrupt some caches; use per-tool safe caches |
| Remote build caches (Gradle build cache, Bazel remote cache, sccache) | Best for ephemeral agents |
| Registry/artifact proxies (Nexus, Artifactory) | Speeds dependency downloads, reduces external rate limits |
| Image layer cache (`--cache-to/--cache-from` registry cache) | Reuses image layers across builds |

## Pipeline Internals: CPS

Pipeline Groovy runs through a continuation-passing-style (CPS) interpreter on the controller so builds can survive restarts. Consequences:

- Pipeline code executes on the **controller**; heavy Groovy loops, JSON parsing of large files, or `readFile` on huge outputs consume controller CPU and memory. Do work in `sh` steps on agents.
- Not all Groovy/Java methods are CPS-safe (closures passed to some library methods, e.g. `sort` with a comparator, behave incorrectly). Mark helper methods that call no steps with `@NonCPS`, and never call pipeline steps inside `@NonCPS` methods.
- Local variables must be serializable when a step suspends the build; holding non-serializable objects (e.g. `Matcher`) across a step causes `NotSerializableException`.
- The script security sandbox limits methods available in untrusted pipelines; approvals of dangerous signatures in "In-process Script Approval" can grant arbitrary code execution — review carefully.

```groovy
@NonCPS
def parseVersions(String text) {
  return text.readLines().findAll { it ==~ /\d+\.\d+\.\d+/ }.sort()
}
```

## Durability Settings

| Setting | Behaviour |
|---------|-----------|
| `MAX_SURVIVABILITY` | Writes state often; survives controller crashes best; slowest |
| `SURVIVABLE_NONATOMIC` | Less frequent writes |
| `PERFORMANCE_OPTIMIZED` | Much less I/O; running builds may be lost if the controller crashes uncleanly |

```groovy
options { durabilityHint('PERFORMANCE_OPTIMIZED') }
```

Use performance-optimized for short CI builds; keep higher durability for long deployment pipelines with manual gates.

## Coordination: Locks, Milestones, Inputs

```groovy
stage('Deploy prod') {
  options { lock(resource: 'prod-deploy') }      // Lockable Resources plugin
  steps {
    milestone(ordinal: 10)                       // older builds passing later are aborted
    input message: 'Deploy to production?', submitter: 'release-managers'
    milestone(ordinal: 20)
    sh './deploy.sh prod'
  }
}
```

- Do not hold an agent while waiting for `input`; put `input` in a stage with `agent none` or outside `node` blocks so no executor is blocked.
- Add `timeout` around `input` to avoid builds waiting forever.

## Restarting and Replay

- **Restart from Stage** (declarative) reruns from a chosen stage using stashed artifacts; mark stages with `preserveStashes` option on the pipeline if needed.
- **Replay** runs a modified Jenkinsfile once; useful for debugging, but it bypasses code review, so restrict the `Run/Replay` permission.

## Parallelism and Matrix

```groovy
stage('Test matrix') {
  matrix {
    axes {
      axis { name 'JDK'; values '17', '21' }
      axis { name 'DB';  values 'postgres', 'mysql' }
    }
    agent { kubernetes { inheritFrom 'gradle-jdk${JDK}' } }
    stages { stage('Test') { steps { sh "./gradlew test -Pdb=${DB}" } } }
  }
}
```

Set `failFast true` on `parallel` blocks when any failure should stop siblings.

## Controller Scaling

- A single controller has practical limits (job count, concurrent builds, plugin load). Split by organization or domain into multiple controllers, managed uniformly via JCasC and the same image.
- Keep build history bounded (`buildDiscarder`), archive artifacts to external storage (artifact-manager-s3 plugin) instead of `JENKINS_HOME`.
- Tune JVM heap sensibly, enable GC logging, and monitor with the Prometheus metrics plugin or OpenTelemetry plugin.
- Use WebSocket agent connections to avoid exposing the TCP inbound agent port.

## Testing Pipelines

- Unit test shared library code with JenkinsPipelineUnit.
- Validate declarative syntax with the `pipeline-model-converter` validation endpoint or the `jenkins-cli declarative-linter` command before merging.
- Integration tests: a disposable controller (container) with JCasC and sample repositories.

## Pitfalls

- Heavy Groovy logic on the controller causing UI slowness for everyone.
- `input` steps blocking executors for days.
- Approving sandbox signatures like `java.lang.Runtime exec` in script approval.
- Agent pods with cluster-admin service accounts.

## Checklist

- [ ] Ephemeral Kubernetes agents with restricted service accounts and quotas
- [ ] Daemonless image builds; no Docker socket mounts
- [ ] Remote caches for builds and images
- [ ] Heavy logic in agent steps; `@NonCPS` used correctly
- [ ] Durability hint chosen per pipeline type
- [ ] Locks, milestones, and timed-out inputs for deployments
- [ ] Replay permission restricted; script approvals reviewed
