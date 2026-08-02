# Incident Management

## Framework
Based on the Incident Command System (ICS) and Google's SRE practices, a structured incident management process minimizes chaos and reduces MTTR (Mean Time To Recovery).

## Key Roles
During a major incident, roles must be explicitly assigned. One person can hold multiple roles in smaller incidents, but the Incident Commander should ideally only command.

1. **Incident Commander (IC):**
   - Holds the high-level state of the incident.
   - Coordinates the response, makes decisions, and delegates tasks.
   - Does *not* troubleshoot directly.
   - Can hand over the IC role if they need to step away or if the incident spans multiple shifts.

2. **Operations (Ops) / Subject Matter Expert (SME):**
   - The people actually investigating the issue, analyzing logs, and applying fixes.
   - Reports findings and status back to the IC.

3. **Communications (Comms):**
   - Manages internal and external communication.
   - Updates status pages, writes emails to stakeholders, and keeps non-responders informed so the IC and Ops can focus on the fix.

## The Process
1. **Detect & Declare:** Alert fires or user reports issue. Declare an incident.
2. **Triage:** Assess severity (e.g., SEV-1, SEV-2).
3. **Assemble:** Page the necessary on-call engineers. Assign roles (IC, Ops, Comms).
4. **Mitigate:** Stop the bleeding. Implement a workaround or fix to restore service.
5. **Resolve:** Confirm service is fully restored.
6. **Post-Mortem:** Blameless review to identify root causes and prevent recurrence.
