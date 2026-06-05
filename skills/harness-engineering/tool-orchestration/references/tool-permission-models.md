# Tool Permission Models

## Overview

Permission models govern which tools an agent is allowed to invoke, with what parameters, and under what conditions. Without enforceable permissions, an agent with access to a `file_write` tool could overwrite system files, or a `shell_exec` tool could run arbitrary commands. This reference covers the complete permission lifecycle from policy definition through runtime enforcement to audit logging.

```
+--------------------+     +-----------------------+     +------------------+
|                    |     |                       |     |                  |
|   Agent Runtime    |────►|  Permission Gateway   |────►|  Tool Provider   |
|                    |     |                       |     |                  |
|  - Identity        |     |  - Policy Engine      |     |  - file_read     |
|  - Role            |     |  - Capability Store   |     |  - file_write    |
|  - Session Context |     |  - Audit Logger       |     |  - shell_exec    |
|                    |     |  - Escalation Handler |     |  - deploy        |
+--------------------+     +-----------------------+     +------------------+
         │                          │                            │
         │     DENY/ALLOW           │     AUDIT LOG              │
         │◄─────────────────────────│────────────────────────────►│
```

---

## Capability-Based Security

Capability-based security assigns unforgeable tokens (capabilities) that grant specific access rights. Unlike ACL-based systems where access is checked against a central list, capabilities are self-contained proof of authorization.

### Capability Token Structure

```json
{
  "capability_id": "cap_a1b2c3d4e5f6",
  "agent_id": "agent_orchestrator_01",
  "tool_name": "file_write",
  "constraints": {
    "allowed_paths": ["/workspace/**", "/tmp/agent-*/**"],
    "denied_paths": ["/etc/**", "/usr/**", "/var/**"],
    "max_content_size_bytes": 1048576,
    "allowed_encodings": ["utf-8", "ascii"]
  },
  "scopes": ["write"],
  "issued_at": "2025-11-01T00:00:00Z",
  "expires_at": "2025-11-02T00:00:00Z",
  "issuer": "permission-authority",
  "nonce": "n_x7k9m2p4q8"
}
```

### Python Capability Token Implementation

```python
import hashlib
import hmac
import json
import time
import secrets
from dataclasses import dataclass, field
from typing import Any, Optional
from enum import Enum, auto


class PermissionScope(Enum):
    """Permission scopes for tool operations."""
    READ = "read"
    WRITE = "write"
    EXECUTE = "execute"
    DELETE = "delete"
    ADMIN = "admin"


@dataclass
class CapabilityConstraints:
    """Constraints that limit how a tool can be used."""
    allowed_paths: list[str] = field(default_factory=list)
    denied_paths: list[str] = field(default_factory=list)
    max_content_size_bytes: int = 1_048_576  # 1 MB default
    allowed_encodings: list[str] = field(default_factory=lambda: ["utf-8"])
    max_calls_per_minute: int = 60
    allowed_parameters: Optional[dict[str, list[Any]]] = None
    required_parameters: Optional[list[str]] = None


@dataclass
class CapabilityToken:
    """
    An unforgeable capability token granting specific tool access.
    
    Capabilities are self-contained: the token itself proves authorization
    without requiring a central lookup on every call.
    """
    capability_id: str
    agent_id: str
    tool_name: str
    scopes: list[PermissionScope]
    constraints: CapabilityConstraints
    issued_at: float = field(default_factory=time.time)
    expires_at: float = 0.0
    issuer: str = "permission-authority"
    nonce: str = field(default_factory=lambda: f"n_{secrets.token_hex(8)}")
    _signature: Optional[str] = field(default=None, repr=False)

    def __post_init__(self):
        if self.expires_at == 0.0:
            self.expires_at = self.issued_at + 86400  # 24h default

    @property
    def is_expired(self) -> bool:
        return time.time() > self.expires_at

    def has_scope(self, scope: PermissionScope) -> bool:
        """Check if this capability grants a specific scope."""
        if PermissionScope.ADMIN in self.scopes:
            return True
        return scope in self.scopes

    def sign(self, secret_key: str) -> str:
        """Generate HMAC signature for integrity verification."""
        payload = json.dumps({
            "capability_id": self.capability_id,
            "agent_id": self.agent_id,
            "tool_name": self.tool_name,
            "scopes": [s.value for s in self.scopes],
            "issued_at": self.issued_at,
            "expires_at": self.expires_at,
            "nonce": self.nonce,
        }, sort_keys=True, separators=(",", ":"))

        self._signature = hmac.new(
            secret_key.encode("utf-8"),
            payload.encode("utf-8"),
            hashlib.sha256
        ).hexdigest()
        return self._signature

    def verify(self, secret_key: str) -> bool:
        """Verify the token's HMAC signature."""
        expected = self.sign(secret_key)
        if self._signature is None:
            return False
        return hmac.compare_digest(self._signature, expected)


class CapabilityTokenFactory:
    """Factory for creating signed capability tokens."""

    def __init__(self, secret_key: str, issuer: str = "permission-authority"):
        self._secret_key = secret_key
        self._issuer = issuer
        self._counter = 0

    def create_token(
        self,
        agent_id: str,
        tool_name: str,
        scopes: list[PermissionScope],
        constraints: Optional[CapabilityConstraints] = None,
        ttl_seconds: int = 86400,
    ) -> CapabilityToken:
        """Create a new signed capability token."""
        self._counter += 1
        now = time.time()

        token = CapabilityToken(
            capability_id=f"cap_{secrets.token_hex(12)}",
            agent_id=agent_id,
            tool_name=tool_name,
            scopes=scopes,
            constraints=constraints or CapabilityConstraints(),
            issued_at=now,
            expires_at=now + ttl_seconds,
            issuer=self._issuer,
        )
        token.sign(self._secret_key)
        return token


# Usage
factory = CapabilityTokenFactory(secret_key="super-secret-key-12345")

read_cap = factory.create_token(
    agent_id="agent_42",
    tool_name="file_read",
    scopes=[PermissionScope.READ],
    constraints=CapabilityConstraints(
        allowed_paths=["/workspace/**"],
        denied_paths=["/workspace/.env", "/workspace/secrets/**"],
    ),
)
print(f"Token: {read_cap.capability_id}, Expired: {read_cap.is_expired}")
```

### TypeScript Capability Token

```typescript
import { createHmac, randomBytes } from "crypto";

enum PermissionScope {
  READ = "read",
  WRITE = "write",
  EXECUTE = "execute",
  DELETE = "delete",
  ADMIN = "admin",
}

interface CapabilityConstraints {
  allowedPaths: string[];
  deniedPaths: string[];
  maxContentSizeBytes: number;
  allowedEncodings: string[];
  maxCallsPerMinute: number;
  allowedParameters?: Record<string, unknown[]>;
}

interface CapabilityToken {
  capabilityId: string;
  agentId: string;
  toolName: string;
  scopes: PermissionScope[];
  constraints: CapabilityConstraints;
  issuedAt: number;
  expiresAt: number;
  issuer: string;
  nonce: string;
  signature?: string;
}

class CapabilityTokenFactory {
  private secretKey: string;
  private issuer: string;

  constructor(secretKey: string, issuer = "permission-authority") {
    this.secretKey = secretKey;
    this.issuer = issuer;
  }

  createToken(
    agentId: string,
    toolName: string,
    scopes: PermissionScope[],
    constraints: Partial<CapabilityConstraints> = {},
    ttlSeconds = 86400
  ): CapabilityToken {
    const now = Date.now() / 1000;
    const token: CapabilityToken = {
      capabilityId: `cap_${randomBytes(12).toString("hex")}`,
      agentId,
      toolName,
      scopes,
      constraints: {
        allowedPaths: constraints.allowedPaths ?? ["/workspace/**"],
        deniedPaths: constraints.deniedPaths ?? [],
        maxContentSizeBytes: constraints.maxContentSizeBytes ?? 1_048_576,
        allowedEncodings: constraints.allowedEncodings ?? ["utf-8"],
        maxCallsPerMinute: constraints.maxCallsPerMinute ?? 60,
        allowedParameters: constraints.allowedParameters,
      },
      issuedAt: now,
      expiresAt: now + ttlSeconds,
      issuer: this.issuer,
      nonce: `n_${randomBytes(8).toString("hex")}`,
    };

    token.signature = this.sign(token);
    return token;
  }

  sign(token: CapabilityToken): string {
    const payload = JSON.stringify({
      capability_id: token.capabilityId,
      agent_id: token.agentId,
      tool_name: token.toolName,
      scopes: token.scopes,
      issued_at: token.issuedAt,
      expires_at: token.expiresAt,
      nonce: token.nonce,
    });
    return createHmac("sha256", this.secretKey).update(payload).digest("hex");
  }

  verify(token: CapabilityToken): boolean {
    if (!token.signature) return false;
    const expected = this.sign(token);
    return token.signature === expected && Date.now() / 1000 < token.expiresAt;
  }
}
```

---

## Tool Allowlists and Denylists

Allowlists and denylists provide coarse-grained access control at the tool level. They are evaluated before capability tokens.

```
Evaluation Order:
                                                    
  Request ──► Denylist Check ──► Allowlist Check ──► Capability Check ──► Execute
       │            │                  │                    │
       │         DENIED             NOT IN              SCOPE/CONSTRAINT
       │      (hard block)         ALLOWLIST             VIOLATION
       │            │                  │                    │
       ▼            ▼                  ▼                    ▼
     PASS      403 FORBIDDEN     403 FORBIDDEN       403 FORBIDDEN
```

### Policy Engine

```python
import fnmatch
import re
from dataclasses import dataclass, field
from typing import Optional
from enum import Enum


class PolicyDecision(Enum):
    ALLOW = "allow"
    DENY = "deny"
    ABSTAIN = "abstain"


@dataclass
class ToolPolicy:
    """
    Defines allowlist/denylist rules for tool access.
    
    Rules are evaluated in order:
    1. Denylist (if matched → DENY, no override)
    2. Allowlist (if present and not matched → DENY)
    3. Parameter constraints (if violated → DENY)
    """
    # Tool-level access lists
    denied_tools: list[str] = field(default_factory=list)
    allowed_tools: list[str] = field(default_factory=list)

    # Pattern-based rules (glob patterns)
    denied_tool_patterns: list[str] = field(default_factory=list)
    allowed_tool_patterns: list[str] = field(default_factory=list)

    # Per-tool parameter restrictions
    parameter_restrictions: dict[str, dict] = field(default_factory=dict)

    # Default behavior when no rules match
    default_policy: PolicyDecision = PolicyDecision.DENY


class PermissionPolicyEngine:
    """
    Evaluates tool access requests against a policy configuration.
    
    The engine supports both exact-match and glob-pattern rules,
    with denylist taking priority over allowlist.
    """

    def __init__(self, policy: ToolPolicy):
        self.policy = policy

    def evaluate(
        self,
        tool_name: str,
        parameters: Optional[dict] = None,
        agent_id: Optional[str] = None,
    ) -> tuple[PolicyDecision, str]:
        """
        Evaluate whether a tool call is permitted.
        
        Returns:
            (decision, reason) tuple
        """
        # Step 1: Check denylist (exact match)
        if tool_name in self.policy.denied_tools:
            return PolicyDecision.DENY, f"Tool '{tool_name}' is in denylist"

        # Step 2: Check denylist (pattern match)
        for pattern in self.policy.denied_tool_patterns:
            if fnmatch.fnmatch(tool_name, pattern):
                return (
                    PolicyDecision.DENY,
                    f"Tool '{tool_name}' matches deny pattern '{pattern}'",
                )

        # Step 3: Check allowlist (if allowlist is defined)
        if self.policy.allowed_tools or self.policy.allowed_tool_patterns:
            in_allowlist = tool_name in self.policy.allowed_tools
            pattern_match = any(
                fnmatch.fnmatch(tool_name, p)
                for p in self.policy.allowed_tool_patterns
            )

            if not in_allowlist and not pattern_match:
                return (
                    PolicyDecision.DENY,
                    f"Tool '{tool_name}' is not in allowlist",
                )

        # Step 4: Check parameter restrictions
        if parameters and tool_name in self.policy.parameter_restrictions:
            restrictions = self.policy.parameter_restrictions[tool_name]
            for param_name, constraint in restrictions.items():
                if param_name in parameters:
                    value = parameters[param_name]

                    # Check denied values
                    if "denied_values" in constraint:
                        for pattern in constraint["denied_values"]:
                            if isinstance(value, str) and fnmatch.fnmatch(
                                value, pattern
                            ):
                                return (
                                    PolicyDecision.DENY,
                                    f"Parameter '{param_name}' value matches "
                                    f"denied pattern '{pattern}'",
                                )

                    # Check allowed values
                    if "allowed_values" in constraint:
                        matched = any(
                            fnmatch.fnmatch(str(value), p)
                            for p in constraint["allowed_values"]
                        )
                        if not matched:
                            return (
                                PolicyDecision.DENY,
                                f"Parameter '{param_name}' value not in "
                                f"allowed values",
                            )

                    # Check max length
                    if "max_length" in constraint:
                        if isinstance(value, str) and len(value) > constraint["max_length"]:
                            return (
                                PolicyDecision.DENY,
                                f"Parameter '{param_name}' exceeds max length "
                                f"{constraint['max_length']}",
                            )

        return PolicyDecision.ALLOW, "All policy checks passed"


# Usage
policy = ToolPolicy(
    denied_tools=["shell_exec", "process_kill"],
    denied_tool_patterns=["internal_*", "debug_*"],
    allowed_tools=["file_read", "file_write", "file_list", "web_search"],
    allowed_tool_patterns=["safe_*"],
    parameter_restrictions={
        "file_write": {
            "path": {
                "denied_values": ["/etc/*", "/usr/*", "/var/*", "*.exe"],
                "allowed_values": ["/workspace/*", "/tmp/agent-*"],
            },
            "content": {
                "max_length": 1_048_576,
            },
        },
        "file_read": {
            "path": {
                "denied_values": ["*.pem", "*.key", "*/.env", "*/secrets/*"],
            },
        },
    },
    default_policy=PolicyDecision.DENY,
)

engine = PermissionPolicyEngine(policy)

decision, reason = engine.evaluate("file_read", {"path": "/workspace/main.py"})
print(f"Decision: {decision.value}, Reason: {reason}")

decision, reason = engine.evaluate("shell_exec", {"command": "rm -rf /"})
print(f"Decision: {decision.value}, Reason: {reason}")
```

---

## Per-Tool Permission Scopes

Each tool declares which scopes it requires, and the permission system verifies the agent holds matching capabilities.

### Scope Hierarchy

```
                    ADMIN
                   /     \
                  /       \
            EXECUTE      DELETE
               |           |
             WRITE       WRITE
               |           |
             READ        READ
```

### Scope Definition Schema

```yaml
tools:
  file_read:
    required_scopes: [read]
    optional_scopes: []
    description: "Read file contents from the filesystem"

  file_write:
    required_scopes: [write]
    optional_scopes: [read]
    description: "Write content to a file"

  file_delete:
    required_scopes: [delete]
    optional_scopes: []
    description: "Delete a file from the filesystem"

  shell_exec:
    required_scopes: [execute]
    optional_scopes: [read, write]
    description: "Execute a shell command"

  deploy_service:
    required_scopes: [execute, write]
    optional_scopes: [admin]
    description: "Deploy a service to production"
```

### Scope Enforcement

```python
from dataclasses import dataclass, field
from typing import Optional


@dataclass
class ToolScopeRequirement:
    """Declares the scopes required to invoke a tool."""
    tool_name: str
    required_scopes: list[PermissionScope]
    optional_scopes: list[PermissionScope] = field(default_factory=list)
    parameter_scopes: dict[str, list[PermissionScope]] = field(default_factory=dict)


class ScopeEnforcer:
    """
    Validates that an agent's capabilities satisfy a tool's scope requirements.
    
    Scope hierarchy: ADMIN > EXECUTE > WRITE > READ
    Having a higher scope implicitly grants all lower scopes.
    """

    SCOPE_HIERARCHY: dict[PermissionScope, set[PermissionScope]] = {
        PermissionScope.ADMIN: {
            PermissionScope.EXECUTE,
            PermissionScope.DELETE,
            PermissionScope.WRITE,
            PermissionScope.READ,
        },
        PermissionScope.EXECUTE: {
            PermissionScope.WRITE,
            PermissionScope.READ,
        },
        PermissionScope.DELETE: {
            PermissionScope.WRITE,
            PermissionScope.READ,
        },
        PermissionScope.WRITE: {
            PermissionScope.READ,
        },
        PermissionScope.READ: set(),
    }

    def __init__(self):
        self._tool_requirements: dict[str, ToolScopeRequirement] = {}

    def register_tool(self, requirement: ToolScopeRequirement) -> None:
        """Register a tool's scope requirements."""
        self._tool_requirements[requirement.tool_name] = requirement

    def effective_scopes(self, granted: list[PermissionScope]) -> set[PermissionScope]:
        """Expand granted scopes using the hierarchy."""
        effective = set(granted)
        for scope in granted:
            effective |= self.SCOPE_HIERARCHY.get(scope, set())
        return effective

    def check(
        self,
        tool_name: str,
        granted_scopes: list[PermissionScope],
        parameters: Optional[dict] = None,
    ) -> tuple[bool, list[str]]:
        """
        Check if granted scopes satisfy the tool's requirements.
        
        Returns:
            (allowed, list_of_missing_scopes)
        """
        if tool_name not in self._tool_requirements:
            return False, [f"Tool '{tool_name}' has no registered scope requirements"]

        requirement = self._tool_requirements[tool_name]
        effective = self.effective_scopes(granted_scopes)
        missing = []

        for required in requirement.required_scopes:
            if required not in effective:
                missing.append(required.value)

        # Check parameter-specific scopes
        if parameters and requirement.parameter_scopes:
            for param, scopes_needed in requirement.parameter_scopes.items():
                if param in parameters:
                    for scope in scopes_needed:
                        if scope not in effective:
                            missing.append(f"{scope.value} (for param '{param}')")

        return len(missing) == 0, missing


# Usage
enforcer = ScopeEnforcer()
enforcer.register_tool(ToolScopeRequirement(
    tool_name="file_write",
    required_scopes=[PermissionScope.WRITE],
))
enforcer.register_tool(ToolScopeRequirement(
    tool_name="deploy_service",
    required_scopes=[PermissionScope.EXECUTE, PermissionScope.WRITE],
))

# Agent with only READ scope
allowed, missing = enforcer.check("file_write", [PermissionScope.READ])
print(f"Allowed: {allowed}, Missing: {missing}")
# Allowed: False, Missing: ['write']

# Agent with ADMIN scope (implicitly grants all)
allowed, missing = enforcer.check("deploy_service", [PermissionScope.ADMIN])
print(f"Allowed: {allowed}, Missing: {missing}")
# Allowed: True, Missing: []
```

---

## Dynamic Permission Escalation

Agents may need elevated permissions mid-task. Dynamic escalation provides a controlled mechanism to request, approve, and grant additional capabilities at runtime.

```
Agent                  Escalation Handler          Human Approver
  │                          │                          │
  │── EscalationRequest ───►│                          │
  │   {tool: "shell_exec",  │── Approval Request ────►│
  │    justification: "..."}│                          │
  │                          │                          │
  │                          │◄── Approved/Denied ─────│
  │                          │                          │
  │◄── EscalationResult ───│                          │
  │   {granted: true,       │                          │
  │    temporary_token: ...} │                          │
  │                          │                          │
  │── tool call (with temp  │                          │
  │   token) ──────────────►│                          │
  │                          │                          │
  │   [Token expires after  │                          │
  │    single use or TTL]   │                          │
```

### Escalation Manager

```python
import time
import uuid
from dataclasses import dataclass, field
from typing import Optional, Callable
from enum import Enum


class EscalationStatus(Enum):
    PENDING = "pending"
    APPROVED = "approved"
    DENIED = "denied"
    EXPIRED = "expired"


@dataclass
class EscalationRequest:
    """A request from an agent for elevated permissions."""
    request_id: str = field(default_factory=lambda: f"esc_{uuid.uuid4().hex[:16]}")
    agent_id: str = ""
    tool_name: str = ""
    requested_scopes: list[PermissionScope] = field(default_factory=list)
    justification: str = ""
    context: dict = field(default_factory=dict)
    created_at: float = field(default_factory=time.time)
    ttl_seconds: int = 300  # 5 min to get approval
    status: EscalationStatus = EscalationStatus.PENDING
    reviewer: Optional[str] = None
    review_comment: Optional[str] = None


class EscalationManager:
    """
    Manages dynamic permission escalation requests.
    
    Supports:
    - Auto-approval for pre-authorized escalation paths
    - Human-in-the-loop approval for sensitive operations
    - Temporary capability tokens with limited TTL
    - Escalation audit logging
    """

    def __init__(
        self,
        token_factory: CapabilityTokenFactory,
        auto_approve_rules: Optional[dict[str, list[str]]] = None,
    ):
        self._token_factory = token_factory
        self._requests: dict[str, EscalationRequest] = {}
        self._auto_approve_rules = auto_approve_rules or {}
        self._approval_callback: Optional[Callable] = None

    def set_approval_callback(self, callback: Callable[[EscalationRequest], bool]):
        """Set a callback for human-in-the-loop approval."""
        self._approval_callback = callback

    def request_escalation(
        self,
        agent_id: str,
        tool_name: str,
        scopes: list[PermissionScope],
        justification: str,
        context: Optional[dict] = None,
    ) -> EscalationRequest:
        """Submit an escalation request."""
        request = EscalationRequest(
            agent_id=agent_id,
            tool_name=tool_name,
            requested_scopes=scopes,
            justification=justification,
            context=context or {},
        )
        self._requests[request.request_id] = request

        # Check auto-approval rules
        if self._can_auto_approve(request):
            request.status = EscalationStatus.APPROVED
            request.reviewer = "auto-approve-policy"
            return request

        # Try human-in-the-loop approval
        if self._approval_callback:
            approved = self._approval_callback(request)
            request.status = (
                EscalationStatus.APPROVED if approved else EscalationStatus.DENIED
            )
            request.reviewer = "human-approver"

        return request

    def _can_auto_approve(self, request: EscalationRequest) -> bool:
        """Check if the request matches auto-approval rules."""
        agent_rules = self._auto_approve_rules.get(request.agent_id, [])
        return request.tool_name in agent_rules

    def issue_temporary_token(
        self,
        request: EscalationRequest,
        ttl_seconds: int = 60,
        max_uses: int = 1,
    ) -> Optional[CapabilityToken]:
        """
        Issue a temporary capability token for an approved escalation.
        
        Temporary tokens have very short TTLs and limited use counts
        to minimize the blast radius of escalated permissions.
        """
        if request.status != EscalationStatus.APPROVED:
            return None

        token = self._token_factory.create_token(
            agent_id=request.agent_id,
            tool_name=request.tool_name,
            scopes=request.requested_scopes,
            ttl_seconds=ttl_seconds,
        )
        return token
```

---

## Least-Privilege Principle for Agents

The least-privilege principle dictates that each agent receives only the minimum permissions required to complete its task.

### Permission Profile Templates

```python
from dataclasses import dataclass, field


@dataclass
class AgentPermissionProfile:
    """
    Defines the complete permission profile for an agent.
    
    Each profile represents a role with predefined tool access
    and scope limitations.
    """
    profile_name: str
    description: str
    allowed_tools: list[str]
    denied_tools: list[str] = field(default_factory=list)
    default_scopes: list[PermissionScope] = field(default_factory=list)
    per_tool_scopes: dict[str, list[PermissionScope]] = field(default_factory=dict)
    max_calls_per_minute: int = 60
    max_concurrent_calls: int = 5
    can_escalate: bool = False
    escalation_targets: list[str] = field(default_factory=list)


# Predefined profiles for common agent roles
READONLY_PROFILE = AgentPermissionProfile(
    profile_name="readonly",
    description="Read-only access to filesystem and search tools",
    allowed_tools=["file_read", "file_list", "web_search", "grep_search"],
    default_scopes=[PermissionScope.READ],
    max_calls_per_minute=120,
    can_escalate=False,
)

DEVELOPER_PROFILE = AgentPermissionProfile(
    profile_name="developer",
    description="Read/write filesystem access with limited execution",
    allowed_tools=[
        "file_read", "file_write", "file_list", "file_delete",
        "grep_search", "web_search", "run_command",
    ],
    denied_tools=["deploy_service", "database_admin"],
    default_scopes=[PermissionScope.READ, PermissionScope.WRITE],
    per_tool_scopes={
        "run_command": [PermissionScope.EXECUTE],
        "file_delete": [PermissionScope.DELETE],
    },
    max_calls_per_minute=60,
    can_escalate=True,
    escalation_targets=["deploy_service"],
)

ADMIN_PROFILE = AgentPermissionProfile(
    profile_name="admin",
    description="Full access to all tools with administrative privileges",
    allowed_tools=["*"],
    default_scopes=[PermissionScope.ADMIN],
    max_calls_per_minute=300,
    max_concurrent_calls=20,
    can_escalate=True,
)


class AgentPermissionManager:
    """
    Assigns and manages permission profiles for agents.
    
    Supports runtime profile switching and temporary
    profile elevation for specific tasks.
    """

    def __init__(self):
        self._profiles: dict[str, AgentPermissionProfile] = {}
        self._agent_assignments: dict[str, str] = {}  # agent_id -> profile_name

    def register_profile(self, profile: AgentPermissionProfile) -> None:
        self._profiles[profile.profile_name] = profile

    def assign_profile(self, agent_id: str, profile_name: str) -> None:
        if profile_name not in self._profiles:
            raise ValueError(f"Unknown profile: {profile_name}")
        self._agent_assignments[agent_id] = profile_name

    def get_agent_profile(self, agent_id: str) -> AgentPermissionProfile:
        profile_name = self._agent_assignments.get(agent_id)
        if not profile_name:
            raise PermissionError(f"Agent '{agent_id}' has no assigned profile")
        return self._profiles[profile_name]

    def check_tool_access(
        self,
        agent_id: str,
        tool_name: str,
        required_scope: PermissionScope = PermissionScope.READ,
    ) -> tuple[bool, str]:
        """Check if an agent can access a tool with the required scope."""
        try:
            profile = self.get_agent_profile(agent_id)
        except PermissionError as e:
            return False, str(e)

        # Check denylist
        if tool_name in profile.denied_tools:
            return False, f"Tool '{tool_name}' is denied for profile '{profile.profile_name}'"

        # Check allowlist
        if "*" not in profile.allowed_tools and tool_name not in profile.allowed_tools:
            return False, f"Tool '{tool_name}' is not allowed for profile '{profile.profile_name}'"

        # Check scope
        effective_scopes = set(profile.default_scopes)
        if tool_name in profile.per_tool_scopes:
            effective_scopes |= set(profile.per_tool_scopes[tool_name])

        if PermissionScope.ADMIN in effective_scopes:
            return True, "Admin scope grants all access"

        if required_scope not in effective_scopes:
            return False, f"Scope '{required_scope.value}' not granted for tool '{tool_name}'"

        return True, "Access granted"
```

---

## Permission Audit Trails

Every permission decision must be logged for forensic analysis, compliance, and debugging.

### Audit Log Schema

```json
{
  "event_id": "evt_a1b2c3d4",
  "timestamp": "2025-11-15T14:30:00.123Z",
  "event_type": "tool_permission_check",
  "agent_id": "agent_42",
  "tool_name": "file_write",
  "parameters_hash": "sha256:abc123...",
  "decision": "allow",
  "reason": "All policy checks passed",
  "policy_version": "v2.1",
  "scopes_required": ["write"],
  "scopes_granted": ["read", "write"],
  "capability_id": "cap_xyz789",
  "escalation_id": null,
  "session_id": "sess_m4n5o6",
  "ip_address": "10.0.1.42",
  "duration_us": 145
}
```

### Audit Logger Implementation

```python
import json
import time
import uuid
import hashlib
from dataclasses import dataclass, field, asdict
from typing import Any, Optional
from pathlib import Path
from enum import Enum


class AuditEventType(Enum):
    PERMISSION_CHECK = "tool_permission_check"
    ESCALATION_REQUEST = "escalation_request"
    ESCALATION_DECISION = "escalation_decision"
    TOKEN_ISSUED = "capability_token_issued"
    TOKEN_REVOKED = "capability_token_revoked"
    POLICY_UPDATED = "policy_updated"
    ACCESS_DENIED = "access_denied"


@dataclass
class AuditEvent:
    """A single permission audit event."""
    event_type: AuditEventType
    agent_id: str
    tool_name: str
    decision: str
    reason: str
    event_id: str = field(default_factory=lambda: f"evt_{uuid.uuid4().hex[:12]}")
    timestamp: float = field(default_factory=time.time)
    parameters_hash: Optional[str] = None
    scopes_required: list[str] = field(default_factory=list)
    scopes_granted: list[str] = field(default_factory=list)
    capability_id: Optional[str] = None
    escalation_id: Optional[str] = None
    session_id: Optional[str] = None
    metadata: dict[str, Any] = field(default_factory=dict)
    duration_us: int = 0


class PermissionAuditLogger:
    """
    Structured audit logger for permission decisions.
    
    Supports multiple output sinks:
    - File-based (JSON Lines format)
    - In-memory buffer (for testing)
    - Pluggable external sinks (SIEM, log aggregator)
    """

    def __init__(
        self,
        log_file: Optional[str] = None,
        buffer_size: int = 1000,
    ):
        self._log_file = Path(log_file) if log_file else None
        self._buffer: list[AuditEvent] = []
        self._buffer_size = buffer_size

        if self._log_file:
            self._log_file.parent.mkdir(parents=True, exist_ok=True)

    def log(self, event: AuditEvent) -> None:
        """Record an audit event."""
        self._buffer.append(event)

        if self._log_file:
            with open(self._log_file, "a") as f:
                entry = {
                    "event_id": event.event_id,
                    "timestamp": event.timestamp,
                    "event_type": event.event_type.value,
                    "agent_id": event.agent_id,
                    "tool_name": event.tool_name,
                    "decision": event.decision,
                    "reason": event.reason,
                    "parameters_hash": event.parameters_hash,
                    "scopes_required": event.scopes_required,
                    "scopes_granted": event.scopes_granted,
                    "capability_id": event.capability_id,
                    "duration_us": event.duration_us,
                }
                f.write(json.dumps(entry) + "\n")

        # Trim buffer if needed
        if len(self._buffer) > self._buffer_size:
            self._buffer = self._buffer[-self._buffer_size:]

    def log_permission_check(
        self,
        agent_id: str,
        tool_name: str,
        parameters: Optional[dict],
        decision: PolicyDecision,
        reason: str,
        scopes_required: Optional[list[PermissionScope]] = None,
        scopes_granted: Optional[list[PermissionScope]] = None,
        duration_us: int = 0,
    ) -> AuditEvent:
        """Convenience method to log a permission check result."""
        params_hash = None
        if parameters:
            canonical = json.dumps(parameters, sort_keys=True, separators=(",", ":"))
            params_hash = f"sha256:{hashlib.sha256(canonical.encode()).hexdigest()[:16]}"

        event = AuditEvent(
            event_type=AuditEventType.PERMISSION_CHECK,
            agent_id=agent_id,
            tool_name=tool_name,
            decision=decision.value,
            reason=reason,
            parameters_hash=params_hash,
            scopes_required=[s.value for s in (scopes_required or [])],
            scopes_granted=[s.value for s in (scopes_granted or [])],
            duration_us=duration_us,
        )
        self.log(event)
        return event

    def get_agent_history(
        self, agent_id: str, limit: int = 100
    ) -> list[AuditEvent]:
        """Retrieve recent audit events for a specific agent."""
        events = [e for e in self._buffer if e.agent_id == agent_id]
        return events[-limit:]

    def get_denied_events(self, limit: int = 100) -> list[AuditEvent]:
        """Retrieve recent denied permission events."""
        denied = [e for e in self._buffer if e.decision == "deny"]
        return denied[-limit:]

    def summary_stats(self) -> dict[str, Any]:
        """Generate summary statistics from the audit buffer."""
        total = len(self._buffer)
        if total == 0:
            return {"total": 0}

        allowed = sum(1 for e in self._buffer if e.decision == "allow")
        denied = sum(1 for e in self._buffer if e.decision == "deny")
        by_tool: dict[str, int] = {}
        by_agent: dict[str, int] = {}

        for event in self._buffer:
            by_tool[event.tool_name] = by_tool.get(event.tool_name, 0) + 1
            by_agent[event.agent_id] = by_agent.get(event.agent_id, 0) + 1

        return {
            "total": total,
            "allowed": allowed,
            "denied": denied,
            "deny_rate": round(denied / total * 100, 2),
            "top_tools": dict(sorted(by_tool.items(), key=lambda x: -x[1])[:10]),
            "top_agents": dict(sorted(by_agent.items(), key=lambda x: -x[1])[:10]),
        }
```

---

## Integrated Permission Gateway

The gateway combines all components into a single enforcement point.

```python
import time
from typing import Any, Optional


class PermissionGateway:
    """
    Unified permission gateway that sits between the agent and tool provider.
    
    Combines:
    - Policy engine (allowlist/denylist)
    - Scope enforcer
    - Capability token verification
    - Rate limiting
    - Audit logging
    """

    def __init__(
        self,
        policy_engine: PermissionPolicyEngine,
        scope_enforcer: ScopeEnforcer,
        token_factory: CapabilityTokenFactory,
        audit_logger: PermissionAuditLogger,
    ):
        self.policy_engine = policy_engine
        self.scope_enforcer = scope_enforcer
        self.token_factory = token_factory
        self.audit_logger = audit_logger
        self._rate_counters: dict[str, list[float]] = {}

    def authorize(
        self,
        agent_id: str,
        tool_name: str,
        parameters: dict[str, Any],
        capability_token: Optional[CapabilityToken] = None,
    ) -> tuple[bool, str]:
        """
        Authorize a tool call through the full permission pipeline.
        
        Pipeline:
        1. Rate limit check
        2. Policy engine (denylist/allowlist)
        3. Capability token verification
        4. Scope enforcement
        5. Audit logging
        """
        start = time.monotonic()

        # Step 1: Rate limit check
        rate_ok, rate_msg = self._check_rate_limit(agent_id, tool_name)
        if not rate_ok:
            self._log_decision(
                agent_id, tool_name, parameters,
                PolicyDecision.DENY, rate_msg, start
            )
            return False, rate_msg

        # Step 2: Policy engine
        policy_decision, policy_reason = self.policy_engine.evaluate(
            tool_name, parameters, agent_id
        )
        if policy_decision == PolicyDecision.DENY:
            self._log_decision(
                agent_id, tool_name, parameters,
                PolicyDecision.DENY, policy_reason, start
            )
            return False, policy_reason

        # Step 3: Capability token verification
        if capability_token:
            if not self.token_factory.verify(capability_token):
                reason = "Invalid or expired capability token"
                self._log_decision(
                    agent_id, tool_name, parameters,
                    PolicyDecision.DENY, reason, start
                )
                return False, reason

            if capability_token.tool_name != tool_name:
                reason = (
                    f"Token is for tool '{capability_token.tool_name}', "
                    f"not '{tool_name}'"
                )
                self._log_decision(
                    agent_id, tool_name, parameters,
                    PolicyDecision.DENY, reason, start
                )
                return False, reason

        # Step 4: Scope enforcement
        scopes = (
            capability_token.scopes
            if capability_token
            else [PermissionScope.READ]
        )
        scope_ok, missing = self.scope_enforcer.check(tool_name, scopes, parameters)
        if not scope_ok:
            reason = f"Missing scopes: {missing}"
            self._log_decision(
                agent_id, tool_name, parameters,
                PolicyDecision.DENY, reason, start
            )
            return False, reason

        # All checks passed
        self._log_decision(
            agent_id, tool_name, parameters,
            PolicyDecision.ALLOW, "All checks passed", start
        )
        return True, "Authorized"

    def _check_rate_limit(
        self, agent_id: str, tool_name: str
    ) -> tuple[bool, str]:
        """Simple sliding-window rate limiter."""
        key = f"{agent_id}:{tool_name}"
        now = time.time()
        window = 60.0  # 1 minute window
        max_calls = 60

        if key not in self._rate_counters:
            self._rate_counters[key] = []

        # Remove old entries
        self._rate_counters[key] = [
            t for t in self._rate_counters[key] if now - t < window
        ]

        if len(self._rate_counters[key]) >= max_calls:
            return False, f"Rate limit exceeded: {max_calls} calls per {window}s"

        self._rate_counters[key].append(now)
        return True, "Within rate limit"

    def _log_decision(
        self,
        agent_id: str,
        tool_name: str,
        parameters: dict,
        decision: PolicyDecision,
        reason: str,
        start_time: float,
    ) -> None:
        """Log the authorization decision to the audit trail."""
        duration_us = int((time.monotonic() - start_time) * 1_000_000)
        self.audit_logger.log_permission_check(
            agent_id=agent_id,
            tool_name=tool_name,
            parameters=parameters,
            decision=decision,
            reason=reason,
            duration_us=duration_us,
        )
```

---

## Anti-Patterns

| Anti-Pattern | Problem | Correct Approach |
| :--- | :--- | :--- |
| No permission checks on tools | Agent can invoke any tool without restriction | Enforce allowlist + scope checks on every call |
| Embedding secrets in capability tokens | Token theft exposes credentials | Tokens reference permissions only; secrets stay server-side |
| Permanent escalation grants | Elevated permissions persist beyond need | Issue temporary tokens with short TTL and limited use count |
| Skipping audit logging | No forensic trail for security incidents | Log every permission check with decision and context |
| Coarse-grained "admin" roles for all agents | Violates least-privilege principle | Define per-role profiles with minimal required scopes |
| Checking permissions client-side only | Client can be modified to skip checks | Enforce permissions server-side at the gateway |

---

## Handoff & Related References
- Tool Schema Definitions: [tool-schema-definitions.md](tool-schema-definitions.md)
- MCP Protocol Patterns: [mcp-protocol-patterns.md](mcp-protocol-patterns.md)
- Tool Error Handling: [tool-error-handling.md](tool-error-handling.md)
- Tool Discovery & Routing: [tool-discovery-routing.md](tool-discovery-routing.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Full permission model implementations with capability tokens, policy engines, scope enforcement, escalation workflows, and audit logging)
Strict compliance with capability-based security and least-privilege agent authorization patterns.
-->
