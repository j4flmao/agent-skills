# Compliance & Governance Standards

## Data Auditing, PII Protection, and Logging Boundaries

Production agent systems frequently process sensitive user data. To comply with privacy standards (GDPR, CCPA, HIPAA), the engineering harness must enforce automated data cleaning, masking, and auditing systems before logs are committed to disk or sent to LLM endpoints.

```
[System Data Input] ──► PII Scrubbing Engine (Regex/NER)
                              │
               Is PII Detected inside text?
                              ├──► YES: Mask value with [MASKED_EMAIL] / [MASKED_PHONE].
                              └──► NO: Forward text unchanged.
```

The system defines the following auditing rules:
1. **No Password/Token Leakage**: Clear environment tokens from outputs.
2. **Deterministic Masking**: Replace sensitive matches with generic tokens.
3. **Structured Audit Trail**: Log every model action and tool execution parameters.

---

## Masking Regular Expressions

The PII scrubber uses regular expressions for pattern recognition:

* **Email Addresses**: `[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+`
* **Social Security Numbers**: `\b\d{3}-\d{2}-\d{4}\b`
* **Credit Cards**: `\b(?:\d[ -]*?){13,16}\b`

---

## Python Compliance Scrubber Implementation

Below is a Python module designed to scan log payloads, sanitize input scripts, and write audit trails.

```python
import re
import sys
import unittest
from typing import Dict, Any

class ComplianceScrubber:
    """
    Cleans sensitive user data and writes compliant audit logs.
    """
    def __init__(self):
        self.rules = {
            "EMAIL": re.compile(r"[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+"),
            "SSN": re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
            "CREDIT_CARD": re.compile(r"\b(?:\d[ -]*?){13,16}\b")
        }

    def sanitize(self, text: str) -> str:
        """Replaces matched PII items with generic tags."""
        sanitized = text
        for label, pattern in self.rules.items():
            sanitized = pattern.sub(f"[MASKED_{label}]", sanitized)
        return sanitized

    def generate_audit_log(self, user_id: str, action: str, raw_payload: str) -> Dict[str, Any]:
        """Creates a compliant audit entry without logging raw PII."""
        clean_payload = self.sanitize(raw_payload)
        return {
            "user_id": user_id,
            "action": action,
            "sanitized_payload": clean_payload,
            "timestamp": "2026-06-04T15:43:01Z"  # Standardized execution timestamp
        }

class TestComplianceScrubber(unittest.TestCase):
    """Unit tests for the ComplianceScrubber class."""
    def setUp(self):
        self.scrubber = ComplianceScrubber()

    def test_email_masking(self):
        input_text = "Please reach out to support@my-org.com for help."
        expected = "Please reach out to [MASKED_EMAIL] for help."
        self.assertEqual(self.scrubber.sanitize(input_text), expected)

    def test_multiple_maskings(self):
        input_text = "Contact support@my-org.com or dial 000-12-3456."
        expected = "Contact [MASKED_EMAIL] or dial [MASKED_SSN]."
        self.assertEqual(self.scrubber.sanitize(input_text), expected)

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "test":
        unittest.main(argv=[sys.argv[0]])
    else:
        scrubber = ComplianceScrubber()
        dirty = "User input had password token and email: john.doe@mail.com"
        print(f"Sanitized Result: {scrubber.sanitize(dirty)}")
```

---

## Detailed Rules & Constraints
1. **Never Log Session Secrets**: Exclude all bearer tokens and access keys from logging contexts.
2. **Ephemeral Context Windows**: Clean conversation memory arrays when closing active session tasks.
3. **Regex Scans**: Run scans both on incoming user queries and outgoing LLM output generations.

---

## Handoff & Related References
- State Consistency Guarantees: [state-consistency-guarantees.md](state-consistency-guarantees.md)
- Security Isolation Protocols: [security-isolation-protocols.md](security-isolation-protocols.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with OpenAPI, dynamic loops, and multi-agent coordination protocols.
-->
