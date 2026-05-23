# PCI DSS Compliance Guide

## SAQ Types
| SAQ | Applicable To |
|-----|---------------|
| A | Card-not-present, fully outsourced to PCI-validated third party |
| A-EP | E-commerce, outsourced but website influences security |
| B | Imprint machines or standalone dial-out terminals |
| B-IP | Standalone PTS-approved payment terminals |
| C-VT | Web-based virtual terminal |
| C | Payment application connected to internet |
| D | All other merchants |

## Tokenization
- Replace PAN with a token (irreversible)
- Token stored in your database, not the PAN
- Gateway handles the PAN → token mapping
- Tokenization reduces PCI DSS scope significantly

## Key PCI DSS Requirements (v4.0)
| Requirement | Description |
|-------------|-------------|
| 3.4 | Render PAN unreadable when stored |
| 4.2 | Encrypt PAN over public networks |
| 6.3 | Secure coding standards |
| 8.3 | Multi-factor authentication for admin access |
| 10.2 | Audit trails for all access to cardholder data |
| 12.3 | Security awareness training |
