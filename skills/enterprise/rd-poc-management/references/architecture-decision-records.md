# Architecture Decision Records (ADRs)

## 1. The Problem: Decision Amnesia
When a Department submits a PoC to Global R&D, the first question asked is often: *"Why did you use MongoDB instead of our standard PostgreSQL cluster?"*
If the answer is verbal, scattered across Slack messages, or simply "because the dev liked it," the PoC will likely be rejected.

**Decision Amnesia** occurs when a team forgets the constraints, trade-offs, and context that led to a specific architectural choice.

## 2. The Solution: ADRs
An Architecture Decision Record (ADR) is a short text file (usually Markdown) that captures a single, significant architectural decision. They are committed directly into the Git repository alongside the code (`docs/adr/`).

## 3. Standard ADR Template (Michael Nygard format)

### Title: [ADR-001] Use MongoDB for the Product Catalog PoC
**Date**: 2026-09-02  
**Status**: Accepted (Proposed / Accepted / Superseded / Rejected)

### Context
*What is the force pushing us to make a decision?*
Our current PostgreSQL catalog schema requires a 4-hour downtime migration whenever Marketing introduces a new product category with dynamic attributes. We need a way to support unstructured product data.

### Decision
*What is the exact choice we are making?*
We will use MongoDB as the primary data store for the Product Catalog in this PoC. We will utilize a Schema-less JSON document model, enforcing validation at the application (API) layer rather than the database layer.

### Consequences
*What are the trade-offs (both good and bad)?*
- **Positive**: Marketing can add new product attributes instantly without database migrations.
- **Positive**: Read performance for complex nested products improves by 40%.
- **Negative**: We lose ACID transactional guarantees across multiple product updates. We must implement eventual consistency patterns in the application code.
- **Negative**: The Global Ops team currently lacks MongoDB enterprise tooling, requiring a new training initiative if this goes to production.

## 4. Why Global R&D Loves ADRs
When Global R&D reviews your PoC and reads this ADR, they understand you didn't choose MongoDB randomly. You weighed the exact consequences (losing ACID, Ops burden) against a massive business value (Zero-downtime schema changes). Even if they disagree, the conversation is now objective and professional.
