# State Persistence and Snapshots

Preserving and restoring sandbox state for agent systems: what state exists, filesystem-level versus memory-level snapshots, microVM snapshot/restore, container checkpointing, fork-based speculative execution, and the correctness and security caveats of restoring live processes.

## State Layers

| Layer | Examples | Persistence technique |
|-------|----------|-----------------------|
| Task metadata | Plan, step index, tool-call history, budgets | Database / durable workflow history |
| Workspace files | Repo checkout, generated code, build outputs | Volume snapshots, overlay layers, object storage tarballs, git commits |
| Installed environment | Packages installed during the task | Image layer commit, filesystem snapshot |
| Process memory | Running REPL, language server, dev server | VM snapshot, CRIU checkpoint |
| External side effects | API calls made, messages sent | Idempotency keys and effect log (not snapshotable) |

Choose the cheapest layer that lets the task resume. Most agents need workspace + metadata only; memory snapshots matter for fast cold start and forking.

## Filesystem Snapshots

| Technique | Granularity | Notes |
|-----------|-------------|-------|
| Git commit per step | Tracked files | Cheap diffs, human-readable history; ignores untracked large files unless added |
| Overlay filesystem upper dir | All writes since base | Archive the upper layer; restore over the same base image |
| Copy-on-write filesystem (btrfs/ZFS) snapshots | Volume | Instant, space-efficient on the host |
| Block-level (LVM thin, cloud disk snapshots) | Disk | Works for VMs; slower to create remotely |
| Tarball to object storage | Directory | Portable across hosts; compress and checksum |

```bash
# ZFS: snapshot and clone a task workspace for a branch
zfs snapshot tank/ws/task-123@step-7
zfs clone tank/ws/task-123@step-7 tank/ws/task-123-fork-a

# portable archive with integrity check
tar --zstd -C /workspace -cf "/snapshots/task-123-step-7.tar.zst" .
sha256sum "/snapshots/task-123-step-7.tar.zst" > "/snapshots/task-123-step-7.tar.zst.sha256"
```

## Firecracker Snapshots

Firecracker can snapshot a paused microVM (guest memory + device state) and restore it, which gives sub-second "warm" starts from a prepared environment.

```bash
# pause, then create a full snapshot via the API socket
curl --unix-socket /run/fc-task.sock -X PATCH http://localhost/vm \
  -H 'Content-Type: application/json' -d '{"state": "Paused"}'

curl --unix-socket /run/fc-task.sock -X PUT http://localhost/snapshot/create \
  -H 'Content-Type: application/json' \
  -d '{"snapshot_type": "Full", "snapshot_path": "/snap/vmstate", "mem_file_path": "/snap/mem"}'

# restore into a fresh Firecracker process
curl --unix-socket /run/fc-new.sock -X PUT http://localhost/snapshot/load \
  -H 'Content-Type: application/json' \
  -d '{"snapshot_path": "/snap/vmstate", "mem_backend": {"backend_type": "File", "backend_path": "/snap/mem"}, "resume_vm": true}'
```

Notes:
- Disk images are not part of the snapshot files; snapshot or clone the block device consistently at the same moment.
- Restoring the same snapshot many times clones memory contents, including RNG state, keys, and identifiers inside the guest. Reseed randomness after restore (Firecracker exposes VMGenID on supported versions/guests for this) and do not bake secrets into base snapshots.
- Snapshots are tied to the Firecracker version and CPU features; restore on compatible hosts (use CPU templates to normalize).

## Container Checkpointing (CRIU)

CRIU checkpoints process trees in a container (memory, file descriptors, some sockets).

```bash
# Podman
podman container checkpoint task-123 --export=/snap/task-123.tar.gz
podman container restore --import=/snap/task-123.tar.gz --name task-123-restored
```

- Kubernetes has a kubelet checkpoint API (forensic container checkpointing) that produces an archive; restoring requires additional tooling.
- gVisor supports `runsc checkpoint` / `runsc restore` for its sandboxes.
- Open TCP connections, GPU state and some kernel resources may not restore; design processes to reconnect.

## Durable Task State

Keep the agent's logical progress outside the sandbox so a lost sandbox is recoverable:

```python
from dataclasses import dataclass
from datetime import datetime


@dataclass(frozen=True, slots=True)
class StepRecord:
    task_id: str
    step: int
    tool: str
    args_hash: str
    result_ref: str           # pointer to stored output, not the output itself
    workspace_snapshot: str   # e.g. "s3://snapshots/task-123/step-7.tar.zst"
    created_at: datetime
```

Resume procedure:
1. Load latest `StepRecord`.
2. Provision a sandbox and restore `workspace_snapshot` (verify checksum).
3. Replay nothing that has external side effects; continue from `step + 1`.
4. If using a durable workflow engine (see `durable-execution-frameworks.md`), the engine's history plays this role.

## Forking for Speculative Execution

Snapshots enable trying alternatives in parallel:

```text
          step 7 snapshot
           ┌────┴────┐
       fork A      fork B        (different plans or patches)
         │           │
       tests       tests
         └─── pick best result, discard the other ───┘
```

Rules:
- Each fork gets its own writable layer/volume and its own network identity.
- Forks must not perform external side effects (or must use isolated test credentials); otherwise both branches act in the real world.
- Garbage-collect losing forks promptly.

## Retention and Security

| Concern | Practice |
|---------|----------|
| Snapshots contain secrets or user data | Encrypt at rest, scope access per tenant, avoid secrets in snapshotted environments |
| Storage growth | TTLs per snapshot type; keep only the latest N per task plus release checkpoints |
| Integrity | Store checksums; verify before restore |
| Tampering | Treat snapshots produced by untrusted code as untrusted inputs; never restore them into higher-privilege environments |
| Compliance | Deletion requests must cover snapshots and archives |

## Checklist

- [ ] Logical task state stored outside the sandbox
- [ ] Workspace snapshots per step with checksums and TTLs
- [ ] Memory snapshots only where cold-start or forking needs them; RNG reseeded, no baked secrets
- [ ] Disk and memory captured consistently for VM snapshots
- [ ] Forks isolated and side-effect free
- [ ] Snapshots encrypted and tenant-scoped
