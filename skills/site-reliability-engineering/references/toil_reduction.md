# Toil Reduction

## Definition of Toil
Toil is not just "work you don't like." In SRE, toil is defined by specific characteristics. Work is toil if it is:
1. **Manual:** Requires human intervention (e.g., running a script, clicking UI buttons).
2. **Repetitive:** Doing the same task over and over.
3. **Automatable:** A machine *could* do it.
4. **Tactical:** Reactive work (e.g., handling alerts, scaling up servers manually).
5. **No enduring value:** Once the task is done, the system is in the same state it was before. (Unlike engineering work, which improves the system).
6. **O(n) with service growth:** The work scales linearly with the size of the service or number of users.

*Example of Toil:* Manually provisioning a new database user.
*Example of Non-Toil (Overhead):* Expense reports, meetings.

## Automation Strategies
Google SRE aims to cap toil at 50% of an engineer's time. The rest should be engineering.
- **Identify:** Track where time is spent (e.g., ticket categorization).
- **Self-Service:** Build tools so users can perform the task themselves (e.g., a portal to request database access).
- **Scripting:** Start by writing scripts for common manual tasks.
- **Event-Driven Automation:** Use tools or operators to automatically trigger scripts in response to events or alerts (e.g., auto-scaling based on CPU).
- **Eliminate the Need:** Architect the system so the task is no longer required.
