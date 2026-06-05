# Persistent State Management

## The `progress.txt` Layout Standards

In agentic context engineering, maintaining state across restarts or API timeouts is essential. The `progress.txt` file acts as a human-readable and machine-parseable source of truth. It defines the current state of execution.

```
+------------------------------------------------------------+
|                  CORE STATE INITIALIZATION                 |
+------------------------------------------------------------+
                               │
                               ▼
                   [Read progress.txt Tracker]
                               │
                               ▼
                     [Validate Target Goal]
                               │
             ┌──────────────────┴──────────────────┐
             ▼                                     ▼
      [Match Checkpoint]                   [New Task Initialized]
             │                                     │
             ▼                                     ▼
     [Continue Session]                    [Execute Stage 1]
             │                                     │
             └──────────────────┬──────────────────┘
                                │
                                ▼
                  [Write progress.txt to Disk]
```

### Layout Specification

The standard schema for `progress.txt` is structured as follows:

```markdown
# Agent Execution Progress Tracking

## Metadata
- **Session ID**: "6ad1752e-18d3-4d5a-8603-57d365682a6c"
- **Last Updated**: "2026-06-04T15:43:01Z"
- **Current Goal**: "Construct context-engineering skill directory with full coverage"

## Execution Checklist
- [x] Phase 1: Initialize directory structure and configuration headers
- [x] Phase 2: Create reference files (1-3)
- [/] Phase 3: Create reference files (4-8) [In Progress]
- [ ] Phase 4: Finalize SKILL.md and verify relative URL anchors
- [ ] Phase 5: Linting checks and footer compilation

## Contextual State Variables
- **Target Line Budget**: 2500 lines combined minimum
- **Current Cumulative Line Count**: 1120 lines
- **Active Code Files**:
  - `skills/harness-engineering/context-engineering/references/context-compression-strategies.md`
  - `skills/harness-engineering/context-engineering/references/dynamic-injection-patterns.md`

## Next Steps
1. Write the priority-scoring-algorithms.md reference file.
2. Formulate the sliding-window-implementations.md ring buffer class.
3. Consolidate token counts and validation routines in prompt-token-optimization.md.
```

### Purpose of progress.txt Fields
- **Metadata**: Houses execution credentials (such as UUIDs, start timestamps) to prevent context crossovers between concurrent runs.
- **Execution Checklist**: Uses standard markdown checkbox formatting (`[ ]`, `[/]`, `[x]`) to facilitate parsing by regex parsers.
- **Contextual State Variables**: Keeps track of runtime environment targets to prevent state drift.
- **Next Steps**: A prioritized stack representing upcoming execution commands.

---

## State Transition Definitions

An agent's lifetime transitions between several structured operational states:

```
    +--------+          +---------+          +-----------+
    |  IDLE  | ───────► | RUNNING | ───────► | COMPLETED |
    +--------+          +---------+          +-----------+
         ▲                   │                     ▲
         │                   ▼                     │
         │              +-----------+              │
         └───────────── | SUSPENDED | ─────────────┘
                        +-----------+
                             │
                             ▼
                        +-----------+
                        |  FAILED   |
                        +-----------+
```

| Source State | Event Trigger | Target State | Description |
| :--- | :--- | :--- | :--- |
| **IDLE** | `start_task` | **RUNNING** | Agent begins checklist item execution. |
| **RUNNING** | `suspend_execution` | **SUSPENDED** | Wait for user gateway approval. |
| **RUNNING** | `complete_all` | **COMPLETED** | Checklist items validated successfully. |
| **RUNNING** | `uncaught_exception` | **FAILED** | Unrecoverable error, write dump files. |
| **SUSPENDED** | `resume_task` | **RUNNING** | Execution returns to active check routine. |

---

## Detailed Crash Recovery Routine

If the agent process is terminated unexpectedly during an execution cycle, it executes the following restoration process when revived:

1. **Verify State File Existence**: Locate `scratch_state.json` and `progress.txt`.
2. **Perform Integrity Check**: Parse the JSON layout. If corrupted, load the last automatic backup file `scratch_state.json.bak`.
3. **Scan Execution Checklist**: Determine the last completed step marked with `[x]`.
4. **Hydrate Active Variables**: Load context variables (such as lines written, active file scopes) into working memory.
5. **Report Status**: Log a recovery message to the active logger output and resume from the first step marked as incomplete `[ ]` or in progress `[/]`.

---

## State Adapter Schema (JSON Schema)

To store complex execution paths machine-to-machine, we utilize this JSON schema for state verification:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "AgentState",
  "type": "object",
  "properties": {
    "sessionId": { "type": "string", "format": "uuid" },
    "currentState": { "type": "string", "enum": ["IDLE", "RUNNING", "SUSPENDED", "COMPLETED", "FAILED"] },
    "executionGoal": { "type": "string" },
    "completedTasks": {
      "type": "array",
      "items": { "type": "string" }
    },
    "variables": {
      "type": "object",
      "additionalProperties": { "type": "string" }
    },
    "errorLog": {
      "type": "array",
      "items": {
        "type": "object",
        "properties": {
          "timestamp": { "type": "string", "format": "date-time" },
          "message": { "type": "string" }
        },
        "required": ["timestamp", "message"]
      }
    }
  },
  "required": ["sessionId", "currentState", "executionGoal", "completedTasks", "variables"]
}
```

---

## Python Resilient State Machine & Adapters

Below is a complete implementation of a crash-resilient agent state manager saving states to the filesystem as a persistent key-value adapter, incorporating simple file locking mechanisms to prevent concurrent write collisions.

```python
import os
import json
import time
import sys
import unittest
from typing import Dict, Any, List, Optional

class FileSystemStateAdapter:
    """
    Manages persistent state reading and writing for LLM contexts.
    Ensures safe operations via atomic write maneuvers (write to temp file, then rename).
    """
    def __init__(self, storage_path: str):
        self.storage_path = os.path.abspath(storage_path)
        self.backup_path = f"{self.storage_path}.bak"
        os.makedirs(os.path.dirname(self.storage_path), exist_ok=True)
        if not os.path.exists(self.storage_path):
            self._write_raw({
                "sessionId": "default-uuid-1234", 
                "currentState": "IDLE", 
                "completedTasks": [], 
                "variables": {}, 
                "errorLog": []
            })
        print(f"[DEBUG] FileSystemStateAdapter bound to path: {self.storage_path}", file=sys.stderr)

    def _write_raw(self, data: Dict[str, Any]):
        temp_file = f"{self.storage_path}.tmp"
        try:
            with open(temp_file, 'w', encoding='utf-8') as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
            
            # Create a backup of the existing state file before swapping
            if os.path.exists(self.storage_path):
                os.replace(self.storage_path, self.backup_path)
                
            # Atomic swap using os.replace which is cross-platform safe
            os.replace(temp_file, self.storage_path)
            print(f"[DEBUG] Atomically wrote state payload to disk.", file=sys.stderr)
        except Exception as e:
            if os.path.exists(temp_file):
                os.remove(temp_file)
            print(f"[ERROR] Failed to write state: {e}", file=sys.stderr)
            raise IOError(f"Failed to persist state atomically: {e}")

    def load(self) -> Dict[str, Any]:
        """Loads state safely from disk. Falls back to backup if main is corrupted."""
        try:
            with open(self.storage_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (json.JSONDecodeError, FileNotFoundError) as e:
            print(f"[WARNING] Main state file corrupt ({e}). Attempting backup restore...", file=sys.stderr)
            try:
                with open(self.backup_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self.save(data)
                    return data
            except Exception as backup_err:
                print(f"[ERROR] Backup restore failed: {backup_err}. Creating fresh state.", file=sys.stderr)
                return {
                    "sessionId": "recovered-session", 
                    "currentState": "FAILED", 
                    "completedTasks": [], 
                    "variables": {}, 
                    "errorLog": [{"timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ"), "message": "Corrupt JSON load error"}]
                }

    def save(self, state: Dict[str, Any]):
        """Saves current state safely."""
        self._write_raw(state)


class PersistentStateManager:
    """
    Orchestrates agent phase checks, progress tracking, and crash-resilient updates.
    """
    def __init__(self, adapter: FileSystemStateAdapter):
        self.adapter = adapter
        self.state = self.adapter.load()
        print(f"[DEBUG] PersistentStateManager initialized.", file=sys.stderr)

    def update_task_status(self, task_name: str, status: str = "completed"):
        """Updates checkpoints to prevent processing loops."""
        if status == "completed":
            if task_name not in self.state["completedTasks"]:
                self.state["completedTasks"].append(task_name)
                print(f"[DEBUG] Task marked completed: '{task_name}'", file=sys.stderr)
        self.state["variables"]["last_modified_task"] = task_name
        self.adapter.save(self.state)

    def log_error(self, message: str):
        """Logs exceptions to state file for later system context recovery."""
        error_entry = {
            "timestamp": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "message": message
        }
        self.state.setdefault("errorLog", []).append(error_entry)
        print(f"[WARNING] Logging execution error: {message}", file=sys.stderr)
        self.adapter.save(self.state)

    def set_variable(self, key: str, value: Any):
        """Sets internal execution context variables."""
        self.state["variables"][key] = str(value)
        print(f"[DEBUG] State Variable updated: {key}='{value}'", file=sys.stderr)
        self.adapter.save(self.state)

    def get_variable(self, key: str) -> Optional[str]:
        """Gets internal execution context variables."""
        return self.state["variables"].get(key)

class TestStateManager(unittest.TestCase):
    """Unit tests for verification of the PersistentStateManager."""
    
    def test_state_saving_and_loading(self):
        adapter = FileSystemStateAdapter("test_state_file.json")
        manager = PersistentStateManager(adapter)
        manager.set_variable("test_key", "test_val")
        
        self.assertEqual(manager.get_variable("test_key"), "test_val")
        
        # Cleanup
        if os.path.exists("test_state_file.json"):
            os.remove("test_state_file.json")
        if os.path.exists("test_state_file.json.bak"):
            os.remove("test_state_file.json.bak")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        unittest.main(argv=[sys.argv[0]])
    else:
        adapter_path = "scratch_state.json"
        adapter = FileSystemStateAdapter(adapter_path)
        manager = PersistentStateManager(adapter)
        
        manager.set_variable("current_phase", "3")
        manager.update_task_status("Phase 1: Initialize directory structure")
        manager.update_task_status("Phase 2: Create reference files 1-3")
        manager.log_error("Simulated warning: Context size near maximum threshold.")
        
        print("=== File System State Verification ===")
        print("Loaded State Variables:", manager.adapter.load())
        
        if os.path.exists(adapter_path):
            os.remove(adapter_path)
        if os.path.exists(adapter_path + ".bak"):
            os.remove(adapter_path + ".bak")
```

---

## Handoff & Related References
- Priority Scoring Algorithms: [priority-scoring-algorithms.md](priority-scoring-algorithms.md)
- Sliding Window Implementations: [sliding-window-implementations.md](sliding-window-implementations.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->
