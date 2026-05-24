# Scaled Agile Frameworks

## When to Scale

### Signs You Need Scaling
- Multiple teams working on the same product or platform
- Dependencies between teams cause frequent delays
- Integration failures occur regularly between team deliverables
- Feature delivery takes multiple sprints due to handoffs
- No single team can deliver end-to-end value
- Stakeholders cannot get a clear picture of progress across teams

### When NOT to Scale
- A single team can deliver the product (most cases)
- The organization has fewer than 3 engineering teams
- Agile practices are not mature at the team level
- The primary problem is team-level agility, not coordination

## SAFe (Scaled Agile Framework)

### Core Concepts

**ART (Agile Release Train)**
- A long-lived team of agile teams (50-125 people)
- Aligned to a value stream
- Delivers on a fixed 8-12 week PI (Program Increment) cadence
- Each ART has a dedicated release train engineer (RTE)

**PI Planning**
- A 2-day event every 8-12 weeks
- All ART teams plan together in the same room (physical or virtual)
- Output: PI objectives with business value, team commitments, risks
- Key roles: RTE facilitates, Product Management provides vision, System Architect provides technical direction

**ART Events**
| Event | Cadence | Purpose |
|-------|---------|---------|
| PI Planning | Every 8-12 weeks | Align on objectives, plan together |
| Scrum of Scrums | Weekly | Cross-team coordination, dependency tracking |
| PO Sync | Weekly | Align on priorities across teams |
| System Demo | End of each sprint | Integrated system demo across the ART |
| Inspect & Adapt | End of PI | Retrospective at scale, process improvement |

**SAFe Configuration Levels**
- **Essential SAFe**: ART + teams (minimum viable SAFe)
- **Large Solution SAFe**: Multiple ARTs for complex systems
- **Portfolio SAFe**: Strategic investment funding, Lean budgeting
- **Full SAFe**: All levels for enterprises

### Benefits and Criticisms
- **Benefits**: Proven at scale, clear roles and events, strong alignment, works for large enterprises
- **Criticisms**: Heavy ceremony overhead, top-down, can feel bureaucratic, expensive to implement well

## LeSS (Large-Scale Scrum)

### Core Concepts
- Start with Scrum; scale by adding teams, not ceremonies
- One Product Backlog, one Product Owner for all teams
- All teams work from the same backlog in the same sprint
- Teams are feature teams (cross-functional, end-to-end)
- Coordination is mostly informal — teams communicate directly

### LeSS Configurations
- **LeSS** (2-8 teams): One sprint, one backlog, cross-team coordination via Scrum of Scrums + overall retro
- **LeSS Huge** (8+ teams): Requirements areas (grouped by business domain), area POs, area Scrum Masters

### Key Practices
- Sprint Planning: Part 1 (all teams together with PO), Part 2 (each team plans its own work)
- Daily Scrum: Teams coordinate through Scrum of Scrums or integrated daily standups
- Overall Retro: Senior management joins to address systemic issues
- Definition of Done: Single DoD across all teams — integration is continuous

### Benefits and Criticisms
- **Benefits**: Simpler than SAFe, retains Scrum principles, less ceremony, encourages direct communication
- **Criticisms**: Difficult without full-time dedication, requires highly mature teams, PO bottleneck

## Nexus

### Core Concepts
- Extension of Scrum for 3-9 teams
- Adds the Nexus Integration Team (NIT) — responsible for integration and coordination
- Nexus Sprint combines individual team sprints plus integration work
- Nexus Daily Scrum for cross-team coordination

### Key Artifacts
- **Nexus Sprint Backlog**: Consolidated view of all teams' sprint backlogs
- **Nexus Goal**: The integrated sprint goal that requires multiple teams
- **Integrated Increment**: Sum of all teams' completed, integrated work

### Nexus Events
| Event | Purpose |
|-------|---------|
| Nexus Sprint Planning | Cross-team dependency mapping, goal alignment |
| Nexus Daily Scrum | Daily coordination between teams (Scrum of Scrums) |
| Nexus Sprint Review | Integrated system demo across the Nexus |
| Nexus Sprint Retrospective | Reflect on the Nexus process itself |

## Scrum@Scale

### Core Concepts
- Scrum applied recursively: a scrum of scrums of scrums
- Minimum Viable Bureaucracy (MVB) — add only what is needed
- Two cycles: the Product Cycle (vision, strategy, roadmap, backlog) and the Process Cycle (operations, improvement)
- Executive Action Team (EAT): leadership addressed systemic impediments
- Scaling is modular — adopt only the components needed

### Key Roles
- **Chief Product Owner**: Aligns product vision across multiple POs
- **Executive Meta-Scrum**: Leadership team for organizational impediments
- **Scrum of Scrums Master**: Coordinates Scrum Masters across teams

## Coordination Mechanisms

| Mechanism | When to Use | Cost |
|-----------|-------------|------|
| Direct team-to-team | Simple dependencies, 2 teams | Low |
| Scrum of Scrums | 3-6 teams, weekly coordination | Low-Medium |
| Communities of Practice | Cross-team skill sharing | Low |
| Feature teams | Eliminates component handoffs | Medium |
| API/platform contracts | Teams need autonomy | Medium-High |
| ART / PI Planning | 5+ teams, synchronized delivery | High |
| Integrated demo | Need to show system-level progress | Medium |

## Framework Selection Guide

| Factor | SAFe | LeSS | Nexus | Scrum@Scale |
|--------|------|------|-------|-------------|
| Number of teams | 3-100+ | 2-8 (up to 20) | 3-9 | 2-100+ |
| Ceremony overhead | High | Medium | Medium | Variable |
| Maturity required | Medium | High | Medium | High |
| Best for | Large enterprises | Product companies | Small scale-ups | Adaptable orgs |
| Product Owner count | 1 per team + PM | 1 total | 1 total + NIT | Multiple POs |
| Prescription | High | Medium | Medium | Low |

## Reference
- SAFe Framework — https://scaledagileframework.com/
- LeSS Framework — https://less.works/
- Nexus Guide — https://scrum.org/nexus
- Scrum@Scale Guide — https://scrumatscale.org/
