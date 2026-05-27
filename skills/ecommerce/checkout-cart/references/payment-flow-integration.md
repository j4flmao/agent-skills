# Payment Flow Integration

## Overview

Payment flow integration covers the architecture and implementation patterns for processing payments in e-commerce systems. This guide addresses provider selection, PCI compliance, 3D Secure, recurring billing, payment orchestration, and error handling strategies.

## Payment Provider Comparison

```yaml
payment_providers:
  stripe:
    strengths: ["Excellent API design", "Comprehensive documentation", "Strong global coverage", "Built-in fraud detection (Radar)"]
    weaknesses: ["Higher fees for high-volume", "Limited in some emerging markets"]
    best_for: "Startups to mid-market, subscription businesses, global commerce"
    api_style: "RESTful, idempotency keys, webhooks for async events"
    pci_compliance: "Stripe.js + Elements — SAQ A (simplest compliance)"
    
  braintree:
    strengths: ["PayPal integration native", "Strong recurring billing", "Merchant of record capabilities"]
    weaknesses: ["Complex setup", "Legacy API patterns in some areas"]
    best_for: "Marketplaces, PayPal-heavy businesses"
    api_style: "REST + SDK-based, Drop-in UI for quick integration"
    pci_compliance: "Hosted fields or Drop-in — SAQ A"
    
  adyen:
    strengths: ["Global acquiring (local processors worldwide)", "Unified API across 150+ payment methods", "Revenue optimization"]
    weaknesses: ["Complex onboarding", "Higher minimum volumes"]
    best_for: "Enterprise global commerce, high-volume, multi-currency"
    api_style: "RESTful with checkout SDK, extensive webhook system"
    pci_compliance: "Secured Fields — SAQ A"
    
  square:
    strengths: ["Simple flat-rate pricing", "POS integration", "Hardware support"]
    weaknesses: ["Limited international coverage", "Fewer payment methods"]
    best_for: "Small businesses, retail + online, restaurants"
    api_style: "RESTful with SDK support, Payment Form for web"
    pci_compliance: "SqPaymentForm — SAQ A"
    
  custom_gateway:
    strengths: ["Full control over flow and data", "Lower per-transaction costs at scale"]
    weaknesses: ["PCI SAQ D (most complex)", "Ongoing compliance maintenance", "Integration with each acquiring bank"]
    best_for: "High-volume enterprise, unique business models"
    pci_compliance: "SAQ D — annual on-site assessment"
```

## Payment Flow Architecture

```yaml
payment_flow:
  standard_checkout:
    steps:
      - "1. Initiate: Client sends cart details to server"
      - "2. Validate: Server validates cart, calculates total, checks inventory"
      - "3. Create Payment Intent: Server calls provider API to create payment intent"
      - "4. Return Client Secret: Server returns client_secret to frontend"
      - "5. Collect Payment: Frontend uses provider SDK to collect card details"
      - "6. Confirm: Provider processes payment, returns success/failure"
      - "7. Webhook: Provider sends async webhook with payment status"
      - "8. Fulfill: Server confirms fulfillment on webhook receipt"
    idempotency: "Idempotency key on step 3 — prevents duplicate charges on retry"
    
  saved_card_checkout:
    steps:
      - "1. Retrieve saved payment method: Return tokenized card reference"
      - "2. Client selects payment method: Passes payment method ID"
      - "3. Server charges: Calls provider API with payment method ID + amount"
      - "4. 3DS challenge if required: Handle SCA challenge response"
      - "5. Confirm: Payment processed, handle webhook"
    security: "Never store raw card details. Use provider vault or tokenization service."
    
  zero_amount_auth:
    description: "$0 authorization to validate card before placing hold"
    use_case: "On-demand services, pre-orders, subscription trial starts"
    flow:
      - "Create payment intent with amount = 0"
      - "Confirm payment — validates card without charge"
      - "On fulfillment: create separate payment intent with actual amount"
```

## 3D Secure (SCA) Handling

```yaml
three_d_secure:
  when_required:
    europe: "Required for all customer-initiated transactions in EEA (PSD2/SCA)"
    uk: "Required for most e-commerce transactions (FCA guidelines)"
    non_sca: "India, Australia, Brazil — similar but different implementations"
    
  implementation_patterns:
    synchronous:
      description: "3DS challenge occurs within the checkout flow"
      flow: "Create payment → 3DS required → redirect to bank page → return to app → confirm"
      ux: "Redirect or webview — user leaves checkout momentarily"
    asynchronous:
      description: "Payment attempted without 3DS, escalated if declined"
      flow: "Attempt payment → bank declines → trigger 3DS → retry with authentication"
      ux: "Seamless for most users, 3DS only for high-risk transactions"
      
  exemptions:
    low_value: "Under €30, unlimited if merchant has low fraud rate"
    corporate: "Corporate cards with secure corporate payment processes"
    recurring: "Fixed amount recurring payments — first requires 3DS"
    trusted_merchant: "Merchant with fraud rate below 0.13% (Visa) or 0.95% (Mastercard)"
```

## Recurring Billing Patterns

```yaml
recurring_billing:
  setup:
    one_time: "Collect card → save as payment method → set up schedule"
    mandate: "Obtain mandate for variable recurring amounts"
    
  billing_cycles:
    fixed_date: "All customers billed on same day (1st of month)"
    anniversary: "Customer billed on their signup date"
    trailing_period: "Prorated first period, then full billing on regular schedule"
    
  dunning:
    first_failure: "Retry after 3 days"
    second_failure: "Retry after 7 days — notify customer"
    third_failure: "Retry after 14 days — downgrade service"
    final: "Suspend after 30 days — retain data for 90 days"
    
  proration:
    upgrade: "Credit remaining days, charge prorated difference"
    downgrade: "Credit remains, apply to next billing cycle"
    cancel: "Service continues until end of paid period"
```

## Payment Error Handling

```yaml
payment_errors:
  card_declined:
    generic_decline:
      cause: "Bank declined without specific reason"
      action: "Suggest different payment method"
    insufficient_funds:
      cause: "Card does not have available balance"
      action: "Try lower amount, suggest alternative method"
    stolen_card:
      cause: "Card reported lost or stolen"
      action: "Block payment method, do not retry"
    pickup_card:
      cause: "Card issuer wants card retained"
      action: "Block payment method, contact support"
    
  processing_errors:
    authentication_required:
      cause: "3D Secure authentication needed"
      action: "Trigger SCA challenge flow"
    processing_error:
      cause: "Payment provider temporary issue"
      action: "Retry with exponential backoff (up to 3 attempts)"
    duplicate_transaction:
      cause: "Idempotency key collision — already processed"
      action: "Return existing payment result"
    invalid_amount:
      cause: "Amount too small (< 0.50 USD) or exceeds limits"
      action: "Validate amounts before creating payment intent"
      
  network_errors:
    timeout:
      cause: "Payment provider did not respond in time"
      action: "Check payment status via API before retrying"
    connection_failed:
      cause: "Cannot reach payment provider"
      action: "Queue for retry, monitor provider status page"
```

## PCI Compliance Scope

```yaml
pci_compliance:
  saq_types:
    saq_a:
      scope: "Fully outsourced — card data never touches your server"
      requirements: "Validate third-party PCI compliance, maintain policy"
      example: "Stripe Checkout, Braintree Drop-in"
    saq_a_ep:
      scope: "Partially outsourced — iframe/hosted fields, no card data on server"
      requirements: "SAQ A requirements + monthly ASV scan"
      example: "Stripe Elements, Braintree Hosted Fields"
    saq_d_merchant:
      scope: "Card data processed or stored on your server"
      requirements: "Full PCI DSS requirements — 300+ controls"
      example: "Custom gateway implementation"
      
  scope_reduction_strategies:
    - "Use hosted payment page or redirect (SAQ A — lowest compliance burden)"
    - "Use iframe/hosted card fields (SAQ A-EP)"
    - "Tokenize at the point of entry — never transmit raw PAN"
    - "Implement client-side encryption — decrypt server-side, submit immediately"
    - "Store only last 4 digits and expiry date for display"
```

## Webhook Handling

```yaml
webhook_handling:
  events_to_listen:
    payment_intent:
      succeeded: "Mark order as confirmed, trigger fulfillment"
      payment_failed: "Notify customer, suggest retry with different method"
      canceled: "Release any held authorization"
    charge:
      succeeded: "Update transaction status"
      refunded: "Update order refund status"
      disputed: "Start dispute handling process"
    subscription:
      created: "Provision subscription service"
      updated: "Prorate and update access"
      canceled: "Disable service at end of billing period"
      past_due: "Enter dunning flow"
      
  reliability:
    idempotency: "Webhook events include unique ID — process only once"
    retry: "Provider retries failed webhooks (typically 24-72h)"
    ordering: "Events may arrive out of order — use event timestamp or sequence number"
    verification: "Verify webhook signature before processing (HMAC-SHA256)"
```
