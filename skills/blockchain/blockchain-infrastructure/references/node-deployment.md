# Node Deployment

## Node Types

### Archive Node
- Stores full historical state at every block
- Ethereum: 12TB+ (geth), 20TB+ (erigon) — growing ~1TB/month
- Solana: 40TB+ NVMe required for full ledger
- Use cases: block explorers, analytics, data indexers (The Graph, Dune)
- Sync: snapshot restore from trusted provider, then continuous sync

### Full Node
- Pruned state: keeps recent ~128 blocks of state, full header chain
- Ethereum: ~2TB SSD, 4+ vCPU, 16GB+ RAM
- Solana: 8+ vCPU, 64GB+ RAM, 2TB+ NVMe
- Use cases: RPC serving, wallet backends, bridge infrastructure
- Sync: snap sync (geth) / warp sync (near) / checkpoints (lodestar)

### Validator Node
- Full node with signing key for block proposal/attestation
- Same hardware as full node + HSM/secure enclave for key storage
- Ethereum: 32 ETH stake per validator, can run multiple per node
- Solana: no stake minimum, but requires high uptime and low latency
- Monitoring: missed attestations, proposal success rate, balance changes

### Light Client
- Verifies block headers, no state storage
- Minimal hardware: 1 vCPU, 512MB RAM, 100GB bandwidth/month
- Use cases: mobile wallets, IoT, browser extensions
- Protocols: LES (Ethereum), light client (Celestia), Nimbus (Eth2 light)

## Hardware Requirements per Chain

### Ethereum (Geth / Reth / Nethermind)
| Node Type   | vCPU | RAM   | Storage (SSD) | Network     |
|-------------|------|-------|----------------|-------------|
| Archive     | 8+   | 32GB+ | 12TB+          | 1 Gbps      |
| Full        | 4+   | 16GB+ | 2TB+           | 100 Mbps    |
| Validator   | 4+   | 16GB+ | 2TB+           | 100 Mbps    |
| Light       | 1    | 512MB | 100GB          | 10 Mbps     |

### Solana (Agave / Firedancer)
| Node Type   | vCPU  | RAM    | Storage (NVMe) | Network     |
|-------------|-------|--------|----------------|-------------|
| Validator   | 12+   | 128GB+ | 2TB+           | 1 Gbps      |
| RPC         | 16+   | 256GB+ | 4TB+           | 10 Gbps     |
| Archive     | 32+   | 512GB+ | 40TB+          | 10 Gbps     |

### Bitcoin Core
| Node Type   | vCPU | RAM   | Storage (SSD) | Network     |
|-------------|------|-------|----------------|-------------|
| Full        | 2+   | 8GB+  | 700GB+         | 100 Mbps    |
| Archive     | 4+   | 16GB+ | 10TB+          | 1 Gbps      |

## Ansible Roles

### Directory Structure
```
ansible/blockchain-node/
├── tasks/
│   ├── main.yml
│   ├── install.yml
│   ├── configure.yml
│   ├── service.yml
│   └── security.yml
├── templates/
│   ├── config.toml.j2
│   ├── service.j2
│   └── prometheus.yml.j2
├── vars/
│   ├── main.yml
│   └── {{ chain }}.yml
└── defaults/
    └── main.yml
```

### Ansible Task Example — Geth Install and Configure
```yaml
# tasks/install.yml
- name: Download geth binary
  get_url:
    url: "https://gethstore.blob.core.windows.net/builds/geth-linux-amd64-{{ geth_version }}.tar.gz"
    dest: /tmp/geth.tar.gz
    checksum: "sha256:{{ geth_checksum }}"

- name: Extract and install
  unarchive:
    src: /tmp/geth.tar.gz
    dest: /usr/local/bin
    remote_src: yes
    extra_opts: ["--strip-components=1"]

# tasks/configure.yml
- name: Create geth data directory
  file:
    path: "{{ geth_datadir }}"
    state: directory
    owner: geth
    group: geth
    mode: "0750"

- name: Deploy geth config
  template:
    src: config.toml.j2
    dest: "{{ geth_datadir }}/config.toml"
    owner: geth
    group: geth
  notify: restart geth

# tasks/security.yml
- name: Harden SSH
  lineinfile:
    path: /etc/ssh/sshd_config
    regexp: "{{ item.regexp }}"
    line: "{{ item.line }}"
  loop:
    - { regexp: "^PasswordAuthentication", line: "PasswordAuthentication no" }
    - { regexp: "^PermitRootLogin", line: "PermitRootLogin prohibit-password" }
    - { regexp: "^Port", line: "Port {{ ssh_port }}" }

- name: Configure firewall for blockchain node
  ufw:
    rule: "{{ item.rule }}"
    port: "{{ item.port }}"
    proto: "{{ item.proto }}"
  loop:
    - { rule: allow, port: "30303", proto: tcp }
    - { rule: allow, port: "30303", proto: udp }
    - { rule: allow, port: "8545", proto: tcp }
    - { rule: limit, port: "22", proto: tcp }

- name: Create geth system user
  user:
    name: geth
    system: yes
    shell: /usr/sbin/nologin
    home: "{{ geth_datadir }}"

# tasks/service.yml
- name: Deploy geth systemd service
  template:
    src: geth.service.j2
    dest: /etc/systemd/system/geth.service
  notify: daemon-reload and restart
```

### Geth Systemd Service Template
```
[Unit]
Description=Go Ethereum Client
After=network.target
Wants=network.target

[Service]
User=geth
Group=geth
Type=simple
Restart=always
RestartSec=30
ExecStart=/usr/local/bin/geth \
  --datadir {{ geth_datadir }} \
  --config {{ geth_datadir }}/config.toml \
  --http \
  --http.addr 127.0.0.1 \
  --http.port 8545 \
  --ws \
  --ws.addr 127.0.0.1 \
  --ws.port 8546 \
  --syncmode snap \
  --metrics \
  --metrics.addr 127.0.0.1 \
  --metrics.port 6060

[Install]
WantedBy=multi-user.target
```

## Terraform Modules

### AWS EC2 + EBS
```hcl
# modules/blockchain-node-aws/main.tf
resource "aws_instance" "node" {
  ami                    = data.aws_ami.ubuntu.id
  instance_type          = var.instance_type
  key_name               = var.ssh_key_name
  vpc_security_group_ids = [aws_security_group.node.id]
  subnet_id              = var.subnet_id

  root_block_device {
    volume_size = var.root_volume_size
    volume_type = "gp3"
  }

  ebs_block_device {
    device_name = "/dev/sdb"
    volume_size = var.data_volume_size
    volume_type = "gp3"
    iops        = 16000
    throughput  = 1000
  }

  tags = {
    Name  = "${var.chain}-${var.node_type}-${var.environment}"
    Chain = var.chain
    Role  = "blockchain-node"
  }
}

resource "aws_security_group" "node" {
  name_prefix = "${var.chain}-node-sg-"
  vpc_id      = var.vpc_id

  ingress {
    description = "P2P traffic"
    from_port   = var.p2p_port
    to_port     = var.p2p_port
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "P2P UDP discovery"
    from_port   = var.p2p_port
    to_port     = var.p2p_port
    protocol    = "udp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    description = "RPC from internal LB"
    from_port   = 8545
    to_port     = 8545
    protocol    = "tcp"
    cidr_blocks = var.internal_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}
```

### Terraform Variables
```hcl
# modules/blockchain-node-aws/variables.tf
variable "instance_type" {
  description = "EC2 instance type"
  type        = string
  default     = "m6i.2xlarge"
}

variable "data_volume_size" {
  description = "Data volume size in GB"
  type        = number
  default     = 2000
}

variable "chain" {
  description = "Blockchain chain name"
  type        = string
}

variable "node_type" {
  description = "Node type: archive, full, validator"
  type        = string
  validation {
    condition     = contains(["archive", "full", "validator"], var.node_type)
    error_message = "Node type must be archive, full, or validator."
  }
}
```

## Helm Charts for K8s

### values.yaml
```yaml
# helm/blockchain-node/values.yaml
chain: ethereum
nodeType: full
image:
  repository: ethereum/client-go
  tag: v1.14.0
  pullPolicy: IfNotPresent

resources:
  requests:
    cpu: "4"
    memory: "16Gi"
  limits:
    cpu: "8"
    memory: "32Gi"

persistence:
  enabled: true
  size: "2Ti"
  storageClass: "ssd-storage"
  accessModes:
    - ReadWriteOnce

service:
  p2p:
    port: 30303
    nodePort: null
  rpc:
    port: 8545
    enabled: true
    ingress:
      enabled: false
  ws:
    port: 8546
    enabled: true

config:
  syncMode: snap
  network: mainnet
  httpAddr: "0.0.0.0"
  wsAddr: "0.0.0.0"
  metrics: true
  verbosity: 3

nodeSelector:
  topology.kubernetes.io/zone: us-east-1a

tolerations:
  - key: "blockchain"
    operator: "Equal"
    value: "node"
    effect: "NoSchedule"

affinity:
  podAntiAffinity:
    preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          labelSelector:
            matchExpressions:
              - key: app.kubernetes.io/name
                operator: In
                values:
                  - blockchain-node
          topologyKey: topology.kubernetes.io/zone
```

## Sync Strategies

| Method          | Chain       | Speed       | Trust Assumption         |
|-----------------|-------------|-------------|--------------------------|
| Snap sync       | Ethereum    | 6-12 hours  | Trust checkpoints        |
| Block sync      | Ethereum    | 2-5 days    | Trustless                |
| Snapshot restore | Ethereum   | 1-2 hours   | Trust provider           |
| Warp sync       | Near        | 30 min      | Trust epoch validators   |
| Jito snapshot   | Solana      | 2-4 hours   | Trust snapshot provider  |

### Snapshot Restore Example
```bash
#!/usr/bin/env bash
# restore-geth-snapshot.sh
SNAPSHOT_URL="https://snapshots.example.com/ethereum/mainnet/geth-pruned-$(date +%Y%m%d).tar.lz4"
wget -q -O - "$SNAPSHOT_URL" | lz4 -d | tar -x -C /data/geth
chown -R geth:geth /data/geth
systemctl start geth
```

## Key Management
- Validator signing keys: store in Vault or AWS KMS, never on disk unencrypted
- Node keys (enode ID): encrypted at rest, decrypted at service start
- Reward withdrawal keys: separate cold wallet, store in hardware security module
- SSH keys: managed via Vault SSH CA, rotated every 90 days
