# State Consistency Guarantees

## File Syncs, Lockfile Conventions, and Atomic State Updates

In stateless agent architectures, execution checkpoints are saved to disk. When multiple subagents or system runs modify the same files (like `progress.txt`), concurrency conflicts and file corruptions can occur.

```
       [State Update Request]
                  │
                  ▼
         [Lockfile Sentinel]
                  │
         Is lock file active?
                  ├──► YES: Retry/wait for backoff.
                  └──► NO: Generate Lock file.
                              │
                              ▼
                  [Write to Temp File] (tmp_state.json)
                              │
                              ▼
                  [OS Atomic Replace] (rename tmp_state.json -> state.json)
                              │
                              ▼
                  [Remove Lock file]
```

The system establishes these transactional boundaries:
1. **Lockfile Execution**: Write lock files (`.lock`) to prevent concurrent updates on the state database.
2. **Atomic Swaps**: Always write to a temp file, sync to disk, and rename the file. Never write directly to the active state file.
3. **Recovery Log**: Keep a copy of the previous state (`state.json.bak`) to revert changes if writing fails.

---

## State Lifecycle Transition Schema

The state transitions follow these statuses:

```
[INIT] ──► [ACQUIRING_LOCK] ──► [TEMP_WRITE] ──► [DISK_SYNC] ──► [ATOMIC_SWAP] ──► [RELEASE_LOCK]
                                                                        │
                                                                   (On Error)
                                                                        ▼
                                                                 [RESTORE_BACKUP]
```

---

## Python Atomic Transaction State Manager

Below is a Python state manager that implements lockfile checks, atomic file writes, and fallback recovery.

```python
import os
import sys
import json
import time
import unittest
from typing import Dict, Any, Optional

class AtomicStateManager:
    """
    Manages crash-resilient transactional updates to state JSON files.
    """
    def __init__(self, target_filepath: str, lock_timeout: float = 2.0):
        self.target_filepath = target_filepath
        self.lock_filepath = target_filepath + ".lock"
        self.backup_filepath = target_filepath + ".bak"
        self.lock_timeout = lock_timeout

    def _acquire_lock(self) -> bool:
        start_time = time.perf_counter()
        while True:
            try:
                # Exclusive file creation to simulate atomicity
                fd = os.open(self.lock_filepath, os.O_CREAT | os.O_EXCL | os.O_WRONLY)
                os.close(fd)
                return True
            except FileExistsError:
                if time.perf_counter() - start_time > self.lock_timeout:
                    return False
                time.sleep(0.05)

    def _release_lock(self):
        try:
            os.remove(self.lock_filepath)
        except FileNotFoundError:
            pass

    def save_state(self, state_data: Dict[str, Any]) -> bool:
        """Saves data using temp-write and atomic swap."""
        if not self._acquire_lock():
            print(f"[ERROR] Failed to acquire lock for {self.target_filepath}", file=sys.stderr)
            return False

        temp_filepath = self.target_filepath + ".tmp"
        try:
            # 1. Write to temp file
            with open(temp_filepath, "w", encoding="utf-8") as f:
                json.dump(state_data, f, indent=2)
                f.flush()
                os.fsync(f.fileno())  # Force OS write buffer sync
            
            # 2. Backup old file if it exists
            if os.path.exists(self.target_filepath):
                if os.path.exists(self.backup_filepath):
                    os.remove(self.backup_filepath)
                os.rename(self.target_filepath, self.backup_filepath)
                
            # 3. Swap temp file to target
            os.rename(temp_filepath, self.target_filepath)
            return True
        except Exception as e:
            print(f"[ERROR] Transaction failed: {e}. Restoring backup.", file=sys.stderr)
            # Rollback if possible
            if os.path.exists(self.backup_filepath):
                os.rename(self.backup_filepath, self.target_filepath)
            return False
        finally:
            if os.path.exists(temp_filepath):
                try:
                    os.remove(temp_filepath)
                except OSError:
                    pass
            self._release_lock()

    def load_state(self) -> Optional[Dict[str, Any]]:
        """Loads state safely from disk."""
        if not os.path.exists(self.target_filepath):
            return None
        try:
            with open(self.target_filepath, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            # Try to read backup
            if os.path.exists(self.backup_filepath):
                with open(self.backup_filepath, "r", encoding="utf-8") as f:
                    return json.load(f)
            return None

class TestAtomicStateManager(unittest.TestCase):
    """Unit tests for the AtomicStateManager."""
    def setUp(self):
        self.filename = "test_state.json"
        self.manager = AtomicStateManager(self.filename)

    def tearDown(self):
        for f in [self.filename, self.filename + ".lock", self.filename + ".bak", self.filename + ".tmp"]:
            if os.path.exists(f):
                os.remove(f)

    def test_save_and_load(self):
        data = {"session_id": "xyz", "step": 1}
        success = self.manager.save_state(data)
        self.assertTrue(success)
        
        loaded = self.manager.load_state()
        self.assertEqual(loaded["session_id"], "xyz")
        self.assertEqual(loaded["step"], 1)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        unittest.main(argv=[sys.argv[0]])
    else:
        # Dry-run integration check
        mgr = AtomicStateManager("app_state.json")
        mgr.save_state({"status": "active", "timestamp": time.time()})
        print(f"Loaded: {mgr.load_state()}")
        # Clean up
        if os.path.exists("app_state.json"):
            os.remove("app_state.json")
```

---

## Detailed Rules & Constraints
1. **Always Flush and Fsync**: Simply calling `file.write()` is insufficient; call `os.fsync(fd)` to guarantee data is committed to disk before swapping.
2. **Handle Lock Exhaustion**: Set timeout threshold of 2.0s; do not block indefinitely.
3. **Backup Retention**: The rollback `.bak` file must remain present until the subsequent transaction successfully finishes.

---

## Handoff & Related References
- Compliance and Governance Standards: [compliance-governance-standards.md](compliance-governance-standards.md)
- Fault Tolerance and Redundancy: [fault-tolerance-redundancy.md](fault-tolerance-redundancy.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->
