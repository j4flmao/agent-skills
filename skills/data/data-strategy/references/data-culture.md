# Data Culture Reference

## Data Literacy Program

A data literacy program ensures all employees have the skills to read, work with, analyze, and argue with data.

### Program Structure

**Tier 1: Data Foundations (All employees)**
- What is data and why it matters
- Reading charts and dashboards
- Understanding data quality
- Data privacy and security basics
- Time commitment: 2 hours (self-paced e-learning)

**Tier 2: Data Practitioner (Knowledge workers, analysts)**
- SQL fundamentals for data access
- Statistics and probability basics
- Data visualization best practices
- Critical thinking with data
- Time commitment: 16 hours (4 sessions x 4 hours)

**Tier 3: Data Advanced (Data practitioners, engineers)**
- Advanced analytics and modeling
- Data engineering fundamentals
- Experimentation and A/B testing
- Data storytelling and presentation
- Time commitment: 40 hours (10 sessions x 4 hours)

### Curriculum Modules

```
Module 1: Data Mindset
  - Moving from intuition to evidence
  - Understanding bias in data interpretation
  - Asking better questions of data
  - Recognizing data quality red flags

Module 2: Data Access
  - Navigating the data catalog
  - Writing basic SQL queries
  - Using self-service analytics tools
  - Understanding data lineage

Module 3: Data Analysis
  - Descriptive statistics (mean, median, distribution)
  - Exploratory data analysis techniques
  - Correlation vs causation
  - Creating effective data visualizations

Module 4: Data-Driven Decisions
  - Framework for data-driven decision-making
  - Setting up experiments and measuring outcomes
  - Communicating data insights
  - Handling uncertainty and risk
```

### Certification Path

| Level | Badge | Requirements | Validity |
|-------|-------|-------------|----------|
| Bronze | Data-Aware | Complete Tier 1 + pass quiz (80%) | 2 years |
| Silver | Data-Practitioner | Complete Tier 2 + pass practical exam | 2 years |
| Gold | Data-Advanced | Complete Tier 3 + capstone project | 3 years |
| Platinum | Data-Champion | Gold + teach 2 sessions + mentor 3 colleagues | 3 years |

## Data-Driven Decision Framework

### The DECIDE Framework

1. **D**efine the decision — What exactly needs to be decided?
2. **E**xplore available data — What data exists to inform the decision?
3. **C**ollect additional data — What data gaps need filling?
4. **I**nterpret the data — What does the data say? What doesn't it say?
5. **D**ecide with confidence — Make the decision with evidence
6. **E**valuate the outcome — Did the decision produce the expected result?

### Decision Types and Data Requirements

| Decision Type | Example | Data Required | Confidence Threshold |
|---------------|---------|---------------|---------------------|
| Strategic | Enter new market | Market research, competitive analysis, financial models | 80%+ |
| Tactical | Adjust pricing | Price elasticity, competitor pricing, margin data | 70%+ |
| Operational | Reorder inventory | Stock levels, demand forecast, lead times | 90%+ |
| Experiment | Test new feature | A/B test results, user behavior data | 95% statistical significance |

### Meeting Culture for Data Decisions

```yaml
# Data-driven meeting guidelines
meeting_types:
  - name: Weekly Metrics Review
    frequency: weekly
    duration: 30 min
    attendees: team leads + managers
    agenda:
      - 5 min: Top 3 metrics review (red/yellow/green)
      - 10 min: Deep dive on one metric that changed
      - 10 min: Action items based on data
      - 5 min: Data quality issues or needs

  - name: Monthly Business Review
    frequency: monthly
    duration: 60 min
    attendees: directors + VPs
    agenda:
      - 10 min: Executive dashboard walkthrough
      - 20 min: Deep dive on one business area
      - 20 min: Decisions and resource allocation
      - 10 min: Data program updates

  - name: Quarterly Data Strategy Review
    frequency: quarterly
    duration: 90 min
    attendees: C-suite + data leadership
    agenda:
      - 15 min: Data maturity progress
      - 30 min: Strategic initiatives update
      - 30 min: Investment and prioritization decisions
      - 15 min: Data culture and people KPIs
```

## Data Champion Network

### Champion Role Definition

**Data Champions** are volunteers from each business unit who advocate for data-driven practices within their teams.

**Responsibilities:**
- Promote data literacy program adoption in their team
- First point of contact for data questions from colleagues
- Provide feedback to the Data COE on tools and training
- Identify new use cases for data in their domain
- Organize team-level data office hours
- Participate in quarterly champion summits

**Time Commitment:** 2-4 hours per month

**Benefits:**
- Access to advanced training
- Visibility with executive leadership
- Priority access to data tools and sandboxes
- Recognition program (quarterly awards)
- Path to data career progression

### Champion Network Structure

```
Head of Data Culture (Data COE)
  └── Data Champion Lead (full-time)
        ├── Domain Champions (1 per business unit)
        │     ├── Department Power Users (2-3 per department)
        │     └── Data Curious (any employee)
        └── Special Interest Groups
              ├── SQL Enthusiasts
              ├── Visualization Club
              └── Analytics Book Club
```

### Champion Activities

```sql
-- Track champion engagement
CREATE TABLE champion_activities (
    activity_id UUID,
    champion_name STRING,
    domain STRING,
    activity_type STRING,      -- office_hours, training, project, mentoring
    activity_date DATE,
    participants_count INT,
    feedback_score DECIMAL(2,1),  -- 1.0-5.0
    impact_description TEXT
);

-- Champion effectiveness metrics
SELECT
    domain,
    COUNT(DISTINCT champion_name) AS champion_count,
    COUNT(activity_id) AS total_activities,
    AVG(participants_count) AS avg_participants,
    AVG(feedback_score) AS avg_feedback
FROM champion_activities
WHERE activity_date >= DATEADD('month', -3, CURRENT_DATE)
GROUP BY domain;
```

## Internal Data Community

### Community Components

**Data Newsletter (Bi-weekly)**
- Featured dashboard or analysis of the month
- Data tip of the week
- Spotlight on a data champion
- Upcoming training and events
- Data quality report card

**Data Office Hours (Weekly)**
- Drop-in sessions hosted by Data COE
- Get help with SQL, tools, or data access
- Discuss analysis approaches
- Review dashboards before publishing

**Data Show-and-Tell (Monthly)**
- Teams present their data projects
- Peer feedback and Q&A
- Cross-pollination of ideas
- Award for best presentation

**Data Hackathon (Bi-annual)**
- 24-48 hour event
- Cross-functional teams solve business problems
- Executive judges
- Winning ideas get resources for production

**Data Conference (Annual)**
- Full-day internal event
- Keynote from CDO and external speaker
- Breakout sessions on tools, techniques, case studies
- Networking and recognition

### Community Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Newsletter subscribers | 80% of employees | Subscription count |
| Office hours attendance | 20+ per session | RSVP + actual attendees |
| Show-and-tell presenters | 3+ per month | Session schedule |
| Hackathon participation | 10% of data-adjacent roles | Registration count |
| Conference attendance | 50% of data-adjacent roles | RSVP count |
| NPS of data community | > 50 | Quarterly survey |

## Metrics-Driven Culture

### Key Culture KPIs

```sql
-- Culture metrics dashboard
CREATE TABLE data_culture_kpis (
    kpi_id UUID,
    metric_date DATE,
    domain STRING,
    kpi_name STRING,
    kpi_value DECIMAL(10,2),
    kpi_target DECIMAL(10,2),
    kpi_unit STRING              -- count, pct, score
);

-- Sample KPIs
INSERT INTO data_culture_kpis (metric_date, domain, kpi_name, kpi_value, kpi_target, kpi_unit) VALUES
    ('2026-05-01', 'enterprise', 'data_literacy_completion_pct', 65.0, 80.0, 'pct'),
    ('2026-05-01', 'enterprise', 'self_service_query_count', 12500, 10000, 'count'),
    ('2026-05-01', 'enterprise', 'data_champions_active', 45, 50, 'count'),
    ('2026-05-01', 'enterprise', 'decisions_informed_by_data_pct', 72.0, 80.0, 'pct'),
    ('2026-05-01', 'enterprise', 'data_quality_score', 94.5, 95.0, 'score');
```

### Culture Maturity Progression

```
Level 1: Awareness
  - Data literacy program launched
  - Initial training completion
  - Early champions identified
  - Basic data vocabulary understood

Level 2: Adoption
  - Majority trained
  - Champions active in all domains
  - Self-service tools adopted
  - Data referenced in meetings

Level 3: Practice
  - Data-driven decisions standard
  - Regular community events
  - Data quality is everyone's responsibility
  - Automated dashboards drive operations

Level 4: Embedding
  - Data culture is organizational DNA
  - New hires onboarded with data training
  - Data recognition embedded in performance reviews
  - Cross-domain data collaboration is norm

Level 5: Advocacy
  - Organization recognized as data-driven
  - External speaking and publishing
  - Data alumni network active
  - Data culture self-sustaining
```

### Measuring Decision Quality

```sql
CREATE TABLE decision_tracking (
    decision_id UUID,
    decision_date DATE,
    decision_maker STRING,
    decision_type STRING,         -- strategic, tactical, operational, experiment
    data_used BOOLEAN,
    data_sources_consulted INT,
    confidence_level DECIMAL(3,2),  -- 0.00-1.00
    outcome_success BOOLEAN,      -- evaluated after decision
    outcome_metric STRING,
    outcome_value DECIMAL(10,2),
    lessons_learned TEXT
);

-- Correlation between data use and decision outcomes
SELECT
    data_used,
    COUNT(*) AS decision_count,
    AVG(CASE WHEN outcome_success THEN 1 ELSE 0 END) AS success_rate
FROM decision_tracking
WHERE outcome_metric IS NOT NULL
GROUP BY data_used;
```

## Rules
- Data literacy is for everyone, not just technical roles
- Champions must be volunteers, not assigned
- Training content must be role-specific and practical
- Community activities need regular cadence to maintain momentum
- Measure culture adoption, not just training completion
- Celebrate data wins publicly and frequently
- Executive sponsorship is required for culture change
- Integrate data culture into existing rhythms (team meetings, reviews)
- Provide safe spaces for data questions (no bad questions policy)
- Iterate on culture programs based on feedback and metrics
