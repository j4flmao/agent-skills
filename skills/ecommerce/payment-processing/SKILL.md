---
name: ecommerce-payment-processing
description: >
  Use when the user asks about payment processing, payment gateway integration, Stripe, PayPal, subscription billing, PCI DSS compliance, payment orchestration, or recurring payments. Do NOT use for: general e-commerce checkout flow (ecommerce-checkout-cart), or in-app purchases (mobile-in-app-purchase).
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [ecommerce, payment-processing, phase-3]
---

# Payment Processing

## Purpose
Implement payment processing: gateway integration, subscription management, PCI DSS compliance, payment orchestration, fraud detection, and multi-currency support.

## Workflow

### Payment Flow Architecture
```
Client → Checkout Page → Backend → Payment Gateway
                                  ↓
                            Webhook Handler
                                  ↓
                            Order Service
                                  ↓
                            Database (orders, transactions)
```

### Gateway Integration Patterns
| Gateway | Best For | Key Feature |
|---------|----------|-------------|
| Stripe | SaaS, subscriptions | Complete API, strong docs |
| PayPal | Consumer market | High trust, buyer protection |
| Braintree | Multi-gateway | PayPal + credit cards unified |
| Adyen | Enterprise | 250+ payment methods globally |
| Mollie | European market | Local payment methods (iDEAL, SEPA) |

### Subscription Billing
```
Plan → Customer → Subscription → Invoice → Payment
                                         ↓
                                   Failed → Retry (dunning)
                                           ↓
                                    Max retries → Cancel
```

### PCI DSS Compliance Levels
| Level | Transaction Volume | Requirements |
|-------|-------------------|--------------|
| 1 | > 6M/year | Full QSA audit, ASV scan quarterly |
| 2 | 1-6M/year | SAQ + ASV scan quarterly |
| 3 | 20k-1M/year | SAQ + ASV scan quarterly |
| 4 | < 20k/year | SAQ (self-assessment) |

## References
  - references/checkout-optimization.md — Checkout Optimization
  - references/gateway-patterns.md — Payment Gateway Integration Patterns
  - references/payment-processing-advanced.md — Payment Processing Advanced Topics
  - references/payment-processing-fundamentals.md — Payment Processing Fundamentals
  - references/payment-security.md — Payment Security
  - references/pci-dss-guide.md — PCI DSS Compliance Guide
  - references/stripe-integration.md — Stripe Integration
  - references/subscription-billing.md — Subscription Billing
