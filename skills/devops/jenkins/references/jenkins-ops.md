# Jenkins Operations

## High Availability

| Component | Setup | Failure Handling |
|-----------|-------|-----------------|
| Controller | Active node + standby | Failover via shared data |
| Shared storage | NFS, EFS, or S3-backed | Controller state persists |
| Database | PostgreSQL (external, HA) | Independent failover |
| Build agents | Ephemeral, auto-provisioned | Lost on failure (rebuild) |

## Backup and Restore

```bash
# Backup Jenkins home
tar -czf jenkins-backup-$(date +%Y%m%d).tar.gz \
  --exclude="jobs/*/builds" \
  --exclude="workspace" \
  --exclude="caches" \
  /var/jenkins_home

# Backup jobs only
tar -czf jenkins-jobs-backup.tar.gz /var/jenkins_home/jobs

# Backup configuration
tar -czf jenkins-config-backup.tar.gz \
  /var/jenkins_home/config.xml \
  /var/jenkins_home/*.xml \
  /var/jenkins_home/plugins \
  /var/jenkins_home/credentials.xml

# Restore
tar -xzf jenkins-backup.tar.gz -C /var/jenkins_home
```

## Plugin Management

```bash
# List installed plugins
curl -s -u user:token http://jenkins:8080/pluginManager/api/json?depth=1

# Install plugin via CLI
java -jar jenkins-cli.jar -s http://jenkins:8080 install-plugin <plugin-name>

# Update all plugins
java -jar jenkins-cli.jar -s http://jenkins:8080 groovy <<EOF
  jenkins.model.Jenkins.instance.pluginManager.install(
    jenkins.model.Jenkins.instance.pluginManager.availableUpdates().collect{it.name},
    true
  )
EOF

# Plugin lockdown (production)
# Only install: pipeline, git, credentials, blueocean, sonar, docker, kubernetes, slack
```

## Security Configuration

| Setting | Configuration | Purpose |
|---------|---------------|---------|
| Authentication | LDAP/OIDC/SAML SSO | Centralized identity |
| Authorization | Matrix-based, project-based | Fine-grained access |
| Agent → Controller | TLS + access control | Secure agent communication |
| Credentials | Encrypted with master key | Secret storage |
| Audit log | JobDSL logging, activity monitoring | Compliance |
| CSRF protection | Enabled | Prevent cross-site attacks |

```groovy
// Pipeline security — use withCredentials
withCredentials([string(credentialsId: 'aws-secret', variable: 'AWS_SECRET')]) {
    sh 'echo $AWS_SECRET | docker login --username AWS --password-stdin $ECR'
}
```

## Performance Tuning

| Parameter | Default | Tuning | Effect |
|-----------|---------|--------|--------|
| `JENKINS_OPTS` | -Xmx2g | -Xmx8g | More heap for large installations |
| `-Dhudson.model.Run.workspaceCleanup=true` | — | — | Clean workspace after build |
| `-Djenkins.model.Jenkins.buildsDir=` | — | `/data/builds/{ITEM_FULL_NAME}` | Move builds to external storage |
| Thread pool | 100 | 200 | More concurrent builds |
| Queue limit | 500 | 1000 | Larger build queue |

## Agent Provisioning

| Agent Type | Provisioning | Scaling | Use Case |
|------------|-------------|---------|----------|
| Static | Manual | Fixed | Small teams, stable builds |
| Docker | Spawn per job | On demand | Consistent environments |
| Kubernetes | Pod per build | Auto-scale | Elastic, cost-effective |
| Cloud (EC2) | Plugin-managed | Auto-scale | Non-containerized builds |

```yaml
# Kubernetes pod template for build agent
apiVersion: v1
kind: Pod
spec:
  containers:
  - name: jnlp
    args: ["\$(JENKINS_SECRET)", "\$(JENKINS_AGENT_NAME)"]
  - name: docker
    image: docker:24.0
    command: ["cat"]
    tty: true
    volumeMounts:
    - name: docker-sock
      mountPath: /var/run/docker.sock
  - name: kubectl
    image: bitnami/kubectl:1.28
    command: ["cat"]
    tty: true
```

## Monitoring

| Metric | Source | Alert |
|--------|--------|-------|
| Queue length | Jenkins API /metrics | > 50 pending |
| Executor availability | Jenkins API /computer/api | < 2 free |
| Build failure rate | Prometheus plugin | > 10% failure |
| Build duration | Prometheus plugin | > 2x average |
| Disk usage | Node exporter | > 90% full |
| Plugin health | /pluginManager/api | Outdated plugins |
