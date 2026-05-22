# Pricing Models

## Pricing Model Types

### Flat-Rate
Single price for all features and usage.
```
Best for: Simple products, one clear value proposition
Pros: Extremely simple, predictable revenue
Cons: Leaves money on the table, no upgrade path
Example: Basecamp ($99/mo flat)
Pricing: $X/month for everything
```

### Per-Seat
Price per user per month.
```
Best for: Collaboration tools, team products
Pros: Scales naturally with team growth, simple
Cons: Can penalize large teams, may limit viral growth
Example: Slack ($8/user/mo)
Pricing: $X/user/month, minimum N users
```

### Usage-Based
Price based on consumption (API calls, storage, compute).
```
Best for: Infrastructure, API products, platform businesses
Pros: Aligns with value, low barrier to entry
Cons: Unpredictable revenue, can surprise customers
Example: AWS (pay per request/hour/GB)
Pricing: $X per unit, volume discounts at tier
```

### Tiered
Multiple packages at different price points.
```
Best for: Products with clear feature differentiation
Pros: Captures multiple segments, upgrade path
Cons: Feature selection complexity, analysis paralysis
Example: Intercom ($74-$499/mo, 3 tiers)
Pricing: Free → Pro (${X}) → Business (${Y}) → Enterprise (${Z})
```

### Freemium
Free tier with limited features, paid for full access.
```
Best for: Products with low marginal cost, high viral potential
Pros: Zero-friction acquisition, top-of-funnel growth
Cons: Free users cost money, conversion must justify cost
Example: Dropbox (2GB free, paid for more)
Pricing: Free ↔ {conversion trigger} ↔ Paid
```

## Selection Framework

### Criteria
```
Product complexity:
  Simple → Flat-rate or Freemium
  Complex → Tiered or Usage-based

Customer segment:
  Consumers → Freemium (low barrier)
  Teams → Per-seat or Tiered
  Enterprise → Usage-based or custom

Market maturity:
  New market → Freemium or low price (adoption focus)
  Mature market → Competitive pricing + differentiation

Cost structure:
  High fixed / low variable → Flat-rate or Tiered
  Low fixed / high variable → Usage-based
```

### Decision Matrix
```
                    | Simple Product | Complex Product
Consumer            | Freemium       | Tiered (3 tiers)
SMB                 | Per-seat       | Tiered (2-3 tiers)
Enterprise          | Usage-based    | Custom/Enterprise
Platform/API        | Usage-based    | Usage + Tiered
```

## Pricing Psychology

### Anchoring
Present higher price first to make other options seem reasonable.
```
Enterprise ($299/mo) → Pro ($99/mo) → Free ($0)
Enterprise anchors the value, Pro feels like a deal
```

### Charm Pricing
Prices ending in 9 or 5 feel significantly lower.
```
$99 feels significantly less than $100
$49 feels like a better deal than $50
```

### Decoy Effect
Add a decoy option that makes the target option more attractive.
```
Free ($0) | Pro ($99) | Pro + Advanced ($105)
Most users pick Pro, since adding advanced features seems worth $6
```

## Willingness to Pay

### Van Westendorp Price Sensitivity Meter
```
Ask four questions:
1. At what price is this too expensive (would never buy)?
2. At what price is this expensive but still consider?
3. At what price is this a bargain?
4. At what price is this too cheap (question quality)?

Output: Optimal price point (where too cheap and too expensive cross)
Sample: 50+ respondents per segment
```

### Gabor-Granger
```
Show a price, ask "Would you buy at $X?"
Iterate up/down to find price elasticity
Output: Demand curve (quantity demanded at each price)
Sample: 100+ respondents
```

## Implementation

### Price Change Protocol
```
1. Research and validate (WTP study, competitive analysis)
2. Announce changes 30+ days in advance
3. Grandfather existing customers (keep current price)
4. Communicate value justification
5. Offer migration paths
6. Monitor churn for 90 days post-change
```
