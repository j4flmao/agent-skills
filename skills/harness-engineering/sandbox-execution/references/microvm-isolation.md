# MicroVM Isolation

## Overview

MicroVM isolation provides hardware-level separation between agent execution
environments using lightweight virtual machines. Unlike container-based isolation
which shares the host kernel, microVMs run a dedicated guest kernel with a minimal
attack surface, providing defense against kernel exploits that could escape
container boundaries.

This reference covers three primary microVM technologies:
- **gVisor (runsc)**: User-space kernel that intercepts syscalls without hardware virtualization
- **Kata Containers**: Lightweight VMs with OCI-compatible container runtime
- **Firecracker**: Minimal VMM designed for serverless and container workloads

## Technology Comparison

```
┌──────────────────────────────────────────────────────────────────┐
│              ISOLATION SPECTRUM                                   │
│                                                                   │
│  Weaker ◄────────────────────────────────────────────► Stronger  │
│                                                                   │
│  Namespace    gVisor        Kata          Firecracker    Bare     │
│  + seccomp   (ptrace)      Containers    microVM        Metal VM │
│                                                                   │
│  Boot: <1ms   Boot: ~150ms  Boot: ~500ms  Boot: ~125ms  Boot: >5s│
│  Overhead: 0%  Overhead: ~5%  Overhead: ~10% Overhead: ~3%        │
│  Syscalls: ✓   Syscalls: ~70% Syscalls: ✓   Syscalls: ✓          │
│  Kernel: shared Kernel: user  Kernel: guest Kernel: guest         │
└──────────────────────────────────────────────────────────────────┘
```

| Feature | gVisor | Kata Containers | Firecracker |
|---------|--------|-----------------|-------------|
| **Isolation model** | User-space kernel (Sentry) | Lightweight VM + kata-agent | Minimal VMM + microVM |
| **Boot time** | ~150ms | ~500ms | ~125ms |
| **Memory overhead** | ~20MB per sandbox | ~40MB per sandbox | ~5MB per microVM |
| **Syscall coverage** | ~70% of Linux syscalls | Full Linux syscall support | Full Linux syscall support |
| **GPU support** | Limited | Yes (GPU passthrough) | No native GPU support |
| **Networking** | netstack (user-space) | virtio-net | virtio-net |
| **Storage** | Gofer (9P filesystem) | virtio-blk / virtio-fs | virtio-blk |
| **OCI compatible** | Yes (as OCI runtime) | Yes (as OCI runtime) | Via containerd-shim |
| **Best for** | Fast untrusted code exec | Full VM isolation with containers | Serverless / multi-tenant |

## gVisor (runsc)

### Architecture

```
┌────────────────────────────────────────────────────┐
│                 HOST KERNEL                          │
│                                                      │
│  ┌────────────────────────────────────────────────┐  │
│  │              gVisor Runtime                     │  │
│  │                                                 │  │
│  │  ┌──────────────────────┐  ┌────────────────┐  │  │
│  │  │     SENTRY           │  │    GOFER       │  │  │
│  │  │  (User-space kernel) │  │  (File proxy)  │  │  │
│  │  │                      │  │                │  │  │
│  │  │  ┌────────────────┐  │  │  ┌──────────┐  │  │  │
│  │  │  │ Syscall table  │  │  │  │ 9P server│  │  │  │
│  │  │  │ Network stack  │  │  │  │ I/O proxy│  │  │  │
│  │  │  │ Memory mgmt    │  │  │  │          │  │  │  │
│  │  │  │ Process mgmt   │  │  │  └──────────┘  │  │  │
│  │  │  └────────────────┘  │  │                │  │  │
│  │  │         ▲             │  │        ▲       │  │  │
│  │  └─────────┼─────────────┘  └────────┼──────┘  │  │
│  │            │ syscall trap            │ 9P/fs   │  │
│  │  ┌─────────┴─────────────────────────┴──────┐  │  │
│  │  │           APPLICATION SANDBOX             │  │  │
│  │  │  ┌────────────┐  ┌──────────────────────┐ │  │  │
│  │  │  │ Agent Code │  │ Dependencies/Runtime │ │  │  │
│  │  │  └────────────┘  └──────────────────────┘ │  │  │
│  │  └──────────────────────────────────────────┘  │  │
│  └────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────┘
```

### Configuration

```python
import json
import subprocess
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class GVisorConfig:
    """Configuration for gVisor (runsc) sandbox."""

    # Platform selection: ptrace (slower, no KVM needed) or kvm (faster, needs KVM)
    platform: str = "kvm"

    # Network mode: sandbox (user-space stack) or host (shared host network)
    network: str = "sandbox"

    # File access mode: exclusive (no shared access) or shared (host file sharing)
    file_access: str = "exclusive"

    # Debug logging
    debug: bool = False
    debug_log: str = "/var/log/runsc/debug.log"

    # Overlay filesystem for writable layers
    overlay: bool = True
    overlay2: str = "all:memory"  # Use memory-backed overlay

    # Resource limits
    cpu_num: int = 2
    memory_limit_bytes: int = 2 * 1024 * 1024 * 1024  # 2GB

    # Security options
    rootless: bool = False
    directfs: bool = True  # Direct filesystem access (faster than 9P)

    # Seccomp profile
    seccomp_profile: str = "default"

    def to_runtime_config(self) -> dict:
        """Generate OCI runtime configuration."""
        return {
            "ociVersion": "1.0.2",
            "process": {
                "user": {"uid": 1000, "gid": 1000},
                "args": [],
                "env": [],
                "cwd": "/workspace",
                "capabilities": {
                    "bounding": [],  # No capabilities by default
                    "effective": [],
                    "permitted": [],
                },
                "rlimits": [
                    {"type": "RLIMIT_NOFILE", "hard": 1024, "soft": 1024},
                    {"type": "RLIMIT_NPROC", "hard": 256, "soft": 256},
                ],
            },
            "root": {
                "path": "rootfs",
                "readonly": True,
            },
            "mounts": [
                {"destination": "/workspace", "type": "tmpfs", "options": ["rw", "size=2g"]},
                {"destination": "/proc", "type": "proc", "source": "proc"},
                {"destination": "/dev", "type": "tmpfs", "source": "tmpfs", "options": ["nosuid", "strictatime", "mode=755", "size=65536k"]},
            ],
            "linux": {
                "resources": {
                    "cpu": {
                        "quota": self.cpu_num * 100000,
                        "period": 100000,
                    },
                    "memory": {
                        "limit": self.memory_limit_bytes,
                        "swap": self.memory_limit_bytes,  # No swap
                    },
                    "pids": {"limit": 256},
                },
                "namespaces": [
                    {"type": "pid"},
                    {"type": "network"},
                    {"type": "ipc"},
                    {"type": "uts"},
                    {"type": "mount"},
                    {"type": "user"},
                ],
                "seccomp": self._get_seccomp_profile(),
            },
        }

    def _get_seccomp_profile(self) -> dict:
        """Generate a restrictive seccomp profile for agent sandboxes."""
        return {
            "defaultAction": "SCMP_ACT_ERRNO",
            "defaultErrnoRet": 1,
            "architectures": ["SCMP_ARCH_X86_64"],
            "syscalls": [
                {
                    "names": [
                        "read", "write", "close", "fstat", "lseek",
                        "mmap", "mprotect", "munmap", "brk",
                        "rt_sigaction", "rt_sigprocmask", "ioctl",
                        "access", "pipe", "select", "sched_yield",
                        "mremap", "msync", "mincore", "madvise",
                        "dup", "dup2", "nanosleep", "getpid",
                        "socket", "connect", "sendto", "recvfrom",
                        "bind", "listen", "getsockname", "getpeername",
                        "clone", "fork", "execve", "exit",
                        "wait4", "kill", "uname", "fcntl",
                        "flock", "fsync", "fdatasync", "truncate",
                        "getcwd", "chdir", "mkdir", "rmdir",
                        "creat", "unlink", "readlink", "chmod",
                        "gettimeofday", "getuid", "getgid",
                        "geteuid", "getegid", "getppid",
                        "arch_prctl", "futex", "set_tid_address",
                        "clock_gettime", "clock_getres",
                        "exit_group", "epoll_create1", "epoll_ctl",
                        "epoll_wait", "openat", "newfstatat",
                        "readlinkat", "getrandom", "pread64",
                        "pwrite64", "statx", "memfd_create",
                    ],
                    "action": "SCMP_ACT_ALLOW",
                },
            ],
        }


class GVisorSandboxManager:
    """
    Manages gVisor-based sandboxes for agent code execution.
    """

    def __init__(self, runsc_path: str = "/usr/local/bin/runsc"):
        self.runsc_path = runsc_path
        self._sandboxes: dict[str, dict] = {}

    async def create(
        self,
        sandbox_id: str,
        config: GVisorConfig,
        rootfs_path: str,
    ) -> dict:
        """Create a new gVisor sandbox."""
        bundle_dir = Path(f"/var/run/sandboxes/{sandbox_id}")
        bundle_dir.mkdir(parents=True, exist_ok=True)

        # Write OCI config
        oci_config = config.to_runtime_config()
        with open(bundle_dir / "config.json", "w") as f:
            json.dump(oci_config, f)

        # Create rootfs symlink
        (bundle_dir / "rootfs").symlink_to(rootfs_path)

        # Create the sandbox
        cmd = [
            self.runsc_path,
            f"--platform={config.platform}",
            f"--network={config.network}",
            f"--file-access={config.file_access}",
            f"--overlay2={config.overlay2}",
            "--rootless" if config.rootless else "",
            "create",
            f"--bundle={bundle_dir}",
            sandbox_id,
        ]
        cmd = [c for c in cmd if c]  # Remove empty strings

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()

        if proc.returncode != 0:
            raise RuntimeError(
                f"Failed to create gVisor sandbox: {stderr.decode()}"
            )

        self._sandboxes[sandbox_id] = {
            "bundle_dir": str(bundle_dir),
            "config": config,
            "status": "created",
        }

        return {"sandbox_id": sandbox_id, "status": "created"}

    async def execute(self, sandbox_id: str, command: list[str]) -> dict:
        """Execute a command in a gVisor sandbox."""
        cmd = [self.runsc_path, "exec", sandbox_id, "--"] + command

        proc = await asyncio.create_subprocess_exec(
            *cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
        )
        stdout, stderr = await proc.communicate()

        return {
            "exit_code": proc.returncode,
            "stdout": stdout.decode(),
            "stderr": stderr.decode(),
        }

    async def destroy(self, sandbox_id: str) -> None:
        """Destroy a gVisor sandbox."""
        cmd = [self.runsc_path, "delete", "--force", sandbox_id]
        proc = await asyncio.create_subprocess_exec(*cmd)
        await proc.communicate()

        # Cleanup bundle directory
        import shutil
        bundle_dir = self._sandboxes.get(sandbox_id, {}).get("bundle_dir")
        if bundle_dir:
            shutil.rmtree(bundle_dir, ignore_errors=True)
        del self._sandboxes[sandbox_id]
```

## Kata Containers

### Architecture

```
┌────────────────────────────────────────────────────────────┐
│                     HOST OS                                 │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                containerd + shimv2                     │  │
│  │  ┌────────────────┐                                   │  │
│  │  │ kata-runtime   │──► OCI spec                       │  │
│  │  └────────┬───────┘                                   │  │
│  │           │                                            │  │
│  │           ▼                                            │  │
│  │  ┌────────────────────────────────────────────────┐   │  │
│  │  │          HYPERVISOR (QEMU/Cloud-HV/Dragonball) │   │  │
│  │  │                                                 │   │  │
│  │  │  ┌──────────────────────────────────────────┐  │   │  │
│  │  │  │           GUEST VM                        │  │   │  │
│  │  │  │                                           │  │   │  │
│  │  │  │  ┌─────────────┐  ┌────────────────────┐ │  │   │  │
│  │  │  │  │ Guest Kernel│  │ kata-agent         │ │  │   │  │
│  │  │  │  │ (minimal)   │  │ (gRPC server)      │ │  │   │  │
│  │  │  │  └─────────────┘  └────────────────────┘ │  │   │  │
│  │  │  │                                           │  │   │  │
│  │  │  │  ┌─────────────────────────────────────┐ │  │   │  │
│  │  │  │  │      CONTAINER WORKLOAD             │ │  │   │  │
│  │  │  │  │  ┌──────────┐  ┌────────────────┐  │ │  │   │  │
│  │  │  │  │  │ Agent    │  │ Dependencies   │  │ │  │   │  │
│  │  │  │  │  │ Code     │  │ (pip packages) │  │ │  │   │  │
│  │  │  │  │  └──────────┘  └────────────────┘  │ │  │   │  │
│  │  │  │  └─────────────────────────────────────┘ │  │   │  │
│  │  │  └───────────────────────────────────────────┘  │   │  │
│  │  └─────────────────────────────────────────────────┘   │  │
│  └───────────────────────────────────────────────────────┘  │
└────────────────────────────────────────────────────────────┘
```

### Configuration

```toml
# /etc/kata-containers/configuration.toml

[hypervisor.qemu]
path = "/usr/bin/qemu-system-x86_64"
kernel = "/usr/share/kata-containers/vmlinux.container"
image = "/usr/share/kata-containers/kata-containers.img"

# Machine configuration
machine_type = "q35"
default_vcpus = 1
default_maxvcpus = 8
default_memory = 512  # MB
default_maxmemory = 16384  # MB

# Security
confidential_guest = false
enable_iommu = false
firmware = ""

# Performance tuning
use_nvdimm = true
shared_fs = "virtio-fs"
virtio_fs_daemon = "/usr/libexec/virtiofsd"
virtio_fs_cache_size = 1024  # MB
virtio_fs_cache = "auto"

# Memory backend
memory_slots = 10
memory_offset = "0x40000000"
enable_swap = false

# Block device
block_device_driver = "virtio-blk"
block_device_cache_set = true
block_device_cache_direct = true

# Network
default_bridges = 1
disable_new_netns = false
internetworking_model = "tcfilter"

[runtime]
enable_debug = false
enable_tracing = false
disable_guest_seccomp = false
sandbox_cgroup_only = false
vfio_mode = "guest-kernel"

# Agent configuration
[agent.kata]
enable_tracing = false
debug_console_enabled = false
kernel_modules = []
```

```python
import asyncio
from dataclasses import dataclass


@dataclass
class KataContainerConfig:
    """Configuration for Kata Containers sandbox."""
    vcpus: int = 2
    memory_mb: int = 1024
    rootfs_image: str = "python:3.11-slim"
    hypervisor: str = "qemu"  # qemu, cloud-hypervisor, dragonball
    shared_fs: str = "virtio-fs"
    gpu_passthrough: bool = False
    gpu_device_ids: list[str] | None = None

    def to_pod_spec(self) -> dict:
        """Generate Kubernetes pod spec with Kata runtime class."""
        annotations = {
            "io.katacontainers.config.hypervisor.default_vcpus": str(self.vcpus),
            "io.katacontainers.config.hypervisor.default_memory": str(self.memory_mb),
        }

        if self.gpu_passthrough and self.gpu_device_ids:
            annotations["io.katacontainers.config.hypervisor.hotplug_vfio_on_root_bus"] = "true"

        spec = {
            "apiVersion": "v1",
            "kind": "Pod",
            "metadata": {
                "annotations": annotations,
            },
            "spec": {
                "runtimeClassName": "kata-qemu",
                "containers": [{
                    "name": "agent-sandbox",
                    "image": self.rootfs_image,
                    "resources": {
                        "limits": {
                            "cpu": str(self.vcpus),
                            "memory": f"{self.memory_mb}Mi",
                        },
                    },
                    "securityContext": {
                        "readOnlyRootFilesystem": True,
                        "runAsNonRoot": True,
                        "runAsUser": 1000,
                        "capabilities": {"drop": ["ALL"]},
                    },
                    "volumeMounts": [{
                        "name": "workspace",
                        "mountPath": "/workspace",
                    }],
                }],
                "volumes": [{
                    "name": "workspace",
                    "emptyDir": {"sizeLimit": "10Gi"},
                }],
            },
        }

        if self.gpu_passthrough and self.gpu_device_ids:
            spec["spec"]["containers"][0]["resources"]["limits"]["nvidia.com/gpu"] = "1"

        return spec
```

## Firecracker MicroVM

### Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      HOST OS                                 │
│                                                              │
│  ┌─────────────────────────────────────────────────────────┐ │
│  │                  FIRECRACKER VMM                         │ │
│  │  ┌──────────┐  ┌──────────────┐  ┌───────────────────┐  │ │
│  │  │ REST API │  │ Rate Limiter │  │ Seccomp Filter    │  │ │
│  │  │ (Socket) │  │ (CPU/Net/Blk)│  │ (allowlist only)  │  │ │
│  │  └──────────┘  └──────────────┘  └───────────────────┘  │ │
│  │                                                          │ │
│  │  ┌──────────────────────────────────────────────────┐   │ │
│  │  │              GUEST MICROVM                        │   │ │
│  │  │  ┌────────────────┐  ┌────────────────────────┐  │   │ │
│  │  │  │ Linux Kernel   │  │ Init System (minimal)  │  │   │ │
│  │  │  │ (5.10 minimal) │  │                        │  │   │ │
│  │  │  └────────────────┘  └────────────────────────┘  │   │ │
│  │  │                                                   │   │ │
│  │  │  ┌───────────┐ ┌──────────┐ ┌────────────────┐  │   │ │
│  │  │  │ virtio-blk│ │virtio-net│ │ vsock / MMDS   │  │   │ │
│  │  │  │ (rootfs)  │ │ (TAP)   │ │ (metadata)     │  │   │ │
│  │  │  └───────────┘ └──────────┘ └────────────────┘  │   │ │
│  │  │                                                   │   │ │
│  │  │  ┌────────────────────────────────────────────┐  │   │ │
│  │  │  │         AGENT WORKLOAD                      │  │   │ │
│  │  │  │  Python 3.11 + pandas + numpy + boto3       │  │   │ │
│  │  │  └────────────────────────────────────────────┘  │   │ │
│  │  └──────────────────────────────────────────────────┘   │ │
│  └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Python SDK

```python
import aiohttp
import asyncio
import json
import os
from dataclasses import dataclass, field
from pathlib import Path


@dataclass
class FirecrackerConfig:
    """Configuration for a Firecracker microVM."""
    vcpu_count: int = 2
    mem_size_mib: int = 1024
    kernel_image_path: str = "/var/lib/firecracker/vmlinux"
    rootfs_path: str = "/var/lib/firecracker/rootfs.ext4"
    socket_path: str = ""
    log_path: str = ""

    # Network
    host_dev_name: str = ""  # TAP device name
    guest_mac: str = "AA:FC:00:00:00:01"
    rx_rate_limiter_mbps: float = 100.0
    tx_rate_limiter_mbps: float = 100.0

    # Block device
    drive_id: str = "rootfs"
    is_root_device: bool = True
    is_read_only: bool = False
    rate_limiter_iops: int = 10000
    rate_limiter_bps: int = 100 * 1024 * 1024  # 100 MB/s

    # Snapshot
    snapshot_type: str = "Full"  # "Full" or "Diff"

    # Metadata (MMDS)
    mmds_config: dict = field(default_factory=dict)


class FirecrackerManager:
    """
    Manages Firecracker microVMs for agent sandbox execution.

    Provides APIs to create, configure, execute code in, snapshot,
    and destroy Firecracker microVMs.
    """

    def __init__(self, base_dir: str = "/var/lib/firecracker"):
        self.base_dir = Path(base_dir)
        self._vms: dict[str, dict] = {}

    async def create_vm(self, vm_id: str, config: FirecrackerConfig) -> dict:
        """Create and boot a Firecracker microVM."""
        # Set up paths
        socket_path = self.base_dir / f"{vm_id}.sock"
        log_path = self.base_dir / f"{vm_id}.log"
        config.socket_path = str(socket_path)
        config.log_path = str(log_path)

        # Create TAP device for networking
        tap_name = f"fc-{vm_id[:8]}"
        await self._create_tap_device(tap_name)
        config.host_dev_name = tap_name

        # Start Firecracker process
        fc_process = await asyncio.create_subprocess_exec(
            "/usr/bin/firecracker",
            "--api-sock", str(socket_path),
            "--log-path", str(log_path),
            "--level", "Warning",
            "--seccomp-level", "2",  # Advanced seccomp filtering
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        # Wait for socket to be ready
        await self._wait_for_socket(socket_path)

        # Configure the microVM via REST API
        async with aiohttp.UnixConnector(path=str(socket_path)) as conn:
            session = aiohttp.ClientSession(connector=conn)

            # Set boot source
            await session.put(
                "http://localhost/boot-source",
                json={
                    "kernel_image_path": config.kernel_image_path,
                    "boot_args": (
                        "console=ttyS0 reboot=k panic=1 pci=off "
                        "init=/sbin/init "
                        f"mem={config.mem_size_mib}M"
                    ),
                },
            )

            # Set machine config
            await session.put(
                "http://localhost/machine-config",
                json={
                    "vcpu_count": config.vcpu_count,
                    "mem_size_mib": config.mem_size_mib,
                    "smt": False,  # Disable SMT for security
                },
            )

            # Add root drive
            await session.put(
                f"http://localhost/drives/{config.drive_id}",
                json={
                    "drive_id": config.drive_id,
                    "path_on_host": config.rootfs_path,
                    "is_root_device": config.is_root_device,
                    "is_read_only": config.is_read_only,
                    "rate_limiter": {
                        "bandwidth": {
                            "size": config.rate_limiter_bps,
                            "refill_time": 1000,
                        },
                        "ops": {
                            "size": config.rate_limiter_iops,
                            "refill_time": 1000,
                        },
                    },
                },
            )

            # Add network interface
            await session.put(
                "http://localhost/network-interfaces/eth0",
                json={
                    "iface_id": "eth0",
                    "guest_mac": config.guest_mac,
                    "host_dev_name": config.host_dev_name,
                    "rx_rate_limiter": {
                        "bandwidth": {
                            "size": int(config.rx_rate_limiter_mbps * 125000),
                            "refill_time": 1000,
                        },
                    },
                    "tx_rate_limiter": {
                        "bandwidth": {
                            "size": int(config.tx_rate_limiter_mbps * 125000),
                            "refill_time": 1000,
                        },
                    },
                },
            )

            # Configure MMDS (Metadata service)
            if config.mmds_config:
                await session.put(
                    "http://localhost/mmds/config",
                    json={"network_interfaces": ["eth0"]},
                )
                await session.put(
                    "http://localhost/mmds",
                    json=config.mmds_config,
                )

            # Start the microVM
            await session.put(
                "http://localhost/actions",
                json={"action_type": "InstanceStart"},
            )

            await session.close()

        self._vms[vm_id] = {
            "process": fc_process,
            "socket_path": str(socket_path),
            "tap_name": tap_name,
            "config": config,
            "status": "running",
        }

        return {"vm_id": vm_id, "status": "running"}

    async def snapshot_vm(self, vm_id: str, snapshot_path: str) -> dict:
        """Create a snapshot of a running microVM."""
        vm = self._vms.get(vm_id)
        if not vm:
            raise ValueError(f"VM {vm_id} not found")

        socket_path = vm["socket_path"]
        config = vm["config"]

        async with aiohttp.UnixConnector(path=socket_path) as conn:
            session = aiohttp.ClientSession(connector=conn)

            # Pause the VM
            await session.patch(
                "http://localhost/vm",
                json={"state": "Paused"},
            )

            # Create snapshot
            await session.put(
                "http://localhost/snapshot/create",
                json={
                    "snapshot_type": config.snapshot_type,
                    "snapshot_path": f"{snapshot_path}/vmstate",
                    "mem_file_path": f"{snapshot_path}/memory",
                },
            )

            # Resume the VM
            await session.patch(
                "http://localhost/vm",
                json={"state": "Resumed"},
            )

            await session.close()

        return {
            "vm_id": vm_id,
            "snapshot_path": snapshot_path,
            "type": config.snapshot_type,
        }

    async def restore_vm(
        self,
        vm_id: str,
        snapshot_path: str,
        config: FirecrackerConfig,
    ) -> dict:
        """Restore a microVM from a snapshot."""
        socket_path = self.base_dir / f"{vm_id}.sock"
        log_path = self.base_dir / f"{vm_id}.log"

        # Start Firecracker in snapshot-restore mode
        fc_process = await asyncio.create_subprocess_exec(
            "/usr/bin/firecracker",
            "--api-sock", str(socket_path),
            "--log-path", str(log_path),
            stdout=asyncio.subprocess.PIPE,
            stderr=asyncio.subprocess.PIPE,
        )

        await self._wait_for_socket(socket_path)

        async with aiohttp.UnixConnector(path=str(socket_path)) as conn:
            session = aiohttp.ClientSession(connector=conn)

            # Load snapshot
            await session.put(
                "http://localhost/snapshot/load",
                json={
                    "snapshot_path": f"{snapshot_path}/vmstate",
                    "mem_backend": {
                        "backend_path": f"{snapshot_path}/memory",
                        "backend_type": "File",
                    },
                    "enable_diff_snapshots": True,
                    "resume_vm": True,
                },
            )

            await session.close()

        self._vms[vm_id] = {
            "process": fc_process,
            "socket_path": str(socket_path),
            "config": config,
            "status": "running",
        }

        return {"vm_id": vm_id, "status": "restored"}

    async def destroy_vm(self, vm_id: str) -> None:
        """Destroy a microVM and clean up resources."""
        vm = self._vms.get(vm_id)
        if not vm:
            return

        # Send shutdown action
        try:
            async with aiohttp.UnixConnector(path=vm["socket_path"]) as conn:
                session = aiohttp.ClientSession(connector=conn)
                await session.put(
                    "http://localhost/actions",
                    json={"action_type": "SendCtrlAltDel"},
                )
                await session.close()
        except Exception:
            pass

        # Kill the process if still running
        if vm["process"].returncode is None:
            vm["process"].kill()
            await vm["process"].wait()

        # Clean up TAP device
        await self._destroy_tap_device(vm.get("tap_name", ""))

        # Clean up socket
        socket_path = Path(vm["socket_path"])
        if socket_path.exists():
            socket_path.unlink()

        del self._vms[vm_id]

    async def _create_tap_device(self, name: str) -> None:
        """Create a TAP network device."""
        proc = await asyncio.create_subprocess_exec(
            "ip", "tuntap", "add", "dev", name, "mode", "tap",
        )
        await proc.communicate()
        proc = await asyncio.create_subprocess_exec(
            "ip", "link", "set", name, "up",
        )
        await proc.communicate()

    async def _destroy_tap_device(self, name: str) -> None:
        """Destroy a TAP network device."""
        if name:
            proc = await asyncio.create_subprocess_exec(
                "ip", "link", "del", name,
            )
            await proc.communicate()

    async def _wait_for_socket(self, socket_path: Path, timeout: float = 5.0) -> None:
        """Wait for the Firecracker API socket to become available."""
        elapsed = 0.0
        interval = 0.1
        while elapsed < timeout:
            if socket_path.exists():
                return
            await asyncio.sleep(interval)
            elapsed += interval
        raise TimeoutError(f"Socket {socket_path} not available after {timeout}s")
```

## Isolation Level Selection Algorithm

```python
def select_isolation_level(
    trust_level: str,        # "trusted", "semi-trusted", "untrusted"
    latency_requirement_ms: int,
    needs_gpu: bool,
    needs_full_syscalls: bool,
    max_overhead_percent: float,
) -> str:
    """
    Select the optimal isolation level based on workload requirements.

    Returns: "namespace", "gvisor", "kata", "firecracker"
    """
    if trust_level == "trusted" and latency_requirement_ms < 10:
        return "namespace"

    if needs_gpu:
        return "kata"  # Only Kata supports GPU passthrough well

    if trust_level == "untrusted":
        if latency_requirement_ms < 200 and not needs_full_syscalls:
            return "gvisor"  # Fastest secure option
        if max_overhead_percent < 5:
            return "firecracker"  # Low overhead microVM
        return "kata"  # Full VM isolation

    if trust_level == "semi-trusted":
        if latency_requirement_ms < 200:
            return "gvisor"
        return "firecracker"

    return "namespace"  # Default fallback
```

## Performance Benchmarks

```
Benchmark: Boot time (cold start)
─────────────────────────────────────────
Namespace:    1.2ms   ████
gVisor:       147ms   ████████████████████████████
Kata (QEMU):  520ms   ████████████████████████████████████████████████████
Kata (CLH):   280ms   ████████████████████████████████████████
Firecracker:  125ms   ████████████████████████

Benchmark: Memory overhead per sandbox
─────────────────────────────────────────
Namespace:    ~0MB    █
gVisor:       ~20MB   ████████████████
Kata (QEMU):  ~40MB   ████████████████████████████████
Kata (CLH):   ~28MB   ████████████████████████
Firecracker:  ~5MB    ████████

Benchmark: Syscall overhead (relative to native)
─────────────────────────────────────────
Namespace:    1.0x    ████████████████
gVisor (KVM): 1.8x    ████████████████████████████████
gVisor (pt):  3.2x    ████████████████████████████████████████████████████
Kata:         1.05x   █████████████████
Firecracker:  1.03x   ████████████████

Benchmark: Network throughput (relative to native)
─────────────────────────────────────────
Namespace:    100%    ████████████████████████████████████████████████████
gVisor:       ~40%    ████████████████████████
Kata:         ~85%    ████████████████████████████████████████████████
Firecracker:  ~90%    ████████████████████████████████████████████████████
```

## Best Practices

1. **Match isolation to threat model**: Don't over-isolate—use namespace sandboxing
   for trusted internal agents and reserve microVMs for untrusted external code.

2. **Pre-build rootfs images**: Create minimal, purpose-built rootfs images with only
   the required language runtime and dependencies. Avoid general-purpose images.

3. **Use snapshot-resume for fast boot**: Instead of cold-booting microVMs, snapshot
   a warm VM and restore from snapshot for sub-100ms boot times.

4. **Monitor hypervisor overhead**: Track CPU steal time and memory balloon metrics
   to detect when microVM overhead impacts agent performance.

5. **Rotate and patch guest kernels**: Guest kernels in microVMs need regular
   security updates. Automate kernel image builds and rolling updates.

6. **Use virtio-fs over 9P**: For shared filesystem access, virtio-fs provides
   significantly better performance than 9P (used by older gVisor versions).

<!-- REFERENCE: microvm-isolation | sandbox-execution | v2.0.0 -->
