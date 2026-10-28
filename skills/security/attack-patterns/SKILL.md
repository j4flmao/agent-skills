---
name: attack-patterns
description: >
  Use this skill when the user says 'SSRF', 'HTTP request smuggling', 'insecure deserialization', 'MITRE ATT&CK mapping', 'vulnerability class deep dive'. Explains the mechanical root cause of common web/network vulnerability classes and maps them to MITRE ATT&CK for threat modeling and architectural hardening. Defensive and educational only. Do NOT use for: generating working payloads, SIEM detection rules (use security/detection-engineering), or secrets handling (use security/secrets-management).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
tags: [security, attack-patterns, mitre-attack, threat-modeling, defensive]
---

# Attack Patterns & MITRE ATT&CK

## Purpose
Explain the root cause and conceptual structure of major vulnerability classes (SSRF, request smuggling, deserialization) and map them to MITRE ATT&CK technique IDs. Used for threat modeling, secure design, and defensive engineering — not for producing actionable exploits.

## Agent Protocol

### Trigger
User phrases: "explain SSRF", "SQL injection deep dive", "deserialization gadget chain", "HTTP request smuggling", "map to ATT&CK".

### Input Context
- The vulnerability class or component under review.
- The stack/framework (affects which mitigations apply).

### Output Artifact
Root-cause explanation, ATT&CK technique ID, and the architectural fix. No actionable exploit.

### Response Format
```
Class: {vuln class}
ATT&CK: {Txxxx}
Root cause: {mechanism}
Mitigation: {secure design / control}
```

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
