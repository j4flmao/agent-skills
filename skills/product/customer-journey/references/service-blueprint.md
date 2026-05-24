# Service Blueprinting

## Overview
A service blueprint extends the journey map by visualizing the operational layers — frontstage and backstage actions, support processes, and physical evidence — that deliver the customer experience. Blueprints expose gaps, fail points, and opportunities for process improvement.

## Blueprint Structure

### Five Core Layers
Physical Evidence: every tangible item the customer encounters. Website UI, emails, invoices, packaging, signage, uniforms, buildings. These are artifacts that shape customer perception at each touchpoint.

Customer Actions: steps the customer takes through the journey. Search, browse, click, call, purchase, use, request support. These mirror the journey map's customer row and anchor everything below.

Frontstage (Visible) Actions: employee or system actions the customer can see and interact with directly. Sales conversation, onboarding demo, support chat, account dashboard. Everything that happens in real-time with customer present. Separated from customer by the line of interaction.

Backstage (Invisible) Actions: employee actions the customer cannot see but that happen on their behalf. Order processing, account setup, data validation, ticket routing, quality checks. Separated from frontstage by the line of visibility.

Support Processes: systems, tools, and third-party services that enable everything above. CRM, billing system, inventory database, authentication service, shipping carrier, compliance checks. Separated from backstage by the line of internal interaction.

### The Three Lines
Line of Interaction: separates customer actions from frontstage provider actions. Crossing this line means the customer and provider are directly interacting.

Line of Visibility: separates frontstage (visible) from backstage (invisible). Activities above are visible to customer; activities below are hidden. Crossing this line reveals internal operations to the customer.

Line of Internal Interaction: separates backstage actions from support processes. Crossing means the service relies on external systems or partner teams.

## Blueprint Components

### Fail Points
Steps where things commonly break or degrade.
Mark with an F or warning symbol on the blueprint.
Include: likely failure mode, impact on customer, frequency estimate.
Examples: slow page load fails moment of truth, agent transfer drops context, payment gateway times out, email notification never arrives.

### Wait Times
Delays that impact experience at each stage.
Mark expected duration and whether the customer perceives the wait.
Explicit waits: hold music, loading spinners, approval pending.
Implicit waits: processing time, shipping time, review time.

### Process Gaps
Steps where no process exists for an expected action.
The customer expects something and the organization has no defined response.
Examples: customer cancels but no retention process, bug reported but no follow-up, feature request with no feedback loop.

### Physical Evidence Inventory
List every physical or digital artifact the customer touches.
Assess consistency across touchpoints (same brand, tone, quality).
Identify missing evidence: confirmation pages, receipts, status updates, error messages.

## Blueprint Workshop Facilitation

### Preparation
Select a specific journey scope (narrow enough to be actionable). Gather existing journey map, customer research data, process documentation. Invite participants from each swimlane: customer-facing staff, operations, engineering, support. Prepare a large canvas with the five layers pre-labeled. Have sticky notes in five colors (one per layer).

### Facilitation
Start with the customer actions row from the existing journey map. Ask "What does the customer do next?" layer by layer. For each customer action, ask: What does the customer see/touch? (physical evidence). What does the employee do that the customer sees? (frontstage). What happens behind the scenes? (backstage). What systems/teams enable this? (support processes).

Mark each fail point with a red marker as you discover it. Indicate wait times with an hourglass symbol. Draw dotted lines for each of the three lines. Validate that every frontstage action has a corresponding backstage action and support process.

### Blueprint Review
Walk through the complete blueprint end-to-end with the group. Does every customer action have supporting processes? Are there orphan actions with no backend support? Is the physical evidence consistent? Are there unnecessary steps visible to the customer? Are there gaps where customer expectations exceed process capabilities?

## Analysis and Prioritization

### Gap Analysis
For each fail point or process gap, assess:
Severity: does it break the experience or just degrade it?
Frequency: how often does it happen?
Customer impact: churn risk, CSAT score impact, effort increase.
Business impact: cost of failure, support volume, revenue loss.

### Improvement Opportunities
Eliminate: remove unnecessary steps visible to customer.
Automate: replace manual backstage steps with systems.
Simplify: reduce steps in any layer.
Surface: move backstage actions frontstage when beneficial (proactive notifications).
Hide: move frontstage steps backstage when they add no customer value.

### Metrics Per Layer
Customer actions: completion rate, time per step, satisfaction.
Frontstage: service time, first contact resolution, quality score.
Backstage: processing time, error rate, handoff count.
Support processes: uptime, response time, integration health.

## Key Points
Service blueprints reveal the gap between what customers expect and what operations deliver.
Line of visibility is the most important design decision — what to expose, what to hide.
Every customer action should connect to at least one frontstage or backstage action.
Fail points with high severity and high frequency should be fixed before optimization.
Blueprints must be validated with operations teams, not just design.
