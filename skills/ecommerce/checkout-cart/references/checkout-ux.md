# Checkout UX Patterns

## Checkout Flow Design

```
Cart → Guest or Login → Shipping → Payment → Review → Confirmation
  ↓                       ↓          ↓         ↓           ↓
Progress indicator    Address     Payment   Order       Order
                      validation  method    summary     number
```

| Pattern | Conversion Impact | Best For |
|---------|------------------|----------|
| Single-page checkout | +10-20% | Mobile-first |
| Multi-step with progress | +5-15% | High-value orders |
| Guest checkout | +20-30% | First-time buyers |
| Saved payment methods | +15-25% | Returning customers |
| One-click checkout | +30-50% | Repeat purchases |

## Cart Recovery

### Abandonment Triggers

| Trigger | Action | Timing |
|---------|--------|--------|
| Cart abandonment | Email reminder | 1 hour after abandon |
| Price drop | Push notification | Real-time |
| Low stock | Urgency alert | Immediate |
| Abandoned with coupon | Follow-up with offer | 24 hours |
| Multiple abandonments | Exit-intent survey | On exit |

### Recovery Email Sequence
```
Email 1 (1h): "Did you forget something?" — cart summary
Email 2 (24h): "Still interested?" — similar product recommendations
Email 3 (72h): "We saved your cart" — discount offer (10-15%)
Email 4 (7d): "Last chance" — cart expiring notification
```

## Promotion Integration

```python
class PromotionEngine:
    def apply_promotions(self, cart, active_promotions):
        for promo in active_promotions:
            if self.is_eligible(cart, promo):
                discount = self.calculate_discount(cart, promo)
                cart.add_discount(promo.code, discount)
        return cart

    def is_eligible(self, cart, promo):
        checks = {
            "min_cart_value": cart.total >= promo.min_value,
            "min_items": len(cart.items) >= promo.min_items,
            "customer_group": cart.customer.group in promo.groups,
            "first_purchase": not cart.customer.has_orders,
        }
        return all(checks.get(rule, True) for rule in promo.rules)
```

## Conversion Optimization

| Technique | Impact | Implementation |
|-----------|--------|----------------|
| Trust signals (SSL, badges) | +10-20% | Footer and payment page |
| Progress indicator | +5-10% | Current step highlighted |
| Error inline validation | +10-15% | Real-time field validation |
| Skeleton loading | +5-10% | Placeholder UI during load |
| Mobile-optimized forms | +20-30% | Large inputs, auto-fill |

### Checkout Form Best Practices
- Auto-detect country from IP
- Auto-format credit card numbers
- Allow zip code lookup for addresses
- Show shipping costs early (before payment)
- Offer multiple payment methods prominently
- Ensure mobile touch targets are 44px minimum
- Show order summary sidebar (or collapsible on mobile)

## A/B Testing for Checkout

| Variant | Change | Expected Impact |
|---------|--------|----------------|
| Guest checkout vs forced login | Skip auth step | +20-30% conversion |
| Single-page vs multi-step | Layout change | +5-15% conversion |
| Summary sidebar vs collapsible | Mobile optimization | +5-10% mobile conversion |
| Progress bar vs no indicator | User guidance | +3-8% completion rate |

```python
class CheckoutExperiment:
    def __init__(self, variant_a, variant_b):
        self.variants = {"control": variant_a, "test": variant_b}
        self.results = {}

    def record_checkout(self, variant, completed, cart_value):
        if variant not in self.results:
            self.results[variant] = {"visitors": 0, "completed": 0, "revenue": 0}
        self.results[variant]["visitors"] += 1
        if completed:
            self.results[variant]["completed"] += 1
            self.results[variant]["revenue"] += cart_value

    def analyze(self):
        for v, data in self.results.items():
            data["conversion_rate"] = data["completed"] / max(data["visitors"], 1)
            data["avg_order_value"] = data["revenue"] / max(data["completed"], 1)
        return self.results
```
