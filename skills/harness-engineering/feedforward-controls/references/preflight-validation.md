# Pre-Flight Validation

## Theoretical Foundation

Pre-flight validation is the systematic verification of all preconditions before an agent commits to executing an action. Borrowed from aviation safety protocols, this pattern ensures that every execution step has been checked for feasibility, resource availability, and constraint satisfaction before any irreversible changes are made.

The pre-flight validation gate function is defined as:

$$G_{preflight}(a) = \prod_{i=1}^{k} V_i(a) \geq \theta_{gate}$$

Where $a$ is the proposed action, $V_i$ is validator $i$, $k$ is the number of validators, and $\theta_{gate}$ is the minimum pass threshold (typically 1.0 for hard gates).

```
+----------------------------------------------------------------------+
|                    PRE-FLIGHT VALIDATION PIPELINE                    |
|                                                                      |
|   [Proposed Action]                                                  |
|        │                                                             |
|        ├──► [File Existence Check]     ──► PASS/FAIL                |
|        ├──► [Permission Check]         ──► PASS/FAIL                |
|        ├──► [Token Budget Check]       ──► PASS/FAIL                |
|        ├──► [Tool Availability Check]  ──► PASS/FAIL                |
|        ├──► [Constraint Satisfaction]  ──► PASS/FAIL                |
|        ├──► [Dependency Readiness]     ──► PASS/FAIL                |
|        │                                                             |
|        ▼                                                             |
|   [All PASS?] ──YES──► [EXECUTE]                                    |
|        │                                                             |
|        └──NO───► [BLOCK + Report Failures]                          |
+----------------------------------------------------------------------+
```

---

## Validation Categories

### Category 1: File System Validators

Verify that target files exist, are readable/writable, and match expected states.

### Category 2: Resource Validators

Confirm that token budgets, API rate limits, and computational resources are sufficient.

### Category 3: Constraint Validators

Check that the proposed action satisfies all hard and soft constraints.

### Category 4: Dependency Validators

Ensure all prerequisite steps have completed successfully.

### Category 5: Safety Validators

Verify that the action does not violate safety rules (e.g., overwriting protected files).

---

## Python Implementation: Pre-Flight Validation Engine

```python
import os
import json
from typing import List, Dict, Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path


class ValidationSeverity(Enum):
    CRITICAL = "critical"  # Must pass, blocks execution
    WARNING = "warning"    # Should pass, allows execution with caution
    INFO = "info"          # Informational, never blocks


class ValidationStatus(Enum):
    PASS = "pass"
    FAIL = "fail"
    SKIP = "skip"
    WARNING = "warning"


@dataclass
class ValidationResult:
    """Result of a single validation check."""
    validator_name: str
    status: ValidationStatus
    severity: ValidationSeverity
    message: str
    details: Optional[Dict[str, Any]] = None
    remediation: Optional[str] = None

    @property
    def blocks_execution(self) -> bool:
        return (
            self.status == ValidationStatus.FAIL
            and self.severity == ValidationSeverity.CRITICAL
        )


@dataclass
class PreFlightReport:
    """Aggregate report of all pre-flight validations."""
    results: List[ValidationResult] = field(default_factory=list)
    overall_pass: bool = True
    critical_failures: int = 0
    warnings: int = 0
    execution_allowed: bool = True

    def add_result(self, result: ValidationResult) -> None:
        self.results.append(result)
        if result.blocks_execution:
            self.overall_pass = False
            self.critical_failures += 1
            self.execution_allowed = False
        if result.status == ValidationStatus.WARNING:
            self.warnings += 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "overall_pass": self.overall_pass,
            "execution_allowed": self.execution_allowed,
            "critical_failures": self.critical_failures,
            "warnings": self.warnings,
            "total_checks": len(self.results),
            "results": [
                {
                    "validator": r.validator_name,
                    "status": r.status.value,
                    "severity": r.severity.value,
                    "message": r.message,
                    "remediation": r.remediation,
                }
                for r in self.results
            ],
        }

    def summary(self) -> str:
        lines = [f"Pre-Flight Report: {'PASS' if self.overall_pass else 'FAIL'}"]
        lines.append(f"  Checks: {len(self.results)}, "
                     f"Critical Failures: {self.critical_failures}, "
                     f"Warnings: {self.warnings}")
        for r in self.results:
            icon = "✓" if r.status == ValidationStatus.PASS else "✗"
            lines.append(f"  {icon} [{r.severity.value}] {r.validator_name}: {r.message}")
            if r.remediation:
                lines.append(f"    → Remediation: {r.remediation}")
        return "\n".join(lines)


class PreFlightValidator:
    """
    Pre-flight validation engine that runs a suite of validators
    before allowing action execution.
    """

    def __init__(self):
        self.validators: List[Callable] = [
            self.validate_file_existence,
            self.validate_file_permissions,
            self.validate_token_budget,
            self.validate_tool_availability,
            self.validate_target_not_protected,
            self.validate_dependency_readiness,
            self.validate_output_path,
        ]

    def run_preflight(self, action: Dict[str, Any],
                      context: Dict[str, Any]) -> PreFlightReport:
        """Run all pre-flight validators against the proposed action."""
        report = PreFlightReport()

        for validator in self.validators:
            try:
                result = validator(action, context)
                report.add_result(result)
            except Exception as e:
                report.add_result(ValidationResult(
                    validator_name=validator.__name__,
                    status=ValidationStatus.FAIL,
                    severity=ValidationSeverity.CRITICAL,
                    message=f"Validator crashed: {str(e)}",
                    remediation="Fix the validator implementation",
                ))

        print(report.summary())
        return report

    def validate_file_existence(self, action: Dict, context: Dict) -> ValidationResult:
        """Check that target files exist when required."""
        target = action.get("target_file")
        action_type = action.get("action_type", "")

        if not target:
            return ValidationResult(
                validator_name="file_existence",
                status=ValidationStatus.SKIP,
                severity=ValidationSeverity.INFO,
                message="No target file specified",
            )

        if action_type in ("read", "modify", "delete"):
            exists = Path(target).exists()
            if exists:
                return ValidationResult(
                    validator_name="file_existence",
                    status=ValidationStatus.PASS,
                    severity=ValidationSeverity.CRITICAL,
                    message=f"Target file exists: {target}",
                )
            else:
                return ValidationResult(
                    validator_name="file_existence",
                    status=ValidationStatus.FAIL,
                    severity=ValidationSeverity.CRITICAL,
                    message=f"Target file does not exist: {target}",
                    remediation=f"Verify the file path is correct. Check for typos in: {target}",
                )

        return ValidationResult(
            validator_name="file_existence",
            status=ValidationStatus.PASS,
            severity=ValidationSeverity.INFO,
            message="File existence not required for this action type",
        )

    def validate_file_permissions(self, action: Dict, context: Dict) -> ValidationResult:
        """Check file permissions for the proposed action."""
        target = action.get("target_file")
        action_type = action.get("action_type", "")

        if not target or not Path(target).exists():
            return ValidationResult(
                validator_name="file_permissions",
                status=ValidationStatus.SKIP,
                severity=ValidationSeverity.INFO,
                message="File does not exist, skipping permission check",
            )

        if action_type in ("modify", "delete", "write"):
            writable = os.access(target, os.W_OK)
            if writable:
                return ValidationResult(
                    validator_name="file_permissions",
                    status=ValidationStatus.PASS,
                    severity=ValidationSeverity.CRITICAL,
                    message=f"Write permission confirmed: {target}",
                )
            else:
                return ValidationResult(
                    validator_name="file_permissions",
                    status=ValidationStatus.FAIL,
                    severity=ValidationSeverity.CRITICAL,
                    message=f"No write permission: {target}",
                    remediation="Check file ownership and permissions. Consider running with elevated privileges.",
                )

        if action_type == "read":
            readable = os.access(target, os.R_OK)
            if readable:
                return ValidationResult(
                    validator_name="file_permissions",
                    status=ValidationStatus.PASS,
                    severity=ValidationSeverity.CRITICAL,
                    message=f"Read permission confirmed: {target}",
                )
            else:
                return ValidationResult(
                    validator_name="file_permissions",
                    status=ValidationStatus.FAIL,
                    severity=ValidationSeverity.CRITICAL,
                    message=f"No read permission: {target}",
                    remediation="Check file ownership and permissions.",
                )

        return ValidationResult(
            validator_name="file_permissions",
            status=ValidationStatus.PASS,
            severity=ValidationSeverity.INFO,
            message="Permission check not applicable",
        )

    def validate_token_budget(self, action: Dict, context: Dict) -> ValidationResult:
        """Verify the action fits within the available token budget."""
        estimated_tokens = action.get("estimated_tokens", 0)
        available_budget = context.get("token_budget", float("inf"))

        if estimated_tokens <= available_budget:
            return ValidationResult(
                validator_name="token_budget",
                status=ValidationStatus.PASS,
                severity=ValidationSeverity.CRITICAL,
                message=f"Token budget OK: {estimated_tokens}/{available_budget}",
            )

        return ValidationResult(
            validator_name="token_budget",
            status=ValidationStatus.FAIL,
            severity=ValidationSeverity.CRITICAL,
            message=f"Token budget exceeded: {estimated_tokens} > {available_budget}",
            remediation="Reduce action scope, compress context, or increase token budget.",
            details={"deficit": estimated_tokens - available_budget},
        )

    def validate_tool_availability(self, action: Dict, context: Dict) -> ValidationResult:
        """Verify the required tool is available."""
        required_tool = action.get("tool")
        available_tools = context.get("available_tools", [])

        if not required_tool:
            return ValidationResult(
                validator_name="tool_availability",
                status=ValidationStatus.SKIP,
                severity=ValidationSeverity.INFO,
                message="No specific tool required",
            )

        if required_tool in available_tools:
            return ValidationResult(
                validator_name="tool_availability",
                status=ValidationStatus.PASS,
                severity=ValidationSeverity.CRITICAL,
                message=f"Tool available: {required_tool}",
            )

        return ValidationResult(
            validator_name="tool_availability",
            status=ValidationStatus.FAIL,
            severity=ValidationSeverity.CRITICAL,
            message=f"Tool not available: {required_tool}",
            remediation=f"Available tools: {', '.join(available_tools)}. Select an alternative.",
        )

    def validate_target_not_protected(self, action: Dict, context: Dict) -> ValidationResult:
        """Verify the target is not a protected file."""
        target = action.get("target_file", "")
        protected_patterns = context.get("protected_files", [
            ".env", ".git/", "node_modules/", "__pycache__/",
            "package-lock.json", "yarn.lock",
        ])

        for pattern in protected_patterns:
            if pattern in target:
                return ValidationResult(
                    validator_name="protected_file_check",
                    status=ValidationStatus.FAIL,
                    severity=ValidationSeverity.CRITICAL,
                    message=f"Target matches protected pattern '{pattern}': {target}",
                    remediation="This file is protected. Confirm with user before modifying.",
                )

        return ValidationResult(
            validator_name="protected_file_check",
            status=ValidationStatus.PASS,
            severity=ValidationSeverity.WARNING,
            message="Target is not a protected file",
        )

    def validate_dependency_readiness(self, action: Dict, context: Dict) -> ValidationResult:
        """Verify all dependencies have completed."""
        dependencies = action.get("dependencies", [])
        completed_steps = context.get("completed_steps", set())

        if not dependencies:
            return ValidationResult(
                validator_name="dependency_readiness",
                status=ValidationStatus.PASS,
                severity=ValidationSeverity.CRITICAL,
                message="No dependencies required",
            )

        unmet = [d for d in dependencies if d not in completed_steps]
        if not unmet:
            return ValidationResult(
                validator_name="dependency_readiness",
                status=ValidationStatus.PASS,
                severity=ValidationSeverity.CRITICAL,
                message=f"All {len(dependencies)} dependencies satisfied",
            )

        return ValidationResult(
            validator_name="dependency_readiness",
            status=ValidationStatus.FAIL,
            severity=ValidationSeverity.CRITICAL,
            message=f"Unmet dependencies: {', '.join(unmet)}",
            remediation="Complete dependent steps before proceeding.",
        )

    def validate_output_path(self, action: Dict, context: Dict) -> ValidationResult:
        """Verify the output path is within the workspace."""
        target = action.get("target_file", "")
        workspace = context.get("workspace_path", "")

        if not target or not workspace:
            return ValidationResult(
                validator_name="output_path",
                status=ValidationStatus.SKIP,
                severity=ValidationSeverity.INFO,
                message="No output path to validate",
            )

        target_resolved = str(Path(target).resolve())
        workspace_resolved = str(Path(workspace).resolve())

        if target_resolved.startswith(workspace_resolved):
            return ValidationResult(
                validator_name="output_path",
                status=ValidationStatus.PASS,
                severity=ValidationSeverity.CRITICAL,
                message="Output path is within workspace",
            )

        return ValidationResult(
            validator_name="output_path",
            status=ValidationStatus.FAIL,
            severity=ValidationSeverity.CRITICAL,
            message=f"Output path escapes workspace: {target}",
            remediation="All file operations must target paths within the workspace directory.",
        )
```

---

## TypeScript Pre-Flight Validator

```typescript
interface ValidationCheck {
  name: string;
  severity: "critical" | "warning" | "info";
  check: (action: ActionSpec, context: ExecutionContext) => ValidationOutcome;
}

interface ActionSpec {
  actionType: string;
  targetFile?: string;
  tool?: string;
  estimatedTokens?: number;
  dependencies?: string[];
}

interface ExecutionContext {
  workspacePath: string;
  tokenBudget: number;
  availableTools: string[];
  completedSteps: Set<string>;
  protectedFiles: string[];
}

interface ValidationOutcome {
  passed: boolean;
  message: string;
  remediation?: string;
}

class PreFlightGate {
  private checks: ValidationCheck[] = [];

  constructor() {
    this.registerDefaultChecks();
  }

  private registerDefaultChecks(): void {
    this.checks.push({
      name: "token_budget",
      severity: "critical",
      check: (action, ctx) => {
        const est = action.estimatedTokens ?? 0;
        if (est <= ctx.tokenBudget) {
          return { passed: true, message: `Budget OK: ${est}/${ctx.tokenBudget}` };
        }
        return {
          passed: false,
          message: `Budget exceeded: ${est} > ${ctx.tokenBudget}`,
          remediation: "Reduce scope or compress context",
        };
      },
    });

    this.checks.push({
      name: "tool_availability",
      severity: "critical",
      check: (action, ctx) => {
        if (!action.tool) {
          return { passed: true, message: "No specific tool required" };
        }
        if (ctx.availableTools.includes(action.tool)) {
          return { passed: true, message: `Tool available: ${action.tool}` };
        }
        return {
          passed: false,
          message: `Tool not available: ${action.tool}`,
          remediation: `Available: ${ctx.availableTools.join(", ")}`,
        };
      },
    });

    this.checks.push({
      name: "dependencies",
      severity: "critical",
      check: (action, ctx) => {
        const deps = action.dependencies ?? [];
        const unmet = deps.filter((d) => !ctx.completedSteps.has(d));
        if (unmet.length === 0) {
          return { passed: true, message: "All dependencies met" };
        }
        return {
          passed: false,
          message: `Unmet: ${unmet.join(", ")}`,
          remediation: "Complete prerequisite steps first",
        };
      },
    });
  }

  validate(action: ActionSpec, context: ExecutionContext): {
    allowed: boolean;
    failures: string[];
    warnings: string[];
  } {
    const failures: string[] = [];
    const warnings: string[] = [];

    for (const check of this.checks) {
      const result = check.check(action, context);
      if (!result.passed) {
        if (check.severity === "critical") {
          failures.push(`[${check.name}] ${result.message}`);
        } else {
          warnings.push(`[${check.name}] ${result.message}`);
        }
      }
    }

    return {
      allowed: failures.length === 0,
      failures,
      warnings,
    };
  }
}
```

---

## Pre-Flight Validation Checklist

| # | Check | Category | Severity | When to Apply |
| :--- | :--- | :--- | :--- | :--- |
| 1 | File exists | File System | Critical | Read, Modify, Delete actions |
| 2 | File writable | File System | Critical | Modify, Write actions |
| 3 | Path within workspace | Safety | Critical | All file operations |
| 4 | Not a protected file | Safety | Critical | All write operations |
| 5 | Token budget sufficient | Resource | Critical | All LLM calls |
| 6 | Tool available | Resource | Critical | All tool-dependent steps |
| 7 | Dependencies complete | Dependency | Critical | Steps with prerequisites |
| 8 | API rate limit available | Resource | Warning | External API calls |
| 9 | Disk space sufficient | Resource | Warning | File creation |
| 10 | Encoding compatible | Compatibility | Warning | File read/write |

---

## Handoff & Related References
- Constraint Propagation: [constraint-propagation.md](constraint-propagation.md)
- Anticipatory Error Prevention: [anticipatory-error-prevention.md](anticipatory-error-prevention.md)
- OODA Loop Patterns: [ooda-loop-patterns.md](ooda-loop-patterns.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive pre-flight validation details preserved)
-->
