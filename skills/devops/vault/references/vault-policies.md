# Vault Policies

## Policy Syntax

```hcl
# Basic structure
path "secret/data/project/*" {
  capabilities = ["read", "list"]
}

path "secret/metadata/project/*" {
  capabilities = ["list"]
}
```

## Capabilities

| Capability | Description |
|------------|-------------|
| `create` | Create new data at path (POST) |
| `read` | Read data at path (GET) |
| `update` | Update existing data (PUT/PATCH) |
| `delete` | Delete data (DELETE) |
| `list` | List children (LIST) |
| `sudo` | Access root-protected paths |
| `deny` | Explicitly disallow access |
| `subscribe` | Subscribe to events (Enterprise) |

## Common Patterns

```hcl
# Full admin
path "secret/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "database/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "sys/*" {
  capabilities = ["read", "sudo"]
}

# Read-only access to specific project
path "secret/data/team-a/*" {
  capabilities = ["read", "list"]
}

path "secret/metadata/team-a/*" {
  capabilities = ["list"]
}

# Dynamic credentials only
path "database/creds/my-role" {
  capabilities = ["read"]
}

# Transit encrypt/decrypt only
path "transit/encrypt/app-key" {
  capabilities = ["create", "update"]
}

path "transit/decrypt/app-key" {
  capabilities = ["create", "update"]
}

# PKI certificate issuance
path "pki_int/issue/example-dot-com" {
  capabilities = ["create", "update"]
}

path "pki_int/cert/*" {
  capabilities = ["read"]
}

# Deny specific paths
path "secret/data/production/*" {
  capabilities = ["deny"]
}
```

## Parameter Constraints

```hcl
# Allow only specific secret paths with conditions
path "secret/data/project/env" {
  capabilities = ["read"]
  allowed_parameters = {
    "db_url" = []
  }
  denied_parameters = {
    "api_key" = []
  }
}

# Require minimum TLS version
path "secret/data/tls" {
  capabilities = ["read"]
  required_parameters = ["certificate"]
}
```

## Policy Templating (ACL)

```hcl
# Entity metadata in policies
path "secret/data/teams/{{identity.entity.aliases.$(auth_method).metadata.team}}/*" {
  capabilities = ["read", "list", "update"]
}

# Identity entity name
path "secret/data/users/{{identity.entity.name}}/*" {
  capabilities = ["create", "read", "update", "delete"]
}

# HTTP request info
path "secret/data/environments/{{request.headers.X-Env}}/*" {
  capabilities = ["read"]
}
```

## Associating Policies

```bash
# With token
vault token create -policy=developer -policy=ci-bot

# With auth method role
vault write auth/kubernetes/role/my-app \
  policies=developer \
  ttl=1h

vault write auth/approle/role/my-role \
  token_policies=ci-bot \
  policies=developer

# With entity (identity)
vault write identity/entity name="john" \
  policies=developer

vault write identity/entity-alias \
  name="[email protected]" \
  canonical_id=<entity_id> \
  mount_accessor=<auth_mount_accessor>
```

## Testing Policies

```bash
# Preview token capabilities
vault token capabilities <token> secret/data/project/config
vault token capabilities <token> database/creds/my-role

# Preview using policy file
vault policy fmt my-policy.hcl  # Format + validate
vault policy read developer      # View applied policy
vault policy list                # List all policies
```

## Sentinel (Enterprise)

```hcl
# EGP — Endpoint Governance Policy
import "time"

main = rule {
  time.day_of_week in ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"] and
  time.now.hour in [9, 10, 11, 12, 13, 14, 15, 16, 17]
}
```
