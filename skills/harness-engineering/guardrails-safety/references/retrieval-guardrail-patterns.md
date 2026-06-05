# Retrieval Guardrail Patterns

## Overview

Retrieval guardrails protect the RAG (Retrieval-Augmented Generation) pipeline from context poisoning, indirect prompt injection embedded in documents, integrity violations, and unauthorized data access. These guardrails operate on the retrieved document chunks between the vector store query and the prompt context injection point.

---

## Threat Model for Retrieval Pipelines

```
Threat Landscape:
├── Indirect Prompt Injection
│   ├── Adversarial text embedded in documents
│   ├── Hidden instructions in HTML comments or metadata
│   ├── White-on-white text in PDFs
│   └── Malicious content in user-generated data
│
├── Context Poisoning
│   ├── Deliberately misleading documents in the index
│   ├── Outdated documents contradicting current facts
│   ├── SEO-style content gaming relevance scores
│   └── Adversarial embeddings crafted to match common queries
│
├── Data Exfiltration via Context
│   ├── Sensitive documents retrieved for unauthorized users
│   ├── Cross-tenant data leakage in multi-tenant indexes
│   └── PII in documents surfaced without access control
│
└── Integrity Violations
    ├── Documents modified after indexing
    ├── Tampered vector embeddings
    ├── Index corruption
    └── Stale cache serving outdated chunks
```

---

## Retrieval Security Architecture

```
[Vector Query]
       │
       ▼
+------------------+
| Vector Store     |
| (Qdrant/Pinecone)|
+------------------+
       │
       ├──► Retrieved Chunks (k=10)
       │
       ▼
+---------------------+     +---------------------+     +-------------------+
| Integrity Verifier  | ──► | Injection Scanner   | ──► | Access Control    |
| (SHA-256 Hash Check)|     | (ML + Heuristic)    |     | (Tenant/ACL)      |
+---------------------+     +---------------------+     +-------------------+
       │                            │                            │
       ├── Hash mismatch            ├── Injection detected       ├── Access denied
       │   → QUARANTINE             │   → QUARANTINE             │   → REMOVE
       │                            │                            │
       └── Hash valid               └── Clean                   └── Authorized
              │                            │                            │
              └────────────────────────────┼────────────────────────────┘
                                           ▼
                                  +------------------+
                                  | Clean Context    |
                                  | → Agent Prompt   |
                                  +------------------+
```

---

## Context Integrity Verification

### Hash-Based Integrity Checking

Every document chunk is hashed at index time. At retrieval time, the hash is recomputed and compared.

```python
import hashlib
import json
import time
from typing import Dict, Any, List, Optional
from dataclasses import dataclass, field


@dataclass
class DocumentChunk:
    """A retrieved document chunk with metadata."""
    chunk_id: str
    content: str
    source_document: str
    metadata: Dict[str, Any]
    embedding_vector: Optional[List[float]] = None
    indexed_at: Optional[float] = None
    stored_hash: Optional[str] = None


@dataclass
class IntegrityCheckResult:
    """Result of integrity verification for a chunk."""
    chunk_id: str
    is_valid: bool
    expected_hash: str
    actual_hash: str
    reason: str = ""


class ChunkIntegrityVerifier:
    """
    Verifies the integrity of retrieved document chunks by comparing
    content hashes against stored values from index time.
    """

    def __init__(self, hash_algorithm: str = "sha256"):
        self.hash_algorithm = hash_algorithm

    def compute_hash(self, content: str, metadata: Optional[Dict] = None) -> str:
        """
        Compute a deterministic hash of chunk content and key metadata.
        Includes metadata to detect metadata tampering.
        """
        hasher = hashlib.new(self.hash_algorithm)
        hasher.update(content.encode('utf-8'))

        if metadata:
            # Include source document info in hash
            stable_meta = {
                k: v for k, v in sorted(metadata.items())
                if k in ('source', 'page', 'section', 'version')
            }
            hasher.update(json.dumps(stable_meta, sort_keys=True).encode('utf-8'))

        return hasher.hexdigest()

    def verify_chunk(self, chunk: DocumentChunk) -> IntegrityCheckResult:
        """Verify a single chunk's integrity."""
        actual_hash = self.compute_hash(chunk.content, chunk.metadata)

        if chunk.stored_hash is None:
            return IntegrityCheckResult(
                chunk_id=chunk.chunk_id,
                is_valid=False,
                expected_hash="<missing>",
                actual_hash=actual_hash,
                reason="No stored hash found for chunk. Cannot verify integrity."
            )

        is_valid = actual_hash == chunk.stored_hash
        reason = "" if is_valid else "Hash mismatch: content may have been tampered with"

        return IntegrityCheckResult(
            chunk_id=chunk.chunk_id,
            is_valid=is_valid,
            expected_hash=chunk.stored_hash,
            actual_hash=actual_hash,
            reason=reason
        )

    def verify_batch(
        self, chunks: List[DocumentChunk]
    ) -> Dict[str, IntegrityCheckResult]:
        """Verify integrity for a batch of chunks."""
        results = {}
        for chunk in chunks:
            results[chunk.chunk_id] = self.verify_chunk(chunk)
        return results
```

---

## Indirect Injection Detection in Documents

Documents can contain adversarial instructions that attempt to hijack the agent when included in the context window. A dedicated scanner processes each retrieved chunk.

```python
import re
from typing import List, Dict, Any
from dataclasses import dataclass, field


@dataclass
class InjectionScanResult:
    """Result of scanning a chunk for indirect injection."""
    chunk_id: str
    is_clean: bool
    injection_score: float
    triggered_patterns: List[str] = field(default_factory=list)
    suspicious_segments: List[str] = field(default_factory=list)


class IndirectInjectionScanner:
    """
    Scans retrieved document chunks for indirect prompt injection.
    Detects adversarial instructions embedded in external content.
    """

    # Patterns indicating indirect injection attempts
    INJECTION_PATTERNS = [
        # Direct instruction patterns
        (r'(?:ignore|disregard|forget)\s+(?:all\s+)?(?:previous|prior|above)\s+'
         r'(?:instructions?|context|prompts?)', 0.95, "instruction_override"),

        # Hidden instruction markers
        (r'<\s*(?:system|instruction|prompt|command)\s*>', 0.90, "hidden_marker"),

        # Invisible text techniques
        (r'(?:color:\s*(?:white|transparent)|font-size:\s*0|display:\s*none)',
         0.85, "invisible_text"),

        # Embedded commands
        (r'(?:IMPORTANT|CRITICAL|URGENT):\s*(?:you must|always|never)\s+',
         0.70, "embedded_command"),

        # Role manipulation
        (r'(?:you are|act as|pretend to be|your role is)\s+',
         0.75, "role_manipulation"),

        # Output manipulation
        (r'(?:output|respond|reply|answer)\s+(?:only|with|exactly)\s*:',
         0.80, "output_manipulation"),

        # HTML comment injection
        (r'<!--\s*(?:instruction|system|prompt|command)',
         0.85, "html_comment_injection"),

        # Markdown comment injection
        (r'\[//\]:\s*#\s*\(.*?(?:instruction|system|prompt)',
         0.80, "markdown_comment_injection"),
    ]

    def __init__(
        self,
        score_threshold: float = 0.70,
        use_ml_classifier: bool = False
    ):
        self.score_threshold = score_threshold
        self.use_ml_classifier = use_ml_classifier
        self._compiled_patterns = [
            (re.compile(pattern, re.IGNORECASE | re.DOTALL), score, name)
            for pattern, score, name in self.INJECTION_PATTERNS
        ]

    def scan_chunk(self, chunk: DocumentChunk) -> InjectionScanResult:
        """
        Scan a single document chunk for indirect injection.
        """
        content = chunk.content
        triggered = []
        suspicious = []
        max_score = 0.0

        for pattern, score, name in self._compiled_patterns:
            matches = pattern.findall(content)
            if matches:
                triggered.append(f"{name} (score={score:.2f})")
                max_score = max(max_score, score)
                for match in matches[:3]:  # Cap at 3 examples
                    segment = match if isinstance(match, str) else match[0]
                    suspicious.append(segment[:100])

        # Check for unusual structural patterns
        structural_score = self._check_structural_anomalies(content)
        max_score = max(max_score, structural_score)

        is_clean = max_score < self.score_threshold

        return InjectionScanResult(
            chunk_id=chunk.chunk_id,
            is_clean=is_clean,
            injection_score=round(max_score, 4),
            triggered_patterns=triggered,
            suspicious_segments=suspicious
        )

    def _check_structural_anomalies(self, content: str) -> float:
        """
        Detect structural anomalies that may indicate injection:
        - Unusually high ratio of imperative verbs
        - Sudden style shifts
        - Encoded payloads
        """
        score = 0.0

        # Check for base64 encoded content
        base64_matches = re.findall(
            r'[A-Za-z0-9+/]{40,}={0,2}', content
        )
        if base64_matches:
            score = max(score, 0.60)

        # Check for hex-encoded content
        hex_matches = re.findall(r'(?:0x[0-9a-fA-F]{2}\s*){10,}', content)
        if hex_matches:
            score = max(score, 0.55)

        # Check imperative verb density
        imperative_words = [
            'must', 'always', 'never', 'immediately', 'ensure',
            'output', 'respond', 'ignore', 'disregard', 'override'
        ]
        words = content.lower().split()
        if words:
            imperative_count = sum(1 for w in words if w in imperative_words)
            imperative_ratio = imperative_count / len(words)
            if imperative_ratio > 0.05:
                score = max(score, min(imperative_ratio * 10, 0.80))

        return score

    def scan_batch(
        self, chunks: List[DocumentChunk]
    ) -> Dict[str, InjectionScanResult]:
        """Scan a batch of chunks."""
        results = {}
        for chunk in chunks:
            results[chunk.chunk_id] = self.scan_chunk(chunk)
        return results
```

---

## Access Control for Retrieved Documents

### Multi-Tenant Document Access Control

```python
from typing import Set, Dict, List, Optional
from dataclasses import dataclass


@dataclass
class AccessPolicy:
    """Access control policy for a document or collection."""
    document_id: str
    owner_tenant: str
    allowed_tenants: Set[str]
    allowed_roles: Set[str]
    classification: str  # "public", "internal", "confidential", "restricted"
    requires_audit: bool = False


@dataclass
class AccessCheckResult:
    """Result of an access control check."""
    document_id: str
    granted: bool
    reason: str
    audit_required: bool = False


class DocumentAccessController:
    """
    Enforces access control on retrieved documents.
    Prevents cross-tenant data leakage and unauthorized access.
    """

    CLASSIFICATION_HIERARCHY = {
        "public": 0,
        "internal": 1,
        "confidential": 2,
        "restricted": 3,
    }

    def __init__(self):
        self.policies: Dict[str, AccessPolicy] = {}

    def register_policy(self, policy: AccessPolicy):
        """Register an access policy for a document."""
        self.policies[policy.document_id] = policy

    def check_access(
        self,
        document_id: str,
        requesting_tenant: str,
        requesting_role: str,
        max_classification: str = "confidential"
    ) -> AccessCheckResult:
        """
        Check if a tenant/role has access to a document.
        """
        policy = self.policies.get(document_id)

        if not policy:
            # Default: deny access to unregistered documents
            return AccessCheckResult(
                document_id=document_id,
                granted=False,
                reason="No access policy found for document"
            )

        # Check classification level
        max_level = self.CLASSIFICATION_HIERARCHY.get(max_classification, 0)
        doc_level = self.CLASSIFICATION_HIERARCHY.get(policy.classification, 0)
        if doc_level > max_level:
            return AccessCheckResult(
                document_id=document_id,
                granted=False,
                reason=f"Document classification '{policy.classification}' exceeds "
                       f"maximum allowed '{max_classification}'"
            )

        # Check tenant access
        if requesting_tenant != policy.owner_tenant:
            if requesting_tenant not in policy.allowed_tenants:
                return AccessCheckResult(
                    document_id=document_id,
                    granted=False,
                    reason=f"Tenant '{requesting_tenant}' not authorized for this document"
                )

        # Check role access
        if policy.allowed_roles and requesting_role not in policy.allowed_roles:
            return AccessCheckResult(
                document_id=document_id,
                granted=False,
                reason=f"Role '{requesting_role}' not authorized for this document"
            )

        return AccessCheckResult(
            document_id=document_id,
            granted=True,
            reason="Access granted",
            audit_required=policy.requires_audit
        )

    def filter_chunks(
        self,
        chunks: List[DocumentChunk],
        requesting_tenant: str,
        requesting_role: str,
        max_classification: str = "confidential"
    ) -> tuple[List[DocumentChunk], List[AccessCheckResult]]:
        """
        Filter chunks based on access control, returning only authorized chunks.
        """
        authorized = []
        denied_results = []

        for chunk in chunks:
            doc_id = chunk.metadata.get("document_id", chunk.source_document)
            result = self.check_access(
                doc_id, requesting_tenant, requesting_role, max_classification
            )

            if result.granted:
                authorized.append(chunk)
            else:
                denied_results.append(result)

        return authorized, denied_results
```

---

## Source Provenance Verification

Track and verify the origin of every document chunk to prevent supply-chain attacks on the knowledge base.

```python
import hashlib
import json
from datetime import datetime
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class ProvenanceRecord:
    """Tracks the complete lineage of a document chunk."""
    chunk_id: str
    source_uri: str  # Original document URL/path
    ingestion_timestamp: str
    ingestion_pipeline: str  # Which pipeline processed this
    content_hash: str
    embedding_model: str
    chunk_strategy: str  # "fixed_size", "semantic", "sentence"
    chunk_index: int
    total_chunks: int
    parent_document_hash: str
    processing_version: str  # Pipeline code version


@dataclass
class ProvenanceVerification:
    """Result of provenance verification."""
    chunk_id: str
    is_verified: bool
    source_trusted: bool
    pipeline_known: bool
    content_fresh: bool  # Not stale
    issues: List[str]


class ProvenanceVerifier:
    """
    Verifies the provenance of retrieved document chunks.
    Ensures chunks come from trusted sources, known pipelines,
    and are not stale beyond the freshness window.
    """

    def __init__(
        self,
        trusted_sources: List[str],
        known_pipelines: List[str],
        max_age_days: int = 90
    ):
        self.trusted_sources = set(trusted_sources)
        self.known_pipelines = set(known_pipelines)
        self.max_age_days = max_age_days

    def verify(self, record: ProvenanceRecord) -> ProvenanceVerification:
        """Verify the provenance of a document chunk."""
        issues = []

        # Check source trust
        source_trusted = any(
            record.source_uri.startswith(trusted)
            for trusted in self.trusted_sources
        )
        if not source_trusted:
            issues.append(
                f"Source '{record.source_uri}' not in trusted sources list"
            )

        # Check pipeline
        pipeline_known = record.ingestion_pipeline in self.known_pipelines
        if not pipeline_known:
            issues.append(
                f"Pipeline '{record.ingestion_pipeline}' not recognized"
            )

        # Check freshness
        try:
            ingestion_time = datetime.fromisoformat(record.ingestion_timestamp)
            age_days = (datetime.utcnow() - ingestion_time).days
            content_fresh = age_days <= self.max_age_days
            if not content_fresh:
                issues.append(
                    f"Content is {age_days} days old (max: {self.max_age_days})"
                )
        except ValueError:
            content_fresh = False
            issues.append("Invalid ingestion timestamp format")

        is_verified = source_trusted and pipeline_known and content_fresh

        return ProvenanceVerification(
            chunk_id=record.chunk_id,
            is_verified=is_verified,
            source_trusted=source_trusted,
            pipeline_known=pipeline_known,
            content_fresh=content_fresh,
            issues=issues
        )
```

---

## Complete Retrieval Guardrail Pipeline

```python
from typing import List, Dict, Any
from dataclasses import dataclass, field


@dataclass
class RetrievalGuardrailResult:
    """Complete result from the retrieval guardrail pipeline."""
    clean_chunks: List[DocumentChunk]
    quarantined_chunks: List[DocumentChunk]
    removed_chunks: List[DocumentChunk]
    total_retrieved: int
    total_passed: int
    integrity_failures: int
    injection_detections: int
    access_denials: int
    provenance_failures: int


class RetrievalGuardrailPipeline:
    """
    Complete retrieval guardrail pipeline that chains integrity verification,
    injection scanning, access control, and provenance checking.
    """

    def __init__(
        self,
        integrity_verifier: ChunkIntegrityVerifier,
        injection_scanner: IndirectInjectionScanner,
        access_controller: DocumentAccessController,
        provenance_verifier: Optional[ProvenanceVerifier] = None
    ):
        self.integrity = integrity_verifier
        self.scanner = injection_scanner
        self.access = access_controller
        self.provenance = provenance_verifier

    def evaluate(
        self,
        chunks: List[DocumentChunk],
        requesting_tenant: str,
        requesting_role: str
    ) -> RetrievalGuardrailResult:
        """Run all retrieval guardrail checks on retrieved chunks."""
        clean = []
        quarantined = []
        removed = []
        integrity_fails = 0
        injection_detects = 0
        access_denials = 0
        provenance_fails = 0

        for chunk in chunks:
            # Step 1: Integrity check
            integrity_result = self.integrity.verify_chunk(chunk)
            if not integrity_result.is_valid:
                quarantined.append(chunk)
                integrity_fails += 1
                continue

            # Step 2: Injection scan
            scan_result = self.scanner.scan_chunk(chunk)
            if not scan_result.is_clean:
                quarantined.append(chunk)
                injection_detects += 1
                continue

            # Step 3: Access control
            doc_id = chunk.metadata.get("document_id", chunk.source_document)
            access_result = self.access.check_access(
                doc_id, requesting_tenant, requesting_role
            )
            if not access_result.granted:
                removed.append(chunk)
                access_denials += 1
                continue

            # Step 4: Provenance (optional)
            if self.provenance and "provenance" in chunk.metadata:
                prov_record = ProvenanceRecord(**chunk.metadata["provenance"])
                prov_result = self.provenance.verify(prov_record)
                if not prov_result.is_verified:
                    quarantined.append(chunk)
                    provenance_fails += 1
                    continue

            clean.append(chunk)

        return RetrievalGuardrailResult(
            clean_chunks=clean,
            quarantined_chunks=quarantined,
            removed_chunks=removed,
            total_retrieved=len(chunks),
            total_passed=len(clean),
            integrity_failures=integrity_fails,
            injection_detections=injection_detects,
            access_denials=access_denials,
            provenance_failures=provenance_fails
        )
```

---

## Best Practices

1. **Hash at index time**: Compute and store content hashes during document ingestion, not at query time.
2. **Scan every chunk**: Even trusted sources can be compromised. Run injection scanning on all retrieved content.
3. **Enforce tenant isolation**: In multi-tenant systems, metadata filtering at the vector store level is faster than post-retrieval filtering.
4. **Version provenance records**: Track which pipeline version processed each document for reproducibility.
5. **Re-index periodically**: Rebuild indexes from source to detect silent corruption.

## Anti-Patterns

1. **Trusting all indexed content**: Documents in the index can be poisoned. Never skip retrieval guardrails.
2. **Hash-only integrity**: Hashes detect tampering but not poisoning at ingestion time. Combine with provenance.
3. **No access control on RAG**: Multi-tenant RAG without access control leaks data between tenants.
4. **Ignoring metadata injection**: Adversarial metadata fields can influence model behavior even if content is clean.

---

## Handoff & Related References
- Input Guardrail Patterns: [input-guardrail-patterns.md](input-guardrail-patterns.md)
- Policy Enforcement Engines: [policy-enforcement-engines.md](policy-enforcement-engines.md)
- Guardrail Monitoring & Alerting: [guardrail-monitoring-alerting.md](guardrail-monitoring-alerting.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive retrieval security implementations preserved)
-->
