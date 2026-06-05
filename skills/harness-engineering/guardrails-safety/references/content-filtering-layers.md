# Content Filtering Layers

## Overview

Content filtering layers implement defense-in-depth content moderation for AI agent inputs and outputs. Unlike single-point checks, a multi-layer filtering architecture applies progressively more expensive analysis stages, from fast keyword matching through ML-based toxicity classification to LLM-based contextual review. This reference covers toxicity detection, hate speech filtering, NSFW content blocking, domain-specific filters, configurable filter chains, and filter bypass prevention.

---

## Multi-Layer Filter Architecture

```
┌──────────────────────────────────────────────────────────────────────┐
│                    CONTENT FILTERING PIPELINE                         │
│                                                                       │
│  Input ──► L1: Keyword ──► L2: Regex ──► L3: ML ──► L4: LLM ──► Out│
│            Filter          Patterns      Classifier   Judge          │
│            (<1ms)          (<1ms)         (5-50ms)     (200-500ms)   │
│               │               │              │             │         │
│               ▼               ▼              ▼             ▼         │
│           BLOCK/PASS      BLOCK/PASS     SCORE+TAG    VERDICT        │
│                                                                       │
│  Each layer:                                                          │
│  - Can independently BLOCK (short-circuit)                            │
│  - Adds metadata tags for downstream layers                           │
│  - Reports to telemetry                                               │
│  - Configurable per content category                                  │
└──────────────────────────────────────────────────────────────────────┘
```

### Layer Execution Strategy

```
Decision Flow:
├── L1 blocks → STOP (log, return blocked response)
├── L1 passes → L2
│   ├── L2 blocks → STOP
│   ├── L2 passes → L3
│   │   ├── L3 score > hard_threshold → STOP
│   │   ├── L3 score > soft_threshold → FLAG + continue to L4
│   │   ├── L3 score ≤ soft_threshold → PASS
│   │   │   └── L4 (only if flagged by L3)
│   │   │       ├── L4 verdict: unsafe → STOP
│   │   │       └── L4 verdict: safe → PASS (override L3 flag)
│   │   └── PASS
│   └── ...
└── ...
```

---

## Layer 1: Keyword and Blocklist Filtering

The fastest and cheapest filter layer. Maintains curated blocklists of terms, phrases, and patterns that trigger immediate blocking or flagging.

```python
import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple
from enum import Enum


class FilterAction(Enum):
    PASS = "pass"
    FLAG = "flag"
    BLOCK = "block"
    REDACT = "redact"


@dataclass
class BlocklistEntry:
    """A single blocklist entry with metadata."""
    term: str
    category: str
    severity: float  # 0.0-1.0
    action: FilterAction
    case_sensitive: bool = False
    whole_word: bool = True


@dataclass
class BlocklistResult:
    """Result from blocklist filtering."""
    action: FilterAction
    matched_entries: List[BlocklistEntry]
    redacted_text: Optional[str] = None


class KeywordFilterLayer:
    """
    Layer 1: Fast keyword and blocklist filtering.

    Uses Aho-Corasick automaton for O(n) multi-pattern matching
    where n is the input length, regardless of dictionary size.
    Falls back to regex matching if ahocorasick is unavailable.
    """

    def __init__(self):
        self._blocklists: Dict[str, List[BlocklistEntry]] = {}
        self._compiled_patterns: Dict[str, re.Pattern] = {}
        self._aho_automaton = None
        self._use_aho = False
        self._initialize_aho()

    def _initialize_aho(self):
        """Try to initialize Aho-Corasick automaton for fast matching."""
        try:
            import ahocorasick
            self._aho_automaton = ahocorasick.Automaton()
            self._use_aho = True
        except ImportError:
            self._use_aho = False

    def load_blocklist(self, category: str, entries: List[BlocklistEntry]) -> None:
        """Load a blocklist for a specific category."""
        self._blocklists[category] = entries
        self._rebuild_patterns(category)

    def _rebuild_patterns(self, category: str) -> None:
        """Rebuild matching patterns for the category."""
        entries = self._blocklists[category]

        if self._use_aho:
            for entry in entries:
                key = entry.term.lower() if not entry.case_sensitive else entry.term
                self._aho_automaton.add_word(key, (category, entry))
            self._aho_automaton.make_automaton()
        else:
            # Fallback: compile regex patterns
            patterns = []
            for entry in entries:
                escaped = re.escape(entry.term)
                if entry.whole_word:
                    escaped = rf"\b{escaped}\b"
                flags = 0 if entry.case_sensitive else re.IGNORECASE
                patterns.append((re.compile(escaped, flags), entry))
            self._compiled_patterns[category] = patterns

    def filter(self, text: str, categories: Optional[List[str]] = None) -> BlocklistResult:
        """
        Filter text against loaded blocklists.

        Args:
            text: Input text to filter.
            categories: Optional list of categories to check.
                        If None, checks all categories.

        Returns:
            BlocklistResult with action and matched entries.
        """
        target_categories = categories or list(self._blocklists.keys())
        matched: List[BlocklistEntry] = []

        if self._use_aho:
            search_text = text.lower()
            for end_idx, (cat, entry) in self._aho_automaton.iter(search_text):
                if cat in target_categories:
                    matched.append(entry)
        else:
            for cat in target_categories:
                for pattern, entry in self._compiled_patterns.get(cat, []):
                    if pattern.search(text):
                        matched.append(entry)

        if not matched:
            return BlocklistResult(action=FilterAction.PASS, matched_entries=[])

        # Determine action: most severe match wins
        max_action = FilterAction.PASS
        for entry in matched:
            if entry.action == FilterAction.BLOCK:
                max_action = FilterAction.BLOCK
                break
            elif entry.action == FilterAction.REDACT and max_action != FilterAction.BLOCK:
                max_action = FilterAction.REDACT
            elif entry.action == FilterAction.FLAG and max_action == FilterAction.PASS:
                max_action = FilterAction.FLAG

        # Optionally redact matched terms
        redacted = None
        if max_action == FilterAction.REDACT:
            redacted = text
            for entry in matched:
                if entry.case_sensitive:
                    redacted = redacted.replace(entry.term, "[REDACTED]")
                else:
                    pattern = re.compile(re.escape(entry.term), re.IGNORECASE)
                    redacted = pattern.sub("[REDACTED]", redacted)

        return BlocklistResult(
            action=max_action,
            matched_entries=matched,
            redacted_text=redacted,
        )


# Default blocklist entries
DEFAULT_BLOCKLISTS = {
    "profanity": [
        # Entries would be populated from a curated word list
        # Example structure only
        BlocklistEntry(term="example_slur", category="profanity",
                      severity=0.9, action=FilterAction.BLOCK),
    ],
    "pii_patterns": [
        BlocklistEntry(term="my social security number is",
                      category="pii_solicitation", severity=0.8,
                      action=FilterAction.FLAG, whole_word=False),
        BlocklistEntry(term="my credit card number",
                      category="pii_solicitation", severity=0.8,
                      action=FilterAction.FLAG, whole_word=False),
    ],
    "self_harm": [
        BlocklistEntry(term="how to harm myself",
                      category="self_harm", severity=1.0,
                      action=FilterAction.BLOCK, whole_word=False),
    ],
}
```

---

## Layer 2: Regex Pattern Filtering

More sophisticated pattern matching for structured content like PII, URLs, code injection, and encoded payloads.

```python
import re
from dataclasses import dataclass
from typing import Any, Dict, List, Optional, Tuple


@dataclass
class PatternRule:
    """A regex-based filter rule."""
    name: str
    pattern: re.Pattern
    category: str
    severity: float
    action: FilterAction
    description: str
    extract_groups: bool = False


class RegexFilterLayer:
    """
    Layer 2: Regex pattern filtering for structured content detection.

    Detects PII patterns, URLs, encoded payloads, code injection
    attempts, and other structured content that requires regex matching.
    """

    # Pre-compiled PII detection patterns
    PII_PATTERNS = [
        PatternRule(
            name="ssn",
            pattern=re.compile(r"\b\d{3}-\d{2}-\d{4}\b"),
            category="pii",
            severity=0.95,
            action=FilterAction.BLOCK,
            description="US Social Security Number",
        ),
        PatternRule(
            name="credit_card",
            pattern=re.compile(
                r"\b(?:4[0-9]{12}(?:[0-9]{3})?|"
                r"5[1-5][0-9]{14}|"
                r"3[47][0-9]{13}|"
                r"3(?:0[0-5]|[68][0-9])[0-9]{11}|"
                r"6(?:011|5[0-9]{2})[0-9]{12}|"
                r"(?:2131|1800|35\d{3})\d{11})\b"
            ),
            category="pii",
            severity=0.95,
            action=FilterAction.BLOCK,
            description="Credit card number (Visa, MC, Amex, Discover, JCB)",
        ),
        PatternRule(
            name="email",
            pattern=re.compile(
                r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b"
            ),
            category="pii",
            severity=0.5,
            action=FilterAction.FLAG,
            description="Email address",
        ),
        PatternRule(
            name="phone_us",
            pattern=re.compile(
                r"\b(?:\+?1[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b"
            ),
            category="pii",
            severity=0.6,
            action=FilterAction.FLAG,
            description="US phone number",
        ),
        PatternRule(
            name="ip_address",
            pattern=re.compile(
                r"\b(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}"
                r"(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\b"
            ),
            category="pii",
            severity=0.4,
            action=FilterAction.FLAG,
            description="IPv4 address",
        ),
    ]

    # URL and code injection patterns
    INJECTION_PATTERNS = [
        PatternRule(
            name="data_uri",
            pattern=re.compile(
                r"data:(?:text|application)/[^;]+;base64,[A-Za-z0-9+/]+=*",
                re.IGNORECASE,
            ),
            category="injection",
            severity=0.7,
            action=FilterAction.FLAG,
            description="Base64 data URI (potential payload)",
        ),
        PatternRule(
            name="script_tag",
            pattern=re.compile(r"<script[^>]*>.*?</script>", re.IGNORECASE | re.DOTALL),
            category="injection",
            severity=0.8,
            action=FilterAction.BLOCK,
            description="HTML script tag injection",
        ),
        PatternRule(
            name="sql_injection",
            pattern=re.compile(
                r"(?:'\s*(?:OR|AND|UNION)\s+|"
                r";\s*(?:DROP|DELETE|UPDATE|INSERT)\s+|"
                r"--\s*$)",
                re.IGNORECASE,
            ),
            category="injection",
            severity=0.8,
            action=FilterAction.BLOCK,
            description="SQL injection attempt",
        ),
    ]

    def __init__(
        self,
        custom_rules: Optional[List[PatternRule]] = None,
        enable_pii: bool = True,
        enable_injection: bool = True,
    ):
        self.rules: List[PatternRule] = []
        if enable_pii:
            self.rules.extend(self.PII_PATTERNS)
        if enable_injection:
            self.rules.extend(self.INJECTION_PATTERNS)
        if custom_rules:
            self.rules.extend(custom_rules)

    def filter(self, text: str) -> Dict[str, Any]:
        """
        Filter text against all regex patterns.

        Returns:
            {
                "action": FilterAction,
                "matches": [{"rule": str, "category": str, ...}],
                "categories_triggered": set[str],
            }
        """
        matches = []
        max_severity = 0.0
        max_action = FilterAction.PASS
        categories = set()

        for rule in self.rules:
            found = list(rule.pattern.finditer(text))
            if found:
                match_data = {
                    "rule": rule.name,
                    "category": rule.category,
                    "severity": rule.severity,
                    "action": rule.action.value,
                    "description": rule.description,
                    "match_count": len(found),
                    "positions": [(m.start(), m.end()) for m in found],
                }
                matches.append(match_data)
                categories.add(rule.category)
                max_severity = max(max_severity, rule.severity)
                if rule.action == FilterAction.BLOCK:
                    max_action = FilterAction.BLOCK
                elif rule.action == FilterAction.FLAG and max_action != FilterAction.BLOCK:
                    max_action = FilterAction.FLAG

        return {
            "action": max_action,
            "max_severity": max_severity,
            "matches": matches,
            "categories_triggered": categories,
        }
```

---

## Layer 3: ML-Based Content Classifiers

### Toxicity Detection

```python
from typing import Any, Dict, List, Optional
from dataclasses import dataclass


@dataclass
class ToxicityScore:
    """Detailed toxicity scores across categories."""
    overall: float
    severe_toxicity: float
    identity_attack: float
    insult: float
    profanity: float
    threat: float
    sexually_explicit: float
    obscene: float


class ToxicityDetector:
    """
    ML-based toxicity detection using Detoxify or Perspective API.

    Supports multiple backends:
    - Detoxify (local, open-source, based on RoBERTa)
    - Google Perspective API (cloud, production-grade)
    - Custom fine-tuned models

    The detector produces per-category toxicity scores, enabling
    fine-grained filtering policies.
    """

    def __init__(
        self,
        backend: str = "detoxify",
        model_name: str = "unbiased",
        device: str = "cpu",
        batch_size: int = 32,
        perspective_api_key: Optional[str] = None,
    ):
        self.backend = backend
        self.batch_size = batch_size

        if backend == "detoxify":
            from detoxify import Detoxify
            self.model = Detoxify(model_name, device=device)
        elif backend == "perspective":
            if not perspective_api_key:
                raise ValueError("Perspective API key required")
            self._perspective_key = perspective_api_key
        elif backend == "transformers":
            from transformers import pipeline
            self.model = pipeline(
                "text-classification",
                model=model_name,
                device=device,
                top_k=None,
            )

    def analyze(self, text: str) -> ToxicityScore:
        """Analyze a single text for toxicity."""
        if self.backend == "detoxify":
            return self._analyze_detoxify(text)
        elif self.backend == "perspective":
            return self._analyze_perspective(text)
        elif self.backend == "transformers":
            return self._analyze_transformers(text)

    def analyze_batch(self, texts: List[str]) -> List[ToxicityScore]:
        """Analyze multiple texts in batch."""
        if self.backend == "detoxify":
            results = self.model.predict(texts)
            return [
                ToxicityScore(
                    overall=results["toxicity"][i],
                    severe_toxicity=results["severe_toxicity"][i],
                    identity_attack=results["identity_attack"][i],
                    insult=results["insult"][i],
                    profanity=results.get("profanity", [0.0] * len(texts))[i],
                    threat=results["threat"][i],
                    sexually_explicit=results["sexual_explicit"][i],
                    obscene=results["obscene"][i],
                )
                for i in range(len(texts))
            ]
        return [self.analyze(t) for t in texts]

    def _analyze_detoxify(self, text: str) -> ToxicityScore:
        """Analyze using Detoxify (local model)."""
        results = self.model.predict(text)
        return ToxicityScore(
            overall=results["toxicity"],
            severe_toxicity=results["severe_toxicity"],
            identity_attack=results["identity_attack"],
            insult=results["insult"],
            profanity=results.get("profanity", 0.0),
            threat=results["threat"],
            sexually_explicit=results["sexual_explicit"],
            obscene=results["obscene"],
        )

    def _analyze_perspective(self, text: str) -> ToxicityScore:
        """Analyze using Google Perspective API."""
        import httpx

        response = httpx.post(
            f"https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze"
            f"?key={self._perspective_key}",
            json={
                "comment": {"text": text},
                "requestedAttributes": {
                    "TOXICITY": {},
                    "SEVERE_TOXICITY": {},
                    "IDENTITY_ATTACK": {},
                    "INSULT": {},
                    "PROFANITY": {},
                    "THREAT": {},
                    "SEXUALLY_EXPLICIT": {},
                },
                "languages": ["en"],
            },
        )
        data = response.json()
        scores = data["attributeScores"]

        def get_score(attr: str) -> float:
            return scores.get(attr, {}).get("summaryScore", {}).get("value", 0.0)

        return ToxicityScore(
            overall=get_score("TOXICITY"),
            severe_toxicity=get_score("SEVERE_TOXICITY"),
            identity_attack=get_score("IDENTITY_ATTACK"),
            insult=get_score("INSULT"),
            profanity=get_score("PROFANITY"),
            threat=get_score("THREAT"),
            sexually_explicit=get_score("SEXUALLY_EXPLICIT"),
            obscene=0.0,
        )

    def _analyze_transformers(self, text: str) -> ToxicityScore:
        """Analyze using a HuggingFace transformers model."""
        results = self.model(text)
        score_map = {r["label"].lower(): r["score"] for r in results[0]}
        return ToxicityScore(
            overall=score_map.get("toxic", score_map.get("toxicity", 0.0)),
            severe_toxicity=score_map.get("severe_toxic", score_map.get("severe_toxicity", 0.0)),
            identity_attack=score_map.get("identity_hate", score_map.get("identity_attack", 0.0)),
            insult=score_map.get("insult", 0.0),
            profanity=score_map.get("profanity", score_map.get("obscene", 0.0)),
            threat=score_map.get("threat", 0.0),
            sexually_explicit=score_map.get("sexual_explicit", score_map.get("sexually_explicit", 0.0)),
            obscene=score_map.get("obscene", 0.0),
        )
```

### Hate Speech Classifier

```python
class HateSpeechClassifier:
    """
    Specialized hate speech classifier with fine-grained categories.

    Uses facebook/roberta-hate-speech-dynabench-r4-target or
    a custom fine-tuned model for detecting hate speech targeting
    specific protected groups.
    """

    CATEGORIES = [
        "race_ethnicity",
        "religion",
        "gender",
        "sexual_orientation",
        "disability",
        "nationality",
        "age",
    ]

    def __init__(
        self,
        model_name: str = "facebook/roberta-hate-speech-dynabench-r4-target",
        device: str = "cpu",
        threshold: float = 0.7,
    ):
        from transformers import pipeline
        self.classifier = pipeline(
            "text-classification",
            model=model_name,
            device=device,
            top_k=None,
        )
        self.threshold = threshold

    def classify(self, text: str) -> Dict[str, Any]:
        """
        Classify text for hate speech.

        Returns:
            {
                "is_hate_speech": bool,
                "confidence": float,
                "label": str,
                "scores": {"hate": float, "nothate": float},
            }
        """
        results = self.classifier(text)
        scores = {r["label"].lower(): r["score"] for r in results[0]}
        hate_score = scores.get("hate", 0.0)

        return {
            "is_hate_speech": hate_score >= self.threshold,
            "confidence": max(scores.values()),
            "label": "HATE" if hate_score >= self.threshold else "NOT_HATE",
            "scores": scores,
        }

    def classify_with_target(self, text: str) -> Dict[str, Any]:
        """
        Classify hate speech and identify the targeted group.

        Uses a secondary model or heuristics to determine which
        protected category is being targeted.
        """
        base_result = self.classify(text)
        if not base_result["is_hate_speech"]:
            return {**base_result, "target_category": None}

        # Target identification via keyword matching
        target = self._identify_target(text)
        return {**base_result, "target_category": target}

    def _identify_target(self, text: str) -> Optional[str]:
        """Identify the target group of hate speech."""
        import re
        target_indicators = {
            "race_ethnicity": [
                r"\b(race|racial|ethnic|black|white|asian|hispanic|latino)\b",
            ],
            "religion": [
                r"\b(muslim|christian|jewish|hindu|buddhist|atheist|religion)\b",
            ],
            "gender": [
                r"\b(women?|men?|female|male|transgender|gender)\b",
            ],
            "sexual_orientation": [
                r"\b(gay|lesbian|bisexual|homosexual|lgbtq)\b",
            ],
            "disability": [
                r"\b(disabled|handicapped|disability|mental\s+health)\b",
            ],
        }
        text_lower = text.lower()
        for category, patterns in target_indicators.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    return category
        return "unidentified"
```

### NSFW Content Detector

```python
class NSFWDetector:
    """
    NSFW content detection for both text and image inputs.

    Text detection uses a fine-tuned classifier model.
    Image detection uses a CNN-based NSFW classifier.
    """

    def __init__(
        self,
        text_model: str = "michellejieli/NSFW_text_classifier",
        image_model: str = "Falconsai/nsfw_image_detection",
        text_threshold: float = 0.75,
        image_threshold: float = 0.80,
        device: str = "cpu",
    ):
        self.text_threshold = text_threshold
        self.image_threshold = image_threshold
        self.device = device

        from transformers import pipeline
        self.text_classifier = pipeline(
            "text-classification",
            model=text_model,
            device=device,
            top_k=None,
        )

    def check_text(self, text: str) -> Dict[str, Any]:
        """
        Check text content for NSFW material.

        Returns:
            {
                "is_nsfw": bool,
                "nsfw_score": float,
                "category": str,
            }
        """
        results = self.text_classifier(text)
        scores = {r["label"].lower(): r["score"] for r in results[0]}
        nsfw_score = scores.get("nsfw", scores.get("unsafe", 0.0))

        return {
            "is_nsfw": nsfw_score >= self.text_threshold,
            "nsfw_score": round(nsfw_score, 4),
            "category": "nsfw_text" if nsfw_score >= self.text_threshold else "safe",
        }

    def check_image(self, image_path: str) -> Dict[str, Any]:
        """
        Check an image for NSFW content.

        Uses a CNN-based classifier to detect explicit content.
        """
        from transformers import pipeline
        from PIL import Image

        classifier = pipeline(
            "image-classification",
            model="Falconsai/nsfw_image_detection",
            device=self.device,
        )

        image = Image.open(image_path)
        results = classifier(image)
        scores = {r["label"].lower(): r["score"] for r in results}
        nsfw_score = scores.get("nsfw", 0.0)

        return {
            "is_nsfw": nsfw_score >= self.image_threshold,
            "nsfw_score": round(nsfw_score, 4),
            "category": "nsfw_image" if nsfw_score >= self.image_threshold else "safe",
        }
```

---

## Layer 4: LLM-Based Contextual Judge

```python
class LLMContentJudge:
    """
    Layer 4: LLM-based contextual content review.

    Uses a secondary LLM to evaluate content that passed through
    or was flagged by earlier layers. This provides nuanced,
    context-aware judgments that ML classifiers may miss.

    Only invoked for content flagged by Layer 3 to minimize cost.
    """

    JUDGE_SYSTEM_PROMPT = """You are a content safety reviewer. Your task is to evaluate whether the following content violates safety policies.

Safety Policy Categories:
1. VIOLENCE: Graphic violence, instructions for harm, threats
2. HATE_SPEECH: Content targeting protected groups
3. SEXUAL: Sexually explicit content, sexual solicitation
4. SELF_HARM: Encouragement or instructions for self-harm
5. ILLEGAL: Instructions for illegal activities
6. PII_EXPOSURE: Unnecessary exposure of personal information
7. MISINFORMATION: Demonstrably false claims presented as fact

For each piece of content, respond with a JSON object:
{
  "verdict": "safe" | "unsafe",
  "confidence": 0.0-1.0,
  "violated_categories": ["CATEGORY1", ...],
  "reasoning": "Brief explanation",
  "severity": "low" | "medium" | "high" | "critical"
}

Be precise. Do not over-flag legitimate content. Consider context."""

    def __init__(
        self,
        model: str = "gpt-4",
        api_key: Optional[str] = None,
        temperature: float = 0.0,
        timeout_s: float = 10.0,
    ):
        self.model = model
        self.temperature = temperature
        self.timeout_s = timeout_s

        import openai
        self.client = openai.AsyncOpenAI(api_key=api_key)

    async def judge(
        self, content: str, context: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Judge content using LLM-based contextual review.

        Args:
            content: The content to evaluate.
            context: Optional surrounding context for better judgment.

        Returns:
            Structured judgment with verdict, confidence, and reasoning.
        """
        user_message = f"Content to evaluate:\n---\n{content}\n---"
        if context:
            user_message += f"\n\nSurrounding context:\n---\n{context}\n---"

        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.JUDGE_SYSTEM_PROMPT},
                    {"role": "user", "content": user_message},
                ],
                temperature=self.temperature,
                max_tokens=256,
                response_format={"type": "json_object"},
            )

            import json
            result = json.loads(response.choices[0].message.content)

            return {
                "verdict": result.get("verdict", "unsafe"),
                "confidence": result.get("confidence", 0.5),
                "violated_categories": result.get("violated_categories", []),
                "reasoning": result.get("reasoning", ""),
                "severity": result.get("severity", "medium"),
                "model": self.model,
                "tokens_used": response.usage.total_tokens,
            }
        except Exception as e:
            # Fail closed: if the judge errors, treat as unsafe
            return {
                "verdict": "unsafe",
                "confidence": 0.0,
                "violated_categories": ["REVIEW_FAILED"],
                "reasoning": f"LLM judge evaluation failed: {str(e)}",
                "severity": "high",
                "model": self.model,
                "tokens_used": 0,
            }
```

---

## Configurable Filter Chain

```python
import asyncio
import time
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Optional


@dataclass
class FilterLayerConfig:
    """Configuration for a single filter layer."""
    name: str
    enabled: bool = True
    categories: List[str] = field(default_factory=list)
    thresholds: Dict[str, float] = field(default_factory=dict)
    action_on_match: FilterAction = FilterAction.BLOCK
    timeout_ms: int = 5000
    skip_if_previous_blocked: bool = True


@dataclass
class FilterChainConfig:
    """Configuration for the entire filter chain."""
    layers: List[FilterLayerConfig] = field(default_factory=list)
    default_action: FilterAction = FilterAction.PASS
    fail_closed: bool = True
    max_total_latency_ms: int = 10000
    parallel_execution: bool = False


@dataclass
class FilterChainResult:
    """Result from the complete filter chain."""
    final_action: FilterAction
    layer_results: Dict[str, Dict[str, Any]]
    total_latency_ms: float
    blocked_by: Optional[str] = None
    flagged_by: List[str] = field(default_factory=list)
    categories_triggered: set = field(default_factory=set)


class ContentFilterChain:
    """
    Configurable multi-layer content filter chain.

    Chains multiple filter layers in sequence (or parallel),
    with configurable thresholds, categories, and actions per layer.
    Supports hot-reloading configuration without restart.
    """

    def __init__(self, config: FilterChainConfig):
        self.config = config
        self._layers: Dict[str, Any] = {}
        self._setup_default_layers()

    def _setup_default_layers(self):
        """Initialize default filter layer instances."""
        self._layers["keyword"] = KeywordFilterLayer()
        self._layers["regex"] = RegexFilterLayer()
        self._layers["toxicity"] = ToxicityDetector()
        self._layers["hate_speech"] = HateSpeechClassifier()
        self._layers["nsfw"] = NSFWDetector()

    async def filter(self, text: str, metadata: Optional[Dict] = None) -> FilterChainResult:
        """
        Run the complete filter chain on the input text.

        Executes layers in order, short-circuiting on BLOCK actions
        unless configured otherwise.
        """
        start = time.monotonic()
        layer_results: Dict[str, Dict[str, Any]] = {}
        flagged_by: List[str] = []
        blocked_by = None
        all_categories = set()

        for layer_config in self.config.layers:
            if not layer_config.enabled:
                continue

            if blocked_by and layer_config.skip_if_previous_blocked:
                continue

            elapsed = (time.monotonic() - start) * 1000
            if elapsed > self.config.max_total_latency_ms:
                break  # Budget exhausted

            try:
                result = await self._execute_layer(layer_config, text)
                layer_results[layer_config.name] = result

                action = FilterAction(result.get("action", "pass"))
                if action == FilterAction.BLOCK:
                    blocked_by = layer_config.name
                elif action == FilterAction.FLAG:
                    flagged_by.append(layer_config.name)

                categories = result.get("categories_triggered", set())
                all_categories.update(categories)

            except asyncio.TimeoutError:
                if self.config.fail_closed:
                    blocked_by = f"{layer_config.name}(timeout)"
                    layer_results[layer_config.name] = {
                        "action": "block", "error": "timeout"
                    }
            except Exception as e:
                if self.config.fail_closed:
                    blocked_by = f"{layer_config.name}(error)"
                layer_results[layer_config.name] = {
                    "action": "block" if self.config.fail_closed else "pass",
                    "error": str(e),
                }

        total_latency = (time.monotonic() - start) * 1000

        if blocked_by:
            final_action = FilterAction.BLOCK
        elif flagged_by:
            final_action = FilterAction.FLAG
        else:
            final_action = self.config.default_action

        return FilterChainResult(
            final_action=final_action,
            layer_results=layer_results,
            total_latency_ms=round(total_latency, 2),
            blocked_by=blocked_by,
            flagged_by=flagged_by,
            categories_triggered=all_categories,
        )

    async def _execute_layer(
        self, config: FilterLayerConfig, text: str
    ) -> Dict[str, Any]:
        """Execute a single filter layer with timeout."""
        layer = self._layers.get(config.name)
        if not layer:
            return {"action": "pass", "error": f"Unknown layer: {config.name}"}

        timeout = config.timeout_ms / 1000.0

        if hasattr(layer, "filter"):
            if asyncio.iscoroutinefunction(layer.filter):
                result = await asyncio.wait_for(
                    layer.filter(text), timeout=timeout
                )
            else:
                result = await asyncio.wait_for(
                    asyncio.get_event_loop().run_in_executor(
                        None, layer.filter, text
                    ),
                    timeout=timeout,
                )
            if isinstance(result, dict):
                return result
            return {"action": result.action.value if hasattr(result, "action") else "pass"}

        return {"action": "pass"}

    def reload_config(self, new_config: FilterChainConfig) -> None:
        """Hot-reload filter chain configuration."""
        self.config = new_config
```

---

## Domain-Specific Filters

```python
class DomainFilterRegistry:
    """
    Registry for domain-specific content filters.

    Different agent deployments may have unique filtering needs
    based on their domain (medical, financial, legal, etc.).
    """

    def __init__(self):
        self._filters: Dict[str, Callable] = {}

    def register(self, domain: str, filter_fn: Callable) -> None:
        """Register a domain-specific filter."""
        self._filters[domain] = filter_fn

    def get_filter(self, domain: str) -> Optional[Callable]:
        """Get the filter for a domain."""
        return self._filters.get(domain)


# Example domain-specific filters
def medical_filter(text: str) -> Dict[str, Any]:
    """Filter for medical domain agents."""
    import re
    violations = []

    # Check for medical advice without disclaimers
    medical_advice_patterns = [
        r"\b(you\s+should\s+take|prescribe|diagnosis\s+is|treatment\s+for)\b",
        r"\b(stop\s+taking|increase\s+dosage|medication\s+for)\b",
    ]
    for pattern in medical_advice_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            violations.append({
                "type": "medical_advice_without_disclaimer",
                "severity": "high",
                "pattern": pattern,
            })

    # Check for drug interaction warnings
    drug_patterns = [
        r"\b(safe\s+to\s+mix|combine\s+with|take\s+together)\b",
    ]
    for pattern in drug_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            violations.append({
                "type": "drug_interaction_claim",
                "severity": "critical",
                "pattern": pattern,
            })

    return {
        "action": "block" if any(v["severity"] == "critical" for v in violations)
                 else "flag" if violations else "pass",
        "violations": violations,
        "domain": "medical",
    }


def financial_filter(text: str) -> Dict[str, Any]:
    """Filter for financial domain agents."""
    import re
    violations = []

    # Investment advice detection
    investment_patterns = [
        r"\b(guaranteed\s+return|sure\s+thing|can't\s+lose|invest\s+in)\b",
        r"\b(buy\s+now|sell\s+immediately|stock\s+tip|insider)\b",
    ]
    for pattern in investment_patterns:
        if re.search(pattern, text, re.IGNORECASE):
            violations.append({
                "type": "investment_advice",
                "severity": "high",
                "pattern": pattern,
            })

    return {
        "action": "flag" if violations else "pass",
        "violations": violations,
        "domain": "financial",
    }
```

---

## Filter Bypass Prevention

```python
class BypassPreventionLayer:
    """
    Anti-bypass mechanisms to prevent filter evasion attacks.

    Common bypass techniques include:
    - Unicode homoglyphs to evade keyword matching
    - Leetspeak substitution
    - Whitespace/zero-width character insertion
    - Encoding obfuscation (base64, ROT13, hex)
    - Word splitting with special characters
    - Prompt framing ("hypothetically", "in a story")
    """

    # Leetspeak mappings
    LEET_MAP = {
        "0": "o", "1": "i", "3": "e", "4": "a", "5": "s",
        "7": "t", "@": "a", "$": "s", "!": "i", "+": "t",
        "|": "l", "(": "c", ")": "d", "{": "c", "}": "d",
    }

    # Unicode homoglyph mappings (Cyrillic, fullwidth, etc.)
    HOMOGLYPH_MAP = {
        "\u0410": "A", "\u0412": "B", "\u0421": "C", "\u0415": "E",
        "\u041d": "H", "\u041a": "K", "\u041c": "M", "\u041e": "O",
        "\u0420": "P", "\u0422": "T", "\u0425": "X", "\u0430": "a",
        "\u0435": "e", "\u043e": "o", "\u0440": "p", "\u0441": "c",
        "\u0443": "y", "\u0445": "x",
        # Fullwidth Latin
        "\uff21": "A", "\uff22": "B", "\uff23": "C", "\uff24": "D",
        "\uff25": "E", "\uff26": "F", "\uff27": "G", "\uff28": "H",
        "\uff29": "I", "\uff2a": "J", "\uff2b": "K", "\uff2c": "L",
    }

    ZERO_WIDTH_CHARS = [
        "\u200b", "\u200c", "\u200d", "\u2060", "\ufeff", "\u00ad",
    ]

    # Framing phrases that may indicate bypass attempts
    FRAMING_PATTERNS = [
        r"\b(hypothetically|in\s+a\s+fictional\s+scenario|for\s+a\s+story)\b",
        r"\b(roleplay|pretend|imagine|let's\s+say)\b",
        r"\b(academic\s+purposes|research\s+only|educational)\b",
        r"\b(devil's\s+advocate|thought\s+experiment)\b",
    ]

    def __init__(self):
        import re
        self._zero_width_pattern = re.compile(
            "[" + "".join(re.escape(c) for c in self.ZERO_WIDTH_CHARS) + "]"
        )
        self._framing_patterns = [
            re.compile(p, re.IGNORECASE) for p in self.FRAMING_PATTERNS
        ]

    def normalize(self, text: str) -> str:
        """
        Apply all normalization passes to defeat bypass techniques.

        Should be called before any filter layer evaluation.
        """
        text = self._strip_zero_width(text)
        text = self._normalize_homoglyphs(text)
        text = self._normalize_leetspeak(text)
        text = self._normalize_unicode(text)
        text = self._normalize_whitespace(text)
        return text

    def detect_bypass_attempt(self, original: str, normalized: str) -> Dict[str, Any]:
        """
        Detect if the input appears to be a bypass attempt.

        Compares the original and normalized text to identify
        obfuscation techniques.
        """
        import difflib

        techniques_detected = []

        # Check for significant normalization changes
        similarity = difflib.SequenceMatcher(
            None, original.lower(), normalized.lower()
        ).ratio()

        if similarity < 0.90:
            techniques_detected.append("heavy_obfuscation")

        # Check for zero-width characters
        zwc_count = len(self._zero_width_pattern.findall(original))
        if zwc_count > 0:
            techniques_detected.append(f"zero_width_chars({zwc_count})")

        # Check for framing phrases
        for pattern in self._framing_patterns:
            if pattern.search(original):
                techniques_detected.append("framing_language")
                break

        # Check for character substitution density
        sub_count = sum(1 for o, n in zip(original, normalized) if o != n)
        if len(original) > 0 and sub_count / len(original) > 0.15:
            techniques_detected.append("high_substitution_density")

        return {
            "is_bypass_attempt": len(techniques_detected) > 0,
            "techniques": techniques_detected,
            "similarity_ratio": round(similarity, 4),
            "zero_width_count": zwc_count,
        }

    def _strip_zero_width(self, text: str) -> str:
        return self._zero_width_pattern.sub("", text)

    def _normalize_homoglyphs(self, text: str) -> str:
        return "".join(self.HOMOGLYPH_MAP.get(c, c) for c in text)

    def _normalize_leetspeak(self, text: str) -> str:
        return "".join(self.LEET_MAP.get(c, c) for c in text)

    def _normalize_unicode(self, text: str) -> str:
        import unicodedata
        return unicodedata.normalize("NFKC", text)

    def _normalize_whitespace(self, text: str) -> str:
        import re
        return re.sub(r"\s+", " ", text).strip()
```

---

## Filter Configuration Schema

```yaml
# filter_config.yaml
filter_chain:
  fail_closed: true
  max_total_latency_ms: 10000
  parallel_execution: false
  default_action: pass

  layers:
    - name: keyword
      enabled: true
      timeout_ms: 100
      categories:
        - profanity
        - self_harm
        - pii_solicitation
      action_on_match: block

    - name: regex
      enabled: true
      timeout_ms: 100
      categories:
        - pii
        - injection
      action_on_match: block

    - name: toxicity
      enabled: true
      timeout_ms: 5000
      thresholds:
        overall: 0.8
        severe_toxicity: 0.5
        identity_attack: 0.6
        threat: 0.5
        sexually_explicit: 0.7
      action_on_match: block

    - name: hate_speech
      enabled: true
      timeout_ms: 5000
      thresholds:
        hate_score: 0.7
      action_on_match: block

    - name: nsfw
      enabled: true
      timeout_ms: 5000
      thresholds:
        nsfw_score: 0.75
      action_on_match: block

    - name: llm_judge
      enabled: true
      timeout_ms: 10000
      skip_if_previous_blocked: true
      action_on_match: block

bypass_prevention:
  enabled: true
  normalize_before_all_layers: true
  flag_bypass_attempts: true
  block_heavy_obfuscation: true
  obfuscation_threshold: 0.15

domain_filters:
  - domain: medical
    enabled: true
    action: flag
  - domain: financial
    enabled: true
    action: flag
```

---

## Troubleshooting

| Symptom | Cause | Solution |
|---|---|---|
| High false positive rate | Thresholds too aggressive | Tune per-category thresholds using validation set |
| Bypass via leetspeak | Normalization not applied before keyword layer | Enable bypass prevention layer first |
| High latency | LLM judge invoked too often | Only invoke L4 for L3-flagged content |
| Missing PII detection | Regex patterns incomplete | Add locale-specific PII patterns |
| ML model OOM | Batch size too large | Reduce batch_size or use CPU fallback |
| Filter chain timeout | Total budget too low | Increase max_total_latency_ms or reduce layers |

---

## Related References

- `input-guardrail-patterns.md` — Input-level guardrail detection pipeline
- `output-guardrail-patterns.md` — Output validation and filtering
- `policy-enforcement-engines.md` — Policy-based content decisions
- `guardrail-testing-validation.md` — Testing filter effectiveness
- `guardrail-monitoring-alerting.md` — Monitoring filter performance
