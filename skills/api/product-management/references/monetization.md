# API Monetization

## Pricing Models
| Model | When to Use | Example |
|-------|-------------|---------|
| Pay-as-you-go | Variable usage | Stripe: .025/API call |
| Tiered packages | Predictable usage | Google Maps: 200-500K requests/month |
| Per-feature | Different features for different needs | Twilio: SMS vs Voice vs Video |
| Revenue share | Transaction-based platforms | Stripe Connect: % of transaction |
| Enterprise custom | High-volume consumers | Custom pricing and SLAs |

## Rate Limiting Tiers
`yaml
free:
  requests_per_second: 10
  requests_per_day: 1000
  features: [read]

pro:
  requests_per_second: 100
  requests_per_day: 100000
  features: [read, write]

enterprise:
  requests_per_second: 1000
  requests_per_day: unlimited
  features: [read, write, admin]
`

## Usage Tracking
- Track per API key: request count, endpoint, response time, errors
- Show usage dashboard in developer portal
- Send usage alerts (approaching limit, exceeded limit)
- Auto-block or throttle when limit exceeded
- Allow plan upgrades via self-service
