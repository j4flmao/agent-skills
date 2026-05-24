# Zero Trust Access Proxy

## Overview

Zero Trust access proxies replace traditional VPNs with identity-aware gateways that authenticate, authorize, and encrypt every connection at the application layer.

## Pomerium

Pomerium is an identity-aware proxy that provides access to internal applications based on identity, device, and context.

### Architecture
```
User → Browser → Internet → Pomerium Proxy → Internal App
         ↓                         ↓
    Identity Provider          Policy Engine
    (OIDC/OAuth)          (Route Policies + Context)
```

### Route Configuration
```yaml
# config.yaml
authenticate_service_url: https://authenticate.corp.example.com

routes:
  - from: https://dashboard.corp.example.com
    to: http://dashboard.internal:8080
    policy:
      - allowed_users:
          - alice@example.com
          - bob@example.com
      - allowed_domains:
          - example.com
    pass_identity_headers: true
    tls_custom_ca: /etc/ssl/internal-ca.pem

  - from: https://admin.corp.example.com
    to: https://admin.internal:8443
    timeout: 30s
    policy:
      - allowed_groups:
          - admin@example.com
      - require_reauth: true
    insecure_server_tls: false

  - from: https://api.corp.example.com
    to: http://api.internal:3000
    policy:
      - allowed_domains:
          - example.com
      - allow_public_unauthenticated: false
    cors:
      allowed_origins:
        - https://app.corp.example.com
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: pomerium
  namespace: pomerium
spec:
  replicas: 2
  selector:
    matchLabels:
      app: pomerium
  template:
    metadata:
      labels:
        app: pomerium
    spec:
      containers:
      - image: pomerium/pomerium:latest
        name: pomerium
        env:
        - name: IDP_PROVIDER
          value: google
        - name: IDP_CLIENT_ID
          valueFrom:
            secretKeyRef:
              name: pomerium-idp
              key: client-id
        - name: IDP_CLIENT_SECRET
          valueFrom:
            secretKeyRef:
              name: pomerium-idp
              key: client-secret
        ports:
        - containerPort: 443
          name: https
---
apiVersion: policy/v1
kind: PodDisruptionBudget
metadata:
  name: pomerium-pdb
  namespace: pomerium
spec:
  minAvailable: 1
  selector:
    matchLabels:
      app: pomerium
```

## Teleport

Teleport provides SSH, Kubernetes, and database access through a single identity-aware proxy.

### Architecture
```
User → Teleport Client → Teleport Proxy → Teleport Node/Service
         ↓                    ↓
    Teleport Auth        Identity Provider
    (Certificate)        (GitHub, OIDC, SAML)
```

### Roles and Access Configuration
```yaml
# teleport-role.yaml
kind: role
metadata:
  name: developer
spec:
  allow:
    logins: [dev, ubuntu, ec2-user]
    node_labels:
      environment: staging
      'env': staging
    kubernetes_groups: [view, edit]
    kubernetes_labels:
      'app': '*-dev'
    db_names: [staging_*]
    db_users: [reader]
    rules:
    - resources: [session]
      verbs: [list, read]
  deny:
    logins: [root]
    node_labels:
      'environment': production
---
kind: role
metadata:
  name: devops-oncall
spec:
  allow:
    logins: [root, admin, ubuntu]
    node_labels:
      'environment': production
    kubernetes_groups: [admin]
    db_names: [production_*]
    db_users: [admin, dba]
    rules:
    - resources: [session, event, cluster_auth]
      verbs: [list, read, update]
  options:
    max_session_ttl: 4h
    client_idle_timeout: 15m
    disconnect_expired_cert: true
    forward_agent: false
    record_session:
      default: "record"
```

### Database Access Configuration
```yaml
# teleport-database.yaml
kind: db
metadata:
  name: production-pgsql
spec:
  protocol: postgres
  uri: postgres-internal.corp:5432
  tls:
    ca_cert_file: /etc/teleport/rds-ca.pem
    server_name: "*.rds.amazonaws.com"
  dynamic_labels:
    environment:
      - command: ["/usr/bin/aws", "rds", "describe-db-instances", "--db-instance-identifier", "production"]
        period: 1h
```

## Cloudflare Tunnel (Argo Tunnel)

### Architecture
```
User → Cloudflare Edge → Connection to Cloudflare → cloudflared → Origin Server
         ↓                                          ↓
    Cloudflare Access                           Outbound-only
    (Identity proxy)                           (no public IP)
```

### Configuration
```yaml
# config.yml
tunnel: my-tunnel
credentials-file: /etc/cloudflared/credentials.json

ingress:
  - hostname: app.example.com
    service: http://localhost:8080
    originRequest:
      connectTimeout: 30s
      tlsTimeout: 30s

  - hostname: grafana.example.com
    service: http://localhost:3000

  # Catch-all: 404 for unmapped hosts
  - service: http_status:404
```

### Kubernetes Sidecar Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: app-with-tunnel
spec:
  template:
    spec:
      containers:
      - name: app
        image: my-app:latest
      - name: cloudflared
        image: cloudflare/cloudflared:latest
        args:
        - tunnel
        - --config
        - /etc/cloudflared/config.yml
        - run
        volumeMounts:
        - name: tunnel-config
          mountPath: /etc/cloudflared
```

## Tailscale — WireGuard-Based Mesh VPN

### Architecture
```
User → Tailscale Node → Tailscale DERP → Tailscale Node
                    (WireGuard Mesh)
         ↓
    Tailscale Control Server
    (Auth, key exchange, ACLs)
```

### ACL Configuration
```json
{
  "acls": [
    {"action": "accept", "src": ["aut group:engineering"], "dst": ["tag:dev-server:*"]},
    {"action": "accept", "src": ["aut group:devops"], "dst": ["tag:production:*"]},
    {"action": "accept", "src": ["aut group:devops"], "dst": ["tag:production:*:ssh"]},
  ],
  "groups": {
    "group:engineering": ["alice@example.com", "bob@example.com"],
    "group:devops": ["devops-team@example.com"]
  },
  "tagOwners": {
    "tag:dev-server": ["aut group:engineering"],
    "tag:production": ["aut group:devops"]
  },
  "ssh": [
    {
      "action": "accept",
      "src": ["aut group:engineering"],
      "dst": ["aut group:devops"],
      "users": ["ubuntu", "root"]
    }
  ]
}
```

## Comparison Matrix

| Feature | Pomerium | Teleport | Cloudflare Tunnel | Tailscale |
|---------|----------|----------|-------------------|-----------|
| HTTP apps | Yes | Yes (via proxy) | Yes | Via node |
| SSH access | No | Native | Yes (SSH audit) | Native |
| K8s access | Via Ingress | Native | Via cloudflared | Via tunnel |
| Database | No | Native | No | No |
| Device posture | Custom | Built-in | Cloudflare Gateway | Built-in |
| Deployment | Self-hosted/Cloud | Self-hosted/Cloud | Cloud | Self-hosted/Cloud |
| Pricing | Open source + Enterprise | Open source + Enterprise | Usage-based | Freemium |
| Network model | Reverse proxy | Reverse proxy | Reverse proxy | Mesh VPN |
