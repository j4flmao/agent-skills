# Checkout Optimization

## Checkout UX Patterns

### Single-Page Checkout
```typescript
// All fields visible on one page
// Pros: Fast for returning users, linear flow
// Cons: Can feel overwhelming for new users
interface SinglePageCheckoutState {
  email: string;
  shipping: Address;
  billing: Address;
  sameAsBilling: boolean;
  paymentMethod: PaymentMethod;
  couponCode: string;
  orderNotes: string;
  saveInfo: boolean;
  agreeToTerms: boolean;
}

function SinglePageCheckout() {
  const [state, setState] = useState<SinglePageCheckoutState>({
    email: '',
    shipping: { line1: '', city: '', state: '', zip: '', country: 'US' },
    billing: { line1: '', city: '', state: '', zip: '', country: 'US' },
    sameAsBilling: true,
    paymentMethod: { type: 'card' },
    couponCode: '',
    orderNotes: '',
    saveInfo: false,
    agreeToTerms: false,
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!state.email) newErrors.email = 'Email is required';
    if (!state.shipping.zip) newErrors.zip = 'ZIP code is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setIsSubmitting(true);
    try {
      await processPayment(state);
    } catch (err) {
      setIsSubmitting(false);
    }
  };

  return { state, errors, isSubmitting, setState, handleSubmit };
}
```

### Multi-Step Checkout
```typescript
// Steps: Cart → Information → Shipping → Payment → Confirmation
// Pros: Higher conversion, manageable chunks
// Cons: More page loads, potential drop-off at each step
interface MultiStepCheckoutState {
  currentStep: 1 | 2 | 3 | 4 | 5;
  steps: Array<{ id: number; label: string; completed: boolean }>;
}

function MultiStepCheckout() {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());

  const steps = [
    { id: 1, label: 'Cart Review' },
    { id: 2, label: 'Shipping' },
    { id: 3, label: 'Payment' },
    { id: 4, label: 'Review Order' },
    { id: 5, label: 'Confirmation' },
  ];

  const goNext = () => {
    setCompletedSteps((prev) => new Set(prev).add(currentStep));
    setCurrentStep((prev) => Math.min(prev + 1, 5) as 1 | 2 | 3 | 4 | 5);
  };

  const goBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 1) as 1 | 2 | 3 | 4 | 5);
  };

  const canProceed = (step: number): boolean => {
    return step === currentStep || completedSteps.has(step);
  };

  return { currentStep, steps, completedSteps, goNext, goBack, canProceed };
}
```

### Best Practices Comparison
| Aspect | Single-Page | Multi-Step |
|--------|-------------|------------|
| Mobile conversion | Lower | Higher |
| Desktop conversion | Higher | Lower |
| Returning user speed | Faster | Slower |
| Error discovery | All at once | Per step |
| Abandonment rate | 25-35% | 20-30% |

## 3D Secure (SCA) Handling

### 3DS Flow
```
1. Customer enters card details
2. Backend creates PaymentIntent
3. Stripe checks if 3DS required
4. If required: customer redirected to bank's 3DS page
5. Customer authenticates (biometric, OTP, app approval)
6. Stripe confirms authentication
7. Payment completes
```

### Client-side 3DS Handling
```typescript
import { Stripe, PaymentIntent } from '@stripe/stripe-js';

async function handlePaymentWith3DS(
  stripe: Stripe,
  clientSecret: string,
  cardElement: any
): Promise<{ error?: any; paymentIntent?: PaymentIntent }> {
  const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
    payment_method: {
      card: cardElement,
    },
  });

  if (error) {
    if (error.type === 'card_error' || error.type === 'validation_error') {
      return { error: { message: error.message } };
    }
    return { error: { message: 'An unexpected error occurred' } };
  }

  if (paymentIntent.status === 'requires_action') {
    // 3DS authentication is being handled automatically by Stripe.js
    return { paymentIntent };
  }

  if (paymentIntent.status === 'succeeded') {
    return { paymentIntent };
  }

  return { paymentIntent };
}
```

### Server-side 3DS Check
```typescript
async function requiresSCA(
  amount: number,
  paymentMethodType: string,
  customerCountry: string
): Promise<boolean> {
  // Threshold-based triggers
  if (amount > 25000) return true; // $250
  if (amount > 10000 && customerCountry !== 'US') return true;

  // Card type-based triggers
  const highRiskBins = ['4', '5']; // High-risk BIN ranges
  // Check if payment method is high risk

  return false;
}
```

### SCA Exemption Rules
| Exemption | Condition | Risk |
|-----------|-----------|------|
| Transaction risk analysis | Amount < 250 EUR | Low |
| Low value | Amount < 30 EUR | Low |
| Corporate card | Registered corporate card | Low |
| Trusted beneficiary | Saved card, previous successful payment | Low |
| Recurring | Same amount, same merchant | Low |

## Payment Method Sorting

### Smart Sorting Algorithm
```typescript
interface PaymentMethodOption {
  id: string;
  type: string;
  brand?: string;
  last4?: string;
  isExpired: boolean;
  popularity: number; // 0-100 based on user's region
  successRate: number; // 0-100 based on user's history
  isSaved: boolean;
  surcharge?: number;
}

function sortPaymentMethods(
  methods: PaymentMethodOption[],
  country: string,
  amount: number
): PaymentMethodOption[] {
  // 1. Saved cards first
  // 2. Wallet payments (Apple Pay, Google Pay) next
  // 3. Then by popularity in user's country
  // 4. Finally by success rate
  return methods.sort((a, b) => {
    // Saved methods first
    if (a.isSaved && !b.isSaved) return -1;
    if (!a.isSaved && b.isSaved) return 1;

    // Wallet payments next
    const walletPriority = ['apple_pay', 'google_pay', 'paypal'];
    const aWallet = walletPriority.indexOf(a.type);
    const bWallet = walletPriority.indexOf(b.type);
    if (aWallet !== -1 && bWallet !== -1) return aWallet - bWallet;
    if (aWallet !== -1) return -1;
    if (bWallet !== -1) return 1;

    // By popularity
    return b.popularity - a.popularity;
  });
}
```

### Country-specific Payment Method Order
```typescript
const countryDefaults: Record<string, string[]> = {
  US: ['card', 'apple_pay', 'google_pay', 'paypal', 'affirm', 'afterpay'],
  GB: ['card', 'apple_pay', 'google_pay', 'paypal', 'klarna', 'ideal'],
  DE: ['giropay', 'paypal', 'card', 'sofort', 'sepa_debit'],
  NL: ['ideal', 'paypal', 'card', 'sofort'],
  FR: ['card', 'paypal', 'bancontact'],
  AU: ['card', 'paypal', 'afterpay', 'apple_pay'],
  JP: ['card', 'konbini', 'paypay', 'line_pay'],
  BR: ['card', 'boleto', 'pix', 'paypal'],
};
```

## Error Message Best Practices

### User-Friendly Error Mapping
```typescript
const errorMessages: Record<string, string> = {
  card_declined: 'Your card was declined. Please try a different payment method.',
  insufficient_funds: 'Your card has insufficient funds. Please use a different card.',
  expired_card: 'This card has expired. Please use a different card.',
  incorrect_cvc: 'The security code (CVC) is incorrect. Please check and try again.',
  processing_error: 'An error occurred while processing your payment. Please try again.',
  invalid_number: 'The card number is invalid. Please check and re-enter.',
  incorrect_number: 'The card number is incorrect. Please check and re-enter.',
  invalid_expiry_month: 'The expiration month is invalid.',
  invalid_expiry_year: 'The expiration year is invalid.',
  invalid_cvc: 'The security code (CVC) is invalid.',
  lost_card: 'This card has been reported as lost.',
  stolen_card: 'This card has been reported as stolen.',
  pickup_card: 'Please contact your bank for assistance with this card.',
  transaction_not_allowed: 'This transaction is not permitted. Please contact your bank.',
  do_not_honor: 'Your bank declined the transaction. Please contact them for details.',
  generic_decline: 'Your card was declined. Please try a different payment method.',
};

function getErrorMessage(code: string): string {
  return errorMessages[code] || 'An unexpected error occurred. Please try again.';
}
```

### Inline Validation
```typescript
interface FieldValidation {
  field: string;
  label: string;
  required: boolean;
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  customValidator?: (value: string) => string | null;
}

const checkoutFields: FieldValidation[] = [
  { field: 'email', label: 'Email', required: true, pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/ },
  { field: 'cardNumber', label: 'Card Number', required: true, pattern: /^\d{13,19}$/ },
  { field: 'expiry', label: 'Expiry Date', required: true, pattern: /^(0[1-9]|1[0-2])\/\d{2}$/ },
  { field: 'cvc', label: 'CVC', required: true, pattern: /^\d{3,4}$/ },
  { field: 'zip', label: 'ZIP Code', required: true, pattern: /^\d{5}(-\d{4})?$/ },
];

function validateField(field: FieldValidation, value: string): string | null {
  if (field.required && !value) return `${field.label} is required`;
  if (field.pattern && !field.pattern.test(value)) return `Invalid ${field.label.toLowerCase()}`;
  if (field.minLength && value.length < field.minLength) {
    return `${field.label} must be at least ${field.minLength} characters`;
  }
  if (field.maxLength && value.length > field.maxLength) {
    return `${field.label} must be at most ${field.maxLength} characters`;
  }
  if (field.customValidator) return field.customValidator(value);
  return null;
}
```

## Loading and Processing States

### Payment Processing State Machine
```typescript
type PaymentState =
  | 'idle'
  | 'validating'
  | 'processing'
  | 'requires_3ds'
  | 'requires_redirect'
  | 'succeeded'
  | 'failed'
  | 'canceled';

interface PaymentUIState {
  state: PaymentState;
  error?: string;
  paymentIntent?: any;
  submitCount: number;
  lastAttemptAt?: Date;
}

function PaymentButton({ state, onClick, disabled }: {
  state: PaymentUIState;
  onClick: () => void;
  disabled: boolean;
}) {
  const buttonConfig: Record<PaymentState, {
    text: string;
    variant: 'primary' | 'loading' | 'success' | 'error';
    disabled: boolean;
  }> = {
    idle: { text: 'Pay Now', variant: 'primary', disabled: false },
    validating: { text: 'Validating...', variant: 'loading', disabled: true },
    processing: { text: 'Processing Payment...', variant: 'loading', disabled: true },
    requires_3ds: { text: 'Authenticating...', variant: 'loading', disabled: true },
    requires_redirect: { text: 'Redirecting...', variant: 'loading', disabled: true },
    succeeded: { text: 'Payment Successful ✓', variant: 'success', disabled: true },
    failed: { text: `Retry Payment`, variant: 'error', disabled: false },
    canceled: { text: 'Pay Now', variant: 'primary', disabled: false },
  };

  const config = buttonConfig[state.state];

  return (
    <button
      onClick={onClick}
      disabled={config.disabled || disabled}
      className={`checkout-button checkout-button--${config.variant}`}
    >
      {config.text}
    </button>
  );
}
```

### Spinner and Progress States
```typescript
function CheckoutProgress({ currentStep, totalSteps }: {
  currentStep: number;
  totalSteps: number;
}) {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className="checkout-progress">
      <div className="checkout-progress__bar" style={{ width: `${progress}%` }} />
      <span className="checkout-progress__label">
        Step {currentStep} of {totalSteps}
      </span>
    </div>
  );
}
```

## Saved Payment Methods

### Display Saved Cards
```typescript
interface SavedCardDisplay {
  id: string;
  brand: string;
  last4: string;
  expMonth: number;
  expYear: number;
  isDefault: boolean;
  isExpired: boolean;
}

function SavedCard({ card, onSelect, onRemove }: {
  card: SavedCardDisplay;
  onSelect: (id: string) => void;
  onRemove: (id: string) => void;
}) {
  const brandLogos: Record<string, string> = {
    visa: '/cards/visa.svg',
    mastercard: '/cards/mastercard.svg',
    amex: '/cards/amex.svg',
    discover: '/cards/discover.svg',
  };

  return (
    <div
      className={`saved-card ${card.isDefault ? 'saved-card--default' : ''}`}
      onClick={() => onSelect(card.id)}
    >
      <img
        src={brandLogos[card.brand] || '/cards/generic.svg'}
        alt={card.brand}
        className="saved-card__logo"
      />
      <div className="saved-card__info">
        <span className="saved-card__number">•••• {card.last4}</span>
        <span className="saved-card__expiry">
          Expires {card.expMonth}/{card.expYear}
        </span>
      </div>
      {card.isExpired && (
        <span className="saved-card__expired-badge">Expired</span>
      )}
      <button
        className="saved-card__remove"
        onClick={(e) => { e.stopPropagation(); onRemove(card.id); }}
        aria-label="Remove saved card"
      >
        ×
      </button>
    </div>
  );
}
```

### CVC Collection for Saved Cards
```typescript
async function payWithSavedCard(
  stripe: Stripe,
  paymentMethodId: string,
  clientSecret: string,
  cvc?: string
) {
  const { error, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
    payment_method: paymentMethodId,
    ...(cvc && { payment_method_options: { card: { cvc } } }),
  });

  if (error) throw error;
  return paymentIntent;
}
```

## Apple Pay / Google Pay (Wallet Buttons)

### Apple Pay Setup
```typescript
import { Stripe } from '@stripe/stripe-js';

async function initializeApplePay(stripe: Stripe): Promise<boolean> {
  if (!window.ApplePaySession || !ApplePaySession.canMakePayments()) {
    return false;
  }

  const { error } = await stripe.initApplePay();
  if (error) return false;

  return true;
}

async function handleApplePayPayment(
  stripe: Stripe,
  amount: number,
  currency: string,
  label: string,
  clientSecret: string
) {
  const { error, paymentIntent } = await stripe.confirmApplePayPayment(clientSecret, {
    paymentMethod: {
      card: {
        // Apple Pay handles card details automatically
      },
    },
    shipping: {
      // Optional: include shipping contact
    },
  });

  if (error) throw error;
  return paymentIntent;
}
```

### Google Pay Setup
```typescript
const googlePayConfig = {
  apiVersion: 2,
  apiVersionMinor: 0,
  allowedPaymentMethods: [
    {
      type: 'CARD',
      parameters: {
        allowedAuthMethods: ['PAN_ONLY', 'CRYPTOGRAM_3DS'],
        allowedCardNetworks: ['VISA', 'MASTERCARD', 'AMEX', 'DISCOVER'],
        billingAddressRequired: true,
        billingAddressParameters: {
          format: 'FULL',
          phoneNumberRequired: true,
        },
      },
      tokenizationSpecification: {
        type: 'PAYMENT_GATEWAY',
        parameters: {
          gateway: 'stripe',
          'stripe:version': '2025-02-24.acacia',
          'stripe:publishableKey': process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
        },
      },
    },
  ],
  transactionInfo: {
    totalPriceStatus: 'FINAL',
    totalPrice: '0.00',
    currencyCode: 'USD',
    countryCode: 'US',
  },
  merchantInfo: {
    merchantName: 'Your Store',
    merchantId: 'merchant.com.yourstore',
  },
};
```

### Google Pay Handler
```typescript
async function handleGooglePayPayment(
  stripe: Stripe,
  amount: number,
  clientSecret: string
) {
  const paymentsClient = new google.payments.api.PaymentsClient({
    environment: 'TEST',
  });

  const paymentData = await paymentsClient.loadPaymentData({
    ...googlePayConfig,
    transactionInfo: {
      ...googlePayConfig.transactionInfo,
      totalPrice: (amount / 100).toFixed(2),
    },
  });

  const { error, paymentIntent } = await stripe.confirmCardPayment(
    clientSecret,
    {
      payment_method: {
        card: paymentData.paymentMethodData.tokenizationData.token,
      },
    }
  );

  if (error) throw error;
  return paymentIntent;
}
```

### Wallet Button Best Practices
| Practice | Reason |
|----------|--------|
| Show Apple Pay on Safari only | Unsupported on other browsers |
| Show Google Pay on Chrome/Android | Unsupported on iOS Safari |
| Place wallet buttons above card form | Higher conversion |
| Use platform-specific styling | Apple's `-apple-pay-button` CSS class |
| Test on real devices | Simulators don't fully replicate UX |
| Handle unsupported gracefully | Fall back to card form |

## Address Validation

### Client-side Validation
```typescript
async function validateAddress(address: Address): Promise<AddressValidationResult> {
  const errors: string[] = [];

  if (!address.line1) errors.push('Street address is required');
  if (!address.city) errors.push('City is required');
  if (!address.state) errors.push('State is required');
  if (!address.zip || !/^\d{5}(-\d{4})?$/.test(address.zip)) {
    errors.push('Valid ZIP code is required');
  }

  if (errors.length === 0) {
    // Optional: call address verification API
    const verified = await verifyAddressWithService(address);
    return verified;
  }

  return { valid: false, errors, suggestions: [] };
}
```

### Address Verification Service
```typescript
interface VerifiedAddress {
  line1: string;
  line2?: string;
  city: string;
  state: string;
  zip: string;
  country: string;
  formatted: string;
}

async function verifyAddressWithService(
  address: Address
): Promise<AddressValidationResult> {
  const response = await fetch('/api/validate-address', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(address),
  });

  const result = await response.json();

  if (result.suggestions?.length > 0) {
    return {
      valid: false,
      errors: ['Please select a suggested address or confirm yours'],
      suggestions: result.suggestions.map((s: any) => ({
        ...s,
        formatted: `${s.line1}, ${s.city}, ${s.state} ${s.zip}`,
      })),
    };
  }

  return { valid: true, errors: [], suggestions: [] };
}
```

## Tax Calculation

### Server-side Tax Calculation
```typescript
interface TaxLineItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number; // cents
  taxRate: number; // decimal
  taxAmount: number; // cents
  totalWithTax: number; // cents
}

function calculateTax(
  items: CartItem[],
  shippingAddress: Address,
  customerGroup: string
): TaxLineItem[] {
  const taxRates = getTaxRates(shippingAddress.state, customerGroup);

  return items.map((item) => {
    const rate = taxRates[item.productCategory] || taxRates.default;
    const taxAmount = Math.round(item.unitPrice * item.quantity * rate);
    return {
      productId: item.productId,
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      taxRate: rate,
      taxAmount,
      totalWithTax: item.unitPrice * item.quantity + taxAmount,
    };
  });
}

function getTaxRates(state: string, customerGroup: string): Record<string, number> {
  const rates: Record<string, Record<string, number>> = {
    CA: {
      default: 0.0875, // CA state tax
      clothing: 0.0,   // Clothing exempt
      food: 0.0,       // Food exempt
      electronics: 0.0875,
    },
    TX: {
      default: 0.0825,
      food: 0.0,
      clothing: 0.0825,
    },
    // ... per-state rates
  };

  return rates[state] || { default: 0.0 };
}
```

## Order Review Before Payment

### Order Summary Component
```typescript
interface OrderSummaryProps {
  items: CartItem[];
  subtotal: number;
  shipping: ShippingOption;
  tax: TaxLineItem[];
  discount: Discount;
  total: number;
  currency: string;
}

function OrderSummary({
  items,
  subtotal,
  shipping,
  tax,
  discount,
  total,
  currency,
}: OrderSummaryProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(amount / 100);

  return (
    <div className="order-summary">
      <h3>Order Summary</h3>

      {items.map((item) => (
        <div key={item.productId} className="order-summary__item">
          <div className="order-summary__item-details">
            <span className="order-summary__item-name">{item.name}</span>
            <span className="order-summary__item-qty">Qty: {item.quantity}</span>
          </div>
          <span className="order-summary__item-price">
            {formatCurrency(item.unitPrice * item.quantity)}
          </span>
        </div>
      ))}

      <div className="order-summary__divider" />

      <div className="order-summary__line">
        <span>Subtotal</span>
        <span>{formatCurrency(subtotal)}</span>
      </div>

      <div className="order-summary__line">
        <span>Shipping ({shipping.name})</span>
        <span>{shipping.cost === 0 ? 'Free' : formatCurrency(shipping.cost)}</span>
      </div>

      {tax.map((t) => (
        <div key={t.productId} className="order-summary__line">
          <span>Tax</span>
          <span>{formatCurrency(t.taxAmount)}</span>
        </div>
      ))}

      {discount.amount > 0 && (
        <div className="order-summary__line order-summary__line--discount">
          <span>Discount ({discount.code})</span>
          <span>-{formatCurrency(discount.amount)}</span>
        </div>
      )}

      <div className="order-summary__line order-summary__line--total">
        <span>Total</span>
        <span>{formatCurrency(total)}</span>
      </div>

      <button type="submit" className="checkout-button">
        Place Order
      </button>
    </div>
  );
}
```

## Confirmation Page

### Post-Payment Confirmation
```typescript
interface ConfirmationPageProps {
  orderId: string;
  status: 'succeeded' | 'processing' | 'failed';
  paymentMethod: string;
  amount: number;
  currency: string;
  customerEmail: string;
  estimatedDelivery?: string;
  isSubscription?: boolean;
}

function ConfirmationPage({
  orderId,
  status,
  paymentMethod,
  amount,
  currency,
  customerEmail,
  estimatedDelivery,
  isSubscription,
}: ConfirmationPageProps) {
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(amount / 100);

  if (status === 'processing') {
    return (
      <div className="confirmation confirmation--processing">
        <div className="confirmation__spinner" />
        <h2>Payment Processing</h2>
        <p>
          Your payment of {formatCurrency(amount)} is being processed.
          We'll send a confirmation to {customerEmail} once complete.
        </p>
        <p>Order reference: {orderId}</p>
      </div>
    );
  }

  if (status === 'failed') {
    return (
      <div className="confirmation confirmation--failed">
        <h2>Payment Failed</h2>
        <p>Your payment could not be processed.</p>
        <p>Order reference: {orderId}</p>
        <button onClick={() => window.location.href = `/checkout/${orderId}/retry`}>
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="confirmation confirmation--success">
      <div className="confirmation__checkmark">✓</div>
      <h2>Order Confirmed!</h2>
      <p>Thank you for your purchase.</p>
      <div className="confirmation__details">
        <p>Order: <strong>#{orderId}</strong></p>
        <p>Amount: <strong>{formatCurrency(amount)}</strong></p>
        <p>Payment: <strong>{paymentMethod}</strong></p>
        {estimatedDelivery && <p>Estimated delivery: <strong>{estimatedDelivery}</strong></p>}
        {isSubscription && <p>Your subscription is now active.</p>}
      </div>
      <p>A confirmation has been sent to {customerEmail}</p>
      <button onClick={() => window.location.href = `/orders/${orderId}`}>
        View Order Details
      </button>
    </div>
  );
}
```

## Recovery Emails for Abandoned Carts

### Cart Recovery Email Template
```typescript
interface AbandonedCartEmail {
  to: string;
  subject: string;
  body: {
    items: string[];
    total: number;
    currency: string;
    recoveryLink: string;
    discountAmount?: number;
    discountCode?: string;
    expiresAt: Date;
  };
}

function buildAbandonedCartEmail(cart: AbandonedCart): AbandonedCartEmail {
  const triggerAt = getOptimalTriggerTime(cart);

  const email: AbandonedCartEmail = {
    to: cart.email,
    subject: `Complete your order — items waiting in your cart`,
    body: {
      items: cart.items.map((i) => i.name),
      total: cart.total,
      currency: cart.currency,
      recoveryLink: `${process.env.STORE_URL}/cart/${cart.id}?recovery=true`,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  };

  // Add discount for high-value carts
  if (cart.total > 5000) {
    email.body.discountAmount = Math.round(cart.total * 0.1);
    email.body.discountCode = generateDiscountCode();
  }

  return email;
}
```

### Recovery Email Sequence
| Timing | Subject Line | Content |
|--------|-------------|---------|
| 1 hour | Complete your order | Reminder with items listed |
| 24 hours | Don't miss out | "Still interested?" with social proof |
| 72 hours | We saved your cart | Cart restored with incentive (10% off) |
| 7 days | Last chance | Cart expiring soon, urgency + bigger discount |

### Abandoned Cart Analytics
```typescript
interface CartAbandonmentMetrics {
  totalCarts: number;
  abandonedCarts: number;
  abandonmentRate: number;
  recoveryRate: number;
  recoveredRevenue: number;
  avgTimeToAbandon: number; // seconds
  topExitPages: Array<{ page: string; count: number }>;
  deviceBreakdown: {
    mobile: number;
    desktop: number;
    tablet: number;
  };
}

function calculateAbandonmentMetrics(
  carts: CheckoutSession[]
): CartAbandonmentMetrics {
  const abandoned = carts.filter((c) => c.status === 'abandoned');
  const recovered = carts.filter((c) => c.recoveredAt);
  const totalRevenue = recovered.reduce((sum, c) => sum + c.total, 0);

  return {
    totalCarts: carts.length,
    abandonedCarts: abandoned.length,
    abandonmentRate: abandoned.length / carts.length,
    recoveryRate: recovered.length / abandoned.length,
    recoveredRevenue: totalRevenue,
    avgTimeToAbandon: abandoned.reduce((s, c) => s + c.timeOnPage, 0) / abandoned.length,
    topExitPages: getTopExitPages(abandoned),
    deviceBreakdown: getDeviceBreakdown(abandoned),
  };
}
```

## Key Points
- Single-page checkout is faster for returning users; multi-step converts better on mobile
- Handle 3DS as an async flow with proper loading states and error recovery
- Sort payment methods by saved status, wallet priority, then regional popularity
- Map every card decline code to a specific, user-friendly message
- Wallet buttons must be conditionally shown based on platform support
- Validate addresses on both client and server with verification service fallback
- Show clear order review before the final payment submission
- Confirmation page must handle succeeded, processing, and failed states
- Abandoned cart recovery emails should follow a timed sequence with incentives
- Track abandonment metrics to identify and fix checkout friction points
