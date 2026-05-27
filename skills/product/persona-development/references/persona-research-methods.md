# Persona Research Methods

## Overview

Persona research methods encompass the qualitative and quantitative techniques used to gather data about target users. Rigorous research is the foundation of credible personas — without it, personas are stereotypes. This reference covers the full research lifecycle: planning, recruitment, data collection, analysis, synthesis, and ethics.

## Research Planning

### Defining Research Questions

Research questions guide the investigation. They should be specific, actionable, and grounded in product goals.

```
Poor: "What do users want?"
Better: "How do marketing managers evaluate email campaign tools?"
Best: "What decision criteria do marketing managers at mid-sized B2B companies use when selecting between email campaign platforms?"
```

**Framework:** Identify the knowledge gap → Frame as a question → Scope appropriately → Prioritize by impact.

### Formulating Hypotheses

```
Hypothesis format:
We believe that [user segment] has [need/pain point]
We will know this is true when we see [evidence]
This matters because [impact on product/design]
```

### Sampling Strategies

**Probability sampling (quantitative):**
- Simple random: every user has equal chance. Requires complete user list.
- Stratified: divide population into subgroups, sample proportionally.
- Cluster: randomly select groups, study all members of selected groups.
- Systematic: select every nth user from a sorted list.

**Non-probability sampling (qualitative):**
- Purposive: deliberately select participants matching criteria. Most common for persona research.
- Snowball: existing participants refer others. Useful for hard-to-reach populations.
- Quota: fill predefined quotas for each subgroup.
- Convenience: whoever is available. Fast but biased. Avoid for persona research.

**Sample size guidelines:**
- Qualitative interviews: 8-12 per persona segment
- Surveys: 100-400 per segment (for 95% confidence, 5% margin of error)
- Diary studies: 10-20 participants for 7-14 days
- Field studies: 6-10 site visits

```
Sampling plan template:

Persona segment: Marketing Managers at B2B SaaS companies
Method: Purposive + stratified by company size
Target: 8-12 interviews per persona
Criteria:
  - Title: Marketing Manager, Marketing Director, or equivalent
  - Company size: 5-50 (40%), 51-200 (35%), 201+ (25%)
  - Product usage: active (60%), churned (20%), trial (20%)
  - Geographic diversity: at least 2 regions
```

## Participant Recruitment

### Screening Criteria

Screening ensures participants match persona characteristics. Use screening surveys before scheduling.

```
Screening questionnaire:

1. What is your current job title? [open text]
2. Company size: 1-10 / 11-50 / 51-200 / 201-1000 / 1000+
3. Which of these tools do you use regularly? [select all that apply]
4. Are you involved in purchasing decisions? [decision maker / influencer / not involved]
5. How frequently do you use [product type]? [daily / weekly / monthly / rarely / never]
```

### Recruitment Channels

| Channel | Best for | Cost | Lead time |
|---------|----------|------|-----------|
| Customer database | Existing users | Free | 1-3 days |
| User research panel | Repeat participants | Low | Immediate |
| Social media (LinkedIn) | Professional segments | Free/low | 3-7 days |
| Recruitment agencies | Hard-to-reach segments | $200-500/participant | 5-14 days |
| In-product intercept | Current users | Free | Continuous |
| Third-party panels | Broad segments | $50-150/participant | 2-7 days |

### Incentives

```
30-min remote interview: $25-50
60-min remote interview: $50-100
90-min in-person interview: $75-150
Diary study (7 days): $100-200
Focus group (2 hours): $75-150
B2B professionals: $100-200/hour
Enterprise executive: $300-500+
```

### Scheduling

Over-recruit by 20-50% to account for no-shows. Send confirmation with calendar invite, reminders 24h and 1h before. Test recording tools before the session. Have a backup plan (phone dial-in, alternate platform).

## Qualitative Research Methods

### In-Depth Interviews

One-on-one conversations exploring user experiences, behaviors, motivations, and attitudes. The most common method for persona development.

**When to use:** Early-stage discovery, understanding user goals and pain points, exploring mental models, capturing stories.

**When NOT to use:** Validating hypotheses at scale, measuring frequency, comparing statistical differences.

**Format:** 45-90 minutes, remote or in-person, semi-structured, recorded (with consent).

```
Interview guide structure:

I. Introduction (5 min) — Explain purpose, get consent, "no wrong answers"
II. Background (10 min) — Role, day-to-day, tools, team
III. Current behavior (20 min) — "Walk me through the last time you [activity]"
IV. Goals and motivations (10 min) — Success criteria, ideal experience
V. Pain points (15 min) — Frustrations, workarounds, "magic wand" question
VI. Decision-making (10 min) — How they chose current solution, alternatives
VII. Wrap-up (5 min) — Anything else? Thank you, incentive
```

### Contextual Inquiry

Combines interviews with observation in the user's natural environment. Based on the master-apprentice model: the user is the expert, the researcher is the apprentice.

**Core principles:**
1. **Context:** Observe in natural environment, not a lab.
2. **Partnership:** User and researcher collaborate to understand the work.
3. **Interpretation:** Verify understanding with the user during observation.
4. **Focus:** Stay focused on the work, not abstract opinions.

```
Protocol:
Before: Understand domain, prepare observation guide, confirm logistics
During: Observe silently first, ask at natural pauses, capture environment
After: Debrief immediately, tag observations by category, identify patterns
```

**When to use:** Complex workflows, discovering unstated workarounds, studying collaboration and handoffs, environmental factors.

### Ethnographic Studies

Deep, immersive observation over extended periods. Reveals cultural and social factors that influence behavior.

**Types:** Micro-ethnography (2-5 days), focused ethnography (1-4 weeks), full ethnography (1-12 months, rare in product design).

**What ethnography reveals:**
- Unstated rules and norms governing behavior
- Social dynamics and power structures
- Environmental factors (noise, interruptions, distractions)
- Automated workarounds users no longer notice
- Rituals, routines, and habits

```
Field notes template:

Observation ID: E-2024-03-15
Location: Open office floor 3
Participant: Dave, Ops Manager
Focus: Morning handoff process

Notes:
- 09:35 Opens laptop. 47 unread emails. Scans rapidly (2/sec).
- 09:38 Opens "Daily Ops Tracker.xlsx" from desktop.
- 09:41 Alt-tabs between email and spreadsheet, enters data manually.
- 09:47 Gets IM from warehouse. Frowns, types quick reply.
- 09:55 Phone call. Takes notes on sticky pad.
- 10:08 Returns to data entry. Repeats "where was I" check.

Interpretation:
- Heavy context switching (~6 switches in 30 min)
- Manual data entry from email to spreadsheet is a pain point
- Sticky notes appear to be task management
- Multiple interruptions prevent sustained focus
```

### Diary Studies

Participants record experiences, behaviors, and thoughts over time. Captures longitudinal data and in-the-moment context.

**Methods:** Paper diary, digital diary (Dscout, Indeemo, EthOS), video diary, micro-journaling (brief daily prompts), triggered diary (event-based entries).

```
Diary study design:

Duration: 7-14 days | Sample: 10-20 per persona
Entry frequency: 1-3 per day

Day 1-2: Setup, capture current environment
Day 3-10: Daily prompt + event-triggered entries
Day 11-14: Deep dive on workarounds and unmet needs

Analysis: Read all entries (immersion) → Identify recurring themes
→ Tag by emotional valence → Create journey maps → Extract quotes
```

### Focus Groups

Moderated discussions with 5-8 participants. Generate diverse perspectives and reveal social dynamics.

**Strengths:** Quick idea generation, reveals consensus/disagreement, participants build on each other's ideas.

**Weaknesses:** Groupthink, social desirability bias, not suitable for individual workflow depth, difficult scheduling.

## Interview Techniques

### Interview Structure Types

**Structured:** Fixed questions, fixed order. Best for comparing responses, reducing bias. Weakness: cannot explore unexpected topics.

**Semi-structured:** Core questions with flexible follow-up probes. Best for most persona research — balances consistency with depth.

**Unstructured:** No predetermined questions. Best for early exploration. Weakness: hard to compare across participants.

### Question Framing

```
Closed (less useful): "Do you use the reporting feature?" → shallow
Open (more useful): "Tell me about the last time you needed to generate a report." → story, context, emotion
```

**Leading questions to avoid:**
- "How frustrated are you with slow loading times?" (assumes frustration)
- "Wouldn't it be great if we added bulk editing?" (implies expected answer)

**The five whys:** Ask "why" repeatedly to surface root causes.

**Contrasting questions:** "Tell me about a time when [product] helped you" vs "Tell me about a time when it let you down."

**Projection techniques:**
- "If [product] were a person, what kind of person would it be?"
- "What would your ideal day look like with the perfect tool?"
- "If you were the CEO, what's the first thing you'd change?"

## Quantitative Research Methods

### Surveys and Questionnaires

Collect structured data from large samples for statistical analysis and population-level insights.

**When to use:** Measuring behavior frequency, validating qualitative findings at scale, segmenting users, prioritizing features, measuring satisfaction.

**When NOT to use:** Understanding deep motivations (use interviews), exploring unknown domains (use qualitative first), designing detailed workflows (use observation).

**Survey types:**
- Demographic: age, location, job title, company size → segmentation
- Behavioral: frequency, features used, tools → usage patterns
- Attitudinal: satisfaction, preferences, opinions → NPS, CSAT, CES
- Needs assessment: pain points, unmet needs → opportunity identification

### Question Types

**Multiple choice (single select):** "Which best describes your role in purchasing?"
**Multiple choice (multi-select):** "Which tools do you use? (select all that apply)"
**Likert scale:** "Rate agreement: 1-5 (Strongly disagree → Strongly agree)"
**Semantic differential:** Rate on bipolar scales: Complicated ○ ○ ○ ○ ○ Simple
**Ranking:** "Rank features by importance (1=most important)"
**Open-ended:** "What is the single biggest frustration?"

### Likert Scale Design

- 5-point or 7-point scales are most common
- Fully labeled scales are more reliable than endpoint-only
- Include neutral midpoint unless forced-choice is required
- Use reverse-coded items to reduce acquiescence bias
- Avoid double-barreled questions: "The feature is easy to use AND accurate" → separate

### Survey Distribution

| Channel | Response rate | Bias |
|---------|---------------|------|
| In-app widget | 5-15% | Engaged users overrepresented |
| Email list | 10-30% | More engaged respond |
| Social media | 1-5% | Self-selection bias |
| Panel provider | 10-20% | Professional respondents |
| Post-interaction | 20-40% | Recency bias |

**Rate optimization:** Keep under 10 min, show progress bar, mobile-optimize, personalize invitation, send Tue-Thu 10am-2pm, offer incentive, send one reminder after 3-5 days.

### Response Bias Mitigation

**Acquiescence bias:** Include reverse-coded items, use balanced scales, avoid leading questions.

**Social desirability bias:** Anonymize responses, use indirect questioning, normalize negative responses.

**Recency bias:** Randomize answer order (where meaningful).

**Non-response bias:** Compare early vs late responders (late are more like non-respondents), weight responses to match population.

**Satisficing:** Include attention checks ("Select 'Strongly agree' for this question"), screen for speeders, keep survey reasonable length.

## Behavioral Analytics

### Product Analytics

Track user behavior within digital products. Provides quantitative data on what users actually do (vs. what they say they do).

**Key platforms:**

| Tool | Strengths | Best for |
|------|-----------|----------|
| Mixpanel | Event tracking, funnel analysis, retention | Product teams, behavioral cohorts |
| Amplitude | Behavioral analytics, segmentation, predictive | Growth teams |
| Heap | Auto-capture, retroactive analysis | Early-stage, limited engineering |
| Pendo | In-app guides, NPS surveys, feature tagging | Product-led growth |
| FullStory | Session recording, rage clicks | UX research, qualitative context |
| Hotjar | Heatmaps, session recording | UX optimization |
| PostHog | Open-source, session recording, feature flags | Developer-focused teams |

### Event Tracking

Events represent user actions. Use verb_noun format (e.g., `report_generated`, `account_created`).

```
Tracking plan example:

Event: report_generated
Properties:
  - report_type: string (campaign_performance, revenue_summary)
  - date_range: object {start, end}
  - export_format: string (pdf, csv, xlsx)
  - time_to_generate: number (seconds)
  - user_role: string

Super properties (sent with every event):
  - user_id, account_id, plan_type, platform, browser, screen_size
```

### Funnel Analysis

Track users through sequential steps. Identify where users drop off and which segments convert better.

```
Funnel: Trial to paid conversion

Step                        | % of step | % of total
----------------------------|-----------|-----------
1. Sign up                  | 100%      | 100%
2. Complete onboarding      | 75%       | 75%
3. Create first project     | 67%       | 50%
4. Invite team member       | 50%       | 25%
5. Generate first report    | 50%       | 12.5%
6. Upgrade to paid          | 40%       | 5%

Insights:
- Major drop after onboarding (25% don't complete)
- Team invitation filters out half → investigate collaboration value
```

**Best practices:** Define clear time windows between steps, segment by persona/cohort, A/B test improvements, monitor trends over time.

### Behavioral Segmentation

Segment users by behavior patterns, not just demographics.

**Dimensions:**
- Usage frequency: Power users / Regular / Occasional / Inactive
- Engagement depth: Feature explorers / Workflow specialists / Minimalists
- Lifecycle stage: New / Active / At-risk / Churned
- Goal achievement: Successful / Struggling / Exploring
- Acquisition channel: Organic / Paid / Referral / Direct

## Cohort Analysis

### Behavioral Cohorts

Group users by shared characteristics, track behavior over time. Reveals patterns that aggregate metrics hide.

```
Week | Jan cohort | Feb cohort | Mar cohort
1    | 100%       | 100%       | 100%
2    | 62%        | 58%        | 65%
4    | 45%        | 42%        | 48%
8    | 38%        | 35%        | 40%
12   | 32%        | 28%        | 35%

Insight: March cohort shows improved retention → investigate what changed.
```

### Demographic Cohorts

Group by demographic attributes to identify persona-relevant patterns.

```
Company size | Month 1 | Month 3 | Month 6
1-10         | 28%     | 35%     | 32%
11-50        | 41%     | 52%     | 55%
51-200       | 45%     | 58%     | 62%
201-1000     | 38%     | 51%     | 58%

Insight: Mid-market (51-200) has highest reporting adoption. Persona implication: reporting most valuable to this segment.
```

### Acquisition Cohorts

Group by when/how acquired. Reveals how marketing changes affect user quality.

```
Source       | 7-day retention | 30-day retention | Conversion
Organic      | 45%             | 28%              | 8%
Paid search  | 38%             | 22%              | 5%
Referral     | 52%             | 35%              | 12%
```

### Retention Cohorts

Track product retention over time. Critical for understanding persona longevity and LTV.

**Metrics:** Day retention, week retention, month retention, bracket retention, rolling retention.

## Ethnographic Research

### Field Studies

Visit users in their natural environment. Prepare observation guide, plan logistics, obtain permissions.

**During visit:** Build rapport, shadow participant, ask clarifying questions at natural breaks, notice environment, capture artifacts (with permission).

**Debrief:** Document within 24 hours, tag observations by category, compare across visits to identify patterns.

### Participant Observation

Researcher participates in activities while observing. Levels range from complete observer (no interaction) to complete participant (full immersion).

**Risks:** Going native (losing objectivity), observer effect (behavior changes when watched), role confusion, data overload.

### Remote Ethnography

When in-person visits are impractical: video call observation, camera tours, digital ethnography (observing online communities), self-ethnography, remote diary platforms.

### Diary Studies

See detailed coverage in Qualitative section above. Key for persona research: captures longitudinal behavioral patterns, excellent for journey mapping and pain point identification.

## Contextual Inquiry

### Master-Apprentice Model

The researcher acts as apprentice, learning from the user (master). This power dynamic encourages open sharing and reveals tacit knowledge.

**Techniques:**
- "Can you explain what you just did? I want to understand."
- "What were you thinking when you made that choice?"
- "Show me what you would do next."

**Observation techniques:**
- Shadowing: follow the user through their day
- Think-aloud: user verbalizes their thought process
- Retrospective recall: user reviews recording and explains their thinking

### Workflow Analysis

Document the complete workflow including: triggers, steps, tools used, handoffs, decision points, exceptions, outcomes.

```
Workflow analysis template:

Trigger: Monday morning CMO request for weekly ops report
Steps:
  1. Export data from Salesforce [tool: Salesforce, time: 5 min]
  2. Export from billing platform [tool: Stripe, time: 3 min]
  3. Export from support tool [tool: Zendesk, time: 3 min]
  4. Open internal spreadsheet [tool: Excel, time: 1 min]
  5. Copy-paste into master workbook [tool: Excel, time: 15 min]
  6. Reconcile and validate numbers [tool: Excel, time: 20 min]
  7. Create charts and format report [tool: PowerPoint, time: 30 min]
  8. Export to PDF [tool: PowerPoint, time: 2 min]
  9. Email to CMO [tool: Outlook, time: 1 min]

Total time: ~80 min
Pain points: Steps 5-6 (manual data handling), Step 7 (formatting)
Opportunities: Automation of steps 5-7, template for step 7
```

## Participatory Design

### Co-Creation Workshops

Bring users and designers together to generate ideas and solve problems collaboratively.

```
Workshop structure (2-4 hours):

I. Set context (20 min) — Research findings, personas, design challenge
II. Ideation (45 min) — Individual sketches → pair combine → group cluster
III. Concept development (60 min) — Teams develop top concepts
IV. Critique (30 min) — Structured feedback on each concept
V. Prioritization (15 min) — Dot voting, feasibility vs desirability matrix
VI. Next steps (10 min) — Document decisions, assign owners
```

### Design Charrettes

Intensive, time-boxed collaborative design sessions. Process: problem presentation → individual sketching → pin-up → critique → iteration → synthesis.

**Rules:** Time-boxed, sketch not polish, quantity over quality, critique ideas not people, everyone participates.

### Card Sorting

Reveals how users organize information. Informs information architecture and navigation design.

**Types:** Open (users create categories), Closed (users sort into predefined categories), Hybrid (predefined + new categories).

```
Process:

Step 1: Select 30-60 content items with clear labels
Step 2: Choose method — remote (OptimalSort, Maze) or in-person (physical cards)
Step 3: Recruit 15-30 participants matching persona profiles
Step 4: "Sort these cards into groups that make sense to you"
Step 5: Analyze — similarity matrix, dendrogram, category labels

Similarity matrix:
             Campaigns | Reports | Contacts | Analytics
Campaigns    —         | 65%     | 45%      | 60%
Reports      65%       | —       | 35%      | 80%
Contacts     45%       | 35%     | —        | 25%
Analytics    60%       | 80%     | 25%      | —

Insight: Reports and Analytics strongly associated (80%) → should be under one section.
Contacts is relatively isolated → separate section.
```

## Competitive Analysis for Personas

### Competitor Persona Identification

Analyze competitors' user bases to identify segments served well or poorly.

```
Competitor persona matrix:

Competitor    | Served well         | Under-served           | Over-served
--------------|---------------------|------------------------|-----------------
Competitor A  | Enterprise marketing| SMB marketing          | Large enterprise
Competitor B  | Small business      | Growth-stage           | Micro-businesses
Competitor C  | Marketing agencies  | In-house teams         | Freelancers
Competitor D  | Freelancers         | Team workflows         | Individual users

Opportunity: Growth-stage teams are under-served by all competitors.
```

### Market Segmentation Analysis

**Segmentation variables:** Geographic, demographic, firmographic, psychographic, behavioral, needs-based.

**Segment attractiveness:** Size, growth, accessibility, profitability, alignment, competition.

### Feature Comparison by Persona

```
Feature-persona competitive matrix:

Feature                 | Our Persona | Comp A | Comp B | Comp C
------------------------|-------------|--------|--------|-------
Bulk data import        | Essential   | ✓      | ✓      | ✗
Custom reporting        | Essential   | ✓      | ✗      | ✓
Automated workflows     | Important   | ✓      | ✓      | ✗
Team collaboration      | Important   | ✓      | ✗      | ✓
Mobile access           | Nice-to-have| ✗      | ✓      | ✗
AI-powered insights     | Differentiator| ✗    | ✗      | ✗

Gap: AI-powered insights not offered by competitors → differentiation opportunity.
```

## Stakeholder Interviews

### Subject Matter Expert (SME) Interviews

Domain experts provide deep knowledge about terminology, challenges, and context.

**SME questions:**
1. What are the key trends shaping this domain?
2. What terminology is specific to this field?
3. Who are the main players?
4. What are the biggest challenges for [role]?
5. How has [role] changed in the past 5 years?
6. What tools are becoming obsolete?

**After SMEs:** Create domain glossary, document trends, refine research questions, validate with actual user research (SMEs may be out of touch with daily reality).

### Internal Stakeholder Interviews

| Stakeholder | Valuable insight | Bias to watch |
|-------------|------------------|---------------|
| Sales | What prospects ask for, objections | Confirms deal patterns, not usage |
| Support | Top complaints, feature requests | Hears from frustrated users |
| Product | Vision, strategy, constraints | Confirmation bias toward plans |
| Engineering | Technical constraints | Solution-focused |
| Executive | Strategic priorities, business goals | Top-down view |

**Synthesize stakeholder input:** Map claims to themes, separate evidence from opinion, generate hypotheses (not conclusions), validate with user research.

## Customer Interviews

### Customer Discovery

Validates that target customers experience a problem worth solving.

```
Structure (pre-product, problem exploration):
1. Warm-up (5 min): Background and context
2. Problem exploration (20 min): How they handle the task today
3. Problem depth (15 min): Pain assessment, time spent, consequences
4. Current solutions (10 min): Workarounds, satisfaction level
5. Validation (10 min): Pain score (1-10), active search, willingness to pay

Go/no-go criteria:
- Average pain score >7 → real problem
- >50% searched for solutions → demand exists
- >30% would pay → viable business
```

### Problem Interviews

Focus on understanding a specific problem space with a defined hypothesis.

```
Hypothesis: "We believe ops managers struggle with data accuracy because they manually reconcile spreadsheets."

Questions:
1. "Walk me through how you manage data across systems."
2. "Tell me about a time when data inconsistency caused a problem."
3. "How much time do you spend reconciling data per week?"
4. "What would it be worth to automate this?"
```

### Solution Interviews

Validate that a proposed solution resonates with users before building.

**Present concept → Gather reaction → Assess concerns → Validate willingness**

**Green flags:** "Yes, that's exactly what I need", "How soon can I get this?", offers to pay or beta test.

**Red flags:** Doesn't understand value, describes different problem, "I'd use that" with no enthusiasm, requests suggest different core problem.

## Secondary Research

### Market Reports

Sources: Gartner, Forrester, IDC, industry trade associations, government data, investment research.

**What to extract:** Market sizing (TAM/SAM/SOM), demographic profiles, behavioral trends, competitive landscape, regulatory environment.

### Industry Data

Analyze competitor websites, app store reviews, social media, community forums. Purchase and experience competitor products.

```
Competitive review snippet:

Competitor: Acme Analytics
User sentiment (from reviews):
  Positive: "Easy to set up", "Great support"
  Negative: "Expensive for small teams", "Missing custom reports"
Feature gaps: No automated data sync, no anomaly detection
Opportunity: Provide sync + anomaly detection at lower price point
```

### Academic Research

Sources: Google Scholar, ACM Digital Library, CHI, CSCW, Harvard Business Review.

**Relevant areas:** User modeling, technology adoption (TAM, UTAUT), JTBD theory, mental models, UX theory.

### Social Media Analysis

Sources: Twitter/X, Reddit, LinkedIn, G2/Capterra reviews, Quora, UserVoice.

```
Platform: Reddit (r/marketing)
Search: "campaign reporting", "ROI measurement"
Themes:
  - Data fragmentation (23 threads): "Data in 5 platforms, can't get unified view"
  - Executive reporting (18 threads): "Spend more time building reports than analyzing"
  - Switching costs (12 threads): "Too much invested in current tool setup"
```

## Data Triangulation

### Combining Qualitative and Quantitative

Each method's weaknesses are offset by another's strengths.

```
Research question: "What prevents users from upgrading to paid?"

Method 1 (Analytics): 5% complete upgrade flow, 70% leave at pricing page → WHAT
Method 2 (Session recordings): Users hover over pricing toggle, look confused → WHY (small sample)
Method 3 (Survey): 62% say pricing is unclear → VALIDATION at scale
Method 4 (Interviews): "Can't tell which plan I need" → DEEP REASON

Synthesis: Pricing page lacks plan comparison. Redesign with clear feature comparison.
Validate: A/B test → measure conversion improvement.
```

### Validation Strategies

**Sequential:** Qualitative → Quantitative → Experiment. Interviews discover problem, survey validates prevalence, A/B test confirms solution.

**Concurrent:** Run methods simultaneously for rapid iteration. Deploy in-app survey, analyze weekly, conduct interviews with respondents.

## Ethics and Consent

### Informed Consent

```
Consent form includes:
- Study purpose, researcher contact
- Voluntary participation, right to withdraw
- Procedure description and duration
- Recording permissions (audio/video/screen)
- Risks and benefits
- Confidentiality guarantee
- Data usage and retention policy
```

### Data Privacy

Collect only necessary data. Store in access-controlled locations. Use pseudonyms in reports. Delete raw recordings after analysis. Anonymize quotes. Don't link research data to accounts without consent. Comply with GDPR, CCPA, HIPAA.

### Anonymity Levels

| Level | Description | Use case |
|-------|-------------|----------|
| Full anonymity | Researcher cannot identify | Sensitive topics |
| Partial anonymity | Known but reported anonymously | Most UX research |
| No anonymity | Known and reported (with consent) | Case studies |

**Techniques:** Pseudonyms (demographically consistent), generic company descriptors, round sensitive numbers, remove identifying details from quotes.

## Remote Research Methods

### Remote Interviews

Most common format for persona research — reduces cost, increases reach.

**Best practices:** Test tech ahead of time, use wired internet, ask for screen share, have backup plan, allow 2-3 seconds silence (video lag), record locally as backup, share incentive immediately.

**Platforms:** Zoom, Google Meet, Microsoft Teams, Lookback, UserTesting.

### Unmoderated Testing

Participants complete tasks independently. Suitable for usability validation, not deep persona research.

**Platforms:** UserTesting, UserZoom, Maze, UsabilityHub.

**Analysis:** Task completion rate, time on task, SUS score, error rate, click path analysis.

### Remote Diary Studies

Use dedicated platforms (Dscout, Indeemo, EthOS). Set push notifications, include photo/video capture, monitor participation daily, offer bonus for completing all entries.

### Remote Focus Groups

Use breakout rooms for small group activities, digital whiteboards (Miro, FigJam), chat for parallel input, polls for consensus. Shorter sessions (60-75 min). Send materials in advance.

## Synthesis and Analysis

### Coding

Labels segments of qualitative data with descriptive tags.

**Open coding:** Label every meaningful segment. Start broad, refine as patterns emerge.

```
Raw: "I usually export to PDF because my boss wants to see them in the board meeting. But then I have to manually update the numbers."

Codes: [export to PDF] [report for boss] [board meeting context] [manual number update] [workaround behavior]
```

**Axial coding:** Group open codes into categories. Identify relationships.

```
Category: Reporting workflow challenges
  - [export to PDF] → format limitation
  - [manual number update] → data sync issue

Category: Stakeholder management
  - [report for boss] → hierarchy-driven need
  - [board meeting context] → presentation purpose
```

**Selective coding:** Identify the core category that integrates all others.

```
Core: "Users are trapped in a manual reporting loop — tool limitations prevent automation, stakeholder demands require output, workarounds create error risk."
```

### Affinity Mapping

Collaborative, visual, bottom-up clustering of observations.

**Process:**
1. Generate notes: one observation/quote per sticky note, include source. Aim for 100-300 notes.
2. Silent cluster: team places notes on wall without talking.
3. Label clusters: create 3-5 word header for each group.
4. Create super-clusters: 5-10 higher-level themes.
5. Document: photo of final wall, cluster themes with supporting quotes.

**Common themes:** Inefficient workflows, collaboration friction, data challenges, role-specific goals, emotional experiences, tool ecosystem, decision processes.

### Thematic Analysis

Braun & Clarke's 6-phase method for rigorous qualitative analysis:

1. **Familiarization:** Read all transcripts, note initial impressions.
2. **Generate codes:** Systematic line-by-line coding. Output: 50-200 codes.
3. **Search for themes:** Group codes, create thematic map.
4. **Review themes:** Check against coded extracts and full dataset. Merge/split as needed.
5. **Define and name themes:** Write detailed analysis of each theme.
6. **Produce report:** Tell the story, support with evidence.

### Grounded Theory

Develops theory from data rather than testing existing theories.

**Principles:** Theoretical sampling (choose participants based on emerging findings), constant comparison (compare new data with existing codes), theoretical saturation (stop when no new insights emerge), memo writing (document analytical thinking).

**When to use:** Poorly understood domains, developing new frameworks, understanding complex behavioral phenomena.

## Bias Mitigation

### Confirmation Bias

Tendency to seek information confirming existing beliefs.

**Mitigation:** Write research questions before data collection. Include disconfirming questions. Actively search for contradictory evidence. Use devils advocate in synthesis. Blind analysis (remove participant names). Multiple researchers code independently.

### Interviewer Bias

Interviewer influences participant responses through phrasing, tone, or behavior.

**Mitigation:** Use semi-structured guides. Ask open-ended before closed questions. Avoid leading questions. Standardize framing across sessions. Record and review for drift. Rotate interviewers.

### Selection Bias

Sample does not represent the target population.

**Mitigation:** Define clear screening criteria. Recruit from multiple channels. Track recruitment source for each participant. Compare to known population parameters. Include extreme users (power users AND non-users). Use quota sampling.

### Cultural Bias

Research methods reflect researcher's cultural assumptions.

**Mitigation:** Test questions with diverse reviewers. Work with local researchers. Adapt interview style to cultural norms. Avoid idioms that don't translate. Include culturally diverse participants. Interpret findings within cultural context.

## Tools for Research

### Research Repositories

| Tool | Strengths |
|------|-----------|
| Dovetail | Auto-transcription, AI tagging, highlight reels |
| Condens | Collaborative analysis, affinity mapping |
| Aurelius | Research repository, cross-project search |
| ATLAS.ti | Advanced coding, grounded theory |
| NVivo | Comprehensive qualitative analysis |
| MAXQDA | Mixed methods |

### Collaborative & Whiteboard

| Tool | Strengths |
|------|-----------|
| Miro | Infinite canvas, templates, real-time collaboration |
| Mural | Design thinking templates, facilitation features |
| FigJam | Figma integration, lightweight |
| Lucidspark | Diagramming and affinity mapping |

### Note-Taking & Documentation

| Tool | Strengths |
|------|-----------|
| Notion | Databases, templates, team wikis |
| Airtable | Relational databases, participant tracking |
| Google Docs | Real-time collaboration |
| Evernote | Cross-device sync, OCR |

### Analysis & Visualization

| Tool | Strengths |
|------|-----------|
| Dovetail | Tagging, highlight reels, AI insights |
| ATLAS.ti | Network views, code co-occurrence |
| Tableau / Power BI | Dashboards, interactive visualization |
| R / Python | Statistical analysis, modeling |
| Google Sheets / Excel | Pivot tables, survey analysis |

### Recruitment & Scheduling

| Tool | Strengths |
|------|-----------|
| UserInterviews | Panel access, screener builder |
| Respondent.io | Professional B2B panel |
| Calendly | Automated scheduling, reminders |
| Sprig / Ethnio | In-product intercept recruiting |
| Great Question | Panel management, scheduling |

## Key Points

- Start with clear research questions — they guide everything
- Recruit 8-12 participants per persona segment for qualitative research
- Semi-structured interviews are the most effective format for persona development
- Open-ended questions reveal more than closed: "Tell me about..." not "Do you..."
- Contextual inquiry uncovers behaviors users don't think to mention
- Combine qualitative and quantitative through triangulation for robust findings
- Behavioral analytics validate what users actually do, not just what they say
- Informed consent is non-negotiable — document before every session
- Code data systematically before clustering into themes
- Bias is inevitable — actively mitigate through study design, not just awareness
- Remote research reduces cost and increases reach but needs more structure
- Diary studies capture longitudinal context that interviews miss
- Card sorting reveals users' mental models for information architecture
- Competitive analysis identifies persona segments competitors serve poorly
- Stakeholder input generates hypotheses; user research validates them
- Social media provides unsolicited, natural-language user opinions
- Triangulation converges multiple methods for confident findings
- Grounded theory is best for poorly understood domains
- Store all research artifacts in a searchable, accessible repository
- Research without synthesis is just data — invest in analysis
