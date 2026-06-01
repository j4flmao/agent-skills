# Growth Engineering Fundamentals

## Overview
Growth engineering designs and executes product-led growth initiatives: activation optimization, viral loops, referral mechanics, and conversion experiments. The discipline applies engineering and analytical rigor to growth — treating growth as a system to be measured, modeled, and optimized rather than a marketing function. Growth engineering focuses on building growth mechanics into the product itself.

## Core Concepts

### Concept 1: Growth Loops vs Funnels
A funnel is linear: users enter at the top and exit at the bottom. A loop is self-reinforcing: output becomes input. In a growth loop, a user's action generates new users who then perform actions that generate more users. Loops compound over time — the longer they run, the more powerful they become. Funnels are for understanding conversion; loops are for driving sustainable growth.

### Concept 2: Activation is Everything
Activation is the moment a user experiences core value for the first time. Until users activate, they have not experienced why they should continue using the product. Activation rate is the most important growth metric — it determines how many acquired users become retained users. Fix activation before scaling acquisition. A leaky bucket cannot be filled by pouring more water.

### Concept 3: AARRR Framework
Acquisition: users discover the product. Activation: first value experience. Retention: users return. Revenue: users pay. Referral: users invite others. Growth engineering focuses primarily on Activation, Retention, and Referral — the stages driven by product experience rather than marketing spend.

### Concept 4: The Aha Moment
The Aha moment is the specific action where users realize the product's value. It must be: a specific user action, performed within a defined timeframe, correlated with long-term retention. Find it through data analysis: what action, how many times, within what timeframe best predicts retention? Once identified, optimize every part of onboarding to accelerate reaching this moment.

### Concept 5: Experiment Velocity
Growth is a number of experiments per week, not a number of features shipped. High experiment velocity is the strongest predictor of growth team success. Each experiment tests a hypothesis, generates learning (even when it fails), and compounds over time. Target minimum experiment velocity: 1 per week per growth engineer.

## Activation Optimization

### Defining Activation
Activation must be a specific user action, not time elapsed or pages viewed. Examples: "created a project with a teammate," "completed first transaction," "connected data source." Validate activation definition by comparing retention of users who hit vs miss the activation event. Target: activated users should have 2x+ higher D30 retention than non-activated users.

### Time-to-Value (TTV)
Measure time between signup and activation. Segment TTV by acquisition channel, plan tier, user role, device. Shorter TTV correlates with higher retention. Target: <5 minutes for consumer products, <30 minutes for B2B. Identify segments with highest TTV and target them for optimization.

### Activation Flow Optimization
Remove unnecessary steps from activation: optional fields, non-essential setup, tutorials before value, excessive data entry. Prefill data where possible. Use progressive onboarding: show features in order of value discovery, not complexity. Offer template-based starting points. Guide users with clear progress indicators. Celebrate milestone completion.

## Viral Mechanics

### K-Factor
K-factor = I × C where I = average number of invites sent per user, C = conversion rate of invites to activated users. K > 1.0 means viral growth (each user brings more than one new user). K < 1.0 means the loop leaks and requires paid acquisition to sustain growth. Track K-factor weekly — it changes with product, market, and season.

### Viral Cycle Time
Time from invite sent to invitee activated. Shorter cycle time = faster compounding. A loop with K=0.8 and 1-day cycle time grows faster than a loop with K=0.9 and 30-day cycle time. Optimize: invite friction (one-click share, deep links), invite-to-signup flow (landing page with context), signup-to-activation (immediate value).

### Referral Program Design
Two-sided rewards (both referrer and referee benefit) outperform one-sided by 3-5x. Reward should align with product value: premium features, extended access, additional capacity. Time the referral prompt: offer after user has experienced value, not before. Integrate referral into natural sharing moments (after export, after collaboration, after achievement).

## Experiment Pipeline

### Hypothesis Formation
Every experiment starts with a hypothesis: "If we change {X}, then {metric} will change by {amount} because {reason}." The "because" is essential — it captures the assumed mechanism and enables learning from failed experiments (was the mechanism wrong or the implementation flawed?).

### ICE Prioritization
Score each experiment: Impact (1-10), Confidence (1-10), Ease (1-10). Score = I × C / E. Impact: how much will this move the growth metric? Confidence: how certain based on data and research? Ease: how quick and simple to implement? Keep top 5-10 experiments queued at all times.

### Experiment Lifecycle
Idea → Score into backlog → Design → Build → Launch → Monitor → Analyze → Decide → Document. Each stage has exit criteria. Failed experiments are as valuable as successful ones — document learnings. Share experiment results weekly with the broader team.

## Key Points
- Growth loops compound; growth funnels are linear — design loops
- Fix activation before scaling acquisition
- K-factor > 1.0 enables sustainable viral growth
- Viral cycle time matters as much as K-factor
- Two-sided referral rewards outperform one-sided
- Aha moment must be validated with retention data
- Experiment velocity is the #1 predictor of growth team success
- Shorter time-to-value correlates with higher retention
- Progressive onboarding drives higher activation
- Document failed experiments as rigorously as successful ones
- ICE prioritization keeps the experiment pipeline flowing
- Growth metrics must be tracked weekly, not monthly
- Align referral rewards with product value, not monetary incentives
- Growth engineering builds mechanics into the product, not marketing campaigns
- Test one variable at a time — compound experiments are hard to attribute
