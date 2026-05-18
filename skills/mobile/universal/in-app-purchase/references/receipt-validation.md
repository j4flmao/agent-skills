# Receipt Validation

## Local vs Server Validation

| Approach | Pros | Cons |
|----------|------|------|
| Client-side only | No server cost, offline capable | Can be bypassed on jailbroken devices |
| Server-side | Secure, single source of truth | Requires backend, latency |

**Recommendation**: Always validate on server. Treat client validation as optimistic UI only.

## iOS Server-Side Validation

```bash
# Production
POST https://buy.itunes.apple.com/verifyReceipt
# Sandbox
POST https://sandbox.itunes.apple.com/verifyReceipt

# Fallback: call sandbox if production returns 21007
```

### Request

```json
{
  "receipt-data": "<base64-encoded-receipt>",
  "password": "<shared-secret-32-hex-chars>",
  "exclude-old-transactions": true
}
```

### Response

```json
{
  "status": 0,
  "environment": "Production",
  "receipt": { ... },
  "latest_receipt_info": [
    {
      "product_id": "premium_monthly",
      "expires_date_ms": "1716000000000",
      "original_transaction_id": "1000000123456789",
      "cancellation_date": null
    }
  ],
  "pending_renewal_info": [
    {
      "auto_renew_product_id": "premium_monthly",
      "auto_renew_status": "1",
      "expiration_intent": "1"
    }
  ]
}
```

### Status Codes

| Code | Meaning |
|------|---------|
| 0 | Valid |
| 21000 | Malformed request |
| 21002 | Malformed receipt data |
| 21003 | Receipt not authenticated |
| 21004 | Shared secret mismatch |
| 21005 | Server unavailable |
| 21006 | Subscription expired (still valuable for `latest_receipt_info`) |
| 21007 | Sandbox receipt sent to production — retry sandbox |
| 21008 | Production receipt sent to sandbox |

## Android Server-Side Validation

```bash
GET https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{packageName}/purchases/subscriptions/{subscriptionId}/tokens/{token}
Authorization: Bearer <access_token>
```

### Response

```json
{
  "startTimeMillis": "1715000000000",
  "expiryTimeMillis": "1716000000000",
  "autoRenewing": true,
  "priceCurrencyCode": "USD",
  "priceAmountMicros": "9990000",
  "cancelReason": null,
  "userCancellationTimeMillis": null,
  "acknowledgementState": 1,
  "kind": "androidpublisher#subscriptionPurchase"
}
```

### Acknowledge Requirement (Android)

```bash
POST https://androidpublisher.googleapis.com/androidpublisher/v3/applications/{packageName}/purchases/subscriptions/{subscriptionId}/tokens/{token}:acknowledge
```
Purchases not acknowledged within 3 days are automatically refunded.

## Shared Secret (iOS)

- 32-character hex string generated in App Store Connect
- One secret per app (or one per app for family sharing)
- Used to decrypt receipt for validation

## Edge Cases

| Case | Handling |
|------|----------|
| Receipt refresh | Call `SKReceiptRefreshRequest` — prompted for App Store password |
| Expired subscription | `expires_date_ms` in past; `expiration_intent` indicates reason |
| Cancelled refund | `cancellation_date` present; `cancellation_reason` = 0 (other) or 1 (issue) |
| Family sharing | `in_app_ownership_type` = `FAMILY_SHARED`; validate from family organizer's receipt |
| Sandbox detection | Retry sandbox endpoint if production returns 21007 |
| No receipt | `Bundle.main.appStoreReceiptURL` nil — not purchased |
