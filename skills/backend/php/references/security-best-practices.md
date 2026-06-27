# Security Best Practices

## Purpose
Comprehensive security guidelines for PHP 8.3+ applications, covering OWASP Top 10 mitigation, secure authentication, authorization, data encryption, and safe dependency management.

## Core Principles
1. Defense in Depth
2. Principle of Least Privilege
3. Fail Securely
4. Validate All Inputs
5. Encode All Outputs

## Detailed Architectural Overview
```text
+-------------------+       +-------------------+
|   WAF (Cloudflare)| ----> |   Reverse Proxy   |
|   (DDoS Protect)  |       |   (TLS Termin.)   |
+-------------------+       +-------------------+
        |                           |
        v                           v
+-------------------+       +-------------------+
|   App Server      |       |   Database        |
|   (PHP 8.3)       |       |   (Encrypted Vol) |
+-------------------+       +-------------------+
```

## Algorithms and Formulations
Password Hashing Formulation using Argon2id:
$Hash = Argon2id(Password, Salt, TimeCost, MemoryCost, Parallelism)$
Recommended PHP 8.3 defaults: Time=4, Memory=65536, Threads=1.

## Decision Matrix
```text
Handling user input?
├── Yes -> Is it for the database?
│   ├── Yes -> Use Prepared Statements (PDO)
│   └── No -> Is it for HTML output?
│       ├── Yes -> Use htmlspecialchars / Content Security Policy
│       └── No -> Validate against strict regex/types
└── No -> Proceed normally
```

## Data Schemas
```json
{
  "security_headers": {
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "default-src 'self'"
  }
}
```

## Code Examples

### PHP 8.3+ (Core Logic)
```php
<?php
declare(strict_types=1);

namespace App\Security;

use SensitiveParameter;

readonly class AuthenticationService
{
    public function __construct(
        private UserRepository $users
    ) {}

    /**
     * Authenticate user securely using PHP 8.2+ SensitiveParameter attribute
     * to prevent passwords from leaking in stack traces.
     */
    public function authenticate(string $username, #[SensitiveParameter] string $password): bool
    {
        $user = $this->users->findByUsername($username);

        if (!$user) {
            // Mitigate timing attacks
            password_verify('dummy_string', '$argon2id$v=19$m=65536,t=4,p=1$...');
            return false;
        }

        return password_verify($password, $user->getPasswordHash());
    }
}
```

### Python (Security Audit Script)
```python
import subprocess
import json

def run_php_stan_security():
    result = subprocess.run(
        ["vendor/bin/phpstan", "analyse", "--error-format=json"],
        capture_output=True, text=True
    )
    if result.returncode != 0:
        issues = json.loads(result.stdout)
        print(f"Found {issues['totals']['errors']} security/type errors.")
    else:
        print("No static analysis errors found.")
```

## Configuration Templates
```yaml
security:
  password_hashers:
    Symfony\Component\Security\Core\User\PasswordAuthenticatedUserInterface: 'auto'
  providers:
    app_user_provider:
      entity:
        class: App\Entity\User
        property: email
```

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| XSS Alert | Unescaped Output | Use Twig/Blade auto-escaping |
| SQLi Detected | String Concatenation | Switch to PDO Prepared Stmts |
| CSRF Attack | Missing Tokens | Enable framework CSRF protection|
| SSRF Alert | Untrusted URL Fetch | Validate and restrict allowed URLs|
| Mass Assignment | Unprotected Models | Define $fillable / $guarded |
| Insecure Direct Ref| Missing Authz Check | Implement Resource Voting (Gates) |

## Best Practices and Anti-Patterns
- **Best Practice**: Always hash passwords using the `PASSWORD_DEFAULT` constant (Argon2id in modern PHP).
- **Anti-Pattern**: Rolling your own cryptography or hashing algorithms.





























































































































































































































































































































































































