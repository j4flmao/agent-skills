# Data Masking Patterns

## Static Data Masking

Irreversibly obscures data in non-production environments.

| Technique | Example | Use Case |
|-----------|---------|----------|
| Substitution | Random name from lookup | Test data |
| Shuffling | Swap SSNs within column | Preserve distribution |
| Nulling | `NULL` | Unnecessary fields |
| Variance | `salary ± 10%` | Analytics |

```python
import random

NAMES = ["Alice", "Bob", "Charlie"]

def mask_name(original: str) -> str:
    return random.choice(NAMES)

def mask_email(email: str) -> str:
    local, domain = email.split("@")
    return f"{local[:2]}***@{domain}"
```

## Dynamic Data Masking

Mask at query time based on user role. Applied in the database or middleware.

```sql
-- PostgreSQL example with a view
CREATE VIEW users_masked AS
SELECT
    id,
    CASE WHEN current_setting('app.role') = 'admin'
        THEN email
        ELSE regexp_replace(email, '(.)(.*)(@.*)', '\1***\3')
    END AS email,
    phone
FROM users;
```

## PII Detection

Classify fields at schema level:

```python
PII_FIELDS = {
    "email": {"type": "pii", "mask": "email"},
    "ssn": {"type": "sensitive", "mask": "full"},
    "phone": {"type": "pii", "mask": "partial"},
}
```

Use regex or ML-based classifiers for unstructured data.

## Masking by Sensitivity Level

| Level | Examples | Masking |
|-------|----------|---------|
| Public | Username | None |
| Internal | Department | None |
| Sensitive | Email, Phone | Partial mask |
| Critical | SSN, Password | Full mask / tokenize |

## Partial vs Full Masking

- **Partial**: `j***@example.com`, `(***) ***-1234`
- **Full**: `***@***.***`, `(***) ***-****`
- **Conditional**: Show last 4 digits based on role.
