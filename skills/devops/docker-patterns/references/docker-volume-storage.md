# Container Storage and Volumes

## Storage Drivers
Overlay2: default, efficient layer storage. devicemapper: legacy, direct-lvm mode only. aufs: deprecated, overlay2 preferred. btrfs/zfs: snapshot-capable, advanced features. vfs: simple, no CoW, for testing only. Choose based on Linux distribution and kernel support.

## Volume Types
bind mounts: host path mounted into container, full control, host-dependent. named volumes: Docker-managed, portable across hosts, backup with --volumes-from. tmpfs mounts: in-memory, non-persistent, for secrets/temp data. Volume drivers: local (default), NFS, SSHFS, cloud block storage.

## Volume Operations
docker volume create --driver local --opt type=nfs --opt o=addr=... Create named NFS volume. docker volume ls List volumes. docker volume prune Remove unused volumes. docker run -v myvol:/data Use named volume. docker run --mount type=bind,source=/host,target=/container Use bind mount.

## Backup and Restore
Backup: docker run --rm --volumes-from source -v $(pwd):/backup alpine tar czf /backup/volume.tar.gz /data. Restore: docker run --rm --volumes-from target -v $(pwd):/backup alpine tar xzf /backup/volume.tar.gz -C /data. Use restic or duplicati for encrypted off-site backups.

## Compose Volume Configuration
volumes: db-data: driver: local. Named volumes declared at top level. Bind mounts with :ro for read-only. Volume labels for metadata. External volumes for pre-created volumes. Volume mounts with SELinux options (:z, :Z).

## Performance Considerations
bind mounts: near-native performance. named volumes: slight overhead for CoW layer. tmpfs: fastest, memory-limited. NFS volumes: network latency, use only when necessary. SSD-backed storage for database workloads. Avoid CoW layers for write-heavy data.

## References
- docker-fundamentals.md -- Fundamentals
- compose-networking.md -- Compose
- security-best-practices.md -- Security
