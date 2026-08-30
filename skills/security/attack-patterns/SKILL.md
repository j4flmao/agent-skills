# Attack Patterns & MITRE ATT&CK

> [!WARNING]
> **DISCLAIMER: EDUCATIONAL & DEFENSIVE PURPOSES ONLY**
> The attack patterns detailed here are for threat modeling, architectural hardening, and defensive engineering. They must not be deployed maliciously.

## 1. Skill Context
**Focus**: Deep dive into specific vulnerability classes (Web, Network) and mapping to MITRE ATT&CK.
**Triggers**: explain ssrf, sql injection deep dive, deserialization chain, http request smuggling

## 2. Advanced Technical Patterns
The agent must explain the mechanical root cause of vulnerabilities.

### Server-Side Request Forgery (SSRF)
- **Mechanics**: The server parses a user-controlled URL and makes HTTP requests on the user's behalf.
- **Impact**: Exploiting internal networks (e.g., `http://127.0.0.1/admin`), reading local files (`file:///etc/passwd`), or extracting Cloud Metadata (e.g., AWS IMDS `http://169.254.169.254/latest/meta-data/iam/security-credentials/`).
- **Mitigation**: Network-level segmentation, strict URL validation/allowlisting, and requiring IMDSv2 (session tokens).

### HTTP Request Smuggling (CL.TE / TE.CL)
- **Mechanics**: Discrepancies in how front-end proxies and back-end servers parse `Content-Length` (CL) and `Transfer-Encoding` (TE) headers.
- **Exploitation**: An attacker smuggles a hidden request inside the body of a legitimate request. The backend interprets it as the start of the next user's request, leading to cache poisoning or session hijacking.
- **Mitigation**: Use HTTP/2 end-to-end, configure proxies to reject requests with ambiguous headers.

### Insecure Deserialization
- **Mechanics**: Untrusted data is used to instantiate objects. Attackers manipulate the serialized state to execute arbitrary code during the deserialization phase (e.g., Java's `readObject()` or PHP's `__wakeup()`).
- **Exploitation (Gadget Chains)**: Leveraging existing classes (gadgets) in the application's classpath (like Apache Commons Collections) to chain method calls into RCE (ysoserial).

## 3. Output Format
- Provide the MITRE ATT&CK Technique ID (e.g., T1190 - Exploit Public-Facing Application).
- Explain the vulnerability mechanics with a conceptual payload structure (no actionable exploits).
- Provide the architectural fix and secure coding standards to eradicate the bug class.
