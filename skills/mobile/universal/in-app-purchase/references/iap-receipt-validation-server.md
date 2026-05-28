# IAP Receipt Validation Server

## Overview

A receipt validation server is the backend service that verifies in-app purchase receipts from Apple App Store and Google Play Store. It ensures purchases are authentic, prevents fraud, and maintains the canonical source of truth for user entitlements. This reference covers server architecture, validation endpoints, security considerations, error handling, and production deployment.

## Server Architecture

### Architecture Overview

```
Mobile App → Server API (receipt validation) → App Store / Play Store Verification API
                  ↓
            Database (entitlements)
                  ↓
            Cache (entitlements)
                  ↓
            Response to Mobile App
```

### Technology Choices

| Component | Options | Recommendation |
|-----------|---------|---------------|
| Runtime | Node.js, Go, Python, Java, Rust | Node.js or Go for high throughput |
| Framework | Express, Fastify, Koa, Gin | Fastify (Node) or Gin (Go) |
| Database | PostgreSQL, MySQL, DynamoDB | PostgreSQL for transactional integrity |
| Cache | Redis, Memcached | Redis for subscription status |
| Message Queue | RabbitMQ, Kafka, SQS | RabbitMQ for async processing |
| Monitoring | Prometheus, Datadog, New Relic | Prometheus + Grafana |

### Core Server Structure

```
receipt-validation-server/
├── src/
│   ├── app.ts                    # Server setup, middleware
│   ├── config.ts                 # Environment configuration
│   ├── routes/
│   │   ├── verify.ts             # POST /verify (iOS and Android)
│   │   ├── status.ts             # GET /status/:userId
│   │   ├── webhooks/
│   │   │   ├── appstore.ts       # App Store Server Notifications
│   │   │   └── playstore.ts      # Play Developer Notifications
│   │   └── admin/
│   │       ├── grant.ts          # Manual entitlement grant
│   │       └── revoke.ts         # Manual entitlement revoke
│   ├── services/
│   │   ├── apple-validator.ts    # Apple VerifyReceipt client
│   │   ├── google-validator.ts   # Google Play Developer API client
│   │   ├── receipt-parser.ts     # Receipt data parsing
│   │   └── entitlement-manager.ts # Entitlement state management
│   ├── models/
│   │   ├── receipt.ts            # Receipt schema
│   │   ├── entitlement.ts        # Entitlement schema
│   │   └── transaction.ts        # Transaction log schema
│   ├── middleware/
│   │   ├── auth.ts               # API key / JWT authentication
│   │   ├── rate-limit.ts         # Rate limiting
│   │   └── audit.ts              # Request/response logging
│   └── utils/
│       ├── crypto.ts             # Signature verification
│       ├── errors.ts             # Error classes
│       └── retry.ts              # Retry with backoff
├── migrations/
│   ├── 001_create_entitlements.sql
│   └── 002_create_transactions.sql
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
│       ├── apple-receipts.json
│       └── google-purchases.json
└── deploy/
    ├── Dockerfile
    ├── docker-compose.yml
    └── k8s.yaml
```

## Database Schema

### PostgreSQL Schema

```sql
-- Entitlements table: current user entitlements
CREATE TABLE entitlements (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    product_id VARCHAR(100) NOT NULL,
    product_type VARCHAR(20) NOT NULL CHECK (product_type IN ('consumable', 'non_consumable', 'subscription')),
    platform VARCHAR(10) NOT NULL CHECK (platform IN ('ios', 'android')),
    purchase_token VARCHAR(512) NOT NULL,
    transaction_id VARCHAR(200) NOT NULL UNIQUE,
    original_transaction_id VARCHAR(200),
    purchase_date TIMESTAMPTZ NOT NULL,
    expiration_date TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    auto_renew_status BOOLEAN DEFAULT FALSE,
    cancellation_date TIMESTAMPTZ,
    cancellation_reason VARCHAR(50),
    grace_period_end TIMESTAMPTZ,
    in_grace_period BOOLEAN DEFAULT FALSE,
    in_account_hold BOOLEAN DEFAULT FALSE,
    ownership_type VARCHAR(20) DEFAULT 'PURCHASED',
    environment VARCHAR(10) NOT NULL CHECK (environment IN ('sandbox', 'production')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (user_id, product_id, platform),
    CONSTRAINT valid_dates CHECK (expiration_date IS NULL OR purchase_date < expiration_date)
);

CREATE INDEX idx_entitlements_user ON entitlements(user_id);
CREATE INDEX idx_entitlements_active ON entitlements(user_id, is_active);
CREATE INDEX idx_entitlements_expiring ON entitlements(expiration_date)
    WHERE is_active = TRUE;

-- Transaction log: immutable record of all transactions
CREATE TABLE transactions (
    id BIGSERIAL PRIMARY KEY,
    user_id VARCHAR(100) NOT NULL,
    product_id VARCHAR(100) NOT NULL,
    platform VARCHAR(10) NOT NULL,
    transaction_id VARCHAR(200) NOT NULL,
    original_transaction_id VARCHAR(200),
    purchase_token VARCHAR(512) NOT NULL,
    receipt_data TEXT,
    action VARCHAR(50) NOT NULL, -- purchase, renew, cancel, refund, upgrade, downgrade
    amount DECIMAL(10, 2),
    currency VARCHAR(3),
    status VARCHAR(20) NOT NULL, -- success, failure, pending
    error_message TEXT,
    metadata JSONB,
    occurred_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE (transaction_id, action)
);

CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_transactions_product ON transactions(product_id, occurred_at);
CREATE INDEX idx_transactions_platform ON transactions(platform, occurred_at);

-- App Store Server Notification log
CREATE TABLE appstore_notifications (
    id BIGSERIAL PRIMARY KEY,
    notification_type VARCHAR(50) NOT NULL,
    subtype VARCHAR(50),
    transaction_id VARCHAR(200),
    original_transaction_id VARCHAR(200),
    data JSONB NOT NULL,
    signed_payload TEXT NOT NULL,
    received_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_notifications_transaction ON appstore_notifications(transaction_id);
```

## Apple Receipt Validation

### VerifyReceipt API Client

```typescript
import crypto from 'crypto';

interface AppleVerifyReceiptRequest {
  'receipt-data': string;
  password: string;
  'exclude-old-transactions'?: boolean;
}

interface AppleVerifyReceiptResponse {
  status: number;
  environment: 'Sandbox' | 'Production';
  receipt: AppleReceipt;
  latest_receipt_info?: AppleReceiptInfo[];
  pending_renewal_info?: ApplePendingRenewalInfo[];
  is_retryable?: boolean;
}

class AppleReceiptValidator {
  private readonly productionUrl = 'https://buy.itunes.apple.com/verifyReceipt';
  private readonly sandboxUrl = 'https://sandbox.itunes.apple.com/verifyReceipt';
  private readonly sharedSecret: string;
  private readonly excludeOldTransactions: boolean;

  constructor(config: { sharedSecret: string; excludeOldTransactions?: boolean }) {
    this.sharedSecret = config.sharedSecret;
    this.excludeOldTransactions = config.excludeOldTransactions ?? true;
  }

  async validate(receiptData: string): Promise<AppleVerifyReceiptResponse> {
    // Try production first, fall back to sandbox (for TestFlight)
    const result = await this.callAppleAPI(this.productionUrl, receiptData);

    if (result.status === 21007) {
      // Production URL returned sandbox receipt — retry with sandbox URL
      return this.callAppleAPI(this.sandboxUrl, receiptData);
    }

    if (result.status === 21008) {
      // Sandbox receipt sent to production — retry with sandbox
      return this.callAppleAPI(this.sandboxUrl, receiptData);
    }

    return result;
  }

  private async callAppleAPI(
    url: string,
    receiptData: string
  ): Promise<AppleVerifyReceiptResponse> {
    const body: AppleVerifyReceiptRequest = {
      'receipt-data': receiptData,
      password: this.sharedSecret,
      'exclude-old-transactions': this.excludeOldTransactions
    };

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!response.ok) {
      throw new Error(`Apple API returned ${response.status}: ${response.statusText}`);
    }

    return response.json();
  }
}
```

### Apple Status Code Handling

```typescript
class AppleStatusHandler {
  static handleStatus(status: number, context: string): void {
    switch (status) {
      case 0:
        return; // Success

      case 21000:
        throw new ValidationError('App Store receipt is malformed or missing required properties');

      case 21002:
        throw new ValidationError('Receipt data is malformed or the shared secret is incorrect');

      case 21003:
        throw new AuthenticationError('Receipt could not be authenticated');

      case 21004:
        throw new AuthenticationError('Shared secret does not match the specified app');

      case 21005:
        throw new ServiceError('Apple receipt server is temporarily unavailable. Retry later.');

      case 21006:
        // Receipt is valid but subscription has expired. Still parse for latest info.
        logger.warn('Receipt is expired but valid', { context });
        return;

      case 21007:
        // Sandbox receipt sent to production. Should be handled by fallback logic.
        throw new RetryableError('Sandbox receipt sent to production endpoint');

      case 21008:
        // Production receipt sent to sandbox. Should be handled by fallback logic.
        throw new RetryableError('Production receipt sent to sandbox endpoint');

      case 21009:
        throw new ServiceError('Internal data access error on Apple side. Retry later.');

      case 21010:
        throw new ValidationError('Receipt is for an unknown or deleted app');

      default:
        if (status >= 21100 && status <= 21199) {
          throw new ServiceError(`Apple account error: ${status}. Retry later.`);
        }
        throw new ServiceError(`Unknown Apple status code: ${status}`);
    }
  }
}
```

### Apple Receipt Parsing

```typescript
interface ParsedAppleReceipt {
  transactionId: string;
  originalTransactionId: string;
  productId: string;
  purchaseDate: Date;
  expiresDate: Date | null;
  isTrialPeriod: boolean;
  isIntroOfferPeriod: boolean;
  cancellationDate: Date | null;
  cancellationReason: string | null;
  autoRenewStatus: boolean;
  autoRenewProductId: string | null;
  inIntroOfferPeriod: boolean;
  inGracePeriod: boolean;
  environment: 'Sandbox' | 'Production';
}

class AppleReceiptParser {
  parseLatestReceiptInfo(
    receiptInfo: AppleReceiptInfo[]
  ): ParsedAppleReceipt[] {
    return receiptInfo.map(info => ({
      transactionId: info.transaction_id,
      originalTransactionId: info.original_transaction_id,
      productId: info.product_id,
      purchaseDate: new Date(parseInt(info.purchase_date_ms)),
      expiresDate: info.expires_date_ms
        ? new Date(parseInt(info.expires_date_ms))
        : null,
      isTrialPeriod: info.is_trial_period === 'true',
      isIntroOfferPeriod: info.is_in_intro_offer_period === 'true',
      cancellationDate: info.cancellation_date_ms
        ? new Date(parseInt(info.cancellation_date_ms))
        : null,
      cancellationReason: info.cancellation_reason || null,
      autoRenewStatus: info.auto_renew_status === '1',
      autoRenewProductId: info.auto_renew_product_id || null,
      inIntroOfferPeriod: info.is_in_intro_offer_period === 'true',
      inGracePeriod: info.grace_period_expires_date_ms
        ? new Date(parseInt(info.grace_period_expires_date_ms)) > new Date()
        : false,
      environment: info.environment || 'Production'
    }));
  }

  extractPendingRenewalInfo(
    pendingInfo: ApplePendingRenewalInfo[]
  ): Array<{
    productId: string;
    autoRenewStatus: boolean;
    autoRenewProductId: string | null;
    expirationIntent: string | null;
    retryUntil: Date | null;
    isInBillingRetry: boolean;
    gracePeriodExpiresDate: Date | null;
  }> {
    return pendingInfo.map(info => ({
      productId: info.auto_renew_product_id,
      autoRenewStatus: info.auto_renew_status === '1',
      autoRenewProductId: info.auto_renew_product_id,
      expirationIntent: info.expiration_intent || null,
      retryUntil: info.retry_until_date_ms
        ? new Date(parseInt(info.retry_until_date_ms))
        : null,
      isInBillingRetry: info.is_in_billing_retry_period === '1',
      gracePeriodExpiresDate: info.grace_period_expires_date_ms
        ? new Date(parseInt(info.grace_period_expires_date_ms))
        : null
    }));
  }
}
```

## Google Play Validation

### Google Play Developer API Client

```typescript
import { google } from 'googleapis';

class GooglePlayValidator {
  private androidPublisher: ReturnType<typeof google.androidpublisher>;

  constructor(serviceAccountKey: string) {
    const auth = new google.auth.JWT({
      email: serviceAccountKey.client_email,
      key: serviceAccountKey.private_key,
      scopes: ['https://www.googleapis.com/auth/androidpublisher']
    });

    this.androidPublisher = google.androidpublisher({
      version: 'v3',
      auth
    });
  }

  async validateSubscription(
    packageName: string,
    subscriptionId: string,
    purchaseToken: string
  ): Promise<GoogleSubscriptionPurchase> {
    try {
      const response = await this.androidPublisher.purchases.subscriptions.get({
        packageName,
        subscriptionId,
        token: purchaseToken
      });

      return response.data;
    } catch (error) {
      this.handleGoogleError(error);
    }
  }

  async validateProduct(
    packageName: string,
    productId: string,
    purchaseToken: string
  ): Promise<GoogleProductPurchase> {
    try {
      const response = await this.androidPublisher.purchases.products.get({
        packageName,
        productId,
        token: purchaseToken
      });

      return response.data;
    } catch (error) {
      this.handleGoogleError(error);
    }
  }

  async acknowledgeSubscription(
    packageName: string,
    subscriptionId: string,
    purchaseToken: string
  ): Promise<void> {
    try {
      await this.androidPublisher.purchases.subscriptions.acknowledge({
        packageName,
        subscriptionId,
        token: purchaseToken,
        requestBody: {}
      });
    } catch (error) {
      this.handleGoogleError(error);
    }
  }

  async acknowledgeProduct(
    packageName: string,
    productId: string,
    purchaseToken: string
  ): Promise<void> {
    try {
      await this.androidPublisher.purchases.products.acknowledge({
        packageName,
        productId,
        token: purchaseToken,
        requestBody: {}
      });
    } catch (error) {
      this.handleGoogleError(error);
    }
  }

  private handleGoogleError(error: any): never {
    if (error.code === 404) {
      throw new ValidationError('Purchase token not found or already consumed');
    }
    if (error.code === 401) {
      throw new AuthenticationError('Google Play API authentication failed');
    }
    if (error.code === 403) {
      throw new AuthorizationError('Access to Google Play API denied. Check permissions.');
    }
    if (error.code === 429) {
      throw new RateLimitError('Google Play API rate limit exceeded');
    }
    if (error.code >= 500) {
      throw new ServiceError(`Google Play API server error: ${error.message}`);
    }
    throw error;
  }
}
```

### Google Purchase Parsing

```typescript
interface ParsedGoogleSubscription {
  productId: string;
  purchaseToken: string;
  purchaseTime: Date;
  expiryTime: Date | null;
  autoRenewing: boolean;
  priceCurrencyCode: string;
  priceAmountMicros: string;
  countryCode: string;
  orderId: string;
  linkedPurchaseToken: string;
  purchaseType: number | null;
  acknowledgementState: number;
  cancelReason: number | null;
  userCancellationTime: Date | null;
  cancelSurveyResult: any | null;
  developerNotification: any | null;
  promoType: number | null;
  promoEligible: boolean;
  subscriptionState: 'active' | 'expired' | 'paused' | 'on_hold' | 'grace_period';
}

class GooglePurchaseParser {
  parseSubscription(data: GoogleSubscriptionPurchase): ParsedGoogleSubscription {
    const now = new Date();
    const expiryTime = data.expiryTimeMillis
      ? new Date(parseInt(data.expiryTimeMillis))
      : null;
    const userCancellation = data.userCancellationTimeMillis
      ? new Date(parseInt(data.userCancellationTimeMillis))
      : null;

    let subscriptionState: ParsedGoogleSubscription['subscriptionState'] = 'active';

    if (data.cancelReason === 0 || data.cancelReason === 1) {
      subscriptionState = 'expired';
    } else if (data.paymentState === 5) {
      subscriptionState = 'grace_period';
    } else if (data.paymentState === 6) {
      subscriptionState = 'on_hold';
    }

    if (expiryTime && expiryTime < now && data.autoRenewing === false) {
      subscriptionState = 'expired';
    }

    return {
      productId: this.extractProductId(data),
      purchaseToken: data.purchaseToken,
      purchaseTime: new Date(parseInt(data.startTimeMillis)),
      expiryTime,
      autoRenewing: data.autoRenewing,
      priceCurrencyCode: data.priceCurrencyCode,
      priceAmountMicros: data.priceAmountMicros,
      countryCode: data.countryCode,
      orderId: data.orderId,
      linkedPurchaseToken: data.linkedPurchaseToken,
      purchaseType: data.purchaseType || null,
      acknowledgementState: data.acknowledgementState,
      cancelReason: data.cancelReason || null,
      userCancellationTime: userCancellation,
      cancelSurveyResult: data.cancelSurveyResult || null,
      developerNotification: data.developerNotification || null,
      promoType: data.promoType || null,
      promoEligible: data.promoEligible !== false,
      subscriptionState
    };
  }

  private extractProductId(data: GoogleSubscriptionPurchase | GoogleProductPurchase): string {
    // Extract from the API context; product ID is a parameter in the call
    return data.obfuscatedExternalAccountId || '';
  }
}
```

## Entitlement Management

### Core Entitlement Service

```typescript
interface EntitlementServiceConfig {
  db: Database;
  cache: CacheService;
  eventBus?: EventBus;
}

class EntitlementService {
  private db: Database;
  private cache: CacheService;
  private eventBus?: EventBus;

  constructor(config: EntitlementServiceConfig) {
    this.db = config.db;
    this.cache = config.cache;
    this.eventBus = config.eventBus;
  }

  async verifyAndGrantApple(receiptData: string, userId: string): Promise<GrantResult> {
    const receiptResult = await this.appleValidator.validate(receiptData);
    AppleStatusHandler.handleStatus(receiptResult.status, 'verify_purchase');

    const parsedReceipts = this.appleParser.parseLatestReceiptInfo(
      receiptResult.latest_receipt_info || []
    );

    const granted: string[] = [];
    const failed: Array<{ productId: string; reason: string }> = [];

    for (const receipt of parsedReceipts) {
      try {
        await this.grantEntitlement({
          userId,
          productId: receipt.productId,
          productType: receipt.expiresDate ? 'subscription' : 'non_consumable',
          platform: 'ios',
          transactionId: receipt.transactionId,
          originalTransactionId: receipt.originalTransactionId,
          purchaseToken: receipt.transactionId, // iOS uses transactionId as token
          purchaseDate: receipt.purchaseDate,
          expirationDate: receipt.expiresDate || undefined,
          environment: receipt.environment,
          inGracePeriod: receipt.inGracePeriod,
          autoRenewStatus: receipt.autoRenewStatus
        });
        granted.push(receipt.productId);
      } catch (error) {
        failed.push({ productId: receipt.productId, reason: error.message });
      }
    }

    return { granted, failed, userId };
  }

  async verifyAndGrantGoogle(
    packageName: string,
    productId: string,
    purchaseToken: string,
    userId: string,
    isSubscription: boolean
  ): Promise<GrantResult> {
    if (isSubscription) {
      const purchase = await this.googleValidator.validateSubscription(
        packageName, productId, purchaseToken
      );

      const parsed = this.googleParser.parseSubscription(purchase);

      await this.grantEntitlement({
        userId,
        productId: parsed.productId,
        productType: 'subscription',
        platform: 'android',
        transactionId: purchase.orderId,
        originalTransactionId: purchase.linkedPurchaseToken,
        purchaseToken: parsed.purchaseToken,
        purchaseDate: parsed.purchaseTime,
        expirationDate: parsed.expiryTime || undefined,
        inGracePeriod: parsed.subscriptionState === 'grace_period',
        autoRenewStatus: parsed.autoRenewing
      });

      await this.googleValidator.acknowledgeSubscription(
        packageName, productId, purchaseToken
      );

      return { granted: [parsed.productId], failed: [], userId };
    } else {
      const purchase = await this.googleValidator.validateProduct(
        packageName, productId, purchaseToken
      );

      await this.grantEntitlement({
        userId,
        productId,
        productType: 'consumable',
        platform: 'android',
        transactionId: purchase.orderId,
        purchaseToken,
        purchaseDate: new Date(parseInt(purchase.purchaseTimeMillis)),
        expirationDate: undefined
      });

      await this.googleValidator.acknowledgeProduct(
        packageName, productId, purchaseToken
      );

      return { granted: [productId], failed: [], userId };
    }
  }

  private async grantEntitlement(params: GrantEntitlementParams): Promise<void> {
    const existing = await this.db.entitlements.findByUserAndProduct(
      params.userId, params.productId, params.platform
    );

    await this.db.transaction(async (tx) => {
      if (existing) {
        await tx.entitlements.update(existing.id, {
          transactionId: params.transactionId,
          originalTransactionId: params.originalTransactionId || existing.originalTransactionId,
          purchaseToken: params.purchaseToken,
          purchaseDate: params.purchaseDate,
          expirationDate: params.expirationDate || existing.expirationDate,
          isActive: true,
          autoRenewStatus: params.autoRenewStatus ?? existing.autoRenewStatus,
          inGracePeriod: params.inGracePeriod ?? existing.inGracePeriod,
          cancellationDate: params.cancellationDate || existing.cancellationDate,
          updatedAt: new Date()
        });
      } else {
        await tx.entitlements.create({
          userId: params.userId,
          productId: params.productId,
          productType: params.productType,
          platform: params.platform,
          transactionId: params.transactionId,
          originalTransactionId: params.originalTransactionId || params.transactionId,
          purchaseToken: params.purchaseToken,
          purchaseDate: params.purchaseDate,
          expirationDate: params.expirationDate,
          isActive: true,
          autoRenewStatus: params.autoRenewStatus ?? false,
          inGracePeriod: params.inGracePeriod ?? false,
          environment: params.environment || 'production'
        });
      }

      await tx.transactions.create({
        userId: params.userId,
        productId: params.productId,
        platform: params.platform,
        transactionId: params.transactionId,
        originalTransactionId: params.originalTransactionId || params.transactionId,
        purchaseToken: params.purchaseToken,
        action: existing ? 'renew' : 'purchase',
        status: 'success',
        occurredAt: new Date()
      });
    });

    // Invalidate cache
    await this.cache.del(`entitlements:${params.userId}`);

    // Emit event
    this.eventBus?.emit('entitlement.granted', {
      userId: params.userId,
      productId: params.productId,
      action: existing ? 'renew' : 'purchase'
    });
  }

  async getUserEntitlements(userId: string): Promise<UserEntitlement[]> {
    const cacheKey = `entitlements:${userId}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) return JSON.parse(cached);

    const entitlements = await this.db.entitlements.findByUser(userId);

    // Filter active entitlements
    const active = entitlements.filter(e => {
      if (e.productType === 'consumable') return e.isActive;
      if (e.productType === 'non_consumable') return e.isActive;
      if (e.productType === 'subscription') {
        if (e.cancellationDate) return false;
        if (!e.expirationDate) return e.isActive;
        return e.isActive || e.inGracePeriod;
      }
      return false;
    });

    await this.cache.set(cacheKey, JSON.stringify(active), 300); // 5 min TTL

    return active;
  }
}
```

## Verification API Endpoints

### POST /verify

```typescript
// Verification endpoint
router.post('/verify', authenticate, rateLimit('verify', 10, 60), async (req, res) => {
  const { platform, receipt, productId, purchaseToken } = req.body;
  const userId = req.user.id;

  if (!platform || !receipt) {
    return res.status(422).json({
      error: 'VALIDATION_ERROR',
      message: 'Platform and receipt are required'
    });
  }

  if (!['ios', 'android'].includes(platform)) {
    return res.status(422).json({
      error: 'VALIDATION_ERROR',
      message: 'Platform must be ios or android'
    });
  }

  try {
    let result: GrantResult;

    if (platform === 'ios') {
      result = await entitlementService.verifyAndGrantApple(
        receipt, userId
      );
    } else {
      if (!productId || !purchaseToken) {
        return res.status(422).json({
          error: 'VALIDATION_ERROR',
          message: 'productId and purchaseToken required for Android'
        });
      }
      const isSubscription = req.body.isSubscription === true;
      result = await entitlementService.verifyAndGrantGoogle(
        process.env.ANDROID_PACKAGE_NAME!,
        productId,
        purchaseToken,
        userId,
        isSubscription
      );
    }

    res.json({
      success: true,
      granted: result.granted,
      entitlements: await entitlementService.getUserEntitlements(userId)
    });
  } catch (error) {
    logger.error('Receipt verification failed', {
      userId,
      platform,
      productId,
      error: error.message
    });

    if (error instanceof ValidationError) {
      return res.status(422).json({ error: 'VALIDATION_ERROR', message: error.message });
    }
    if (error instanceof AuthenticationError) {
      return res.status(401).json({ error: 'AUTH_ERROR', message: error.message });
    }
    if (error instanceof ServiceError) {
      return res.status(502).json({ error: 'SERVICE_ERROR', message: error.message, retryable: true });
    }

    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Verification failed' });
  }
});
```

### GET /status

```typescript
router.get('/status', authenticate, async (req, res) => {
  const userId = req.user.id;

  try {
    const entitlements = await entitlementService.getUserEntitlements(userId);
    res.json({ entitlements, userId });
  } catch (error) {
    logger.error('Failed to fetch entitlements', { userId, error: error.message });
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Failed to fetch entitlements' });
  }
});
```

## App Store Server Notifications

```typescript
class AppStoreNotificationHandler {
  async handleNotification(payload: string): Promise<void> {
    // V2 notifications are signed JWTs
    const signedPayload = JSON.parse(payload).signedPayload;
    const notification = this.decodeAndVerify(signedPayload);

    const { notificationType, subtype, data } = notification;
    const transaction = data.signedTransactionInfo;

    switch (notificationType) {
      case 'SUBSCRIBED':
        await this.handleSubscribed(transaction, subtype);
        break;

      case 'DID_CHANGE_RENEWAL_STATUS':
        await this.handleRenewalStatus(transaction, subtype);
        break;

      case 'DID_CHANGE_RENEWAL_PREF':
        await this.handleRenewalPreference(transaction, subtype);
        break;

      case 'DID_CHANGE_RENEWAL_PREF':
        await this.handleRenewalPreference(transaction, subtype);
        break;

      case 'DID_RENEW':
        await this.handleRenewed(transaction, subtype);
        break;

      case 'EXPIRED':
        await this.handleExpired(transaction, subtype);
        break;

      case 'REFUND':
        await this.handleRefund(transaction, subtype);
        break;

      case 'REVOKE':
        await this.handleRevoke(transaction, subtype);
        break;

      case 'GRACE_PERIOD_EXPIRED':
        await this.handleGracePeriodExpired(transaction);
        break;

      case 'PRICE_INCREASE':
        await this.handlePriceIncrease(transaction, subtype);
        break;

      case 'TEST':
        logger.info('Received App Store test notification');
        break;

      default:
        logger.warn('Unknown notification type', { notificationType });
    }
  }

  private async handleExpired(transaction: any, subtype?: string) {
    const transactionId = transaction.transactionId;
    const productId = transaction.productId;

    await this.db.transaction(async (tx) => {
      if (subtype === 'VOLUNTARY') {
        // User cancelled subscription
        await tx.entitlements.deactivateByTransactionId(transactionId);
      } else if (subtype === 'BILLING_RETRY') {
        // Billing retry is still active
        logger.info('Subscription expired but in billing retry', { transactionId });
      } else if (subtype === 'PRICE_INCREASE') {
        // User did not accept price increase
        await tx.entitlements.deactivateByTransactionId(transactionId);
      } else {
        await tx.entitlements.deactivateByTransactionId(transactionId);
      }

      await tx.transactions.create({
        transactionId,
        productId,
        action: 'expired',
        subtype: subtype || 'unknown',
        occurredAt: new Date(),
        metadata: { notificationType: 'EXPIRED', subtype }
      });
    });
  }

  private async handleRefund(transaction: any, subtype?: string) {
    const transactionId = transaction.transactionId;
    const productId = transaction.productId;

    await this.db.transaction(async (tx) => {
      await tx.entitlements.deactivateByTransactionId(transactionId);
      await tx.entitlements.markRefunded(transactionId);

      await tx.transactions.create({
        transactionId,
        productId,
        action: 'refund',
        occurredAt: new Date(),
        metadata: { subtype }
      });
    });

    this.eventBus?.emit('entitlement.refunded', {
      transactionId,
      productId,
      subtype
    });
  }
}
```

## Security Hardening

### Request Authentication

```typescript
// API key authentication
const API_KEY_PREFIX = 'sk_live_';

function authenticateApiKey(req: Request, res: Response, next: NextFunction) {
  const apiKey = req.headers['x-api-key'] as string;

  if (!apiKey) {
    return res.status(401).json({ error: 'AUTH_ERROR', message: 'API key required' });
  }

  if (!apiKey.startsWith(API_KEY_PREFIX)) {
    return res.status(401).json({ error: 'AUTH_ERROR', message: 'Invalid API key format' });
  }

  const keyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
  const storedKey = db.apiKeys.findByHash(keyHash);

  if (!storedKey || storedKey.revoked) {
    return res.status(401).json({ error: 'AUTH_ERROR', message: 'Invalid or revoked API key' });
  }

  req.user = { id: storedKey.userId, role: storedKey.role };
  next();
}
```

### Rate Limiting

```typescript
class ReceiptRateLimiter {
  async check(userId: string): Promise<void> {
    const key = `receipt_verify:${userId}`;
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, 60); // 1 minute window
    }

    if (current > 10) {
      throw new RateLimitError('Too many verification requests. Try again in 1 minute.');
    }
  }
}
```

### Receipt Replay Protection

```typescript
class ReplayProtection {
  private usedTokens: Set<string> = new Set();

  async validateTransaction(transactionId: string): Promise<boolean> {
    if (this.usedTokens.has(transactionId)) {
      logger.warn('Duplicate transaction detected', { transactionId });
      return false;
    }

    const existing = await db.transactions.findByTransactionId(transactionId);
    if (existing) {
      logger.warn('Transaction already processed', { transactionId });
      return false;
    }

    return true;
  }
}
```

## Error Handling

### Error Classes

```typescript
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class AuthenticationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

export class AuthorizationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

export class ServiceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ServiceError';
  }
}

export class RetryableError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RetryableError';
  }
}

export class RateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'RateLimitError';
  }
}
```

## Deployment

### Dockerfile

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV production
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./

EXPOSE 8080
CMD ["node", "dist/app.js"]
```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: receipt-validator
spec:
  replicas: 3
  selector:
    matchLabels:
      app: receipt-validator
  template:
    metadata:
      labels:
        app: receipt-validator
    spec:
      containers:
      - name: validator
        image: receipt-validator:latest
        ports:
        - containerPort: 8080
        env:
        - name: APPLE_SHARED_SECRET
          valueFrom:
            secretKeyRef:
              name: apple-credentials
              key: shared-secret
        - name: GOOGLE_SERVICE_ACCOUNT_KEY
          valueFrom:
            secretKeyRef:
              name: google-credentials
              key: service-account-key
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-credentials
              key: url
        - name: REDIS_URL
          valueFrom:
            secretKeyRef:
              name: redis-credentials
              key: url
        resources:
          requests:
            memory: "256Mi"
            cpu: "200m"
          limits:
            memory: "512Mi"
            cpu: "500m"
        livenessProbe:
          httpGet:
            path: /health
            port: 8080
          initialDelaySeconds: 10
          periodSeconds: 15
        readinessProbe:
          httpGet:
            path: /ready
            port: 8080
          initialDelaySeconds: 5
          periodSeconds: 10
```

## Monitoring

### Key Metrics

| Metric | Description | Alert Threshold |
|--------|-------------|----------------|
| verify_requests_total | Total verification requests | - |
| verify_success_total | Successful verifications | - |
| verify_failure_total | Failed verifications | >5% error rate |
| apple_api_latency_ms | Apple API response time | >2000ms p99 |
| google_api_latency_ms | Google API response time | >2000ms p99 |
| entitlement_cache_hit_ratio | Cache hit rate | <0.7 |
| fraudulent_transactions | Detected fraud attempts | >10/hour |
| pending_receipts | Unprocessed receipts | >100 |

### Prometheus Metrics

```typescript
const verifyCounter = new prometheus.Counter({
  name: 'iap_verify_requests_total',
  help: 'Total receipt verification requests',
  labelNames: ['platform', 'status']
});

const verifyDuration = new prometheus.Histogram({
  name: 'iap_verify_duration_seconds',
  help: 'Receipt verification duration',
  labelNames: ['platform'],
  buckets: [0.1, 0.25, 0.5, 1, 2, 5, 10]
});

const apiLatency = new prometheus.Histogram({
  name: 'iap_store_api_latency_seconds',
  help: 'App Store / Play Store API latency',
  labelNames: ['store'],
  buckets: [0.1, 0.25, 0.5, 1, 2, 5]
});
```
