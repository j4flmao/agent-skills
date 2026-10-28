# Agent Decision Audit Logging

Audit logs answer "what did the agent do, why, on whose authority, and with what effect?" long after the fact. They differ from debug traces: they must be complete for consequential actions, tamper-evident, retained per policy, and privacy-aware. This reference defines what to log, a schema, storage and integrity options, and how to use the log for review and compliance.

## Traces vs Audit Log

| Aspect | Observability traces | Decision audit log |
|--------|---------------------|--------------------|
| Purpose | Debugging, performance | Accountability, compliance, incident review |
| Completeness | Sampled | Every consequential action, unsampled |
| Retention | Days to weeks | Per policy (often months/years) |
| Mutability | Mutable stores fine | Append-only, tamper-evident |
| Content | Full prompts possible | Minimised; references to sensitive payloads |

Link them: each audit event carries the `trace_id` so reviewers can open the detailed trace while it still exists.

## What Counts as a Consequential Decision

- Tool calls with side effects: sending messages, writing/deleting data, payments, deployments, permission changes.
- Access to sensitive data (PII, secrets, regulated records).
- Policy decisions: guardrail blocks, refusals, escalations to humans.
- Human approvals and overrides (who approved what).
- Model or prompt version changes in production.

Read-only, low-risk actions can be logged at lower fidelity or sampled.

## Event Schema

```json
{
  "event_id": "01J9Z8Q4K3V7X5W2N6M8P0R1S2",
  "timestamp": "2026-10-27T09:14:03.512Z",
  "trace_id": "4bf92f3577b34da6a3ce929d0e0e4736",
  "run_id": "run_7f3a",
  "agent": { "name": "billing-assistant", "version": "2026.10.3", "model": "provider/model-id", "prompt_version": "billing-v14" },
  "principal": { "type": "user", "id": "usr_7a1c", "tenant": "t_42", "auth_method": "oidc" },
  "action": {
    "type": "tool_call",
    "tool": "issue_refund",
    "arguments_digest": "sha256:9c1e...",
    "arguments_redacted": { "order_id": "ord_123", "amount_minor": 2500, "currency": "EUR" },
    "risk_level": "high"
  },
  "rationale": "Customer reported duplicate charge; order shows two captures for same amount.",
  "inputs": [{ "type": "tool_result", "ref": "evidence/run_7f3a/step3.json", "digest": "sha256:ab41..." }],
  "policy": { "checks": ["refund_limit<=5000", "requires_approval"], "result": "approval_required" },
  "approval": { "approver": "usr_ops_9", "decision": "approved", "at": "2026-10-27T09:16:40Z" },
  "outcome": { "status": "success", "external_ref": "re_3Px..." },
  "prev_hash": "sha256:51d0...",
  "hash": "sha256:e7a2..."
}
```

Field notes:
- `rationale`: a short model-produced or system-produced justification. Treat it as the agent's stated reason, not as proof; reviewers check it against `inputs`.
- Store full prompts/outputs in a separate access-controlled evidence store, referenced by digest, rather than inline.
- `arguments_digest` lets you prove what was executed without storing sensitive values in the main log.

## Integrity

| Option | How | Notes |
|--------|-----|-------|
| Hash chain | Each event includes hash of previous event (per run or per stream) | Detects deletion/modification; verify periodically |
| WORM storage | S3 Object Lock (compliance mode), Azure immutable blob storage, GCS bucket lock | Retention enforced by storage |
| Signed batches | Sign periodic Merkle roots with a KMS key | Efficient verification |
| Separate account/project | Audit sink writable only by the logging pipeline | Limits insider tampering |

Use HMAC or signatures with keys in a KMS; plain hashes only detect accidental change unless anchored.

## Pipeline

```
agent runtime --(structured event)--> local buffer/outbox --> log pipeline (OTel Collector / Kafka)
     --> immutable store (object lock)  +  queryable index (warehouse / search)
```

- Write the audit event **before** executing high-risk actions (intent) and again after (outcome), so crashes leave evidence.
- Use an outbox or durable queue; audit events must not be dropped under load. Monitor pipeline lag and drops.
- Clock: UTC timestamps from synchronized clocks; include monotonic sequence numbers per run.

## Privacy and Retention

- Minimise: log identifiers and digests, not full content, unless policy requires it.
- Pseudonymise user IDs in analytics copies; keep the mapping restricted.
- Retention per regulation and contract; deletion requests: keep audit integrity by deleting or crypto-shredding evidence payloads while retaining minimal event metadata where legally permitted.
- Access to audit logs is itself audited.

## Using the Log

| Use | Query |
|-----|-------|
| Incident review | All events for `run_id` / `trace_id`, ordered |
| Approval compliance | High-risk actions without `approval.decision = approved` |
| Policy effectiveness | Rate of `policy.result = blocked` by rule |
| Drift | Actions by agent version before/after a release |
| Abuse | Actions per principal outside normal patterns |

Regular sampled human review of decisions (with rubric) catches silent quality problems that metrics miss.

## Regulatory Context

Record-keeping for automated decisions appears in several frameworks (for example, logging obligations for high-risk AI systems under the EU AI Act, and audit trail requirements in financial regulation). Map your schema fields to the specific obligations with your compliance team rather than assuming one schema fits all.

## Pitfalls

- Relying on sampled traces as the audit record.
- Logging secrets or full PII in plaintext events.
- Audit writes that fail silently or after the action completes only.
- Mutable storage writable by the same service identity that performs actions.
- Treating the model's rationale as verified truth.

## Checklist

- [ ] Consequential actions enumerated and always logged (intent + outcome)
- [ ] Schema includes principal, agent/model/prompt versions, action, policy, approval, outcome, trace link
- [ ] Sensitive payloads in a separate evidence store referenced by digest
- [ ] Tamper evidence (hash chain/signatures) and WORM retention
- [ ] Durable pipeline with lag/drop monitoring
- [ ] Access to audit data restricted and audited
- [ ] Periodic review queries and human sampling in place
