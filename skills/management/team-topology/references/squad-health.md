# Squad Health

## Overview
Squad health assesses team effectiveness across multiple dimensions: satisfaction, delivery capability, cognitive load, and maturity. Regular health checks identify problems early and guide improvement investments.

## Squad Health Check Model

### The Spotify Model
A lightweight, regular check-in where team members rate their team on 10-12 dimensions using a simple traffic light system. Green = healthy, Amber = needs attention, Red = problematic. Run quarterly with each team individually and results aggregated anonymously.

### Standard Dimensions
Delivery: Is the team shipping valuable software frequently and sustainably? Quality: Is the codebase healthy and are defects low? Process: Are the team's ways of working effective and enjoyable? Mission: Does the team understand their purpose and how it connects to company goals? Support: Does the team get the support they need from other teams and leadership? Learning: Is the team growing their skills and improving their practices? Community: Do team members feel connected and supported? Speed: Can the team move quickly without being blocked? Easy to release: Is the release process smooth and low-risk? Suitability of process: Does the agile process fit the team's context? Health: Are team members' well-being and work-life balance sustainable?

### Customization
Teams should customize their dimensions to match their context. Remove irrelevant dimensions, add specific ones. Keep to 8-12 dimensions — more dilutes focus. Each dimension needs a clear definition to ensure consistent interpretation.

### Facilitation
Team members individually rate each dimension before discussion. Use colored dots (green, amber, red). Aggregate results anonymously. Team discusses results focusing on amber and red items. Identify one or two improvement actions per quarter. Avoid blame — focus on system and process.

## Team Maturity Models

### Tuckman Model
Forming: team comes together, polite, cautious, dependent on leader. Storming: conflict emerges, different opinions, roles questioned, tension. Norming: agreement forms, roles accepted, processes established, trust builds. Performing: high functioning, autonomous, self-correcting, delivers consistently. Adjourning: team dissolves or transitions to new purpose.

Assessment: which stage is the team currently at? How long have they been at this stage? What is blocking progression to the next stage? Leaders should adapt their style to the team's stage — more directive in forming, more delegative in performing.

### Dreyfus Model (Skill Acquisition)
Novice: needs detailed instructions, cannot handle exceptions, needs close supervision. Advanced Beginner: can handle some situations independently, needs context, still pattern-matches. Competent: can plan and prioritize, handles most situations, troubleshoots effectively. Proficient: sees the big picture, self-corrects, learns from experience. Expert: works intuitively, identifies patterns instantly, mentors others.

Application: assess team's skill level in key domains. Match coaching approach to current level. Novice teams need explicit guidance and structured process. Expert teams need autonomy and trust. A team can be expert in one domain and novice in another.

## Cognitive Load Assessment

### Measurement Framework
For each team, assess load across three dimensions weekly or monthly.
Survey questions: How much mental energy does your work require? (intrinsic). How much overhead do processes and coordination consume? (extraneous). How much time do you have for learning and improvement? (germane).

### Team Capacity Model
Total cognitive capacity = team members × individual capacity. Individual capacity varies by experience, domain familiarity, and external factors. Target team load < 80% of total capacity. Buffer for unexpected work, learning, and improvement.

### Cognitive Load Reduction
Intrinsic: split value streams, reduce domain scope, add more team members or split team. Extraneous: platform team adoption, automate manual processes, reduce meeting count and duration, better tools and documentation, reduce handoffs and dependencies.

### Monitoring
Include cognitive load in quarterly squad health checks. Track trend over time. Investigate when load exceeds 80% for two consecutive checks. Compare across teams to find systemic vs. local issues.

## Team API and Purpose Statement

### Team API
Each team should document their external interface, similar to a software API.
Identity: team name, members, location, time zone, communication channels.
Purpose: why this team exists, what value stream they own.
Responsibilities: what the team owns and maintains (services, code, systems).
Dependencies: what they need from other teams.
Services: what they provide to other teams (APIs, libraries, tools, support).
Interface: how to request something from the team (ticket, PR, Slack, meeting).
SLA: expected response times for different request types.
Escalation: who to contact for issues and how.

### Team Purpose Statement
A single sentence defining why the team exists and what they deliver. Good statement: "We enable marketing managers to create and measure campaign performance without engineering support." Bad statement: "We build and maintain the marketing platform." Difference: good states the user outcome, bad states the activity.

### Purpose Examples
Stream-aligned: "We help customers onboard and activate within 5 minutes of signup." Enabling: "We help stream-aligned teams adopt continuous delivery practices." Platform: "We provide self-service infrastructure that lets teams deploy in under 15 minutes." Complicated-subsystem: "We maintain the real-time analytics engine with 99.99% uptime."

## Key Points
Squad health checks are for the team, not for management reporting.
Results must be anonymous and aggregated to encourage honesty.
Improvement actions should be few and focused — 1-2 per quarter.
Cognitive load drives everything — measure it regularly.
Team API makes dependencies explicit and coordination predictable.
Purpose statement should be outcome-oriented, not activity-oriented.
Maturity models help calibrate expectations and coaching approach.
