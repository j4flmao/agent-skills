# API Security Testing Patterns

## Testing Categories
| Category | Tools | What It Tests |
|----------|-------|---------------|
| Authentication | OWASP ZAP, custom scripts | Token theft, brute force, session hijacking |
| Authorization | Postman, custom tests | Broken access control, privilege escalation |
| Injection | SQLMap, custom fuzzing | SQL injection, NoSQL injection, command injection |
| Rate limiting | k6, Locust | Bypass rate limits, DoS |
| Input validation | Burp Suite, custom | XSS, SSTI, path traversal |
| Business logic | Manual testing | Logic flaws, race conditions |
| Mass assignment | Custom scripts | Unauthorized field updates |

## API Security Checklist
- [ ] Authentication: JWT rotation, MFA, OAuth2 flow validated
- [ ] Authorization: RBAC/ABAC enforced per endpoint
- [ ] Rate limiting: per user, per IP, per endpoint
- [ ] Input validation: all parameters sanitized
- [ ] Output encoding: no sensitive data in responses
- [ ] CORS: restricted origins, no wildcard
- [ ] Error handling: no stack traces in responses
- [ ] Logging: security events logged, not sensitive data
