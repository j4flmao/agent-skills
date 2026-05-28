# IAP Subscription Lifecycle

## Overview

Subscription lifecycle management is one of the most complex aspects of in-app purchases. Subscriptions have multiple states (active, grace period, billing retry, expired, cancelled, refunded), each with specific behaviors and timing. Understanding these states, handling transitions correctly, and providing a seamless user experience is critical for subscription revenue retention and compliance with App Store and Play Store policies.

## Subscription State Machine

### Unified State Model

```
                    ┌─────────────────────────────────┐
                    │          Active                  │
                    │  (user has access, will renew)   │
                    └──────┬──────────────────────────┘
                           │
              ┌────────────┼────────────┬──────────────┐
              │            │            │              │
              v            v            v              v
     ┌────────────┐ ┌───────────┐ ┌──────────┐ ┌───────────┐
     │  Grace     │ │Cancelled  │ │ Upgrade/ │ │ Paused    │
     │  Period    │ │(user vol) │ │Downgrade │ │(Android)  │
     └─────┬──────┘ └─────┬─────┘ └─────┬────┘ └─────┬─────┘
           │              │             │            │
           v              v             v            v
     ┌────────────┐ ┌───────────┐ ┌──────────┐ ┌───────────┐
     │ Billing    │ │Expired    │ │Pending   │ │Account    │
     │ Retry      │ │(no access)│ │Change    │ │Hold       │
     └─────┬──────┘ └───────────┘ └──────────┘ └─────┬─────┘
           │                                          │
           v                                          v
     ┌────────────┐                             ┌───────────┐
     │ Expired    │                             │Expired    │
     │ (final)    │                             │(final)    │
     └────────────┘                             └───────────┘
```

### State Definitions and Timelines

**Active**: User has paid and subscription is current. Content access is granted. Duration depends on subscription period.

**Grace Period** (iOS and Android):
- iOS: 16 days for monthly, 60 days for annual.
- Android: Configurable 3-30 days.
- User retains access during grace period.
- Billing retry attempts continue during this period.
- No notification to user needed, but UI should indicate if payment method issue.

**Billing Retry** (iOS and Android):
- Starts when payment fails and grace period begins.
- Apple retries for 30-60 days.
- Google retries for the duration of the grace period + account hold.
- Retry interval increases over time: every 1 hour initially, then every 24 hours.
- User can update payment method to resolve.

**Cancelled** (User-Initiated):
- Subscription will not renew at end of current period.
- User retains access until period end date.
- No refund issued unless within refund window.
- State in receipt: `auto_renew_status = false`.

**Expired**:
- No more billing retry attempts.
- User loses access to subscription content.
- Can still restore by resubscribing.
- Old receipts remain valid for historical verification.

**Refunded**:
- User received refund from App Store/Play Store.
- Access revoked immediately.
- Transaction marked with refund status.
- Should be handled via notification (App Store Server Notification, Play Developer Notification).

**Account Hold** (Android):
- After grace period expires without payment.
- Subscription enters account hold for up to 30 days.
- User can still regain access by updating payment method.
- After account hold ends, subscription is expired.

### Platform-Specific State Maps

**iOS State Transitions**:

```
Active ──(user cancels)──→ Will Expire (end of period)
Active ──(payment fails)──→ Grace Period (16-60 days)
Grace Period ──(payment succeeds)──→ Active
Grace Period ──(retry fails)──→ Expired
Grace Period ──(user updates payment)──→ Active
Will Expire ──(user resubscribes)──→ Active
Active ──(refund)──→ Refunded (immediate access loss)
Active ──(upgrade)──→ Active with new product (prorated)
Active ──(downgrade)──→ Active until end, then new product
```

**Android State Transitions**:

```
Active ──(user cancels)──→ Will Expire (end of period)
Active ──(payment fails)──→ Grace Period (3-30 days, configurable)
Grace Period ──(payment succeeds)──→ Active
Grace Period ──(retry fails)──→ Account Hold (up to 30 days)
Account Hold ──(payment succeeds)──→ Active
Account Hold ──(hold expires)──→ Expired
Active ──(refund)──→ Refunded (immediate)
Active ──(pause)──→ Paused (1 week to 3 months, configurable)
Paused ──(resume)──→ Active
```

## Receipt Status Interpretation

### iOS Status Fields

```swift
// Key fields in the receipt to determine subscription state

struct AppleSubscriptionStatus {
    // auto_renew_status: "1" = will renew, "0" = cancelled
    let willRenew: Bool

    // expiration_intent: why the subscription expired
    // "1" = user cancelled
    // "2" = billing error
    // "3" = user did not agree to price increase
    // "4" = product not available
    // "5" = unknown error
    let expirationIntent: String?

    // is_in_billing_retry_period: "1" = actively retrying payment
    let isInBillingRetry: Bool

    // is_in_grace_period: "1" = in grace period (has access)
    // Only present in server notifications, not in receipt
    let isInGracePeriod: Bool?

    // grace_period_expires_date: when grace period ends
    let gracePeriodExpires: Date?

    // cancellation_date: when refund was issued
    let cancellationDate: Date?
}
```

Status interpretation:

| willRenew | expirationIntent | isInBillingRetry | Status |
|-----------|-----------------|-----------------|--------|
| true | nil | false | Active — normal |
| true | nil | true | Active — payment retrying, in grace period |
| false | 1 | false | Cancelled — will expire at end of period |
| false | 2 | true | Grace period — billing retry active |
| false | 2 | false | Expired — billing retry exhausted |
| false | nil | false | Expired — subscription ended |
| has cancellationDate | any | any | Refunded |

### Android Status Fields

```kotlin
// Key fields from the Google Play Developer API

data class GoogleSubscriptionStatus(
    // autoRenewing: true = will renew, false = cancelled
    val autoRenewing: Boolean,

    // cancelReason: null or 0 = user cancelled, 1 = system cancelled
    val cancelReason: Int?,

    // userCancellationTimeMillis: when user cancelled
    val userCancellationTimeMillis: Long?,

    // paymentState: 1 = payment received, 5 = grace period, 6 = on hold
    val paymentState: Int?,

    // expiryTimeMillis: subscription expiration time
    val expiryTimeMillis: Long?,

    // priceCurrencyCode and priceAmountMicros: next renewal price
    val priceCurrencyCode: String?,
    val priceAmountMicros: String?
)
```

Status interpretation:

| autoRenewing | cancelReason | paymentState | Status |
|-------------|--------------|-------------|--------|
| true | null | 1 | Active — normal |
| true | null | 5 | Grace period |
| false | null | 1 | Active until end, then expire |
| false | 1 | null | Cancelled |
| false | any | 6 | Account hold |
| false | any | null, expired | Expired |

## Handling Subscription Events

### iOS App Store Server Notifications (V2)

```swift
enum AppStoreNotificationType: String {
    case subscribed = "SUBSCRIBED"
    case didChangeRenewalStatus = "DID_CHANGE_RENEWAL_STATUS"
    case didChangeRenewalPref = "DID_CHANGE_RENEWAL_PREF"
    case didRenew = "DID_RENEW"
    case expired = "EXPIRED"
    case refund = "REFUND"
    case revoke = "REVOKE"
    case gracePeriodExpired = "GRACE_PERIOD_EXPIRED"
    case priceIncrease = "PRICE_INCREASE"
    case test = "TEST"
}

class AppStoreNotificationHandler {
    func handleNotification(_ notification: AppStoreNotification) async {
        switch notification.notificationType {
        case .subscribed:
            // New subscription or reinstatement
            if let subtype = notification.subtype, subtype == "RESUBSCRIBE" {
                await handleResubscribe(notification)
            } else {
                await handleNewSubscription(notification)
            }

        case .didRenew:
            // Subscription renewed successfully
            await handleRenewal(notification)

        case .didChangeRenewalStatus:
            // Auto-renew was turned on or off
            if notification.subtype == "AUTO_RENEW_ENABLED" {
                await handleAutoRenewEnabled(notification)
            } else if notification.subtype == "AUTO_RENEW_DISABLED" {
                await handleAutoRenewDisabled(notification)
            }

        case .didChangeRenewalPref:
            // Upgrade or downgrade
            await handleRenewalPreferenceChange(notification)

        case .expired:
            // Subscription expired
            switch notification.subtype {
            case "VOLUNTARY":
                // User cancelled
                await handleVoluntaryExpiration(notification)
            case "BILLING_RETRY":
                // Billing issue, still retrying
                await handleBillingRetryExpiration(notification)
            case "PRICE_INCREASE":
                // User didn't accept price increase
                await handlePriceIncreaseExpiration(notification)
            default:
                await handleExpiration(notification)
            }

        case .refund:
            // User received refund
            await handleRefund(notification)

        case .revoke:
            // Family sharing revoke
            await handleRevoke(notification)

        case .gracePeriodExpired:
            // Grace period ended without payment
            await handleGracePeriodExpired(notification)

        case .priceIncrease:
            // Price increase notification sent
            if notification.subtype == "PENDING" {
                await handlePriceIncreasePending(notification)
            } else if notification.subtype == "ACCEPTED" {
                await handlePriceIncreaseAccepted(notification)
            }

        case .test:
            // Apple sends this when setting up notifications
            logger.info("Received test notification from App Store")
        }
    }
}
```

### Android Real-Time Developer Notifications

```kotlin
// Google Play sends notifications to Pub/Sub topic
class PlayStoreNotificationHandler {
    fun handleNotification(notification: PlayNotification) {
        when (notification.notificationType) {
            NotificationType.SUBSCRIPTION_RECOVERED -> {
                // Grace period payment succeeded
                handleRecovered(notification)
            }
            NotificationType.SUBSCRIPTION_RENEWED -> {
                // Subscription auto-renewed
                handleRenewed(notification)
            }
            NotificationType.SUBSCRIPTION_CANCELED -> {
                // Subscription cancelled by user or system
                handleCanceled(notification)
            }
            NotificationType.SUBSCRIPTION_PURCHASED -> {
                // New subscription purchase
                handlePurchased(notification)
            }
            NotificationType.SUBSCRIPTION_ON_HOLD -> {
                // Subscription entered account hold
                handleOnHold(notification)
            }
            NotificationType.SUBSCRIPTION_IN_GRACE_PERIOD -> {
                // Subscription entered grace period
                handleGracePeriod(notification)
            }
            NotificationType.SUBSCRIPTION_RESTARTED -> {
                // Account hold resolved, subscription restarted
                handleRestarted(notification)
            }
            NotificationType.SUBSCRIPTION_PRICE_CHANGE_CONFIRMED -> {
                // User accepted price change
                handlePriceChangeConfirmed(notification)
            }
            NotificationType.SUBSCRIPTION_DEFERRED -> {
                // Purchase was deferred (pending)
                handleDeferred(notification)
            }
            NotificationType.SUBSCRIPTION_PAUSED -> {
                // Subscription paused by user
                handlePaused(notification)
            }
            NotificationType.SUBSCRIPTION_PAUSE_SCHEDULE_CHANGED -> {
                // Pause schedule was changed
                handlePauseScheduleChanged(notification)
            }
            NotificationType.SUBSCRIPTION_REVOKED -> {
                // Purchase was revoked (refunded)
                handleRevoked(notification)
            }
            NotificationType.SUBSCRIPTION_EXPIRED -> {
                // Subscription expired
                handleExpired(notification)
            }
        }
    }
}
```

## Grace Period and Billing Retry Logic

### Server-Side Grace Period Handler

```typescript
class GracePeriodManager {
  async handleGracePeriodStart(transaction: TransactionInfo): Promise<void> {
    const gracePeriodEnd = this.calculateGracePeriodEnd(transaction);

    await this.db.transaction(async (tx) => {
      // Update entitlement to mark grace period
      await tx.entitlements.updateActiveByProductId(
        transaction.productId,
        transaction.userId,
        {
          inGracePeriod: true,
          gracePeriodEnd,
          // Keep isActive = true — user still has access
        }
      );

      // Log the event
      await tx.transactions.create({
        userId: transaction.userId,
        productId: transaction.productId,
        transactionId: transaction.transactionId,
        action: 'grace_period_start',
        status: 'success',
        occurredAt: new Date(),
        metadata: {
          gracePeriodEnd: gracePeriodEnd.toISOString(),
          platform: transaction.platform
        }
      });
    });

    // Notify user about payment issue
    await this.notificationService.sendPaymentIssueNotification(
      transaction.userId,
      transaction.productId,
      {
        gracePeriodEnd,
        platform: transaction.platform
      }
    );

    // Schedule a check for grace period expiration
    await this.scheduler.schedule({
      type: 'grace_period_expiry_check',
      runAt: gracePeriodEnd,
      data: { userId: transaction.userId, productId: transaction.productId }
    });
  }

  async handleBillingRetrySuccess(transaction: TransactionInfo): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.entitlements.updateActiveByProductId(
        transaction.productId,
        transaction.userId,
        {
          inGracePeriod: false,
          gracePeriodEnd: null,
          isActive: true,
          autoRenewStatus: true,
          expirationDate: transaction.expiresDate || transaction.purchaseDate
        }
      );

      await tx.transactions.create({
        userId: transaction.userId,
        productId: transaction.productId,
        transactionId: transaction.transactionId,
        action: 'billing_retry_success',
        status: 'success',
        occurredAt: new Date()
      });
    });

    await this.notificationService.sendPaymentRestoredNotification(
      transaction.userId,
      transaction.productId
    );
  }

  async handleGracePeriodExpiry(userId: string, productId: string): Promise<void> {
    // Re-verify current status from store before marking expired
    const currentStatus = await this.verifyCurrentStatus(userId, productId);

    if (currentStatus.isInGracePeriod) {
      // Still in grace period — reschedule check
      await this.scheduler.schedule({
        type: 'grace_period_expiry_check',
        runAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // Check again in 24 hours
        data: { userId, productId }
      });
      return;
    }

    await this.db.transaction(async (tx) => {
      await tx.entitlements.deactivateByUserAndProduct(userId, productId);

      await tx.transactions.create({
        userId,
        productId,
        action: 'grace_period_expired',
        status: 'success',
        occurredAt: new Date()
      });
    });

    await this.notificationService.sendSubscriptionExpiredNotification(
      userId, productId
    );
  }

  private calculateGracePeriodEnd(transaction: TransactionInfo): Date {
    const now = new Date();
    switch (transaction.platform) {
      case 'ios':
        // Apple: 16 days monthly, 60 days annual
        if (transaction.subscriptionPeriod === 'P1Y') {
          return new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
        }
        return new Date(now.getTime() + 16 * 24 * 60 * 60 * 1000);

      case 'android':
        // Google: configurable up to 30 days from Play Console
        const googleGraceDays = transaction.gracePeriodDays || 7;
        return new Date(now.getTime() + googleGraceDays * 24 * 60 * 60 * 1000);

      default:
        return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // Default 7 days
    }
  }
}
```

## Subscription Upgrade and Downgrade

### iOS Subscription Group Handling

iOS uses subscription groups to manage upgrade/downgrade across products. All subscription products in a group are considered alternatives.

```swift
// iOS subscription group behavior

enum SubscriptionChangeType {
    case upgrade      // Higher-priced tier, immediate
    case downgrade    // Lower-priced tier, at next renewal
    case crossgrade   // Same price, at next renewal
}

// Subscription groups in App Store Connect:
// Group: "Premium Tiers"
//   - monthly_basic ($4.99)  - level 1
//   - monthly_pro ($9.99)     - level 2
//   - monthly_enterprise ($19.99) - level 3

// Rules:
// - upgrade (level 1 → level 2): immediate switch, prorated refund
// - downgrade (level 3 → level 2): at next renewal date
// - crossgrade (same price level): at next renewal date

class iOSSubscriptionChangeHandler {
    func handleChange(from oldProduct: String, to newProduct: String) async {
        let changeType = determineChangeType(from: oldProduct, to: newProduct)

        switch changeType {
        case .upgrade:
            // Immediate: user gets access to new product now
            // Server receives DID_CHANGE_RENEWAL_PREF notification
            // Old subscription gets prorated refund
            await grantImmediateAccess(to: newProduct)
            await revokeOldAccess(from: oldProduct)

        case .downgrade:
            // At next renewal: user keeps current access until period ends
            // Server receives DID_CHANGE_RENEWAL_PREF notification
            // No immediate change to entitlement
            await scheduleDowngrade(from: oldProduct, to: newProduct, at: nextRenewalDate)

        case .crossgrade:
            // At next renewal: no immediate change
            await scheduleCrossgrade(from: oldProduct, to: newProduct, at: nextRenewalDate)
        }
    }
}
```

### Android Upgrade/Downgrade with Proration

```kotlin
// Google Play subscription upgrade/downgrade with proration modes

enum class ProrationMode(val value: Int) {
    // Immediately upgrade, charge remainder, credit unused portion
    IMMEDIATE_WITH_TIME_PRORATION(1),

    // Immediately upgrade, charge full price, no credit
    IMMEDIATE_AND_CHARGE_FULL_PRICE(2),

    // Deferred: take effect at next renewal
    DEFERRED(4),

    // Immediately upgrade, credit full remaining value
    IMMEDIATE_WITH_PRORATION(3),

    // Immediately upgrade, no charge, no credit (free upgrade)
    IMMEDIATE_WITHOUT_PRORATION(5)
}

class AndroidUpgradeHandler(private val billingClient: BillingClient) {

    fun initiateUpgrade(
        activity: Activity,
        oldProductId: String,
        newProductId: String,
        purchaseToken: String,
        prorationMode: ProrationMode = ProrationMode.IMMEDIATE_WITH_TIME_PRORATION
    ) {
        val params = BillingFlowParams.newBuilder()
            .setSubscriptionUpdateParams(
                BillingFlowParams.SubscriptionUpdateParams.newBuilder()
                    .setOldPurchaseToken(purchaseToken)
                    .setSubscriptionReplacementMode(
                        when (prorationMode) {
                            ProrationMode.DEFERRED ->
                                BillingFlowParams.SubscriptionUpdateParams.ReplacementMode.DEFERRED
                            else ->
                                BillingFlowParams.SubscriptionUpdateParams.ReplacementMode.WITH_TIME_PRORATION
                        }
                    )
                    .build()
            )
            .setProductDetailsParamsList(
                listOf(
                    ProductDetailsParams.newBuilder()
                        .setProductDetails(productDetails)
                        .build()
                )
            )
            .build()

        billingClient.launchBillingFlow(activity, params)
    }
}
```

## Promotional Offers

### iOS Promotional Offers

```swift
// iOS promotional offers for subscription retention

enum PromotionalOfferType {
    case freeTrial        // Introductory offer
    case payAsYouGo       // Discounted price for period
    case payUpFront       // Discounted price for duration
}

class iOSPromotionalOfferHandler {
    func generateOfferSignature(
        productId: String,
        offerId: String,
        applicationUsername: String
    ) async throws -> String {
        // 1. Get the key from App Store Connect
        let keyId = config.appStoreKeyId
        let privateKey = config.appStorePrivateKey
        let bundleId = config.bundleId

        // 2. Create payload
        let payload: [String: Any] = [
            "appBundleID": bundleId,
            "keyIdentifier": keyId,
            "productIdentifier": productId,
            "offerIdentifier": offerId,
            "applicationUsername": applicationUsername,
            "nonce": UUID().uuidString,
            "timestamp": Date().timeIntervalSince1970
        ]

        // 3. Sign with your private key (EC P-256)
        let signature = try signPayload(payload, with: privateKey)

        return signature
    }
}

// Apply promotional offer at purchase
func purchaseWithOffer(productId: String, offerId: String) async throws {
    let signature = try await promoOfferHandler.generateOfferSignature(
        productId: productId,
        offerId: offerId,
        applicationUsername: userID
    )

    let product = try await Product.products(for: [productId]).first!
    let result = try await product.purchase(
        options: [
            .promotionalOffer(
                offerID: offerId,
                keyID: config.appStoreKeyId,
                nonce: UUID(),
                signature: signature,
                timestamp: Date()
            )
        ]
    )
    // Handle result...
}
```

### Android Promotional Offers

```kotlin
// Android promotional offers and base plan offers

class AndroidOfferHandler(private val billingClient: BillingClient) {

    fun fetchEligibleOffers(
        productId: String,
        purchaseToken: String
    ) {
        val params = GetBillingConfigParams.newBuilder().build()
        billingClient.getBillingConfigAsync(params) { configResult, config ->

            val offerParams = QueryOffermentsParams.newBuilder()
                .setProductId(productId)
                .setObfuscatedAccountId(userId)
                .build()

            billingClient.queryOffermentsAsync(offerParams) { result, offers ->
                // Filter eligible offers for this user
                val eligible = offers.filter { offer ->
                    isUserEligible(offer) && !hasRedeemedOffer(offer)
                }

                // Display eligible offers in UI
                showEligibleOffers(eligible)
            }
        }
    }

    fun applyOffer(
        activity: Activity,
        productDetails: ProductDetails,
        offerToken: String
    ) {
        val params = BillingFlowParams.newBuilder()
            .setProductDetailsParamsList(
                listOf(
                    ProductDetailsParams.newBuilder()
                        .setProductDetails(productDetails)
                        .setOfferToken(offerToken)
                        .build()
                )
            )
            .build()

        billingClient.launchBillingFlow(activity, params)
    }
}
```

## Refund and Revocation Handling

### iOS Refund Handling

```swift
// iOS refunds are communicated via App Store Server Notifications

class iOSRefundHandler {
    func handleRefund(notification: AppStoreNotification) async {
        let transactionId = notification.data.signedTransactionInfo.transactionId
        let productId = notification.data.signedTransactionInfo.productId
        let userId = lookupUserByTransactionId(transactionId)

        // 1. Immediately revoke access
        await revokeEntitlement(userId: userId, productId: productId)

        // 2. Log the refund
        await logRefundEvent(
            userId: userId,
            productId: productId,
            transactionId: transactionId,
            refundDate: Date(),
            refundReason: notification.subtype // "VOLUNTARY" or others
        )

        // 3. Handle consumable refunds (deduct in-game currency)
        if productType == .consumable {
            await deductConsumableBalance(userId: userId, productId: productId)
        }

        // 4. Track for fraud
        await fraudDetectionService.recordRefund(
            userId: userId,
            productId: productId,
            refundType: notification.subtype
        )
    }

    // iOS 16+ supports in-app refund request (StoreKit 2)
    func requestRefund(transactionId: UInt64, scene: UIWindowScene) async throws {
        let result = try await Transaction.beginRefundRequest(
            for: transactionId,
            in: scene
        )
        // result: .success, .userCancelled, or .error
    }
}
```

### Android Refund Handling

```kotlin
// Android refunds — handled via Real-time Developer Notifications

class AndroidRefundHandler {
    fun handleRevokedSubscription(notification: PlayNotification) {
        val subscriptionId = notification.subscriptionNotification.subscriptionId
        val purchaseToken = notification.subscriptionNotification.purchaseToken

        // Google Play sends SUBSCRIPTION_REVOKED when:
        // 1. User requested refund through Google Play
        // 2. Google Play granted refund on behalf of developer
        // 3. Chargeback was received

        val userId = lookupUserByPurchaseToken(purchaseToken)

        // Immediately revoke access
        revokeEntitlement(userId, subscriptionId)

        // Log for audit
        auditLogger.logEvent(
            Event.REFUND,
            mapOf(
                "userId" to userId,
                "productId" to subscriptionId,
                "purchaseToken" to purchaseToken,
                "notificationType" to notification.notificationType
            )
        )

        // If consumable or in-game currency, deduct
        if (isConsumable(subscriptionId)) {
            deductBalance(userId, subscriptionId)
        }

        // Track refund rate for fraud detection
        fraudTracker.recordRefund(userId, subscriptionId)
    }
}
```

## Subscription Status Checking

### Server-Side Status Verification

```typescript
class SubscriptionStatusChecker {
  async verifyAndSyncAll(): Promise<SyncResult> {
    const activeEntitlements = await this.db.entitlements.findActiveSubscriptions();
    const results = { checked: 0, updated: 0, expired: 0, errors: 0 };

    const batchSize = 100;
    for (let i = 0; i < activeEntitlements.length; i += batchSize) {
      const batch = activeEntitlements.slice(i, i + batchSize);
      const batchResults = await Promise.allSettled(
        batch.map(ent => this.verifyAndUpdate(ent))
      );

      batchResults.forEach(result => {
        results.checked++;
        if (result.status === 'fulfilled') {
          if (result.value === 'updated') results.updated++;
          if (result.value === 'expired') results.expired++;
        } else {
          results.errors++;
          logger.error('Status check failed', { error: result.reason });
        }
      });
    }

    await this.db.auditLog.create({
      action: 'subscription_status_sync',
      metadata: results
    });

    return results;
  }

  private async verifyAndUpdate(entitlement: Entitlement): Promise<'unchanged' | 'updated' | 'expired'> {
    let currentStatus;

    try {
      if (entitlement.platform === 'ios') {
        // Refresh from Apple
        currentStatus = await this.verifyAppleStatus(entitlement);
      } else {
        // Refresh from Google
        currentStatus = await this.verifyGoogleStatus(entitlement);
      }
    } catch (error) {
      if (error.code === 404) {
        // Purchase token no longer valid — mark as expired
        await this.db.entitlements.deactivate(entitlement.id);
        return 'expired';
      }
      throw error;
    }

    const hasChanged =
      currentStatus.isActive !== entitlement.isActive ||
      currentStatus.autoRenewStatus !== entitlement.autoRenewStatus ||
      (currentStatus.expirationDate?.getTime() !== entitlement.expirationDate?.getTime()) ||
      currentStatus.inGracePeriod !== entitlement.inGracePeriod;

    if (hasChanged) {
      await this.db.entitlements.update(entitlement.id, {
        isActive: currentStatus.isActive,
        autoRenewStatus: currentStatus.autoRenewStatus,
        expirationDate: currentStatus.expirationDate,
        inGracePeriod: currentStatus.inGracePeriod,
        updatedAt: new Date()
      });

      return currentStatus.isActive ? 'updated' : 'expired';
    }

    return 'unchanged';
  }
}
```

## Win-Back and Re-Engagement

### Expired Subscription User Flow

```typescript
class WinBackStrategy {
  async getWinBackActions(userId: string, productId: string): Promise<WinBackAction[]> {
    const history = await this.db.transactions.findByUserAndProduct(userId, productId);
    const daysSinceExpiry = this.getDaysSinceExpiry(history);
    const totalSubscriptions = this.countTotalSubscriptions(history);

    const actions: WinBackAction[] = [];

    // Immediate after expiry (1-7 days)
    if (daysSinceExpiry <= 7) {
      actions.push({
        type: 'notification',
        message: 'Your subscription has ended. Renew now to keep your premium features.',
        channel: 'push',
        priority: 'high'
      });
      actions.push({
        type: 'offer',
        offer: 'renew_at_old_price',
        description: 'Lock in your original price by renewing within 7 days.'
      });
    }

    // Short-term expired (8-30 days)
    if (daysSinceExpiry > 7 && daysSinceExpiry <= 30) {
      actions.push({
        type: 'offer',
        offer: 'discount_renewal',
        description: 'Get 1 month free when you resubscribe now.',
        discount: '100%_first_month'
      });
      actions.push({
        type: 'email',
        subject: 'We miss you! Resubscribe with a special offer.',
        template: 'winback_day14'
      });
    }

    // Long-term expired (30+ days)
    if (daysSinceExpiry > 30) {
      actions.push({
        type: 'offer',
        offer: 'new_user_pricing',
        description: 'Resubscribe as a new member with current introductory pricing.'
      });
    }

    // Multi-time subscriber
    if (totalSubscriptions >= 2) {
      actions.push({
        type: 'loyalty_offer',
        offer: 'loyalty_discount',
        description: 'As a valued former subscriber, enjoy 50% off your first 3 months.'
      });
    }

    return actions;
  }
}
```

## Subscription Pricing and Currency

### Handling Price Changes

```typescript
class PriceChangeHandler {
  async handleiOSPriceIncrease(notification: AppStoreNotification) {
    // Apple sends PRICE_INCREASE notification
    // Subtype: PENDING (user hasn't responded yet)
    // Subtype: ACCEPTED (user accepted)
    // If user doesn't respond within timeframe, subscription expires

    const transactionId = notification.data.signedTransactionInfo.transactionId;
    const userId = lookupUser(transactionId);

    if notification.subtype == "PENDING" {
      // Notify user about price increase
      await this.notificationService.sendPriceIncreaseNotification(userId, {
        oldPrice: notification.data.signedTransactionInfo.price,
        newPrice: notification.data.signedTransactionInfo.renewalPrice,
        effectiveDate: notification.data.signedTransactionInfo.renewalDate,
        acceptByDate: notification.data.signedTransactionInfo.offerPeriodEnd
      });
    }

    if notification.subtype == "ACCEPTED" {
      // User accepted — no action needed, will renew at new price
      await this.logPriceIncreaseAccepted(userId, transactionId);
    }
  }

  async handleAndroidPriceChange(productId: string) {
    // Google Play: price changes are defined in Play Console
    // User receives in-app notification from Play Store
    // SUBSCRIPTION_PRICE_CHANGE_CONFIRMED notification when accepted

    // Key considerations:
    // 1. Notify users at least 7 days before price increase
    // 2. Provide clear communication about new pricing
    // 3. Offer grandfathered pricing for loyal subscribers
    // 4. Track acceptance rates
  }
}
```

## Testing Subscription Lifecycle

### Sandbox Testing Scenarios

| Scenario | iOS Test | Android Test |
|----------|----------|-------------|
| New purchase | Sandbox user login | License tester account |
| Auto-renewal | Test 5 times speed | Test 5 times speed |
| Grace period | Use specific test product | Configure in Play Console |
| Billing retry | Cancel and re-enable | Test with account hold |
| Upgrade | Two products in group | Two base plans |
| Downgrade | Higher to lower tier | Higher to lower plan |
| Cancellation | Cancel from Settings | Cancel from Play Store |
| Refund | Request via sandbox | Request via test |
| Expiration | Wait for period end | Wait for period end |
| Promo offer | Generate signature | Use test offer token |
| Price increase | Initiate from API | Configure in Play Console |
| Family sharing | Test with sandbox family | N/A |

### Automated Testing Checklist

- [ ] Purchase product successfully returns receipt
- [ ] Server validates receipt and grants entitlement
- [ ] Subscription status shows active with correct expiration
- [ ] After expiration, status changes to expired
- [ ] Restore purchases returns all active entitlements
- [ ] Upgrade changes product ID in entitlement
- [ ] Downgrade shows future product change
- [ ] Grace period maintains access
- [ ] After grace period, access is revoked
- [ ] Refund immediately revokes access
- [ ] Multiple purchases for same user work correctly
- [ ] Cross-platform (iOS to Android) entitlement sync
- [ ] Receipt validation failure returns proper error
- [ ] Network failure during verification is handled
- [ ] Concurrent verification requests don't duplicate entitlements

## Subscription Analytics

### Key Metrics to Track

| Metric | Definition | Target |
|--------|------------|--------|
| Trial conversion rate | % of trials that convert to paid | >30% |
| Retention rate (D30) | % still subscribed after 30 days | >80% |
| Retention rate (D90) | % still subscribed after 90 days | >60% |
| Churn rate | Monthly cancellation rate | <10% |
| Reactivation rate | % of expired users who resubscribe | >5% |
| Grace period recovery | % of grace period users who recover | >40% |
| Upgrade rate | % of users who upgrade to higher tier | >10% |
| Refund rate | % of purchases refunded | <3% |
| Mean time to churn | Average subscription duration | >120 days |
| Revenue per user (ARPU) | Average monthly revenue per user | Varies |

### Analytics Queries

```sql
-- Trial conversion rate
SELECT
    DATE_TRUNC('month', trial_start) AS month,
    COUNT(*) AS trials,
    COUNT(CASE WHEN converted THEN 1 END) AS conversions,
    COUNT(CASE WHEN converted THEN 1 END)::FLOAT / COUNT(*)::FLOAT AS conversion_rate
FROM subscription_trials
GROUP BY month
ORDER BY month;

-- Monthly churn rate
WITH monthly_active AS (
    SELECT
        DATE_TRUNC('month', expiration_date) AS month,
        COUNT(DISTINCT user_id) AS churned
    FROM entitlements
    WHERE is_active = FALSE
        AND expiration_date >= '2025-01-01'
    GROUP BY month
),
monthly_base AS (
    SELECT
        DATE_TRUNC('month', purchase_date) AS month,
        COUNT(DISTINCT user_id) AS active_at_start
    FROM entitlements
    WHERE is_active = TRUE
        AND purchase_date >= '2025-01-01'
    GROUP BY month
)
SELECT
    b.month,
    b.active_at_start,
    COALESCE(c.churned, 0) AS churned,
    COALESCE(c.churned, 0)::FLOAT / b.active_at_start::FLOAT AS churn_rate
FROM monthly_base b
LEFT JOIN monthly_active c ON b.month = c.month
ORDER BY b.month;

-- Grace period recovery rate
SELECT
    DATE_TRUNC('month', grace_start) AS month,
    COUNT(*) AS grace_period_entries,
    COUNT(CASE WHEN recovered THEN 1 END) AS recovered,
    COUNT(CASE WHEN recovered THEN 1 END)::FLOAT / COUNT(*)::FLOAT AS recovery_rate
FROM grace_period_events
GROUP BY month
ORDER BY month;
```
