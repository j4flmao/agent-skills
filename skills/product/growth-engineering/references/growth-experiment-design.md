# Growth Experiment Design

## Overview
Growth experiment design applies structured experimentation to growth engineering initiatives: viral loop optimization, activation improvement, referral mechanics, conversion optimization, and retention engineering. Growth experiments differ from standard product A/B tests in their focus on compounding effects, loop dynamics, and leading indicator metrics. This reference covers experiment design specifically for growth — hypothesis formation, metric selection, design patterns, execution, and analysis.

## Growth Experiment Fundamentals

### What Makes Growth Experiments Different
Growth experiments target compound growth metrics rather than isolated step improvements. A standard A/B test might ask: "Does this button color increase click rate?" A growth experiment asks: "Does this change to the referral flow increase the K-factor enough to generate sustainable organic growth?"

Key differences: growth experiments often measure second-order effects (how does a change in activation affect referral behavior?). Growth experiments need longer observation periods to capture loop dynamics (a change in invite friction affects K-factor which affects acquisition which affects the next loop cycle). Growth experiments use different metric hierarchies — leading indicators (activation rate, invite rate) are as important as lagging outcomes (revenue, retention).

### The Growth Experimentation Mindset
Speed of learning matters more than perfection. Growth runs multiple experiments per week. Not every experiment needs 95% statistical confidence — 80% confidence is acceptable for low-effort, low-risk experiments if the learning value is high.

Documentation of learning matters as much as experiment outcome. A well-designed experiment that disproves a hypothesis is as valuable as one that confirms it. Growth experiments generate compound learning — each experiment informs the next.

Failure is expected and productive. A 50% win rate on growth experiments is excellent — the other 50% provide data on what does not work, preventing wasted investment on bad ideas.

### Experiment Types in Growth

Activation experiments: changes to onboarding flow, signup process, first-use experience, tutorial design. Primary metric: activation rate (users reaching Aha moment within defined timeframe). Secondary: TTV, feature discovery, time to first action.

Conversion experiments: changes to pricing page, feature gating, trial structure, upgrade flow. Primary metric: trial-to-paid conversion rate or free-to-paid conversion rate. Secondary: average revenue per user, upgrade velocity, downgrade rate.

Referral experiments: changes to referral program design, invite flow, reward structure, invitee experience. Primary metric: K-factor or referral conversion rate. Secondary: invite rate, invitee activation rate, viral cycle time.

Retention experiments: changes to re-engagement notifications, feature discovery, habit formation, churn reduction. Primary metric: retention rate (D7, D30, D90) or churn rate. Secondary: session frequency, feature stickiness, time between sessions.

Loop experiments: changes that affect the full growth loop — how acquisition, activation, revenue, and referral interact. Primary metric: loop amplification factor or organic growth rate. Secondary: stage conversion rates, cycle time.

## Hypothesis Formation for Growth

### Sources of Growth Hypotheses

Analytics data: high drop-off points in activation funnel, low conversion at specific funnel steps, segments with unusually low retention, features with low adoption despite high value. Use data to identify opportunities and formulate hypotheses about root causes.

User research: onboarding friction points identified in usability testing, reasons for not referring (did not know, no incentive, too much friction), feature requests that indicate value, churn reasons from exit surveys.

Competitive analysis: growth mechanics used by competitors (referral programs, onboarding flows, pricing structures), competitive advantages in activation or conversion, patterns from successful growth companies in adjacent markets.

Industry patterns: proven growth mechanics from other products (two-sided referral rewards, usage-based gating, template-based onboarding, social proof in conversion). Adapt to your product context, do not copy directly.

Team expertise: insights from team members based on domain knowledge, past experience, and product intuition. Validate with data before investing in implementation.

### Hypothesis Structure for Growth

Growth hypotheses use the same If/Then/Because structure as standard experiments but with growth-specific elements:

"If {change} in the {growth stage} for {target segment}, then {growth metric} will {direction} by {effect size} within {timeframe}, because {mechanism}."

Example: "If we add team member invitation during signup (before empty state) for new users, then activation rate will increase by 15% within 7 days, because users who see collaboration value immediately are more likely to reach the Aha moment of project completion with teammates."

Growth hypotheses should specify: the exact change, the target segment (all users or specific subset), the growth metric affected, the expected effect size with direction, the timeframe for measurement, and the mechanism (why the change should work).

### Prioritization for Growth

Growth experiments must be prioritized aggressively — there are always more ideas than resources. Use a scoring framework:

ICE Score: Impact (1-10) × Confidence (1-10) / Ease (1-10). Impact: how much will this improve the target growth metric? Confidence: how confident are we based on data and research? Ease: how quick and simple is the implementation?

RICE Score: Reach (1-10) × Impact (1-10) × Confidence (1-10) / Effort (1-10). Reach adds the number of users affected. Better for experiments where reach varies significantly.

Growth-specific prioritization considerations: Does this experiment affect the growth loop (compound impact) or a linear funnel (one-time impact)? Loop experiments have higher potential return. Does this experiment unlock future experiments (enabling experimentation velocity)? Some experiments are worth doing because they enable faster learning downstream. Does this experiment target the biggest bottleneck in the growth funnel? Apply the bottleneck principle: resources should go to the stage with the highest improvement potential.

### Hypothesis Validation Before Implementation

Before building a growth experiment, validate the hypothesis with lightweight methods:

Data analysis: does historical data support the hypothesis? Do users who behave in the proposed way have better outcomes? Quick SQL queries can validate or invalidate hypotheses before implementation.

User interviews: talk to 5-10 users in the target segment. Do they confirm the hypothesized behavior or friction? Often, a few interviews reveal that the hypothesis is wrong.

Prototype testing: build a lightweight prototype (Figma, landing page, email mockup) and test with users. Does the proposed change elicit the expected response?

Desk research: have other products tried this approach? What were the results? Published growth case studies and talks provide valuable evidence.

## Metric Selection for Growth Experiments

### Primary Metrics
The primary metric determines the experiment outcome. It must be: sensitive enough to detect the expected effect within the experiment duration, reliable (stable measurement, low noise), leading (predicts the downstream outcome of interest), and directly affected by the change.

For activation experiments: activation rate within N days. Define activation precisely and consistently.

For conversion experiments: trial-to-paid conversion rate within N days. Must account for delayed conversions (users who convert after the experiment period).

For referral experiments: K-factor (invite rate × conversion rate) or referral-activated users per period. Monitor both components separately to understand which drives changes.

For retention experiments: retention rate at N days (D7, D30, D90). Day-specific retention requires long experiment durations for statistical significance.

### Secondary Metrics
Secondary metrics help understand why the experiment worked (or did not). They provide mechanistic insight:

For activation experiments: TTV, steps to activation, time per step, feature discovery count, error rate during onboarding.

For conversion experiments: upgrade page views, feature usage before upgrade, trial length before conversion, payment method distribution.

For referral experiments: invite rate, invitee activation rate, invite channel distribution, invitee first session actions.

For retention experiments: session frequency, session depth, feature adoption, time between sessions, support contact rate.

### Guardrail Metrics
Guardrail metrics ensure the experiment does not harm the core experience:

Core engagement metrics: DAU/MAU, session frequency, total time in product. Any decrease in core engagement suggests the change, while improving the target metric, harms overall experience.

Support metrics: support ticket volume, CSAT, response time. Increases in support volume indicate confusion or friction introduced by the change.

Revenue metrics: total revenue, ARPU, downgrade rate. The change should not reduce overall revenue even if it improves the target metric.

Quality metrics: error rate, page load time, crash rate for app changes. Technical degradation is never acceptable.

### Leading vs. Lagging Metrics in Growth
Growth experiments require both leading and lagging metrics:

Leading metrics predict future growth outcomes: activation rate (predicts retention), feature adoption (predicts engagement), invite rate (predicts organic acquisition), TTV (predicts conversion). Leading metrics change quickly and are sensitive to experiments.

Lagging metrics confirm growth outcomes: retention rate, LTV, revenue, organic growth rate, churn rate. Lagging metrics take longer to change but are the ultimate measures of success.

Growth experiment design should use leading metrics as primary and track lagging metrics as secondary confirmation. This enables faster experiment cycles (measure activation impact in 1-2 weeks instead of waiting 90 days for retention data).

## Experiment Design Patterns for Growth

### Activation Experiment Patterns

Progressive onboarding: reveal features in order of value discovery. New users see the simplest, most valuable feature first. Advanced features are introduced after activation. Hypothesis: reducing cognitive load during onboarding increases activation rate.

Template-based starting: offer pre-built templates that users can customize. Reduces blank-slate paralysis. Hypothesis: templates reduce TTV and increase activation rate by demonstrating value before effort.

Social onboarding: encourage collaboration or social interaction during onboarding. Invite teammates, share first output, connect with friends. Hypothesis: social context during onboarding increases commitment and activation.

Guided wizard: step-by-step setup flow with clear progress indicator. Each step has a clear purpose and delivers value. Hypothesis: guided wizards complete more of the activation flow than undirected exploration.

Usage-based activation trigger: activate a feature through use rather than reading about it. Show a tooltip, nudge, or prompt at the moment of need. Hypothesis: just-in-time guidance is more effective than pre-training.

### Conversion Experiment Patterns

Usage-based gating: limit usage of key features in the free tier (e.g., 5 exports per month, 3 projects). When users hit the limit, prompt upgrade. Hypothesis: experiencing value before hitting a limit creates stronger conversion intent than feature-based gating.

Feature gating: reserve specific features for paid plans. Choose features that are high-value to users but low-cost to deliver. Hypothesis: removing valuable features at the right moment drives conversion.

Time-based urgency: trial expiration, limited-time discount, early-bird pricing. Creates scarcity and deadlines. Hypothesis: time pressure accelerates conversion decisions for users who are on the fence.

Value comparison: show users what they are missing in the free tier vs. what they could have in paid. Personalized to their usage (features they have used and their limits). Hypothesis: personalized value comparison increases conversion by making the upgrade tangible.

### Referral Experiment Patterns

Two-sided rewards: reward both referrer and referee. The referrer reward incentivizes sharing; the referee reward reduces signup friction. Hypothesis: two-sided rewards increase both invite rate and conversion rate.

Embedded sharing: integrate referral into natural product usage moments. After completing a valuable action, after achieving a milestone, after exporting or sharing output. Hypothesis: embedded sharing at moments of high satisfaction produces higher invite rates.

Frictionless invite: one-click invite with deep links, contact access, pre-filled message. Reduce every possible barrier to sending an invite. Hypothesis: reducing invite friction to one click increases invite rate by 3-5x.

Delayed reward: reward referrer only after referee activates (not just signs up). Aligns incentives with quality referrals. Hypothesis: delayed rewards produce higher-quality referrals with better activation rates.

### Retention Experiment Patterns

Habit loop design: trigger (notification) → action (use feature) → reward (accomplishment). Design notifications and prompts that create usage habits. Hypothesis: habit loops increase session frequency and reduce time between sessions.

Feature discovery sequence: introduce features over time rather than all at once. Each new feature creates a re-engagement opportunity. Hypothesis: progressive feature discovery increases long-term engagement by providing novelty and expanding value.

Re-engagement triggers: personalized notifications based on user behavior and inactivity duration. Different triggers for different inactivity periods (1 day, 7 days, 30 days). Hypothesis: behaviorally-timed re-engagement notifications outperform fixed-schedule notifications.

Usage milestones: celebrate user achievements (10th export, 50th task completed, first team project). Milestone recognition reinforces behavior. Hypothesis: milestone celebrations increase feature stickiness and reduce churn.

## Experiment Execution for Growth

### Sample Size and Duration Considerations
Growth experiments often have smaller effect sizes than standard product experiments. A 5% improvement in activation rate is significant for growth but requires larger sample sizes to detect. Plan accordingly.

Minimum detectable effect for growth: growth experiments typically target MDE of 5-20% relative improvement. Smaller effects (1-5%) require very large samples and long durations. Prioritize high-MDE experiments early.

Duration: activation and referral experiments: minimum 7-14 days to capture weekly cycles and account for delayed behavior (users who sign up and activate later). Conversion experiments: 14-30 days to account for trial duration and delayed conversion. Retention experiments: 30-90 days to measure impact on long-term retention. For shorter experiments, use leading indicators (activation rate, feature adoption) as proxy metrics.

### Segment Analysis in Growth
Growth experiments must be analyzed by segment to avoid Simpson's paradox and identify differential effects:

By acquisition channel: a change that improves activation for organic users may hurt it for paid users. Segment by channel and report results separately.

By product usage: heavy users, moderate users, and light users respond differently to changes. Segment by pre-experiment usage level.

By plan: free users and paid users have different motivations and behaviors. Segment by plan tier.

By tenure: new users and existing users respond differently. New users have no baseline — they experience the change as the default. Existing users compare the change to their previous experience.

### Preventing Interaction Effects
Multiple concurrent growth experiments can interact, biasing results:

Within-funnel interaction: two experiments affecting the same funnel step (e.g., both changing the onboarding flow). Cannot run simultaneously — run sequentially.

Cross-stage interaction: an activation experiment changes the user population that reaches the conversion stage, potentially biasing a concurrent conversion experiment. Use holdout groups or run sequentially.

Loop interaction: a referral experiment changes the acquisition mix, affecting the user population for all downstream experiments. Use experiment layers or dedicated experiment populations.

### Running Growth Experiments at Velocity
High-velocity growth experimentation requires infrastructure and process:

Experiment queue: maintain a prioritized queue of 10-20 experiment ideas. Always have the next experiment ready to launch when the current one finishes.

Rapid implementation: growth experiments should take 1-5 days to implement. If an experiment takes longer, it is too complex — break it into smaller experiments.

Parallel execution: run experiments on different funnel stages in parallel. Activation experiments + referral experiments + retention experiments can run simultaneously if they affect different user actions.

Weekly experiment review: review running and completed experiments weekly. Decide: implement winning experiments, iterate on inconclusive results, reject losing experiments. Update experiment queue.

### Experiment Documentation
Document every growth experiment regardless of outcome:

Pre-experiment: hypothesis, experiment design, metrics, target segment, expected duration, MDE.

Post-experiment: results (primary, secondary, guardrail metrics), segment analysis, statistical significance, decision (implement/iterate/reject), learnings about user behavior, next steps.

Repository: maintain a searchable, shared experiment log. Enable cross-team learning. Conduct quarterly experiment retrospectives to identify patterns across experiments.

## Growth Experiment Analysis

### Statistical Methods for Growth
Growth experiments use the same statistical methods as standard experiments but with additional considerations:

Activation metrics: proportion metrics (activated vs. not activated). Use z-test or chi-squared test for significance. Report absolute and relative improvement.

Time-to-value metrics: time-based metrics (hours to activation). Use t-test or Mann-Whitney for significance. Report median TTV rather than mean (distributions are typically right-skewed).

Retention metrics: survival analysis (time to churn, time between sessions). Use Kaplan-Meier curves and log-rank test. Report hazard ratios.

K-factor metrics: product of two rates (invite rate × conversion rate). Use delta method for variance estimation. Report K-factor with confidence interval.

### Special Considerations for Growth Metrics

Delayed effects: growth experiments often show effects that change over time. An activation change may show strong early effects that fade as novelty wears off, or weak early effects that compound over time. Analyze results over the full experiment duration, not just the first few days.

Novelty effects: users respond positively to change simply because it is new. Compare early-period vs. late-period results. If the effect is declining, extend the experiment to measure the steady-state effect.

Primacy effects: existing users prefer the familiar experience and may react negatively to change. New users show the true treatment effect. Segment by new vs. existing users.

Compound effects: growth changes compound over multiple loop cycles. A referral improvement that increases K-factor from 0.4 to 0.6 will show small effects in the first week but significant effects over 3 months. Use growth models to project long-term impact from short-term data.

### Decision Framework for Growth
Positive result with statistical significance: implement if the effect exceeds MDE, no guardrail violations, and the result is consistent across segments. Roll out to all users.

Positive result without statistical significance: if the effect direction is promising (consistent across segments, plausible mechanism), consider extending the experiment or running a follow-up with larger sample. Do not implement based on direction alone.

Negative result with statistical significance: if the primary metric degraded or guardrail metrics degraded, roll back immediately. Investigate root cause — the change may have introduced unforeseen friction.

Inconclusive result: if the effect is small and not significant, decide based on opportunity cost. If the experiment was low-effort, move on to the next idea. If the hypothesis is still compelling, consider redesigning the experiment.

### Learning from Growth Experiments
Document learning regardless of outcome:
- What did we learn about our users? (behavioral insight)
- What did we learn about the change? (mechanism insight)
- What would we do differently next time? (process improvement)
- What follow-up experiments does this suggest? (pipeline input)

Growth learning compounds. An experiment that disproves a hypothesis saves future investment in similar ideas. An experiment that reveals unexpected user behavior generates new hypotheses. Growth is a learning engine, not an optimization machine.

## Growth Experiment Playbook

### Quick Wins (1-2 days implementation)
- Simplify signup form: remove optional fields, reduce required fields to minimum
- Add social login option (Google, Apple, GitHub)
- Add progress indicator to multi-step onboarding
- Pre-fill data from signup context (company, role, use case)
- Add one-click share button after user completes valuable action
- Add upgrade prompt when user hits free tier limit
- Send activation reminder email at 2 hours, 24 hours, 72 hours post-signup

### Medium Experiments (3-5 days implementation)
- Template-based starting point selection during onboarding
- Team member invitation during signup flow
- Two-sided referral program with in-product invite
- Usage-based gating on key feature (X uses per month for free)
- Personalized value comparison dashboard in account settings
- Progressive feature introduction over first 2 weeks
- Behaviorally-timed re-engagement notification sequence

### Long-term Bets (1-2 weeks implementation)
- Full onboarding redesign with progressive disclosure
- Referral program redesign with rewards aligned to product value
- Freemium model restructuring (what is free, what is paid, gating strategy)
- Viral loop integration into core product experience
- Habit loop design with trigger architecture
- Predictive activation scoring and personalized onboarding paths

## Key Points
- Growth experiments target compound growth metrics (K-factor, activation rate, retention) rather than isolated step improvements.
- Use ICE or RICE prioritization to maintain experiment pipeline velocity.
- Primary metrics must be leading indicators (activation rate, invite rate) for fast experiment cycles.
- Growth experiments need longer durations to capture loop dynamics and delayed effects.
- Segment analysis by acquisition channel is non-negotiable to avoid Simpson's paradox.
- Document every experiment — learning compounds across the team.
- Iterate rapidly: quick wins in 1-2 days, medium experiments in 3-5 days, long-term bets in 1-2 weeks.
- A 50% win rate on growth experiments is excellent — the other 50% prevent wasted future investment.
- Use leading indicators for quick decisions, confirm with lagging metrics over time.
- Growth is a learning engine: each experiment informs the next, regardless of outcome.
