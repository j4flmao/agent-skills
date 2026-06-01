---
name: ecommerce-payment-processing
description: >
  Use when the user asks about payment processing, payment gateway integration, Stripe, PayPal, subscription billing, PCI DSS compliance, payment orchestration, or recurring payments. Do NOT use for: general e-commerce checkout flow (ecommerce-checkout-cart), or in-app purchases (mobile-in-app-purchase).
version: "2.0.0"
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

## Agent Protocol

### Trigger
Exact user phrases: payment, Stripe, PayPal, credit card processing, PCI DSS, payment gateway, subscription billing, recurring payment, payment orchestration, fraud detection, chargeback, refund, payout, merchant account, payment intent, tokenization, 3D Secure.

### Input Context
- Payment methods needed (credit cards, digital wallets, BNPL, local methods)
- Transaction volume and average transaction value
- Subscription/recurring billing requirements
- Current PCI DSS compliance level and scope
- Geographic regions for payment processing
- Fraud detection requirements and existing tools

### Output Artifact
Payment architecture design, gateway integration plan, PCI DSS compliance scope document, subscription billing model.

### Response Format
```
## Payment Processing Architecture
### Gateway: {gateway name}
### Methods: {payment methods}
### PCI Scope: {compliance level}

### Payment Flow
{flow: checkout -> payment intent -> authorization -> capture -> settlement}

### Recurring Billing
{subscription model, billing cycle, dunning process}

### Fraud Prevention
{rules engine, 3DS, velocity checks, address verification}

### Compliance Controls
{PCI DSS controls, data handling, tokenization, audit trail}
```

No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Payment gateway selected and integration designed
- [ ] PCI DSS compliance scope defined and validated
- [ ] Payment flow documented (authorization, capture, refund, settlement)
- [ ] Recurring billing model designed with dunning process
- [ ] Fraud detection rules configured and tested
- [ ] Multi-currency and multi-region support designed
- [ ] Webhook handling for async payment events implemented
- [ ] Error handling for all failure scenarios documented

### Max Response Length
7000 tokens

## Decision Trees

### Gateway Selection Decision Tree

1. What is the primary business model?
   - Physical goods e-commerce: Stripe, PayPal, Adyen. Need strong checkout UX, shopping cart integration, and multi-carrier shipping.
   - Digital goods/SaaS: Stripe, Braintree, Recurly. Need subscription management, metered billing, dunning.
   - Marketplace/Platform: Stripe Connect, Adyen for Platforms, Mangopay. Need split payments, onboarding sub-merchants, escrow.
   - Enterprise/B2B: Adyen, Worldpay, Chase Paymentech. Need invoicing, PO numbers, credit terms, multi-entity.

2. What geographic regions are served?
   - US only: Stripe or PayPal. Best developer experience, broadest feature set for US market.
   - Europe: Adyen, Mollie, Stripe. Need SEPA, iDEAL, Bancontact, Klarna. Strong local method support.
   - Global (3+ regions): Adyen or Stripe. Unified API across regions. Multi-currency settlement. Local acquiring relationships.
   - Asia-specific: Razorpay (India), Paytm (India), Alipay/WeChat Pay (China), PayPay (Japan).

3. What is the projected transaction volume?
   - < 10K transactions/month: Stripe or PayPal. Flat-rate pricing. No monthly minimums. Quick integration.
   - 10K-100K/month: Braintree or Stripe. Negotiable rates. Dedicated support. Advanced features available.
   - 100K+/month: Adyen or direct acquiring. Interchange-plus pricing. Dedicated account manager. Custom integration.

4. What subscription/recurring features are needed?
   - Simple subscriptions (same amount, same interval): Stripe or Recurly. Built-in subscription management. No custom development.
   - Complex billing (usage-based, tiered, proration): Stripe or Chargify. Advanced billing logic. Custom invoicing.
   - Enterprise billing (quotes, CPQ, multi-entity): Zuora or Salesforce Billing. Complete billing lifecycle. Contract management.

### Payment Flow Decision Tree

1. Is the payment amount known at checkout?
   - YES -> Standard payment flow. Create payment intent with amount, capture immediately or authorize + capture later.
   - NO -> Delayed payment flow. Authorize $0 or nominal amount initially. Capture final amount after fulfillment. Requires gateway support for payment amount modification.

2. Is the customer present during payment?
   - YES -> Online checkout. Customer enters payment details. 3DS may be required. Immediate authorization.
   - NO -> Offline payment. Invoice-based. Customer pays later via payment link or bank transfer. Requires invoice generation and payment reconciliation.

3. Does the payment require additional verification?
   - YES -> 3D Secure (SCA) required for EU region. CVV verification for card-not-present. AVS check for US addresses. May add friction but reduces fraud and liability.
   - NO -> Standard payment flow. No additional verification steps. Faster checkout but higher fraud risk.

4. Is the payment recurring or one-time?
   - One-time -> Standard payment intent. Single authorization + capture. No recurring logic needed.
   - Recurring -> Create customer + payment method. Set up subscription. Initial payment + schedule future payments. Requires payment method token saved for future use.

### PCI DSS Compliance Scope Decision Tree

1. How is payment data handled?
   - Direct API (Stripe Elements, PayPal SDK): Payment data goes directly from browser to gateway. Server never sees card data. Lowest PCI scope (SAQ A). No PCI audit needed for most cases.
   - Server-side API: Card data passes through your server to gateway. Full PCI scope (SAQ D). Annual QSA audit required. Significant compliance burden.
   - Self-hosted payment form: Payment form on your server collecting card data. Full PCI scope. Strongly discouraged.

2. What is the annual transaction volume?
   - > 6M/year: Level 1. Full QSA audit, ASV scan quarterly, ROC report. Most stringent requirements.
   - 1-6M/year: Level 2. SAQ D + ASV scan quarterly. QSA may be required depending on acquirer.
   - 20K-1M/year: Level 3. SAQ + ASV scan quarterly. Self-assessment with validation.
   - < 20K/year: Level 4. SAQ (self-assessment). ASV scan quarterly if e-commerce.

3. Are you storing any cardholder data?
   - YES -> Extremely limited circumstances (recurring payments without token). Requires PCI DSS 3.4 encryption, access control, key management, audit logging. Highest compliance burden. Use tokenization instead.
   - NO -> Tokenization via gateway reduces scope. All compliance requirements apply to token storage instead of raw PAN data.

## Workflow

### Payment Flow Architecture
```
Client -> Checkout Page -> Backend -> Payment Gateway
                                  +
                            Webhook Handler
                                  +
                            Order Service
                                  +
                            Database (orders, transactions)
```

### Payment Flow
1. Customer initiates checkout on frontend
2. Frontend requests payment intent from backend (amount, currency, customer)
3. Backend creates payment intent in gateway, returns client secret to frontend
4. Frontend collects payment details, submits to gateway (via Stripe Elements, etc.)
5. Gateway processes payment, returns success/failure to frontend
6. Frontend notifies backend of payment result
7. Gateway sends webhook to backend confirming payment status
8. Backend updates order status, triggers fulfillment
9. Backend records transaction details in database

### Gateway Integration Patterns
| Gateway | Best For | Key Feature |
|---------|----------|-------------|
| Stripe | SaaS, subscriptions | Complete API, strong docs |
| PayPal | Consumer market | High trust, buyer protection |
| Braintree | Multi-gateway | PayPal + credit cards unified |
| Adyen | Enterprise | 250+ payment methods globally |
| Mollie | European market | Local payment methods (iDEAL, SEPA) |

### Gateway Integration Architecture
```yaml
abstraction_layer:
  purpose: "Decouple business logic from specific gateway implementation"
  components:
    payment_service:
      methods: ["create_payment", "capture_payment", "refund_payment", "get_payment_status"]
      gateway_adapters:
        stripe: "StripePaymentAdapter implements PaymentGatewayInterface"
        paypal: "PayPalPaymentAdapter implements PaymentGatewayInterface"
        adyen: "AdyenPaymentAdapter implements PaymentGatewayInterface"
    webhook_handler:
      stripe: "StripeWebhookHandler parses stripe events"
      paypal: "PayPalWebhookHandler parses paypal IPN"
      generic: "Normalized PaymentEvent emitted to internal event bus"
```

### Subscription Billing
```
Plan -> Customer -> Subscription -> Invoice -> Payment
                                         +
                                   Failed -> Retry (dunning)
                                           +
                                    Max retries -> Cancel
```

### Subscription Billing Flow
1. Create product/plan in gateway (monthly, yearly, usage-based, tiered)
2. Create customer record with payment method token
3. Create subscription linked to customer + plan
4. Gateway handles billing cycle: generate invoice at interval, attempt payment
5. Payment success: update subscription status, send receipt
6. Payment failure: enter dunning process:
   - Attempt 1: Immediate retry with same payment method
   - Attempt 2: 3 days later
   - Attempt 3: 5 days later
   - Attempt 4: 7 days later (notify customer to update payment method)
   - Max retries exceeded: Cancel subscription, send cancellation notice
7. Subscription renewal: repeat billing cycle at interval

### Payment Method Tokenization
```yaml
tokenization_flow:
  step_1: "Customer enters card details in gateway-hosted UI (Stripe Elements, PayPal SDK)"
  step_2: "Gateway returns single-use token to frontend (tok_xxx, pm_xxx)"
  step_3: "Frontend sends token to backend"
  step_4: "Backend uses token to create payment or save for future use"
  step_5: "For recurring: create customer + attach payment method (cus_xxx, pm_xxx)"
  step_6: "Store payment method reference in database (gateway customer ID + payment method ID)"
  step_7: "Use saved payment method for subsequent payments without re-entering card details"

benefits:
  pci_scope: "Card data never touches server. SAQ A eligibility."
  recurring: "Token stored for future payments. No need to re-collect card details."
  security: "Token is useless if database breached (unlike PAN)."
```

### Refund and Chargeback Handling
```yaml
refund_flow:
  partial_refund: "Refund specific amount. Order status: partially_refunded."
  full_refund: "Refund entire amount. Order status: refunded."
  timing:
    gateway_window: "Most gateways support refunds within 120 days"
    beyond_window: "Manual refund required (bank transfer, check)"

chargeback_flow:
  notification: "Gateway notifies via webhook. Chargeback reason code provided."
  response_window: "Typically 7-21 days to respond with evidence."
  evidence: "Proof of delivery, customer communication, refund record."
  outcome:
    won: "Funds returned. May have dispute fee."
    lost: "Funds deducted. Dispute fee charged. Customer not refundable."
  prevention:
    - "Clear descriptor on statement"
    - "Delivery confirmation for physical goods"
    - "IP + AVS + CVV matching"
    - "3D Secure authentication"
    - "Customer service contact easily accessible"
```

### Multi-Currency and Multi-Region
```yaml
multi_currency:
  pricing:
    - "Store prices in base currency (USD)"
    - "Convert to display currency at checkout"
    - "Update exchange rates daily"
    - "Show total in local currency with exchange rate disclosure"
    
  settlement:
    - "Receive settlement in local currency or base currency"
    - "Gateway handles currency conversion"
    - "Conversion fees apply (typically 1-2%)"
    
  regional_requirements:
    eu:
      pds2_sca: "Strong Customer Authentication required"
      local_methods: "SEPA, iDEAL, Bancontact, Klarna"
    us:
      avs: "Address Verification System"
      local_methods: "ACH, credit cards, PayPal, BNPL"
    asia:
      local_methods: "Alipay, WeChat Pay, PayTM, GrabPay"
      qr_codes: "Common payment method"
```

### Fraud Detection Rules
```yaml
fraud_rules:
  velocity_checks:
    - "Max 3 failed payment attempts per card per hour"
    - "Max 10 failed attempts per customer per day"
    - "Max $5000 total from single IP in 24 hours"
    
  avs_check:
    - "Street address mismatch: flag for manual review"
    - "ZIP code mismatch: flag for manual review"
    - "Address not verified: allow but mark as higher risk"
    
  cvv_check:
    - "CVV mismatch: decline transaction"
    - "CVV not provided: decline if CVV required"
    
  ip_analysis:
    - "IP country mismatch with billing country: review"
    - "Proxy/VPN detected: additional verification required"
    - "IP on blocklist: decline"
    
  amount_thresholds:
    - "Single transaction > $10,000: manual review required"
    - "Total daily > $25,000: manual review required"
    - "Multiple transactions same card different shipping addresses: review"
    
  machine_learning:
    - "Gateway ML score < 50: auto-approve"
    - "Score 50-80: manual review"
    - "Score > 80: auto-decline"
```

### Error Handling and Reconciliation
```yaml
payment_errors:
  decline_codes:
    insufficient_funds: "Notify customer, suggest alternative payment method"
    card_expired: "Request updated card details"
    fraud_suspected: "Notify customer to contact bank"
    do_not_honor: "Request alternative payment method"
    lost_card_stolen: "Report to gateway, block customer"
    processing_error: "Retry with exponential backoff (max 3 attempts)"
    
  network_errors:
    timeout: "Check payment status via gateway API. Retry or mark as failed."
    gateway_unavailable: "Queue payment for retry. Alert operations team."
    webhook_delivery_failure: "Webhook has retry mechanism (typically 24h). Backfill via API query."
    
  reconciliation:
    daily: "Reconcile gateway transaction log against internal order records"
    process: "Match on gateway transaction ID. Flag unmatched transactions for investigation."
    frequency: "Automated daily reconciliation. Manual weekly review of exceptions."
    double_charge_prevention: "Idempotency key on payment creation. Same key = same payment."
```

## Governance Framework

### Payment Operations Governance

#### Daily Reconciliation Process
1. Export today's transactions from gateway (settled, pending, failed, refunded).
2. Match against internal order/transaction records.
3. Flag unmatched: gateway record without internal record, internal record without gateway record.
4. Investigate flagged items within 24 hours.
5. Document reconciliation results. Escalate discrepancies > $1,000.

#### PCI DSS Compliance Maintenance
- Quarterly: ASV vulnerability scan of external-facing IP addresses.
- Annual: SAQ validation or QSA audit (depending on level).
- Continuous: Monitor PCI scope changes (new integrations, data flows).
- Event-driven: Scope review when adding new payment methods or changing gateway.
- Training: Annual PCI DSS awareness training for developers handling payment-related code.

#### Fraud Review Cadence
- Daily: Review flagged transactions. Approve or decline within 4 hours.
- Weekly: Fraud pattern analysis. Update rules based on new patterns.
- Monthly: Fraud loss report. Chargeback rate vs. threshold (1% of transactions).
- Quarterly: Fraud prevention strategy review. ML model performance evaluation.

#### Payment Incident Response
- Critical (payment processing down): Immediate response. Operations team + gateway support. Target restoration within 30 minutes. Post-mortem within 24 hours.
- High (elevated decline rate, gateway latency): Investigate within 1 hour. Root cause within 4 hours.
- Medium (reconciliation discrepancies): Investigate within 24 hours. Resolve within 7 days.
- Low (individual transaction issues): Standard support process. Resolve within 48 hours.

## Common Pitfalls

Pitfall 1: Storing raw card numbers. Increases PCI DSS scope to SAQ D. Massive compliance burden. Mitigation: use client-side tokenization (Stripe Elements, Braintree Hosted Fields). Never let card data reach your server.

Pitfall 2: Not handling webhook idempotency. Gateway may send the same webhook event multiple times. Processing twice results in double charge. Mitigation: idempotency key on webhook processing. Store processed event IDs.

Pitfall 3: Ignoring webhook delivery failures. Gateway webhooks can fail to deliver. Order stays in pending state. Mitigation: build webhook retry with monitoring. Implement fallback via scheduled API queries. Alert on webhook delivery failures.

Pitfall 4: No payment method abstraction. Direct coupling to Stripe API makes switching gateways impossible without full rewrite. Mitigation: payment service abstraction layer with gateway adapters. All business logic uses generic interface.

Pitfall 5: Incorrect 3D Secure handling. Not handling SCA exemptions correctly. EU payments declined. Mitigation: implement 3DS with proper exemption logic. Use gateway SDK for SCA handling. Test with real card network sandbox.

Pitfall 6: No retry logic for failed payments. One failure permanently marks subscription as failed. Customer churn increases. Mitigation: implement dunning process with multiple retry attempts over several days. Notify customer before final attempt.

Pitfall 7: Not handling currency conversion edge cases. Exchange rate changes between price display and payment capture. Mitigation: lock exchange rate at checkout. Display rates with timestamp. Recalculate only on explicit user action.

Pitfall 8: Overlooking refund timing rules. Attempting to refund a payment that has not settled. Refund fails. Mitigation: check settlement status before processing refund. Queue refunds for unsettled payments.

## Best Practices

Practice 1: Use payment intent API pattern (Stripe PaymentIntent, Adyen /payments). Single API call handles authorization, 3DS, and confirmation. Idempotent by design. Better error handling than legacy charge API.

Practice 2: Implement idempotency keys on all payment operations. Generate unique key per payment attempt. Same key with same request = no duplicate. Store processed keys with expiry (24-48 hours).

Practice 3: Use gateway-hosted payment UI (Stripe Elements, Braintree Hosted Fields, PayPal Buttons). Reduces PCI scope. Handles card brand detection, validation, and formatting. Accessible by default. Less development effort.

Practice 4: Implement asynchronous payment confirmation via webhooks. Do not rely on frontend callback alone. Gateway webhook confirms settlement. Frontend callback is optimistic. Always validate with webhook.

Practice 5: Log all payment events with correlation ID. Gateway transaction ID, order ID, and internal correlation ID in every log line. Enables debugging across systems. Critical for chargeback response.

Practice 6: Build payment failure recovery flows. Allow customers to retry with different payment method. Save cart state during payment attempt. Do not lose the order on payment failure.

Practice 7: Test with real card network sandboxes. Stripe test mode, PayPal sandbox, Adyen test. Test all scenarios: success, decline, 3DS required, network error, timeout, webhook delivery.

Practice 8: Implement gateway failover for critical payments. If primary gateway is unavailable, route to secondary gateway. Requires consistent API abstraction layer and merchant accounts with both gateways.

## Template: Payment Integration Checklist
```
## Payment Integration Checklist

### Pre-Integration
- [ ] Gateway selected and merchant account created
- [ ] PCI DSS compliance level determined
- [ ] Payment methods decided (credit card, digital wallet, local methods)
- [ ] 3D Secure requirements assessed (SCA for EU)
- [ ] Multi-currency requirements documented
- [ ] Fraud detection strategy defined

### Integration
- [ ] Payment service abstraction layer implemented
- [ ] Gateway adapter for selected gateway coded
- [ ] Client-side payment UI integrated (Elements, hosted fields, buttons)
- [ ] Payment intent API implemented
- [ ] Webhook handler with idempotency implemented
- [ ] Subscription billing flow implemented (if recurring)
- [ ] Refund flow implemented
- [ ] Multi-currency support implemented

### Testing
- [ ] All gateway test cards tested (success, decline, 3DS, insufficient funds)
- [ ] Webhook delivery tested (success, failure, retry)
- [ ] Idempotency verified (duplicate requests rejected)
- [ ] Edge cases: network timeout, gateway unavailable, partial refund
- [ ] Subscription billing tested (create, renew, fail, dunning, cancel)
- [ ] Currency conversion verified
- [ ] Fraud rules tested (velocity, AVS, CVV, IP)

### Compliance
- [ ] PCI DSS SAQ completed or QSA audit scheduled
- [ ] ASV scan passed (quarterly)
- [ ] Data handling review: no card data stored on servers
- [ ] Tokenization verified
- [ ] Security review of payment integration completed

### Production Readiness
- [ ] Monitoring dashboards configured (success rate, decline rate, latency, webhook delivery)
- [ ] Alerts configured (gateway down, elevated decline rate, reconciliation failures)
- [ ] Runbooks documented (payment incident response, gateway failover, manual refund process)
- [ ] Reconciliation process automated
- [ ] Operations team trained on payment support
```

## PCI DSS Compliance Levels
| Level | Transaction Volume | Requirements |
|-------|-------------------|--------------|
| 1 | > 6M/year | Full QSA audit, ASV scan quarterly, ROC report |
| 2 | 1-6M/year | SAQ D + ASV scan quarterly, quarterly self-assessment |
| 3 | 20k-1M/year | SAQ + ASV scan quarterly, annual self-assessment |
| 4 | < 20k/year | SAQ (self-assessment), ASV scan quarterly |

## References
  - references/checkout-optimization.md -- Checkout Optimization
  - references/gateway-patterns.md -- Payment Gateway Integration Patterns
  - references/payment-processing-advanced.md -- Payment Processing Advanced Topics
  - references/payment-processing-fundamentals.md -- Payment Processing Fundamentals
  - references/payment-security.md -- Payment Security
  - references/pci-dss-guide.md -- PCI DSS Compliance Guide
  - references/stripe-integration.md -- Stripe Integration
  - references/subscription-billing.md -- Subscription Billing
