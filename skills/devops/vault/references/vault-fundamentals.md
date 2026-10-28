# HashiCorp Vault Fundamentals: Mental Model, Auth Methods, Tokens, Leases and KV Workflows

Vault centralizes secrets, issues short-lived dynamic credentials, and provides encryption as a service, with every request authenticated, authorized by policy and audited. This reference builds the core mental model: paths and mounts, authentication and identity, tokens and leases, and day-to-day KV usage. Server architecture and unsealing are in `vault-basics.md`; policies, engines, clustering and integrations have their own references.

## Licensing and Distributions

- Vault Community Edition is source-available under the Business Source License (BSL 1.1) since version 1.14 (2023). Enterprise adds namespaces, performance/DR replication, HSM support, Sentinel and more.
- HCP Vault Dedicated is the managed service.
- OpenBao is a Linux Foundation fork of the last MPL-licensed Vault, API-compatible for most features. Choose deliberately and check feature parity for your needs.

## Mental Model: Everything Is a Path

```text
client --(auth method)--> token --(policy check on path + capability)--> mount (engine) --> response (+ lease)
                                                                    \--> audit device logs request and response
```

| Concept | Meaning |
|---------|---------|
| Mount | An engine instance at a path: `secret/` (KV v2), `database/`, `pki/`, `transit/`, `auth/kubernetes/` |
| Path | Operation target under a mount, for example `secret/data/orders/db` |
| Capability | `create`, `read`, `update`, `patch`, `delete`, `list`, `sudo`, `deny` |
| Policy | HCL rules mapping paths to capabilities; default deny |
| Token | Credential carrying policies, TTL and metadata |
| Lease | TTL attached to dynamic secrets and tokens; renewable up to a max TTL; revocable |

```bash
vault secrets list -detailed
vault auth list
vault path-help secret/            # discover paths of a mount
vault read sys/mounts/secret/tune
```

## Development Server (Local Only)

```bash
vault server -dev -dev-root-token-id=dev-only-token
export VAULT_ADDR=http://127.0.0.1:8200
export VAULT_TOKEN=dev-only-token
```

Dev mode runs in memory, unsealed, with HTTP and a root token: never use it beyond local experiments.

## Authentication Methods

Pick auth methods that use an identity the client already has, so no secret must be distributed to obtain a Vault token ("secret zero").

| Client | Auth method | Identity proof |
|--------|-------------|----------------|
| Humans | OIDC (Entra ID, Okta, Google), LDAP | SSO login with MFA |
| Kubernetes pods | `kubernetes` (or JWT with the cluster's OIDC issuer) | Service account token |
| Cloud workloads | `aws` (IAM), `azure` (managed identity), `gcp` (service account) | Cloud-signed identity |
| CI/CD | `jwt` with the CI provider's OIDC tokens (GitHub Actions, GitLab) | Workflow-scoped JWT |
| Legacy apps / machines | `approle` | Role ID + Secret ID (deliver Secret ID via trusted orchestrator, short TTL, CIDR bound) |
| Mutual TLS clients | `cert` | Client certificate |

### Kubernetes auth

```bash
vault auth enable kubernetes
vault write auth/kubernetes/config kubernetes_host="https://kubernetes.default.svc:443"

vault write auth/kubernetes/role/orders \
  bound_service_account_names=orders \
  bound_service_account_namespaces=orders \
  token_policies=orders-read \
  token_ttl=1h token_max_ttl=4h
```

When Vault runs outside the cluster, also configure the CA certificate and a reviewer JWT (or use the JWT auth method with the cluster's OIDC discovery).

### GitHub Actions via JWT

```bash
vault auth enable jwt
vault write auth/jwt/config \
  oidc_discovery_url="https://token.actions.githubusercontent.com" \
  bound_issuer="https://token.actions.githubusercontent.com"

vault write auth/jwt/role/deploy-orders - <<'EOF'
{
  "role_type": "jwt",
  "user_claim": "repository",
  "bound_audiences": ["https://github.com/example-org"],
  "bound_claims": {"repository": "example-org/orders", "ref": "refs/heads/main"},
  "token_policies": ["orders-deploy"],
  "token_ttl": "15m"
}
EOF
```

Bind to repository and branch (or environment) claims so other repositories cannot use the role.

## Identity: Entities and Groups

Vault maps each authenticated login to an **entity** (with **aliases** per auth method). Groups attach policies to many entities; external groups mirror identity provider groups (OIDC/LDAP). Assign policies to groups rather than to individual tokens or roles where possible, and use entity metadata in templated policies (for example per-user KV paths).

## Tokens

| Property | Notes |
|----------|-------|
| TTL / max TTL | Token expires at TTL unless renewed; cannot exceed max TTL |
| Service tokens | Persisted, renewable, can create children; default type |
| Batch tokens | Not persisted, lightweight, not renewable; good for high-volume short-lived workloads |
| Periodic tokens | Renewable indefinitely within the period (for long-running services that renew) |
| Orphan tokens | No parent; not revoked when the creator is revoked |
| Root tokens | Unlimited; generate only for emergencies (`vault operator generate-root`) and revoke after use |

```bash
vault token lookup                     # current token details
vault token renew                      # extend TTL (within max TTL)
vault token revoke -self
vault token capabilities secret/data/orders/db
```

Revoking a token revokes its child tokens and the leases it created.

## Leases

Dynamic secrets (database credentials, cloud credentials) come with leases:

```bash
vault read database/creds/orders-readonly
# lease_id: database/creds/orders-readonly/abc123  lease_duration: 1h  renewable: true

vault lease renew database/creds/orders-readonly/abc123
vault lease revoke database/creds/orders-readonly/abc123
vault lease revoke -prefix database/creds/orders-readonly      # incident response: revoke all
```

Applications (or Vault Agent / Vault Secrets Operator) must renew leases before expiry and re-fetch credentials when the max TTL is reached. Keep TTLs short enough that leaked credentials expire quickly, long enough to avoid excessive churn.

## KV Version 2 Workflows

```bash
vault secrets enable -path=secret kv-v2

vault kv put -mount=secret orders/db username=orders password="$(openssl rand -base64 24)"
vault kv get -mount=secret orders/db
vault kv get -mount=secret -field=password orders/db
vault kv patch -mount=secret orders/db password="$(openssl rand -base64 24)"

vault kv metadata get -mount=secret orders/db             # versions, timestamps
vault kv rollback -mount=secret -version=2 orders/db
vault kv delete -mount=secret orders/db                   # soft delete latest version (undelete possible)
vault kv destroy -mount=secret -versions=1 orders/db      # permanently remove a version
vault kv metadata put -mount=secret -max-versions=10 orders/db
```

KV v2 API paths include `data/` and `metadata/`: policies must reference `secret/data/orders/*` for reading values and `secret/metadata/orders/*` for listing. The CLI hides this, which is a frequent source of "permission denied".

```hcl
path "secret/data/orders/*" {
  capabilities = ["read"]
}
path "secret/metadata/orders/*" {
  capabilities = ["list"]
}
```

Prefer dynamic secrets over static KV entries where an engine exists (databases, cloud IAM, PKI).

## Response Wrapping (Overview)

`-wrap-ttl=5m` returns a single-use wrapping token instead of the secret; the recipient unwraps it once. It protects secrets in transit through intermediaries (CI systems, orchestrators) and detects interception (unwrap fails if someone else used it). See `vault-basics.md` for details.

## HTTP API

```bash
curl -s --header "X-Vault-Token: $VAULT_TOKEN" \
  "$VAULT_ADDR/v1/secret/data/orders/db" | jq '.data.data'
```

All CLI operations map to `/v1/<path>`; use `vault <command> -output-curl-string` to see the equivalent API call.

## Common Pitfalls

| Pitfall | Fix |
|---------|-----|
| Using root token for applications | Auth methods with scoped policies |
| Long-lived static secrets everywhere | Dynamic secrets, short TTLs, rotation |
| Secret zero problem (AppRole Secret ID baked into images) | Platform identity auth (Kubernetes, cloud, OIDC) |
| Policies written for CLI paths on KV v2 | Include `data/` and `metadata/` |
| Leases never renewed | Vault Agent / VSO / SDK lease management |
| Dev server or HTTP in production | TLS, proper storage, unseal setup |

## Checklist

- [ ] Distribution and license chosen consciously (Community, Enterprise, HCP, OpenBao)
- [ ] Humans via OIDC/LDAP with MFA; workloads via platform identity
- [ ] Policies attached through groups/roles, least privilege, default deny
- [ ] Short TTLs; leases renewed and revocable by prefix
- [ ] KV v2 with version limits; dynamic secrets where possible
- [ ] Root token revoked after initial setup
