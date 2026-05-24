# Core Services

## VCN (Virtual Cloud Network)

```hcl
# VCN with dual-stack and DNS resolver
resource "oci_core_vcn" "main" {
  compartment_id = var.compartment_ocid
  display_name   = "production-vcn"
  cidr_blocks    = ["10.0.0.0/16", "fd00::/48"]
  dns_label      = "prod"
  is_ipv6enabled = true
}

resource "oci_core_internet_gateway" "ig" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "internet-gateway"
}

resource "oci_core_nat_gateway" "ng" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "nat-gateway"
}

resource "oci_core_service_gateway" "sg" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "service-gateway"
  services {
    service_id = data.oci_core_services.all_services.services[0].id
  }
}

# Local peering gateway (LPG) for cross-VCN in same region
resource "oci_core_local_peering_gateway" "lpg" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "lpg-to-shared"
}
```

## Route Tables and Security Lists

```hcl
resource "oci_core_route_table" "public" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "public-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.ig.id
  }
}

resource "oci_core_route_table" "private" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "private-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_nat_gateway.ng.id
  }
  route_rules {
    destination       = "all-services-in-oracle-services-network"
    destination_type  = "SERVICE_CIDR_BLOCK"
    network_entity_id = oci_core_service_gateway.sg.id
  }
}

resource "oci_core_security_list" "public" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "public-sl"

  egress_security_rules {
    destination = "0.0.0.0/0"
    protocol    = "all"
  }

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options {
      destination_port_range {
        min = 80
        max = 80
      }
    }
  }
  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options {
      destination_port_range {
        min = 443
        max = 443
      }
    }
  }
}
```

## Compute (VM and Bare Metal)

```hcl
# VM instance with flexible shape
resource "oci_core_instance" "app" {
  compartment_id      = var.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "app-server-0"
  shape               = "VM.Standard.E4.Flex"

  shape_config {
    ocpus         = 4
    memory_in_gbs = 64
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.private.id
    assign_public_ip = false
    display_name     = "primary-vnic"
  }

  source_details {
    source_id   = data.oci_core_images.ubuntu.images[0].id
    source_type = "image"
    boot_volume_size_in_gbs = 50
  }

  metadata = {
    ssh_authorized_keys = file("~/.ssh/id_rsa.pub")
  }

  agent_config {
    is_monitoring_disabled = false
    is_management_disabled = false
  }

  availability_config {
    is_live_migration_preferred = true
    recovery_action             = "RESTORE_INSTANCE"
  }
}

# Bare metal instance
resource "oci_core_instance" "bm" {
  compartment_id      = var.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "bm-database"
  shape               = "BM.Standard.E4.128"

  source_details {
    source_id   = data.oci_core_images.ol8.images[0].id
    source_type = "image"
  }
}
```

## Block and Object Storage

```hcl
# Block volume with backups
resource "oci_core_volume" "data" {
  compartment_id      = var.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "app-data-volume"
  size_in_gbs         = 200
  vpus_per_gb         = 20  # Higher performance tier

  backup_policy_id = data.oci_core_volume_backup_policies.bronze.id
}

resource "oci_core_volume_attachment" "data" {
  attachment_type = "paravirtualized"
  instance_id     = oci_core_instance.app.id
  volume_id       = oci_core_volume.data.id
  device          = "/dev/oracleoci/oraclevdb"
}

# Object storage bucket
resource "oci_objectstorage_bucket" "assets" {
  compartment_id  = var.compartment_ocid
  namespace       = data.oci_objectstorage_namespace.ns.namespace
  name            = "app-assets-prod"
  access_type     = "NoPublicAccess"
  storage_tier    = "Standard"
  object_events_enabled = true
  versioning      = "Enabled"

  retention_rules {
    display_name = "default-retention"
    duration {
      time_amount = 365
      time_unit   = "DAYS"
    }
  }
}
```

## Load Balancer

```hcl
resource "oci_load_balancer" "public" {
  compartment_id = var.compartment_ocid
  display_name   = "public-lb"
  shape          = "flexible"
  shape_details {
    minimum_bandwidth_in_mbps = 10
    maximum_bandwidth_in_mbps = 100
  }
  subnet_ids = [oci_core_subnet.public.id]
  is_private = false
}

# Backend set with health check
resource "oci_load_balancer_backendset" "web" {
  load_balancer_id = oci_load_balancer.public.id
  name             = "web-backends"
  policy           = "ROUND_ROBIN"

  health_checker {
    protocol    = "HTTP"
    port        = 80
    url_path    = "/health"
    interval_ms = 10000
    retries     = 3
    return_code = 200
  }

  backend {
    ip_address = oci_core_instance.app.private_ip
    port       = 80
    backup     = false
    drain      = false
    offline    = false
    weight     = 1
  }
}
```

## Vault (KMS)

```hcl
resource "oci_kms_vault" "main" {
  compartment_id = var.compartment_ocid
  display_name   = "main-vault"
  vault_type     = "DEFAULT"
}

resource "oci_kms_key" "app" {
  compartment_id = var.compartment_ocid
  display_name   = "app-key"
  key_shape {
    algorithm = "AES"
    length    = 32
  }
  management_endpoint = oci_kms_vault.main.management_endpoint
}

# Encrypt sensitive data using the key
resource "oci_kms_encrypted_data" "secret" {
  crypto_endpoint      = oci_kms_vault.main.crypto_endpoint
  key_id               = oci_kms_key.app.id
  plaintext            = base64encode(var.db_password)
  associated_data = {
    "environment" = "production"
  }
}
```

## CLI Commands

```bash
# List compute instances
oci compute instance list --compartment-id ocid1.compartment.oc1..example

# Create bucket
oci os bucket create --compartment-id ocid1.compartment.oc1..example \
  --name app-assets --namespace mynamespace

# Create VCN
oci network vcn create --compartment-id ocid1.compartment.oc1..example \
  --cidr-block "10.0.0.0/16" --display-name production-vcn

# Create block volume backup
oci bv backup create --volume-id ocid1.volume.oc1..example \
  --display-name weekly-backup

# List load balancers
oci lb load-balancer list --compartment-id ocid1.compartment.oc1..example

# Create Vault key
oci kms key create --compartment-id ocid1.compartment.oc1..example \
  --display-name app-key --key-shape '{"algorithm":"AES","length":32}'
  --endpoint https://myvault-crypto.api.oracle.com
```

## Architecture Patterns

| Pattern | Services | Use Case |
|---------|----------|----------|
| Three-tier web app | LB → compute → DB | Traditional web applications |
| Microservices on OKE | OKE + Service Mesh | Containerized workloads |
| Data lake | Object Storage + Data Flow | Analytics, ML pipelines |
| Hub-and-spoke VCN | DRG + LPG + VCN | Multi-VPC, shared services |
| DR with Data Guard | ADG + GGS | Cross-region database DR |
| Serverless EDA | Functions + Streaming + SCH | Event-driven architectures |

## Best Practices

- Use service gateway for OCI service access (no NAT needed for Object Storage, etc.)
- Enable VCN flow logs for network traffic monitoring
- Use instance principals for OCI API access from compute instances
- Attach block volumes instead of using instance store for data persistence
- Use flexible shapes for right-sized compute
- Enable backup policies on all block volumes
- Set bucket versioning and retention rules on all Object Storage buckets
- Use private load balancers for internal services
