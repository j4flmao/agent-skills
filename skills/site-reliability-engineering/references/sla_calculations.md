# SLA, SLO, and Error Budgets

## SLA Calculation (Uptime/Time-based)
Calculated based on the total time the system was available out of the total time in a period.
- **Formula:** `(Total Time - Downtime) / Total Time * 100`

**Common Nines (30-day month):**
- 99.0% (2 nines): 7.2 hours downtime
- 99.9% (3 nines): 43.2 minutes downtime
- 99.99% (4 nines): 4.32 minutes downtime
- 99.999% (5 nines): 25.9 seconds downtime

## Request-based Calculation
Often more accurate for distributed systems. Calculated based on the number of successful requests.
- **Formula:** `(Successful Requests) / (Total Requests) * 100`

## Error Budgets
An error budget is the allowable threshold for failures over a period. It aligns Dev and Ops.
- **Formula:** `100% - SLO%`
- Example: If SLO is 99.9%, the Error Budget is 0.1%.
- If your system receives 1,000,000 requests, your error budget allows for 1,000 failed requests.

**Actionable Policy:**
- If the error budget is depleted, halt feature releases and focus purely on reliability work until the budget recovers (e.g., rolling 30-day window).
