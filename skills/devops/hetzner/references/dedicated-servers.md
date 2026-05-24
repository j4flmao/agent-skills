# Hetzner Dedicated Servers

## Server Models

### AX Series (Intel, balanced)

| Model | CPU | Cores/Threads | RAM | Disks | Bandwidth |
|-------|-----|--------------|-----|-------|-----------|
| AX102 | Intel Xeon E-2388G | 8 / 16 | 64 GB | 2×1 TB NVMe | 1 Gbps |
| AX162 | Intel Xeon E-2488 | 8 / 16 | 128 GB | 2×2 TB NVMe | 10 Gbps |
| AX52 | Intel Xeon E-2278G | 8 / 16 | 64 GB | 2×512 GB NVMe | 1 Gbps |
| AX101 | Intel Xeon E-2388G | 8 / 16 | 64 GB | 2×512 GB NVMe | 10 Gbps |

### EX Series (Intel, high-end)

| Model | CPU | Cores/Threads | RAM | Disks | Bandwidth |
|-------|-----|--------------|-----|-------|-----------|
| EX44 | Intel Xeon Gold 5318Y | 24 / 48 | 128 GB | 2×3.84 TB NVMe | 10 Gbps |
| EX52 | Intel Xeon Gold 5318Y | 24 / 48 | 256 GB | 2×3.84 TB NVMe | 10 Gbps |
| EX62 | Intel Xeon Gold 5318Y | 24 / 48 | 512 GB | 4×3.84 TB NVMe | 10 Gbps |
| EX101 | 2× Intel Xeon Platinum 8358 | 64 / 128 | 512 GB | 4×3.84 TB NVMe | 10 Gbps |
| EX102 | 2× Intel Xeon Platinum 8358 | 64 / 128 | 1024 GB | 6×3.84 TB NVMe | 10 Gbps |

### SX Series (AMD, storage-optimized)

| Model | CPU | Cores/Threads | RAM | Disks | Bandwidth |
|-------|-----|--------------|-----|-------|-----------|
| SX132 | AMD EPYC | 16 / 32 | 128 GB | 6×16 TB HDD | 10 Gbps |
| SX232 | 2× AMD EPYC | 32 / 64 | 256 GB | 12×18 TB HDD | 10 Gbps |
| SX284 | 2× AMD EPYC | 64 / 128 | 512 GB | 24×20 TB HDD | 10 Gbps |

## Server Auction

```bash
# Hetzner Server Auction provides discounted dedicated servers
# Available models vary based on returned hardware
# Check availability: https://www.hetzner.com/sb

# Typical auction server spec example:
# - Intel Xeon E-2278G
# - 64 GB ECC RAM
# - 2×512 GB NVMe
# - 1 Gbps uplink
# - ~30-50% discount vs. regular pricing
```

## Robot Web Interface

```bash
# Robot is the dedicated server management interface
# URL: https://robot.your-server.de

# Common Robot operations:
# - Power on/off/reset server
# - Boot into rescue mode
# - Reinstall OS
# - Configure vSwitch
# - Manage firewalls (Robot firewall)
# - View traffic graphs
# - Manage RDNS

# Robot API (REST, HTTP Basic Auth)
# Base URL: https://robot.your-server.de
# Authentication: Robot user + password (not the same as Cloud API token)

# List servers via API
curl -u "$ROBOT_USER:$ROBOT_PASSWORD" \
  https://robot.your-server.de/server

# Get server details
curl -u "$ROBOT_USER:$ROBOT_PASSWORD" \
  https://robot.your-server.de/server/$SERVER_IP

# Power on
curl -u "$ROBOT_USER:$ROBOT_PASSWORD" \
  -X POST https://robot.your-server.de/server/$SERVER_IP/command \
  -d "type=on"

# Power off
curl -u "$ROBOT_USER:$ROBOT_PASSWORD" \
  -X POST https://robot.your-server.de/server/$SERVER_IP/command \
  -d "type=off"

# Reset
curl -u "$ROBOT_USER:$ROBOT_PASSWORD" \
  -X POST https://robot.your-server.de/server/$SERVER_IP/command \
  -d "type=reset"
```

## Remote Console

```bash
# Access server via IPMI / iLO remote console
# Available in Robot web interface under each server

# Access remote console:
# 1. Login to Robot: https://robot.your-server.de
# 2. Select server → "Remote Console"
# 3. Java Web Start / HTML5 console

# Or via SSH rescue mode:
# 1. Enable rescue mode in Robot
# 2. Server reboots into rescue Linux
# 3. SSH with credentials from Robot
ssh root@$SERVER_IP -p 22
```

## Rescue Mode

```bash
# Enable rescue mode via Robot
# 1. Select server → "Rescue" tab
# 2. Choose architecture (64 bit, 32 bit)
# 3. Optionally provide SSH public key
# 4. Click "Enable"
# 5. Server reboots into rescue system

# After reboot, SSH with credentials shown in Robot:
ssh root@$SERVER_IP
# Password is displayed in Robot web interface

# Rescue mode operations:
# - Check hardware status (SMART, memory test)
smartctl -a /dev/nvme0n1
memtest86+

# - Mount existing filesystems
lsblk
mount /dev/sda1 /mnt
mount /dev/md0 /mnt

# - Chroot into installed system
mount -o bind /dev /mnt/dev
mount -o bind /proc /mnt/proc
mount -o bind /sys /mnt/sys
chroot /mnt

# - Fix bootloader
grub-install /dev/sda
update-grub

# - Reset root password
chroot /mnt
passwd root

# - Copy SSH keys
mount /dev/sda1 /mnt
cp /root/.ssh/authorized_keys /mnt/root/.ssh/

# Exit rescue and reboot:
exit
reboot
```

## vSwitch (Private Networking)

```bash
# vSwitch allows private networking between dedicated servers
# Managed via Robot web interface

# Create vSwitch:
# 1. Robot → "Switches" → "Order vSwitch"
# 2. Choose subnet: 10.0.0.0/16 (or your own subnet)
# 3. Configure VLAN ID

# Add server to vSwitch:
# 1. Robot → server → "vSwitch" tab
# 2. Select vSwitch, enter IP for this server
# 3. Save

# Configure network on server (/etc/network/interfaces):
# if query.hetzner.com shows vSwitch interface (e.g., eth1)
auto eth1
iface eth1 inet static
  address 10.0.1.10/16
  mtu 65535

# Connect Cloud servers to vSwitch
# Requires L2 connectivity between vSwitch and Cloud Network
# Use a Cloud server as a gateway or use VPN

# Check vSwitch status via API
curl -u "$ROBOT_USER:$ROBOT_PASSWORD" \
  https://robot.your-server.de/vswitch

# List vSwitch details
curl -u "$ROBOT_USER:$ROBOT_PASSWORD" \
  https://robot.your-server.de/vswitch/$VSWITCH_ID
```

## Automated OS Installation

```bash
# Robot supports automated OS install via "post-install script"

# You can provide a script during OS installation:
# 1. Robot → server → "ISO" tab
# 2. Select OS (Ubuntu 24.04, Debian 12, etc.)
# 3. Provide post-install script URL

# Example post-install script:
#!/bin/bash
# Automatically executed after OS installation

# Configure SSH
sed -i 's/PermitRootLogin yes/PermitRootLogin prohibit-password/' /etc/ssh/sshd_config
sed -i 's/PasswordAuthentication yes/PasswordAuthentication no/' /etc/ssh/sshd_config
systemctl restart sshd

# Configure firewall
ufw default deny incoming
ufw default allow outgoing
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Install Docker
curl -fsSL https://get.docker.com | sh
systemctl enable docker

# Set hostname
hostnamectl set-hostname app-server-01

# Disable IPv6 if not needed
echo "net.ipv6.conf.all.disable_ipv6 = 1" >> /etc/sysctl.conf
sysctl -p

# Set timezone
timedatectl set-timezone UTC

# Install monitoring agent
curl -O https://install.example.com/agent.sh | bash
```

## Performance Tuning

```bash
# Network tuning for dedicated servers (10 Gbps)
cat >> /etc/sysctl.conf << 'EOF'

# Network performance
net.core.rmem_default = 262144
net.core.rmem_max = 268435456
net.core.wmem_default = 262144
net.core.wmem_max = 268435456
net.core.netdev_max_backlog = 50000
net.ipv4.tcp_rmem = 4096 87380 268435456
net.ipv4.tcp_wmem = 4096 65536 268435456
net.ipv4.tcp_congestion_control = bbr
net.ipv4.tcp_notsent_lowat = 16384
net.ipv4.tcp_mtu_probing = 1

# Disk
vm.dirty_ratio = 30
vm.dirty_background_ratio = 5
vm.swappiness = 10
EOF

sysctl -p

# IRQ balance for NVMe
# Set IRQ affinity for NVMe queues to different CPU cores
# Use irqbalance or manually set smp_affinity

# Drive scheduler (NVMe)
echo none > /sys/block/nvme0n1/queue/scheduler
```

## Best Practices

- Use rescue mode for all system recovery operations, not as the primary OS
- Configure vSwitch for private networking between all dedicated servers
- Always order servers with hardware RAID (or use software RAID)
- Set up a monitoring server (e.g., Icinga, Prometheus) for hardware alerts
- Use Hetzner's Robot firewall as a first line of defense
- Keep a rescue SSH key in Robot for emergency access
- Use server auctions for cost-effective capacity expansion
- Pre-configure post-install scripts for consistent server setup
- Use IPMI remote console for BIOS-level access
- Monitor SMART status and replace failing drives proactively
- Enable BBR congestion control for optimal network throughput
- Use dedicated servers for stable, predictable workloads (Cloud for bursty)
- Combine Cloud servers and dedicated servers via vSwitch / VPN
