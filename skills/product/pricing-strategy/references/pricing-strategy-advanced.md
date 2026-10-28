# Pricing Strategy Advanced Topics

Advanced pricing work for software and digital products once the basic model and tiers exist: usage-based and hybrid monetization mechanics, pricing AI features with variable cost, executing price changes, discount governance, enterprise deal structures, pricing analytics, and regulatory constraints. Model selection, tiers, willingness to pay and experiments are covered in sibling references.

## Usage-Based and Hybrid Monetization

| Structure | How it charges | Fits | Watch out for |
|-----------|----------------|------|---------------|
| Pure pay-as-you-go | Per unit consumed | Developer/infra products, low-friction adoption | Revenue volatility, bill shock |
| Platform fee + usage | Fixed subscription plus metered overage | Most B2B SaaS adding consumption | Two-part complexity on the pricing page |
| Included allowance + overage | Tier includes N units, extra billed per unit | Seat-based tools adding usage limits | Choosing allowances that do not cannibalize upgrades |
| Prepaid credits / commit drawdown | Customer buys credits or commits annual spend, drawn down by usage | Enterprise budgets, multi-product usage | Credit expiry rules, revenue recognition |
| Outcome-based | Per resolved ticket, per successful transaction | Clear, attributable outcomes | Disputes over attribution, measurement trust |

### Choosing the value metric for usage
A good usage metric:
- grows with the customer's value received,
- is easy for the customer to predict and monitor,
- is measurable reliably by you,
- and correlates with your cost to serve.

### Making usage predictable for buyers
- Real-time usage dashboards and alerts at thresholds (50%, 80%, 100%).
- Spend caps or hard limits configurable by the customer.
- Committed-use discounts in exchange for predictable revenue.
- Clear overage rates published before purchase.

### Metering and billing implications
- Metering pipeline: idempotent usage events with customer ID, metric, quantity, timestamp, and source event ID; deduplicate before rating.
- Late-arriving events and corrections need a cut-off policy per billing period.
- Rating engine applies tiers/volume pricing, allowances and credits; keep pricing configuration versioned so historical invoices can be recomputed.
- Revenue recognition for prepaid credits and commitments must follow your accounting policy (finance involvement from the start).

## Pricing AI and Variable-Cost Features

AI features often carry material marginal cost (inference tokens, GPU time), unlike typical SaaS features.

| Approach | Description |
|----------|-------------|
| Bundle into existing tiers with fair-use limits | Simplicity; protect margin with limits |
| AI add-on per seat | Clear monetization, adoption friction |
| Credits for AI actions | Aligns price with cost; needs good in-product cost visibility |
| Outcome pricing | Charge per completed task/resolution; requires reliable measurement |

Practices:
- Model unit economics per action (inference cost, retries, retrieval, human review) and set a cost floor per tier.
- Track gross margin per feature and per customer segment; heavy users can make flat pricing unprofitable.
- Expect model costs to change; avoid pricing that depends on a specific model's cost structure, and review prices on a schedule.
- Distinguish costly actions (long generations, agents) from cheap ones in limits or credit weights.

## Executing Price Changes

### Types
| Change | Typical handling |
|--------|------------------|
| New customers only | Lowest risk; existing customers keep current price |
| Increase for existing customers | Advance notice, clear value rationale, often a transition period |
| Repackaging (feature moves between tiers) | Grandfather existing customers or map them to equivalent new plans |
| Metric change (seats → usage) | Migration plan with bill comparisons per customer |

### Playbook
1. Segment customers by impact (bill change in % and absolute), contract terms and churn risk.
2. Simulate new bills for every existing account before announcing.
3. Decide grandfathering: permanent, time-limited (e.g. until renewal or 12 months), or none.
4. Prepare sales/support: FAQ, approved concessions, escalation path.
5. Notify with the notice period required by contracts and law; explain what customers get.
6. Monitor churn, downgrades, support volume and win rates by segment after the change.

Most B2B contracts fix price for the term; increases apply at renewal unless the agreement allows otherwise.

## Discount Governance

Uncontrolled discounting erodes realized price and trains buyers to wait for deals.

| Control | Example |
|---------|---------|
| Discount bands with approval levels | Rep up to 10%, manager to 20%, deal desk beyond |
| Give-get rules | Discount in exchange for multi-year term, prepayment, case study, larger commitment |
| Standard terms catalog | Approved ramp structures, payment terms, price locks |
| Expiring promotions | Clear end dates; no stacking unless designed |
| Deal desk review | Margin, precedent and policy check for non-standard deals |

Metrics: average discount by segment/rep, discount vs win rate, price realization (realized ÷ list), share of deals needing exceptions.

## Enterprise Deal Structures

- **Ramped pricing**: increasing annual commitments in multi-year deals as rollout expands.
- **Price locks / caps on renewal increases**: trade for longer terms.
- **Enterprise license agreements**: unlimited or high caps within a scope for a fixed fee; define true-up rules.
- **Volume tiers and committed-spend discounts** across multiple products.
- **Price books per region/currency** maintained centrally in CPQ/billing systems.

Document every non-standard term in the billing system, not only in the contract PDF, so invoicing and renewals stay correct.

## Pricing Analytics

| Metric | Use |
|--------|-----|
| Average revenue per account/user (ARPA/ARPU) by tier | Tier performance |
| Price realization | Discount leakage |
| Net revenue retention, expansion revenue | Health of upgrade and usage paths |
| Upgrade/downgrade flows between tiers | Packaging fit |
| Usage distribution vs allowances | Whether limits are set at sensible points |
| Gross margin per customer/feature | Cost-to-serve risks, especially for usage-heavy or AI features |
| Win/loss reasons mentioning price | Positioning and competitive pressure |

Review pricing performance on a fixed cadence (e.g. quarterly) with product, sales, finance and marketing.

## Regulatory and Ethical Constraints

| Topic | Notes |
|-------|-------|
| Price discrimination and competition law | Differential pricing is generally lawful but must not be based on protected characteristics or used anti-competitively; involve counsel for dominant-position or B2B resale contexts |
| Price transparency for consumers | EU rules require clear total prices; the Omnibus Directive requires announced price reductions to reference the lowest price in the prior 30 days |
| Automatic renewals and cancellation | Many jurisdictions (e.g. US state auto-renewal laws, EU consumer rules) require clear disclosure, consent and easy cancellation |
| Drip pricing / hidden fees | Disclose mandatory fees upfront; regulators target fees revealed late in checkout |
| Personalized pricing | Disclosure requirements apply in some jurisdictions; reputational risk is high even where legal |
| Taxes | VAT/GST/sales tax display and collection rules differ by country and customer type (B2B vs B2C) |

Get legal review for consumer-facing changes and new monetization models. This is orientation, not legal advice.

## Checklist

- [ ] Usage metric predictable for buyers, measurable and correlated with cost
- [ ] Metering idempotent; rating configuration versioned; finance aligned on recognition
- [ ] AI features priced against per-action unit economics with margin tracking
- [ ] Price changes simulated per account with grandfathering and notice plans
- [ ] Discount bands, give-get rules and deal desk in place
- [ ] Non-standard terms recorded in billing systems
- [ ] Quarterly pricing review on realization, NRR, margin and usage distribution
- [ ] Legal review of consumer pricing, renewals and fee disclosure
