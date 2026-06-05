# Dependency Isolation Strategies

## Packaging, External APIs, and Boundary Audits

Agent runtime scripts must run in environments where dependency access is strictly gated. If an agent gains the ability to import arbitrary libraries or contact external domains, it could compromise the integrity of the runtime harness.

```
       [Agent Code execution]
                 │
                 ▼
     [Import Sentinel Interceptor]
                 │
  Does module violate allowlist limits?
                 ├──► YES: Block import, throw ImportRestrictionError.
                 └──► NO: Load module namespace safely.
```

The system establishes the following boundary guidelines:
1. **Import Restrictions**: Only allow a defined list of safe core packages (e.g., `json`, `math`, `re`, `collections`).
2. **HTTP Outbound Proxies**: Force all external web calls through an internal forward proxy to filter target domains.
3. **Hermetic Testing**: Mock external service calls inside the testing suites.

---

## Allowed Package Configuration Schema

To regulate active Python runtimes, dependencies are checked against a JSON configuration:

```json
{
  "runtime": "python3.11",
  "dependencies": {
    "allowed_standard_libraries": ["sys", "os", "re", "math", "json", "collections", "time", "unittest"],
    "allowed_third_party": ["numpy", "tiktoken"],
    "blocked_modules": ["socket", "urllib", "requests", "http", "subprocess"]
  }
}
```

---

## Python Dynamic Import Sentinel Module

Below is a Python package checker that hooks into python's import mechanism to prevent loading blocked modules.

```python
import sys
import unittest
from typing import Set

class ImportRestrictionError(ImportError):
    pass

class SafeImportSentinel:
    """
    Hooks into sys.meta_path to intercept and validate import statements.
    """
    def __init__(self, allowed_modules: Set[str]):
        self.allowed_modules = allowed_modules

    def find_spec(self, fullname: str, path: Any = None, target: Any = None):
        """Validates fullname against the allowlist."""
        # Extract top-level package name
        base_module = fullname.split(".")[0]
        if base_module not in self.allowed_modules:
            raise ImportRestrictionError(f"Import of module '{fullname}' is forbidden by architectural constraints.")
        return None  # Pass to default loaders if authorized

def install_sentinel(allowed: Set[str]) -> SafeImportSentinel:
    """Installs the sentinel filter into the sys.meta_path registry."""
    sentinel = SafeImportSentinel(allowed)
    sys.meta_path.insert(0, sentinel)
    return sentinel

class TestSafeImportSentinel(unittest.TestCase):
    """Unit tests for the SafeImportSentinel system."""
    def test_allowlist_passes(self):
        sentinel = SafeImportSentinel({"math", "json"})
        # Should not raise exception
        try:
            sentinel.find_spec("math")
            sentinel.find_spec("json.decoder")
        except ImportRestrictionError:
            self.fail("Import of math or json failed unexpectedly.")

    def test_denylist_raises(self):
        sentinel = SafeImportSentinel({"math", "json"})
        with self.assertRaises(ImportRestrictionError):
            sentinel.find_spec("subprocess")

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        unittest.main(argv=[sys.argv[0]])
    else:
        # Dry-run execution
        print("Authorizing math, json, and sys libraries...")
        sentinel = SafeImportSentinel({"math", "json", "sys"})
        sentinel.find_spec("math")
        print("Validation checks passed.")
```

---

## Detailed Rules & Constraints
1. **Network Egress Check**: Ensure the host environment blocks raw port 80/443 TCP egress, permitting only connection to the proxy.
2. **Deterministic Builds**: Build sandbox container images without compilers (e.g. `gcc`, `make`) to block source compilations.
3. **Standard Library Audits**: Prune execution paths using customized Python build bundles if possible.

---

## Handoff & Related References
- Network Topology Restrictions: [network-topology-restrictions.md](network-topology-restrictions.md)
- Security Isolation Protocols: [security-isolation-protocols.md](security-isolation-protocols.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->
