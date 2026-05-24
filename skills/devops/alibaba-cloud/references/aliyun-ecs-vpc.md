# Alibaba Cloud ECS and VPC

## VPC

```hcl
terraform {
  required_providers {
    alicloud = {
      source  = "aliyun/alicloud"
      version = "~> 1.230"
    }
  }
}

provider "alicloud" {
  region = "cn-hangzhou"
}

# VPC with custom CIDR
resource "alicloud_vpc" "main" {
  vpc_name   = "production-vpc"
  cidr_block = "10.0.0.0/8"
  enable_ipv6 = true
}

# vSwitches across zones
data "alicloud_zones" "default" {
  available_resource_creation = "VSwitch"
}

resource "alicloud_vswitch" "app" {
  count        = 2
  vpc_id       = alicloud_vpc.main.id
  cidr_block   = "10.${count.index}.0.0/16"
  zone_id      = data.alicloud_zones.default.zones[count.index].id
  vswitch_name = "app-vswitch-${count.index}"
}

resource "alicloud_vswitch" "db" {
  count        = 2
  vpc_id       = alicloud_vpc.main.id
  cidr_block   = "10.${count.index + 100}.0.0/16"
  zone_id      = data.alicloud_zones.default.zones[count.index].id
  vswitch_name = "db-vswitch-${count.index}"
}
```

## Security Groups

```hcl
resource "alicloud_security_group" "web" {
  name   = "web-sg"
  vpc_id = alicloud_vpc.main.id
}

resource "alicloud_security_group_rule" "web_http" {
  type              = "ingress"
  ip_protocol       = "tcp"
  policy            = "accept"
  port_range        = "80/80"
  priority          = 1
  security_group_id = alicloud_security_group.web.id
  cidr_ip           = "0.0.0.0/0"
  description       = "HTTP from anywhere"
}

resource "alicloud_security_group_rule" "web_https" {
  type              = "ingress"
  ip_protocol       = "tcp"
  policy            = "accept"
  port_range        = "443/443"
  priority          = 1
  security_group_id = alicloud_security_group.web.id
  cidr_ip           = "0.0.0.0/0"
  description       = "HTTPS from anywhere"
}

resource "alicloud_security_group_rule" "web_ssh_vpc" {
  type              = "ingress"
  ip_protocol       = "tcp"
  policy            = "accept"
  port_range        = "22/22"
  priority          = 2
  security_group_id = alicloud_security_group.web.id
  cidr_ip           = "10.0.0.0/8"
  description       = "SSH from VPC"
}

# Security group for database (reference web security group)
resource "alicloud_security_group" "db" {
  name   = "db-sg"
  vpc_id = alicloud_vpc.main.id
}

resource "alicloud_security_group_rule" "db_mysql" {
  type              = "ingress"
  ip_protocol       = "tcp"
  policy            = "accept"
  port_range        = "3306/3306"
  priority          = 1
  security_group_id = alicloud_security_group.db.id
  source_security_group_id = alicloud_security_group.web.id
  description       = "MySQL from web SG"
}
```

## ECS Instance Types

| Series | Type | CPU/Memory | Use Case |
|--------|------|-----------|----------|
| g7 | ecs.g7.xlarge | 4 vCPU, 16 GB | General purpose |
| g7 | ecs.g7.2xlarge | 8 vCPU, 32 GB | General purpose |
| c7 | ecs.c7.xlarge | 4 vCPU, 8 GB | Compute-intensive |
| r7 | ecs.r7.xlarge | 4 vCPU, 32 GB | Memory-intensive |
| i3 | ecs.i3.xlarge | 4 vCPU, 32 GB | High IOPS, NVMe SSD |
| g7ne | ecs.g7ne.xlarge | 4 vCPU, 16 GB | Enhanced network |
| ebm | ecs.ebmg7.2xlarge | 8 vCPU, 32 GB | Bare metal |
| gn7i | ecs.gn7i-c16g1.4xlarge | 16 vCPU, 125 GB | GPU (T4) |

## ECS Instances

```hcl
# Data source for image
data "alicloud_images" "ubuntu" {
  name_regex = "^ubuntu_24.*_x64"
  most_recent = true
}

# ECS instance
resource "alicloud_instance" "app" {
  count              = 2
  availability_zone  = data.alicloud_zones.default.zones[count.index].id
  instance_name      = "app-ecs-${count.index}"
  instance_type      = "ecs.g7.xlarge"
  image_id           = data.alicloud_images.ubuntu.images[0].id
  vswitch_id         = alicloud_vswitch.app[count.index].id
  security_groups    = [alicloud_security_group.web.id]

  system_disk_category = "cloud_essd"
  system_disk_size     = 40
  system_disk_performance_level = "PL1"

  data_disks {
    name        = "app-data-${count.index}"
    category    = "cloud_essd"
    size        = 200
    performance_level = "PL2"
    encrypted   = true
    kms_key_id  = alicloud_kms_key.app.id
  }

  internet_max_bandwidth_out = 10
  internet_charge_type       = "PayByTraffic"

  instance_charge_type = "PostPaid"
  spot_strategy        = "NoSpot"

  password             = data.alicloud_kms_ciphertext.db_password.ciphertext_blob
  user_data = base64encode(<<-EOF
    #!/bin/bash
    yum install -y docker
    systemctl enable docker
    systemctl start docker
    EOF
  )

  tags = {
    Environment = "production"
    Project     = "myapp"
    Role        = "web"
  }
}

# Preemptible (spot) instance
resource "alicloud_instance" "spot" {
  count      = 2
  instance_name = "spot-compute-${count.index}"
  instance_type = "ecs.g7.xlarge"
  image_id      = data.alicloud_images.ubuntu.images[0].id
  vswitch_id    = alicloud_vswitch.app[0].id

  instance_charge_type = "PostPaid"
  spot_strategy        = "SpotWithPriceLimit"
  spot_price_limit     = 0.50
}
```

## SLB (Server Load Balancer)

```hcl
# Application Load Balancer (ALB)
resource "alicloud_slb_load_balancer" "public" {
  load_balancer_name = "public-alb"
  vswitch_id         = alicloud_vswitch.app[0].id
  load_balancer_spec = "slb.s2.small"
  address_type       = "internet"
  payment_type       = "PayAsYouGo"
  deletion_protection = true

  modification_protection_reason = "Production LB"

  tags = {
    Environment = "production"
  }
}

resource "alicloud_slb_listener" "https" {
  load_balancer_id        = alicloud_slb_load_balancer.public.id
  backend_port            = 80
  frontend_port           = 443
  protocol                = "https"
  bandwidth               = 100
  scheduler               = "wrr"
  sticky_session          = "on"
  sticky_session_type     = "insert"
  cookie_timeout          = 86400
  health_check            = "on"
  health_check_uri        = "/health"
  health_check_interval   = 5
  healthy_threshold       = 3
  unhealthy_threshold     = 3
  server_certificate_id   = alicloud_ssl_certificates_service_certificate.app.id
}

resource "alicloud_slb_attachment" "app" {
  load_balancer_id = alicloud_slb_load_balancer.public.id
  instance_ids     = alicloud_instance.app[*].id
  weight           = 100
}
```

## Auto Scaling

```hcl
resource "alicloud_ess_scaling_group" "app" {
  scaling_group_name = "app-asg"
  min_size           = 2
  max_size           = 10
  default_cooldown   = 300
  vswitch_ids        = alicloud_vswitch.app[*].id
  removal_policies   = ["OldestInstance", "NewestInstance"]
  group_deletion_force = true

  tags = {
    Environment = "production"
  }
}

resource "alicloud_ess_scaling_configuration" "app" {
  scaling_group_id = alicloud_ess_scaling_group.app.id
  image_id         = data.alicloud_images.ubuntu.images[0].id
  instance_type    = "ecs.g7.xlarge"
  security_group_id = alicloud_security_group.web.id
  system_disk_category = "cloud_essd"
  system_disk_size     = 40
  active              = true

  user_data = base64encode("#!/bin/bash\necho 'bootstrapped'")
}

resource "alicloud_ess_scaling_rule" "scale_out" {
  scaling_group_id = alicloud_ess_scaling_group.app.id
  scaling_rule_name = "scale-out-cpu"
  adjustment_type   = "TotalCapacity"
  adjustment_value  = 1
  cooldown          = 120
}

resource "alicloud_ess_alarm" "high_cpu" {
  scaling_group_id = alicloud_ess_scaling_group.app.id
  name             = "high-cpu-alarm"
  description      = "Scale out when CPU > 80%"
  alarm_actions    = [alicloud_ess_scaling_rule.scale_out.arn]
  metric_type      = "system"
  metric_name      = "CpuUtilization"
  period           = 300
  statistics       = "Average"
  threshold        = 80
  comparison_operator = ">="
  evaluation_count = 3
}
```

## Elastic IP

```hcl
resource "alicloud_eip" "app" {
  bandwidth            = 100
  internet_charge_type = "PayByBandwidth"
  payment_type         = "PayAsYouGo"
  description          = "EIP for NAT gateway"
}

resource "alicloud_eip_association" "app" {
  allocation_id = alicloud_eip.app.id
  instance_id   = alicloud_instance.app[0].id
  instance_type = "EcsInstance"
}
```

## CLI Commands

```bash
# Configure CLI
aliyun configure set --profile prod \
  --access-key-id <AK> --access-key-secret <SK> \
  --region cn-hangzhou

# Create VPC
aliyun vpc CreateVpc --VpcName production-vpc --CidrBlock 10.0.0.0/8

# Create vSwitch
aliyun vpc CreateVSwitch \
  --VpcId <vpc-id> \
  --ZoneId cn-hangzhou-h \
  --CidrBlock 10.0.0.0/16

# Create security group
aliyun ecs CreateSecurityGroup --SecurityGroupName web-sg --VpcId <vpc-id>

# Authorize security group
aliyun ecs AuthorizeSecurityGroup \
  --SecurityGroupId <sg-id> \
  --IpProtocol tcp --PortRange 80/80 \
  --SourceCidrIp 0.0.0.0/0

# Create instance
aliyun ecs CreateInstance \
  --InstanceName app-ecs \
  --InstanceType ecs.g7.xlarge \
  --ImageId ubuntu_24_04_x64_20G_alibase_20250101.vhd \
  --VSwitchId <vswitch-id> \
  --SecurityGroupId <sg-id>

# Start instance
aliyun ecs StartInstance --InstanceId <id>

# Create SLB
aliyun slb CreateLoadBalancer \
  --LoadBalancerName public-alb \
  --AddressType internet \
  --LoadBalancerSpec slb.s2.small

# Create ESS scaling group
aliyun ess CreateScalingGroup \
  --ScalingGroupName app-asg \
  --MinSize 2 --MaxSize 10 \
  --VSwitchIds "[\"<vswitch-id>\"]"

# List instances
aliyun ecs DescribeInstances

# List security groups
aliyun ecs DescribeSecurityGroups --VpcId <vpc-id>
```

## Best Practices

- Deploy ECS instances across at least 2 availability zones for HA
- Use ESSD cloud disks for production workloads (higher IOPS and reliability)
- Enable disk encryption with KMS for all data disks
- Use security group referencing (source_security_group_id) instead of CIDR for inter-SG traffic
- Use SLB health checks with custom paths for reliable routing
- Enable Auto Scaling with CloudMonitor alarms for dynamic scaling
- Use spot/preemptible instances for stateless, fault-tolerant workloads
- Tag all resources with environment, project, and owner
- Use Elastic IP with NAT Gateway for outbound internet from VPC
- Enable deletion protection on SLB instances
