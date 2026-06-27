# Security Best Practices for Python Backends

## Overview
Comprehensive security guidelines covering injection prevention, cryptography, dependency scanning, and rate limiting.

## 1. SQL Injection Prevention
Always use parameterized queries or an ORM (SQLAlchemy, Django ORM). Never concatenate strings for SQL.

### Anti-Pattern
```python
# DANGEROUS
cursor.execute(f"SELECT * FROM users WHERE username = '{user_input}'")
```

### Best Practice
```python
# SAFE
cursor.execute("SELECT * FROM users WHERE username = %s", (user_input,))
```

## 2. Password Hashing (Argon2)
Argon2 is the current OWASP recommendation, surpassing bcrypt and PBKDF2 due to memory-hard properties against GPU cracking.

```python
from passlib.hash import argon2

password = "supersecretpassword"
hashed = argon2.hash(password)
is_valid = argon2.verify(password, hashed)
```

## 3. JWT Security
JSON Web Tokens are widely used for stateless authentication.
- **Never store sensitive data** in the payload (it's Base64 encoded, not encrypted).
- **Use short expirations** (e.g., 15 minutes) and implement refresh tokens.
- **Verify the algorithm** (`alg`) to prevent algorithm confusion attacks.

```python
import jwt

SECRET = "your-256-bit-secret"
encoded = jwt.encode({"sub": "user123", "exp": 1700000000}, SECRET, algorithm="HS256")
decoded = jwt.decode(encoded, SECRET, algorithms=["HS256"])
```

## 4. CORS Configuration
Cross-Origin Resource Sharing must be strictly configured.
- Avoid `allow_origins=["*"]` in production.
- Explicitly list allowed domains.

```python
# FastAPI Example
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://myapp.com"],
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["Authorization", "Content-Type"],
)
```

## 5. Dependency Scanning (Bandit, Safety)
Automate security checks in your CI pipeline.

- **Safety:** Checks installed dependencies against known vulnerability databases (CVEs).
  ```bash
  safety check -r requirements.txt
  ```
- **Bandit:** AST-based static analysis to find common security issues in Python code.
  ```bash
  bandit -r my_project/
  ```

## 6. Rate Limiting Algorithms
Protect APIs from brute-force and DDoS.

### Token Bucket Algorithm
Tokens are added at a constant rate. Requests consume tokens. If bucket is empty, reject.

### Redis + FastAPI Example
Using a library like `fastapi-limiter` backed by Redis allows distributed rate limiting across multiple backend pods.
