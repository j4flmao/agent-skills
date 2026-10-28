# Workspace Isolation

Giving every agent task its own workspace that other tasks, tenants and the host cannot see or modify: provisioning models, git worktrees and overlays, identity and credential scoping per workspace, lifecycle, and cleanup guarantees.

## Isolation Requirements

| Requirement | Meaning |
|-------------|---------|
| Per-task privacy | Task A cannot read Task B's files, env, processes or network |
| Per-tenant separation | Tenants never share sandboxes, volumes, caches with write access, or credentials |
| Host protection | No host paths except explicitly mounted read-only inputs |
| Clean start | Each task starts from a known image/snapshot; no residue from previous tasks |
| Bounded lifetime | Workspaces are destroyed or archived when the task ends |

## Provisioning Models

| Model | Isolation | Start latency | Use |
|-------|-----------|---------------|-----|
| Fresh sandbox per task | Strongest | Highest | Untrusted code, multi-tenant |
| Warm pool, reset from snapshot | Strong | Low | High-throughput platforms |
| Long-lived per-user workspace | Moderate | None after first | Interactive coding assistants |
| Shared sandbox with directories per task | Weak | Lowest | Never for untrusted or multi-tenant code |

Warm pools must reset from a clean snapshot (VM restore or new container from image), never by deleting known files.

## Repository Workspaces

### Git worktrees (same trust domain)
For multiple concurrent tasks on one repository within one user's trust domain, worktrees give separate checkouts sharing the object store:

```bash
git -C /repos/app fetch origin
git -C /repos/app worktree add -b agent/task-123 /workspaces/task-123 origin/main
# ... task runs in /workspaces/task-123 ...
git -C /repos/app worktree remove --force /workspaces/task-123
git -C /repos/app branch -D agent/task-123
```

Worktrees share `.git` objects, hooks and config. Hooks run code; do not use shared worktrees across trust boundaries, and disable hooks for agent operations (`git -c core.hooksPath=/dev/null ...`).

### Overlay on a read-only base (cross-task)
```bash
mount -t overlay overlay \
  -o lowerdir=/bases/app-main-abc123,upperdir=/ws/task-123/upper,workdir=/ws/task-123/work \
  /ws/task-123/merged
```

The base checkout is shared read-only; each task's changes live in its own `upperdir`, which can be diffed, archived or discarded. Inside containers, the runtime's overlay storage does this automatically.

### Fresh clone per task (cross-tenant)
Clone into the sandbox using a short-lived, repository-scoped token (e.g. a GitHub App installation token limited to one repository and the needed permissions). Do not reuse a host checkout across tenants.

## Identity and Credentials per Workspace

- One identity per task or tenant: separate Unix UID/user namespace mapping, service account, or VM.
- Credentials are issued just-in-time, scoped to the task's resources, and expire quickly (STS tokens, GitHub App tokens, Vault dynamic secrets).
- Prefer brokered access: the harness performs privileged operations (push, deploy, API calls) on behalf of the sandbox after policy checks, so the sandbox never holds the credential.
- Never pass the operator's personal credentials into agent workspaces.

```text
sandbox ──request("git push agent/task-123")──► harness broker
          policy: branch prefix agent/*, repo allow-list, diff size limit
          broker uses its own short-lived token ──► Git host
```

## Shared Caches Without Leakage

Dependency caches speed up tasks but can leak or be poisoned.

| Cache | Safe pattern |
|-------|--------------|
| Package downloads (pip/npm/cargo) | Shared read-through proxy/mirror outside sandboxes; sandboxes get read-only access |
| Build caches | Per-tenant, content-addressed; never writable across tenants |
| Model/tool binaries | Read-only mounts from a verified store |

A writable shared cache lets one task plant malicious artifacts for the next.

## Lifecycle

```text
requested ─► provisioning ─► ready ─► running ─► finishing ─► archived ─► destroyed
                 │                                   │
                 └─► failed (cleanup) ◄──────────────┘ timeout / budget / error
```

| Phase | Actions |
|-------|---------|
| Provisioning | Create sandbox from pinned image/snapshot, mount inputs read-only, issue scoped credentials |
| Running | Enforce quotas and network policy; log tool calls |
| Finishing | Collect outputs from designated paths; revoke credentials |
| Archived | Store diff/snapshot with TTL if needed for audit or resume |
| Destroyed | Delete containers/VMs, volumes, overlay layers, worktrees; verify deletion |

Run a periodic reaper that finds workspaces past their deadline (by label/annotation and creation time) and destroys them; leaked workspaces are both cost and data exposure.

## Multi-Tenant Checks

- Labels on every resource: `tenant`, `task`, `expires-at`; admission policies reject sandboxes without them.
- Separate namespaces/projects per tenant where the platform allows; never schedule different tenants' untrusted code in the same container or VM.
- Audit trail: who started the task, inputs, credentials issued, egress, outputs.

## Verification Tests

- From inside a sandbox, attempt to list other workspaces' paths, read `/proc/*/environ` of other tasks, reach other sandboxes' IPs: all must fail.
- After cleanup, assert that volumes, overlay dirs, worktrees and credentials no longer exist.
- Restore a warm-pool sandbox and assert no files from the previous task remain.

## Checklist

- [ ] One sandbox per task (or strictly reset warm pool) for untrusted code
- [ ] Worktrees only within a single trust domain; hooks disabled for agents
- [ ] Credentials just-in-time, scoped, revoked at task end; brokered where possible
- [ ] Shared caches read-only to sandboxes
- [ ] Lifecycle with deadlines and a reaper; resources labeled by tenant and task
- [ ] Isolation verified by automated escape-attempt tests
