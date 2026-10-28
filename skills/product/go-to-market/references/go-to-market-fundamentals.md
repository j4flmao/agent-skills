# GTM Fundamentals: ICP, Segmentation and Choosing a Go-to-Market Motion

The decisions that come before any launch plan: who the product is for (ideal customer profile and buyer personas), which segment to win first, and which go-to-market motion (product-led, sales-led, partner-led, community-led) fits the product and price point. Positioning, channels, launch tiers and execution have their own references.

## Ideal Customer Profile (ICP)

The ICP describes the account (company or household) that gets the most value and is most valuable to you. Personas describe the people inside it.

| ICP attribute | B2B example | B2C example |
|---|---|---|
| Firmographics / demographics | 50–500 employees, SaaS, EU/US | Freelancers, 25–40 |
| Technographics | Uses GitHub + AWS, no dedicated SRE team | iOS users with paid cloud storage |
| Trigger events | Recent funding, compliance audit due, new CTO | Starting a business, tax season |
| Pain intensity | Weekly incidents, manual on-call | Lost invoices, missed payments |
| Ability to pay / buying process | Team credit card up to a threshold; security review above it | Monthly subscription |
| Disqualifiers | On-prem only, regulated sector we cannot serve | Free-only expectations |

Build it from evidence: best current customers by retention, expansion and time-to-value; lost deals and churn reasons; interviews. Revisit quarterly.

## Personas in the Buying Group

| Role | Cares about | Content they need |
|---|---|---|
| User | Daily workflow, speed | Product tour, docs, templates |
| Champion | Visible win, career | Business case, internal pitch deck |
| Economic buyer | ROI, budget, risk | Pricing, ROI model, references |
| Technical evaluator | Integration, security, scale | Architecture docs, security pack, trial |
| Blocker (procurement, legal, security) | Compliance, terms | DPA, SOC 2 report, standard contract |

## Segmentation and Beachhead

Score candidate segments and pick one to win first:

| Criterion | Question |
|---|---|
| Pain | How acute and frequent is the problem? |
| Fit | How well does the product solve it today (no custom work)? |
| Reachability | Can we reach them cheaply through known channels/communities? |
| Willingness to pay | Budget exists? Price sensitivity? |
| Size | Enough accounts to reach the next milestone? |
| Reference value | Will wins here persuade adjacent segments? |

Win the beachhead (high share, strong references), then expand to adjacent segments that reuse the product and references.

## GTM Motions

| Motion | How customers buy | Fits | Requires |
|---|---|---|---|
| Product-led (PLG) | Self-serve signup, free tier/trial, in-product upgrade | Low ACV, fast time-to-value, individual or team adoption | Excellent onboarding, instrumentation, self-serve billing |
| Sales-led | Demos, evaluation, negotiated contract | High ACV, complex buying groups, integration/security reviews | Sales team, pipeline management, solutions engineering |
| Product-led sales (hybrid) | Self-serve adoption, sales engages accounts with usage signals | Bottom-up adoption that grows into enterprise deals | Product-qualified lead (PQL) scoring, CRM integration |
| Partner/channel-led | Resellers, marketplaces, SIs, cloud marketplaces | Buyers purchase through existing vendors/budgets | Partner program, enablement, margins |
| Community-led | Open source / community drives awareness and adoption | Developer tools, open-core | Community investment, clear commercial boundary |

Price point is a strong constraint: low ACV cannot pay for long human-assisted sales cycles; high-complexity enterprise deals rarely close self-serve.

## Value Proposition and Messaging Basics

```
For <ICP/persona> who <pain/trigger>,
<product> is a <category> that <key benefit>.
Unlike <main alternative>, we <differentiator with proof>.
```

Alternatives include doing nothing, spreadsheets and internal tools, not only direct competitors. Messaging details are in `positioning-guide.md`.

## Pricing Alignment

- Value metric aligned with how customers get value (seats, usage, projects) and with the motion (self-serve plans need simple, transparent pricing).
- Packaging: free/trial tier for PLG; tiers that map to segments (team, business, enterprise).
- Enterprise requirements (SSO, audit logs, SLAs) commonly sit in higher tiers.

## Core GTM Metrics by Motion

| Motion | Leading indicators | Outcome metrics |
|---|---|---|
| PLG | Signups, activation rate, time-to-value, PQLs | Free-to-paid conversion, net revenue retention |
| Sales-led | Qualified pipeline, win rate, sales cycle length | New ARR, CAC payback |
| Partner | Partner-sourced pipeline, certified partners | Partner-sourced revenue |

Definitions and measurement methods are in `go-to-market-advanced.md`.

## Checklist
- [ ] ICP and disqualifiers based on customer evidence
- [ ] Buying-group personas with needed content
- [ ] Beachhead segment chosen with scoring rationale
- [ ] GTM motion consistent with ACV and product complexity
- [ ] Value proposition against real alternatives
- [ ] Pricing/packaging aligned with motion and segments
- [ ] Leading and outcome metrics defined per motion
