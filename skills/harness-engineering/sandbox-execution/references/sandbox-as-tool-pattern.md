# Sandbox-as-a-Tool Pattern

## Overview

The Sandbox-as-a-Tool pattern transforms execution sandboxes from static infrastructure
into dynamic, composable tools that agents can invoke, configure, parameterize, and
tear down through their standard tool-calling interface. Instead of agents running
within a pre-provisioned sandbox, agents *create* sandboxes on demand, specifying
isolation levels, resource limits, filesystem mounts, and network policies as tool
parameters.

This pattern enables:
- **Dynamic resource allocation**: Agents request only the resources they need per task
- **Isolation-level selection**: Agents choose between lightweight namespaces and full microVMs
- **Composable workflows**: Multiple sandboxes can be chained, forked, and merged
- **Self-healing execution**: Failed sandboxes are automatically recreated from snapshots

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    AGENT RUNTIME                             │
│                                                              │
│  Agent ──► Tool Router ──► sandbox_create(config)            │
│                  │          sandbox_execute(id, code)         │
│                  │          sandbox_snapshot(id)              │
│                  │          sandbox_fork(snapshot_id, N)      │
│                  │          sandbox_destroy(id)               │
│                  │                                            │
│                  ▼                                            │
│  ┌──────────────────────────────────────────────────────┐    │
│  │           SANDBOX TOOL PROVIDER                       │    │
│  │                                                       │    │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │    │
│  │  │ Config      │  │ Lifecycle    │  │ Resource     │  │    │
│  │  │ Validator   │  │ Manager      │  │ Allocator    │  │    │
│  │  └─────────────┘  └──────────────┘  └─────────────┘  │    │
│  │                                                       │    │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────┐  │    │
│  │  │ Snapshot    │  │ Network      │  │ Telemetry    │  │    │
│  │  │ Controller  │  │ Policy Eng.  │  │ Collector    │  │    │
│  │  └─────────────┘  └──────────────┘  └─────────────┘  │    │
│  └──────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

## Tool Interface Specification

### sandbox_create

Creates a new sandbox with the specified configuration.

```python
from dataclasses import dataclass, field
from enum import Enum
from typing import Optional


class IsolationLevel(Enum):
    NAMESPACE = "namespace"       # Linux namespaces + cgroups + seccomp
    GVISOR = "gvisor"             # gVisor user-space kernel (runsc)
    KATA = "kata"                 # Kata Containers (lightweight VM)
    FIRECRACKER = "firecracker"   # Firecracker microVM


class NetworkPolicy(Enum):
    DENY_ALL = "deny_all"
    EGRESS_ONLY = "egress_only"
    EGRESS_ALLOW_LIST = "egress_allow_list"
    FULL_ACCESS = "full_access"   # Only for trusted internal agents


class MountMode(Enum):
    READ_ONLY = "ro"
    READ_WRITE = "rw"
    COPY_ON_WRITE = "cow"


@dataclass
class FilesystemMount:
    host_path: str
    guest_path: str
    mode: MountMode = MountMode.READ_ONLY


@dataclass
class ResourceLimits:
    cpu_cores: float = 1.0
    memory_mb: int = 512
    disk_mb: int = 2048
    max_pids: int = 256
    max_wall_clock_s: int = 300
    max_network_bandwidth_mbps: float = 10.0
    max_disk_iops: int = 1000


@dataclass
class SnapshotConfig:
    enabled: bool = False
    interval_s: int = 60
    storage_backend: str = "local"  # "local", "s3", "nfs"
    storage_path: str = "/snapshots"
    max_snapshots: int = 10
    compression: str = "zstd"


@dataclass
class SandboxConfig:
    isolation_level: IsolationLevel = IsolationLevel.NAMESPACE
    base_image: str = "python:3.11-slim"
    resource_limits: ResourceLimits = field(default_factory=ResourceLimits)
    network_policy: NetworkPolicy = NetworkPolicy.DENY_ALL
    allowed_egress: list[str] = field(default_factory=list)
    filesystem_mounts: list[FilesystemMount] = field(default_factory=list)
    snapshot_config: SnapshotConfig = field(default_factory=SnapshotConfig)
    environment_variables: dict[str, str] = field(default_factory=dict)
    labels: dict[str, str] = field(default_factory=dict)
```

### sandbox_execute

Executes code within an existing sandbox.

```python
import asyncio
import uuid
from dataclasses import dataclass
from datetime import datetime
from typing import Any


@dataclass
class ExecutionRequest:
    sandbox_id: str
    code: str
    language: str = "python"
    stdin: str = ""
    timeout_s: int = 300
    capture_output: bool = True
    working_directory: str = "/workspace"


@dataclass
class ExecutionResult:
    execution_id: str
    sandbox_id: str
    exit_code: int
    stdout: str
    stderr: str
    started_at: datetime
    completed_at: datetime
    resource_usage: dict[str, Any]
    artifacts: list[str]  # Paths to output files


class SandboxToolProvider:
    """
    Provides sandbox operations as agent-callable tools.

    This class implements the Sandbox-as-a-Tool pattern, exposing
    sandbox lifecycle operations through a standard tool interface
    that agents can invoke during their reasoning loops.
    """

    def __init__(self, pool_manager, snapshot_registry, telemetry):
        self.pool_manager = pool_manager
        self.snapshot_registry = snapshot_registry
        self.telemetry = telemetry
        self._active_sandboxes: dict[str, Any] = {}

    async def create(self, config: SandboxConfig) -> dict:
        """
        Create a new sandbox with the specified configuration.

        Returns a sandbox descriptor with the sandbox ID and connection details.
        """
        # Validate configuration against organizational policies
        self._validate_config(config)

        # Allocate resources from the pool
        sandbox_id = f"sbx-{uuid.uuid4().hex[:8]}"
        allocation = await self.pool_manager.allocate(
            cpu_cores=config.resource_limits.cpu_cores,
            memory_mb=config.resource_limits.memory_mb,
            disk_mb=config.resource_limits.disk_mb,
        )

        # Select and initialize the isolation backend
        backend = self._get_backend(config.isolation_level)
        sandbox = await backend.create(
            sandbox_id=sandbox_id,
            base_image=config.base_image,
            resource_limits=config.resource_limits,
            network_policy=config.network_policy,
            allowed_egress=config.allowed_egress,
            filesystem_mounts=config.filesystem_mounts,
            environment_variables=config.environment_variables,
        )

        # Configure snapshotting if enabled
        if config.snapshot_config.enabled:
            await self.snapshot_registry.configure(
                sandbox_id=sandbox_id,
                config=config.snapshot_config,
            )

        self._active_sandboxes[sandbox_id] = sandbox

        # Emit telemetry
        self.telemetry.emit_sandbox_created(
            sandbox_id=sandbox_id,
            isolation_level=config.isolation_level.value,
            resource_limits=config.resource_limits,
        )

        return {
            "sandbox_id": sandbox_id,
            "status": "ready",
            "isolation_level": config.isolation_level.value,
            "resource_limits": {
                "cpu_cores": config.resource_limits.cpu_cores,
                "memory_mb": config.resource_limits.memory_mb,
                "disk_mb": config.resource_limits.disk_mb,
            },
        }

    async def execute(self, request: ExecutionRequest) -> ExecutionResult:
        """
        Execute code within an existing sandbox.

        The code is injected into the sandbox's workspace directory and
        executed under the configured resource constraints. A wall-clock
        watchdog ensures the execution terminates within the timeout.
        """
        sandbox = self._active_sandboxes.get(request.sandbox_id)
        if not sandbox:
            raise ValueError(f"Sandbox {request.sandbox_id} not found")

        execution_id = f"exec-{uuid.uuid4().hex[:8]}"
        started_at = datetime.utcnow()

        # Write code to sandbox workspace
        await sandbox.write_file(
            path=f"{request.working_directory}/agent_code.py",
            content=request.code,
        )

        # Execute with wall-clock timeout
        try:
            result = await asyncio.wait_for(
                sandbox.run(
                    command=f"python {request.working_directory}/agent_code.py",
                    stdin=request.stdin,
                    capture_output=request.capture_output,
                ),
                timeout=request.timeout_s,
            )
        except asyncio.TimeoutError:
            await sandbox.kill()
            result = {"exit_code": -9, "stdout": "", "stderr": "Execution timed out"}

        completed_at = datetime.utcnow()

        # Collect resource usage metrics
        resource_usage = await sandbox.get_resource_usage()

        # List output artifacts
        artifacts = await sandbox.list_files(request.working_directory)

        exec_result = ExecutionResult(
            execution_id=execution_id,
            sandbox_id=request.sandbox_id,
            exit_code=result["exit_code"],
            stdout=result["stdout"],
            stderr=result["stderr"],
            started_at=started_at,
            completed_at=completed_at,
            resource_usage=resource_usage,
            artifacts=artifacts,
        )

        # Emit telemetry
        self.telemetry.emit_execution_completed(
            execution_id=execution_id,
            sandbox_id=request.sandbox_id,
            exit_code=result["exit_code"],
            duration_s=(completed_at - started_at).total_seconds(),
            resource_usage=resource_usage,
        )

        return exec_result

    async def snapshot(self, sandbox_id: str) -> dict:
        """
        Capture a snapshot of the sandbox's current state.

        The snapshot includes the filesystem diff, execution state,
        and environment configuration. Snapshots are stored in the
        configured storage backend and can be used for restore or fork.
        """
        sandbox = self._active_sandboxes.get(sandbox_id)
        if not sandbox:
            raise ValueError(f"Sandbox {sandbox_id} not found")

        snapshot_id = f"snap-{uuid.uuid4().hex[:8]}"

        # Pause the sandbox during snapshot
        await sandbox.pause()

        try:
            # Capture filesystem state
            fs_snapshot = await sandbox.capture_filesystem()

            # Capture execution state (process tree, open files, etc.)
            exec_state = await sandbox.capture_execution_state()

            # Store snapshot
            snapshot_meta = await self.snapshot_registry.store(
                snapshot_id=snapshot_id,
                sandbox_id=sandbox_id,
                filesystem=fs_snapshot,
                execution_state=exec_state,
            )
        finally:
            # Resume the sandbox
            await sandbox.resume()

        self.telemetry.emit_snapshot_created(
            snapshot_id=snapshot_id,
            sandbox_id=sandbox_id,
            size_bytes=snapshot_meta["size_bytes"],
        )

        return {
            "snapshot_id": snapshot_id,
            "sandbox_id": sandbox_id,
            "size_bytes": snapshot_meta["size_bytes"],
            "created_at": datetime.utcnow().isoformat(),
            "storage_path": snapshot_meta["storage_path"],
        }

    async def fork(self, snapshot_id: str, count: int = 2) -> list[dict]:
        """
        Fork N new sandboxes from an existing snapshot.

        Each forked sandbox starts with the exact state captured in the
        snapshot, enabling parallel exploration of different execution paths.
        """
        if count > 8:
            raise ValueError("Maximum fork count is 8 to prevent resource exhaustion")

        snapshot_meta = await self.snapshot_registry.get(snapshot_id)
        if not snapshot_meta:
            raise ValueError(f"Snapshot {snapshot_id} not found")

        forked_sandboxes = []
        for i in range(count):
            # Create a new sandbox from the snapshot
            new_sandbox_id = f"sbx-{uuid.uuid4().hex[:8]}"
            sandbox = await self._restore_from_snapshot(
                new_sandbox_id, snapshot_meta
            )
            self._active_sandboxes[new_sandbox_id] = sandbox
            forked_sandboxes.append({
                "sandbox_id": new_sandbox_id,
                "parent_snapshot_id": snapshot_id,
                "fork_index": i,
                "status": "ready",
            })

        self.telemetry.emit_fork_completed(
            snapshot_id=snapshot_id,
            fork_count=count,
            child_sandbox_ids=[s["sandbox_id"] for s in forked_sandboxes],
        )

        return forked_sandboxes

    async def destroy(self, sandbox_id: str) -> dict:
        """
        Destroy a sandbox and release all associated resources.
        """
        sandbox = self._active_sandboxes.get(sandbox_id)
        if not sandbox:
            raise ValueError(f"Sandbox {sandbox_id} not found")

        # Collect final resource usage
        final_usage = await sandbox.get_resource_usage()

        # Destroy the sandbox
        await sandbox.destroy()
        del self._active_sandboxes[sandbox_id]

        # Release resources back to the pool
        await self.pool_manager.release(sandbox_id)

        self.telemetry.emit_sandbox_destroyed(
            sandbox_id=sandbox_id,
            final_resource_usage=final_usage,
        )

        return {
            "sandbox_id": sandbox_id,
            "status": "destroyed",
            "final_resource_usage": final_usage,
        }

    def _validate_config(self, config: SandboxConfig) -> None:
        """Validate sandbox configuration against organizational policies."""
        if config.resource_limits.cpu_cores > 8:
            raise ValueError("Maximum CPU cores per sandbox is 8")
        if config.resource_limits.memory_mb > 16384:
            raise ValueError("Maximum memory per sandbox is 16GB")
        if config.resource_limits.disk_mb > 102400:
            raise ValueError("Maximum disk per sandbox is 100GB")
        if config.network_policy == NetworkPolicy.FULL_ACCESS:
            if config.isolation_level == IsolationLevel.NAMESPACE:
                raise ValueError(
                    "Full network access requires at least gVisor isolation"
                )

    def _get_backend(self, isolation_level: IsolationLevel):
        """Select the appropriate isolation backend."""
        backends = {
            IsolationLevel.NAMESPACE: NamespaceBackend,
            IsolationLevel.GVISOR: GVisorBackend,
            IsolationLevel.KATA: KataBackend,
            IsolationLevel.FIRECRACKER: FirecrackerBackend,
        }
        return backends[isolation_level]()

    async def _restore_from_snapshot(self, sandbox_id, snapshot_meta):
        """Restore a sandbox from a snapshot."""
        # Implementation delegates to the appropriate backend
        pass
```

### TypeScript Tool Definition

```typescript
import { z } from "zod";

// Tool definitions for agent framework integration
export const sandboxTools = {
  sandbox_create: {
    name: "sandbox_create",
    description:
      "Create a new isolated sandbox execution environment. " +
      "Specify isolation level, resource limits, network policy, " +
      "and filesystem mounts. Returns a sandbox ID for subsequent operations.",
    parameters: z.object({
      isolation_level: z
        .enum(["namespace", "gvisor", "kata", "firecracker"])
        .default("namespace")
        .describe("Level of isolation for the sandbox"),
      base_image: z
        .string()
        .default("python:3.11-slim")
        .describe("Base container image for the sandbox"),
      cpu_cores: z
        .number()
        .min(0.25)
        .max(8)
        .default(1)
        .describe("Number of CPU cores to allocate"),
      memory_mb: z
        .number()
        .min(128)
        .max(16384)
        .default(512)
        .describe("Memory limit in megabytes"),
      disk_mb: z
        .number()
        .min(256)
        .max(102400)
        .default(2048)
        .describe("Disk space limit in megabytes"),
      network_policy: z
        .enum(["deny_all", "egress_only", "egress_allow_list"])
        .default("deny_all")
        .describe("Network access policy"),
      allowed_egress: z
        .array(z.string())
        .optional()
        .describe("Allowed egress destinations (host:port format)"),
      enable_snapshots: z
        .boolean()
        .default(false)
        .describe("Enable periodic snapshots"),
      snapshot_interval_s: z
        .number()
        .min(10)
        .max(3600)
        .default(60)
        .describe("Snapshot interval in seconds"),
      max_wall_clock_s: z
        .number()
        .min(10)
        .max(7200)
        .default(300)
        .describe("Maximum wall-clock time in seconds"),
    }),
    execute: async (params: SandboxCreateParams): Promise<SandboxDescriptor> => {
      // Implementation delegates to SandboxToolProvider.create()
      const config = mapParamsToConfig(params);
      return await sandboxProvider.create(config);
    },
  },

  sandbox_execute: {
    name: "sandbox_execute",
    description:
      "Execute code within an existing sandbox. " +
      "Returns stdout, stderr, exit code, and resource usage metrics.",
    parameters: z.object({
      sandbox_id: z.string().describe("ID of the sandbox to execute in"),
      code: z.string().describe("Code to execute"),
      language: z
        .enum(["python", "javascript", "typescript", "bash"])
        .default("python")
        .describe("Programming language"),
      timeout_s: z
        .number()
        .min(1)
        .max(3600)
        .default(300)
        .describe("Execution timeout in seconds"),
    }),
    execute: async (params: SandboxExecuteParams): Promise<ExecutionResult> => {
      const request = new ExecutionRequest(params);
      return await sandboxProvider.execute(request);
    },
  },

  sandbox_snapshot: {
    name: "sandbox_snapshot",
    description:
      "Capture a snapshot of a sandbox's current state. " +
      "Snapshots can be used to restore or fork sandboxes.",
    parameters: z.object({
      sandbox_id: z.string().describe("ID of the sandbox to snapshot"),
    }),
    execute: async (params: { sandbox_id: string }) => {
      return await sandboxProvider.snapshot(params.sandbox_id);
    },
  },

  sandbox_fork: {
    name: "sandbox_fork",
    description:
      "Fork N new sandboxes from an existing snapshot. " +
      "Each fork starts with identical state for parallel exploration.",
    parameters: z.object({
      snapshot_id: z.string().describe("ID of the snapshot to fork from"),
      count: z
        .number()
        .min(2)
        .max(8)
        .default(2)
        .describe("Number of forks to create"),
    }),
    execute: async (params: { snapshot_id: string; count: number }) => {
      return await sandboxProvider.fork(params.snapshot_id, params.count);
    },
  },

  sandbox_destroy: {
    name: "sandbox_destroy",
    description: "Destroy a sandbox and release all resources.",
    parameters: z.object({
      sandbox_id: z.string().describe("ID of the sandbox to destroy"),
    }),
    execute: async (params: { sandbox_id: string }) => {
      return await sandboxProvider.destroy(params.sandbox_id);
    },
  },
};
```

## Tool Registration Pattern

Agents discover and invoke sandbox tools through the standard tool registry:

```python
from typing import Any, Callable


class ToolRegistry:
    """
    Central registry for agent-callable tools.

    The Sandbox-as-a-Tool pattern registers sandbox operations alongside
    other tools (web search, file I/O, database queries), enabling agents
    to dynamically choose when to create and use sandboxes.
    """

    def __init__(self):
        self._tools: dict[str, dict[str, Any]] = {}

    def register(
        self,
        name: str,
        description: str,
        parameters_schema: dict,
        handler: Callable,
        category: str = "general",
    ) -> None:
        self._tools[name] = {
            "name": name,
            "description": description,
            "parameters_schema": parameters_schema,
            "handler": handler,
            "category": category,
        }

    def get_tool_definitions(self, categories: list[str] | None = None) -> list[dict]:
        """Return tool definitions for injection into agent prompts."""
        tools = self._tools.values()
        if categories:
            tools = [t for t in tools if t["category"] in categories]
        return [
            {
                "name": t["name"],
                "description": t["description"],
                "parameters": t["parameters_schema"],
            }
            for t in tools
        ]

    async def invoke(self, name: str, parameters: dict) -> Any:
        """Invoke a tool by name with the given parameters."""
        tool = self._tools.get(name)
        if not tool:
            raise ValueError(f"Unknown tool: {name}")
        return await tool["handler"](**parameters)


# Registration example
def register_sandbox_tools(registry: ToolRegistry, provider: SandboxToolProvider):
    """Register all sandbox tools with the agent's tool registry."""

    registry.register(
        name="sandbox_create",
        description=(
            "Create a new isolated execution sandbox. Use this when you need to "
            "run untrusted code, execute computations with resource limits, or "
            "set up an isolated workspace for a task."
        ),
        parameters_schema={
            "type": "object",
            "properties": {
                "isolation_level": {
                    "type": "string",
                    "enum": ["namespace", "gvisor", "kata", "firecracker"],
                    "default": "namespace",
                },
                "base_image": {"type": "string", "default": "python:3.11-slim"},
                "cpu_cores": {"type": "number", "default": 1, "minimum": 0.25},
                "memory_mb": {"type": "integer", "default": 512, "minimum": 128},
                "network_policy": {
                    "type": "string",
                    "enum": ["deny_all", "egress_only", "egress_allow_list"],
                    "default": "deny_all",
                },
            },
        },
        handler=provider.create,
        category="sandbox",
    )

    registry.register(
        name="sandbox_execute",
        description=(
            "Execute code inside an existing sandbox. Provide the sandbox ID "
            "and the code to run. Returns output, exit code, and resource usage."
        ),
        parameters_schema={
            "type": "object",
            "properties": {
                "sandbox_id": {"type": "string"},
                "code": {"type": "string"},
                "language": {"type": "string", "default": "python"},
                "timeout_s": {"type": "integer", "default": 300},
            },
            "required": ["sandbox_id", "code"],
        },
        handler=provider.execute,
        category="sandbox",
    )
```

## Sandbox Pool Management

Pre-warming sandbox pools reduces creation latency:

```python
import asyncio
from collections import defaultdict
from dataclasses import dataclass


@dataclass
class PoolConfig:
    isolation_level: str
    base_image: str
    min_warm: int = 2          # Minimum pre-warmed sandboxes
    max_warm: int = 10         # Maximum pre-warmed sandboxes
    max_total: int = 50        # Maximum total (warm + active)
    warm_ttl_s: int = 300      # TTL for unused warm sandboxes
    scale_up_threshold: float = 0.8  # Scale up when utilization > 80%


class SandboxPoolManager:
    """
    Manages pools of pre-warmed sandboxes for fast allocation.

    Maintains separate pools for each (isolation_level, base_image) pair.
    Warm sandboxes are pre-provisioned and ready for immediate use,
    reducing sandbox creation latency from seconds to milliseconds.
    """

    def __init__(self):
        self._pools: dict[str, list] = defaultdict(list)
        self._active: dict[str, Any] = {}
        self._configs: dict[str, PoolConfig] = {}

    def configure_pool(self, pool_key: str, config: PoolConfig) -> None:
        """Configure a sandbox pool."""
        self._configs[pool_key] = config

    async def warm_pools(self) -> None:
        """Pre-warm all configured pools to their minimum levels."""
        for pool_key, config in self._configs.items():
            current = len(self._pools[pool_key])
            needed = config.min_warm - current
            if needed > 0:
                tasks = [
                    self._create_warm_sandbox(pool_key, config)
                    for _ in range(needed)
                ]
                await asyncio.gather(*tasks)

    async def allocate(
        self,
        isolation_level: str,
        base_image: str,
        **kwargs,
    ) -> Any:
        """
        Allocate a sandbox from the pool or create one on demand.

        Prefers warm sandboxes for fast allocation. Falls back to
        on-demand creation if the pool is empty.
        """
        pool_key = f"{isolation_level}:{base_image}"
        pool = self._pools.get(pool_key, [])

        if pool:
            # Fast path: grab a pre-warmed sandbox
            sandbox = pool.pop(0)
            self._active[sandbox.id] = sandbox

            # Trigger background replenishment
            asyncio.create_task(self._replenish(pool_key))

            return sandbox

        # Slow path: create on demand
        config = self._configs.get(pool_key)
        if config and len(self._active) >= config.max_total:
            raise ResourceError("Sandbox pool exhausted")

        sandbox = await self._create_sandbox(isolation_level, base_image, **kwargs)
        self._active[sandbox.id] = sandbox
        return sandbox

    async def release(self, sandbox_id: str) -> None:
        """Release a sandbox back to the pool or destroy it."""
        sandbox = self._active.pop(sandbox_id, None)
        if sandbox:
            await sandbox.destroy()

    async def _replenish(self, pool_key: str) -> None:
        """Replenish the pool to maintain minimum warm level."""
        config = self._configs.get(pool_key)
        if not config:
            return
        current = len(self._pools[pool_key])
        if current < config.min_warm:
            sandbox = await self._create_warm_sandbox(pool_key, config)
            self._pools[pool_key].append(sandbox)

    async def _create_warm_sandbox(self, pool_key: str, config: PoolConfig):
        """Create a warm sandbox ready for immediate use."""
        isolation_level, base_image = pool_key.split(":", 1)
        return await self._create_sandbox(isolation_level, base_image)

    async def _create_sandbox(self, isolation_level: str, base_image: str, **kwargs):
        """Create a new sandbox."""
        # Delegates to the appropriate backend
        pass
```

## Security Considerations

### Policy Validation Chain

Every sandbox creation request passes through a multi-stage validation pipeline:

```python
from abc import ABC, abstractmethod


class PolicyValidator(ABC):
    """Base class for sandbox policy validators."""

    @abstractmethod
    def validate(self, config: SandboxConfig) -> list[str]:
        """
        Validate a sandbox configuration.
        Returns a list of violation descriptions, empty if valid.
        """
        pass


class ResourceQuotaValidator(PolicyValidator):
    """Ensures resource requests don't exceed organizational limits."""

    def __init__(self, org_limits: dict):
        self.org_limits = org_limits

    def validate(self, config: SandboxConfig) -> list[str]:
        violations = []
        limits = config.resource_limits
        if limits.cpu_cores > self.org_limits["max_cpu_cores"]:
            violations.append(
                f"CPU request {limits.cpu_cores} exceeds limit "
                f"{self.org_limits['max_cpu_cores']}"
            )
        if limits.memory_mb > self.org_limits["max_memory_mb"]:
            violations.append(
                f"Memory request {limits.memory_mb}MB exceeds limit "
                f"{self.org_limits['max_memory_mb']}MB"
            )
        return violations


class NetworkPolicyValidator(PolicyValidator):
    """Ensures network policies meet security requirements."""

    def __init__(self, allowed_egress_domains: set[str]):
        self.allowed_domains = allowed_egress_domains

    def validate(self, config: SandboxConfig) -> list[str]:
        violations = []
        if config.network_policy == NetworkPolicy.FULL_ACCESS:
            violations.append("Full network access is not permitted")
        for endpoint in config.allowed_egress:
            host = endpoint.split(":")[0]
            if host not in self.allowed_domains:
                violations.append(f"Egress to {host} is not in the allow-list")
        return violations


class IsolationLevelValidator(PolicyValidator):
    """Ensures isolation level matches trust requirements."""

    def validate(self, config: SandboxConfig) -> list[str]:
        violations = []
        if (
            config.network_policy != NetworkPolicy.DENY_ALL
            and config.isolation_level == IsolationLevel.NAMESPACE
        ):
            violations.append(
                "Network access requires at least gVisor isolation level"
            )
        return violations


class PolicyValidationChain:
    """Chains multiple validators and aggregates results."""

    def __init__(self, validators: list[PolicyValidator]):
        self.validators = validators

    def validate(self, config: SandboxConfig) -> tuple[bool, list[str]]:
        all_violations = []
        for validator in self.validators:
            violations = validator.validate(config)
            all_violations.extend(violations)
        return (len(all_violations) == 0, all_violations)


# Usage
chain = PolicyValidationChain([
    ResourceQuotaValidator({"max_cpu_cores": 8, "max_memory_mb": 16384}),
    NetworkPolicyValidator({"api.openai.com", "pypi.org", "github.com"}),
    IsolationLevelValidator(),
])

valid, violations = chain.validate(config)
if not valid:
    raise PolicyViolationError(violations)
```

## Anti-Patterns

### 1. Sandbox Reuse Without Reset

**Problem**: Reusing a sandbox across unrelated agent tasks leaks state.

```python
# WRONG: Reusing sandbox without cleanup
sandbox = await provider.create(config)
result1 = await provider.execute(ExecutionRequest(sandbox.id, task1_code))
result2 = await provider.execute(ExecutionRequest(sandbox.id, task2_code))
# task2 can see task1's files, environment, and side effects

# CORRECT: Create fresh sandbox per task or reset between tasks
sandbox = await provider.create(config)
result1 = await provider.execute(ExecutionRequest(sandbox.id, task1_code))
await provider.destroy(sandbox.id)

sandbox2 = await provider.create(config)
result2 = await provider.execute(ExecutionRequest(sandbox2.id, task2_code))
await provider.destroy(sandbox2.id)
```

### 2. Unbounded Fork Depth

**Problem**: Recursive forking creates exponential sandbox proliferation.

```python
# WRONG: Allowing recursive forks without depth tracking
async def explore(snapshot_id, depth=0):
    forks = await provider.fork(snapshot_id, count=3)
    for fork in forks:
        result = await provider.execute(...)
        if needs_branching(result):
            new_snap = await provider.snapshot(fork["sandbox_id"])
            await explore(new_snap["snapshot_id"], depth + 1)  # Unbounded!

# CORRECT: Enforce maximum fork depth
MAX_FORK_DEPTH = 3

async def explore(snapshot_id, depth=0):
    if depth >= MAX_FORK_DEPTH:
        return await execute_without_forking(snapshot_id)
    forks = await provider.fork(snapshot_id, count=3)
    for fork in forks:
        result = await provider.execute(...)
        if needs_branching(result):
            new_snap = await provider.snapshot(fork["sandbox_id"])
            await explore(new_snap["snapshot_id"], depth + 1)
```

### 3. Missing Cleanup on Error Paths

**Problem**: Exception paths skip sandbox destruction, leaking resources.

```python
# WRONG: No cleanup on exception
sandbox = await provider.create(config)
result = await provider.execute(request)  # May raise
await provider.destroy(sandbox["sandbox_id"])

# CORRECT: Use context manager or try/finally
sandbox = await provider.create(config)
try:
    result = await provider.execute(request)
finally:
    await provider.destroy(sandbox["sandbox_id"])
```

## Best Practices

1. **Always set wall-clock timeouts**: Every sandbox must have a finite lifetime enforced
   by an external watchdog, not just an internal timer.

2. **Use pool pre-warming for latency-sensitive workloads**: Maintain warm sandbox pools
   for frequently used (isolation_level, base_image) combinations.

3. **Tag sandboxes with correlation IDs**: Every sandbox should carry the originating
   request ID, agent ID, and workflow ID for observability.

4. **Validate configurations before resource allocation**: Policy validation should
   happen before any resources are allocated to fail fast.

5. **Monitor pool utilization**: Track pool size, allocation rate, and wait time
   to right-size pools and detect resource exhaustion early.

<!-- REFERENCE: sandbox-as-tool-pattern | sandbox-execution | v2.0.0 -->
