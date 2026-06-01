# Roadmap Advanced Topics

## Advanced Prioritization Methods

### RICE Scoring
RICE = (Reach * Impact * Confidence) / Effort. Best for feature-level prioritization when quantitative data is available.

### WSJF (Weighted Shortest Job First)
WSJF = Cost of Delay / Job Duration. Suitable for SAFe environments where Cost of Delay can be calculated. Requires more data than RICE but handles dependencies better.

### Opportunity Scoring
Score features by opportunity gap: how important is this to customers vs how satisfied are they today? Large gap = high priority. Best for customer-needs-driven prioritization.

### Kano Model
Classify features into:
- **Basic needs**: Expected, cause dissatisfaction if missing
- **Performance features**: Linear satisfaction — more is better
- **Delighters**: Unexpected, cause high satisfaction
- **Indifferent**: No impact on satisfaction

## Handling Common Roadmap Tensions

### Stakeholder Pressure
When stakeholders override RICE scores, document the override and its rationale. Track whether overridden items deliver expected impact. Use data from past overrides to build the case for data-driven prioritization.

### Engineering Skepticism
Engineers distrust roadmaps that ignore capacity or technical debt. Share the capacity model openly. Include tech debt as a line item. Protect the 20% buffer. When engineers see the roadmap respects reality, they become allies.

### Sales Requests
Sales teams want every feature now. Create a clear process: sales requests go through a monthly intake, get scored with RICE, and compete with all other priorities. No backdoor promises.

### Competitive Pressure
When a competitor ships a feature, evaluate it through RICE before reacting. Competitive panic features often score lower than existing planned work. Do not let competitor moves hijack the roadmap.

## Rolling Wave Planning
Plan the next quarter in detail (specific features, owners, milestones). Quarter 2 is directional (themes, key features). Quarters 3-4 are placeholders (themes only). As each quarter approaches, increase detail. This maintains flexibility while providing enough specificity for execution.

## Outcome-Driven Roadmaps
Instead of listing features, list outcomes. "Reduce checkout abandonment from 30% to 15%" is an outcome. The features that achieve this may change based on experimentation. The roadmap tracks the outcome, not the specific implementation.

Roadmap items are hypotheses: "If we {deliver outcome}, we expect {metric} to change by {amount}." When the quarter ends, measure actual vs expected. Celebrate learning even when the hypothesis was wrong.

## Multi-Team Roadmap Coordination

### Dependency Mapping
For each dependency between teams, document:
- **Dependency type**: Technical (API contract), timing (Team A must finish before Team B can start), knowledge (Team B needs information from Team A)
- **Owner**: Who is responsible for resolving the dependency?
- **Status**: Identified, In Progress, Resolved, Blocked
- **Fallback**: What happens if the dependency cannot be resolved on time?

### Cross-Team Sync Cadence
- Weekly: Standup between tech leads
- Monthly: Product sync between PMs
- Quarterly: Full roadmap review with all teams and leadership

## Roadmap Maturity Model

### Level 1: Ad Hoc
No formal roadmap. Work is reactive. Priorities change daily.

### Level 2: Feature List
A list of desired features with rough priorities. No capacity data. Stakeholder-driven.

### Level 3: Theme-Based
Organized by outcomes. RICE prioritization. Capacity model. Monthly updates.

### Level 4: Outcome-Driven
Features are hypotheses. Success measured by metric change. Quarterly learning reviews.

### Level 5: Adaptive
Real-time prioritization based on continuous learning. Roadmap is a dynamic set of bets, not a fixed plan.
