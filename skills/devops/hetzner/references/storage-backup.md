# Storage and Backup

## Storage Box

```bash
# Storage Box is a managed file storage product
# Supports: Samba (CIFS), WebDAV, SSHFS, SFTP, SCP

# Order via Hetzner Robot:
# Robot → "Storage Box" → "Order Storage Box"

# Access credentials displayed in Robot:
# - Username: U123456
# - Server: u123456.your-storagebox.de
# - Initial password (change on first login)

# SSHFS mount
mkdir -p /mnt/storagebox
sshfs -o allow_other,default_permissions,IdentityFile=~/.ssh/storagebox_key \
  U123456@u123456.your-storagebox.de:/backup /mnt/storagebox

# Samba/CIFS mount
# Install cifs-utils
# mount -t cifs //u123456.your-storagebox.de/backup /mnt/storagebox \
#   -o username=U123456,password=YOURPASS,uid=1000,gid=1000,iocharset=utf8,file_mode=0644,dir_mode=0755

# WebDAV mount (via davfs2)
# mount -t davfs https://u123456.your-storagebox.de /mnt/storagebox

# SFTP access (most compatible)
sftp U123456@u123456.your-storagebox.de
```

### Storage Box Snapshots

```bash
# Storage Box snapshot management via Robot API

# List snapshots
curl -u "$ROBOT_USER:$ROBOT_PASSWORD" \
  "https://robot.your-server.de/storagebox/$BOX_ID/snapshot"

# Create snapshot
curl -u "$ROBOT_USER:$ROBOT_PASSWORD" \
  -X POST "https://robot.your-server.de/storagebox/$BOX_ID/snapshot" \
  -d "name=pre-upgrade-$(date +%Y%m%d)"

# Restore snapshot
curl -u "$ROBOT_USER:$ROBOT_PASSWORD" \
  -X POST "https://robot.your-server.de/storagebox/$BOX_ID/snapshot/$SNAPSHOT_ID/restore"

# Delete snapshot
curl -u "$ROBOT_USER:$ROBOT_PASSWORD" \
  -X DELETE "https://robot.your-server.de/storagebox/$BOX_ID/snapshot/$SNAPSHOT_ID"
```

### Storage Box S3-Compatible Backup

```bash
# Storage Box with S3-compatible API
# Endpoint: https://u123456.your-storagebox.de

# Using s3cmd
cat > ~/.s3cfg << 'EOF'
[default]
access_key = U123456
secret_key = YOUR_PASSWORD
host_base = u123456.your-storagebox.de
host_bucket = u123456.your-storagebox.de
use_https = True
signature_v2 = True
EOF

# Create bucket (subdirectory)
s3cmd mb s3://backups
s3cmd mb s3://databases

# Upload files
s3cmd put /tmp/db_backup.sql.gz s3://databases/daily/

# List objects
s3cmd ls s3://backups/

# Sync directory
s3cmd sync /mnt/data s3://backups/data/

# Set lifecycle (delete after 90 days)
# s3cmd setlifecycle lifecycle.xml s3://backups/
```

## Backup Space

```bash
# Backup Space is included with dedicated servers
# Each dedicated server includes free backup space (tiered by server spec)

# Access backup space via:
# SSH: root@<server-ip> → /backup directory
# SFTP: root@<server-ip>:/backup

# Common backup setup:
# Create backup script
cat > /usr/local/bin/backup.sh << 'SCRIPT'
#!/bin/bash
set -e

BACKUP_DIR="/backup/$(hostname)"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
RETENTION_DAYS=30

mkdir -p "$BACKUP_DIR/{databases,files,configs}"

# Backup PostgreSQL databases
su - postgres -c "pg_dumpall" | gzip > "$BACKUP_DIR/databases/pg_dumpall_$TIMESTAMP.sql.gz"

# Backup MySQL databases
mysqldump --all-databases --single-transaction | gzip > "$BACKUP_DIR/databases/mysql_dump_$TIMESTAMP.sql.gz"

# Backup important configs
tar czf "$BACKUP_DIR/configs/etc_$TIMESTAMP.tar.gz" /etc/
tar czf "$BACKUP_DIR/configs/var_www_$TIMESTAMP.tar.gz" /var/www/

# Backup Docker volumes
for volume in $(docker volume ls -q); do
  docker run --rm -v $volume:/data -v $BACKUP_DIR/files:/backup alpine \
    tar czf "/backup/docker_volume_${volume}_$TIMESTAMP.tar.gz" -C /data .
done

# Cleanup old backups
find "$BACKUP_DIR/databases" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR/files" -type f -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR/configs" -type f -mtime +$RETENTION_DAYS -delete

echo "Backup completed: $TIMESTAMP"
SCRIPT

chmod +x /usr/local/bin/backup.sh

# Add to crontab (daily at 2 AM)
echo "0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1" | crontab -
```

## Snapshot Management

### Hetzner Cloud Snapshots

```hcl
# Terraform: Cloud server snapshot
resource "hcloud_server" "web" {
  name        = "web-0"
  server_type = "cx52"
  image       = "ubuntu-24.04"
  location    = "nbg1"
  backups     = true

  labels = {
    backup_daily = "true"
  }
}

# Manual snapshot
resource "hcloud_snapshot" "pre_deploy" {
  server_id = hcloud_server.web.id
  labels = {
    type    = "pre-deploy"
    date    = formatdate("YYYY-MM-DD", timestamp())
  }
}

# Volume snapshot
resource "hcloud_volume" "data" {
  name      = "app-data"
  size      = 200
  server_id = hcloud_server.web.id
  automount = true
  format    = "ext4"
}
```

### Snapshot Rotation Script

```bash
#!/bin/bash
# Automated Hetzner Cloud snapshot rotation

HCLOUD_TOKEN="${HCLOUD_TOKEN:-}"
SERVER_ID="${1}"
LABEL_PREFIX="auto-snap"

# Get current date
DATE=$(date +%Y%m%d)
WEEKDAY=$(date +%u)
EXPIRY_DAILY=7
EXPIRY_WEEKLY=30

# Create snapshot with label
hcloud server create-image "$SERVER_ID" \
  --type snapshot \
  --description "${LABEL_PREFIX}-${DATE}"

# Get created snapshot ID
SNAPSHOT_ID=$(hcloud image list \
  --type snapshot \
  --selector "name=${LABEL_PREFIX}-${DATE}" \
  -o noheader -o columns=id)

# Label the snapshot
hcloud image add-label "$SNAPSHOT_ID" \
  "type=daily" \
  "date=${DATE}"

# For weekly (Sunday = 7)
if [ "$WEEKDAY" -eq 7 ]; then
  hcloud image add-label "$SNAPSHOT_ID" "type=weekly"
fi

# Cleanup: delete daily snapshots older than 7 days
hcloud image list \
  --type snapshot \
  --selector "type=daily" \
  -o noheader -o columns=id,created | \
while read -r id created; do
  if [ "$(date -d "$created" +%s)" -lt "$(date -d "-$EXPIRY_DAILY days" +%s)" ]; then
    hcloud image delete "$id"
  fi
done

# Cleanup: delete weekly snapshots older than 30 days
hcloud image list \
  --type snapshot \
  --selector "type=weekly" \
  -o noheader -o columns=id,created | \
while read -r id created; do
  if [ "$(date -d "$created" +%s)" -lt "$(date -d "-$EXPIRY_WEEKLY days" +%s)" ]; then
    hcloud image delete "$id"
  fi
done
```

### Volume Snapshots with hcloud CLI

```bash
# List volumes
hcloud volume list

# Create volume snapshot (via server snapshot with attached volumes)
hcloud server create-image web-0 \
  --type snapshot \
  --description "pre-upgrade-snap"
```

## S3-Compatible Backup

```yaml
# Backup to S3-compatible storage (e.g., Backblaze B2, Wasabi, MinIO)

# Using restic (encrypted backups)
# restic init --repo s3:s3.us-west-000.backblazeb2.com/my-backup
# restic backup /mnt/data --repo s3:s3.us-west-000.backblazeb2.com/my-backup
---
# docker-compose for automated restic
services:
  restic:
    image: restic/restic:latest
    command: backup /data
    environment:
      RESTIC_REPOSITORY: s3:s3.us-west-000.backblazeb2.com/my-backup
      RESTIC_PASSWORD: ${RESTIC_PASSWORD}
      AWS_ACCESS_KEY_ID: ${B2_KEY_ID}
      AWS_SECRET_ACCESS_KEY: ${B2_APP_KEY}
    volumes:
      - /mnt/data:/data:ro
      - /var/run/docker.sock:/var/run/docker.sock
    labels:
      - "docker-volume-backup"
```

## Automated Backup Strategy

### Three-Tier Backup Architecture

```
1. Cloud Snapshots (Hetzner built-in)
   - Frequency: Daily
   - Retention: 7 days
   - Scope: Entire server/volume state
   - RTO: Minutes (restore from image)

2. File-Level Backups (to Storage Box)
   - Frequency: Daily
   - Retention: 30 days
   - Scope: Databases, configs, application data
   - Tool: rsync / s3cmd / custom script

3. Off-Site / S3 Backups
   - Frequency: Weekly
   - Retention: 90 days
   - Scope: Critical data only
   - Tool: restic (encrypted) to Backblaze B2 / Wasabi
```

### Implementation Script

```bash
#!/bin/bash
# Complete backup strategy for Hetzner infrastructure

set -euo pipefail

BACKUP_ROOT="/mnt/storagebox/backup"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
HOST=$(hostname)
RETENTION_LOCAL=30
RETENTION_CLOUD=90
LOG="/var/log/hetzner-backup.log"

log() {
  echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" | tee -a "$LOG"
}

# 1. Ensure Storage Box is mounted
if ! mountpoint -q /mnt/storagebox; then
  log "Mounting Storage Box..."
  sshfs -o IdentityFile=/root/.ssh/storagebox_key \
    U123456@u123456.your-storagebox.de:/backup /mnt/storagebox \
    || { log "FAILED: Storage Box mount"; exit 1; }
fi

# 2. Database backups
log "Backing up databases..."
mkdir -p "$BACKUP_ROOT/$HOST/databases/$TIMESTAMP"

# PostgreSQL
if command -v pg_dumpall &> /dev/null; then
  su - postgres -c "pg_dumpall" | gzip > \
    "$BACKUP_ROOT/$HOST/databases/$TIMESTAMP/pg_dumpall.sql.gz"
  log "PostgreSQL backup: $?"
fi

# MySQL
if command -v mysqldump &> /dev/null; then
  mysqldump --all-databases --single-transaction --routines --triggers | gzip > \
    "$BACKUP_ROOT/$HOST/databases/$TIMESTAMP/mysql_dumpall.sql.gz"
  log "MySQL backup: $?"
fi

# 3. Application data
log "Backing up application data..."
tar czf "$BACKUP_ROOT/$HOST/configs_$TIMESTAMP.tar.gz" /etc/nginx /etc/ssl /etc/docker
log "Config backup: $?"

# 4. Docker volumes
log "Backing up Docker volumes..."
for volume in $(docker volume ls -q 2>/dev/null); do
  docker run --rm -v "$volume":/data:ro \
    -v "$BACKUP_ROOT/$HOST/docker/$TIMESTAMP":/backup \
    alpine tar czf "/backup/${volume}.tar.gz" -C /data . 2>/dev/null
done

# 5. Cleanup old backups (local retention)
log "Cleaning up backups > $RETENTION_LOCAL days..."
find "$BACKUP_ROOT/$HOST" -type f -mtime +$RETENTION_LOCAL -delete
find "$BACKUP_ROOT/$HOST" -type d -empty -delete

# 6. Optional: Sync to S3 for off-site
if [ -n "${B2_REPO:-}" ]; then
  log "Syncing to off-site storage..."
  restic backup "$BACKUP_ROOT/$HOST" \
    --repo "$B2_REPO" \
    --password-file /etc/restic-password \
    --host "$HOST" \
    --tag "daily"
  # Remove old snapshots
  restic forget --repo "$B2_REPO" \
    --password-file /etc/restic-password \
    --keep-daily 7 --keep-weekly 4 --keep-monthly 3
  log "Off-site backup: $?"
fi

log "Backup completed successfully"
```

## Crontab Schedule

```cron
# Hetzner backup schedule

# Daily backup at 2 AM
0 2 * * * /usr/local/bin/backup.sh >> /var/log/backup.log 2>&1

# Hourly incremental (databases only)
0 * * * * /usr/local/bin/db-incremental.sh >> /var/log/db-backup.log 2>&1

# Weekly snapshot (Sunday 4 AM)
0 4 * * 0 /usr/local/bin/create-snapshot.sh >> /var/log/snapshot.log 2>&1

# Monthly off-site sync (1st day at 5 AM)
0 5 1 * * /usr/local/bin/offsite-sync.sh >> /var/log/offsite.log 2>&1

# Backup verification (every 3 months)
0 6 1 */3 * /usr/local/bin/verify-backups.sh >> /var/log/verify.log 2>&1
```

## Best Practices

- Use Storage Box for file-level backups (databases, configs, application data)
- Use Cloud Snapshots for full server state capture and quick recovery
- Use S3-compatible off-site storage (Backblaze B2, Wasabi) for DR
- Always encrypt backups at rest (gpg, restic, or Storage Box encryption)
- Implement a 3-2-1 backup strategy: 3 copies, 2 media types, 1 off-site
- Test backup restoration quarterly (not just backup creation)
- Use automated snapshot rotation to manage storage costs
- Enable Hetzner's built-in Cloud backup on all production instances
- Set up monitoring alerts for backup failures (Prometheus Blackbox, Cron monitoring)
- Mount Storage Box via SSHFS with key-based auth (no password in scripts)
- Use rsync for large initial syncs, then incremental backups
- Document RPO and RTO expectations for each backup tier
- Use restic for encrypted, deduplicated, cloud-native backups
- Never store backup credentials in scripts — use environment variables or vaults
