# The PoC to MVP Handoff

## 1. The Handoff Chasm
A successful Proof of Concept (PoC) validates a business hypothesis. The next stage is the Minimum Viable Product (MVP) deployed to real users. 

Often, the Department R&D team that built the PoC is not the same team that will maintain the MVP in production (Global Operations/Platform teams). Tossing the codebase "over the wall" to Global Ops guarantees failure. Global Ops will refuse to support a system they do not understand or trust.

## 2. Production Readiness Review (PRR)
Before Global Ops accepts a Department PoC, the R&D team must pass a PRR. This checklist elevates experimental code to enterprise-grade software.

### A. Operational Documentation (Runbooks)
R&D must provide a **Runbook**. If the PoC crashes at 2:00 AM on a Sunday, the on-call Global engineer needs to know:
- How to restart the service.
- How to clear the cache.
- Which third-party APIs the service depends on.
- Common error codes and their mitigations.

### B. Observability (O11y)
The PoC must emit telemetry before it is accepted.
- **Metrics**: Expose a `/metrics` endpoint (Prometheus format) detailing CPU, Memory, and Request Latency.
- **Dashboards**: R&D must provide a pre-built Grafana or Datadog dashboard visualizing the system's health.
- **Alerts**: Define explicit thresholds (e.g., "Alert Slack if P99 Latency > 500ms for 5 consecutive minutes").

### C. Service Level Objectives (SLOs)
The Department and Global teams must agree on an SLA/SLO. 
- *Example*: "This API promises 99.9% uptime. A degradation below this threshold pauses all new feature development until stability is restored."

## 3. The Reverse Handoff (Pairing)
Knowledge transfer cannot happen by just reading documentation. 
The transition period requires **Pair Programming**. For the first 2 weeks of the MVP launch, a Global Ops engineer pairs with an R&D engineer. 
- Week 1: R&D drives the keyboard, Ops observes and asks architectural questions.
- Week 2: Ops drives the keyboard (deploying updates, fixing bugs), R&D observes and acts as a safety net.
