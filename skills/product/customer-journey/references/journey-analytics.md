# Journey Analytics

## Overview
Journey analytics quantifies how customers move through lifecycle stages and touchpoints, identifying where they succeed, struggle, or abandon. Combines funnel analysis, path analysis, segmentation, and experience metrics.

## Funnel Analysis

### Funnel Construction
Define steps in order for a specific goal. Steps must be sequential and non-overlapping. Events must be consistent across users. Timebox each funnel (e.g., 7-day window from entry to conversion). Keep funnels to 3-7 steps for actionability.

Standard growth funnels:
Awareness: impression → click → visit → engaged session.
Activation: signup → first key action → repeat action.
Conversion: trial → payment → first paid action.
Onboarding: registration → profile complete → feature discovery → first value.

### Drop-Off Analysis
For each step: how many users enter, how many advance to next step, drop-off count and rate. Compare absolute drop-off (raw numbers) and relative drop-off (percentage leaving each step). Identify where majority of leakage occurs. Segment drop-off by device, source, plan, user attributes.

### Step Completion Metrics
Step completion rate: users who reach end / users who started.
Per-step conversion: users who advance / users at step.
Abandonment rate: users who leave / users at step.
Time between steps: delay indicating friction.
Revisit rate: users who come back after abandoning.

## Time-to-Value (TTV)

### Definition
Time elapsed between a user's first interaction and their first experience of meaningful value. Shorter TTV correlates with higher activation and retention. Benchmark TTV by segment and track trend over time.

### Measurement
T0: account creation timestamp. T1: first key action timestamp (invite teammate, create project, complete workflow). Calculate TTV = T1 - T0. Set target TTV based on product complexity. Segment by plan, acquisition channel, user role.

### TTV Optimization
Reduce steps to first value experience. Pre-configure default settings. Provide guided setup wizards. Offer template-based starting points. Trigger timely onboarding communications. Measure impact of each TTV reduction on activation and retention.

## CSAT at Journey Stages

### Survey Cadence
Place micro-surveys at key journey milestones: after signup, after first value, after support interaction, after billing, after feature launch. Keep to single question — "How satisfied are you with [specific experience]?" Use 5-point scale. Trigger immediately after the experience, not batched.

### Stage-Level CSAT Analysis
Map CSAT scores to lifecycle stages and touchpoints. Identify stages with below-baseline satisfaction. Compare CSAT by segment, channel, time period. Correlate low stage CSAT with overall churn risk.

### Leading Indicator Correlations
Low onboarding CSAT → higher 7-day churn risk. Low support CSAT → lower NPS at next survey. Low billing CSAT → higher payment failure rate. Track correlations quarterly and update risk models.

## Path Analysis

### Goal
Understand all the routes users take through the product — not just the ideal path. Find common deviations, unintended usage patterns, and dead ends.

### Path Visualization
Start-end analysis: what are the first and last actions in a session? Common sequences: what action pairs occur most frequently? Path clusters: group users by behavioral patterns. Entry and exit pages for each session. Loop detection: where do users get stuck in cycles?

### Path Optimization
Identify the highest-converting paths and optimize them. Find dead-end paths and add next-step guidance. Detect loop patterns and add escape routes. Compare power user paths vs. churning user paths.

## Segmentation

### Segmentation Dimensions
Demographic: plan tier, company size, industry, region, role.
Behavioral: usage frequency, feature adoption, session depth, power user vs. casual.
Acquisition: source, channel, campaign, referral type.
Temporal: cohort by signup month, lifecycle stage, tenure.

### Journey Comparison
Compare funnel conversion across segments. Which segments have highest drop-off at each stage? Which segments have shortest TTV? Which segments show highest CSAT? Target optimization at worst-performing segments first.

## Measurement Framework

### Key Metrics Per Stage
Awareness: reach, impressions, CTR, cost per visit.
Consideration: engagement rate, pages per visit, demo requests, trial starts.
Conversion: conversion rate, CPA, time to purchase, cart abandonment.
Retention: DAU/MAU, session frequency, churn rate, feature stickiness.
Advocacy: NPS, referral rate, review rating, organic mentions.

### Leading vs Lagging Indicators
Leading: engagement trend, support ticket volume, session frequency, feature adoption rate.
Lagging: churn rate, revenue retention, LTV, annual NPS.

### Dashboard Design
Row 1: overall journey health score (composite of stage metrics). Row 2: funnel conversion with drop-off callouts. Row 3: CSAT by stage with trend lines. Row 4: segment comparison (best vs worst performing). Auto-alert when any metric drops below threshold.

## Key Points
Funnel analysis without segmentation hides important patterns.
CSAT surveys must be contextual to the specific experience, not generic.
Time-to-value is a leading indicator of retention — invest in reducing it.
Path analysis reveals the real user journey, not the designed one.
Segment comparison shows where to invest optimization resources.
Leading indicators predict churn before it happens — monitor them weekly.
