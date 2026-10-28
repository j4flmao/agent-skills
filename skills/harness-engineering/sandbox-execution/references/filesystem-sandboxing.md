# Filesystem Sandboxing for Agent Code Execution

Restricting what files sandboxed agent code can read and write: mount layouts, read-only roots, writable scratch areas, path policies, and the Linux mechanisms that enforce them (mount namespaces, bubblewrap, Landlock, container runtime options). MicroVM-level isolation is in `microvm-isolation.md`.

## Goals

1. The agent can read the inputs it needs and nothing else (no host home, SSH keys, cloud credentials, Docker socket).
2. It can write only to a bounded workspace and scratch space.
3. Writes cannot escape via symlinks, hard links, or special files.
4. Disk usage is capped (see `resource-quota-enforcement.md`).

## Reference Mount Layout

```text
/                 read-only   minimal runtime image (OS + toolchains)
/workspace        read-write  task workspace (bind mount or volume), size-limited
/tmp              read-write  tmpfs, size-limited, noexec where tooling allows
/inputs           read-only   task inputs (repo snapshot, datasets)
/proc             fresh procfs for the sandbox PID namespace
/dev              minimal: null, zero, random, urandom, tty (no block devices)
(not mounted)     /var/run/docker.sock, /home/*, ~/.ssh, ~/.aws, host /etc secrets
```

## Mechanisms Compared

| Mechanism | Layer | Strength | Notes |
|-----------|-------|----------|-------|
| Mount namespace + bind mounts | Kernel | Strong for visibility | Basis of containers and bubblewrap |
| Read-only root filesystem | Mount flags | Strong | Pair with explicit writable mounts |
| Landlock LSM (Linux ≥ 5.13) | Kernel, unprivileged | Path-based allow-lists inside a process tree | Good second layer; ABI versions add rights over time |
| seccomp | Syscall filter | Blocks dangerous syscalls (`mount`, `ptrace`, ...) | Not path-aware |
| AppArmor / SELinux | MAC | Path or label-based policy | Host-dependent setup |
| gVisor / microVM | Separate kernel | Strongest against kernel exploits | Higher overhead |

Use at least two layers: namespace-based visibility plus a syscall filter, and a VM boundary for untrusted code from the internet.

## bubblewrap (unprivileged sandbox)

```bash
bwrap \
  --unshare-all \
  --die-with-parent \
  --new-session \
  --ro-bind /usr /usr \
  --symlink usr/lib /lib \
  --symlink usr/lib64 /lib64 \
  --symlink usr/bin /bin \
  --ro-bind /etc/ssl /etc/ssl \
  --ro-bind "$TASK_INPUTS" /inputs \
  --bind "$TASK_WORKSPACE" /workspace \
  --tmpfs /tmp \
  --proc /proc \
  --dev /dev \
  --chdir /workspace \
  --clearenv \
  --setenv PATH /usr/bin \
  --setenv HOME /workspace \
  --cap-drop ALL \
  -- python3 /workspace/main.py
```

- `--unshare-all` creates new user, mount, PID, IPC, UTS, cgroup and network namespaces; the network is unavailable unless `--share-net` is added.
- `--new-session` prevents TIOCSTI terminal injection into the parent.
- `--clearenv` drops inherited secrets in environment variables.
- Bind only the directories needed; the host root is never mounted.

## Docker / OCI Runtime Options

```bash
docker run --rm \
  --read-only \
  --tmpfs /tmp:rw,nosuid,nodev,noexec,size=256m \
  --mount type=bind,src="$TASK_INPUTS",dst=/inputs,readonly \
  --mount type=volume,src="ws-$TASK_ID",dst=/workspace \
  --user 65534:65534 \
  --cap-drop ALL \
  --security-opt no-new-privileges \
  --network none \
  sandbox-runtime:2026.10 python /workspace/main.py
```

Never mount `/var/run/docker.sock` or host paths like `/`, `/home`, `/root` into an agent sandbox: either gives full host control or credential access.

## Landlock as an Inner Layer

Landlock lets an unprivileged process restrict its own (and its children's) file access. Typical use: the sandbox launcher applies a ruleset, then executes the agent's command.

```rust
// Rust `landlock` crate: restrict this process tree, then exec the agent command.
use landlock::{path_beneath_rules, Access, AccessFs, Ruleset, RulesetAttr, RulesetCreatedAttr, RulesetStatus, ABI};

fn restrict() -> Result<(), Box<dyn std::error::Error>> {
    let abi = ABI::V2;
    let status = Ruleset::default()
        .handle_access(AccessFs::from_all(abi))?
        .create()?
        .add_rules(path_beneath_rules(&["/usr", "/inputs"], AccessFs::from_read(abi)))?
        .add_rules(path_beneath_rules(&["/workspace", "/tmp"], AccessFs::from_all(abi)))?
        .restrict_self()?;
    if status.ruleset != RulesetStatus::FullyEnforced {
        return Err(format!("landlock not fully enforced: {:?}", status.ruleset).into());
    }
    Ok(())
}
```

Check the kernel's Landlock ABI version at startup and fail closed if the required rights (e.g. truncate, IOCTL on devices, network) are not supported.

## Path Policy for Agent File Tools

When the agent reads/writes through a harness tool (not a shell), validate paths in the harness:

```python
import os
from pathlib import Path

WORKSPACE = Path("/workspace").resolve()

class PathPolicyError(Exception):
    pass

def resolve_in_workspace(user_path: str) -> Path:
    candidate = (WORKSPACE / user_path).resolve(strict=False)   # resolves symlinks and '..'
    if candidate != WORKSPACE and WORKSPACE not in candidate.parents:
        raise PathPolicyError(f"path escapes workspace: {user_path!r} -> {candidate}")
    return candidate

def safe_write(user_path: str, data: bytes, max_bytes: int = 10 * 1024 * 1024) -> None:
    if len(data) > max_bytes:
        raise PathPolicyError(f"write of {len(data)} bytes exceeds limit {max_bytes} for {user_path!r}")
    target = resolve_in_workspace(user_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(target, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o644)
    with os.fdopen(fd, "wb") as fh:
        fh.write(data)
```

- Resolve after joining; reject anything outside the root.
- `O_NOFOLLOW` blocks a final-component symlink swapped in after validation (TOCTOU); for full protection use `openat2` with `RESOLVE_BENEATH` on Linux ≥ 5.6 or enforce at the kernel layer (Landlock/mounts).
- Deny writes to special files (FIFOs, devices) and cap file count as well as size.

## Inputs and Outputs

- Copy inputs into the sandbox or bind them read-only; never give write access to the source of truth.
- Collect outputs from a dedicated `/workspace/out` directory; scan size and type before accepting them into the host.
- Archives produced by the agent are untrusted: extract with path checks (zip-slip) and size limits (zip bombs).

## Cleanup

- Ephemeral workspaces per task; delete the volume or overlay upper layer after completion.
- Reused sandboxes must be reset from a clean snapshot, not by deleting files the agent created (it may have created hidden files elsewhere it could write).

## Pitfalls

- Mounting the whole repository read-write when only a subdirectory is needed.
- Forgetting `/proc` exposure: a shared PID namespace can reveal host processes and environments.
- Leaving credentials in environment variables or `~/.config` inside the image.
- Path checks with string prefix matching (`/workspace2` passes a `startswith("/workspace")` check).

## Checklist

- [ ] Read-only root; explicit writable mounts only
- [ ] No Docker socket, home directories or credential paths mounted
- [ ] Environment cleared; secrets injected only via scoped, short-lived mechanisms if needed
- [ ] Harness path policy resolves and checks containment; `O_NOFOLLOW`/`openat2`
- [ ] Second kernel layer (Landlock/seccomp/LSM) or VM boundary for untrusted code
- [ ] Workspaces ephemeral or restored from clean snapshots
