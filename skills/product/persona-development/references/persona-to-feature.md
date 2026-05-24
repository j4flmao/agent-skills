# Persona-Driven Design

## Overview
Persona-driven design systematically connects user personas to product decisions, ensuring features serve real user needs. By scoring features against personas and mapping stories to persona journeys, teams prioritize what matters most to their target users.

## Connecting Personas to Features

### Feature-to-Persona Matrix
For each feature considered, assess how well it serves each persona. Score on a -1 to 3 scale:
3 = Essential — feature directly enables persona's core goal.
2 = Helpful — feature improves persona's experience.
1 = Neutral — persona is indifferent.
0 = Irrelevant — persona won't use it.
-1 = Harmful — feature degrades persona's experience (adds complexity, slows workflows).

### Matrix Format
| Feature | Primary (Sarah) | Secondary (Alex) | Anti (Dev) | Weighted Score |
|---------|----------------|------------------|------------|----------------|
| Campaign Dashboard | 3 | 2 | 0 | 2.5 |
| API Access | 1 | 0 | 3 | 0.8 |
| Executive Report | 2 | 3 | 1 | 2.2 |

Weighted score = sum(scores × persona priority weight). Primary persona gets 0.5 weight, secondary 0.3, anti-persona 0.0.

### Feature Filtering
Features scoring high on anti-persona but low on primary: deprioritize. Features scoring essential for primary: prioritize regardless of secondary score. Features that serve all personas equally: usually platform investments (infrastructure, performance). Features with low scores across all personas: consider removing from roadmap.

## Persona Prioritization

### When Personas Conflict
Primary persona needs always win. Secondary persona is accommodated but not at primary's expense. If a feature helps secondary but hurts primary, do not build it. If primary and secondary both benefit, build for primary use case first, then extend.

### Persona-Based Roadmap
Map roadmap items to personas. Each quarter should serve the primary persona on at least 2 of 3 themes. Secondary persona gets 1 theme. Anti-persona features are explicitly excluded. Track persona coverage over time. Publish "persona served" per release to maintain focus.

### Persona Fitness Score
For each release or quarter, calculate persona fitness score = sum of feature scores for primary persona / total possible score. Target: >0.7 for primary persona, >0.4 for secondary. If primary persona score drops below 0.5, course-correct next cycle.

## Feature Scoring by Persona Fit

### RICE-Persona Hybrid
Augment RICE scores with persona fit factor. Multiply RICE score by persona weight for each segment. RICE-P = (Reach × Impact × Confidence / Effort) × PersonaFit. PersonaFit = percentage of target users who are primary persona × feature essential score for primary.

### Kano-Persona Integration
Classify features by Kano category per persona. A feature might be "basic need" for primary persona but "delightful" for secondary. Prioritize features that are basic or performance for primary persona, even if they're delights for secondary. A feature that's "reverse" for primary persona should not be built.

## User Story Mapping with Personas

### Story Map Structure
Backbone: persona journey steps in order. These are the high-level activities the persona performs. Skeleton: tasks within each backbone step. These form the MVP scope. Body: details, variations, edge cases for each task. These are nice-to-haves.

### Persona-Based Story Mapping
Label each story with persona tag. Arrange stories by persona journey, not technical component. Identify gaps: backbone steps with zero stories for primary persona. Identify excess: stories serving anti-persona that should be cut. Ensure each sprint has stories covering the primary persona's next journey step.

### Sprint Persona Balance
Each sprint should have: 60-70% primary persona stories, 20-30% secondary persona stories, 0% anti-persona stories, 10% platform/tech debt. If a sprint has <50% primary persona stories, it's off-track.

## Design Validation with Personas

### Persona Scenarios
Write specific scenarios for each persona using the feature. "Sarah opens the campaign reports dashboard to check this week's performance. She needs to see spend, ROI, and compare to last month — all in one view." Use these scenarios in design reviews and usability testing.

### Design Review Using Personas
For each design decision: Which persona does this serve? Does it help or harm other personas? Would the primary persona understand this? Would they find it useful? Does it conflict with persona goals? Designers should name which persona they're designing for.

### Usability Testing by Persona
Recruit test participants matching persona profiles. Write tasks specific to each persona's goals. Test with primary persona first and most thoroughly. Compare results across personas to identify conflicting needs. Observe behavioral differences between persona types.

## Key Points
Score every feature against every persona before prioritizing.
Primary persona wins conflicts, but don't actively harm secondary personas.
Anti-persona prevents feature creep — document and reference regularly.
Persona fitness score keeps the team honest about user focus.
Story maps without persona labels hide who you're building for.
Design review with persona lenses catches self-referential design.
Continuously validate persona assumptions with behavioral data.
