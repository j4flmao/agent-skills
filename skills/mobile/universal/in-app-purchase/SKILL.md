---
name: mobile-in-app-purchase
description: >
  Use this skill when the user says 'in-app purchase', 'IAP', 'subscription',
  'consumable', 'StoreKit', 'Play Billing', 'receipt validation', 'restore
  purchase'. This skill enforces proper purchase flow patterns: product
  configuration, purchase flow, receipt validation, subscription management,
  and restore handling. Applies to iOS, Android, Flutter, and React Native.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [mobile, in-app-purchase, universal]
---

# Mobile In-App Purchase

## Purpose
Implement in-app purchases with correct product configuration, purchase flow, receipt validation, subscription management, and restore handling across all mobile platforms.

## Agent Protocol

### Trigger
User request includes: `in-app purchase`, `IAP`, `subscription`, `consumable`, `StoreKit`, `Play Billing`, `receipt validation`, `restore purchase`.

### Input Context
- Platform (iOS, Android, Flutter, React Native)
- Product types (consumable, non-consumable, subscription)
- Existing billing integration (StoreKit 2, Play Billing 5+, RevenueCat)

### Output Artifact
A markdown document containing product configuration and type selection, purchase flow implementation, receipt validation (client and server-side), subscription management (grace period, billing retry), restore purchases and entitlement verification, and platform-specific StoreKit / Play Billing APIs.

### Response Format
Code-first. One code block per platform (Swift, Kotlin, Dart/TS) with full purchase and validation flow. Platform divergence points as bullet list. No preamble. No postamble. No explanations.

### Completion Criteria
- [ ] Product types defined (consumable, non-consumable, subscription)
- [ ] Purchase flow implemented for all target platforms
- [ ] Receipt validation configured (client or server-side)
- [ ] Subscription management with grace period handling
- [ ] Restore purchases flow implemented
- [ ] Server-side validation endpoint documented (if applicable)

### Max Response Length
4096 tokens

## Decision Trees

### Product Type Selection
```
What does the user get?
├── One-time permanent unlock (remove ads, full game)
│   └── Non-consumable (restorable, one purchase forever)
├── Depletable resource (coins, gems, energy, lives)
│   └── Consumable (not restorable, can buy again)
├── Time-limited access (premium tier, cloud storage, streaming)
│   └── Auto-renewable subscription (Apple/Google manage billing)
└── Fixed-duration pass (season pass, event ticket)
    └── Non-renewing subscription (custom expiry, manage yourself)
```

### Receipt Validation Strategy
```
Does app have own backend server?
├── Yes → Server-side receipt validation
│   ├── iOS: server POST to Apple VerifyReceipt API
│   └── Android: server call Google Play Developer API with OAuth2
├── No backend but cross-platform → RevenueCat (handles server validation)
└── Prototype only → Client-side StoreKit 2 automatic verification
```

### Payment Platform Selection
```
Target platforms?
├── iOS only → StoreKit 2 (async/await, automatic receipt verification)
├── Android only → Play Billing 6+ (with BillingClient.queryProductDetailsAsync)
├── iOS + Android cross-platform
│   ├── Native per platform → StoreKit 2 + Play Billing 6 (maximum control)
│   └── Unified cross-platform → RevenueCat Purchases SDK
└── Flutter/React Native
    ├── RevenueCat Flutter/RN SDK (recommended, handles cross-platform)
    └── Platform channels with native StoreKit + Play Billing
```

### Introductory Offer Strategy
```
User subscribing for first time?
├── Free trial (best conversion, no risk)
│   ├── 3-day, 7-day, 14-day, or 30-day
│   └── Higher LTV products → longer trial
├── Pay-as-you-go introductory price (3 months at 50% off)
│   └── Medium price point, want revenue immediately
├── Pay-up-front introductory price (1 year at 40% off annual)
│   └── Annual subscription, high upfront commitment
└── No introductory offer
    └── Already discounted product, low price point
```

### Subscription Group Strategy (iOS)
```
Group multiple subscription products:
├── Single tier (one subscription SKU)
│   └── No group needed, just one product
├── Tiered access (Basic, Pro, Enterprise)
│   └── Same group → user can upgrade/downgrade within group
├── Standalone products (Storage 50GB, Storage 200GB)
│   └── One group per product line
└── Content subscriptions (News, Sports, Finance)
    └── Separate groups per content category
```

## Workflow

### Step 1: Define Product Types

| Type | Persistence | Restore | Use Case |
|---|---|---|---|
| Consumable | No | No | Coins, gems, lives |
| Non-consumable | Yes | Yes | Remove ads, unlock level |
| Auto-renewable subscription | Yes (while active) | Yes | Premium tier, cloud storage |
| Non-renewing subscription | Yes (custom duration) | Varies | Time-limited pass |

### Step 2: Configure Products in App Store Connect / Play Console

iOS (App Store Connect):
- Set up product IDs matching App Store Connect identifiers
- Configure pricing tiers, subscription durations, and introductory offers
- Enable promotional offers for subscription retention
- Configure subscription groups for upgrade/downgrade
- Set up shared secret for receipt validation
- Add localization for each product name and description
- Configure family sharing eligibility for non-consumables
- Set up subscription offer codes for marketing campaigns

Android (Google Play Console):
- Create products with the same product IDs used in code
- Configure managed products (consumables) or subscriptions
- Set up base plans and offers for subscriptions
- Configure grace period and account hold settings
- Link to Google Cloud project for API access
- Set up subscription offer codes and promo codes
- Configure regional pricing and tax settings

### Step 3: Implement Purchase Flow (iOS — StoreKit 2)

```swift
import StoreKit

typealias Product = StoreKit.Product

struct StoreService {
  static let shared = StoreService()
  private var purchasedProductIDs = Set<String>()

  func fetchProducts(_ ids: Set<String>) async throws -> [Product] {
    return try await Product.products(for: ids)
  }

  func purchase(_ product: Product) async throws -> PurchaseResult {
    let result = try await product.purchase()
    switch result {
    case .success(let verification):
      let transaction = try verification.payloadValue
      await deliverPurchase(transaction)
      await transaction.finish()
      return .success(transaction)
    case .userCancelled:
      return .cancelled
    case .pending:
      return .pending  // Ask to Buy, family approval
    @unknown default:
      return .unknown
    }
  }

  private func deliverPurchase(_ transaction: Transaction) async {
    purchasedProductIDs.insert(transaction.productID)
    if transaction.productType == .nonConsumable {
      // Unlock content permanently
    } else if transaction.productType == .consumable {
      // Add consumable to player inventory
    }
  }

  func checkEntitlements() async {
    for await result in Transaction.currentEntitlements {
      if case .verified(let transaction) = result {
        if transaction.revocationDate == nil {
          purchasedProductIDs.insert(transaction.productID)
        } else {
          purchasedProductIDs.remove(transaction.productID)
        }
      }
    }
  }
}

enum PurchaseResult {
  case success(Transaction)
  case cancelled
  case pending
  case unknown
}
```

### Step 4: Implement Purchase Flow (Android — Play Billing 6+)

```kotlin
class BillingRepository(private val context: Context) {
  private val billingClient = BillingClient.newBuilder(context)
    .setListener { billingResult, purchases ->
      if (billingResult.responseCode == BillingClient.BillingResponseCode.OK && purchases != null) {
        purchases.forEach { purchase ->
          when (purchase.purchaseState) {
            Purchase.PurchaseState.PURCHASED -> handlePurchase(purchase)
            Purchase.PurchaseState.PENDING -> handlePendingPurchase(purchase)
            Purchase.PurchaseState.UNSPECIFIED_STATE -> { /* ignore */ }
          }
        }
      }
    }
    .enablePendingPurchases()
    .build()

  fun queryProducts(productIds: List<String>, type: ProductType, callback: (List<Product>) -> Unit) {
    billingClient.startConnection(object : BillingClientStateListener {
      override fun onBillingSetupFinished(billingResult: BillingResult) {
        if (billingResult.responseCode == BillingClient.BillingResponseCode.OK) {
          val params = QueryProductDetailsParams.newBuilder()
            .setProductList(productIds.map { id ->
              QueryProductDetailsParams.Product.newBuilder()
                .setProductId(id)
                .setProductType(type)
                .build()
            })
            .build()
          billingClient.queryProductDetailsAsync(params) { _, productDetails ->
            callback(productDetails)
          }
        }
      }
      override fun onBillingServiceDisconnected() { /* retry connection */ }
    })
  }

  fun purchaseProduct(activity: Activity, product: ProductDetails, offerToken: String?) {
    val params = BillingFlowParams.newBuilder()
      .setProductDetailsList(listOf(product))
      .apply { offerToken?.let { setOfferToken(it) } }
      .build()
    billingClient.launchBillingFlow(activity, params)
  }

  private fun handlePurchase(purchase: Purchase) {
    // Verify purchase signature client-side (optional pre-check)
    val signatureValid = verifyPurchaseSignature(purchase)
    if (!signatureValid) return

    // Acknowledge purchase (within 3 days or auto-refund)
    val params = AcknowledgePurchaseParams.newBuilder()
      .setPurchaseToken(purchase.purchaseToken)
      .build()
    billingClient.acknowledgePurchase(params) { _, _ -> }

    // Send to server for verification
    Server.verifyPurchase(purchase)
  }

  fun queryExistingPurchases(type: ProductType, callback: (List<Purchase>) -> Unit) {
    billingClient.queryPurchasesAsync(type) { _, purchases ->
      callback(purchases)
    }
  }
}
```

### Step 5: Implement Receipt Validation (Server-Side)

```javascript
// Node.js server-side validation
const APPLE_SHARED_SECRET = process.env.APPLE_SHARED_SECRET;
const GOOGLE_SERVICE_ACCOUNT = JSON.parse(process.env.GOOGLE_SERVICE_ACCOUNT);

// iOS — Apple VerifyReceipt
async function verifyAppleReceipt(receiptData) {
  const url = isSandbox
    ? 'https://sandbox.itunes.apple.com/verifyReceipt'
    : 'https://buy.itunes.apple.com/verifyReceipt';

  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      'receipt-data': receiptData,
      'password': APPLE_SHARED_SECRET,
      'exclude-old-transactions': true
    })
  });

  const body = await response.json();

  if (body.status === 21007) {
    // Received production response from sandbox — retry sandbox
    return verifyAppleReceiptSandbox(receiptData);
  }

  if (body.status !== 0) {
    throw new Error(`Apple verification failed: ${body.status}`);
  }

  return {
    valid: true,
    transactionId: body.receipt.in_app[0]?.transaction_id,
    productId: body.receipt.in_app[0]?.product_id,
    expiresDate: body.latest_receipt_info?.[0]?.expires_date_ms,
    isTrialPeriod: body.latest_receipt_info?.[0]?.is_trial_period === "true"
  };
}

// Android — Google Play Developer API
async function verifyGooglePurchase(productId, purchaseToken) {
  const auth = await getGoogleAccessToken(GOOGLE_SERVICE_ACCOUNT);
  const packageName = 'com.example.app';

  const response = await fetch(
    `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${packageName}/purchases/subscriptions/${productId}/tokens/${purchaseToken}`,
    { headers: { Authorization: `Bearer ${auth}` } }
  );

  const body = await response.json();

  if (body.error) throw new Error(`Google verification failed: ${body.error.message}`);

  return {
    valid: body.paymentState === 1,  // 1 = Received
    expiryTimeMs: body.expiryTimeMillis,
    autoRenewing: body.autoRenewing,
    priceCurrencyCode: body.priceCurrencyCode,
    priceAmountMicros: body.priceAmountMicros
  };
}
```

### Step 6: Cross-Platform Purchase Flow (RevenueCat)

```dart
// Flutter
import 'package:purchases_flutter/purchases_flutter.dart';

class RevenueCatService {
  Future<void> configure() async {
    await Purchases.setup(
      PurchasesConfiguration(PUBSDK_API_KEY)
        ..appUserID = user.uniqueId
    );
    Purchases.addAttributionData(attributionData, AttributionType.appleSearchAds);
  }

  Future<List<Offering>> fetchOfferings() async {
    final offerings = await Purchases.getOfferings();
    return offerings.current?.availablePackages ?? [];
  }

  Future<bool> purchase(Package package) async {
    try {
      final customerInfo = await Purchases.purchasePackage(package);
      return customerInfo.entitlements.active.isNotEmpty;
    } on PlatformException catch (e) {
      if (e.code == PurchasesErrorCode.purchaseCancelledError) {
        return false;  // User cancelled
      }
      rethrow;
    }
  }

  Future<bool> checkEntitlement(String entitlementId) async {
    final customerInfo = await Purchases.getCustomerInfo();
    return customerInfo.entitlements.active.containsKey(entitlementId);
  }

  Future<void> restorePurchases() async {
    await Purchases.restorePurchases();
  }
}
```

### Step 7: Handle Subscription Status Lifecycle

```
Active (willRenew = true)
    |
    | grace period (7-30 days)
    v
In Grace Period (billing retry active, user still has access)
    |
    | retry succeeds
    v
Active (resolved, willRenew = true)
    |
    | retry fails after grace period
    v
Account Hold (15-30 days, no access, can restore by updating payment)
    |
    | payment updated
    v
Active (resolved, willRenew = true)
    |
    | hold expired
    v
Expired / Lapsed (final, willRenew = false)
```

### Step 8: Handle Subscription Webhooks

```javascript
// Apple App Store Server Notifications (version 2)
// POST from Apple to your server
app.post('/apple/notifications', async (req, res) => {
  const { signedPayload } = req.body;
  const payload = JSON.parse(
    Buffer.from(signedPayload.split('.')[1], 'base64').toString()
  );

  switch (payload.notificationType) {
    case 'DID_RENEW':
      // Subscription renewed — grant access
      await grantAccess(payload.subscriptionOriginalTransactionId);
      break;
    case 'DID_FAIL_TO_RENEW':
      // Billing failed — start grace period UI
      await warnUser(payload.subscriptionOriginalTransactionId);
      break;
    case 'DID_CHANGE_RENEWAL_PREF':
      // User upgraded/downgraded
      await updatePlan(payload.subscriptionOriginalTransactionId, payload.productId);
      break;
    case 'REFUND':
      // User got refund — revoke access immediately
      await revokeAccess(payload.subscriptionOriginalTransactionId);
      break;
    case 'EXPIRED':
      // Subscription expired — final state
      await markExpired(payload.subscriptionOriginalTransactionId);
      break;
  }

  res.status(200).end();
});

// Google Play Developer Notifications (Real-time developer notifications)
app.post('/google/notifications', async (req, res) => {
  const message = Buffer.from(req.body.message.data, 'base64').toString();
  const notification = JSON.parse(message);

  if (notification.subscriptionNotification) {
    const { notificationType, purchaseToken, subscriptionId } = notification.subscriptionNotification;

    switch (notificationType) {
      case 4:  // SUBSCRIPTION_RECOVERED
      case 1:  // SUBSCRIPTION_RENEWED
        await grantAccess(subscriptionId, purchaseToken);
        break;
      case 2:  // SUBSCRIPTION_CANCELED
      case 13: // SUBSCRIPTION_REVOKED
        await revokeAccess(subscriptionId, purchaseToken);
        break;
      case 3:  // SUBSCRIPTION_RESTARTED
        await restartAccess(subscriptionId, purchaseToken);
        break;
      case 5:  // SUBSCRIPTION_ON_HOLD
        await warnHold(subscriptionId, purchaseToken);
        break;
      case 7:  // SUBSCRIPTION_PAUSED
      case 8:  // SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED
      case 9:  // SUBSCRIPTION_IN_GRACE_PERIOD
        await warnPauseOrGrace(subscriptionId, purchaseToken, notificationType);
        break;
    }
  }
  res.status(200).end();
});
```

### Step 9: Implement Restore Purchases

```swift
// StoreKit 2 — iterate current entitlements
func restorePurchases() async -> [String] {
  var restoredProductIds: [String] = []
  for await result in Transaction.currentEntitlements {
    guard case .verified(let transaction) = result,
          transaction.revocationDate == nil else { continue }
    restoredProductIds.append(transaction.productID)
  }
  return restoredProductIds
}
```

```kotlin
// Play Billing 6+ — query both subs and inapp
fun restorePurchases(callback: (List<String>) -> Unit) {
  val restoredIds = mutableListOf<String>()
  billingClient.queryPurchasesAsync(BillingClient.ProductType.SUBS) { _, purchases ->
    purchases?.forEach { restoredIds.add(it.products.first()) }
  }
  billingClient.queryPurchasesAsync(BillingClient.ProductType.INAPP) { _, purchases ->
    purchases?.forEach { restoredIds.add(it.products.first()) }
    callback(restoredIds)
  }
}
```

### Step 10: Configure Promotional Offers and Offer Codes

```swift
// iOS — Promotional offer (existing subscriber win-back)
func promotionalOffer(for product: Product, discount: Product.SubscriptionOffer) async throws -> Product.PurchaseResult {
  let signedOffer = try await Product.PurchaseOption.promotionalOffer(
    offerID: discount.id,
    keyID: "KEY_ID",
    nonce: UUID(),
    signature: "SIGNATURE_FROM_SERVER",
    timestamp: Date()
  )
  return try await product.purchase(options: [signedOffer])
}
```

```kotlin
// Android — Subscription offer
fun purchaseWithOffer(activity: Activity, product: ProductDetails, offerToken: String) {
  val params = BillingFlowParams.newBuilder()
    .setProductDetailsList(listOf(product))
    .setOfferToken(offerToken)
    .build()
  billingClient.launchBillingFlow(activity, params)
}
```

## Anti-Patterns

### Receipt Validation
- **Client-only receipt trust**: Jailbroken devices bypass. Always validate server-side
- **Cached receipt validation**: Receipts expire. Refresh before each validation
- **Single validation endpoint**: Sandbox receipts sent to production fail. Auto-retry sandbox on 21007 status code
- **No receipt refresh before restore**: Stale receipt leads to stale entitlements. Always `SKReceiptRefreshRequest` first
- **Ignoring status codes**: Apple status 21004 (wrong shared secret) is common. Log and alert on non-zero statuses
- **No OAuth2 refresh for Google API**: Token expires after 1 hour. Implement refresh logic

### Purchase Flow
- **Not acknowledging Android purchases**: 3-day window then auto-refund. Call `acknowledgePurchase` immediately
- **Finishing iOS transaction before delivery**: User loses content on crash. Call `transaction.finish()` after delivery confirmed
- **Ignoring pending transactions**: Ask to Buy, family approval. Check entitlements on every app foreground
- **Blocking UI during purchase**: StoreKit/Play Billing handles UI. Don't add blocking overlays
- **No restore button**: App Store Review requires restore button. Include in settings or paywall
- **Hardcoding product IDs**: Products change per environment. Load from remote config or StoreKit Configuration file

### Subscription Management
- **Trusting client-side expiration**: User can modify device clock. Always verify server-side
- **No grace period handling**: Users lose access immediately on billing failure. Keep access during grace period
- **Revoking on notification delay**: Webhooks arrive async. Use receipt validation as source of truth
- **Single subscription group**: Limits upgrade/downgrade flexibility. Configure proper groups per tier
- **No billing retry UI**: Users don't know to update payment. Show clear CTA in app
- **Removing content on expiry**: Apple guidelines require keeping user data for 60 days after expiry
- **Not handling refund notifications**: Users get refunded but keep access. Implement RTDN (iOS) and real-time developer notifications (Android)

### Store Configuration
- **Mismatched product IDs**: Code IDs must match App Store Connect / Play Console exactly. Use constants
- **Sandbox and production account sharing**: Test accounts break on production build. Use StoreKit Configuration for local testing
- **No introductory offer testing**: Free trials don't auto-trigger in sandbox. Set up test accounts with specific scenarios
- **Missing localization**: Product names and descriptions must be localized in store consoles
- **No promotional offer codes**: Missed marketing channel. Generate codes for influencers and campaigns

## Testing IAP

### iOS StoreKit Configuration File
1. Create `.storekit` config file in Xcode
2. Define products with IDs, types, and pricing
3. Set subscription behavior (auto-renew, grace period, lapse)
4. Use in scheme: Run > Arguments > StoreKit Configuration
5. No real payment — instant "purchase" for fast iteration

### Sandbox Testing Scenarios
| Scenario | Setup | Expected Behavior |
|---|---|---|
| Fresh purchase | New sandbox account | Full purchase flow |
| First-time subscription | New account with intro offer | Introductory price applied |
| Renewal | Auto-renewable sub, wait 3-5 min | Renewal notification fires |
| Billing failure | Expired credit card in sandbox account | Grace period triggered |
| Cancel subscription | Cancel in Settings > Sandbox accounts | DID_CHANGE_RENEWAL to cancel |
| Refund | Request refund via sandbox console | REFUND notification |
| Upgrade/downgrade | Purchase second tier in same group | Prorated credit, pending change |
| Restore | Uninstall and reinstall | Restore button returns entitlements |

### Android Testing
1. Add test accounts in Play Console (Settings > License Testing)
2. Use internal testing track for full Play Billing flow
3. Test with test credit card numbers from Google
4. Subscription renewals: 5 min in internal testing
5. Grace period: Set up with test account, add expired card

## Performance Considerations
- Product listing fetch once at app launch. Cache for session lifetime
- Receipt validation adds 200-500ms. Perform async after purchase, not on main thread
- Subscription status check on app foreground, not every screen load
- Server-side validation caches responses to avoid rate limiting
- iOS receipt up to 200KB. Use `exclude-old-transactions: true` to minimize
- Batch subscription status checks into single API call
- Exponential backoff for failed validation retries
- RevenueCat caches entitlements locally — check cache first, then refresh async

## Rules
- Consumables delivered immediately server-side to prevent duplicate redemption
- Auto-renewable subscriptions acknowledged within 3 days (Android) or auto-refund
- Always handle deferred payment (pending transaction) state
- Never ship with sandbox/test credentials in release builds
- Always provide restore purchases button in app UI
- Subscription status verified server-side, never trust client state
- StoreKit 2 preferred over StoreKit 1 for new iOS implementations
- Google Play Billing queries handle connection failures gracefully
- Server-side receipt validation mandatory for production
- Log all purchase attempts server-side for fraud detection
- Handle billing retry notifications (Apple server notifications, Play Billing listener)
- Grace period status reflected in UI (user can still access content)

## References
- `references/in-app-purchase.md` — In-App Purchase Integration Guide
- `references/play-billing-guide.md` — Google Play Billing 5+ Implementation
- `references/receipt-validation.md` — Server-Side Receipt Validation
- `references/storekit-guide.md` — App Store StoreKit 2 Guide
- `references/subscription-management.md` — Subscription Lifecycle Management
- `references/subscription-models.md` — Subscription Pricing Models
- `references/iap-receipt-validation-server.md` — Receipt validation server
- `references/iap-subscription-lifecycle.md` — Subscription lifecycle

## Handoff
After IAP integration, hand off to:
- `mobile/universal/networking` — Server-side receipt validation API
- `mobile/universal/security` — Secure storage of receipt data, anti-fraud
- `mobile/universal/testing` — Sandbox testing, StoreKit config testing
- `mobile/universal/analytics` — Purchase funnel events, revenue tracking
- `mobile/universal/storage` — Offline entitlement caching
- `mobile/ios` — StoreKit 2, App Store Connect product config
- `mobile/android` — Play Billing, Play Console product config
