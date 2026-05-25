# Pricing Experimentation

## Pricing Experiment Types

| Experiment Type | Description | Duration | Sample Size |
|----------------|-------------|----------|-------------|
| A/B price test | Two price points | 2-4 weeks | 1000+ per variant |
| Van Westendorp | WTP range survey | 1 week | 50+ per segment |
| Gabor-Granger | Price sensitivity | 1 week | 50+ per segment |
| Conjoint analysis | Feature/price tradeoffs | 2-3 weeks | 200+ per segment |
| Page variant | Pricing page design | 2-4 weeks | 1000+ per variant |

## Willingness-to-Pay Studies

### Van Westendorp Model
```python
class VanWestendorp:
    def analyze(self, responses):
        # responses: list of dicts with
        # {cheap, expensive, too_expensive, too_cheap}
        prices = {
            "cheap": [],
            "expensive": [],
            "too_expensive": [],
            "too_cheap": [],
        }
        for r in responses:
            for key in prices:
                prices[key].append(r[key])

        return {
            "idc": self._intersection(prices["cheap"], prices["expensive"]),
            "opp": self._intersection(prices["too_cheap"], prices["too_expensive"]),
            "range": self._acceptable_range(prices),
        }

    def _intersection(self, a, b):
        a_sorted = sorted(a)
        b_sorted = sorted(b)
        # Find where cumulative distributions cross
        return {"optimal_price": (a_sorted[len(a)//2] + b_sorted[len(b)//2]) / 2}
```

## Price Elasticity Testing

| Price Change | Expected Conversion Impact | Revenue Impact | Risk |
|-------------|--------------------------|----------------|------|
| +10% | -5% to -15% | -5% to +5% | Low |
| +25% | -15% to -30% | -10% to +5% | Medium |
| +50% | -30% to -50% | -25% to 0% | High |
| -10% | +10% to +20% | -5% to +10% | Low |
| -25% | +20% to +50% | -10% to +15% | Medium |

## Experiment Design

| Element | Requirement | Example |
|---------|-------------|---------|
| Hypothesis | Clear, testable | "Lowering Pro tier from $29 to $24 increases trial-to-paid by 15%" |
| Variants | 2-5 versions | Control ($29), Variant A ($24), Variant B ($34) |
| Segmentation | By user type | New vs returning, region, plan |
| Duration | Minimum 2 weeks | Controls for weekly cycles |
| Success metric | Primary + secondary | Conversion rate (primary), ARPU (secondary) |

```python
class PricingExperiment:
    def __init__(self, name, hypothesis, variants):
        self.name = name
        self.hypothesis = hypothesis
        self.variants = variants  # {variant_name: price}
        self.results = {v: {"visitors": 0, "conversions": 0, "revenue": 0}
                        for v in variants}

    def assign_variant(self, user_id):
        bucket = hash(user_id) % len(self.variants)
        return list(self.variants.keys())[bucket]

    def record_conversion(self, variant, revenue):
        self.results[variant]["conversions"] += 1
        self.results[variant]["revenue"] += revenue

    def analyze(self):
        for variant, data in self.results.items():
            visitors = data["visitors"] or 1
            data["conversion_rate"] = data["conversions"] / visitors
            data["arpu"] = data["revenue"] / visitors
        return self.results
```

## Statistical Significance

| Metric | Threshold | When to Stop |
|--------|-----------|--------------|
| p-value | < 0.05 | Statistically significant |
| Confidence interval | 95% | Does not cross zero |
| Power | > 80% | Enough sample size |
| Lift | > 5% | Economically significant |
