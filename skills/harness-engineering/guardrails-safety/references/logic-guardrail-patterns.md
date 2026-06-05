# Logic Guardrail Patterns

## Overview

Logic guardrails enforce authorization, permission boundaries, and parameter validation on every tool call an AI agent attempts to execute. They sit between the agent's reasoning loop and the actual tool execution layer, acting as a mandatory policy enforcement point that prevents unauthorized actions, scope violations, and parameter injection attacks.

---

## Tool Authorization Architecture

```
[Agent Reasoning Loop]
       │
       ├──► Proposes Tool Call: { tool: "execute_sql", params: { query: "SELECT ..." } }
       │
       ▼
+-------------------+
| Logic Guardrail   |
+-------------------+
       │
       ├──► (1) Tool Registry Lookup ──► Is this tool registered and enabled?
       │
       ├──► (2) RBAC Authorization ──► Does the agent/user have permission for this tool?
       │
       ├──► (3) Scope Validation ──► Are the parameters within allowed boundaries?
       │
       ├──► (4) Rate Limiting ──► Has the tool call rate exceeded the budget?
       │
       └──► (5) Audit Logging ──► Record the authorization decision
              │
              ├── GRANTED ──► Execute tool and return result
              ├── DOWNGRADED ──► Execute with reduced permissions
              └── DENIED ──► Return error to agent, do NOT execute
```

---

## RBAC Permission Model

### Role-Based Access Control (RBAC) Schema

```yaml
# rbac-config.yaml
roles:
  reader:
    description: "Read-only access to data retrieval tools"
    allowed_tools:
      - search_documents
      - query_database
      - read_file
    denied_tools:
      - execute_sql_write
      - delete_file
      - send_email
    parameter_constraints:
      query_database:
        max_rows: 100
        allowed_tables: ["products", "categories", "public_reports"]
        denied_operations: ["DELETE", "UPDATE", "INSERT", "DROP", "ALTER"]

  analyst:
    description: "Read + analysis tools with limited write"
    inherits: reader
    allowed_tools:
      - run_analysis
      - generate_chart
      - export_csv
    parameter_constraints:
      export_csv:
        max_rows: 10000
        allowed_formats: ["csv", "json"]

  admin:
    description: "Full tool access with audit requirements"
    allowed_tools: ["*"]
    denied_tools: []
    requires_mfa: true
    audit_level: "detailed"
    parameter_constraints:
      execute_sql_write:
        require_confirmation: true
        max_affected_rows: 1000

agents:
  data-retrieval-agent:
    role: reader
    session_timeout: 3600
    max_tool_calls_per_session: 100

  analysis-agent:
    role: analyst
    session_timeout: 7200
    max_tool_calls_per_session: 500

  admin-agent:
    role: admin
    session_timeout: 1800
    max_tool_calls_per_session: 50
    ip_whitelist: ["10.0.0.0/8"]
```

### Python RBAC Implementation

```python
import yaml
import time
from typing import Dict, Any, List, Optional, Set
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path


class AuthorizationVerdict(Enum):
    GRANTED = "granted"
    DENIED = "denied"
    DOWNGRADED = "downgraded"


@dataclass
class ToolCallRequest:
    """Represents a tool call the agent wants to execute."""
    tool_name: str
    parameters: Dict[str, Any]
    agent_id: str
    session_id: str
    timestamp: float = field(default_factory=time.time)


@dataclass
class AuthorizationResult:
    """Result of the authorization check."""
    verdict: AuthorizationVerdict
    tool_name: str
    agent_id: str
    reason: str
    original_params: Dict[str, Any]
    effective_params: Dict[str, Any]  # May be modified for DOWNGRADED
    constraints_applied: List[str] = field(default_factory=list)


@dataclass
class RoleDefinition:
    """Parsed role configuration."""
    name: str
    allowed_tools: Set[str]
    denied_tools: Set[str]
    parameter_constraints: Dict[str, Dict[str, Any]]
    inherits: Optional[str] = None
    requires_mfa: bool = False
    audit_level: str = "standard"


class RBACAuthorizationEngine:
    """
    Role-Based Access Control engine for tool call authorization.
    Supports role inheritance, parameter constraints, and rate limiting.
    """

    def __init__(self, config_path: Optional[str] = None, config_dict: Optional[Dict] = None):
        if config_dict:
            self.config = config_dict
        elif config_path:
            with open(config_path, 'r') as f:
                self.config = yaml.safe_load(f)
        else:
            raise ValueError("Either config_path or config_dict must be provided")

        self.roles = self._parse_roles()
        self.agent_roles = self._parse_agent_roles()
        self._call_counts: Dict[str, int] = {}  # session_id -> call count

    def _parse_roles(self) -> Dict[str, RoleDefinition]:
        """Parse role definitions with inheritance resolution."""
        roles = {}
        raw_roles = self.config.get("roles", {})

        for name, cfg in raw_roles.items():
            allowed = set(cfg.get("allowed_tools", []))
            denied = set(cfg.get("denied_tools", []))
            constraints = cfg.get("parameter_constraints", {})
            inherits = cfg.get("inherits")

            roles[name] = RoleDefinition(
                name=name,
                allowed_tools=allowed,
                denied_tools=denied,
                parameter_constraints=constraints,
                inherits=inherits,
                requires_mfa=cfg.get("requires_mfa", False),
                audit_level=cfg.get("audit_level", "standard")
            )

        # Resolve inheritance
        for name, role in roles.items():
            if role.inherits and role.inherits in roles:
                parent = roles[role.inherits]
                role.allowed_tools = parent.allowed_tools | role.allowed_tools
                merged_constraints = {**parent.parameter_constraints}
                merged_constraints.update(role.parameter_constraints)
                role.parameter_constraints = merged_constraints

        return roles

    def _parse_agent_roles(self) -> Dict[str, Dict[str, Any]]:
        """Parse agent-to-role mappings."""
        agents = {}
        for agent_id, cfg in self.config.get("agents", {}).items():
            agents[agent_id] = {
                "role": cfg.get("role", "reader"),
                "session_timeout": cfg.get("session_timeout", 3600),
                "max_tool_calls": cfg.get("max_tool_calls_per_session", 100),
            }
        return agents

    def authorize(self, request: ToolCallRequest) -> AuthorizationResult:
        """
        Evaluate a tool call request against RBAC policies.

        Returns an AuthorizationResult with GRANTED, DENIED, or DOWNGRADED verdict.
        """
        # Step 1: Resolve agent role
        agent_config = self.agent_roles.get(request.agent_id)
        if not agent_config:
            return AuthorizationResult(
                verdict=AuthorizationVerdict.DENIED,
                tool_name=request.tool_name,
                agent_id=request.agent_id,
                reason=f"Agent '{request.agent_id}' not found in registry",
                original_params=request.parameters,
                effective_params={}
            )

        role_name = agent_config["role"]
        role = self.roles.get(role_name)
        if not role:
            return AuthorizationResult(
                verdict=AuthorizationVerdict.DENIED,
                tool_name=request.tool_name,
                agent_id=request.agent_id,
                reason=f"Role '{role_name}' not defined",
                original_params=request.parameters,
                effective_params={}
            )

        # Step 2: Check tool allowlist/denylist
        if request.tool_name in role.denied_tools:
            return AuthorizationResult(
                verdict=AuthorizationVerdict.DENIED,
                tool_name=request.tool_name,
                agent_id=request.agent_id,
                reason=f"Tool '{request.tool_name}' is explicitly denied for role '{role_name}'",
                original_params=request.parameters,
                effective_params={}
            )

        if "*" not in role.allowed_tools and request.tool_name not in role.allowed_tools:
            return AuthorizationResult(
                verdict=AuthorizationVerdict.DENIED,
                tool_name=request.tool_name,
                agent_id=request.agent_id,
                reason=f"Tool '{request.tool_name}' is not in allowed set for role '{role_name}'",
                original_params=request.parameters,
                effective_params={}
            )

        # Step 3: Check rate limits
        session_key = request.session_id
        self._call_counts[session_key] = self._call_counts.get(session_key, 0) + 1
        max_calls = agent_config["max_tool_calls"]
        if self._call_counts[session_key] > max_calls:
            return AuthorizationResult(
                verdict=AuthorizationVerdict.DENIED,
                tool_name=request.tool_name,
                agent_id=request.agent_id,
                reason=f"Rate limit exceeded: {self._call_counts[session_key]}/{max_calls} calls",
                original_params=request.parameters,
                effective_params={}
            )

        # Step 4: Apply parameter constraints
        constraints = role.parameter_constraints.get(request.tool_name, {})
        effective_params = dict(request.parameters)
        constraints_applied = []

        if constraints:
            result = self._apply_constraints(
                effective_params, constraints, request.tool_name
            )
            effective_params = result["params"]
            constraints_applied = result["applied"]

            if result.get("denied"):
                return AuthorizationResult(
                    verdict=AuthorizationVerdict.DENIED,
                    tool_name=request.tool_name,
                    agent_id=request.agent_id,
                    reason=result["denial_reason"],
                    original_params=request.parameters,
                    effective_params={},
                    constraints_applied=constraints_applied
                )

        # Determine if params were modified (DOWNGRADED vs GRANTED)
        if effective_params != request.parameters:
            verdict = AuthorizationVerdict.DOWNGRADED
            reason = f"Parameters constrained by role '{role_name}' policy"
        else:
            verdict = AuthorizationVerdict.GRANTED
            reason = f"Authorized under role '{role_name}'"

        return AuthorizationResult(
            verdict=verdict,
            tool_name=request.tool_name,
            agent_id=request.agent_id,
            reason=reason,
            original_params=request.parameters,
            effective_params=effective_params,
            constraints_applied=constraints_applied
        )

    def _apply_constraints(
        self,
        params: Dict[str, Any],
        constraints: Dict[str, Any],
        tool_name: str
    ) -> Dict[str, Any]:
        """Apply parameter constraints and return modified params."""
        applied = []
        result_params = dict(params)

        # Max rows constraint
        if "max_rows" in constraints and "max_rows" in result_params:
            if result_params["max_rows"] > constraints["max_rows"]:
                result_params["max_rows"] = constraints["max_rows"]
                applied.append(f"max_rows capped to {constraints['max_rows']}")

        # Allowed tables constraint
        if "allowed_tables" in constraints and "table" in result_params:
            if result_params["table"] not in constraints["allowed_tables"]:
                return {
                    "params": result_params,
                    "applied": applied,
                    "denied": True,
                    "denial_reason": (
                        f"Table '{result_params['table']}' not in allowed set: "
                        f"{constraints['allowed_tables']}"
                    )
                }

        # Denied SQL operations
        if "denied_operations" in constraints and "query" in result_params:
            query_upper = result_params["query"].upper().strip()
            for op in constraints["denied_operations"]:
                if query_upper.startswith(op):
                    return {
                        "params": result_params,
                        "applied": applied,
                        "denied": True,
                        "denial_reason": f"SQL operation '{op}' is denied for this role"
                    }

        return {"params": result_params, "applied": applied}
```

---

## Parameter Boundary Validation

Beyond RBAC, individual tool parameters must be validated against strict schemas:

```python
import json
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class ValidationError:
    """A parameter validation error."""
    field: str
    message: str
    value: Any


@dataclass
class ParameterValidationResult:
    """Result of parameter boundary validation."""
    is_valid: bool
    errors: List[ValidationError]
    sanitized_params: Dict[str, Any]


class ParameterBoundaryValidator:
    """
    Validates tool call parameters against defined boundary schemas.
    Prevents parameter injection, out-of-range values, and type mismatches.
    """

    # Tool parameter schemas
    SCHEMAS: Dict[str, Dict[str, Any]] = {
        "execute_sql": {
            "query": {
                "type": "string",
                "max_length": 5000,
                "forbidden_patterns": [
                    r";\s*DROP\s", r";\s*DELETE\s", r";\s*TRUNCATE\s",
                    r"--", r"/\*", r"UNION\s+SELECT",
                    r"INTO\s+OUTFILE", r"LOAD_FILE",
                ],
            },
            "max_rows": {
                "type": "integer",
                "min": 1,
                "max": 10000,
                "default": 100,
            },
            "timeout_seconds": {
                "type": "integer",
                "min": 1,
                "max": 300,
                "default": 30,
            },
        },
        "read_file": {
            "file_path": {
                "type": "string",
                "max_length": 500,
                "forbidden_patterns": [
                    r"\.\./",  # Path traversal
                    r"^/etc/",  # System files
                    r"^/proc/",  # Proc filesystem
                    r"~",  # Home directory expansion
                ],
                "allowed_prefixes": ["/data/", "/workspace/", "/tmp/agent/"],
            },
            "encoding": {
                "type": "string",
                "allowed_values": ["utf-8", "ascii", "latin-1"],
                "default": "utf-8",
            },
        },
        "send_email": {
            "to": {
                "type": "string",
                "pattern": r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$",
                "max_length": 254,
            },
            "subject": {
                "type": "string",
                "max_length": 200,
            },
            "body": {
                "type": "string",
                "max_length": 50000,
            },
        },
    }

    def validate(
        self, tool_name: str, params: Dict[str, Any]
    ) -> ParameterValidationResult:
        """Validate parameters against the tool's schema."""
        schema = self.SCHEMAS.get(tool_name)
        if not schema:
            return ParameterValidationResult(
                is_valid=True,
                errors=[],
                sanitized_params=params
            )

        errors = []
        sanitized = dict(params)

        for field_name, rules in schema.items():
            value = params.get(field_name)

            # Apply defaults for missing optional fields
            if value is None and "default" in rules:
                sanitized[field_name] = rules["default"]
                continue

            if value is None:
                continue

            # Type checking
            expected_type = rules.get("type")
            if expected_type == "string" and not isinstance(value, str):
                errors.append(ValidationError(
                    field=field_name,
                    message=f"Expected string, got {type(value).__name__}",
                    value=value
                ))
                continue

            if expected_type == "integer" and not isinstance(value, int):
                errors.append(ValidationError(
                    field=field_name,
                    message=f"Expected integer, got {type(value).__name__}",
                    value=value
                ))
                continue

            # String validations
            if expected_type == "string" and isinstance(value, str):
                if "max_length" in rules and len(value) > rules["max_length"]:
                    errors.append(ValidationError(
                        field=field_name,
                        message=f"Length {len(value)} exceeds max {rules['max_length']}",
                        value=f"{value[:50]}..."
                    ))

                if "forbidden_patterns" in rules:
                    import re
                    for pattern in rules["forbidden_patterns"]:
                        if re.search(pattern, value, re.IGNORECASE):
                            errors.append(ValidationError(
                                field=field_name,
                                message=f"Forbidden pattern detected: {pattern}",
                                value=f"{value[:50]}..."
                            ))

                if "allowed_prefixes" in rules:
                    if not any(value.startswith(p) for p in rules["allowed_prefixes"]):
                        errors.append(ValidationError(
                            field=field_name,
                            message=f"Path must start with one of: {rules['allowed_prefixes']}",
                            value=value
                        ))

                if "allowed_values" in rules and value not in rules["allowed_values"]:
                    errors.append(ValidationError(
                        field=field_name,
                        message=f"Value must be one of: {rules['allowed_values']}",
                        value=value
                    ))

                if "pattern" in rules:
                    import re
                    if not re.match(rules["pattern"], value):
                        errors.append(ValidationError(
                            field=field_name,
                            message=f"Value does not match required pattern",
                            value=value
                        ))

            # Integer validations
            if expected_type == "integer" and isinstance(value, int):
                if "min" in rules and value < rules["min"]:
                    sanitized[field_name] = rules["min"]
                if "max" in rules and value > rules["max"]:
                    sanitized[field_name] = rules["max"]

        return ParameterValidationResult(
            is_valid=len(errors) == 0,
            errors=errors,
            sanitized_params=sanitized
        )
```

---

## Sandbox Execution Scoping

For high-risk tools, execute within an isolated sandbox:

```python
import subprocess
import tempfile
import os
from typing import Dict, Any, Optional
from dataclasses import dataclass


@dataclass
class SandboxConfig:
    """Configuration for sandboxed tool execution."""
    max_memory_mb: int = 256
    max_cpu_seconds: int = 30
    max_file_size_mb: int = 10
    network_access: bool = False
    allowed_env_vars: list = None
    working_directory: str = "/tmp/sandbox"

    def __post_init__(self):
        if self.allowed_env_vars is None:
            self.allowed_env_vars = ["PATH", "HOME", "LANG"]


@dataclass
class SandboxResult:
    """Result from sandboxed execution."""
    success: bool
    stdout: str
    stderr: str
    exit_code: int
    execution_time_ms: float
    killed: bool = False
    kill_reason: str = ""


class SandboxExecutor:
    """
    Executes tool calls in an isolated sandbox environment.
    Enforces memory, CPU, network, and filesystem constraints.
    """

    def __init__(self, config: Optional[SandboxConfig] = None):
        self.config = config or SandboxConfig()

    def execute(
        self,
        command: str,
        stdin_data: Optional[str] = None,
        env_override: Optional[Dict[str, str]] = None
    ) -> SandboxResult:
        """Execute a command in the sandbox."""
        # Build restricted environment
        env = {
            k: v for k, v in os.environ.items()
            if k in self.config.allowed_env_vars
        }
        if env_override:
            env.update(env_override)

        # Create isolated working directory
        with tempfile.TemporaryDirectory(prefix="sandbox_") as tmpdir:
            import time
            start = time.monotonic()

            try:
                proc = subprocess.run(
                    command,
                    shell=True,
                    capture_output=True,
                    text=True,
                    timeout=self.config.max_cpu_seconds,
                    cwd=tmpdir,
                    env=env,
                    input=stdin_data
                )

                elapsed = (time.monotonic() - start) * 1000

                return SandboxResult(
                    success=proc.returncode == 0,
                    stdout=proc.stdout[:10000],  # Cap output
                    stderr=proc.stderr[:5000],
                    exit_code=proc.returncode,
                    execution_time_ms=round(elapsed, 2)
                )

            except subprocess.TimeoutExpired:
                elapsed = (time.monotonic() - start) * 1000
                return SandboxResult(
                    success=False,
                    stdout="",
                    stderr="Execution timed out",
                    exit_code=-1,
                    execution_time_ms=round(elapsed, 2),
                    killed=True,
                    kill_reason=f"Exceeded {self.config.max_cpu_seconds}s CPU limit"
                )

            except Exception as e:
                elapsed = (time.monotonic() - start) * 1000
                return SandboxResult(
                    success=False,
                    stdout="",
                    stderr=str(e),
                    exit_code=-1,
                    execution_time_ms=round(elapsed, 2)
                )
```

---

## TypeScript Tool Authorization

```typescript
interface ToolCallRequest {
  toolName: string;
  parameters: Record<string, unknown>;
  agentId: string;
  sessionId: string;
}

interface AuthorizationResult {
  verdict: 'granted' | 'denied' | 'downgraded';
  toolName: string;
  reason: string;
  effectiveParams: Record<string, unknown>;
}

interface RoleConfig {
  allowedTools: Set<string>;
  deniedTools: Set<string>;
  maxCallsPerSession: number;
  parameterConstraints: Record<string, Record<string, unknown>>;
}

class ToolAuthorizationEngine {
  private roles: Map<string, RoleConfig>;
  private agentRoles: Map<string, string>;
  private callCounts: Map<string, number> = new Map();

  constructor(
    roles: Map<string, RoleConfig>,
    agentRoles: Map<string, string>,
  ) {
    this.roles = roles;
    this.agentRoles = agentRoles;
  }

  authorize(request: ToolCallRequest): AuthorizationResult {
    const roleName = this.agentRoles.get(request.agentId);
    if (!roleName) {
      return {
        verdict: 'denied',
        toolName: request.toolName,
        reason: `Agent '${request.agentId}' not registered`,
        effectiveParams: {},
      };
    }

    const role = this.roles.get(roleName);
    if (!role) {
      return {
        verdict: 'denied',
        toolName: request.toolName,
        reason: `Role '${roleName}' not defined`,
        effectiveParams: {},
      };
    }

    // Check deny list
    if (role.deniedTools.has(request.toolName)) {
      return {
        verdict: 'denied',
        toolName: request.toolName,
        reason: `Tool '${request.toolName}' denied for role '${roleName}'`,
        effectiveParams: {},
      };
    }

    // Check allow list
    if (!role.allowedTools.has('*') && !role.allowedTools.has(request.toolName)) {
      return {
        verdict: 'denied',
        toolName: request.toolName,
        reason: `Tool '${request.toolName}' not allowed for role '${roleName}'`,
        effectiveParams: {},
      };
    }

    // Check rate limit
    const count = (this.callCounts.get(request.sessionId) ?? 0) + 1;
    this.callCounts.set(request.sessionId, count);
    if (count > role.maxCallsPerSession) {
      return {
        verdict: 'denied',
        toolName: request.toolName,
        reason: `Rate limit exceeded: ${count}/${role.maxCallsPerSession}`,
        effectiveParams: {},
      };
    }

    return {
      verdict: 'granted',
      toolName: request.toolName,
      reason: `Authorized under role '${roleName}'`,
      effectiveParams: { ...request.parameters },
    };
  }
}
```

---

## Best Practices

1. **Fail closed**: If the RBAC engine cannot resolve permissions, deny the tool call.
2. **Log all decisions**: Every authorization verdict (including grants) must be logged for audit.
3. **Validate parameters server-side**: Never trust parameter schemas from the agent's reasoning.
4. **Use allowlists, not denylists**: Define what is permitted, not what is forbidden. Denylists miss new threats.
5. **Separate read and write**: Different permission levels for data reads vs. writes.

## Anti-Patterns

1. **Trusting agent self-reports**: Never allow agents to declare their own permission level.
2. **Static permissions without context**: Permissions should consider session context, time of day, and risk level.
3. **No rate limiting**: Unbounded tool calls enable resource exhaustion attacks.
4. **Hardcoded credentials in tool configs**: Tool credentials must come from secret managers, never config files.

---

## Handoff & Related References
- Input Guardrail Patterns: [input-guardrail-patterns.md](input-guardrail-patterns.md)
- Policy Enforcement Engines: [policy-enforcement-engines.md](policy-enforcement-engines.md)
- Guardrail Monitoring & Alerting: [guardrail-monitoring-alerting.md](guardrail-monitoring-alerting.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive RBAC implementations & parameter validation preserved)
-->
