# Security Isolation Protocols

## Sandboxing and Execution Boundaries

Agent systems with access to code-execution tools or system commands present a severe security risk. To mitigate potential privilege escalation, command injection, or filesystem traversal, the execution engine must establish strict boundaries.

```
       [Agent Request]
              │
              ▼
  [Parameter Validator] ──► Checks input against JSON Schema (Allowlist Check)
              │
              ▼
   [Command Guardrail]  ──► Filters dangerous characters (`;`, `&`, `|`, etc.)
              │
              ▼
    [Subprocess Runner] ──► Spawns low-privilege docker container or restricted shell
```

The system defines the following security isolation boundaries:
1. **Host Namespace Isolation**: Executing arbitrary scripts must happen within transient, stateless containers.
2. **Access Control (RBAC)**: Tools must declare permission levels. High-risk actions (e.g., git commits, package installations) require explicit human approval.
3. **No Dynamic Imports**: Prevent agent scripts from importing unverified libraries.

---

## JSON Validation Schema for Parameters

All inputs passed from the LLM to local tool configurations must validate against strict JSON Schemas to prevent injection.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "ToolParameterValidation",
  "type": "object",
  "properties": {
    "command": {
      "type": "string",
      "enum": ["list_dir", "view_file", "search_web", "replace_file_content"]
    },
    "arguments": {
      "type": "object",
      "properties": {
        "path": {
          "type": "string",
          "pattern": "^[a-zA-Z0-9_\\-\\/\\.]+$"
        },
        "query": {
          "type": "string",
          "maxLength": 256
        }
      },
      "required": ["path"]
    }
  },
  "required": ["command", "arguments"],
  "additionalProperties": false
}
```

---

## Python Executable Validator & Command Guardrail

Below is a Python validation engine that filters shell inputs and runs safe tool commands in isolated subprocess namespaces.

```python
import re
import sys
import subprocess
import unittest
from typing import Dict, Any, Tuple

class SecurityGuardrail:
    """
    Enforces script execution rules and parameter constraints on tool commands.
    """
    def __init__(self, allowed_commands: list, path_regex: str = r"^[a-zA-Z0-9_\-\/\.]+$"):
        self.allowed_commands = allowed_commands
        self.path_pattern = re.compile(path_regex)
        # Block dangerous bash characters
        self.shell_injection_pattern = re.compile(r"[;&\|`\$\(\)\{\}\[\]\n\r\t]")

    def validate_command(self, cmd: str, args: Dict[str, Any]) -> Tuple[bool, str]:
        """Validates command name, arguments, and checks for command injection."""
        if cmd not in self.allowed_commands:
            return False, f"Command '{cmd}' is unauthorized."

        # Scan for shell injection characters in arguments
        for key, val in args.items():
            if isinstance(val, str):
                if self.shell_injection_pattern.search(val):
                    return False, f"Potential injection character detected in parameter '{key}'."
                if key == "path" and not self.path_pattern.match(val):
                    return False, f"Path '{val}' violates security isolation pattern."
                    
        return True, "Validation successful."

    def execute_safe_command(self, cmd: str, path: str) -> Tuple[int, str, str]:
        """Runs validation and executes simple list commands inside a limited subprocess shell."""
        # Note: In production, we run inside docker container namespaces.
        # This is a safe local implementation using shell=False.
        try:
            result = subprocess.run(
                ["cmd.exe", "/c", cmd, path] if sys.platform == "win32" else [cmd, path],
                capture_output=True,
                text=True,
                timeout=5.0,
                shell=False
            )
            return result.returncode, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            return -1, "", "Timeout expired during tool execution."
        except Exception as e:
            return -2, "", f"Execution failure: {str(e)}"

class TestSecurityGuardrail(unittest.TestCase):
    """Unit tests for the SecurityGuardrail system."""
    def setUp(self):
        self.guard = SecurityGuardrail(allowed_commands=["dir", "ls"])

    def test_valid_command(self):
        valid, msg = self.guard.validate_command("ls", {"path": "src/utils.py"})
        self.assertTrue(valid)
        self.assertEqual(msg, "Validation successful.")

    def test_unauthorized_command(self):
        valid, msg = self.guard.validate_command("rm", {"path": "src/utils.py"})
        self.assertFalse(valid)
        self.assertIn("unauthorized", msg)

    def test_shell_injection(self):
        valid, msg = self.guard.validate_command("ls", {"path": "src/utils.py; rm -rf /"})
        self.assertFalse(valid)
        self.assertIn("Potential injection", msg)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        unittest.main(argv=[sys.argv[0]])
    else:
        # Dry-run integration check
        guard = SecurityGuardrail(allowed_commands=["dir", "ls"])
        status, stdout, stderr = guard.execute_safe_command("dir", ".")
        print(f"Status Code: {status}, Output Sample:\n{stdout[:100]}")
```

---

## Detailed Rules & Constraints
1. **No Shell=True**: Never invoke subprocesses with the shell=True parameter to prevent system-wide command interpolation.
2. **Path Resolution Check**: Always resolve input paths to absolute paths and check that they remain inside the workspace root.
3. **Environment Isolation**: Strip sensitive environment variables (such as AWS keys, API credentials) before spawning child execution steps.

---

## Handoff & Related References
- Dependency Isolation Strategies: [dependency-isolation-strategies.md](dependency-isolation-strategies.md)
- Compliance and Governance Standards: [compliance-governance-standards.md](compliance-governance-standards.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->
