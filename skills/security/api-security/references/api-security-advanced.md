# API Security Advanced Topics

## Introduction
Advanced API security covers GraphQL security (depth limiting, cost analysis, persisted queries), API threat detection with ML, API security testing automation, API gateway WAF integration, and securing event-driven/gRPC APIs.

## GraphQL Security
```typescript
// GraphQL security middleware
import { createComplexityLimitRule } from 'graphql-validation-complexity';
import depthLimit from 'graphql-depth-limit';

const graphqlSecurity = {
  // Limit query depth (prevent deep nested attacks)
  validationRules: [
    depthLimit(5),
    // Limit query complexity (prevent expensive queries)
    createComplexityLimitRule(1000, {
      onCost: (cost) => {
        if (cost > 500) {
          console.warn('Expensive GraphQL query:', cost);
        }
      },
    }),
  ],
  // Persisted queries (only allow pre-registered queries)
  persistedQueries: {
    ttl: 3600,
  },
};

// Rate limit by query complexity
const complexityLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5000, // Max complexity units per minute
  keyGenerator: (req) => req.user?.id || req.ip,
});
```

## API Security Testing Automation
```python
# OWASP ZAP API scan automation
from zapv2 import ZAPv2

def scan_api(api_url, api_key):
    zap = ZAPv2(apikey=api_key)
    # Import OpenAPI spec
    zap.openapi.import_url(api_url, 'https://example.com/openapi.json')
    # Active scan
    scan_id = zap.ascan.scan(api_url)
    while int(zap.ascan.status(scan_id)) < 100:
        time.sleep(5)
    # Get alerts
    alerts = zap.core.alerts()
    for alert in alerts:
        if alert['risk'] in ['High', 'Medium']:
            print(f"Found {alert['risk']} issue: {alert['alert']}")
```

## API Threat Detection
- Anomalous request patterns: sudden spike from single user, unusual parameter values
- API abuse: scraping, data exfiltration, credential stuffing
- Business logic abuse: coupon stacking, referral fraud, account creation abuse
- ML-based detection: train models on normal API traffic, flag deviations

## Key Points
- GraphQL needs depth limiting, complexity analysis, and persisted queries
- Automated API security scanning with OWASP ZAP or Postman
- Detect API abuse patterns with anomaly detection
- Use WAF (ModSecurity, AWS WAF) for OWASP Top 10 protection
- Secure gRPC APIs with mTLS and per-RPC authorization
- Apply rate limiting at multiple levels: global, per-user, per-endpoint
