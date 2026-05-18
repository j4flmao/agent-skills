# Vault Integration

## Kubernetes Sidecar Injector

```yaml
# Annotations on pod template
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
  annotations:
    vault.hashicorp.com/agent-inject: "true"
    vault.hashicorp.com/role: "my-app"
    vault.hashicorp.com/agent-inject-secret-config: "secret/data/myapp/config"
    vault.hashicorp.com/agent-inject-template-config: |
      {{- with secret "secret/data/myapp/config" -}}
      export DB_URL="{{ .Data.data.db_url }}"
      export API_KEY="{{ .Data.data.api_key }}"
      {{- end -}}
    vault.hashicorp.com/agent-inject-file-config: ".env"
    vault.hashicorp.com/agent-inject-perms-config: "0600"
    vault.hashicorp.com/agent-pre-populate: "true"
    vault.hashicorp.com/agent-pre-populate-only: "false"
spec:
  template:
    metadata:
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: "my-app"
    spec:
      serviceAccountName: my-app
      containers:
        - name: app
          image: my-app:latest
          env:
            - name: VAULT_ADDR
              value: http://vault:8200
```

## Vault CSI Provider

```yaml
# StorageClass with CSI
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: vault-csi
provisioner: secrets-store.csi.k8s.io
parameters:
  provider: vault
---
# Volume that mounts secrets
apiVersion: v1
kind: Pod
metadata:
  name: my-app
spec:
  serviceAccountName: my-app
  containers:
    - name: app
      image: my-app:latest
      volumeMounts:
        - name: secrets
          mountPath: "/etc/secrets"
          readOnly: true
  volumes:
    - name: secrets
      csi:
        driver: secrets-store.csi.k8s.io
        readOnly: true
        volumeAttributes:
          secretProviderClass: "vault-secrets"
```

## Terraform Provider

```hcl
provider "vault" {
  address = "https://vault.example.com:8200"
  token   = var.vault_token
}

# KV v2 secrets
resource "vault_mount" "kv" {
  path      = "secret"
  type      = "kv-v2"
  options = {
    version = "2"
  }
}

resource "vault_kv_secret_v2" "config" {
  mount = vault_mount.kv.path
  name  = "myapp/config"
  data_json = jsonencode({
    db_url  = "postgres://${var.db_user}:${var.db_pass}@db:5432/app"
    api_key = var.api_key
  })
}

resource "vault_policy" "developer" {
  name   = "developer"
  policy = file("policies/developer.hcl")
}

resource "vault_kubernetes_auth_backend_role" "my_app" {
  backend                          = vault_auth_backend.kubernetes.path
  role_name                        = "my-app"
  bound_service_account_names      = ["my-app"]
  bound_service_account_namespaces = ["default"]
  token_policies                   = ["developer"]
  token_ttl                        = 3600
}
```

## Vault Agent (Sidecar Mode)

```hcl
# agent-config.hcl
pid_file = "/tmp/agent.pid"

vault {
  address = "https://vault.example.com:8200"
}

auto_auth {
  method "kubernetes" {
    mount_path = "auth/kubernetes"
    config = {
      role = "my-app"
    }
  }

  sink "file" {
    config = {
      path = "/tmp/vault-token"
    }
  }
}

template {
  destination = "/etc/secrets/.env"
  contents = <<EOH
{{- with secret "secret/data/myapp/config" -}}
DB_URL={{ .Data.data.db_url }}
API_KEY={{ .Data.data.api_key }}
{{- end -}}
{{- with secret "database/creds/my-role" -}}
DB_USER={{ .Data.username }}
DB_PASS={{ .Data.password }}
{{- end -}}
EOH
}
```

## CI/CD Integration

```yaml
# GitHub Actions with Vault
jobs:
  deploy:
    steps:
      - name: Authenticate to Vault
        id: vault-auth
        run: |
          VAULT_TOKEN=$(vault write -field=token auth/jwt/login \
            role=ci-role \
            jwt=${{ env.ID_TOKEN }})
          echo "vault-token=$VAULT_TOKEN" >> $GITHUB_OUTPUT

      - name: Read secrets
        env:
          VAULT_TOKEN: ${{ steps.vault-auth.outputs.vault-token }}
        run: |
          vault kv get -field=db_url secret/ci/config > .env
```

## SDK Examples

```python
# Python
import hvac
client = hvac.Client(url='https://vault.example.com:8200', token='...')
secret = client.secrets.kv.v2.read_secret_version(
    path='myapp/config', mount_point='secret')
db_url = secret['data']['data']['db_url']
```

```go
// Go
import "github.com/hashicorp/vault/api"
client, _ := api.NewClient(&api.Config{Address: "https://vault:8200"})
client.SetToken("...")
secret, _ := client.Logical().Read("secret/data/myapp/config")
dbURL := secret.Data["data"].(map[string]interface{})["db_url"]
```
