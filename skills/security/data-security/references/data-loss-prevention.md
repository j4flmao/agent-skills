# Data Loss Prevention (DLP)

## DLP Categories
| Category | Description | Example |
|----------|-------------|---------|
| Network DLP | Monitor data in transit | Email, web traffic, file transfer |
| Endpoint DLP | Monitor data on devices | USB, print, clipboard, screenshots |
| Cloud DLP | Monitor data in cloud services | SaaS apps, cloud storage |
| Storage DLP | Monitor data at rest | Database, file shares, data lakes |

## Sensitive Data Patterns
| Pattern | Detection Method |
|---------|-----------------|
| Credit card numbers | Luhn algorithm + regex |
| Social Security numbers | Regex + checksum |
| Email addresses | Regex |
| API keys/secrets | Entropy + prefix patterns |
| Passwords | Entropy + common password filters |
| Personal health info | HIPAA-defined patterns |
| PII | Name + address + DOB combinations |

## DLP Response Actions
| Severity | Action |
|----------|--------|
| Block | Prevent data from leaving |
| Quarantine | Isolate file for review |
| Alert | Notify security team |
| Log | Record for audit |
| Mask | Redact in logs and output |
