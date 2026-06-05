# Output Guardrail Patterns

## Overview

Output guardrails form the egress defense layer that intercepts, analyzes, and sanitizes every agent response before delivery to the user. They address three critical threat categories: hallucinated content (fabricated facts, invented citations, contradictions with source material), PII leakage (personal data exposed in outputs), and harmful content generation (toxic, biased, or policy-violating text).

---

## Hallucination Detection Architecture

### Claim-Level Entailment Verification

The gold-standard approach to hallucination detection decomposes agent outputs into atomic claims and verifies each claim against source documents using Natural Language Inference (NLI).

```
[Agent Draft Response]
       │
       ├──► Claim Decomposer ──► Extracts N atomic factual claims
       │
       ├──► Source Retriever ──► Fetches grounding documents/context
       │
       ├──► NLI Verifier ──► For each claim, checks entailment vs. sources
       │    ├── Entailed → Claim is grounded (score = 1.0)
       │    ├── Neutral  → Claim lacks evidence (score = 0.5)
       │    └── Contradicted → Claim contradicts source (score = 0.0)
       │
       └──► Hallucination Scorer ──► Aggregate score across all claims
            ├── Score > 0.80 → PASS (well-grounded)
            ├── Score 0.50–0.80 → FLAG (partially grounded)
            └── Score < 0.50 → REWRITE (significant hallucination)
```

### Claim Decomposition

```python
import re
from typing import List, Dict, Any
from dataclasses import dataclass


@dataclass
class Claim:
    """An atomic factual claim extracted from agent output."""
    text: str
    source_sentence: str
    claim_index: int
    claim_type: str  # "factual", "numerical", "temporal", "citation"


class ClaimDecomposer:
    """
    Decomposes an agent response into atomic factual claims.
    Each claim represents a single verifiable assertion.
    """

    # Patterns that indicate factual claims
    FACTUAL_INDICATORS = [
        r'\b(?:is|are|was|were|has|have|had)\b',
        r'\b(?:according to|based on|reported|stated)\b',
        r'\b(?:increased|decreased|grew|declined)\b',
        r'\b\d+(?:\.\d+)?%?\b',  # Numbers
        r'\b(?:in \d{4}|on \w+ \d{1,2})\b',  # Dates
    ]

    def __init__(self, min_claim_length: int = 10):
        self.min_claim_length = min_claim_length
        self._indicators = [
            re.compile(p, re.IGNORECASE)
            for p in self.FACTUAL_INDICATORS
        ]

    def decompose(self, text: str) -> List[Claim]:
        """
        Extract atomic claims from agent output text.
        Splits compound sentences and identifies verifiable assertions.
        """
        sentences = self._split_sentences(text)
        claims = []
        claim_idx = 0

        for sentence in sentences:
            sub_claims = self._extract_claims_from_sentence(sentence)
            for claim_text, claim_type in sub_claims:
                if len(claim_text) >= self.min_claim_length:
                    claims.append(Claim(
                        text=claim_text.strip(),
                        source_sentence=sentence,
                        claim_index=claim_idx,
                        claim_type=claim_type
                    ))
                    claim_idx += 1

        return claims

    def _split_sentences(self, text: str) -> List[str]:
        """Split text into sentences using regex boundary detection."""
        pattern = re.compile(r'(?<=[.!?])\s+(?=[A-Z])')
        sentences = pattern.split(text)
        return [s.strip() for s in sentences if s.strip()]

    def _extract_claims_from_sentence(
        self, sentence: str
    ) -> List[tuple[str, str]]:
        """
        Extract individual claims from a sentence.
        Handles compound sentences joined by conjunctions.
        """
        claims = []

        # Split compound sentences
        conjunctions = re.compile(
            r'\s*(?:,\s*(?:and|but|while|whereas|however)|;\s*)\s*',
            re.IGNORECASE
        )
        parts = conjunctions.split(sentence)

        for part in parts:
            claim_type = self._classify_claim(part)
            if claim_type:
                claims.append((part, claim_type))

        if not claims and self._has_factual_content(sentence):
            claims.append((sentence, "factual"))

        return claims

    def _classify_claim(self, text: str) -> str | None:
        """Classify the type of claim."""
        if re.search(r'\b\d+(?:\.\d+)?%?\b', text):
            return "numerical"
        if re.search(r'\b(?:in \d{4}|on \w+ \d{1,2})\b', text):
            return "temporal"
        if re.search(r'(?:https?://|doi:|ISBN)', text):
            return "citation"
        if self._has_factual_content(text):
            return "factual"
        return None

    def _has_factual_content(self, text: str) -> bool:
        """Check if text contains factual indicators."""
        return any(
            indicator.search(text)
            for indicator in self._indicators
        )
```

### NLI-Based Verification

```python
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import numpy as np

try:
    from transformers import pipeline
    HAS_TRANSFORMERS = True
except ImportError:
    HAS_TRANSFORMERS = False


@dataclass
class VerificationResult:
    """Result of verifying a single claim against source documents."""
    claim: Claim
    verdict: str  # "entailed", "neutral", "contradicted"
    confidence: float
    best_evidence: str
    evidence_score: float


@dataclass
class HallucinationReport:
    """Complete hallucination analysis report."""
    aggregate_score: float  # 0.0 = all hallucinated, 1.0 = all grounded
    verdict: str  # "pass", "flag", "rewrite"
    total_claims: int
    entailed_claims: int
    neutral_claims: int
    contradicted_claims: int
    claim_results: List[VerificationResult]


class HallucinationDetector:
    """
    Detects hallucinations in agent outputs by verifying atomic claims
    against source documents using Natural Language Inference (NLI).
    """

    def __init__(
        self,
        nli_model: str = "facebook/bart-large-mnli",
        pass_threshold: float = 0.80,
        flag_threshold: float = 0.50,
        device: int = -1
    ):
        if not HAS_TRANSFORMERS:
            raise ImportError(
                "transformers is required. Install with: pip install transformers"
            )

        self.nli_pipeline = pipeline(
            "zero-shot-classification",
            model=nli_model,
            device=device
        )
        self.pass_threshold = pass_threshold
        self.flag_threshold = flag_threshold
        self.decomposer = ClaimDecomposer()

    def verify_claim(
        self,
        claim: Claim,
        source_documents: List[str]
    ) -> VerificationResult:
        """
        Verify a single claim against source documents.
        Uses NLI to check if sources entail, are neutral to, or
        contradict the claim.
        """
        best_score = 0.0
        best_evidence = ""
        best_verdict = "neutral"

        for doc in source_documents:
            # Chunk document into passages for fine-grained checking
            passages = self._chunk_document(doc, max_length=500)

            for passage in passages:
                result = self.nli_pipeline(
                    passage,
                    candidate_labels=["entailment", "neutral", "contradiction"],
                    hypothesis=claim.text
                )

                label_scores = dict(
                    zip(result["labels"], result["scores"])
                )

                entailment_score = label_scores.get("entailment", 0)
                contradiction_score = label_scores.get("contradiction", 0)

                if entailment_score > best_score:
                    best_score = entailment_score
                    best_evidence = passage[:200]
                    best_verdict = "entailed"

                if contradiction_score > 0.80:
                    return VerificationResult(
                        claim=claim,
                        verdict="contradicted",
                        confidence=contradiction_score,
                        best_evidence=passage[:200],
                        evidence_score=contradiction_score
                    )

        if best_score < 0.30:
            best_verdict = "neutral"

        return VerificationResult(
            claim=claim,
            verdict=best_verdict,
            confidence=best_score,
            best_evidence=best_evidence,
            evidence_score=best_score
        )

    def analyze(
        self,
        agent_output: str,
        source_documents: List[str]
    ) -> HallucinationReport:
        """
        Full hallucination analysis pipeline.
        Decomposes output into claims and verifies each.
        """
        claims = self.decomposer.decompose(agent_output)

        if not claims:
            return HallucinationReport(
                aggregate_score=1.0,
                verdict="pass",
                total_claims=0,
                entailed_claims=0,
                neutral_claims=0,
                contradicted_claims=0,
                claim_results=[]
            )

        results = []
        for claim in claims:
            result = self.verify_claim(claim, source_documents)
            results.append(result)

        entailed = sum(1 for r in results if r.verdict == "entailed")
        neutral = sum(1 for r in results if r.verdict == "neutral")
        contradicted = sum(1 for r in results if r.verdict == "contradicted")

        # Score: entailed = 1.0, neutral = 0.5, contradicted = 0.0
        total = len(results)
        score = (entailed * 1.0 + neutral * 0.5) / total

        if score >= self.pass_threshold:
            verdict = "pass"
        elif score >= self.flag_threshold:
            verdict = "flag"
        else:
            verdict = "rewrite"

        return HallucinationReport(
            aggregate_score=round(score, 4),
            verdict=verdict,
            total_claims=total,
            entailed_claims=entailed,
            neutral_claims=neutral,
            contradicted_claims=contradicted,
            claim_results=results
        )

    def _chunk_document(
        self, document: str, max_length: int = 500
    ) -> List[str]:
        """Split document into overlapping chunks for passage-level NLI."""
        words = document.split()
        chunks = []
        stride = max_length // 2

        for i in range(0, len(words), stride):
            chunk = ' '.join(words[i:i + max_length])
            if chunk:
                chunks.append(chunk)
            if i + max_length >= len(words):
                break

        return chunks if chunks else [document]
```

---

## PII Redaction Engine

### PII Detection Categories

```
PII Category Taxonomy:
├── Direct Identifiers
│   ├── Full Name (first + last)
│   ├── Email Address
│   ├── Phone Number (intl formats)
│   ├── Social Security Number (SSN)
│   ├── Passport Number
│   └── Driver's License Number
│
├── Financial Identifiers
│   ├── Credit Card Number (Luhn validation)
│   ├── Bank Account Number
│   ├── IBAN/SWIFT Codes
│   └── Tax Identification Number
│
├── Location Data
│   ├── Street Address
│   ├── ZIP/Postal Code
│   ├── GPS Coordinates
│   └── IP Address (IPv4/IPv6)
│
├── Temporal Data
│   ├── Date of Birth
│   └── Specific Date + Person Association
│
└── Digital Identifiers
    ├── Username/Handle
    ├── Device ID / MAC Address
    ├── Cookie / Session ID
    └── API Key / Secret Token
```

### Python PII Redaction Implementation

```python
import re
from typing import List, Dict, Tuple, Optional
from dataclasses import dataclass, field
from enum import Enum


class PIICategory(Enum):
    EMAIL = "EMAIL"
    PHONE = "PHONE"
    SSN = "SSN"
    CREDIT_CARD = "CREDIT_CARD"
    IP_ADDRESS = "IP_ADDRESS"
    DATE_OF_BIRTH = "DATE_OF_BIRTH"
    PERSON_NAME = "PERSON_NAME"
    ADDRESS = "ADDRESS"
    API_KEY = "API_KEY"
    PASSPORT = "PASSPORT"


@dataclass
class PIIDetection:
    """A single PII detection in the text."""
    category: PIICategory
    original_text: str
    start_pos: int
    end_pos: int
    confidence: float
    replacement: str


@dataclass
class RedactionResult:
    """Complete result of PII redaction."""
    redacted_text: str
    detections: List[PIIDetection] = field(default_factory=list)
    pii_found: bool = False
    categories_detected: List[str] = field(default_factory=list)


class PIIRedactionEngine:
    """
    Multi-layer PII detection and redaction engine.
    Combines regex patterns with optional NER model for comprehensive coverage.
    """

    # Compiled regex patterns for structured PII
    PATTERNS: Dict[PIICategory, re.Pattern] = {
        PIICategory.EMAIL: re.compile(
            r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b'
        ),
        PIICategory.PHONE: re.compile(
            r'(?:\+\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}'
        ),
        PIICategory.SSN: re.compile(
            r'\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b'
        ),
        PIICategory.CREDIT_CARD: re.compile(
            r'\b(?:\d{4}[-\s]?){3}\d{4}\b'
        ),
        PIICategory.IP_ADDRESS: re.compile(
            r'\b(?:\d{1,3}\.){3}\d{1,3}\b'
            r'|'
            r'\b(?:[0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}\b'
        ),
        PIICategory.DATE_OF_BIRTH: re.compile(
            r'\b(?:born\s+(?:on\s+)?|DOB[:\s]+|date\s+of\s+birth[:\s]+)'
            r'(\d{1,2}[/.-]\d{1,2}[/.-]\d{2,4}|\w+\s+\d{1,2},?\s+\d{4})',
            re.IGNORECASE
        ),
        PIICategory.API_KEY: re.compile(
            r'\b(?:sk-[a-zA-Z0-9]{20,}|'
            r'AKIA[0-9A-Z]{16}|'
            r'ghp_[a-zA-Z0-9]{36}|'
            r'xox[bpas]-[a-zA-Z0-9-]+)\b'
        ),
        PIICategory.PASSPORT: re.compile(
            r'\b[A-Z]{1,2}\d{6,9}\b'
        ),
    }

    # Replacement templates per category
    REPLACEMENT_MAP: Dict[PIICategory, str] = {
        PIICategory.EMAIL: "[EMAIL_REDACTED]",
        PIICategory.PHONE: "[PHONE_REDACTED]",
        PIICategory.SSN: "[SSN_REDACTED]",
        PIICategory.CREDIT_CARD: "[CREDIT_CARD_REDACTED]",
        PIICategory.IP_ADDRESS: "[IP_REDACTED]",
        PIICategory.DATE_OF_BIRTH: "[DOB_REDACTED]",
        PIICategory.PERSON_NAME: "[NAME_REDACTED]",
        PIICategory.ADDRESS: "[ADDRESS_REDACTED]",
        PIICategory.API_KEY: "[API_KEY_REDACTED]",
        PIICategory.PASSPORT: "[PASSPORT_REDACTED]",
    }

    def __init__(self, use_ner: bool = False, ner_model: str = "en_core_web_trf"):
        self.use_ner = use_ner
        self._nlp = None
        self.ner_model = ner_model

    @property
    def nlp(self):
        """Lazy-load spaCy NER model."""
        if self._nlp is None and self.use_ner:
            try:
                import spacy
                self._nlp = spacy.load(self.ner_model)
            except (ImportError, OSError):
                print("Warning: spaCy NER model not available. Using regex-only mode.")
                self.use_ner = False
        return self._nlp

    def detect_regex(self, text: str) -> List[PIIDetection]:
        """Detect PII using regex patterns."""
        detections = []

        for category, pattern in self.PATTERNS.items():
            for match in pattern.finditer(text):
                detections.append(PIIDetection(
                    category=category,
                    original_text=match.group(),
                    start_pos=match.start(),
                    end_pos=match.end(),
                    confidence=0.90,
                    replacement=self.REPLACEMENT_MAP[category]
                ))

        return detections

    def detect_ner(self, text: str) -> List[PIIDetection]:
        """Detect PII using NER model (names, locations, organizations)."""
        if not self.use_ner or self.nlp is None:
            return []

        doc = self.nlp(text)
        detections = []

        ner_mapping = {
            "PERSON": PIICategory.PERSON_NAME,
            "GPE": PIICategory.ADDRESS,
            "LOC": PIICategory.ADDRESS,
            "FAC": PIICategory.ADDRESS,
        }

        for ent in doc.ents:
            if ent.label_ in ner_mapping:
                category = ner_mapping[ent.label_]
                detections.append(PIIDetection(
                    category=category,
                    original_text=ent.text,
                    start_pos=ent.start_char,
                    end_pos=ent.end_char,
                    confidence=0.85,
                    replacement=self.REPLACEMENT_MAP[category]
                ))

        return detections

    def luhn_validate(self, card_number: str) -> bool:
        """Validate credit card number using Luhn algorithm."""
        digits = re.sub(r'[-\s]', '', card_number)
        if not digits.isdigit() or len(digits) < 13:
            return False

        total = 0
        reverse = digits[::-1]
        for i, d in enumerate(reverse):
            n = int(d)
            if i % 2 == 1:
                n *= 2
                if n > 9:
                    n -= 9
            total += n

        return total % 10 == 0

    def redact(self, text: str) -> RedactionResult:
        """
        Detect and redact all PII in the text.
        Combines regex and NER detection, then applies replacements.
        """
        all_detections = self.detect_regex(text)

        if self.use_ner:
            all_detections.extend(self.detect_ner(text))

        # Filter credit card false positives with Luhn check
        validated_detections = []
        for detection in all_detections:
            if detection.category == PIICategory.CREDIT_CARD:
                if self.luhn_validate(detection.original_text):
                    validated_detections.append(detection)
            else:
                validated_detections.append(detection)

        if not validated_detections:
            return RedactionResult(
                redacted_text=text,
                pii_found=False
            )

        # Sort by position (reverse) for safe string replacement
        validated_detections.sort(key=lambda d: d.start_pos, reverse=True)

        redacted = text
        for detection in validated_detections:
            redacted = (
                redacted[:detection.start_pos] +
                detection.replacement +
                redacted[detection.end_pos:]
            )

        categories = list(set(d.category.value for d in validated_detections))

        # Re-sort detections by position for reporting
        validated_detections.sort(key=lambda d: d.start_pos)

        return RedactionResult(
            redacted_text=redacted,
            detections=validated_detections,
            pii_found=True,
            categories_detected=categories
        )
```

---

## Output Sanitization Pipeline

The complete output guardrail chains hallucination detection, PII redaction, and content filtering into a unified pipeline.

```python
from typing import Dict, Any, List, Optional
from dataclasses import dataclass


@dataclass
class OutputGuardrailResult:
    """Complete output guardrail pipeline result."""
    verdict: str  # "pass", "flag", "block", "rewrite"
    sanitized_output: str
    hallucination_score: float
    pii_detected: bool
    pii_categories: List[str]
    toxicity_score: float
    modifications_applied: List[str]


class OutputGuardrailPipeline:
    """
    Chains hallucination detection, PII redaction, and content filtering
    into a unified output guardrail pipeline.
    """

    def __init__(
        self,
        enable_hallucination_check: bool = True,
        enable_pii_redaction: bool = True,
        enable_toxicity_check: bool = True,
        hallucination_threshold: float = 0.50,
        toxicity_threshold: float = 0.70
    ):
        self.enable_hallucination = enable_hallucination_check
        self.enable_pii = enable_pii_redaction
        self.enable_toxicity = enable_toxicity_check
        self.hallucination_threshold = hallucination_threshold
        self.toxicity_threshold = toxicity_threshold

        if self.enable_pii:
            self.pii_engine = PIIRedactionEngine(use_ner=True)

    def evaluate(
        self,
        agent_output: str,
        source_documents: Optional[List[str]] = None
    ) -> OutputGuardrailResult:
        """Run the complete output guardrail pipeline."""
        current_text = agent_output
        modifications = []
        hallucination_score = 0.0
        pii_detected = False
        pii_categories = []
        toxicity_score = 0.0
        verdict = "pass"

        # Step 1: Hallucination check
        if self.enable_hallucination and source_documents:
            detector = HallucinationDetector()
            report = detector.analyze(current_text, source_documents)
            hallucination_score = 1.0 - report.aggregate_score

            if report.verdict == "rewrite":
                verdict = "rewrite"
                modifications.append("hallucination_rewrite_triggered")

        # Step 2: PII redaction
        if self.enable_pii:
            redaction = self.pii_engine.redact(current_text)
            if redaction.pii_found:
                current_text = redaction.redacted_text
                pii_detected = True
                pii_categories = redaction.categories_detected
                modifications.append(
                    f"pii_redacted: {', '.join(pii_categories)}"
                )

        # Step 3: Toxicity check (placeholder for external classifier)
        if self.enable_toxicity:
            toxicity_score = self._check_toxicity(current_text)
            if toxicity_score > self.toxicity_threshold:
                verdict = "block"
                modifications.append("toxicity_block_triggered")

        return OutputGuardrailResult(
            verdict=verdict,
            sanitized_output=current_text,
            hallucination_score=round(hallucination_score, 4),
            pii_detected=pii_detected,
            pii_categories=pii_categories,
            toxicity_score=round(toxicity_score, 4),
            modifications_applied=modifications
        )

    def _check_toxicity(self, text: str) -> float:
        """
        Placeholder for toxicity classification.
        In production, use OpenAI Moderation API or HuggingFace toxicity model.
        """
        # Simplified keyword-based placeholder
        toxic_indicators = [
            "kill", "murder", "attack", "bomb", "weapon",
            "hate", "racist", "slur"
        ]
        words = text.lower().split()
        matches = sum(1 for w in words if w in toxic_indicators)
        return min(matches / max(len(words), 1) * 10, 1.0)
```

---

## TypeScript Output Guardrail

```typescript
interface OutputGuardrailResult {
  verdict: 'pass' | 'flag' | 'block' | 'rewrite';
  sanitizedOutput: string;
  hallucinationScore: number;
  piiDetected: boolean;
  piiCategories: string[];
  toxicityScore: number;
}

interface PIIMatch {
  category: string;
  original: string;
  replacement: string;
  start: number;
  end: number;
}

const PII_PATTERNS: Record<string, { regex: RegExp; replacement: string }> = {
  EMAIL: {
    regex: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g,
    replacement: '[EMAIL_REDACTED]',
  },
  PHONE: {
    regex: /(?:\+\d{1,3}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,4}[-.\s]?\d{3,4}/g,
    replacement: '[PHONE_REDACTED]',
  },
  SSN: {
    regex: /\b\d{3}[-\s]?\d{2}[-\s]?\d{4}\b/g,
    replacement: '[SSN_REDACTED]',
  },
  CREDIT_CARD: {
    regex: /\b(?:\d{4}[-\s]?){3}\d{4}\b/g,
    replacement: '[CREDIT_CARD_REDACTED]',
  },
  IP_ADDRESS: {
    regex: /\b(?:\d{1,3}\.){3}\d{1,3}\b/g,
    replacement: '[IP_REDACTED]',
  },
  API_KEY: {
    regex: /\b(?:sk-[a-zA-Z0-9]{20,}|AKIA[0-9A-Z]{16}|ghp_[a-zA-Z0-9]{36})\b/g,
    replacement: '[API_KEY_REDACTED]',
  },
};

function redactPII(text: string): { redacted: string; matches: PIIMatch[] } {
  const matches: PIIMatch[] = [];
  let redacted = text;

  for (const [category, { regex, replacement }] of Object.entries(PII_PATTERNS)) {
    // Reset regex state
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      matches.push({
        category,
        original: match[0],
        replacement,
        start: match.index,
        end: match.index + match[0].length,
      });
    }

    redacted = redacted.replace(regex, replacement);
  }

  return { redacted, matches };
}

function evaluateOutput(
  agentOutput: string,
  sourceDocuments?: string[],
): OutputGuardrailResult {
  // Step 1: PII redaction
  const piiResult = redactPII(agentOutput);
  const piiCategories = [...new Set(piiResult.matches.map((m) => m.category))];

  // Step 2: Toxicity (simplified)
  const toxicityScore = 0.0; // Use external API in production

  // Step 3: Hallucination (simplified)
  const hallucinationScore = 0.0; // Use NLI model in production

  let verdict: 'pass' | 'flag' | 'block' | 'rewrite' = 'pass';
  if (toxicityScore > 0.70) verdict = 'block';
  else if (hallucinationScore > 0.50) verdict = 'rewrite';
  else if (piiResult.matches.length > 0) verdict = 'flag';

  return {
    verdict,
    sanitizedOutput: piiResult.redacted,
    hallucinationScore,
    piiDetected: piiResult.matches.length > 0,
    piiCategories,
    toxicityScore,
  };
}
```

---

## Best Practices

1. **Decompose before verifying**: Always extract atomic claims before running NLI verification. Verifying entire paragraphs produces inaccurate entailment scores.
2. **Layer PII detection**: Combine regex patterns for structured PII with NER models for unstructured PII (names, addresses).
3. **Validate credit cards**: Use the Luhn algorithm to filter false-positive credit card detections from random number sequences.
4. **Run PII redaction last**: Apply PII redaction after hallucination checking but before delivery, so hallucination analysis has full context.
5. **Cache NLI results**: For repeated source documents, cache claim-passage entailment scores to avoid redundant computation.

---

## Anti-Patterns

1. **Substring matching for PII**: Simple substring matching misses formatted variants and produces excessive false positives.
2. **Skipping hallucination detection for RAG**: RAG does not eliminate hallucination; models can fabricate facts even with perfect retrieval.
3. **Single-model toxicity detection**: Different toxicity models have different bias profiles. Use multiple models or APIs for balanced coverage.
4. **Redacting in chain-of-thought**: Redacting PII in intermediate reasoning traces can break the agent's logic. Redact only in the final output.

---

## Handoff & Related References
- Input Guardrail Patterns: [input-guardrail-patterns.md](input-guardrail-patterns.md)
- Content Filtering Layers: [content-filtering-layers.md](content-filtering-layers.md)
- Guardrail Testing & Validation: [guardrail-testing-validation.md](guardrail-testing-validation.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive code implementations & detection algorithms preserved)
-->
