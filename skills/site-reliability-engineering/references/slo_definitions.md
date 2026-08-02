# SLI and SLO Definitions

## Service Level Indicator (SLI)
A quantifiable measure of service reliability. It's the actual measurement.
- **Formula:** `Good Events / Total Events * 100`
- **Example SLIs:**
  - *Availability:* The proportion of HTTP GET requests that return a 200 OK status.
  - *Latency:* The proportion of HTTP GET requests that complete in < 200ms.
  - *Freshness:* The proportion of data requests that return data updated within the last 5 minutes.

## Service Level Objective (SLO)
The target value for an SLI. It defines the acceptable level of reliability for users.
- **Rule of thumb:** SLOs should be slightly stricter than SLAs (Agreements with customers) to provide a safety margin.
- **Format:** `SLI >= Target % over a Window`

**Example SLOs:**
- 99.9% of HTTP GET requests to `/api/users` must return a 2xx status code over a rolling 30-day window.
- 95% of HTTP POST requests to `/api/checkout` must complete in less than 300ms over a rolling 7-day window.

## Defining Good SLOs
1. **User-Centric:** Tie SLOs to critical user journeys (e.g., Login, Checkout).
2. **Achievable:** Don't set 100%. It's impossible and expensive.
3. **Measurable:** You must have the telemetry to accurately measure the SLI.
