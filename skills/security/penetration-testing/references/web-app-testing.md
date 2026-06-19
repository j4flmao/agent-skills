# Web Application Testing Guide

## OWASP Top 10 Testing

### A1: Broken Access Control
- Test horizontal privilege escalation (user A accessing user B's data)
- Test vertical privilege escalation (user accessing admin functions)
- Test directory traversal (accessing files outside web root)
- Test HTTP method override attacks
- Tools: Burp Suite, ZAP, custom scripts

### A3: Injection
- SQL injection: parameterized queries prevent this
- NoSQL injection: test MongoDB $where, $gt operators
- Command injection: test parameters passed to shell commands
- Template injection (SSTI): test Jinja2, Handlebars, Thymeleaf
- Tools: SQLMap, NoSQLMap, manual testing

### A7: Cross-Site Scripting (XSS)
- Reflected XSS: inject script in URL/parameters
- Stored XSS: inject script in comments, profiles, content
- DOM XSS: client-side JavaScript vulnerabilities
- Blind XSS: XSS that triggers in admin panel (use XSS Hunter)
- Tools: XSSer, manual testing, XSS Hunter

## API Security Testing
- Test all HTTP methods (GET, POST, PUT, DELETE, PATCH)
- Test mass assignment: send extra fields in request body
- Test rate limiting: rapid requests should trigger throttling
- Test pagination: manipulate page/limit parameters
- Test authentication bypass: missing/expired/invalid tokens
- Test GraphQL: introspection queries, deep nesting, batching attacks

## Key Points
- Test each OWASP Top 10 category systematically
- Use Burp Suite or ZAP as primary web testing tool
- Test both authenticated and unauthenticated access
- Chain vulnerabilities to demonstrate business impact
- Document reproducible steps for each finding
- Retest after remediation to verify fixes
