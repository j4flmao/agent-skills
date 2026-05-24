# Alibaba Cloud Security

## RAM (Resource Access Management)

```hcl
# RAM user
resource "alicloud_ram_user" "devops" {
  name         = "devops-user"
  display_name = "DevOps Engineer"
  mobile       = "86-18888888888"
  email        = "devops@example.com"
  comments     = "DevOps automation user"
}

# RAM user with programmatic access
resource "alicloud_ram_access_key" "devops" {
  user_name = alicloud_ram_user.devops.name
  status    = "Active"
}

# RAM group
resource "alicloud_ram_group" "devops" {
  name        = "devops-group"
  comments    = "DevOps team"
  force       = true
}

resource "alicloud_ram_group_membership" "devops" {
  group_name = alicloud_ram_group.devops.name
  user_names = [alicloud_ram_user.devops.name]
}

# RAM role for ECS
resource "alicloud_ram_role" "ecs_app_role" {
  name     = "ecs-application-role"
  document = <<-EOF
  {
    "Statement": [
      {
        "Action": "sts:AssumeRole",
        "Effect": "Allow",
        "Principal": {
          "Service": ["ecs.aliyuncs.com"]
        }
      }
    ],
    "Version": "1"
  }
  EOF
  description = "Role for ECS instances to access OSS and KMS"
}

# RAM policy attached to role
resource "alicloud_ram_role_policy_attachment" "ecs_oss" {
  role_name   = alicloud_ram_role.ecs_app_role.name
  policy_name = "AliyunOSSFullAccess"
  policy_type = "System"
}

# Custom RAM policy
resource "alicloud_ram_policy" "app_readonly" {
  policy_name     = "app-readonly-policy"
  policy_document = <<-EOF
  {
    "Statement": [
      {
        "Effect": "Allow",
        "Action": [
          "ecs:Describe*",
          "rds:Describe*",
          "slb:Describe*",
          "oss:Get*",
          "oss:List*"
        ],
        "Resource": "*"
      },
      {
        "Effect": "Deny",
        "Action": [
          "ecs:DeleteInstance",
          "rds:DeleteDBInstance",
          "oss:DeleteBucket"
        ],
        "Resource": "*"
      }
    ],
    "Version": "1"
  }
  EOF
}

# Policy attachment to group
resource "alicloud_ram_group_policy_attachment" "devops_policy" {
  group_name  = alicloud_ram_group.devops.name
  policy_name = alicloud_ram_policy.app_readonly.policy_name
  policy_type = "Custom"
}

# RRSA (RAM Roles for Service Accounts) for ACK
resource "alicloud_ram_role" "ack_pod_role" {
  name     = "ack-pod-role"
  document = <<-EOF
  {
    "Statement": [
      {
        "Action": "sts:AssumeRole",
        "Effect": "Allow",
        "Principal": {
          "RAM": ["acs:ram::<account-id>:role/ack-rrsa-role"]
        },
        "Condition": {
          "StringEquals": {
            "oidc:issuer": "https://oidc-ack-region.aliyuncs.com/<cluster-id>",
            "oidc:sub": ["system:serviceaccount:<namespace>:<sa-name>"]
          }
        }
      }
    ],
    "Version": "1"
  }
  EOF
}
```

## KMS (Key Management Service)

```hcl
# KMS key
resource "alicloud_kms_key" "app" {
  description            = "Application encryption key"
  key_usage              = "ENCRYPT/DECRYPT"
  pending_window_in_days = 7
  status                 = "Enabled"
  automatic_rotation     = "Enabled"
  rotation_interval      = "365d"

  tags = {
    Environment = "production"
  }
}

# KMS key for RDS encryption
resource "alicloud_kms_key" "rds" {
  description = "RDS encryption key"
  key_usage   = "ENCRYPT/DECRYPT"
}

# KMS ciphertext for secret (encrypt a database password)
resource "alicloud_kms_ciphertext" "db_password" {
  key_id    = alicloud_kms_key.app.id
  plaintext = var.db_password
}

# KMS secret in Secrets Manager
resource "alicloud_kms_secret" "db_credential" {
  secret_name      = "production/db-credential"
  secret_data      = jsonencode({
    username = "admin",
    password = var.db_password
  })
  version_id       = "v1"
  secret_type      = "Generic"
}

# Grant cross-account access
resource "alicloud_kms_grant" "cross_account" {
  key_id            = alicloud_kms_key.app.id
  grantee_principal = "1234567890123456"
  operations        = ["Encrypt", "Decrypt", "GenerateDataKey"]
}
```

## WAF (Web Application Firewall)

```hcl
# WAF instance
resource "alicloud_wafv3_instance" "waf" {
  region       = "cn-hangzhou"
  instance_name = "production-waf"
  package_code = "version_3"
  domain_count = 10
}

# WAF domain configuration
resource "alicloud_wafv3_domain" "app" {
  instance_id = alicloud_wafv3_instance.waf.id
  domain      = "app.example.com"
  source_ips  = [alicloud_slb_load_balancer.public.address]
  access_type = "waf-cloud-dns"

  listen {
    protocol       = "https"
    port           = 443
    certificate_id = alicloud_ssl_certificates_service_certificate.app.id
    tls_version    = "tlsv1.3"
  }

  redirect {
    load_balancing = "IpHash"
    request_protocol = "http"
    backends = [alicloud_slb_load_balancer.public.address]
  }

  # WAF rules
  rule_groups {
    rule_group_id    = "1010"  # SQL injection
    rule_group_name  = "sqli"
    rule_group_type  = "custom"
    status           = "on"
  }
}

# WAF protection module
resource "alicloud_wafv3_defense_template" "app" {
  instance_id       = alicloud_wafv3_instance.waf.id
  defense_scene     = "waf_group"
  template_name     = "strict-protection"
  template_origin   = "custom"
  template_type     = "user_custom"

  defense_scene_config {
    waf_template {
      template_id = "1012" # Strict protection mode
    }
  }
}
```

## Security Center

```hcl
# Security Center (Threat Detection)
resource "alicloud_security_center_service_linked_role" "sas" {
  service_name = "sas.aliyuncs.com"
}

# Security Center version
resource "alicloud_threat_detection_instance" "sas" {
  instance_id = "sas-enterprise"
  payment_type = "Subscription"
  period       = 1
  sas_version  = "Enterprise"
  container_image_scan = true
  auto_attack_defense  = true
  vul_status           = true
  rasp_supported       = true
}
```

## Anti-DDoS

```hcl
# Anti-DDoS Pro (for ECS/SLB)
resource "alicloud_ddosbgp_instance" "ddos" {
  name            = "production-ddos"
  base_bandwidth  = 30  # Gbps
  elastic_bandwidth = 100  # Gbps
  ip_count        = 5
  bandwidth_mode  = "normal"
  instance_charge_type = "PostPaid"
  type            = "enterprise"

  tags = {
    Environment = "production"
  }
}

# Attach IP to DDoS protection
resource "alicloud_ddosbgp_ip" "slb_ip" {
  instance_id      = alicloud_ddosbgp_instance.ddos.id
  ip               = alicloud_slb_load_balancer.public.address
  type             = "ecs"
}
```

## Cloud Firewall

```hcl
resource "alicloud_cloud_firewall_instance" "cfw" {
  instance_name = "production-cloud-firewall"
  payment_type  = "Subscription"
  period        = 1
  ip_num        = 10
  bandwidth     = 10  # Mbps
  spec          = "Professional"
}

# Firewall VPC firewall
resource "alicloud_cloud_firewall_vpc_firewall" "vpc" {
  vpc_firewall_name = "vpc-east-west"
  member_uid = data.alicloud_account.current.id
  local_vpc {
    vpc_id    = alicloud_vpc.main.id
    region    = "cn-hangzhou"
    local_vpc_cidr_table_list {
      local_vpc_cidr_table {
        local_route_table_id = alicloud_vpc.main.route_table_id
        local_route_entry_list {
          destination_cidr = "10.0.0.0/8"
          next_hop_instance_id = alicloud_vpc.main.router_id
        }
      }
    }
  }
}
```

## Bastionhost

```hcl
resource "alicloud_bastionhost_instance" "bastion" {
  instance_name       = "production-bastion"
  plan_code           = "enterprise"
  storage             = "5TB"
  bandwidth           = "100"
  description         = "Production bastion host"
  security_group_ids  = [alicloud_security_group.web.id]
  vswitch_id          = alicloud_vswitch.app[0].id

  # Enable all features
  enable_public_network_access   = true
  enable_instance_public_access  = true
  enable_rdp_access              = false
  enable_ssh_access              = true
}
```

## CLI Commands

```bash
# Create RAM user
aliyun ram CreateUser --UserName devops --DisplayName "DevOps Engineer"

# Create RAM role
aliyun ram CreateRole \
  --RoleName ecs-application-role \
  --AssumeRolePolicyDocument '{"Statement":[{"Action":"sts:AssumeRole","Effect":"Allow","Principal":{"Service":["ecs.aliyuncs.com"]}}]}'

# Attach policy to role
aliyun ram AttachPolicyToRole \
  --PolicyName AliyunOSSFullAccess \
  --PolicyType System \
  --RoleName ecs-application-role

# Create KMS key
aliyun kms CreateKey --Description "App encryption key" --KeyUsage ENCRYPT/DECRYPT

# Encrypt secret
aliyun kms Encrypt --KeyId <key-id> --Plaintext "my-secret-password"

# Enable WAF
aliyun waf-openapi CreateInstance \
  --Region cn-hangzhou \
  --PackageCode version_3

# Add domain to WAF
aliyun waf-openapi CreateDomain \
  --Domain app.example.com \
  --SourceIps '["1.2.3.4"]' \
  --IsAccessProduct 0 \
  --HttpPort '["80"]' \
  --HttpsPort '["443"]'

# List Security Center alerts
aliyun sas DescribeSuspEvents

# Enable DDoS protection
aliyun ddosbgp CreateInstance \
  --Name production-ddos \
  --BaseBandwidth 30 \
  --ElasticBandwidth 100

# Create Bastionhost
aliyun bastionhost CreateInstance \
  --Region cn-hangzhou \
  --PlanCode enterprise \
  --Storage 5TB \
  --VSwitchId <vswitch-id>

# List RAM policies
aliyun ram ListPolicies --PolicyType Custom
```

## Security Best Practices

- Use RAM roles for ECS, ACK, and Functions instead of embedding AccessKeys
- Enable MFA for all RAM users with console access
- Use custom policies with least-privilege (avoid * actions where possible)
- Enable KMS automatic key rotation (365 days)
- Enable TDE with KMS for all RDS and PolarDB instances
- Use Secrets Manager for database passwords and API keys
- Enable WAF in "block" mode for production domains
- Subscribe to Security Center Enterprise for threat detection and vulnerability scanning
- Enable Anti-DDoS Pro for all public-facing services
- Use Bastionhost for SSH access to ECS instances
- Set up Cloud Firewall for east-west traffic inspection
- Enable Security Group rules with minimum required ports
- Regularly review RAM permissions using the IAM console
- Enable Operation Audit (ActionTrail) for all API calls
- Isolate production and non-production environments with different RAM policies
