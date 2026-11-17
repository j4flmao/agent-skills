# Checkout Optimization

## Purpose
Increase checkout completion by removing friction (fields, forced accounts, surprise costs), adding express wallets, and keeping the checkout fast and trustworthy. Every change is measured as a funnel step conversion, not guessed.

Reference for the `ecommerce-checkout-cart` skill (entry point: `../SKILL.md`). Inputs to gather: checkout steps and field count, PSP (Stripe, Adyen, Braintree, Shopify), funnel data per step, and device split (mobile share drives wallet priority).

## Friction Sources → Fixes

| Friction | Fix |
|----------|-----|
| Unexpected costs at the end (shipping, tax, fees) | Show estimated shipping/tax in cart; free-shipping threshold progress |
| Forced account creation | Guest checkout default; offer account after purchase (password-only field on confirmation) |
| Long forms | Single shipping/billing toggle ("same as shipping"), address autocomplete, drop non-required fields |
| Card entry on mobile | Express wallets above the form (Apple Pay, Google Pay, PayPal, Shop Pay, Link) |
| Distrust | Recognizable payment marks, return policy and total near the pay button, no layout shift |
| Errors only on submit | Inline validation on blur, preserve input on error, specific messages |
| Slow page | Lazy-load third-party scripts except payment SDK; preconnect to PSP origin |

Baymard Institute's aggregate of published studies puts average cart abandonment around 70%; treat your own funnel data as the baseline, not industry averages.

## Express Checkout (Stripe Express Checkout Element)

Prefer the PSP's wallet component over raw Payment Request API: it handles Apple Pay domain verification, wallet eligibility and button rendering.

```javascript
import { loadStripe } from '@stripe/stripe-js';

const stripe = await loadStripe(STRIPE_PUBLISHABLE_KEY);
const elements = stripe.elements({ mode: 'payment', amount: 4999, currency: 'usd' });
const expressCheckout = elements.create('expressCheckout');
expressCheckout.mount('#express-checkout');

expressCheckout.on('confirm', async () => {
  const { error: submitError } = await elements.submit();
  if (submitError) return showError(submitError.message);

  const res = await fetch('/api/checkout/intent', { method: 'POST', headers: { 'Idempotency-Key': cartId } });
  if (!res.ok) return showError('Could not start payment, please retry');
  const { clientSecret } = await res.json();

  const { error } = await stripe.confirmPayment({
    elements,
    clientSecret,
    confirmParams: { return_url: `${location.origin}/order/complete` },
  });
  if (error) showError(error.message); // otherwise the browser redirects
});
```
Server computes the amount from the cart — never trust an amount sent by the client.

## Autofill-Friendly Form

```html
<form autocomplete="on">
  <input name="email" type="email" autocomplete="email" required>
  <input name="name" autocomplete="shipping name" required>
  <input name="address1" autocomplete="shipping address-line1" required>
  <input name="postal" autocomplete="shipping postal-code" inputmode="numeric" required>
  <input name="country" autocomplete="shipping country" required>
  <input name="tel" type="tel" autocomplete="shipping tel">
</form>
```
Correct `autocomplete` tokens let browsers fill the whole form in one tap; wrong `name`/`id` heuristics are the common cause of failed autofill.

## Performance
- Keep checkout JS small; defer chat widgets, A/B tooling and analytics that are not needed to pay.
- `<link rel="preconnect" href="https://js.stripe.com">` (or your PSP) on cart page.
- Prefetch the checkout route from the cart (`<link rel="prefetch">` or framework router prefetch).
- Reserve space for wallet buttons and PSP iframes to avoid CLS.
- Target fast INP on the pay button: no heavy synchronous work in click handlers.

## Recovery
- Abandoned-cart email/SMS only with consent; first send within hours, include cart deep link that restores state.
- Persist cart server-side keyed by user/session so cross-device return works.
- Exit-intent modals: test carefully — they often hurt mobile UX and brand trust.

## Measurement

| Metric | Definition |
|--------|-----------|
| Checkout start rate | checkout_started / cart_viewed |
| Step conversion | step_n_completed / step_n_viewed |
| Payment success rate | payment_succeeded / payment_attempted (split by method, decline code) |
| Checkout completion | order_placed / checkout_started |

Run A/B tests with order completion as primary metric and AOV/refund rate as guardrails; size samples before launch (see product/ab-testing).

## Anti-Patterns
- Coupon field prominently at top (sends users off-site to hunt codes) — collapse behind a link.
- Re-asking for data already known (logged-in email, address).
- CAPTCHA on checkout for all users — use PSP risk scoring (e.g., Radar) instead.
- Full-page reload on validation errors.

## Checklist
- [ ] Guest checkout available
- [ ] Wallet buttons above the fold on mobile
- [ ] Total including shipping/tax visible before payment step
- [ ] All inputs have correct `autocomplete` tokens and input types
- [ ] Funnel events instrumented per step
- [ ] Idempotent order/payment creation

## Related
- [checkout-optimization.md](checkout-optimization.md)
- [checkout-ux.md](checkout-ux.md)
- [payment-processing checkout notes](../../payment-processing/references/checkout-optimization.md)
