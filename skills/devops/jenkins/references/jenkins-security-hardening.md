# Jenkins Security Hardening

## Purpose
Provide comprehensive security guidance for Jenkins CI/CD environments. Covers authentication, authorization, credential management, pipeline security, network security, audit logging, and compliance configurations.

## Table of Contents
1. [Authentication Configuration](#authentication-configuration)
2. [Authorization Strategy](#authorization-strategy)
3. [Credential Management](#credential-management)
4. [Pipeline Security](#pipeline-security)
5. [Agent Security](#agent-security)
6. [Network Security](#network-security)
7. [Audit and Monitoring](#audit-and-monitoring)
8. [Plugin Security](#plugin-security)
9. [Compliance and Hardening](#compliance-and-hardening)
10. [Incident Response](#incident-response)

---

## Authentication Configuration

### Identity Provider Integration

```groovy
// Jenkins configuration for SAML SSO
// Manage Jenkins -> Configure Global Security -> Security Realm

// Recommended: Use SSO (SAML/OIDC/LDAP)
// Do NOT use Jenkins own user database for production

// SAML Configuration:
// 1. Install SAML plugin
// 2. Configure IdP metadata URL
// 3. Map groups for RBAC
// 4. Test authentication flow

// OIDC Configuration (Azure AD example):
// 1. Install OIDC plugin
// 2. Client ID: <Azure AD App Registration>
// 3. Client Secret: <from Azure AD>
// 4. Issuer: https://login.microsoftonline.com/<tenant>/v2.0
// 5. User name field: sub
// 6. Groups field: groups
```

### SSO Configuration Best Practices

```
1. Enforce SSO for all users.
2. Disable Jenkins user registration.
3. Use short-lived tokens (max 8 hours).
4. Map groups from IdP (not local groups).
5. Require MFA at IdP level.
6. Test SSO failover (local admin account for emergency).
7. Rotate client secrets every 90 days.
8. Audit IdP group membership regularly.
```

### API Token Management

```groovy
// Token best practices:
// 1. Each user has unique API token.
// 2. Token name describes use case (e.g., "deploy-bot-v2").
// 3. Tokens expire after max 180 days.
// 4. Audit token usage weekly.
// 5. Revoke immediately on compromise.

// Token creation (UI):
// Jenkins -> People -> User -> Configure -> API Token -> Add New Token

// Token usage:
curl -u username:API_TOKEN https://jenkins.example.com/job/build/build
```

### Emergency Access

```
Local admin account:
  - Only for Jenkins emergency access.
  - Stored in password manager (not shared).
  - Used only when SSO is unavailable.
  - Logged and audited separately.
  - Rotate password quarterly.
  - Disable when not in use (enable via config file restart).

Emergency access procedure:
  1. Confirm SSO outage (not just individual lockout).
  2. Manager approves emergency access.
  3. Enable local admin via Jenkins config file.
  4. Perform necessary actions.
  5. Disable local admin.
  6. Post incident review.
```

---

## Authorization Strategy

### Matrix-Based Security

```groovy
// Recommended: Matrix Authorization Strategy Plugin

// Manage Jenkins -> Configure Global Security -> Authorization
// Select: Matrix-based security

// Global permissions matrix:
//
// Permission                  | admin | devops | developer | viewer
// -----------------------------------------------------------------
// Overall/Administer           | X     |        |          |
// Overall/Read                 | X     | X      | X        | X
// Overall/RunScripts           | X     |        |          |
// Job/Create                  | X     | X      |          |
// Job/Delete                  | X     | X      |          |
// Job/Configure               | X     | X      | X        |
// Job/Build                   | X     | X      | X        |
// Job/Read                    | X     | X      | X        | X
// Run/Update                  | X     | X      | X        |
// Run/Delete                  | X     | X      |          |
// Credentials/Create          | X     | X      |          |
// Credentials/Delete          | X     | X      |          |
// Credentials/Update          | X     | X      |          |
// Credentials/View            | X     | X      | X        |
// Agent/Configure             | X     | X      |          |
// Agent/Connect               | X     | X      |          |
```

### Folder-Based Authorization

```groovy
// Folder-level permissions for multi-team Jenkins:
//
// /TeamA/*
//   TeamA-admin: Full control
//   TeamA-dev: Build, Read, Configure
//   TeamA-viewer: Read only
//
// /TeamB/*
//   TeamB-admin: Full control
//   TeamB-dev: Build, Read, Configure
//
// /Shared/*
//   all-devops: Full control
//   all-developer: Build, Read

// Implementation:
// 1. Create folder per team/project.
// 2. Assign team group to folder.
// 3. Set folder-specific permissions.
// 4. Inheritance: sub-folders inherit parent permissions.
```

### Role-Based Access Control

```
Roles definition:
  - jenkins-admin: Full system control, plugin management, security config.
  - devops-engineer: Job CRUD, agent management, credential management.
  - developer: Job build, configure, view credentials (not values).
  - viewer: Read-only access to all jobs and builds.
  - anonymous: No access (not even read).

Group mapping (from IdP):
  - jenkins-admins@company.com -> jenkins-admin
  - devops@company.com -> devops-engineer
  - engineering@company.com -> developer
  - contractors@company.com -> viewer
  - * -> anonymous (deny all)
```

### Permission Audit

```groovy
// Audit checklist (run quarterly):
// 1. No user has more permissions than their role requires.
// 2. Anonymous access is disabled.
// 3. No shared accounts.
// 4. API tokens not expired and not overdue for rotation.
// 5. Service accounts have minimum necessary permissions.
// 6. No direct user-to-permission assignments (always use groups).
// 7. Agent permissions restricted to agent operations only.

// Check current permissions:
// Jenkins -> Manage Jenkins -> Configure Global Security
// Review Matrix Authorization Strategy table.
```

---

## Credential Management

### Credential Types

```
Jenkins credential store supports:
  - Username with password.
  - SSH key (private key + passphrase).
  - Secret text (API keys, tokens).
  - Certificate (PKCS12).
  - File (uploaded binary).

Security classifications:
  - Critical: production deployment keys, database passwords, cloud provider keys.
  - High: registry credentials, API tokens with write access.
  - Medium: read-only tokens, test environment credentials.
  - Low: public demo credentials, example keys.
```

### Credential Storage Security

```groovy
// Jenkins credentials are encrypted at rest using AES-256.
// Master key stored in: $JENKINS_HOME/secrets/master.key
// Credential file: $JENKINS_HOME/credentials.xml (encrypted)

// Additional security measures:
// 1. Use external credential store (HashiCorp Vault, Azure Key Vault, AWS Secrets Manager).
// 2. Encrypt Jenkins home filesystem.
// 3. Restrict read access to $JENKINS_HOME/secrets/.
// 4. Rotate master key if compromise suspected.
// 5. Backup encrypted credential store securely.

// Vault integration (with HashiCorp Vault plugin):
pipeline {
    agent any
    stages {
        stage('Read Secret') {
            steps {
                withVault(
                    configuration: [
                        vaultUrl: 'https://vault.example.com',
                        vaultCredentialId: 'vault-token',
                        engineVersion: 2
                    ],
                    vaultSecrets: [
                        [
                            path: 'secret/data/ci/docker',
                            engineVersion: 2,
                            secretValues: [
                                [envVar: 'DOCKER_TOKEN', vaultKey: 'token']
                            ]
                        ]
                    ]
                ) {
                    sh 'docker login -u $DOCKER_USER -p $DOCKER_TOKEN'
                }
            }
        }
    }
}
```

### Credential Injection

```groovy
// CORRECT: Use withCredentials
withCredentials([
    string(credentialsId: 'docker-token', variable: 'DOCKER_TOKEN'),
    usernamePassword(credentialsId: 'ghcr-creds',
                     usernameVariable: 'GHCR_USER',
                     passwordVariable: 'GHCR_PAT'),
    sshUserPrivateKey(credentialsId: 'deploy-key',
                      keyFileVariable: 'SSH_KEY')
]) {
    sh '''
        echo $GHCR_PAT | docker login ghcr.io -u $GHCR_USER --password-stdin
        ssh -i $SSH_KEY user@host command
    '''
}

// WRONG: Hardcoded credentials
stage('Bad Practice') {
    environment {
        // NEVER DO THIS:
        API_KEY = 'sk-1234567890abcdef'
    }
}

// ACCEPTABLE: Environment variable from config (not credential)
environment {
    REGISTRY = 'ghcr.io'  // Configuration, not secret
}
```

### Credential Scope and Domains

```
Credential scopes:
  - GLOBAL: available to all jobs on all agents.
  - SYSTEM: available to Jenkins system operations only.
  - FOLDER: available only to jobs within the folder.
  - ITEM: available only to specific job.

Best practice:
  - Use FOLDER scope for team credentials.
  - Use GLOBAL only for system-level credentials (backup, system notifications).
  - Never use ITEM scope (hard to manage at scale).

Credential domains:
  - Default: used for most credentials.
  - example.com: credentials scoped to specific domain.
  - github.com: credentials for GitHub operations.
```

### Credential Rotation

```groovy
// Rotation schedule:
// Critical credentials: every 30 days.
// High: every 90 days.
// Medium: every 180 days.
// Low: annually.

// Automated rotation workflow:
// 1. Generate new credential in external store.
// 2. Update Jenkins credential via API.
// 3. Verify with test pipeline.
// 4. Remove old credential.
// 5. Log rotation event.

// Jenkins API credential update:
curl -X POST https://jenkins.example.com/credentials/store/system/domain/_/credential/my-credential/config.xml \
    -H "Content-Type: application/xml" \
    -d '<com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl>
          <scope>GLOBAL</scope>
          <id>my-credential</id>
          <username>updated-user</username>
          <password>updated-password</password>
        </com.cloudbees.plugins.credentials.impl.UsernamePasswordCredentialsImpl>'
```

---

## Pipeline Security

### Groovy Sandbox

```groovy
// Sandbox restricts dangerous Groovy methods.
// Enabled by default for declarative pipelines.
// Scripted pipelines run outside sandbox unless explicitly configured.

// Methods blocked in sandbox:
//   - new File(...) -- file system access
//   - Runtime.exec() -- arbitrary command execution
//   - Class.forName() -- class loading
//   - System.exit() -- JVM operations
//   - Thread.start() -- thread manipulation

// Safe alternatives in sandbox:
sh 'command'  // instead of Runtime.exec()
readFile('path')  // instead of new File()
```

### Script Approval

```groovy
// When pipeline uses methods not in approved list:
// Jenkins -> Manage Jenkins -> In-process Script Approval

// Approve specific method signatures:
// method com.example.MyClass myMethod
// new java.io.File java.lang.String
// staticField java.lang.System out

// Best practice:
// 1. Review each approval request carefully.
// 2. Avoid approving dangerous methods (File, Runtime, Process).
// 3. Use shared library wrappers instead.
// 4. Audit approved signatures quarterly.
// 5. Remove unused approvals.

// Dangerous approvals to avoid:
//   - new java.io.File java.lang.String
//   - staticMethod java.lang.Runtime exec
//   - new java.lang.ProcessBuilder
//   - new java.lang.Thread
```

### Securing Shared Libraries

```groovy
// Shared libraries run outside sandbox -- require secure coding:

// 1. Validate all inputs
def runCommand(Map config) {
    def command = config.command
    if (command.contains('rm -rf /')) {
        error "Dangerous command blocked"
    }
    sh command
}

// 2. Use approved APIs only
def readConfigFile(String path) {
    // Use Jenkins readFile, not File I/O
    return readFile(path)
}

// 3. Never expose credentials in logs
def deploy(Map config) {
    withCredentials(...) {
        // Mask secrets in output
        sh 'set +x; deploy-command; set -x'
    }
}

// 4. Library version pins
@Library('my-lib@v2.1.0') _
// not: @Library('my-lib@latest') _
```

### Pipeline Security Checklist

```
[ ] Sandbox enabled for all non-trusted pipelines.
[ ] Approved script signatures reviewed quarterly.
[ ] Dangerous methods not in approved list.
[ ] Shared libraries reviewed for security issues.
[ ] Input validation on all parameters.
[ ] Secrets never in console output.
[ ] Branch restrictions on deploy stages.
[ ] Timeout on all stages (prevents resource exhaustion).
[ ] Agent workspace cleaned after each build.
[ ] Build artifacts with retention policy.
[ ] Deploy approval required for production.
[ ] Pipeline logs don't expose credentials.
[ ] External SCM hooks authenticated.
```

---

## Agent Security

### Agent Authentication

```groovy
// Agent connection types:
// 1. SSH: agent connects via SSH key (secure).
// 2. JNLP: agent connects via TCP (requires secret).
// 3. WebSocket: agent connects via HTTP (for cloud native).
// 4. Kubernetes: pod agent, ephemeral.

// Recommended: SSH or Kubernetes agents.
// Avoid: JNLP with fixed secret (use auto-generated tunnel).

// SSH agent setup:
// 1. Create dedicated system user on agent machine.
// 2. Use SSH key authentication (not password).
// 3. Agent user has minimal permissions on host.
// 4. Jenkins master initiates connection.

// Kubernetes agent:
// 1. Each build gets ephemeral pod.
// 2. Pod destroyed after build.
// 3. Network isolation via Kubernetes policies.
// 4. Resource limits prevent resource exhaustion.
```

### Agent Isolation

```
Agent isolation measures:
  1. Dedicated user: jenkins-agent, not root.
  2. File system isolation: build workspace chrooted.
  3. Network isolation: agents can only reach build targets.
  4. Process isolation: no access to host processes.
  5. Resource limits: CPU, memory, disk quotas.

Container-based agents (Docker/K8s):
  - Build runs inside container.
  - Container has minimal packages.
  - Ephemeral container per build.
  - No persistent storage on host.

Static agent hardening:
  - Remove compilers, interpreters not needed for builds.
  - Disable SSH password authentication.
  - Firewall: agents only talk to Jenkins master.
  - Regular security patching.
  - Audit agent access logs.
```

### Agent Credentials

```
Agent credentials policy:
  - Agents never store build credentials.
  - Credentials injected at build time only.
  - Agent has no access to Jenkins master credential store.
  - Agent-to-master communication encrypted (TLS).
  - Agent authentication token rotated after each use (JNLP).
  - No permanent credentials stored on agent filesystem.

Credential scope visibility:
  - Agent workspace visible only during active build.
  - Workspace cleaned after build completion.
  - Build artifacts with sensitive data have restricted read.
```

### Ephemeral Agents

```
Benefits of ephemeral agents:
  - No persistent attack surface.
  - Fresh environment per build.
  - Consistent build environment.
  - Auto-scaled by demand.
  - No credential caching.

Implementation:
  - Kubernetes pod template per build.
  - Docker container per build.
  - Cloud instances (AWS EC2, Azure VM) with auto-termination.
```

---

## Network Security

### TLS Configuration

```
Jenkins master TLS requirements:
  1. TLS 1.2 minimum (disable TLS 1.0, 1.1).
  2. Strong ciphers only (AES-GCM, CHACHA20).
  3. Valid certificate from trusted CA (not self-signed).
  4. Redirect HTTP to HTTPS.
  5. HSTS header enabled.
  6. OCSP stapling for performance.

Nginx reverse proxy config for Jenkins:
server {
    listen 443 ssl http2;
    server_name jenkins.example.com;

    ssl_certificate /etc/letsencrypt/live/example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256;
    ssl_prefer_server_ciphers on;

    add_header Strict-Transport-Security "max-age=63072000" always;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Network Segmentation

```
Jenkins network zones:
  Zone 1: Public Internet
    - Only reverse proxy (nginx) exposed.
    - Port 443 only.
    - DDoS protection (Cloudflare, AWS Shield).

  Zone 2: Jenkins DMZ
    - Jenkins master here.
    - Accessible only from proxy.
    - Accessible from agents.
    - No direct internet access.

  Zone 3: Agent Network
    - Build agents here.
    - Access to build resources (Git, registry, artifact store).
    - No access to Jenkins master (except required ports).
    - Egress filtering to prevent data exfiltration.

  Zone 4: Production Network
    - Agents need access for deployment.
    - Limited to specific hosts and ports.
    - Bastion host for SSH access.
```

### Firewall Rules

```
Jenkins master inbound:
  Port 443:          Reverse proxy
  Port 50000:        Agent connections (SSH or JNLP over TLS)
  Port 22:           SSH (admin only, VPN required)
  All other ports:   Deny

Jenkins master outbound:
  Port 443:          GitHub, Docker registry, artifact repository
  Port 22:           Agent SSH connections
  Port 80:           HTTP (redirect to HTTPS only)

Agent outbound:
  Port 443:          Jenkins master, Git, registry, artifact store
  Port 22:           Deploy targets (bastion)
  All other ports:   Deny (default)

Agent inbound:
  Port 22:           Jenkins master SSH
  All other ports:   Deny
```

### CSRF Protection

```groovy
// Jenkins CSRF protection (enabled by default):
// Jenkins -> Manage Jenkins -> Configure Global Security
// CSRF Protection: Enable
// Crumb Issuer: Default Crumb Issuer

// API calls with CSRF crumb:
crumb=$(curl -s -u user:token 'https://jenkins/crumbIssuer/api/json' | jq -r '.crumb')
curl -X POST -H "Jenkins-Crumb: $crumb" \
    -u user:token \
    'https://jenkins/job/build/build'

// Disable CSRF for scripts (NOT recommended for production):
// Only for automation with API token authentication.
```

---

## Audit and Monitoring

### Audit Log Configuration

```
Jenkins audit logging:
  1. Job configuration changes.
  2. User authentication events.
  3. Permission changes.
  4. Credential operations.
  5. Plugin installations/updates.
  6. System configuration changes.
  7. Agent connect/disconnect.
  8. Build trigger events.

Log format: JSON (for SIEM ingestion).
Log retention: 1 year minimum.
Log destination: Centralized logging (ELK, Splunk, Datadog).
```

### Audit Log Example

```json
{
  "timestamp": "2025-01-15T10:30:00Z",
  "event": "JOB_CONFIG_CHANGE",
  "user": "jane.doe",
  "job": "my-app/deploy-pipeline",
  "action": "UPDATE",
  "details": {
    "changed_properties": ["pipeline.scm.url", "pipeline.triggers"],
    "previous_value": {"scm.url": "http://old-git.example.com/repo.git"},
    "new_value": {"scm.url": "https://github.com/org/repo.git"}
  }
}
```

### Security Monitoring

```
Monitoring alerts:
  - Failed login attempts (> 5 in 5 minutes).
  - Credential access from unexpected IP.
  - Pipeline running outside business hours.
  - Job configuration changes by non-admin.
  - Plugin installation events.
  - Agent connection failures.
  - CSRF crumb validation failures.
  - API calls without authentication.
  - Build with suspicious parameters (injection attempts).
  - Large number of builds triggered in short period.

Integration with SIEM:
  - Send Jenkins logs to central SIEM.
  - Correlate with other security events.
  - Dashboard for Jenkins security posture.
  - Alert on suspicious patterns.
```

### Build Artifact Security

```
Build artifact access control:
  - Artifacts inherit job permissions.
  - Sensitive artifacts restricted to specific users.
  - Artifact retention: 30 days default, > 90 days requires justification.
  - Artifact storage encrypted at rest.
  - Artifact integrity verified (checksum stored with artifact).

Artifact types with special handling:
  - Container images: scan for vulnerabilities before storage.
  - Deployment packages: signed with GPG key.
  - Test reports: no sensitive data (sanitize).
  - Logs: strip credentials before storage.
```

---

## Plugin Security

### Plugin Management

```
Plugin installation policy:
  - Only install from official Jenkins update center.
  - Review plugin permissions before installation.
  - Test plugin in non-production Jenkins first.
  - Pin plugin versions (no auto-update).
  - Remove unused plugins.
  - Maintain plugin inventory with version and purpose.

Plugin approval process:
  1. Request: developer requests plugin installation.
  2. Review: security team reviews plugin permissions.
  3. Test: plugin tested in staging Jenkins.
  4. Approve: authorized admin approves.
  5. Install: plugin installed in maintenance window.
```

### Plugin Security Checklist

```
Before installing a plugin:
  [ ] Plugin is from official Jenkins update center.
  [ ] Plugin is actively maintained (recent releases).
  [ ] No known CVEs for the plugin.
  [ ] Plugin permissions match what it needs to do.
  [ ] Plugin does not request excessive permissions.
  [ ] Plugin has no required dependencies with vulnerabilities.
  [ ] Plugin tested in staging environment.
  [ ] Rollback plan documented.

Pre-installed plugin audit:
  - 80+ plugins on average Jenkins instance.
  - Review plugin list quarterly.
  - Remove plugins not used in 6+ months.
  - Check for deprecated plugins.
  - Verify plugin version against latest.
```

### Vulnerability Management

```
Plugin vulnerability response:
  1. Subscribe to Jenkins security advisories.
  2. Automated scan for plugin CVEs.
  3. Critical CVE: patch within 48 hours.
  4. High CVE: patch within 1 week.
  5. Medium CVE: patch within 1 month.
  6. Low CVE: patch at next maintenance window.

Update process:
  1. Check plugin changelog for breaking changes.
  2. Test in staging Jenkins.
  3. Schedule maintenance window.
  4. Backup Jenkins before update.
  5. Update plugin.
  6. Verify pipeline functionality.
  7. Rollback if issues detected.
```

---

## Compliance and Hardening

### CIS Benchmark for Jenkins

```
Key CIS controls for Jenkins:
  1. Run Jenkins as non-root user.
  2. Jenkins home directory permissions: 700 or 750.
  3. HTTPS enabled with TLS 1.2+.
  4. CSRF protection enabled.
  5. Agent-to-master security enabled.
  6. Job configuration security enabled.
  7. Disable CLI over HTTP.
  8. Restrict API access to authenticated users.
  9. Enable security logging.
  10. Disable unnecessary plugins.
```

### Configuration Hardening

```groovy
// JENKINS_HOME/config.xml hardening
<?xml version='1.1' encoding='UTF-8'?>
<hudson>
  <version>2.440</version>

  <!-- Security settings -->
  <useSecurity>true</useSecurity>
  <authorizationStrategy class="hudson.security.GlobalMatrixAuthorizationStrategy">
    <permission>hudson.model.Hudson.Administer:jenkins-admin</permission>
    <permission>hudson.model.Hudson.Read:authenticated</permission>
  </authorizationStrategy>
  <securityRealm class="org.opensaml.saml2.metadata.provider.HTTPMetadataProvider">
    <!-- SSO configuration -->
  </securityRealm>

  <!-- Disable CLI over HTTP -->
  <disableRememberMe>true</disableRememberMe>

  <!-- CSRF protection -->
  <crumbIssuer class="hudson.security.csrf.DefaultCrumbIssuer">
    <excludeClientIPFromCrumb>false</excludeClientIPFromCrumb>
  </crumbIssuer>

  <!-- Agent security -->
  <slaveAgentPort>50000</slaveAgentPort>
  <tcpSlaveAgentListener>
    <enabled>true</enabled>
    <port>50000</port>
  </tcpSlaveAgentListener>

  <!-- Build record security -->
  <numExecutors>0</numExecutors>
  <mode>EXCLUSIVE</mode>
</hudson>
```

### Backup and Recovery

```
Jenkins backup requirements:
  - JENKINS_HOME backed up daily.
  - Configuration XML files (not binary artifacts).
  - Credential store encrypted backup.
  - Plugin list (for rebuild).
  - Backup retention: 30 days minimum.

Backup contents:
  - jobs/ (job configurations).
  - users/ (user configurations).
  - secrets/ (credential encryption keys -- sensitive!).
  - plugins/ (installed plugins).
  - config.xml (main configuration).
  - *.xml (global configuration files).

Recovery procedure:
  1. Provision new Jenkins server.
  2. Restore JENKINS_HOME from backup.
  3. Install same version of Jenkins.
  4. Restore plugins.
  5. Start Jenkins.
  6. Verify all jobs and credentials.
```

### Compliance Frameworks

```
SOC 2 for Jenkins:
  - Access control: SSO + RBAC.
  - Change management: pipeline as code with PR reviews.
  - Audit trail: full logging.
  - Encryption: TLS + encrypted credentials.
  - Backup: automated with verified restore.

PCI-DSS for Jenkins:
  - No cardholder data in build environment.
  - All connections encrypted.
  - Access restricted to need-to-know.
  - Audit logs retained 1 year.
  - Quarterly security reviews.

NIST 800-53 for Jenkins:
  - AC-2: Account management with SSO.
  - AC-6: Least privilege.
  - AU-2: Auditable events.
  - CM-2: Baseline configuration.
  - IA-2: Identification and authentication.
  - SC-8: Transmission confidentiality.
  - SI-7: Software integrity.
```

---

## Incident Response

### Jenkins Security Incident Types

```
1. Credential compromise: API token or credential leaked.
2. Unauthorized access: user accessed resources beyond permissions.
3. Malicious pipeline: pipeline code modified to execute malicious commands.
4. Agent compromise: build agent accessed by attacker.
5. Plugin vulnerability: zero-day exploit in installed plugin.
6. Denial of service: excessive builds exhausting resources.
7. Data exfiltration: build artifacts with sensitive data accessed.
```

### Incident Response Procedure

```
Step 1: Identify and contain
  - Identify compromised system/user.
  - Disable user account or revoke token.
  - Stop affected pipelines.
  - Isolate compromised agent(s).

Step 2: Assess
  - Determine blast radius.
  - Review audit logs.
  - Check credential access logs.
  - Identify data exposure.

Step 3: Remediate
  - Rotate all affected credentials.
  - Rebuild compromised agents.
  - Apply patches if plugin vulnerability.
  - Update security policies.

Step 4: Recover
  - Restore from clean backup if needed.
  - Verify pipeline integrity.
  - Enable with increased monitoring.

Step 5: Learn
  - Root cause analysis.
  - Update security controls.
  - Update incident response plan.
  - Share lessons learned.
```

### Post-Incident Hardening

```
After credential compromise:
  - Implement shorter credential rotation.
  - Enable credential usage audit.
  - Review credential scope.
  - Add credential access notifications.

After unauthorized access:
  - Review RBAC configuration.
  - Remove unused permissions.
  - Enable anomaly detection.
  - Review IdP group mappings.

After plugin exploit:
  - Subscribe to security advisories.
  - Implement plugin allowlist.
  - Automate vulnerability scanning.
  - Reduce plugin count.
```

## Handoff
`jenkins-pipeline-as-code.md` for pipeline development.
`../../cicd-pipeline/SKILL.md` for CI/CD architecture integration.
