# VPC and Compute

## VPC (Virtual Private Cloud)

```hcl
# VPC Gen2
resource "ibm_is_vpc" "main" {
  name                     = "production-vpc"
  resource_group_id        = data.ibm_resource_group.default.id
  classic_access           = false
  address_prefix_management = "manual"

  tags = ["production", "vpc"]
}

# Address prefixes (one per zone)
resource "ibm_is_vpc_address_prefix" "zone1" {
  name = "zone1-prefix"
  zone = "us-south-1"
  vpc  = ibm_is_vpc.main.id
  cidr = "10.0.0.0/18"
}

resource "ibm_is_vpc_address_prefix" "zone2" {
  name = "zone2-prefix"
  zone = "us-south-2"
  vpc  = ibm_is_vpc.main.id
  cidr = "10.0.64.0/18"
}

resource "ibm_is_vpc_address_prefix" "zone3" {
  name = "zone3-prefix"
  zone = "us-south-3"
  vpc  = ibm_is_vpc.main.id
  cidr = "10.0.128.0/18"
}
```

## Subnets

```hcl
# Subnet with public gateway
resource "ibm_is_public_gateway" "gw" {
  name = "main-gateway"
  vpc  = ibm_is_vpc.main.id
  zone = "us-south-1"
}

resource "ibm_is_subnet" "app" {
  name                     = "app-subnet"
  vpc                      = ibm_is_vpc.main.id
  zone                     = "us-south-1"
  total_ipv4_address_count = 256
  public_gateway           = ibm_is_public_gateway.gw.id
}

# Private subnet (no public gateway)
resource "ibm_is_subnet" "db" {
  name                     = "db-subnet"
  vpc                      = ibm_is_vpc.main.id
  zone                     = "us-south-1"
  total_ipv4_address_count = 128
}

# Subnet with network ACL
resource "ibm_is_network_acl" "db_acl" {
  name = "db-acl"
  vpc  = ibm_is_vpc.main.id

  rules {
    name        = "ingress-app"
    action      = "allow"
    source      = "10.0.0.0/18"
    destination = "10.0.64.0/18"
    direction   = "inbound"
    tcp {
      port_min = 5432
      port_max = 5432
    }
  }
}
```

## Security Groups

```hcl
resource "ibm_is_security_group" "web" {
  name = "web-sg"
  vpc  = ibm_is_vpc.main.id
}

resource "ibm_is_security_group_rule" "web_http" {
  group     = ibm_is_security_group.web.id
  direction = "inbound"
  remote    = "0.0.0.0/0"
  tcp {
    port_min = 80
    port_max = 80
  }
}

resource "ibm_is_security_group_rule" "web_https" {
  group     = ibm_is_security_group.web.id
  direction = "inbound"
  remote    = "0.0.0.0/0"
  tcp {
    port_min = 443
    port_max = 443
  }
}

resource "ibm_is_security_group_rule" "web_ssh" {
  group     = ibm_is_security_group.web.id
  direction = "inbound"
  remote    = "10.0.0.0/8"
  tcp {
    port_min = 22
    port_max = 22
  }
}

resource "ibm_is_security_group_rule" "web_outbound" {
  group     = ibm_is_security_group.web.id
  direction = "outbound"
  remote    = "0.0.0.0/0"
}

resource "ibm_is_security_group" "db" {
  name = "db-sg"
  vpc  = ibm_is_vpc.main.id
}

resource "ibm_is_security_group_rule" "db_from_web" {
  group     = ibm_is_security_group.db.id
  direction = "inbound"
  remote    = ibm_is_security_group.web.id
  tcp {
    port_min = 5432
    port_max = 5432
  }
}
```

## Virtual Servers (VSIs)

```hcl
data "ibm_is_image" "ubuntu" {
  name = "ibm-ubuntu-24-04-1-minimal-amd64-1"
}

resource "ibm_is_ssh_key" "terraform" {
  name       = "terraform-key"
  public_key = file("~/.ssh/id_rsa.pub")
}

resource "ibm_is_instance" "app" {
  name    = "app-vsi-1"
  vpc     = ibm_is_vpc.main.id
  zone    = "us-south-1"
  profile = "bx2-4x16"

  primary_network_interface {
    name            = "eth0"
    subnet          = ibm_is_subnet.app.id
    security_groups = [ibm_is_security_group.web.id]
  }

  keys = [ibm_is_ssh_key.terraform.id]
  image = data.ibm_is_image.ubuntu.id

  user_data = <<-EOF
    #!/bin/bash
    apt-get update
    apt-get install -y nginx docker.io
    systemctl enable docker
    EOF

  tags = ["production", "web"]
}

# Instance with boot volume encryption
resource "ibm_is_instance" "encrypted" {
  name    = "app-vsi-encrypted"
  vpc     = ibm_is_vpc.main.id
  zone    = "us-south-1"
  profile = "bx2-4x16"

  primary_network_interface {
    subnet = ibm_is_subnet.app.id
  }

  boot_volume {
    name      = "encrypted-boot"
    encryption = "user_managed"
    key_id    = ibm_kms_key.app.id
  }

  keys  = [ibm_is_ssh_key.terraform.id]
  image = data.ibm_is_image.ubuntu.id
}

# Instance template (for auto-scale)
resource "ibm_is_instance_template" "web" {
  name    = "web-template"
  vpc     = ibm_is_vpc.main.id
  zone    = "us-south-1"
  profile = "bx2-4x16"

  primary_network_interface {
    subnet = ibm_is_subnet.app.id
  }

  keys  = [ibm_is_ssh_key.terraform.id]
  image = data.ibm_is_image.ubuntu.id
}
```

## Bare Metal

```hcl
# Bare metal server on VPC
resource "ibm_is_bare_metal_server" "bm" {
  name    = "bm-db-server"
  vpc     = ibm_is_vpc.main.id
  zone    = "us-south-1"
  profile = "bx2d-metal-192x768"

  primary_network_interface {
    subnet = ibm_is_subnet.db.id
  }

  keys  = [ibm_is_ssh_key.terraform.id]
  image = data.ibm_is_image.ubuntu.id

  # Console access
  console {
    type = "serial"
    enabled = true
  }
}
```

## Load Balancers

```hcl
# Application Load Balancer (ALB, layer 7)
resource "ibm_is_lb" "public" {
  name    = "public-alb"
  type    = "public"  # or "private"
  profile = "network-fixed"
  subnets = [ibm_is_subnet.app.id]

  security_groups = [ibm_is_security_group.web.id]
}

resource "ibm_is_lb_listener" "https" {
  lb        = ibm_is_lb.public.id
  port      = 443
  protocol  = "https"
  default_pool = ibm_is_lb_pool.web.id

  certificate_instance = ibm_certificate_manager_certificate.app.crn
}

resource "ibm_is_lb_pool" "web" {
  lb                = ibm_is_lb.public.id
  name              = "web-pool"
  protocol          = "http"
  algorithm         = "round_robin"
  health_monitor {
    type     = "http"
    port     = 80
    url_path = "/health"
    delay    = 10
    timeout  = 5
    retries  = 3
  }
}

resource "ibm_is_lb_pool_member" "web" {
  count          = 2
  lb             = ibm_is_lb.public.id
  pool           = ibm_is_lb_pool.web.id
  port           = 80
  target_address = ibm_is_instance.app[count.index].primary_network_interface[0].primary_ipv4_address
}

# Network Load Balancer (NLB, layer 4)
resource "ibm_is_lb" "nlb" {
  name    = "private-nlb"
  type    = "private"
  profile = "network-fixed"
  subnets = [ibm_is_subnet.db.id]
}
```

## VPN Gateway

```hcl
resource "ibm_is_vpn_gateway" "main" {
  name   = "site-to-site-vpn"
  vpc    = ibm_is_vpc.main.id
  subnet = ibm_is_subnet.app.id
  mode   = "route"

  connections {
    name           = "on-prem"
    peer_address   = "203.0.113.10"
    preshared_key  = var.vpn_psk
    local_cidrs    = ["10.0.0.0/8"]
    peer_cidrs     = ["192.168.0.0/16"]
    admin_state_up = true
  }
}
```

## CLI Commands

```bash
# Target resource group and region
ibmcloud target -g production -r us-south

# Create VPC
ibmcloud is vpc-create production-vpc

# List VPCs
ibmcloud is vpcs

# Create subnet
ibmcloud is subnet-create app-subnet production-vpc \
  --zone us-south-1 --ipv4-address-count 256

# Create security group
ibmcloud is sg-create web-sg --vpc production-vpc

# Add rule to security group
ibmcloud is sg-rule-add web-sg inbound tcp \
  --port-min 80 --port-max 80 --remote 0.0.0.0/0

# Create VSI
ibmcloud is instance-create app-vsi production-vpc us-south-1 bx2-4x16 \
  --image-id <image> --subnet-id <subnet> --ssh-keys <key>

# Create LB
ibmcloud is lb-create public-alb public --subnet <subnet>

# Create VPN
ibmcloud is vpn-gateway-create main production-vpc --subnet <subnet>

# List instances
ibmcloud is instances

# List load balancers
ibmcloud is lbs

# Delete VSI
ibmcloud is instance-delete app-vsi

# Create bare metal
ibmcloud is bm-create bm-db production-vpc us-south-1 bx2d-metal-192x768 \
  --image-id <image>
```

## Architecture Patterns

| Pattern | Components | Use Case |
|---------|------------|----------|
| Multi-tier web | ALB → VSI → DB | Traditional web apps |
| Private workload | VSI in private subnet | Internal services |
| Hybrid cloud | VPN → VPC → on-prem | Hybrid deployments |
| Burst compute | VPC + auto-scale | Batch processing |
| CDN edge | CDN → ALB → VSI | Global web delivery |

## Best Practices

- Deploy across all 3 zones in an MZR for maximum HA
- Use security groups (stateful) over network ACLs (stateless) when possible
- Always encrypt boot and data volumes with KMS keys
- Use private subnets for databases and internal services
- Use public gateways only for VSIs that need outbound internet
- Use ALB for HTTP/HTTPS traffic, NLB for TCP/UDP
- Enable VPC flow logs for network monitoring
- Use instance templates for consistent auto-scaling
- Tag all resources with environment, project, and cost center
- Use dedicated SSH keys per environment (never share keys)
