# Growth Engineering Advanced Topics

## Introduction
Advanced growth engineering covers data-driven growth models, sophisticated experimentation, PLG at scale, advanced viral dynamics, and growth team operations. These techniques enable growth teams to move beyond basic mechanics to predictive, automated, and portfolio-driven growth systems.

## Advanced Experimentation

### Bayesian vs Frequentist Statistics
Frequentist statistics (p-values, confidence intervals) are the industry standard but have limitations: they can't quantify the probability that a treatment is better, they require fixed sample sizes, and they're unintuitive for non-statisticians. Bayesian methods address these limitations: produce direct probability statements ("87% probability treatment is better"), support continuous monitoring, incorporate prior knowledge. Implement Bayesian analysis alongside frequentist for better decision-making.

### Multi-Armed Bandit Experiments
Bandits dynamically allocate traffic to better-performing variants, reducing opportunity cost compared to fixed A/B tests. Use epsilon-greedy (allocate X% to exploration, rest to best-known variant) or Thompson sampling (allocate proportional to probability of being best). Bandits are best for: long-running optimizations, when opportunity cost of suboptimal traffic allocation is significant. Use traditional A/B tests when: you need to understand why something worked, statistical rigor is critical.

### Interaction Effect Detection
When running multiple experiments simultaneously, test for interaction effects: does Experiment A change the effect of Experiment B? Use factorial designs (full or fractional) to test multiple variables and their interactions. Detect interactions before making permanent changes. Typical interaction effects in growth: pricing experiment interacts with feature launch, onboarding experiment interacts with referral experiment.

### Experiment Results Segmentation
Never analyze experiment results only in aggregate. Segment by: acquisition channel, user tenure, device type, plan tier, geo, persona. A feature that wins overall but loses for the primary persona is not a win. Use hierarchical Bayesian models for reliable segment-level estimates when segment sample sizes are small. Report segment-level results alongside aggregate.

## PLG at Scale

### PLG Maturity Model
| Level | Characteristics | Key Metrics |
|-------|----------------|-------------|
| 1: Sales-led | No self-serve, sales qualified leads | Demo requests, sales pipeline |
| 2: Hybrid | Self-serve signup + sales follow-up | Free-to-paid conversion, sales-assisted conversion |
| 3: PLG-led | Self-serve through paid conversion | Activation rate, self-serve conversion, LTV/CAC |
| 4: PLG-optimized | Product usage drives all growth | North Star metric, growth efficiency, net revenue retention |

### Self-Serve to Sales Handoff
Design clear handoff triggers: user hits usage limit (time for upgrade), user requests enterprise feature (SSO, SLA, audit logs), account reaches threshold users (time for sales engagement), user demonstrates PLG qualification (high activation, high engagement). Handoff should feel natural: in-app upgrade path for self-serve, sales outreach for enterprise. Measure handoff efficiency: % of qualified leads accepted, time from qualification to first contact, conversion rate of handoff leads.

### PLG Unit Economics
Track PLG-specific unit economics separately from sales-led. PLG CAC: product development cost + self-serve infrastructure + content creation / new PLG customers. PLG LTV: lower than enterprise LTV but also lower CAC. PLG payback period should be <12 months. Compare PLG unit economics to sales-led to determine optimal channel mix.

### Product-Qualified Leads (PQL)
Identify users who have demonstrated enough product usage to be ready for sales engagement. PQL criteria: activated user who hit usage threshold, user invited team members (collaboration signal), user requested feature not available on current plan. Score PQLs by likelihood to convert using historical data. Route high-scoring PQLs to sales, medium to automated nurture, low to in-app upsell.

## Advanced Viral Dynamics

### Network Effects
Viral growth is a type of network effect where the product becomes more valuable as more people use it. Differentiate between: direct network effects (more users = more value, like messaging), data network effects (more users = more data = better product, like recommendations), and cross-side network effects (more users on one side = more value to other side, like marketplaces).

### Viral Coefficient Modeling
Beyond simple K-factor, model viral growth with: generation-based modeling (track users through generations of referral), S-curve fitting (viral growth follows S-curve — slow start, exponential middle, saturation), compartmental models (susceptible-infected-recovered models adapted from epidemiology). Validate model predictions against actual growth data. Adjust for seasonality, platform changes, competitive dynamics.

### Viral Saturation and Re-Acceleration
Every viral loop eventually saturates — the most reachable users convert first, remaining users are harder to reach. Detect saturation: declining K-factor despite optimization, increasing CAC from viral channels, decreasing conversion rate of invites. Strategies to re-accelerate: add new viral loops (new channels, new invite mechanisms), expand to adjacent markets (new geos, new segments), increase product value to justify broader sharing.

## Growth Team Operations

### Growth Team Structure
Three common models: **Pod model** (dedicated cross-functional growth team: PM, engineer, designer, analyst — highest velocity, most common), **Compose model** (growth engineers embedded in product teams — better for large orgs, harder to coordinate), **Center of excellence model** (central growth team provides tools and methodology, product teams execute — scales best, slowest initially). Choose based on organization size and growth maturity.

### Growth Accounting
Decompose total growth into sources: organic (virality, referrals, content loops), paid (ads, sponsorships), product (integrations, API, embed, marketplace), and owned (email, SEO, content). Calculate growth efficiency = (organic + product) / total new users. Target >0.7. Track monthly and shift investment toward highest-efficiency sources.

### Growth vs Core Trade-offs
Growth engineering sometimes conflicts with core product experience. A growth mechanic that increases signups but degrades experience for existing users is not a net win. Establish guardrails: growth experiments must not degrade core metrics (retention, NPS, task completion, support volume). Create a growth review board with product leadership to approve experiments that touch core experience. Sunset growth mechanics that no longer provide sufficient value.

## Key Points
- Bayesian statistics enable more intuitive growth experiment analysis
- Multi-armed bandits reduce opportunity cost in long-running experiments
- Test for interaction effects when running concurrent experiments
- Segment experiment results — aggregate can hide persona-specific harm
- PLG maturity progresses from sales-led to fully product-driven
- Self-serve to sales handoff must feel natural, not forced
- PQL scoring enables efficient sales resource allocation
- Network effects create defensible growth moats
- Viral growth follows S-curve — plan for saturation
- Re-accelerate growth by adding new loops, not just optimizing existing ones
- Growth team structure should match organization size and maturity
- Growth efficiency measures how much growth comes from non-paid sources
- Guardrails prevent growth mechanics from degrading core experience
- Growth vs core trade-offs require explicit governance
- PLG unit economics differ from sales-led — track separately
- Generation-based models predict viral growth trajectories
- Viral saturation is inevitable — prepare re-acceleration strategies
- Product-qualified leads enable efficient growth-to-sales handoff
