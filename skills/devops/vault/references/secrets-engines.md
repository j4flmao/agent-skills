# Secrets Engines

## KV v2 (Key-Value)

```bash
# Enable
vault secrets enable -path=secret -version=2 kv

# CRUD
vault kv put secret/app/config key=value
vault kv get secret/app/config
vault kv get -version=2 secret/app/config
vault kv delete secret/app/config
vault kv undelete -versions=2 secret/app/config
vault kv destroy -versions=2 secret/app/config

# Metadata
vault kv metadata get secret/app/config
vault kv metadata put -max-versions=10 secret/app/config

# Patch (partial update)
vault kv patch secret/app/config new_key=new_value
```

## Database Engine (Dynamic Credentials)

```bash
# PostgreSQL
vault secrets enable database
vault write database/config/postgres \
  plugin_name=postgresql-database-plugin \
  allowed_roles="*" \
  connection_url="postgresql://{{username}}:{{password}}@postgres:5432"
  username="admin" password="adminpass"

# MySQL
vault write database/config/mysql \
  plugin_name=mysql-database-plugin \
  allowed_roles="*" \
  connection_url="{{username}}:{{password}}@tcp(mysql:3306)/" \
  username="admin" password="adminpass"

# MongoDB
vault write database/config/mongo \
  plugin_name=mongodb-database-plugin \
  allowed_roles="*" \
  connection_url="mongodb://{{username}}:{{password}}@mongo:27017/admin" \
  username="admin" password="adminpass"

# Static role (fixed credentials that rotate)
vault write database/static-roles/my-static-role \
  db_name=postgres \
  username="app-user" \
  rotation_statements="ALTER USER \"{{name}}\" WITH PASSWORD '{{password}}';" \
  rotation_period="24h"
```

## PKI Engine (Certificates)

```bash
# Enable and generate root CA
vault secrets enable pki
vault secrets tune -max-lease-ttl=87600h pki  # 10 years

vault write pki/root/generate/internal \
  common_name=example.com \
  ttl=87600h

# Configure URLs
vault write pki/config/urls \
  issuing_certificates="https://vault.example.com/v1/pki/ca" \
  crl_distribution_points="https://vault.example.com/v1/pki/crl"

# Create intermediate CA
vault secrets enable -path=pki_int pki
vault secrets tune -max-lease-ttl=43800h pki_int

vault write pki_int/intermediate/generate/internal \
  common_name="example.com Intermediate Authority"
vault write pki/root/sign-intermediate \
  csr=@/tmp/intermediate.csr \
  format=pem_bundle ttl=43800h
vault write pki_int/intermediate/set-signed certificate=@/tmp/cert.pem

# Create role for issuing certs
vault write pki_int/roles/example-dot-com \
  allowed_domains=example.com \
  allow_subdomains=true \
  max_ttl=720h \
  key_type=rsa \
  key_bits=2048

# Issue certificate
vault write pki_int/issue/example-dot-com \
  common_name=app.example.com \
  ttl=24h
```

## Transit Engine (Encryption as a Service)

```bash
# Enable
vault secrets enable transit

# Create key
vault write -f transit/keys/my-key
vault write transit/keys/my-key type=rsa-2048  # RSA key
vault write transit/keys/my-key type=ecdsa-p256  # ECDSA key

# Encrypt
vault write transit/encrypt/my-key plaintext=$(echo "secret data" | base64)

# Decrypt
vault write transit/decrypt/my-key ciphertext=<ciphertext>

# Sign / Verify
vault write transit/sign/my-key input=$(echo "message" | base64)
vault write transit/verify/my-key \
  signature=<signature> \
  input=$(echo "message" | base64)

# Key rotation
vault write -f transit/keys/my-key/rotate
vault write transit/rewrap/my-key ciphertext=<ciphertext>  # Re-encrypt with latest key
```

## AWS Engine

```bash
vault secrets enable aws

# Configure
vault write aws/config/root \
  access_key=AKIA... \
  secret_key=... \
  region=us-east-1

# IAM user role
vault write aws/roles/deploy \
  credential_type=iam_user \
  policy_arns=arn:aws:iam::aws:policy/AmazonS3ReadOnlyAccess

# STS role
vault write aws/roles/deploy-sts \
  credential_type=assumed_role \
  role_arns=arn:aws:iam::123456789012:role/DeployRole

# Get credentials
vault read aws/creds/deploy
vault read aws/sts/deploy-sts ttl=30m
```

## Engine Selection

| Engine | Use case |
|--------|----------|
| KV v2 | Static secrets (API keys, config) |
| Database | Dynamic DB credentials per session |
| PKI | Automatic certificate issuance and renewal |
| Transit | Encryption without exposing keys to applications |
| AWS | Dynamic AWS IAM/STS credentials |
| SSH | One-time SSH password or signed certs |
| TOTP | Time-based OTP for MFA |
| Consul | Consul ACL token management |
