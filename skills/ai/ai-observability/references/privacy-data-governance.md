# Privacy and Data Governance for AI Observability

## Overview

AI observability systems inherently process sensitive data: user prompts, model responses, user identifiers, and behavioral signals. This reference covers privacy-preserving instrumentation, PII redaction, data retention policies, compliance frameworks, and governance patterns for AI observability pipelines.

## Privacy Risks in AI Observability

### Risk Surface

| Data Type | Examples | Privacy Risk | Regulatory Concern |
|-----------|----------|-------------|-------------------|
| User prompts | Free-text questions, instructions | Contains PII, secrets, sensitive info | GDPR Art 9, HIPAA PHI |
| Model responses | Generated text, code, analysis | May expose internal knowledge, user data | GDPR, IP protection |
| User identifiers | user_id, email, IP address | Direct personal identification | GDPR Art 4, CCPA |
| Session data | Session logs, conversation history | Behavioral profiling | GDPR, ePrivacy |
| Metadata | Model, timestamp, feature flags | Indirect identification | GDPR pseudonymization |
| Feedback | Ratings, comments, annotations | Opinion data, satisfaction | GDPR Art 9 (if health) |

### Threat Scenarios

1. **Prompt leakage**: PII in prompts stored in observability backend for years
2. **Response exposure**: Sensitive model responses (e.g., medical advice, legal analysis) logged to third-party platforms
3. **User profiling**: Session traces enable behavioral tracking across features
4. **Credential leakage**: API keys, tokens, or passwords accidentally included in prompts
5. **Cross-border transfer**: Observability data stored in regions without adequate protection

## Privacy-Preserving Instrumentation

### Prompt Hashing

Instead of storing full prompts, store a hash for deduplication and pattern analysis:

```python
import hashlib
import re

class PromptSanitizer:
    def __init__(self, store_raw: bool = False, pii_patterns: list[tuple] = None):
        self.store_raw = store_raw
        self.pii_patterns = pii_patterns or [
            (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]'),
            (r'\b\d{3}[-.]?\d{3}[-.]?\d{4}\b', '[PHONE]'),
            (r'\b\d{3}-\d{2}-\d{4}\b', '[SSN]'),
            (r'\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14})\b', '[CC]'),
            (r'\b[A-Za-z0-9]{20,40}\b', '[TOKEN]'),
            (r'\b(?:\d{1,3}\.){3}\d{1,3}\b', '[IP]'),
        ]

    def sanitize(self, text: str) -> str:
        result = text
        for pattern, replacement in self.pii_patterns:
            result = re.sub(pattern, replacement, result)
        return result

    def process_prompt(self, prompt: str, user_id: str = None) -> dict:
        sanitized = self.sanitize(prompt) if not self.store_raw else prompt
        prompt_hash = hashlib.sha256(prompt.encode()).hexdigest()[:16]
        return {
            "prompt_hash": prompt_hash,
            "prompt_length": len(prompt),
            "prompt_tokens": estimate_tokens(prompt),
            "has_pii": prompt != sanitized if not self.store_raw else False,
            "sanitized_preview": sanitized[:200] if not self.store_raw else None,
        }

    def process_response(self, response: str) -> dict:
        sanitized = self.sanitize(response)
        response_hash = hashlib.sha256(response.encode()).hexdigest()[:16]
        return {
            "response_hash": response_hash,
            "response_length": len(response),
            "response_tokens": estimate_tokens(response),
        }
```

### Attribute Scrubbing in OpenTelemetry Collector

Configure the collector to redact sensitive attributes before exporting to storage:

```yaml
processors:
  attributes:
    actions:
      # Delete PII fields
      - key: user_prompt
        action: delete
      - key: gen_ai.prompt
        action: delete
      - key: gen_ai.response.content
        action: delete
      - key: user_email
        action: delete
      - key: user_ip
        action: delete
      - key: authorization
        action: delete
      - key: api_key
        action: delete
      - key: session_token
        action: delete

      # Keep hashed version
      - key: prompt_hash
        action: upsert
        value: ""
      - key: response_hash
        action: upsert
        value: ""

      # Keep aggregate counts
      - key: prompt_length
        action: upsert
        value: 0
      - key: response_length
        action: upsert
        value: 0

  # Alternative: use transform processor for conditional redaction
  transform:
    trace_statements:
      - context: span
        statements:
          - delete_key(attributes, "user_prompt") where attributes["environment"] == "production"
          - set(attributes["prompt_hash"], Sha256(attributes["user_prompt"])) where attributes["user_prompt"] != nil
          - delete_key(attributes, "user_prompt")
```

### Token-Count-Only Mode

For high-sensitivity environments, track only token counts without any content:

```python
class TokenOnlyTracker:
    def record_llm_call(self, model: str, prompt_tokens: int, completion_tokens: int, user_id: str = None):
        span_attributes = {
            "gen_ai.system": "openai",
            "gen_ai.request.model": model,
            "gen_ai.usage.prompt_tokens": prompt_tokens,
            "gen_ai.usage.completion_tokens": completion_tokens,
            "gen_ai.usage.total_tokens": prompt_tokens + completion_tokens,
            "recorded_at": datetime.utcnow().isoformat(),
        }
        if user_id:
            # Hash user_id to prevent direct identification
            span_attributes["user_id_hash"] = hashlib.sha256(user_id.encode()).hexdigest()[:12]
        return span_attributes
```

## Data Retention Policies

### Retention by Data Class

| Data Class | Hot (Fast Query) | Warm (Slow Query) | Cold (Archive) | Deletion |
|------------|------------------|-------------------|----------------|----------|
| LLM traces (no content) | 7 days | 30 days | 1 year (S3) | After 1 year |
| LLM traces (with prompt) | 1 day | 7 days | 30 days (encrypted) | After 30 days |
| Aggregated metrics (1m) | 30 days | 12 months | 7 years | After 7 years |
| Raw metrics (1s) | 7 days | 30 days | N/A | After 30 days |
| User feedback | 90 days | 2 years | Indefinite (anonymized) | Never (anonymized) |
| Guardrail logs | 30 days | 12 months | 3 years | After 3 years |
| Cost data | 90 days | 3 years | 7 years (compliance) | After 7 years |
| Structured logs | 3 days | 14 days | 90 days | After 90 days |
| Debug logs | 24 hours | N/A | N/A | After 24 hours |

### Implementing Retention in OpenTelemetry Collector

```yaml
exporters:
  otlp/tempo:
    endpoint: tempo:4317
    tls: { insecure: true }
  otlp/cold:
    endpoint: s3-archive:4317
    tls: { insecure: false }

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [attributes, tail_sampling, batch]
      exporters: [otlp/tempo, otlp/cold]
```

### Automated Data Lifecycle Management

```python
from datetime import datetime, timedelta
from typing import Optional

class DataRetentionManager:
    def __init__(self, config: dict):
        self.config = config  # Data class → (hot_days, warm_days, cold_days)
        self.stats = {"deleted": 0, "archived": 0}

    def apply_retention(self, data_class: str, data_timestamp: datetime) -> str:
        """Returns action: 'keep_hot', 'move_warm', 'archive_cold', or 'delete'"""
        age_days = (datetime.utcnow() - data_timestamp).days
        hot, warm, cold = self.config.get(data_class, (7, 30, 365))

        if age_days <= hot:
            return "keep_hot"
        elif age_days <= warm:
            return "move_warm"
        elif age_days <= cold:
            return "archive_cold"
        else:
            return "delete"

    def retention_report(self) -> dict:
        return {
            "configured_classes": list(self.config.keys()),
            "total_deleted_today": self.stats["deleted"],
            "total_archived_today": self.stats["archived"],
            "policies": {
                cls: {"hot_days": h, "warm_days": w, "cold_days": c}
                for cls, (h, w, c) in self.config.items()
            },
        }

    def generate_retention_labels(self, data: list[dict], data_class: str) -> list[dict]:
        for item in data:
            ts = item.get("timestamp") or item.get("start_time")
            if ts:
                if isinstance(ts, (int, float)):
                    ts = datetime.fromtimestamp(ts)
                action = self.apply_retention(data_class, ts)
                item["_retention_action"] = action
        return data
```

## Compliance Frameworks

### GDPR Compliance

For AI observability under GDPR:

| Requirement | Implementation |
|-------------|---------------|
| Data minimization | Store token counts and hashes, not raw prompts. Collect only necessary metadata. |
| Purpose limitation | Separate trace data by feature/function. Document processing purposes. |
| Storage limitation | Enforce retention policies. Delete traces older than retention period. |
| Right to erasure | Build user deletion endpoint that purges all traces by user_id_hash. |
| Right to access | Provide user data export endpoint. |
| Consent | Implement opt-out flag in trace metadata. Respect user consent preferences. |
| Data Protection Impact Assessment | Document what trace data is collected, why, and how it's protected. |
| Data Processing Agreement | Sign DPA with observability platform provider. |

**Right to erasure implementation:**
```python
class UserDataErasure:
    def __init__(self, trace_backend, log_backend, feedback_backend):
        self.traces = trace_backend
        self.logs = log_backend
        self.feedback = feedback_backend

    def erase_user_data(self, user_id: str) -> dict:
        results = {"traces_deleted": 0, "logs_deleted": 0, "feedback_anonymized": 0}
        user_hash = hashlib.sha256(user_id.encode()).hexdigest()[:12]

        # Delete traces containing user_id_hash
        results["traces_deleted"] = self.traces.delete_by_attribute("user_id_hash", user_hash)
        results["logs_deleted"] = self.logs.delete_by_field("user_id_hash", user_hash)

        # Anonymize feedback (keep aggregate data, remove user association)
        results["feedback_anonymized"] = self.feedback.anonymize_user(user_hash)

        return results
```

### HIPAA Compliance

For healthcare applications covered by HIPAA:

| Requirement | Implementation |
|-------------|---------------|
| PHI identification | Configure PII patterns to detect and redact medical PHI (MRN, diagnosis codes, dates of service). |
| BAAs | Ensure observability vendor signs Business Associate Agreement. |
| Encryption | Encrypt all trace data at rest (AES-256) and in transit (TLS 1.2+). |
| Access controls | Role-based access to observability data. Audit log all trace queries. |
| Minimum necessary | Token-count-only mode for PHI-sensitive interactions. |
| Audit trail | Log all access to trace data containing PHI indicators. |

```python
class HIPAAComplianceFilter:
    PHI_PATTERNS = [
        (r'\b\d{3}-\d{2}-\d{4}\b', '[SSN]'),
        (r'\b\d{10}\b', '[MRN]'),
        (r'\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]* \d{1,2},? \d{4}\b', '[DATE]'),
        (r'\b[A-Z]\d{6}\b', '[RECORD_ID]'),
        (r'\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b', '[IP]'),
    ]

    def redact_phi(self, text: str) -> str:
        for pattern, replacement in self.PHI_PATTERNS:
            text = re.sub(pattern, replacement, text, flags=re.IGNORECASE)
        return text

    def should_store_raw(self, prompt: str) -> bool:
        redacted = self.redact_phi(prompt)
        return prompt == redacted  # Only store if no PHI detected
```

### SOC 2 Compliance

| Trust Principle | Implementation |
|----------------|----------------|
| Security | Access controls, encryption, audit logging on observability platform. |
| Availability | Redundant collector deployment, retention policies ensure data availability. |
| Processing Integrity | Trace sampling validation, metric accuracy verification. |
| Confidentiality | Data classification labels on traces, restricted access. |
| Privacy | PII redaction, consent management, data retention enforcement. |

## Governance Patterns

### Access Control Model

```python
class ObservabilityAccessControl:
    def __init__(self):
        self.roles = {
            "admin": {"traces": "read_write", "metrics": "read_write", "alerts": "manage", "config": "manage"},
            "engineer": {"traces": "read", "metrics": "read", "alerts": "acknowledge", "config": "read"},
            "manager": {"traces": "read_aggregate", "metrics": "read", "alerts": "read", "config": "none"},
            "auditor": {"traces": "read_metadata", "metrics": "read", "alerts": "read", "config": "none"},
        }

    def check_access(self, role: str, resource: str, action: str) -> bool:
        allowed_actions = self.roles.get(role, {}).get(resource, "none")
        if action == "read":
            return allowed_actions in ("read", "read_write", "read_aggregate", "read_metadata")
        elif action == "write":
            return allowed_actions == "read_write"
        elif action == "manage":
            return allowed_actions == "manage"
        return False

    def filter_trace_response(self, role: str, trace: dict) -> dict:
        if self.check_access(role, "traces", "read"):
            return trace  # Full access
        elif self.check_access(role, "traces", "read_aggregate"):
            return {
                "trace_id": trace["trace_id"],
                "duration": trace.get("end_time", 0) - trace.get("start_time", 0),
                "status": trace.get("status"),
                "total_tokens": sum(
                    s["attributes"].get("gen_ai.usage.total_tokens", 0)
                    for s in trace.get("spans", [])
                ),
                "models_used": list(set(
                    s["attributes"].get("gen_ai.request.model", "unknown")
                    for s in trace.get("spans", [])
                )),
            }
        elif self.check_access(role, "traces", "read_metadata"):
            return {
                "trace_id": trace["trace_id"],
                "timestamp": trace.get("start_time"),
                "duration": trace.get("end_time", 0) - trace.get("start_time", 0),
            }
        return {"error": "access_denied"}
```

### Audit Logging

```python
class AuditLogger:
    def __init__(self, log_backend):
        self.backend = log_backend

    def log_trace_access(self, user_id: str, role: str, trace_id: str, action: str, reason: str = None):
        entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "event": "trace_access",
            "user_id": user_id,
            "user_role": role,
            "trace_id": trace_id,
            "action": action,
            "reason": reason or "operational",
            "ip_address": None,  # Set from request context
        }
        self.backend.append(entry)
        return entry

    def query_audit_log(self, user_id: str = None, trace_id: str = None, hours: int = 24) -> list[dict]:
        cutoff = datetime.utcnow() - timedelta(hours=hours)
        results = self.backend.query(start_time=cutoff)
        if user_id:
            results = [r for r in results if r.get("user_id") == user_id]
        if trace_id:
            results = [r for r in results if r.get("trace_id") == trace_id]
        return results
```

### Data Classification Labels

Apply classification labels to traces based on content analysis:

```python
class DataClassifier:
    CLASSIFICATIONS = {
        "public": {"retention_days": 90},
        "internal": {"retention_days": 365},
        "confidential": {"retention_days": 90, "encrypt": True, "access": "admin_only"},
        "phi": {"retention_days": 30, "encrypt": True, "access": "admin_only", "baa_required": True},
    }

    def classify(self, trace: dict) -> str:
        prompts = self.extract_prompts(trace)
        for prompt in prompts:
            if self.contains_phi(prompt):
                return "phi"
            if self.contains_confidential(prompt):
                return "confidential"
        return "internal"

    def apply_classification_label(self, trace: dict) -> dict:
        classification = self.classify(trace)
        trace["metadata"]["data_classification"] = classification
        trace["metadata"]["retention_days"] = self.CLASSIFICATIONS[classification]["retention_days"]
        return trace
```

## Consent Management

### User Opt-Out

```python
class ObservabilityConsent:
    def __init__(self):
        self.opted_out = set()  # Set of user_id hashes

    def opt_out(self, user_id: str):
        user_hash = hashlib.sha256(user_id.encode()).hexdigest()
        self.opted_out.add(user_hash)

    def opt_in(self, user_id: str):
        user_hash = hashlib.sha256(user_id.encode()).hexdigest()
        self.opted_out.discard(user_hash)

    def is_opted_out(self, user_id: str) -> bool:
        user_hash = hashlib.sha256(user_id.encode()).hexdigest()
        return user_hash in self.opted_out

    def instrument_if_consented(self, user_id: str, callback: callable):
        if not self.is_opted_out(user_id):
            callback()
        # else: emit token-count-only metrics without tracing
```

## Vendor Assessment

### Questions for Observability Vendors

| Area | Questions |
|------|-----------|
| Data residency | Where is data stored? Can you guarantee regional storage? |
| Encryption | Is data encrypted at rest and in transit? What key management? |
| Subprocessors | Do you share data with any third parties? List subprocessors. |
| Certifications | Do you have SOC 2, ISO 27001, HIPAA BAA? |
| Data deletion | How is data deleted? Can you guarantee deletion within SLA? |
| Access controls | What RBAC model? Can we restrict access by role and data class? |
| Audit logs | Do you provide audit logs of all data access? |
| Retention | Can we configure per-data-class retention policies? |
| Data portability | Can we export all our data in a standard format? |
| Incident response | What is your data breach notification process and SLA? |

### Self-Hosted vs Managed Decision

| Factor | Managed (LangFuse Cloud, Datadog) | Self-Hosted (LangFuse self, OTel stack) |
|--------|-----------------------------------|-----------------------------------------|
| Compliance burden | Vendor provides compliance certifications | You own compliance |
| Data sovereignty | Limited by vendor regions | Full control |
| Operational overhead | None | Significant (patching, scaling, backup) |
| Cost at scale | Higher per-unit cost | Lower per-unit cost at scale |
| Feature velocity | Vendor ships updates | You maintain updates |
| Audit control | Vendor-provided audit logs | Full control over auditing |

## Key Points

- Store hashes, not raw prompts, by default. Only store raw content when explicitly needed with user consent.
- Implement PII redaction at the collector attribute processor before data reaches storage.
- Configure per-data-class retention policies and enforce them with automated lifecycle management.
- Build user data erasure endpoints for GDPR right to deletion compliance.
- Use token-count-only mode for high-sensitivity environments.
- Sign DPAs and BAAs with observability vendors for regulated data.
- Implement role-based access control for trace data with tiered visibility.
- Maintain immutable audit logs of all trace data access.
- Support user opt-out of tracing with fallback to token-count-only metrics.
- Classify data at ingestion and apply appropriate retention, encryption, and access controls.
- Assess vendors on data residency, encryption, certifications, and deletion guarantees.
- Self-host when compliance requirements cannot be met by managed providers.
