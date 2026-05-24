# Security and IAM

## IAM (Identity and Access Management)

### Compartments

```hcl
# Organize resources with a compartment hierarchy
resource "oci_identity_compartment" "root" {
  compartment_id = var.tenancy_ocid
  name           = "Production"
  description    = "Production workloads"
}

resource "oci_identity_compartment" "network" {
  compartment_id = oci_identity_compartment.root.id
  name           = "Network"
  description    = "Network infrastructure"
}

resource "oci_identity_compartment" "compute" {
  compartment_id = oci_identity_compartment.root.id
  name           = "Compute"
  description    = "Compute and container workloads"
}

resource "oci_identity_compartment" "database" {
  compartment_id = oci_identity_compartment.root.id
  name           = "Database"
  description    = "Database services"
}

resource "oci_identity_compartment" "security" {
  compartment_id = oci_identity_compartment.root.id
  name           = "Security"
  description    = "Security services (Vault, WAF)"
}
```

### Groups and Policies

```hcl
# Groups
resource "oci_identity_group" "network_admins" {
  compartment_id = var.tenancy_ocid
  name           = "Network-Admins"
  description    = "Network administrators"
}

resource "oci_identity_group" "db_admins" {
  compartment_id = var.tenancy_ocid
  name           = "DB-Admins"
  description    = "Database administrators"
}

resource "oci_identity_group" "devops" {
  compartment_id = var.tenancy_ocid
  name           = "DevOps"
  description    = "DevOps engineers"
}

resource "oci_identity_group" "auditors" {
  compartment_id = var.tenancy_ocid
  name           = "Auditors"
  description    = "Read-only auditors"
}

# Policies
resource "oci_identity_policy" "network_admin" {
  compartment_id = var.tenancy_ocid
  name           = "network-admin-policy"
  description    = "Network admin permissions"
  statements = [
    "Allow group Network-Admins to manage virtual-network-family in compartment Production",
    "Allow group Network-Admins to manage load-balancers in compartment Production",
    "Allow group Network-Admins to manage dns in tenancy",
    "Allow group Network-Admins to read all-resources in compartment Production",
  ]
}

resource "oci_identity_policy" "db_admin" {
  compartment_id = var.tenancy_ocid
  name           = "db-admin-policy"
  description    = "Database admin permissions"
  statements = [
    "Allow group DB-Admins to manage database-family in compartment Database",
    "Allow group DB-Admins to manage mysql-family in compartment Database",
    "Allow group DB-Admins to read virtual-network-family in compartment Network",
  ]
}

resource "oci_identity_policy" "devops" {
  compartment_id = var.tenancy_ocid
  name           = "devops-policy"
  description    = "DevOps service management"
  statements = [
    "Allow group DevOps to manage compute-family in compartment Compute",
    "Allow group DevOps to manage cluster-family in compartment Compute",
    "Allow group DevOps to manage object-family in compartment Production",
    "Allow group DevOps to use ons-topics in compartment Production",
    "Allow group DevOps to read virtual-network-family in compartment Network",
  ]
}

resource "oci_identity_policy" "auditor" {
  compartment_id = var.tenancy_ocid
  name           = "auditor-policy"
  description    = "Read-only audit access"
  statements = [
    "Allow group Auditors to read all-resources in tenancy",
    "Allow group Auditors to inspect work-requests in tenancy",
  ]
}
```

### Dynamic Groups

```hcl
# Dynamic groups for automated access
resource "oci_identity_dynamic_group" "oke_nodes" {
  compartment_id = var.tenancy_ocid
  name           = "OKE-Nodes"
  description    = "All OKE worker nodes"
  matching_rule  = "ALL {resource.type = 'oke-cluster', resource.compartment.id = '${oci_identity_compartment.compute.id}'}"
}

resource "oci_identity_dynamic_group" "compute_instances" {
  compartment_id = var.tenancy_ocid
  name           = "Compute-Instances"
  description    = "All compute instances in Production"
  matching_rule  = "ALL {instance.compartment.id = '${oci_identity_compartment.compute.id}', instance.state = 'RUNNING'}"
}

# Policy for dynamic group
resource "oci_identity_policy" "oke_policy" {
  compartment_id = var.tenancy_ocid
  name           = "oke-policy"
  description    = "OKE access to Container Registry and networking"
  statements = [
    "Allow dynamic-group OKE-Nodes to manage repos in compartment Compute",
    "Allow dynamic-group OKE-Nodes to read virtual-network-family in compartment Network",
    "Allow dynamic-group OKE-Nodes to use LB in compartment Network",
  ]
}
```

### Resource Principals

OCI supports resource principals for OKE workloads and Functions to authenticate to OCI services without storing API keys:

```yaml
# OKE workload identity
apiVersion: v1
kind: ServiceAccount
metadata:
  name: oci-connector
  annotations:
    oci.oraclecloud.com/principal-type: "instance_principal"
---
# Functions uses resource principal by default when configured
# fn config function-app oci-tenant $(oci iam tenancy get --query 'data.id')
```

## Vault (KMS)

```hcl
# Vault hierarchy: Vault → Key → Encrypted Data
resource "oci_kms_vault" "main" {
  compartment_id = oci_identity_compartment.security.id
  display_name   = "production-vault"
  vault_type     = "DEFAULT"  # or "VIRTUAL_PRIVATE"
}

# Encryption key
resource "oci_kms_key" "db_key" {
  compartment_id = oci_identity_compartment.security.id
  display_name   = "db-encryption-key"
  key_shape {
    algorithm = "AES"
    length    = 32
  }
  management_endpoint = oci_kms_vault.main.management_endpoint
}

# Key version rotation
resource "oci_kms_key_version" "db_key_v2" {
  key_id              = oci_kms_key.db_key.id
  management_endpoint = oci_kms_vault.main.management_endpoint
}

# Encrypting secrets
resource "oci_kms_encrypted_data" "db_pass" {
  crypto_endpoint  = oci_kms_vault.main.crypto_endpoint
  key_id           = oci_kms_key.db_key.id
  plaintext        = base64encode(var.db_password)
  associated_data  = { "service" = "atp", "env" = "production" }
}
```

## Cloud Guard

```hcl
resource "oci_cloud_guard_cloud_guard_configuration" "main" {
  compartment_id            = oci_identity_compartment.security.id
  reporting_region          = "us-ashburn-1"
  status                    = "ENABLED"
  self_manage_resources     = false
}

resource "oci_cloud_guard_target" "prod" {
  compartment_id    = oci_identity_compartment.security.id
  display_name      = "Production-Target"
  target_resource_type = "COMPARTMENT"
  target_resource_id   = oci_identity_compartment.root.id

  target_detector_recipes {
    detector_recipe_id = data.oci_cloud_guard_detector_recipes.cis_benchmark.detector_recipes[0].id
  }

  target_responder_recipes {
    responder_recipe_id = data.oci_cloud_guard_responder_recipes.default.responder_recipes[0].id
  }
}
```

## Security Zone

```hcl
resource "oci_cloud_guard_security_zone" "prod" {
  compartment_id                = oci_identity_compartment.security.id
  display_name                  = "Production-Security-Zone"
  description                   = "Security zone for production"

  security_zone_policy_id       = data.oci_cloud_guard_security_zone_policies.pci.policies[0].id

  inherited_by_compartments     = [oci_identity_compartment.root.id]
}
```

Security Zone enforces policies such as:
- Buckets cannot be public
- Block volumes must be encrypted
- VCNs must use security lists
- Instances cannot have public IPs

## WAF (Web Application Firewall)

```hcl
resource "oci_waa_web_app_acceleration" "waf" {
  compartment_id = oci_identity_compartment.security.id
  display_name   = "app-waf"
  backend_type   = "LOAD_BALANCER"
  load_balancer_id = oci_load_balancer.public.id
}

resource "oci_waa_web_app_acceleration_policy" "waf_policy" {
  compartment_id = oci_identity_compartment.security.id
  display_name   = "app-waf-policy"

  actions {
    type = "CHECK"
    # Block SQL injection, XSS, etc.
  }

  protection_capabilities {
    key                        = "SQL_INJECTION"
    version                    = 1
    action_name                = "BLOCK"
    collision_name             = "SQLI"
  }

  protection_capabilities {
    key     = "CROSS_SITE_SCRIPTING"
    version = 1
    action_name = "BLOCK"
  }

  request_access_control {
    default_action_name = "ALLOW"
    rules {
      action_name = "BLOCK"
      criteria {
        condition = "IP_EQUALS"
        value     = "203.0.113.0"
      }
    }
  }
}
```

## Network Firewall

```hcl
resource "oci_network_firewall_network_firewall" "nfw" {
  compartment_id     = oci_identity_compartment.security.id
  display_name       = "edge-firewall"
  subnet_id          = oci_core_subnet.public.id
  network_firewall_policy_id = oci_network_firewall_network_firewall_policy.policy.id
}

resource "oci_network_firewall_network_firewall_policy" "policy" {
  compartment_id = oci_identity_compartment.security.id
  display_name   = "default-policy"
}
```

## CLI Commands

```bash
# Create compartment
oci iam compartment create \
  --compartment-id ocid1.tenancy.oc1..example \
  --name Database --description "Database services"

# Create group
oci iam group create \
  --compartment-id ocid1.tenancy.oc1..example \
  --name DB-Admins --description "Database administrators"

# Create policy
oci iam policy create \
  --compartment-id ocid1.tenancy.oc1..example \
  --name db-admin-policy --description "DB admin" \
  --statements '["Allow group DB-Admins to manage database-family in compartment Database"]'

# Create dynamic group
oci iam dynamic-group create \
  --compartment-id ocid1.tenancy.oc1..example \
  --name OKE-Nodes \
  --matching-rule 'ALL {resource.type = "oke-cluster"}'

# Create Vault key
oci kms key create \
  --compartment-id ocid1.compartment.oc1..example \
  --display-name app-key \
  --key-shape '{"algorithm":"AES","length":32}' \
  --endpoint https://myvault-crypto.api.oracle.com

# Enable Cloud Guard
oci cloud-guard configuration update \
  --compartment-id ocid1.tenancy.oc1..example \
  --reporting-region us-ashburn-1 \
  --status ENABLED

# List WAF policies
oci waa web-app-acceleration-policy list \
  --compartment-id ocid1.compartment.oc1..example
```

## Security Best Practices

- Use least-privilege policies with compartment-level scoping
- Enable Cloud Guard with CIS Benchmark detector recipe
- Use Security Zone to enforce compliance policies
- Rotate API keys every 90 days and use instance principals where possible
- Encrypt all data at rest with Vault-managed keys
- Enable VCN flow logs and ship to Object Storage for analysis
- Use WAF for all public-facing applications
- Implement network firewalls for east-west traffic inspection
- Enable audit logging for all IAM changes
- Use resource principals over API keys for service-to-service auth
- Tag resources with security classification (public, internal, confidential)
