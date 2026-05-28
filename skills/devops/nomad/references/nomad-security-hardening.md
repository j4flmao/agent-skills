# Nomad Security Hardening

## Overview

Security hardening for HashiCorp Nomad covers authentication and authorization (ACLs), network encryption (mTLS), secrets management (Vault integration), audit logging, namespace isolation, and runtime security controls. This reference provides comprehensive guidance for securing Nomad in production environments.

## Threat Model

### Assets to Protect

- **Job specifications**: May contain configuration, environment variables, secrets
- **Allocation data**: Application data stored in alloc directories
- **Client nodes**: Where workloads execute
- **Server nodes**: Cluster state, Raft logs, ACL tokens
- **Consul integration**: Service discovery, health check data
- **Vault integration**: Secret identities and tokens

### Threat Actors

| Threat Actor | Capability | Motivation |
|---|---|---|
| External attacker | Network access to Nomad API/UI | Data theft, resource abuse |
| Malicious tenant | Authorized API access within namespace | Privilege escalation, lateral movement |
| Compromised workload | Runtime access inside allocation | Host compromise, data exfiltration |
| Insider | Legitimate access with privilege | Data theft, sabotage |
| Supply chain | Compromised Nomad binary | Backdoor, persistence |

### Attack Vectors

- Unauthenticated API access
- Unencrypted network traffic (gossip, RPC, HTTP)
- Token theft or misuse
- Namespace escape
- Client node compromise via workload
- Server Raft manipulation
- Consul/Vault integration compromise

## ACL System Configuration

### Enabling ACLs

```hcl
# server configuration
server {
  enabled = true

  acl {
    enabled = true
    # Token replication for HA
    replication_token = "YOUR_REPLICATION_TOKEN"
    # Policy TTL (default 30s)
    policy_ttl = "30s"
    # Token TTL (default 30s)
    token_ttl = "30s"
  }
}
```

### Bootstrap Initial Management Token

```bash
# Bootstrap ACL system (first-time setup)
nomad acl bootstrap

# Output:
# Accessor ID:    abcd1234-....
# Secret ID:      12345678-....
# Type:           management

# Store secret ID securely (Vault, password manager, HSM)
# Never commit to version control
```

### ACL Policy Types

| Policy Type | Description | Use Case |
|---|---|---|
| management | Full access to all resources | Initial setup, break-glass, emergency |
| client | Namespace-specific access | Team workloads |
| write | Read-write access | CI/CD pipelines, operators |
| read | Read-only access | Monitoring, auditing |

### Creating ACL Policies

```hcl
# Policy for team-a in namespace development
namespace "development" {
  policy = "write"
}
namespace "staging" {
  policy = "read"
}
namespace "production" {
  policy = "deny"
}

# Allow reading nodes across all namespaces
node {
  policy = "read"
}

# Allow read-only operator actions
operator {
  policy = "read"
}

# Allow quota management in development
quota {
  policy = "write"
}

# Allow agent self management
agent {
  policy = "read"
}
```

### ACL Policy Scenarios

**CI/CD Pipeline Token**:
```hcl
# CI pipeline can run jobs in development only
namespace "development" {
  policy = "write"
}
namespace "staging" {
  policy = "read"
}
namespace "production" {
  policy = "deny"
}
```

**Monitoring Token**:
```hcl
# Read-only access to all namespaces and nodes
namespace "*" {
  policy = "read"
}
node {
  policy = "read"
}
agent {
  policy = "read"
}
operator {
  policy = "read"
}
```

**Developer Token**:
```hcl
# Full access to development, read staging
namespace "development" {
  policy = "write"
}
namespace "staging" {
  policy = "read"
}
```

### Token Management

```bash
# Create token with policy
nomad acl token create \
  -name "ci-pipeline-token" \
  -policy "ci-pipeline-policy"

# List tokens
nomad acl token list

# Delete token (compromise or offboarding)
nomad acl token delete <accessor-id>

# Self info
nomad acl token info -self

# Update token (add/remove policies)
nomad acl token update \
  -name "ci-pipeline-token" \
  -policy "ci-pipeline-policy-v2" \
  <accessor-id>
```

## mTLS Configuration

### Certificate Architecture

```
CA Certificate (self-signed or internal CA)
  |
  +-- Server Certificate (all Nomad servers)
  |     - CN: server.<region>.nomad
  |     - SANs: server IPs, DNS names
  |
  +-- Client Certificate (all Nomad clients)
  |     - CN: client.<region>.nomad
  |     - SANs: client IPs, DNS names
  |
  +-- CLI Certificate (operators)
        - CN: <username>.nomad
        - SANs: none
```

### Generating Certificates

```bash
# 1. Generate CA
nomad tls ca create

# 2. Generate server certificate
nomad tls cert create -server -region global

# 3. Generate client certificate
nomad tls cert create -client -region global

# 4. Generate CLI certificate
nomad tls cert create -cli -region global
```

### Server mTLS Configuration

```hcl
# Nomad server config
server {
  enabled = true
}

tls {
  http = true
  rpc  = true

  ca_file   = "/etc/nomad.d/tls/ca.pem"
  cert_file = "/etc/nomad.d/tls/server.pem"
  key_file  = "/etc/nomad.d/tls/server-key.pem"

  # Verify client certificates for mTLS
  verify_https_client = true
  verify_server_hostname = true

  # Require TLS for RPC connections
  rpc_upgrade_mode = false
}
```

### Client mTLS Configuration

```hcl
# Nomad client config
client {
  enabled = true

  # Options for client certificate
}

tls {
  http = true
  rpc  = true

  ca_file   = "/etc/nomad.d/tls/ca.pem"
  cert_file = "/etc/nomad.d/tls/client.pem"
  key_file  = "/etc/nomad.d/tls/client-key.pem"

  verify_sshd       = false
  verify_server_hostname = true
}
```

### CLI mTLS Configuration

```bash
export NOMAD_ADDR=https://nomad-server.example.com:4646
export NOMAD_CACERT=/etc/nomad.d/tls/ca.pem
export NOMAD_CLIENT_CERT=/etc/nomad.d/tls/cli.pem
export NOMAD_CLIENT_KEY=/etc/nomad.d/tls/cli-key.pem
```

### mTLS Deployment Steps

1. Generate CA certificate
2. Generate server certificate per region
3. Deploy certificates to all servers
4. Configure servers with mTLS and `rpc_upgrade_mode = true`
5. Generate client certificates
6. Deploy certificates to all clients
7. Configure clients with mTLS
8. Wait for all nodes to upgrade
9. Set `rpc_upgrade_mode = false`
10. Generate CLI certificates for operators
11. Verify all connections use mTLS: `nomad server members -verbose`

## Gossip Protocol Encryption

### Encryption Key Generation

```bash
# Generate gossip encryption key
nomad operator gossip keyring generate

# Output: base64-encoded 32-byte key
# Example: 8X3kKsLq4M5nV6b7N8c9P0a1s2d3f4g5h6j7k8l9=
```

### Configuration

```hcl
# All servers and clients
server {
  enabled = true
}

# Gossip encryption key
encrypt = "8X3kKsLq4M5nV6b7N8c9P0a1s2d3f4g5h6j7k8l9="
```

### Key Rotation

```bash
# 1. Add new key
nomad operator gossip keyring add <new-key>

# 2. List keys
nomad operator gossip keyring list

# 3. Change primary key
nomad operator gossip keyring use <new-key>

# 4. Remove old key
nomad operator gossip keyring remove <old-key>
```

## Vault Integration for Secrets

### Vault Configuration

```hcl
# Nomad server configuration for Vault
vault {
  enabled = true
  address = "https://vault.example.com:8200"

  # Vault token with policies for Nomad
  token = "VAULT_TOKEN"

  # Allow creating tokens from Nomad tasks
  create_from_role = "nomad-cluster"

  # TLS configuration for Vault connection
  ca_file   = "/etc/nomad.d/tls/vault-ca.pem"
  cert_file = "/etc/nomad.d/tls/vault-cert.pem"
  key_file  = "/etc/nomad.d/tls/vault-key.pem"
}
```

### Vault Role for Nomad

```hcl
# Vault policy for Nomad
path "secret/data/nomad/*" {
  capabilities = ["read", "list"]
}

path "auth/token/create/nomad-task" {
  capabilities = ["create", "update"]
}
```

### Job Spec Using Vault

```hcl
job "api-server" {
  group "api" {
    task "server" {
      driver = "docker"

      # Vault integration
      vault {
        policies = ["api-server-policy"]
      }

      # Template to render secrets
      template {
        data        = <<EOH
{{ with secret "secret/data/nomad/api-server" }}
DB_PASSWORD={{ .Data.data.db_password }}
API_KEY={{ .Data.data.api_key }}
{{ end }}
EOH
        destination = "secrets/config.env"
        env         = true
      }

      config {
        image = "org/api-server:v1.0.0"
      }
    }
  }
}
```

### Vault Task Policies

```hcl
# Vault policy for api-server task
path "secret/data/nomad/api-server" {
  capabilities = ["read"]
}

path "secret/data/nomad/shared/*" {
  capabilities = ["read"]
}
```

## Namespace Isolation

### Namespace Configuration

```hcl
# Server configuration
server {
  enabled = true

  # Enable namespaces (Nomad Enterprise)
  namespace {
    enabled = true
    default_namespace = "default"
  }
}
```

### Creating Namespaces

```hcl
# Namespace for team-a
namespace "development" {
  description = "Development workloads for team-a"
  meta {
    owner       = "team-a"
    cost_center = "engineering"
  }
}

# Namespace with quota
namespace "production" {
  description = "Production workloads"
  quota = "production-quota"
}
```

### Namespace Quotas

```hcl
# Quota specification
quota "production-quota" {
  description = "Resource limits for production namespace"
  limit {
    region "global" {
      cpu    = 4000
      memory = 8192
    }
  }
}

# Namespace with quota
namespace "production" {
  quota = "production-quota"
}
```

### Namespace Scoped Tokens

```hcl
# Policy limited to namespace
namespace "team-a-development" {
  policy = "write"
}
namespace "default" {
  policy = "deny"
}
```

## Audit Logging

### Enabling Audit Logging

```hcl
# Nomad Enterprise audit logging
audit {
  enabled = true

  # Log all API requests with body
  log_sensitive_requests = false
  log_sensitive_responses = false

  # Backend configuration
  backend "file" {
    path = "/var/log/nomad/audit.log"
    # Rotate when file reaches 100MB
    max_file_size_mb = 100
    # Keep 10 rotated files
    max_file_count = 10
  }
}
```

### Audit Log Format

```json
{
  "id": "abcd1234-...",
  "version": 1,
  "stage": "response",
  "type": "request",
  "timestamp": "2025-01-15T10:30:00Z",
  "source": "api",
  "event": {
    "type": "job-submit",
    "namespace": "development",
    "auth": {
      "accessor_id": "token-accessor-...",
      "policy_name": "dev-policy"
    },
    "request": {
      "method": "PUT",
      "path": "/v1/jobs",
      "remote_addr": "10.0.1.100:54321",
      "parameters": {
        "job_name": "webapp"
      }
    },
    "response": {
      "status_code": 200,
      "error": ""
    },
    "metadata": {
      "user_agent": "nomad/1.6.0"
    }
  }
}
```

### Audit Log Monitoring

```hcl
# Audit alerting rules
alert "Unauthorized API Access" {
  condition = "audit.event.response.status_code == 403"
  for = "5m"
  notify = ["security-team"]
}

alert "Token Creation" {
  condition = "audit.event.type == 'acl-token-create'"
  for = "1m"
  notify = ["security-team"]
}

alert "Sensitive Path Access" {
  condition = "audit.event.request.path matches '/v1/agent/*'"
  for = "1m"
  notify = ["security-team"]
}
```

## Capabilities and Privileges

### Dropping Unnecessary Capabilities

```hcl
# Task configuration
task "server" {
  driver = "docker"

  config {
    image = "org/api:v1.0.0"

    # Drop all capabilities, add only needed
    cap_add  = ["NET_BIND_SERVICE"]
    cap_drop = ["ALL"]

    # Security options
    security_opt = [
      "no-new-privileges:true",
      "seccomp=unconfined" # Only if necessary
    ]

    # Read-only root filesystem
    readonly_rootfs = true
  }

  # User
  user = "10001:10001"
}
```

### Resource Controls

```hcl
# Resource constraints
resources {
  cpu    = 500
  memory = 256
  memory_max = 512  # Burstable
}
```

## Network Security

### Network Modes

```hcl
# Bridge mode with port isolation
network {
  mode = "bridge"

  # Explicit port mapping
  port "http" {
    to = 8080
  }

  # Dynamic port assignment
  port "metrics" {}
}

# Host mode (shares host network)
# Only for workloads needing host access
network {
  mode = "host"
}
```

### Network ACLs

```hcl
# Consul intentions for service mesh
intention "api" {
  action = "allow"
  source {
    name = "frontend"
  }
}

intention "api" {
  action = "deny"
  source {
    name = "*"
  }
}
```

## Runtime Security

### Task Driver Restrictions

```hcl
# Nomad client configuration
client {
  options {
    # Restrict raw_exec driver to specific users
    "driver.raw_exec.enable" = "0"

    # Java driver configuration
    "driver.java.enable" = "1"

    # QEMU driver
    "driver.qemu.enable" = "0"
  }
}
```

### Volume Security

```hcl
# CSI volume with access mode
volume "database" {
  type = "csi"
  read_only = false
  attachment_mode = "file-system"
  access_mode = "single-node-writer"
}

# Ephemeral volume (scratch)
ephemeral_disk {
  sticky  = true
  size    = 1000
  migrate = true
}
```

## Secure Upgrade Procedures

### Rolling Upgrade

```bash
# 1. Backup server state
nomad operator raft snapshot save nomad-backup.snap

# 2. Upgrade servers one at a time
#    - Stop server
#    - Replace binary
#    - Start server
#    - Verify leader re-election

# 3. Verify server cluster health
nomad server members
nomad operator raft list-peers

# 4. Upgrade clients
#    - Drain node
nomad node drain -enable -yes <node-id>
#    - Wait for allocations to migrate
nomad node status <node-id>
#    - Upgrade binary, restart
#    - Disable drain
nomad node drain -disable <node-id>
```

### Security Patch Procedure

1. Identify affected version and CVE
2. Check if patch available
3. Test patch in non-production
4. Schedule maintenance window
5. Backup cluster state
6. Apply patch with rolling upgrade
7. Verify patch applied
8. Update security documentation

## Incident Response for Nomad

### Potential Security Incidents

| Incident | Indicators | Response |
|---|---|---|
| API compromise | Unknown API calls, unauthorized job submissions | Revoke tokens, audit log review, rotate secrets |
| Node compromise | Unknown processes, outbound connections from client | Isolate node, drain allocations, forensic analysis |
| Token theft | Login from unknown IPs, unusual API patterns | Revoke token, access review, rotate affected credentials |
| Namespace escape | Cross-namespace access, quota bypass | ACL audit, namespace isolation review |
| Raft compromise | Server membership changes, unknown server | Isolate server, restore from backup, server membership audit |

### Incident Response Steps

1. **Detect**: Monitoring alert, security tool notification, user report
2. **Contain**:
   - Revoke compromised tokens: `nomad acl token delete <id>`
   - Isolate affected nodes: network ACL, stop nomad service
   - Drain allocations: `nomad node drain -enable -yes <node-id>`
3. **Investigate**:
   - Audit log review for affected time period
   - Server/client logs for anomalous activity
   - Allocation logs for workload behavior
4. **Remediate**:
   - Rotate all secrets (Vault tokens, gossip key, TLS certs)
   - Update ACL policies to reduce blast radius
   - Apply security patches
5. **Recover**:
   - Restore from known good backup if necessary
   - Recertify tokens and policies
   - Verify security controls
6. **Document**:
   - Root cause analysis
   - Timeline of events
   - Preventive measures

## Compliance Mapping

### SOC 2 Controls

| Control | Nomad Implementation |
|---|---|
| Logical Access | ACL policies, mTLS, namespaces |
| Change Management | Job versioning, deployment strategies |
| Monitoring | Audit logging, metrics, alerting |
| Backup | Raft snapshot, job spec in VCS |
| Incident Response | Audit log investigation, token revocation |

### PCI DSS Controls

| Requirement | Implementation |
|---|---|
| 7.1 Access Control | ACL policies, least privilege |
| 8.1.2 Authentication | mTLS, token-based auth |
| 10.2 Audit Trails | Audit logging |
| 10.5 Log Integrity | Immutable audit logs |
| 3.4 Data Encryption | mTLS, gossip encryption |

### HIPAA Controls

| Standard | Implementation |
|---|---|
| Access Control (164.312.a.1) | ACL, mTLS, Vault | | Audit Controls (164.312.b) | Audit logging |
| Integrity (164.312.c.1) | mTLS, checksums |
| Person or Entity Auth (164.312.d) | Token authentication |
| Transmission Security (164.312.e.1) | TLS encryption |

## Security Checklist

### Pre-Production

- [ ] ACLs enabled on all servers
- [ ] Bootstrap token stored securely
- [ ] ACL policies defined per team
- [ ] Namespaces configured for multi-team isolation
- [ ] mTLS configured with valid certificates
- [ ] Gossip encryption enabled
- [ ] Vault integration configured for secrets
- [ ] Vault policies scoped per task

### Production Hardening

- [ ] mTLS required (rpc_upgrade_mode = false)
- [ ] Default namespace has denylist ACL
- [ ] Audit logging enabled and monitored
- [ ] Raw_exec driver disabled on non-trusted nodes
- [ ] Network encryption for all cross-node traffic
- [ ] Token rotation procedure documented
- [ ] Certificate renewal procedure documented
- [ ] Backup strategy for Raft state

### Ongoing Operations

- [ ] TLS certificates renewed before expiry
- [ ] Gossip encryption key rotated quarterly
- [ ] ACL tokens audited monthly
- [ ] Audit logs reviewed weekly
- [ ] Security patches applied within SLA
- [ ] Vault token rotation
- [ ] Access review for management tokens
- [ ] Penetration testing annually

## Key Points

- ACLs are essential for multi-tenant security -- enable in production
- mTLS encrypts all Nomad communication and authenticates nodes
- Gossip encryption prevents cluster discovery and manipulation
- Vault integration for secrets -- never use env vars for sensitive data
- Namespaces isolate teams and workloads
- Audit logging provides accountability and incident investigation
- Raw_exec driver is dangerous -- disable unless absolutely necessary
- mTLS certificate rotation must be automated
- Node draining before client maintenance prevents data loss
- Backup Raft state before any upgrade
- Monitor ACL token usage and expiry
- Least privilege applies to tokens, policies, and Vault roles
- Network segmentation separates management, application, and storage traffic
- Compliance mapping (SOC2, PCI, HIPAA) for regulated environments
