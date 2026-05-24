# Network Microsegmentation

## Overview

Microsegmentation breaks networks into isolated segments at the workload level, enabling granular security policies based on identity rather than IP addresses.

## Cilium — Kubernetes-Native Microsegmentation

Cilium uses eBPF for high-performance network policy enforcement in Kubernetes.

### Architecture
```
Pod A → Cilium Agent (eBPF) → Policy Check → Pod B
           ↓
    Cilium Operator
           ↓
    Kubernetes API Server (CRD: CiliumNetworkPolicy)
```

### Network Policy Example
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: frontend-to-backend
spec:
  endpointSelector:
    matchLabels:
      app: frontend
  ingress:
  - fromEndpoints:
    - matchLabels:
        role: api-server
    toPorts:
    - ports:
      - port: "8080"
        protocol: TCP
  egress:
  - toEndpoints:
    - matchLabels:
        app: backend
    toPorts:
    - ports:
      - port: "6379"
        protocol: TCP
```

### L7 Policy (HTTP-aware)
```yaml
apiVersion: cilium.io/v2
kind: CiliumNetworkPolicy
metadata:
  name: api-rate-limit
spec:
  endpointSelector:
    matchLabels:
      app: api-gateway
  ingress:
  - fromEndpoints:
    - matchLabels:
        app: frontend
    toPorts:
    - ports:
      - port: "443"
    rules:
      http:
      - method: "POST"
        path: "/api/v1/orders"
        headers:
        - "X-API-Version: 1"
```

### Hubble — Visibility Layer
- Flow logs for all allowed/denied connections
- Service dependency graph auto-generated
- Real-time monitoring and alerting
- Integration with Prometheus and Grafana

## Calico — Multi-Cloud Microsegmentation

Calico extends microsegmentation across Kubernetes, VMs, and bare metal.

### Global Network Policy
```yaml
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: security-default-deny
spec:
  selector: all()
  ingress:
  - action: Deny
  egress:
  - action: Deny
---
apiVersion: projectcalico.org/v3
kind: GlobalNetworkPolicy
metadata:
  name: allow-dns
spec:
  selector: all()
  egress:
  - action: Allow
    protocol: UDP
    destination:
      ports:
      - 53
      namespaceSelector: kube-system
```

### Calico Network Sets
```yaml
apiVersion: projectcalico.org/v3
kind: NetworkSet
metadata:
  name: database-servers
  namespace: production
spec:
  nets:
  - 10.0.1.0/24
  - 10.0.2.0/24
---
apiVersion: projectcalico.org/v3
kind: NetworkPolicy
metadata:
  name: allow-app-to-db
  namespace: production
spec:
  selector: app == 'application'
  egress:
  - action: Allow
    destination:
      namespaceSelector: production
      selector: role == 'database'
    ports:
    - 5432
```

## Illumio — Workload-Level Segmentation (VM/Bare Metal)

Illumio uses labels and workload identity for segmentation across heterogeneous infrastructure.

### Illumio Policy Model
```
Workload (app=web, env=prod, role=frontend)
           ↓
    Illumio VEN (Virtual Enforcement Node)
           ↓
    Policy Compute Engine → Label-based Policies
           ↓
    Enforcement: Windows Filtering Platform, iptables, nftables
```

### Policy Example
```json
{
  "rules": [
    {
      "consumers": {
        "labels": {"app": "web", "role": "frontend"}
      },
      "providers": {
        "labels": {"app": "api", "role": "backend"}
      },
      "ingress_services": [
        {"port": 443, "protocol": "tcp"}
      ],
      "sec_connect": true
    }
  ]
}
```

## Service-to-Service mTLS

### Istio mTLS Configuration
```yaml
apiVersion: security.istio.io/v1beta1
kind: PeerAuthentication
metadata:
  name: default
  namespace: istio-system
spec:
  mtls:
    mode: STRICT
---
apiVersion: security.istio.io/v1beta1
kind: AuthorizationPolicy
metadata:
  name: backend-policy
  namespace: prod
spec:
  selector:
    matchLabels:
      app: backend
  rules:
  - from:
    - source:
        principals: ["cluster.local/ns/prod/sa/frontend"]
    to:
    - operation:
        methods: ["GET", "POST"]
        paths: ["/api/v1/*"]
```

### Workload Identity Federation

**AWS (IRSA — IAM Roles for Service Accounts):**
```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: payment-service
  annotations:
    eks.amazonaws.com/role-arn: arn:aws:iam::123456789:role/payment-role
```

**Azure AD Pod Identity:**
```yaml
apiVersion: aadpodidentity.k8s.io/v1
kind: AzureIdentity
metadata:
  name: payment-identity
spec:
  type: 0
  resourceID: /subscriptions/.../Microsoft.ManagedIdentity/payment-id
  clientID: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
```

## API-Based Segmentation

### Security Group Tags
```hcl
resource "aws_security_group" "app_sg" {
  tags = {
    Name = "app-tier"
    Role = "application"
    Environment = "production"
    Compliance = "PCI"
  }
}

resource "aws_security_group_rule" "web_to_app" {
  type = "ingress"
  from_port = 8443
  to_port = 8443
  protocol = "tcp"
  source_security_group_id = aws_security_group.web_sg.id
  description = "Web tier to app tier"
}
```

### Azure NSG with Application Security Groups
```hcl
resource "azurerm_application_security_group" "web_asg" {
  name = "web-tier"
  location = azurerm_resource_group.main.location
  resource_group_name = azurerm_resource_group.main.name
  tags = { Role = "web" }
}

resource "azurerm_network_security_rule" "allow_web_to_api" {
  name = "AllowWebToAPI"
  priority = 100
  direction = "Inbound"
  access = "Allow"
  protocol = "Tcp"
  source_port_range = "*"
  destination_port_range = "443"
  source_application_security_group_ids = [azurerm_application_security_group.web_asg.id]
  destination_application_security_group_ids = [azurerm_application_security_group.api_asg.id]
}
```

## Monitoring Microsegmentation

### Key Metrics
| Metric | What it measures | Alert threshold |
|--------|------------------|-----------------|
| Policy violations/sec | Blocked traffic count | > 100/min |
| Policy coverage % | Workloads with policy | < 95% |
| Policy drift | Unmanaged connections | Any |
| Denied connections by label | Anomaly detection | Baseline + 3σ |

### Common Tools
- **Cilium Hubble**: Flow visualization, service graph, metrics
- **Calico Cloud**: Policy recommendation, compliance reports
- **Tigera Secure**: Kubernetes security platform
- **Aviatrix**: Distributed cloud firewall
