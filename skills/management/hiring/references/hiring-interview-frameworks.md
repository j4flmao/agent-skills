# Hiring Interview Frameworks

## Purpose
Provide a comprehensive catalog of structured interview frameworks for technical and behavioral roles. Covers coding interview formats, system design evaluation, behavioral assessment models, take-home assignments, and framework selection guidance.

## Table of Contents
1. [Framework Selection Matrix](#framework-selection-matrix)
2. [Coding Interview Frameworks](#coding-interview-frameworks)
3. [System Design Interview Frameworks](#system-design-interview-frameworks)
4. [Behavioral Interview Frameworks](#behavioral-interview-frameworks)
5. [Take-Home Assignment Frameworks](#take-home-assignment-frameworks)
6. [Debugging and Troubleshooting Frameworks](#debugging-and-troubleshooting-frameworks)
7. [API and Integration Design Frameworks](#api-and-integration-design-frameworks)
8. [Pair Programming Frameworks](#pair-programming-frameworks)
9. [Framework Customization by Seniority](#framework-customization-by-seniority)
10. [Framework Customization by Role Type](#framework-customization-by-role-type)

---

## Framework Selection Matrix

| Interview Type | Best For | Time | Signal Quality | Prep Effort |
|---|---|---|---|---|
| Live coding (IDE) | Backend, full-stack | 45-60 min | High | Medium |
| Whiteboard coding | Algorithm-heavy roles | 45 min | Medium | Low |
| System design | Senior+ engineering | 45-60 min | High | High |
| Behavioral (STAR) | All roles | 45 min | High | Medium |
| Take-home project | Senior roles | 4-8 hours | Very high | High |
| Debugging session | SRE, DevOps, QA | 45 min | High | Medium |
| Pair programming | Team-fit signal | 45-60 min | High | Medium |
| API design | Backend, integration | 45 min | Medium | Medium |
| Code review | Senior roles | 30-45 min | High | Medium |

### Framework Decision Flow

```
Role type determines framework mix:
Backend: Live coding + System design + Behavioral
Frontend: Live coding (browser) + Component design + Behavioral
Mobile: Live coding (device) + Architecture design + Behavioral
DevOps/SRE: Debugging + System design + Behavioral
ML/AI: Take-home + System design + Behavioral
Data: SQL + Take-home + Behavioral
Manager: Behavioral (2x) + System design + Case study
Staff/Principal: System design + Leadership behavioral + Take-home
```

---

## Coding Interview Frameworks

### Framework A: Algorithm and Data Structures
**Duration:** 45-60 minutes
**Target:** Mid-level and below

**Structure:**
```
Phase 1: Problem clarification (5 min)
  - Understand input/output constraints
  - Ask about edge cases
  - Confirm expected time/space complexity

Phase 2: Solution design (10 min)
  - Verbalize approach before coding
  - Discuss at least 2 approaches with tradeoffs
  - Agree on approach with interviewer

Phase 3: Implementation (20-30 min)
  - Write clean, idiomatic code
  - Use meaningful variable names
  - Handle edge cases as you code

Phase 4: Testing and verification (10 min)
  - Walk through example input
  - Test edge cases (empty, single, large)
  - Discuss time and space complexity

Phase 5: Follow-up (5 min)
  - How would you scale this?
  - What if input changes?
  - How would you test this in production?
```

**Rubric:**
| Dimension | 1 (Strong No) | 2 (No) | 3 (Yes) | 4 (Strong Yes) |
|---|---|---|---|---|
| Problem-solving | No approach, gives up | Brute force only | Correct approach with tradeoffs | Multiple approaches, optimal solution |
| Communication | Silent, unclear | Minimal explanation | Clear thinking aloud | Guides interviewer through reasoning |
| Code quality | Unreadable, no structure | Works but messy | Clean, idiomatic | Production-quality code |
| Testing | No testing | Tests happy path | Tests edge cases | Comprehensive tests with reasoning |

### Framework B: Real-World Coding
**Duration:** 45-60 minutes
**Target:** Senior+ roles, full-stack

**Structure:**
```
Phase 1: Requirements gathering (10 min)
  - Describe the feature to build
  - Clarify acceptance criteria
  - Confirm technology choices

Phase 2: Implementation (30 min)
  - Build the feature in a real IDE
  - Use actual frameworks/libraries
  - Write tests alongside implementation

Phase 3: Review and extend (10 min)
  - Discuss production readiness
  - Add error handling or edge case
  - Discuss deployment considerations
```

**Rubric:**
| Dimension | Description |
|---|---|
| Requirements | Clarifies scope, asks questions |
| Implementation | Functional, well-structured code |
| Testing | Unit tests, edge cases |
| Production awareness | Error handling, logging, monitoring |

### Framework C: Competitive Programming Style
**Duration:** 30-45 minutes
**Target:** Companies using HackerRank/CodeSignal

**Structure:**
```
Phase 1: Read problem statement (2 min)
Phase 2: Implement solution (20-25 min)
Phase 3: Submit and review (5-10 min)

Focus on:
  - Time complexity optimality
  - Handling constraints
  - Correctness on sample cases
```

**Note:** This format provides the weakest signal of all coding frameworks. Prefer live pair programming when possible.

---

## System Design Interview Frameworks

### Framework A: End-to-End Design
**Duration:** 45-60 minutes
**Target:** Senior+

**Structure:**
```
Phase 1: Requirements (10 min)
  - Functional requirements
  - Non-functional requirements (latency, availability, durability)
  - Scale estimation (DAU, QPS, storage)

Phase 2: High-level design (10 min)
  - System architecture diagram
  - Component identification
  - Data flow overview

Phase 3: Deep dive (20 min)
  - Database schema and choice
  - API design (REST/gRPC)
  - Key algorithm or data structure
  - Caching strategy
  - Load balancing and scaling

Phase 4: Cross-cutting concerns (10 min)
  - Fault tolerance and resilience
  - Monitoring and alerting
  - Security considerations
  - Tradeoff analysis

Phase 5: Summary (5 min)
  - Recap decisions made
  - What would you do with more time?
```

**Rubric:**
| Dimension | Key Questions |
|---|---|
| Requirements | Did they clarify scope before designing? Did they prioritize? |
| Architecture | Is the structure logical? Are components properly decoupled? |
| Scalability | Did they address sharding, caching, CDN, queues? |
| Data model | Is the schema appropriate? Did they discuss tradeoffs? |
| Tradeoffs | Did they compare multiple options with rationale? |

### Framework B: Focused Deep Dive
**Duration:** 45 minutes
**Target:** Roles needing deep expertise in specific domain

**Structure:**
```
Choose ONE area and explore deeply:
- Database: indexing, partitioning, replication, consistency
- Networking: protocol design, load balancing, service mesh
- Storage: file system, blob store, block store
- Distributed systems: consensus, replication, failure detection

Phase 1: Problem framing (5 min)
Phase 2: Deep design (30 min)
Phase 3: Failure analysis (10 min)
```

### Framework C: Design Review
**Duration:** 30-45 minutes
**Target:** Staff/Principal roles

**Structure:**
```
Given an existing system design document:
Phase 1: Review (10 min)
  - Identify design weaknesses
  - Spot scalability bottlenecks
Phase 2: Critique (15 min)
  - Present findings
  - Suggest improvements
Phase 3: Redesign (15 min)
  - Propose alternative architecture
  - Justify changes
```

---

## Behavioral Interview Frameworks

### Framework A: STAR Method
**Duration:** 45 minutes
**Target:** All roles

**Core questions organized by competency:**

#### Collaboration
- Tell me about a time you had to work with a difficult teammate.
- Describe a project where you collaborated across teams.
- Give an example of when you helped a teammate succeed.

#### Ownership and Initiative
- Tell me about a time you identified a problem and fixed it without being asked.
- Describe a project where you went above and beyond expectations.
- Give an example of when you took responsibility for a failure.

#### Conflict Resolution
- Describe a disagreement with a peer and how you resolved it.
- Tell me about a time you had to deliver bad news to a stakeholder.
- Give an example of when you disagreed with your manager.

#### Growth Mindset
- Tell me about a time you learned a new technology quickly.
- Describe a piece of constructive feedback you received and acted on.
- Give an example of when you failed and what you learned.

#### Leadership
- Tell me about a time you led a project without formal authority.
- Describe how you mentored a junior team member.
- Give an example of when you influenced a technical decision.

### Framework B: Situational Interview
**Duration:** 30-40 minutes
**Target:** Early career, interns

**Structure:**
```
Present hypothetical scenarios and evaluate reasoning:
- "What would you do if a production bug is found on Friday evening?"
- "How would you handle conflicting priorities from two stakeholders?"
- "Your teammate's code has a security vulnerability. What do you do?"

Scoring:
  - Identifies the problem correctly
  - Considers multiple approaches
  - Makes a reasoned decision
  - Communicates clearly
```

### Framework C: Technical Leadership Assessment
**Duration:** 45-60 minutes
**Target:** Staff, principal, manager

**Structure:**
```
Phase 1: Technical strategy (20 min)
  - How would you evolve a legacy system?
  - How do you decide between building vs buying?
  - How do you set technical direction for a team?

Phase 2: People and process (20 min)
  - How do you handle an underperforming team member?
  - What is your approach to on-call rotations?
  - How do you drive engineering excellence?

Phase 3: Decision-making (15 min)
  - Walk me through a difficult technical decision you made.
  - How do you handle ambiguous requirements?
  - Describe a time you changed someone's mind.
```

---

## Take-Home Assignment Frameworks

### Framework A: Feature Implementation
**Duration:** 4-6 hours
**Target:** Senior full-stack

**Structure:**
```
Deliverable: Working application with:
  - README with setup and design decisions
  - At least 80% test coverage
  - Production-ready error handling
  - API documentation

Evaluation criteria:
  - Does it work? (functional completeness)
  - Is the code well-structured? (maintainability)
  - Are edge cases handled? (robustness)
  - Are tradeoffs documented? (decision-making)
  - Would you deploy this to production? (production-readiness)
```

### Framework B: Data Analysis
**Duration:** 3-5 hours
**Target:** Data science, data engineering

**Structure:**
```
Deliverable: Jupyter notebook with:
  - Data exploration and cleaning
  - Analysis with visualizations
  - Statistical conclusions
  - Code with comments

Evaluation criteria:
  - Correctness of analysis
  - Quality of insights
  - Code clarity and reproducibility
  - Communication of findings
```

### Framework C: Bug Fixing and Refactoring
**Duration:** 2-3 hours
**Target:** Any senior role

**Structure:**
```
Deliverable: Pull request against existing codebase with:
  - Bug fix with test
  - Refactored code with justification
  - Description of changes

Evaluation criteria:
  - Correctly identified and fixed the bug
  - Improvements to code quality
  - Test coverage of changes
  - Communication in PR description
```

### Take-Home Best Practices
- Set clear time expectations (4 hours is standard for senior roles).
- Compensate for time spent (gift card or donation).
- Provide a rubric upfront so candidates know expectations.
- Review within 3 business days.
- Offer feedback regardless of outcome.

---

## Debugging and Troubleshooting Frameworks

### Framework A: Production Incident Debug
**Duration:** 45 minutes
**Target:** SRE, DevOps, backend

**Structure:**
```
Phase 1: Symptom analysis (10 min)
  - What metrics are abnormal?
  - What logs show?
  - What changed recently?

Phase 2: Root cause investigation (20 min)
  - Form hypotheses
  - Run diagnostic commands
  - Narrow down possibilities

Phase 3: Fix and verification (10 min)
  - Propose fix
  - Verify in staging
  - Production rollout plan

Phase 4: Prevention (5 min)
  - Monitoring improvements
  - Runbook updates
  - Post-mortem items
```

**Rubric:**
| Dimension | Criteria |
|---|---|
| Systematic approach | Follows logical elimination process |
| Tool proficiency | Uses appropriate debug tools |
| Communication | Explains reasoning, asks clarifying questions |
| Fix quality | Correct, safe, minimal blast radius |

### Framework B: Code Debugging
**Duration:** 45 minutes
**Target:** Software engineer

**Structure:**
```
Given a codebase with injected bugs:

Phase 1: Understand the code (10 min)
Phase 2: Identify the bug (15 min)
Phase 3: Fix the bug (10 min)
Phase 4: Write a regression test (10 min)

Common bug types:
  - Off-by-one errors
  - Race conditions
  - Memory leaks
  - Null pointer exceptions
  - Incorrect state management
```

---

## API and Integration Design Frameworks

### Framework A: REST API Design
**Duration:** 45 minutes
**Target:** Backend, full-stack

**Structure:**
```
Phase 1: Requirements (10 min)
  - What resources are being exposed?
  - Who are the consumers?
  - What are the performance requirements?

Phase 2: Endpoint design (15 min)
  - URL structure and naming
  - HTTP methods and status codes
  - Request/response formats

Phase 3: Advanced concerns (15 min)
  - Authentication and authorization
  - Rate limiting
  - Versioning strategy
  - Pagination and filtering

Phase 4: Documentation (5 min)
  - OpenAPI/Swagger spec
  - Error format
  - SDK considerations
```

### Framework B: Event-Driven Architecture Design
**Duration:** 45 minutes
**Target:** Senior backend, architect

**Structure:**
```
Phase 1: Event identification (10 min)
  - What events exist in the system?
  - What is the event schema?

Phase 2: Infrastructure selection (15 min)
  - Message broker choice (Kafka, RabbitMQ, SQS)
  - Partitioning strategy
  - Delivery guarantees

Phase 3: Error handling (10 min)
  - Dead letter queues
  - Retry policies
  - Exactly-once vs at-least-once

Phase 4: Monitoring (10 min)
  - Lag monitoring
  - Consumer health
  - Schema evolution
```

---

## Pair Programming Frameworks

### Framework A: Driver-Navigator
**Duration:** 45-60 minutes
**Target:** All roles

**Structure:**
```
Two roles:
  Driver: writes code, shares screen
  Navigator: reviews, suggests, researches

Switch roles halfway through.

Task: Build a small feature or fix a bug.

Evaluation:
  - How does the candidate communicate?
  - Do they listen to suggestions?
  - How do they handle being wrong?
  - Can they explain their reasoning?
```

### Framework B: Mob Programming Session
**Duration:** 60 minutes
**Target:** Team fit assessment for collaborative environments

**Structure:**
```
Candidate joins existing team members on a real task.

Phase 1: Context introduction (10 min)
Phase 2: Contribution (40 min)
Phase 3: Retrospective (10 min)

Evaluation:
  - Team interaction
  - Communication style
  - Technical contribution
  - Cultural alignment
```

---

## Framework Customization by Seniority

### Junior (0-2 years)
- Focus: coding fundamentals, basic problem-solving, willingness to learn
- Frameworks: Algorithm coding (Framework A), Situational behavioral
- Dimensions: Code quality, problem-solving approach, communication, learning potential
- Expected level: Can solve easy-medium problems with guidance

### Mid-Level (3-5 years)
- Focus: independent delivery, production awareness, collaboration
- Frameworks: Real-world coding (Framework B), System design (Framework A), STAR behavioral
- Dimensions: Technical depth, production readiness, collaboration, ownership
- Expected level: Solves medium problems independently, considers edge cases

### Senior (5-8 years)
- Focus: architecture, mentorship, project leadership
- Frameworks: System design (Framework A or B), Take-home (Framework A), Leadership behavioral
- Dimensions: System thinking, tradeoff analysis, mentorship, technical strategy
- Expected level: Drives design decisions, mentors juniors, unblocks teams

### Staff/Principal (8+ years)
- Focus: organizational impact, technical vision, cross-team influence
- Frameworks: Design review (Framework C), Technical leadership behavioral (Framework C), Take-home (Framework A)
- Dimensions: Strategic thinking, influence without authority, organizational design, innovation
- Expected level: Shapes technical org, sets standards, drives multi-quarter initiatives

---

## Framework Customization by Role Type

### Backend Engineer
- Coding: Real-world coding (Framework B), algorithm-focused
- System design: End-to-end (Framework A), database deep dive
- Take-home: Feature implementation with API
- Key dimensions: Data modeling, API design, performance optimization

### Frontend Engineer
- Coding: Browser-based live coding, component building
- System design: Component architecture, state management, rendering
- Take-home: UI implementation from mockup
- Key dimensions: UX sensibility, component design, accessibility, performance

### Mobile Engineer
- Coding: Device-based coding (iOS/Android)
- System design: Mobile architecture, offline-first, push notifications
- Take-home: Feature implementation with platform specifics
- Key dimensions: Platform expertise, offline handling, performance optimization

### DevOps/SRE Engineer
- Coding: Debugging framework, infrastructure as code
- System design: Reliability, scalability, observability
- Take-home: Infrastructure automation or incident response
- Key dimensions: Systems thinking, automation mindset, incident management

### Data Scientist
- Coding: SQL + Python analysis
- System design: ML pipeline, data pipeline
- Take-home: Data analysis with notebook
- Key dimensions: Statistical reasoning, experimentation, communication

### Engineering Manager
- Coding: Code review (Framework C), not live coding
- System design: Process design, team topology
- Behavioral: Leadership (Framework C), 2x sessions
- Key dimensions: People development, process design, technical judgement

### ML/AI Engineer
- Coding: Algorithm with ML twist
- System design: ML system, data pipeline, model serving
- Take-home: Model building with evaluation
- Key dimensions: ML fundamentals, data handling, model evaluation, production ML

---

## Scoring Guidance

### Score Consolidation
After all interviews, consolidate scores:

```
Interviewer scores: I1(3.5), I2(4.0), I3(3.0)
Average: 3.5
Variance: 0.25 (low -- good calibration)

Weight by importance:
  Coding (40%): 3.5 * 0.4 = 1.40
  Design (30%): 3.0 * 0.3 = 0.90
  Behavioral (30%): 4.0 * 0.3 = 1.20
  Total: 3.50
```

### Decision Thresholds
| Total Score | Action |
|---|---|
| 3.5-4.0 | Strong hire, expedite offer |
| 3.0-3.49 | Hire, standard offer |
| 2.5-2.99 | Discuss in debrief, may need extra round |
| < 2.5 | No hire |

### Red Flags
- Score variance > 1.5 between interviewers (calibration issue or missed signal)
- Must-have score under 2 on any dimension
- Candidate declined to answer behavioral questions
- Reference check contradicts interview findings

## Handoff
`hiring-evaluation-decision.md` for translating framework output into offer decisions.
`../SKILL.md` for the parent hiring process skill.
