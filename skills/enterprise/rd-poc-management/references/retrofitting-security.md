# Retrofitting Security & Compliance

## 1. Paying the Innovation Debt
During the initial weeks of a PoC, speed is prioritized. R&D engineers often bypass security gates (hardcoding passwords, disabling SSL, ignoring CORS) to validate the core hypothesis faster. 

Before the PoC can be promoted to an MVP, this "Innovation Debt" must be paid in full. **Security cannot be bolted on at the end; it must be systematically retrofitted.**

## 2. The 4-Step Retrofit Plan

### Step 1: Secrets Management
- **Audit**: Scan the entire Git history using tools like `trufflehog` or `git-secrets` to find hardcoded AWS keys, database passwords, or third-party API tokens. (If committed, the keys must be rotated immediately).
- **Retrofit**: Remove all plain-text secrets from `docker-compose.yml` or `.env` files. Implement a secure injection pipeline using **HashiCorp Vault**, **AWS Secrets Manager**, or Kubernetes `SealedSecrets`.

### Step 2: Identity & Access Management (IAM)
- **Audit**: PoCs often use "mock" authentication (e.g., passing `?user_id=1` in the URL).
- **Retrofit**: Integrate the enterprise's standard Identity Provider (IdP) like Okta or Azure AD. Implement strict **OIDC / OAuth 2.0** flows. Ensure the API validates JWT signatures on every request and enforces Role-Based Access Control (RBAC).

### Step 3: Structured Logging & PII Redaction
- **Audit**: PoCs often use `print()` or `console.log()`, dumping raw user data (emails, credit cards, passwords) into the standard output.
- **Retrofit**: 
  1. Switch to a Structured Logging library (outputting JSON).
  2. Implement an automatic redaction filter that masks Personally Identifiable Information (PII) before the log is shipped to Elasticsearch or Datadog. (e.g., `{"email": "***@domain.com"}`).

### Step 4: Automated Pipeline Security
A PoC usually has a rudimentary CI/CD pipeline (compile and deploy). The pipeline must be upgraded to enterprise standards:
- **SAST (Static Application Security Testing)**: Add SonarQube or Checkmarx to scan the source code for SQL Injections or XSS vulnerabilities before merging.
- **SCA (Software Composition Analysis)**: Add Snyk or Dependabot to scan `package.json` or `pom.xml` for open-source libraries with known CVEs (Common Vulnerabilities and Exposures).
