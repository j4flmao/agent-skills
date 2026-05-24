# Secrets in GitOps

Managing secrets in GitOps requires balancing declarative Git storage with security best practices. Several approaches solve this challenge.

## SealedSecrets

Bitnami SealedSecrets encrypt Secrets into SealedSecret CRDs that can safely be stored in Git:

```yaml
apiVersion: bitnami.com/v1alpha1
kind: SealedSecret
metadata:
  name: db-credentials
  namespace: production
spec:
  encryptedData:
    username: AgBy3i4OJSWK+... (encrypted base64)
    password: AgBf8kL2pXRm+... (encrypted base64)
  template:
    metadata:
      labels:
        app: myapp
    type: Opaque
```

### Workflow

```bash
# Encrypt a secret (offline, no cluster needed)
kubeseal --cert mycert.pem --format yaml < secret.yaml > sealed-secret.yaml

# Encrypt raw value
echo -n "my-password" | kubeseal --raw --from-file=/dev/stdin \
  --scope namespace-wide --namespace production

# Decrypt (requires cluster access)
kubeseal --re-encrypt < sealed-secret.yaml
```

### Scopes

| Scope | Behavior |
|-------|----------|
| `strict` | Bound to name + namespace |
| `namespace-wide` | Bound to namespace only |
| `cluster-wide` | Can be used anywhere |

## External Secrets Operator (ESO)

Syncs secrets from external providers (AWS Secrets Manager, GCP Secret Manager, Azure Key Vault, HashiCorp Vault):

```yaml
apiVersion: external-secrets.io/v1beta1
kind: SecretStore
metadata:
  name: aws-secrets-store
spec:
  provider:
    aws:
      service: SecretsManager
      region: us-east-1
      auth:
        jwt:
          serviceAccountRef:
            name: external-secrets-sa
---
apiVersion: external-secrets.io/v1beta1
kind: ExternalSecret
metadata:
  name: db-credentials
spec:
  refreshInterval: 1h
  secretStoreRef:
    name: aws-secrets-store
    kind: SecretStore
  target:
    name: db-credentials
    creationPolicy: Owner
  data:
    - secretKey: username
      remoteRef:
        key: /production/db/credentials
        property: username
    - secretKey: password
      remoteRef:
        key: /production/db/credentials
        property: password
```

### ClusterSecretStore

```yaml
apiVersion: external-secrets.io/v1beta1
kind: ClusterSecretStore
metadata:
  name: vault-global
spec:
  provider:
    vault:
      server: https://vault.example.com
      path: secret
      version: v2
      auth:
        kubernetes:
          mountPath: kubernetes
          role: external-secrets
          serviceAccountRef:
            name: eso-sa
            namespace: external-secrets
```

## SOPS + Age

Mozilla SOPS encrypts individual values in YAML/JSON files:

```bash
# Generate age key
age-keygen -o age.key

# Encrypt with age
sops --encrypt --age age1... secrets.yaml > secrets.enc.yaml
```

```yaml
# secrets.enc.yaml
db_password: ENC[AES256_GCM,data:xyz...,iv:abc...,tag:def...]
api_key: ENC[AES256_GCM,data:123...,iv:456...,tag:789...]
sops:
  age:
    - recipient: age1abc...
      enc: |
        -----BEGIN AGE ENCRYPTED FILE-----
        ...
        -----END AGE ENCRYPTED FILE-----
  lastmodified: "2026-05-24T10:00:00Z"
  mac: ENC[AES256_GCM,data:...]
```

Integrate with ArgoCD using `argocd-vault-plugin`:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: myapp
spec:
  source:
    plugin:
      name: argocd-vault-plugin
      env:
        - name: AVP_TYPE
          value: sops
        - name: AVP_SOPS_FILE
          value: age.key
```

## Vault Agent Sidecar

Inject secrets via Vault Agent running as a sidecar:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    metadata:
      annotations:
        vault.hashicorp.com/agent-inject: "true"
        vault.hashicorp.com/role: myapp
        vault.hashicorp.com/agent-inject-secret-db: "secret/data/db"
        vault.hashicorp.com/agent-inject-template-db: |
          {{- with secret "secret/data/db" -}}
          export DB_USERNAME="{{ .Data.data.username }}"
          export DB_PASSWORD="{{ .Data.data.password }}"
          {{- end -}}
    spec:
      serviceAccountName: myapp
      containers:
        - name: myapp
          image: myapp:latest
          env:
            - name: VAULT_ADDR
              value: https://vault.example.com
```

## CSI Driver

Use Secrets Store CSI Driver for volume-mounted secrets:

```yaml
apiVersion: secrets-store.csi.x-k8s.io/v1
kind: SecretProviderClass
metadata:
  name: aws-secrets
spec:
  provider: aws
  parameters:
    objects: |
      - objectName: "db-password"
        objectType: "secretsmanager"
        jmesPath:
          - path: password
            objectAlias: db-password
  secretObjects:
    - secretName: db-credentials
      type: Opaque
      data:
        - objectName: db-password
          key: password
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: myapp
spec:
  template:
    spec:
      containers:
        - name: myapp
          volumeMounts:
            - name: secrets
              mountPath: /mnt/secrets
              readOnly: true
      volumes:
        - name: secrets
          csi:
            driver: secrets-store.csi.k8s.io
            readOnly: true
            volumeAttributes:
              secretProviderClass: "aws-secrets"
```

## Comparison

| Method | Git Safety | Dynamic Rotation | Provider Dependency | Complexity |
|--------|-----------|-----------------|-------------------|------------|
| SealedSecrets | High | No | No (encryption key) | Low |
| External Secrets Operator | High | Yes | Yes (external provider) | Medium |
| SOPS + Age | High | No | No (encryption key) | Medium |
| Vault Sidecar | N/A (not in Git) | Yes | Yes (Vault) | High |
| CSI Driver | N/A (not in Git) | Yes | Yes (provider) | High |

Choose based on security requirements, operational complexity tolerance, and whether dynamic rotation is needed.
