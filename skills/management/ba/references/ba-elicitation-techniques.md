# BA Elicitation Techniques

## Overview

Requirements elicitation is the practice of discovering and understanding stakeholder needs, constraints, and expectations. It is the foundation of effective business analysis — poor elicitation produces incorrect requirements, rework, and project failure. This reference provides a comprehensive guide to elicitation techniques, including selection criteria, preparation, execution, and documentation.

## Elicitation Planning

### Factors in Technique Selection

| Factor | Consideration | Impact on Selection |
|--------|---------------|-------------------|
| Stakeholder availability | Limited time available | Choose focused techniques (structured interview over workshop) |
| Stakeholder geography | Co-located vs distributed | Virtual workshops require more facilitation than in-person |
| Project phase | Early discovery vs refinement | Early: brainstorming, observation; Later: prototyping, survey |
| Problem complexity | Simple vs complex | Complex: workshop, prototyping; Simple: interview, survey |
| Number of stakeholders | Few vs many | Few: interview, observation; Many: survey, focus group |
| Domain knowledge | Known vs unknown domain | Unknown: document analysis, observation, interviews |
| Time available | Urgent vs flexible | Urgent: focused interview; Flexible: comprehensive workshop |
| Budget | Constrained vs generous | Constrained: document analysis, survey; Generous: full workshop, prototyping |
| Political sensitivity | High vs low | Sensitive: individual interviews, not group workshops |
| Existing documentation | Rich vs none | Rich: document analysis first; None: observation, interview |

### Elicitation Schedule Template

```yaml
elicitation_plan:
  project: Order Management Redesign
  phase: Discovery (Weeks 1-4)
  activities:
    - week: 1
      activities:
        - Document analysis: Current system specs, user manuals
        - Stakeholder identification: Create stakeholder matrix
      deliverables: Document summary, stakeholder list
    - week: 2
      activities:
        - Stakeholder interviews (6 interviews, 45 min each)
        - Process observation (shadow 3 order processors, 2 hours each)
      deliverables: Interview notes, observation report
    - week: 3
      activities:
        - Requirements workshop (full day, 8-12 participants)
        - Interface analysis (3 system interfaces)
      deliverables: Workshop output, interface specifications
    - week: 4
      activities:
        - Prototype review sessions (3 sessions, 2 hours each)
        - Survey follow-up for remaining questions
      deliverables: Prototype feedback, survey results
    - ongoing:
      - Validate findings with stakeholders
      - Document requirements as user stories
      - Trace requirements to business objectives
```

## Interview Technique

### Types of Interviews

| Interview Type | Structure | Best For | Duration | Preparation |
|---------------|-----------|----------|----------|-------------|
| Structured | Predefined questions, fixed order | Known domain, specific gaps | 30-45 min | High — question list prepared |
| Semi-structured | Question guide, flexible order | Most common — balances depth and coverage | 45-60 min | Medium — topic guide |
| Unstructured | Open conversation, guided by responses | Early discovery, unknown domain | 60-90 min | Low — topic areas only |

### Interview Preparation Checklist

```
Pre-Interview:
  [ ] Define interview objective (what must I learn?)
  [ ] Research interviewee role and background
  [ ] Review relevant documents and artifacts
  [ ] Prepare question guide (5-10 open-ended questions)
  [ ] Schedule 45-60 minutes
  [ ] Confirm logistics (room, virtual link, recording permission)
  [ ] Prepare capture method (notes, recording, template)

Question Design:
  [ ] Start with broad, open-ended questions
  [ ] Follow with specific, probing questions
  [ ] Include "What else?" at the end of each topic
  [ ] Avoid leading questions ("Don't you think X would help?")
  [ ] Avoid yes/no questions — use HOW, WHAT, WHY
  [ ] Prepare follow-up probes for each main question

During Interview:
  [ ] Arrive on time
  [ ] State objective and duration upfront
  [ ] Ask permission to record
  [ ] Listen more than you talk (80/20 rule)
  [ ] Take notes, but maintain eye contact
  [ ] Paraphrase to confirm understanding
  [ ] Watch for non-verbal cues
  [ ] Ask "What did I miss?" at the end
  [ ] Thank interviewee and explain next steps
```

### Question Types

| Question Type | Purpose | Examples |
|---------------|---------|----------|
| Open-ended | Encourage detailed response | "Tell me about your current order process." |
| Closed | Confirm specific facts | "Do you currently use the search function?" |
| Probing | Dig deeper into a topic | "Can you give me a specific example of that?" |
| Clarifying | Resolve ambiguity | "When you say 'quickly', what timeframe do you mean?" |
| Hypothetical | Explore future possibilities | "What would happen if the system went down for an hour?" |
| Mirroring | Encourage elaboration | "You mentioned the handoff is painful — tell me more about that." |
| Summarizing | Confirm understanding | "So if I understand correctly, the approval goes through three stages?" |
| Comparison | Understand differences | "How does this process differ for international orders?" |

### Interview Documentation Template

```yaml
interview_record:
  id: INT-001
  project: Order Management Redesign
  interviewee:
    name: Sarah Chen
    role: Senior Order Processor
    department: Operations
    experience: 8 years in role
  date: 2026-04-15
  duration: 50 minutes
  format: Semi-structured (in-person)
  objective: Understand current order processing workflow and pain points
  summary:
    - Currently processing 50-70 orders per day manually
    - Biggest pain point: manual data entry from email orders
    - Average order processing time is 15 minutes
    - Top priority: automated order ingestion from email
  key_quotes:
    - "I spend half my day copying data from emails into the system."
    - "If I could just click a button to import an order, that would save hours."
  pain_points:
    - pain_point: Manual email order entry
      severity: high
      frequency: 50-70 times per day
      impact: 4+ hours per day
    - pain_point: Duplicate order checking
      severity: medium
      frequency: 5-10 times per day
      impact: Customer frustration
  current_process_steps:
    - Open email with order attachment
    - Manually copy customer details to system
    - Manually enter line items
    - Calculate shipping cost from separate tool
    - Generate order confirmation
    - Email confirmation back to customer
  improvement_suggestions:
    - Automated email order parsing
    - Saved customer profiles for repeat orders
    - Integrated shipping calculator
  follow_up_questions:
    - How many order formats do you receive from different customers?
    - What fields are most commonly entered incorrectly?
  next_steps:
    - Shadow order processing session
    - Review sample email orders (de-identified)
```

## Workshop Facilitation

### Workshop Types

| Workshop Type | Purpose | Duration | Participants | Output |
|---------------|---------|----------|--------------|--------|
| Requirements workshop | Define and prioritize requirements | 4-8 hours | 8-12 | Prioritized requirements list |
| Discovery workshop | Understand problem space | 2-4 hours | 6-10 | Problem statement, scope |
| Story mapping | Structure user stories | 4-8 hours | 6-10 | Story map |
| Prioritization workshop | Rank and select requirements | 2-4 hours | 6-8 | Prioritized backlog |
| Retrospective | Learn from past iteration | 1-2 hours | Team | Improvement actions |
| JAD (Joint Application Design) | Structured requirements definition | 3-5 days | 10-20 | Complete requirements spec |

### Workshop Facilitation Checklist

```
Pre-Workshop (1-2 weeks before):
  [ ] Define workshop objective and agenda
  [ ] Identify and invite participants (8-12 max)
  [ ] Send pre-work (reading, thinking questions)
  [ ] Prepare materials (whiteboard, sticky notes, markers, templates)
  [ ] Book venue and test virtual tools
  [ ] Assign roles: facilitator, scribe, timekeeper
  [ ] Plan breakout activities if group > 8

During Workshop:
  [ ] Ground rules (one conversation, respect, timebox)
  [ ] State objective and agenda at start
  [ ] Icebreaker to set positive tone
  [ ] Mix individual thinking, pairs, and group discussion
  [ ] Use timeboxing to maintain pace
  [ ] Capture everything visibly (whiteboard, digital board)
  [ ] Encourage all voices — quiet participants need airtime
  [ ] Manage dominant participants respectfully
  [ ] Take breaks every 60-90 minutes
  [ ] Summarize at end of each session
  [ ] Document decisions and open items
  [ ] Confirm next steps and owners

Post-Workshop (within 48 hours):
  [ ] Send workshop summary to all participants
  [ ] Document decisions in requirements repository
  [ ] Follow up on action items
  [ ] Review workshop effectiveness (what worked, what to improve)
```

### Workshop Agenda Template (Full Day)

```yaml
workshop:
  title: Order Management Requirements Workshop
  date: 2026-04-20
  location: Conference Room B | Zoom
  participants:
    - Product Manager
    - 2 Order Processing Team Members
    - Customer Support Lead
    - Engineering Lead
    - UX Designer
    - QA Lead
  agenda:
    - time: "09:00 - 09:15"
      activity: Welcome, agenda review, ground rules
      facilitator: BA Lead
    - time: "09:15 - 09:45"
      activity: Current state overview (process walkthrough)
      presenter: Order Processing Lead
    - time: "09:45 - 10:30"
      activity: Pain point mapping (individual then group)
      technique: Silent brainstorming + affinity mapping
    - time: "10:30 - 10:45"
      activity: Break
    - time: "10:45 - 12:00"
      activity: Future state visioning
      technique: "How might we..." statements + dot voting
    - time: "12:00 - 13:00"
      activity: Lunch
    - time: "13:00 - 14:30"
      activity: Requirements identification and prioritization
      technique: MoSCoW prioritization
    - time: "14:30 - 14:45"
      activity: Break
    - time: "14:45 - 16:00"
      activity: Story mapping (backbone + walking skeleton)
      technique: User story mapping
    - time: "16:00 - 16:30"
      activity: Next steps, owners, timeline
    - time: "16:30"
      activity: Close
```

### Virtual Workshop Best Practices

```
Platform Setup:
  - Use a collaborative whiteboard (Miro, Mural) as the main workspace
  - Ensure stable video connection for all participants
  - Have a backup communication channel (chat, phone)
  - Test all tools 30 minutes before start
  - Send calendar invite with direct links

Facilitation Adjustments:
  - Shorter sessions (max 3 hours, not full day)
  - More frequent breaks (every 45-60 minutes)
  - Explicit turn-taking to avoid crosstalk
  - Use breakout rooms for pair/small group work
  - Leverage chat for quieter participants
  - Use reactions, polls, and hand-raise features
  - Record sessions for absent participants

Engagement Techniques:
  - Start with a check-in question
  - Use collaborative document editing
  - Regular polling for decisions and consensus
  - Shared screen with real-time capture
  - Gamification (timed challenges, voting)
  - Visual thinking templates (mind maps, flowcharts)
  - Rotate facilitator and scribe roles
```

## Observation Technique

### Observation Types

| Type | Description | Best For | Duration | Participant Impact |
|------|-------------|----------|----------|-------------------|
| Passive observation | Observe without interaction | Understanding current process, discovering workarounds | 2-8 hours | Minimal — but observer effect may change behavior |
| Active observation | Observe and ask clarifying questions | Deep understanding with context | 2-4 hours | Moderate — interruptions may affect flow |
| Participant observation | Perform the task alongside users | Building empathy, understanding tacit knowledge | 4-40 hours | High — but deepest understanding |
| Job shadowing | Follow a worker through their day | End-to-end process understanding | 4-8 hours | Low — worker continues normal activities |
| Ethnographic study | Immerse in user environment over time | Complex environments, unspoken practices | Days to weeks | High — builds deep trust and understanding |

### Observation Preparation and Execution

```
Preparation:
  [ ] Define observation objective and scope
  [ ] Identify observation subjects (2-3 diverse users)
  [ ] Obtain permission from managers and users
  [ ] Explain purpose to subjects (non-evaluative, process improvement)
  [ ] Prepare observation template (time, activity, duration, pain points)
  [ ] Minimize observer effect — dress appropriately, be unobtrusive

During Observation:
  [ ] Arrive early, be respectful of workspace
  [ ] Stay quiet during task execution (save questions for breaks)
  [ ] Capture: time, activity, tools used, duration, interruptions, workarounds
  [ ] Note emotional responses (frustration, satisfaction, confusion)
  [ ] Observe multiple cycles if process is repetitive
  [ ] Look for workarounds — they indicate system deficiencies
  [ ] Notice what is NOT done (gaps in the process)
  [ ] Record environmental factors (noise, lighting, ergonomics)
  [ ] Ask questions only at natural break points

After Observation:
  [ ] Review and expand notes immediately
  [ ] Identify patterns across multiple observations
  [ ] Distinguish between normal process and exceptions
  [ ] Validate findings with observed users
  [ ] Quantify time spent on each activity
  [ ] Document workarounds and their root causes
  [ ] Thank participants and share what you learned
```

### Observation Template

```yaml
observation_record:
  id: OBS-003
  project: Order Management Redesign
  subject:
    role: Senior Order Processor
    experience: 5 years
    shift: 9:00 AM - 5:00 PM
  date: 2026-04-18
  duration: 4 hours (9:00 - 13:00)
  objective: Understand end-to-end order processing workflow
  environment:
    - Open office layout
    - Dual monitor setup
    - Headset for phone calls
    - Reference binder with manuals
  timeline:
    - time: "09:00 - 09:15"
      activity: System login, email check, prioritization of queue
      tools: Email client, order system
      observations: Reviews emails first to identify urgent orders
    - time: "09:15 - 09:30"
      activity: Processing email order #10234
      tools: Email, order system, calculator
      observations: Manual copy-paste of 12 fields. Cross-references customer database. Uses personal sticky note for shipping rates. Workaround: keeps browser tab open with shipping calculator.
    - time: "09:30 - 09:45"
      activity: Phone call — customer changing order
      tools: Phone, order system
      observations: Had to navigate through 4 screens to find the order. Customer on hold for 2+ minutes while navigating.
    - time: "09:45 - 10:30"
      activity: Batch processing 5 email orders
      tools: Email, order system
      observations: Efficient for standard orders. Struggles with multi-line orders — has to add line items one at a time. Counts clicks on "Add Item" button.
    - time: "10:30 - 10:45"
      activity: Break
    - time: "10:45 - 11:00"
      activity: Processing rush order (phone + email)
      tools: Phone, email, order system
      observations: Rush orders require supervisor approval. Leaves current screen, opens approval portal, enters order ID, waits for email notification. Approval takes 10 minutes.
    - time: "11:00 - 12:00"
      activity: Continue batch processing
      tools: Order system, email
      observations: Steady pace. Small talk while working — mentions frustration with duplicate data entry.
    - time: "12:00 - 13:00"
      activity: End-of-morning reporting
      tools: Excel, email
      observations: Manual entry of stats into Excel for manager report. Questions why system can't auto-generate this.
  key_findings:
    - 60% of time spent on manual data entry (copy/paste from email)
    - 10% of time spent on phone coordination
    - 15% of time spent on approvals and exceptions
    - 10% of time spent on reporting
    - 5% of time on breaks and admin
  workarounds_observed:
    - Sticky note with shipping rates (rates app is slow)
    - Dual browser tabs to avoid switching between systems
    - Personal Excel tracker for order status (system status is unreliable)
    - Physical sticky notes on monitor for follow-ups
  pain_points:
    - Repetitive data entry across multiple systems
    - Slow approval process for rush orders
    - Manual reporting despite data being in the system
    - Cumbersome order modification process
```

## Document Analysis

### Document Types for Analysis

| Document Type | What It Contains | Analysis Value | Limitations |
|---------------|------------------|----------------|-------------|
| Process manuals | SOPs, workflows, decision criteria | Understand intended process | Often outdated, may not reflect actual practice |
| System specifications | Technical requirements, architecture | Understand system capabilities | Technical, may not capture business context |
| User guides/manuals | How to use the system | Understand features and functions | Focused on "how" not "why" |
| Training materials | Tutorials, examples, FAQs | Understand common tasks and issues | May oversimplify |
| Meeting minutes | Decisions, action items, discussions | Understand history and context | Incomplete, biased toward what was captured |
| Support tickets | Customer issues and resolutions | Identify common problems and gaps | Reactive, may not capture systematic issues |
| Reports | Operational metrics, dashboards | Understand current performance | May not explain root causes |
| Policies | Rules, guidelines, compliance requirements | Understand constraints and boundaries | May conflict with operational reality |
| Contracts | Service agreements, SLAs, terms | Understand obligations and scope | Legally focused, may lack operational detail |
| Previous project docs | BRDs, FRDs, requirements specs | Build on existing knowledge | May be outdated, may reflect assumptions |
| Error logs | System errors, stack traces | Identify technical issues | Requires technical interpretation |
| Audit reports | Compliance findings, recommendations | Identify gaps and risks | Point-in-time, may not reflect current state |

### Document Analysis Process

```
Step 1: Identify relevant documents
  - Consult stakeholders about document inventory
  - Search knowledge bases, shared drives, wikis
  - Ask for "the most current version"
  - Identify document owners

Step 2: Assess document quality
  - Is it current? (created/modified date)
  - Is it complete? (sections, versions)
  - Is it authoritative? (signed or approved?)
  - Is it consistent with other documents?

Step 3: Extract relevant information
  - Requirements and specifications
  - Process descriptions and workflows
  - Data definitions and business rules
  - System constraints and integration points
  - Known issues and limitations
  - Stakeholder names and roles

Step 4: Identify gaps and conflicts
  - What is missing from documentation?
  - Where do documents contradict each other?
  - Where does documentation differ from actual practice?
  - What has changed since the document was created?

Step 5: Validate with stakeholders
  - Share extracted information
  - Flag gaps and conflicts
  - Confirm document accuracy
  - Identify documents not yet discovered
```

## Prototyping

### Prototyping Approaches

| Approach | Fidelity | Best For | Time to Create | Tools |
|----------|----------|----------|----------------|-------|
| Paper prototyping | Low | Early concept validation | Hours | Paper, markers, sticky notes |
| Wireframing | Low-Medium | Layout, structure, flow | 1-3 days | Balsamiq, Figma, Sketch |
| Interactive mockup | Medium | Clickable demo, flow validation | 3-10 days | Figma, Adobe XD, Axure |
| High-fidelity prototype | High | Visual design, interaction detail | 1-4 weeks | Figma, Sketch, InVision |
| Code prototype | Very high | Technical feasibility, real interaction | 2-8 weeks | React, Flutter, native |
| Wizard of Oz | Varies | Simulating AI/complex features | 1-3 days | Human behind the curtain |

### Prototyping for Requirements Validation

```
When to Prototype:
  - Requirements are unclear or abstract
  - Multiple stakeholder groups have different mental models
  - User interface is a significant component
  - Complex workflows need visual confirmation
  - Stakeholders cannot articulate their needs verbally

Prototyping Process:
  1. Define prototype objective (what will we learn?)
  2. Identify target audience (who will review?)
  3. Select appropriate fidelity (low is faster)
  4. Create prototype focused on objective
  5. Prepare review session with scenarios
  6. Conduct review: observe, don't lead
  7. Capture feedback: what works, what doesn't, what's missing
  8. Iterate: refine prototype, repeat review
  9. Document decisions and validated requirements
  10. Transition to development specification

Review Session Guidelines:
  - Don't explain the prototype — let user explore and react
  - Use scenarios: "You need to process a rush order. Show me what you'd do."
  - Ask: "What do you expect to happen when you click this?"
  - Note where expectations differ from design
  - Ask: "Is there anything you expected to see that isn't here?"
  - Don't defend design choices — listen and learn
  - Record sessions (with permission) for later analysis
```

## Survey and Questionnaire

### Survey Design Principles

| Principle | Description | Example |
|-----------|-------------|---------|
| Clear objective | Every question serves a defined purpose | "This question will determine feature priorities" |
| Simple language | Avoid jargon, acronyms, complex terms | "How often do you process orders?" not "What is your order processing frequency distribution?" |
| One concept per question | Don't combine multiple questions | "Are you satisfied with speed and accuracy?" should be two questions |
| Balanced scales | Equal positive and negative options | 5-point: Very Satisfied to Very Dissatisfied (not 4: Good to Excellent) |
| No leading questions | Don't suggest the answer | "What problems do you experience?" not "Don't you find the current system slow?" |
| Logical flow | Group related questions, use branching | Start broad, narrow down. Skip irrelevant sections. |
| Pilot testing | Test with 3-5 people before full release | Identify confusing questions, timing issues |
| Appropriate length | 5-10 minutes max completion time | 15-25 questions maximum |
| Anonymity option | Allow anonymous responses for sensitive topics | Stress that individual responses are confidential |
| Open-ended options | Free text for additional insights | "Is there anything else you'd like to share?" at the end |

### Survey Types for Requirements Elicitation

| Survey Type | Purpose | Best For | Distribution |
|-------------|---------|----------|--------------|
| Needs assessment | Identify what users need | Early discovery | Broad distribution |
| Prioritization | Rank features or requirements | Decision-making | Targeted to decision-makers |
| Satisfaction | Gauge satisfaction with current system | Baseline measurement | All users |
| Feedback | Gather reactions to a proposal | Requirements validation | Targeted to affected users |
| Demographic | Understand user population characteristics | Persona development | Broad distribution |
| Pain point identification | Identify common problems | Problem validation | Targeted to frequent users |

### Survey Template

```yaml
survey:
  title: Order Management System — Needs Assessment
  audience: All order processing staff (estimated 50 respondents)
  estimated_time: 8 minutes
  sections:
    - section: About Your Role
      questions:
        - id: Q1
          type: single_choice
          text: How long have you been processing orders?
          options:
            - Less than 6 months
            - 6-12 months
            - 1-3 years
            - 3-5 years
            - 5+ years
        - id: Q2
          type: single_choice
          text: How many orders do you process on an average day?
          options:
            - 1-10
            - 11-25
            - 26-50
            - 51-100
            - 100+
    - section: Current Process
      questions:
        - id: Q3
          type: multi_choice
          text: Which systems do you use regularly? (Select all that apply)
          options:
            - Order Management System
            - Email
            - Shipping Calculator
            - Customer Database
            - Reporting Tool
            - Excel
            - Other
        - id: Q4
          type: rating_scale
          text: How satisfied are you with the current order processing time?
          scale: 1 (Very dissatisfied) to 5 (Very satisfied)
        - id: Q5
          type: matrix
          text: Rate the current system on these dimensions
          rows:
            - Ease of use
            - Speed
            - Reliability
            - Accuracy
          columns:
            - Poor
            - Fair
            - Good
            - Excellent
    - section: Pain Points
      questions:
        - id: Q6
          type: ranking
          text: Rank your top 3 pain points (1 = biggest pain)
          options:
            - Manual data entry
            - Slow approval process
            - Duplicate work across multiple systems
            - Difficulty finding order information
            - Limited reporting capabilities
            - Training new staff on the system
        - id: Q7
          type: open_text
          text: What is the single biggest improvement we could make to the order processing system?
    - section: Priorities
      questions:
        - id: Q8
          type: multi_choice
          text: Which features would be most valuable to you? (Select top 3)
          options:
            - Automated email order import
            - One-click order modification
            - Faster approval workflow
            - Auto-generated reports
            - Customer order portal
            - Integration with shipping carriers
        - id: Q9
          type: open_text
          text: Is there anything else you'd like us to know about your needs?
```

## Focus Groups

### Focus Group Guidelines

| Aspect | Recommendation |
|--------|----------------|
| Group size | 6-10 participants per session |
| Session duration | 60-90 minutes |
| Number of sessions | 2-4 sessions per topic (different participant groups) |
| Facilitator role | Neutral guide, not participant or expert |
| Participant selection | Representative of target user population, not volunteers only |
| Incentive | Appropriate compensation for time (gift card, lunch) |
| Location | Neutral, comfortable, quiet |
| Recording | Video/audio recording with consent, plus scribe notes |
| Ground rules | One person speaks at a time, no wrong answers, respect confidentiality |
| Structure | Opening → Topic exploration → Deep discussion → Summary |

### Focus Group Discussion Guide

```yaml
focus_group:
  topic: New Order Management System Requirements
  session: 1 of 3 (Regular Order Processors)
  participants: 8 order processing staff (mix of experience levels)
  duration: 90 minutes
  facilitator: BA Lead
  scribe: Junior BA
  discussion_guide:
    opening: (10 min)
      - Facilitator introduction and session purpose
      - Ground rules
      - Participant introductions (name, role, years at company)
    current_experience: (20 min)
      - What does a typical day look like for you?
      - What are the most frustrating parts of your job?
      - What workarounds have you developed?
      - Probe: Tell me about the last time something went wrong
    future_vision: (25 min)
      - Imagine you had a magic wand — what would the perfect order system do?
      - What would make you excited to come to work?
      - What would you want to KEEP from the current system?
      - Probe: What would save you the most time?
    priorities: (20 min)
      - Present top requirements from survey results
      - Group discussion: Which are most important? Why?
      - Group discussion: What's missing from this list?
      - Consensus check: Can we agree on top 3 priorities?
    closing: (15 min)
      - Summary of key points (facilitator)
      - Confirm understanding with group
      - Next steps in the project
      - Thank participants
  materials:
    - Large post-it notes and markers
    - Whiteboard or digital equivalent
    - Printed survey results summary
    - Consent forms
    - Refreshments
```

## Additional Elicitation Techniques

### Brainstorming

| Technique | Process | Best For | Duration | Output |
|-----------|---------|----------|----------|--------|
| Free brainstorming | Generate ideas without judgment | Broad idea generation | 30-60 min | Unfiltered idea list |
| Round-robin | Each person shares one idea in turn | Ensuring all voices heard | 20-40 min | Distributed idea list |
| Brainwriting | Write ideas silently, then share | Introverted participants, reducing groupthink | 20-30 min | Individual idea lists |
| Reverse brainstorming | Generate ways to cause the problem | Identifying root causes and risks | 30-60 min | Risk/issue list |
| SCAMPER | Substitute, Combine, Adapt, Modify, Put to other use, Eliminate, Rearrange | Structured innovation | 45-90 min | Enhanced idea list |

### Mind Mapping

```
Mind mapping process:

1. Place central topic in center of whiteboard/digital board
   [Order Management]

2. Branch out to main categories
   [Order Management]
     ├── Order Entry
     ├── Order Processing
     ├── Order Fulfillment
     ├── Reporting
     └── Customer Communication

3. Sub-branch for details
   [Order Entry]
     ├── Email import
     ├── Manual entry
     ├── Batch upload
     └── API integration

4. Continue to sub-sub-branches as needed
   [Email import]
     ├── Parse order details
     ├── Validate customer
     ├── Check inventory
     └── Create order record

5. Review and identify:
   - Gaps (missing branches)
   - Connections (cross-branch relationships)
   - Priorities (mark most important branches)
   - Complexity (branches with too many levels need simplification)
```

### Root Cause Analysis

| Technique | Description | Process | Output |
|-----------|-------------|---------|--------|
| 5 Whys | Ask "why" five times to drill to root cause | State problem, ask why, repeat 5 times | Root cause(s) |
| Fishbone (Ishikawa) | Diagram causes by category (People, Process, Technology, etc.) | Identify problem, brainstorm causes by category, identify root causes | Cause-and-effect diagram |
| Cause-and-effect analysis | Map cause chains from root to symptoms | Identify problem, work backward through cause chain | Cause chain diagram |
| Pareto analysis | Focus on the 20% of causes that produce 80% of problems | List problems, count frequency, sort by frequency | Pareto chart |
| Fault tree analysis | Top-down analysis of failure paths | Identify failure, analyze contributing events/conditions | Fault tree diagram |

### Interface Analysis

```
Interface analysis identifies interactions between the system under analysis and external systems, users, and other entities.

Interface types:
  User Interface (UI) — screens, forms, reports
  Application Programming Interface (API) — REST, GraphQL, SOAP
  Database Interface — shared databases, data replication
  File Interface — batch imports/exports, flat files
  Hardware Interface — devices, sensors, peripherals
  Protocol Interface — TCP/IP, HTTP, MQTT, WebSocket

For each interface, document:
  - Interface ID and name
  - Source and target systems
  - Direction (one-way, two-way)
  - Data exchanged (fields, formats, volumes, frequency)
  - Protocol and technology
  - Security requirements
  - Performance requirements (latency, throughput)
  - Error handling
  - SLAs and reliability requirements
  - Existing documentation and specifications
```

### Data Mining and Analysis

```
Data mining as an elicitation technique:

When to use:
  - Existing systems have historical data
  - You need quantitative evidence of user behavior
  - Anecdotal reports conflict with actual usage data
  - You need to validate stakeholder claims

What to analyze:
  - System logs: feature usage, frequency, error rates
  - Transaction data: volumes, patterns, anomalies
  - Support tickets: common issues, resolution times
  - Database queries: most accessed data, slow queries
  - Search logs: what users are looking for
  - API calls: integration patterns, failures
  - User session recordings: how users navigate
  - A/B test results: user preferences

Analytical techniques:
  - Descriptive statistics (mean, median, mode, distribution)
  - Trend analysis (increasing, decreasing, seasonal)
  - Segmentation (by user type, feature, time period)
  - Correlation analysis (related behaviors)
  - Funnel analysis (drop-off points in processes)
  - Cohort analysis (behavior over time for groups)
```

## Elicitation Documentation and Validation

### Documentation Standards

| Standard | Description | Applies To |
|----------|-------------|------------|
| C.A.P.T.U.R.E. | Correct, Atomic, Precise, Traceable, Unambiguous, Relevant, Exact | All requirements |
| INVEST | Independent, Negotiable, Valuable, Estimable, Small, Testable | User stories |
| SMART | Specific, Measurable, Achievable, Relevant, Time-bound | Goals and targets |
| 5 W's + H | Who, What, When, Where, Why, How | Scenarios and use cases |
| A.T.O.M. | Appropriate, Testable, Observable, Measurable | Acceptance criteria |

### Elicitation Validation Techniques

| Validation Technique | Description | Timing | With Whom |
|---------------------|-------------|--------|-----------|
| Walkthrough | Present requirements for review | After draft | Stakeholders, team |
| Peer review | BA peer reviews elicitation output | After documentation | Other BAs |
| Prototype review | Interactive demo of understanding | During iteration | End users |
| Acceptance criteria review | Review Gherkin scenarios | Before development | PO, QA |
| Sign-off | Formal approval of requirements | Before development | Authorized stakeholders |
| Backlog refinement | Ongoing review of stories | Throughout iteration | Team, PO |
| Traceability check | Map reqs to objectives | Milestones | BA, PM |
| User acceptance testing | Real-world validation | Before release | End users |

### Elicitation Effectiveness Assessment

| Metric | How to Measure | Target |
|--------|----------------|--------|
| Requirements stability | % of requirements that change after sign-off | < 15% |
| Defect leakage | Defects found in UAT/production due to wrong requirements | < 5% of total defects |
| Stakeholder satisfaction | Survey after requirements delivery | > 4/5 |
| Rework due to requirements | Effort spent on requirement changes | < 10% of total effort |
| Coverage | % of stakeholder groups consulted | 100% |
| Traceability | % of requirements traced to objectives | 100% |
| Time to elicit | Average time per requirement | Varies by complexity |
| Validation participation | % of invited stakeholders who attend review sessions | > 80% |

## References

- IIBA (2015) — A Guide to the Business Analysis Body of Knowledge (BABOK Guide v3)
- Cohn, M. (2004) — User Stories Applied: For Agile Software Development
- Robertson, S. & Robertson, J. (2012) — Mastering the Requirements Process (3rd Edition)
- Wiegers, K. & Beatty, J. (2013) — Software Requirements (3rd Edition)
- Gottesdiener, E. (2002) — Requirements by Collaboration: Workshops for Defining Needs
- Patton, J. (2014) — User Story Mapping: Discover the Whole Story
- Pohl, K. (2010) — Requirements Engineering: Fundamentals, Principles, and Techniques
- Lazar, J., Feng, J., & Hochheiser, H. (2017) — Research Methods in Human-Computer Interaction
- Krueger, R. & Casey, M. (2014) — Focus Groups: A Practical Guide for Applied Research
- Beyer, H. & Holtzblatt, K. (1998) — Contextual Design: Defining Customer-Centered Systems
- Miles, M., Huberman, A., & Saldana, J. (2013) — Qualitative Data Analysis
- Cooper, A., Reimann, R., & Cronin, D. (2007) — About Face 3: The Essentials of Interaction Design
