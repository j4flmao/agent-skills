# Intent Classification for AI Agents

## Theoretical Foundation

Intent classification is the process of mapping a user's natural language request to a structured action category before any agent execution begins. In a feedforward control system, intent classification is the first analytical gate — misclassified intent propagates errors through every downstream planning phase, making it the single most impactful failure point in the pipeline.

The intent classification function maps from the space of user utterances $U$ to a discrete set of intent classes $I$:

$$f_{intent}: U \rightarrow \{(c_i, \sigma_i) \mid c_i \in I, \sigma_i \in [0, 1]\}$$

Where $c_i$ is the classified intent and $\sigma_i$ is the confidence score. For multi-intent requests, the function returns a ranked list of $(c_i, \sigma_i)$ pairs.

The classification confidence threshold $\theta_{conf}$ determines whether the agent proceeds or requests clarification:

$$\text{action} = \begin{cases} \text{proceed} & \text{if } \sigma_{top} \geq \theta_{conf} \\ \text{clarify} & \text{if } \sigma_{top} < \theta_{conf} \end{cases}$$

Where $\theta_{conf} = 0.75$ is the recommended default threshold for production systems.

```
+--------------------------------------------------------------------------+
|                    INTENT CLASSIFICATION PIPELINE                         |
|                                                                          |
|   [Raw User Message]                                                     |
|        │                                                                 |
|        ├──► [Tokenization & Normalization]                               |
|        │                                                                 |
|        ├──► [Feature Extraction]                                         |
|        │        ├── Keyword signals                                      |
|        │        ├── Syntactic patterns                                   |
|        │        └── Contextual embeddings                                |
|        │                                                                 |
|        ├──► [Multi-Label Classifier]                                     |
|        │        ├── Primary intent scoring                               |
|        │        └── Sub-intent detection                                 |
|        │                                                                 |
|        ├──► [Confidence Calibration]                                     |
|        │        ├── Temperature scaling                                  |
|        │        └── Platt scaling                                        |
|        │                                                                 |
|        ├──► [Disambiguation Engine]                                      |
|        │        ├── Context-based resolution                             |
|        │        └── Clarification request generation                     |
|        │                                                                 |
|        └──► [Intent Routing]                                             |
|                 ├── Skill selection                                       |
|                 └── Execution strategy mapping                           |
+--------------------------------------------------------------------------+
```

---

## Intent Taxonomy

The canonical intent taxonomy for AI agent systems is organized into five primary categories, each with sub-intent refinements that guide downstream planning.

### Primary Intent Classes

| Intent Class | Code | Description | Typical Verbs | Risk Level |
| :--- | :--- | :--- | :--- | :--- |
| **Code Generation** | `code_generation` | Creating new code, files, or components from scratch | create, generate, build, make, write, scaffold | Medium |
| **Debugging** | `debugging` | Diagnosing and fixing errors, exceptions, or unexpected behavior | fix, debug, resolve, troubleshoot, diagnose, patch | High |
| **Refactoring** | `refactoring` | Restructuring existing code without changing external behavior | refactor, restructure, reorganize, clean up, optimize, simplify | Medium |
| **Explanation** | `explanation` | Understanding, explaining, or documenting existing code or concepts | explain, describe, document, what does, how does, why | Low |
| **Deployment** | `deployment` | Building, packaging, shipping, or deploying code to environments | deploy, release, publish, ship, push, build, package | Critical |

### Sub-Intent Refinement Matrix

| Primary Intent | Sub-Intents | Detection Signals |
| :--- | :--- | :--- |
| `code_generation` | `new_file`, `new_function`, `new_class`, `new_test`, `new_config` | "create a new", "add a", "write a", file path mentions |
| `debugging` | `error_diagnosis`, `fix_bug`, `trace_issue`, `performance_debug` | error messages, stack traces, "not working", "fails when" |
| `refactoring` | `rename`, `extract_method`, `move_file`, `simplify`, `type_safety` | "rename", "extract", "move", "simplify", "add types" |
| `explanation` | `code_walkthrough`, `concept_explain`, `diff_explain`, `doc_generate` | "explain", "what does", "how does", "document" |
| `deployment` | `ci_cd_setup`, `docker_build`, `cloud_deploy`, `env_config` | "deploy to", "set up CI", "docker", "environment" |

### Extended Intent Hierarchy

```
Intent Taxonomy
├── code_generation
│   ├── new_file
│   │   ├── from_template
│   │   └── from_scratch
│   ├── new_function
│   │   ├── utility_function
│   │   └── api_handler
│   ├── new_class
│   │   ├── data_model
│   │   └── service_class
│   ├── new_test
│   │   ├── unit_test
│   │   └── integration_test
│   └── new_config
│       ├── build_config
│       └── runtime_config
│
├── debugging
│   ├── error_diagnosis
│   │   ├── syntax_error
│   │   ├── runtime_error
│   │   └── logic_error
│   ├── fix_bug
│   │   ├── hotfix
│   │   └── structural_fix
│   ├── trace_issue
│   │   ├── stack_trace_analysis
│   │   └── log_analysis
│   └── performance_debug
│       ├── memory_leak
│       └── slow_query
│
├── refactoring
│   ├── rename
│   ├── extract_method
│   ├── move_file
│   ├── simplify
│   └── type_safety
│
├── explanation
│   ├── code_walkthrough
│   ├── concept_explain
│   ├── diff_explain
│   └── doc_generate
│
└── deployment
    ├── ci_cd_setup
    ├── docker_build
    ├── cloud_deploy
    └── env_config
```

---

## Confidence Scoring

### Scoring Formula

The composite confidence score for an intent classification combines multiple signal sources:

$$\sigma(c_i) = \alpha \cdot S_{keyword}(c_i) + \beta \cdot S_{syntax}(c_i) + \gamma \cdot S_{context}(c_i)$$

Where:
- $S_{keyword}$ = Keyword match score (proportion of intent keywords found)
- $S_{syntax}$ = Syntactic pattern match score (sentence structure alignment)
- $S_{context}$ = Contextual score (conversation history, project type)
- $\alpha + \beta + \gamma = 1$ (weight normalization)

Recommended default weights: $\alpha = 0.4$, $\beta = 0.3$, $\gamma = 0.3$.

### Confidence Calibration

Raw classifier scores are typically overconfident. Apply temperature scaling to calibrate:

$$\sigma_{calibrated}(c_i) = \frac{e^{z_i / T}}{\sum_{j} e^{z_j / T}}$$

Where $z_i$ is the raw logit for class $i$ and $T$ is the temperature parameter learned on a calibration set. For keyword-based classifiers, $T \approx 1.5$ is a reasonable starting point.

### Confidence Decision Thresholds

| Confidence Range | Action | Rationale |
| :--- | :--- | :--- |
| $\sigma \geq 0.90$ | Proceed with high certainty | Strong signal alignment across all features |
| $0.75 \leq \sigma < 0.90$ | Proceed with standard validation | Sufficient confidence but additional pre-flight checks |
| $0.50 \leq \sigma < 0.75$ | Request clarification | Ambiguous intent, risk of misclassification |
| $\sigma < 0.50$ | Reject or ask for rephrasing | Insufficient signal, classification unreliable |

---

## Python Implementation: Intent Classification Engine

```python
import re
import math
import json
from typing import Dict, List, Optional, Tuple, Set, Any
from dataclasses import dataclass, field
from enum import Enum


class IntentClass(Enum):
    CODE_GENERATION = "code_generation"
    DEBUGGING = "debugging"
    REFACTORING = "refactoring"
    EXPLANATION = "explanation"
    DEPLOYMENT = "deployment"
    UNKNOWN = "unknown"


@dataclass
class SubIntent:
    """A refined sub-intent within a primary intent category."""
    name: str
    parent: IntentClass
    confidence: float
    signals: List[str] = field(default_factory=list)


@dataclass
class IntentResult:
    """Complete result of intent classification."""
    primary_intent: IntentClass
    primary_confidence: float
    sub_intents: List[SubIntent] = field(default_factory=list)
    all_scores: Dict[str, float] = field(default_factory=dict)
    requires_clarification: bool = False
    clarification_prompt: Optional[str] = None
    raw_features: Dict[str, Any] = field(default_factory=dict)

    @property
    def is_multi_intent(self) -> bool:
        """Check if multiple significant intents were detected."""
        significant = [s for s in self.all_scores.values() if s >= 0.3]
        return len(significant) > 1

    def to_dict(self) -> Dict[str, Any]:
        return {
            "primary_class": self.primary_intent.value,
            "confidence": round(self.primary_confidence, 4),
            "sub_intents": [
                {"name": si.name, "parent": si.parent.value, "confidence": round(si.confidence, 4)}
                for si in self.sub_intents
            ],
            "all_scores": {k: round(v, 4) for k, v in self.all_scores.items()},
            "requires_clarification": self.requires_clarification,
            "clarification_prompt": self.clarification_prompt,
        }


class IntentClassifier:
    """
    Multi-stage intent classifier for AI agent systems.
    Combines keyword matching, syntactic pattern analysis, and contextual signals
    to produce calibrated confidence scores.
    """

    # Confidence threshold below which clarification is requested
    CONFIDENCE_THRESHOLD = 0.75

    # Weights for composite scoring: keyword, syntax, context
    WEIGHTS = {"keyword": 0.4, "syntax": 0.3, "context": 0.3}

    # Temperature for confidence calibration
    CALIBRATION_TEMPERATURE = 1.5

    # Primary intent keyword dictionaries
    INTENT_KEYWORDS: Dict[IntentClass, List[str]] = {
        IntentClass.CODE_GENERATION: [
            "create", "generate", "build", "make", "write", "scaffold",
            "new file", "new function", "new class", "add a", "implement",
            "set up", "initialize", "bootstrap", "stub", "template",
        ],
        IntentClass.DEBUGGING: [
            "fix", "debug", "resolve", "troubleshoot", "diagnose", "patch",
            "error", "bug", "exception", "crash", "fails", "broken",
            "not working", "stack trace", "traceback", "issue",
        ],
        IntentClass.REFACTORING: [
            "refactor", "restructure", "reorganize", "clean up", "optimize",
            "simplify", "rename", "extract", "move", "split", "merge",
            "consolidate", "decouple", "modularize", "decompose",
        ],
        IntentClass.EXPLANATION: [
            "explain", "describe", "document", "what does", "how does",
            "why does", "what is", "walk through", "summarize",
            "understand", "clarify", "overview", "breakdown",
        ],
        IntentClass.DEPLOYMENT: [
            "deploy", "release", "publish", "ship", "push", "build",
            "package", "docker", "container", "ci/cd", "pipeline",
            "staging", "production", "kubernetes", "helm",
        ],
    }

    # Sub-intent patterns (regex-based)
    SUB_INTENT_PATTERNS: Dict[str, Tuple[IntentClass, str]] = {
        r"new\s+file|create\s+file|add\s+file": (IntentClass.CODE_GENERATION, "new_file"),
        r"new\s+function|add\s+function|create\s+function": (IntentClass.CODE_GENERATION, "new_function"),
        r"new\s+class|create\s+class|add\s+class": (IntentClass.CODE_GENERATION, "new_class"),
        r"new\s+test|add\s+test|write\s+test": (IntentClass.CODE_GENERATION, "new_test"),
        r"error|exception|traceback|stack\s*trace": (IntentClass.DEBUGGING, "error_diagnosis"),
        r"fix\s+(the\s+)?bug|patch|hotfix": (IntentClass.DEBUGGING, "fix_bug"),
        r"slow|performance|memory\s+leak|optimize\s+speed": (IntentClass.DEBUGGING, "performance_debug"),
        r"rename|renaming": (IntentClass.REFACTORING, "rename"),
        r"extract\s+(method|function|class)": (IntentClass.REFACTORING, "extract_method"),
        r"move\s+(file|module|class)": (IntentClass.REFACTORING, "move_file"),
        r"explain|walk\s*through|what\s+does": (IntentClass.EXPLANATION, "code_walkthrough"),
        r"document|add\s+docs|docstring": (IntentClass.EXPLANATION, "doc_generate"),
        r"deploy\s+to|push\s+to\s+prod": (IntentClass.DEPLOYMENT, "cloud_deploy"),
        r"docker|container|dockerfile": (IntentClass.DEPLOYMENT, "docker_build"),
        r"ci[/ ]?cd|pipeline|github\s+action": (IntentClass.DEPLOYMENT, "ci_cd_setup"),
    }

    # Syntactic patterns that indicate intent structure
    SYNTAX_PATTERNS: Dict[IntentClass, List[str]] = {
        IntentClass.CODE_GENERATION: [
            r"^(create|make|build|write|generate)\s+",
            r"(add|implement)\s+(a\s+)?(new\s+)?",
            r"I\s+need\s+(a\s+)?(new\s+)?",
        ],
        IntentClass.DEBUGGING: [
            r"(is|are)\s+(not\s+)?working",
            r"(getting|seeing|having)\s+(an?\s+)?error",
            r"^(fix|debug|resolve)\s+",
            r"(throws?|raises?)\s+(an?\s+)?",
        ],
        IntentClass.REFACTORING: [
            r"^(refactor|restructure|reorganize|clean\s+up)\s+",
            r"(rename|move|extract|split)\s+",
            r"make\s+(it|this)\s+(more\s+)?(clean|simple|readable|modular)",
        ],
        IntentClass.EXPLANATION: [
            r"^(explain|describe|what\s+(does|is)|how\s+does)\s+",
            r"(can|could)\s+you\s+(explain|describe|walk)",
            r"I\s+don.t\s+understand",
        ],
        IntentClass.DEPLOYMENT: [
            r"^deploy\s+",
            r"(push|ship|release)\s+(to|for)\s+",
            r"set\s+up\s+(ci|cd|pipeline|docker)",
        ],
    }

    def __init__(self, temperature: float = 1.5):
        self.calibration_temperature = temperature
        self._compiled_syntax: Dict[IntentClass, List[re.Pattern]] = {}
        self._compiled_sub_intents: List[Tuple[re.Pattern, IntentClass, str]] = []
        self._compile_patterns()

    def _compile_patterns(self) -> None:
        """Pre-compile regex patterns for performance."""
        for intent, patterns in self.SYNTAX_PATTERNS.items():
            self._compiled_syntax[intent] = [
                re.compile(p, re.IGNORECASE) for p in patterns
            ]
        for pattern_str, (intent, sub_name) in self.SUB_INTENT_PATTERNS.items():
            self._compiled_sub_intents.append(
                (re.compile(pattern_str, re.IGNORECASE), intent, sub_name)
            )

    def classify(self, message: str,
                 context: Optional[Dict[str, Any]] = None) -> IntentResult:
        """
        Classify user intent from a natural language message.

        Args:
            message: The raw user message.
            context: Optional context dict with keys like 'project_type',
                     'conversation_history', 'recent_files'.

        Returns:
            IntentResult with primary intent, confidence, and sub-intents.
        """
        if context is None:
            context = {}

        normalized = self._normalize(message)

        # Stage 1: Keyword scoring
        keyword_scores = self._score_keywords(normalized)

        # Stage 2: Syntactic pattern scoring
        syntax_scores = self._score_syntax(normalized)

        # Stage 3: Contextual scoring
        context_scores = self._score_context(normalized, context)

        # Stage 4: Composite scoring
        composite = self._compute_composite(
            keyword_scores, syntax_scores, context_scores
        )

        # Stage 5: Calibration
        calibrated = self._calibrate(composite)

        # Stage 6: Sub-intent detection
        sub_intents = self._detect_sub_intents(normalized)

        # Stage 7: Select primary intent
        primary_intent, primary_confidence = self._select_primary(calibrated)

        # Stage 8: Disambiguation check
        requires_clarification = primary_confidence < self.CONFIDENCE_THRESHOLD
        clarification_prompt = None
        if requires_clarification:
            clarification_prompt = self._generate_clarification(
                calibrated, normalized
            )

        return IntentResult(
            primary_intent=primary_intent,
            primary_confidence=primary_confidence,
            sub_intents=sub_intents,
            all_scores=calibrated,
            requires_clarification=requires_clarification,
            clarification_prompt=clarification_prompt,
            raw_features={
                "keyword_scores": keyword_scores,
                "syntax_scores": syntax_scores,
                "context_scores": context_scores,
                "composite_scores": composite,
            },
        )

    def _normalize(self, message: str) -> str:
        """Normalize user message for classification."""
        text = message.lower().strip()
        text = re.sub(r'\s+', ' ', text)
        text = re.sub(r'[^\w\s/.\-\'\"?!]', '', text)
        return text

    def _score_keywords(self, message: str) -> Dict[str, float]:
        """Score each intent class based on keyword matches."""
        scores = {}
        for intent, keywords in self.INTENT_KEYWORDS.items():
            matches = sum(1 for kw in keywords if kw in message)
            total = len(keywords)
            scores[intent.value] = matches / total if total > 0 else 0.0
        return scores

    def _score_syntax(self, message: str) -> Dict[str, float]:
        """Score each intent class based on syntactic pattern matches."""
        scores = {}
        for intent, patterns in self._compiled_syntax.items():
            matches = sum(1 for p in patterns if p.search(message))
            total = len(patterns)
            scores[intent.value] = matches / total if total > 0 else 0.0
        return scores

    def _score_context(self, message: str,
                       context: Dict[str, Any]) -> Dict[str, float]:
        """Score intents based on contextual signals."""
        scores = {intent.value: 0.0 for intent in IntentClass if intent != IntentClass.UNKNOWN}

        # Project type bias
        project_type = context.get("project_type", "")
        if project_type == "library":
            scores[IntentClass.REFACTORING.value] += 0.1
            scores[IntentClass.EXPLANATION.value] += 0.1
        elif project_type == "application":
            scores[IntentClass.CODE_GENERATION.value] += 0.1
            scores[IntentClass.DEPLOYMENT.value] += 0.1

        # Conversation history momentum
        history = context.get("conversation_history", [])
        if history:
            last_intent = history[-1].get("intent", "")
            if last_intent in scores:
                scores[last_intent] += 0.15  # Momentum bonus

        # Error context detection
        if context.get("has_error_output"):
            scores[IntentClass.DEBUGGING.value] += 0.3

        # File context signals
        recent_files = context.get("recent_files", [])
        if any(f.endswith(("test.py", "_test.go", ".test.ts", ".spec.ts")) for f in recent_files):
            scores[IntentClass.DEBUGGING.value] += 0.05
            scores[IntentClass.CODE_GENERATION.value] += 0.05

        # Normalize to [0, 1]
        max_val = max(scores.values()) if scores else 1.0
        if max_val > 0:
            scores = {k: min(v / max(max_val, 1.0), 1.0) for k, v in scores.items()}

        return scores

    def _compute_composite(self, keyword_scores: Dict[str, float],
                           syntax_scores: Dict[str, float],
                           context_scores: Dict[str, float]) -> Dict[str, float]:
        """Compute weighted composite score for each intent class."""
        composite = {}
        all_intents = set(keyword_scores) | set(syntax_scores) | set(context_scores)
        for intent in all_intents:
            kw = keyword_scores.get(intent, 0.0)
            syn = syntax_scores.get(intent, 0.0)
            ctx = context_scores.get(intent, 0.0)
            composite[intent] = (
                self.WEIGHTS["keyword"] * kw
                + self.WEIGHTS["syntax"] * syn
                + self.WEIGHTS["context"] * ctx
            )
        return composite

    def _calibrate(self, raw_scores: Dict[str, float]) -> Dict[str, float]:
        """Apply temperature scaling for confidence calibration."""
        if not raw_scores:
            return {}

        T = self.calibration_temperature
        # Compute softmax with temperature
        logits = {k: v / T for k, v in raw_scores.items()}
        max_logit = max(logits.values())
        exp_scores = {k: math.exp(v - max_logit) for k, v in logits.items()}
        total = sum(exp_scores.values())

        if total == 0:
            return {k: 1.0 / len(raw_scores) for k in raw_scores}

        return {k: v / total for k, v in exp_scores.items()}

    def _select_primary(self, calibrated: Dict[str, float]) -> Tuple[IntentClass, float]:
        """Select the primary intent from calibrated scores."""
        if not calibrated:
            return IntentClass.UNKNOWN, 0.0

        best_intent = max(calibrated, key=calibrated.get)
        best_confidence = calibrated[best_intent]

        try:
            return IntentClass(best_intent), best_confidence
        except ValueError:
            return IntentClass.UNKNOWN, best_confidence

    def _detect_sub_intents(self, message: str) -> List[SubIntent]:
        """Detect sub-intents using regex pattern matching."""
        detected = []
        for pattern, intent, sub_name in self._compiled_sub_intents:
            match = pattern.search(message)
            if match:
                detected.append(SubIntent(
                    name=sub_name,
                    parent=intent,
                    confidence=0.8,  # Pattern match base confidence
                    signals=[match.group()],
                ))
        return detected

    def _generate_clarification(self, scores: Dict[str, float],
                                message: str) -> str:
        """Generate a clarification prompt when confidence is low."""
        sorted_intents = sorted(scores.items(), key=lambda x: x[1], reverse=True)
        top_2 = sorted_intents[:2]

        if len(top_2) >= 2 and abs(top_2[0][1] - top_2[1][1]) < 0.15:
            return (
                f"I'm not sure if you want to {top_2[0][0].replace('_', ' ')} "
                f"or {top_2[1][0].replace('_', ' ')}. Could you clarify?"
            )

        return "Could you rephrase your request? I want to make sure I understand what you need."
```

---

## Multi-Intent Parsing

Complex user requests often embed multiple intents within a single message. A multi-intent parser identifies and separates these intents for parallel or sequential processing.

### Multi-Intent Detection Heuristics

```
User Message Analysis
├── Single Sentence?
│   ├── YES → Single intent classification
│   └── NO → Sentence-level segmentation
│
├── Conjunction Detection ("and", "then", "also")
│   └── Split at conjunctions → Classify each segment
│
├── Enumeration Detection ("1.", "2.", "-", "•")
│   └── Split at list markers → Classify each item
│
└── Conditional Detection ("if", "when", "after")
    └── Extract condition + action → Classify separately
```

### Python Implementation: Multi-Intent Parser

```python
class MultiIntentParser:
    """
    Parses complex user messages that contain multiple intents.
    Splits the message into segments and classifies each independently.
    """

    CONJUNCTIONS = ["and then", "and also", " and ", " then ", " also ", " plus "]
    LIST_MARKERS = re.compile(r'(?:^|\n)\s*(?:\d+[.)]\s*|-\s*|•\s*|\*\s*)')
    CONDITIONAL = re.compile(r'\b(if|when|after|before|once)\b', re.IGNORECASE)

    def __init__(self, classifier: IntentClassifier):
        self.classifier = classifier

    def parse(self, message: str,
              context: Optional[Dict[str, Any]] = None) -> List[IntentResult]:
        """
        Parse a message for multiple intents.

        Returns a list of IntentResult objects, one per detected intent segment.
        """
        segments = self._segment(message)

        if len(segments) <= 1:
            # Single intent — use standard classification
            return [self.classifier.classify(message, context)]

        results = []
        for segment in segments:
            segment_text = segment.strip()
            if len(segment_text) < 5:
                continue  # Skip trivially short segments
            result = self.classifier.classify(segment_text, context)
            results.append(result)

        return self._deduplicate_intents(results)

    def _segment(self, message: str) -> List[str]:
        """Segment a message into intent-bearing chunks."""
        # Strategy 1: List markers
        list_segments = self.LIST_MARKERS.split(message)
        if len(list_segments) > 1:
            return [s.strip() for s in list_segments if s.strip()]

        # Strategy 2: Conjunction splitting
        for conj in self.CONJUNCTIONS:
            if conj in message.lower():
                parts = message.lower().split(conj)
                if all(len(p.strip()) > 10 for p in parts):
                    # Each part is substantial enough to be a separate intent
                    idx = 0
                    original_parts = []
                    for part in parts:
                        start = message.lower().find(part.strip(), idx)
                        end = start + len(part.strip())
                        original_parts.append(message[start:end])
                        idx = end
                    return original_parts

        # Strategy 3: Sentence splitting (fallback)
        sentences = re.split(r'[.!?]+\s+', message)
        if len(sentences) > 1:
            return [s.strip() for s in sentences if len(s.strip()) > 10]

        return [message]

    def _deduplicate_intents(self, results: List[IntentResult]) -> List[IntentResult]:
        """Remove duplicate intent classifications."""
        seen_intents = set()
        unique = []
        for result in results:
            key = (result.primary_intent, tuple(si.name for si in result.sub_intents))
            if key not in seen_intents:
                seen_intents.add(key)
                unique.append(result)
        return unique
```

---

## Disambiguation Strategies

When intent confidence falls below the threshold, the agent must disambiguate before proceeding. There are four primary disambiguation strategies:

### Strategy 1: Context-Based Resolution

Use conversation history, project type, and recent file context to boost the most likely intent.

### Strategy 2: Clarification Question Generation

Generate a targeted question that helps the user specify their intent without requiring them to rephrase entirely.

### Strategy 3: Default Intent Fallback

When disambiguation fails, fall back to a safe default (typically `explanation`) that gathers more information without side effects.

### Strategy 4: Intent Ensemble Voting

Run multiple classifier variants and use majority voting to resolve ties.

```python
class DisambiguationEngine:
    """
    Resolves ambiguous intent classifications using multiple strategies.
    """

    SAFE_FALLBACK = IntentClass.EXPLANATION

    def __init__(self, classifier: IntentClassifier):
        self.classifier = classifier

    def disambiguate(self, result: IntentResult,
                     context: Dict[str, Any]) -> IntentResult:
        """
        Attempt to disambiguate an uncertain intent classification.

        Strategies are tried in order:
        1. Context-based resolution
        2. Clarification generation
        3. Safe fallback
        """
        if not result.requires_clarification:
            return result

        # Strategy 1: Context-based resolution
        boosted = self._apply_context_boost(result, context)
        if boosted.primary_confidence >= self.classifier.CONFIDENCE_THRESHOLD:
            boosted.requires_clarification = False
            boosted.clarification_prompt = None
            return boosted

        # Strategy 2: Clarification question remains on the result
        # (already set by classifier)

        # Strategy 3: If still ambiguous and no clarification path,
        # fall back to safe default
        if not boosted.clarification_prompt:
            boosted.primary_intent = self.SAFE_FALLBACK
            boosted.primary_confidence = 0.5
            boosted.requires_clarification = False

        return boosted

    def _apply_context_boost(self, result: IntentResult,
                             context: Dict[str, Any]) -> IntentResult:
        """Boost scores using contextual signals."""
        boosted_scores = dict(result.all_scores)

        # Boost from error context
        if context.get("has_error_output"):
            debug_key = IntentClass.DEBUGGING.value
            if debug_key in boosted_scores:
                boosted_scores[debug_key] *= 1.5

        # Boost from recent actions
        last_action = context.get("last_action_type", "")
        if last_action == "code_generation":
            # After creating code, debugging is more likely
            debug_key = IntentClass.DEBUGGING.value
            if debug_key in boosted_scores:
                boosted_scores[debug_key] *= 1.2

        # Re-normalize
        total = sum(boosted_scores.values())
        if total > 0:
            boosted_scores = {k: v / total for k, v in boosted_scores.items()}

        # Find new primary
        best = max(boosted_scores, key=boosted_scores.get)
        try:
            new_primary = IntentClass(best)
        except ValueError:
            new_primary = result.primary_intent

        return IntentResult(
            primary_intent=new_primary,
            primary_confidence=boosted_scores.get(best, 0.0),
            sub_intents=result.sub_intents,
            all_scores=boosted_scores,
            requires_clarification=boosted_scores.get(best, 0.0) < self.classifier.CONFIDENCE_THRESHOLD,
            clarification_prompt=result.clarification_prompt,
            raw_features=result.raw_features,
        )
```

---

## Intent Routing to Skills

Once intent is classified, the routing engine maps intents to specific skills and execution strategies.

### Routing Decision Tree

```
Classified Intent
├── code_generation (σ ≥ 0.75)
│   └── Route to: feedforward-controls → goal-decomposition
│   └── Strategy: Plan-and-Execute with template matching
│
├── debugging (σ ≥ 0.75)
│   └── Route to: feedback-loops → error-diagnosis
│   └── Strategy: OODA loop with trace analysis
│
├── refactoring (σ ≥ 0.75)
│   └── Route to: feedforward-controls → constraint-propagation
│   └── Strategy: Hierarchical decomposition with safety checks
│
├── explanation (σ ≥ 0.75)
│   └── Route to: context-engineering → code-walkthrough
│   └── Strategy: Direct response, no side effects
│
└── deployment (σ ≥ 0.75)
    └── Route to: feedforward-controls → preflight-validation
    └── Strategy: Full pre-flight + HITL review
```

### TypeScript Implementation: Intent Router

```typescript
interface SkillRoute {
  skillName: string;
  subSkill: string;
  strategy: string;
  requiresHITL: boolean;
  riskLevel: "low" | "medium" | "high" | "critical";
}

interface IntentClassification {
  primaryClass: string;
  confidence: number;
  subIntents: string[];
}

interface RoutingResult {
  route: SkillRoute;
  intent: IntentClassification;
  executionMode: "direct" | "planned" | "supervised";
}

class IntentRouter {
  private routingTable: Map<string, SkillRoute> = new Map();

  constructor() {
    this.initializeRoutes();
  }

  private initializeRoutes(): void {
    this.routingTable.set("code_generation", {
      skillName: "feedforward-controls",
      subSkill: "goal-decomposition",
      strategy: "plan-and-execute",
      requiresHITL: false,
      riskLevel: "medium",
    });

    this.routingTable.set("debugging", {
      skillName: "feedback-loops",
      subSkill: "error-diagnosis",
      strategy: "ooda-loop",
      requiresHITL: false,
      riskLevel: "high",
    });

    this.routingTable.set("refactoring", {
      skillName: "feedforward-controls",
      subSkill: "constraint-propagation",
      strategy: "hierarchical-decomposition",
      requiresHITL: false,
      riskLevel: "medium",
    });

    this.routingTable.set("explanation", {
      skillName: "context-engineering",
      subSkill: "code-walkthrough",
      strategy: "direct-response",
      requiresHITL: false,
      riskLevel: "low",
    });

    this.routingTable.set("deployment", {
      skillName: "feedforward-controls",
      subSkill: "preflight-validation",
      strategy: "full-preflight",
      requiresHITL: true,
      riskLevel: "critical",
    });
  }

  route(intent: IntentClassification): RoutingResult {
    const route = this.routingTable.get(intent.primaryClass);

    if (!route) {
      // Fallback route for unknown intents
      return {
        route: {
          skillName: "context-engineering",
          subSkill: "clarification",
          strategy: "direct-response",
          requiresHITL: false,
          riskLevel: "low",
        },
        intent,
        executionMode: "direct",
      };
    }

    const executionMode = this.determineExecutionMode(route, intent);

    return { route, intent, executionMode };
  }

  private determineExecutionMode(
    route: SkillRoute,
    intent: IntentClassification
  ): "direct" | "planned" | "supervised" {
    if (route.requiresHITL || route.riskLevel === "critical") {
      return "supervised";
    }
    if (
      route.riskLevel === "high" ||
      intent.subIntents.length > 1 ||
      intent.confidence < 0.85
    ) {
      return "planned";
    }
    return "direct";
  }

  routeMultiIntent(
    intents: IntentClassification[]
  ): RoutingResult[] {
    return intents.map((intent) => this.route(intent));
  }
}
```

---

## Intent Classification Metrics

### Performance Metrics

| Metric | Formula | Target | Description |
| :--- | :--- | :--- | :--- |
| **Accuracy** | $\frac{TP + TN}{TP + TN + FP + FN}$ | ≥ 0.90 | Overall correct classifications |
| **Precision** | $\frac{TP}{TP + FP}$ | ≥ 0.85 | Proportion of correct positive predictions |
| **Recall** | $\frac{TP}{TP + FN}$ | ≥ 0.85 | Proportion of actual positives found |
| **F1 Score** | $\frac{2 \cdot P \cdot R}{P + R}$ | ≥ 0.85 | Harmonic mean of precision and recall |
| **Clarification Rate** | $\frac{\text{clarifications}}{\text{total requests}}$ | ≤ 0.15 | How often the system asks for clarification |
| **Misroute Rate** | $\frac{\text{wrong routes}}{\text{total routes}}$ | ≤ 0.05 | How often intent leads to wrong skill |

### Monitoring and Logging Schema

```json
{
  "event": "intent_classification",
  "timestamp": "2026-06-04T14:03:00Z",
  "request_id": "req_abc123",
  "input": {
    "message_length": 47,
    "word_count": 9,
    "has_code_block": false
  },
  "output": {
    "primary_class": "refactoring",
    "confidence": 0.87,
    "sub_intents": ["extract_method"],
    "requires_clarification": false
  },
  "routing": {
    "skill": "feedforward-controls",
    "sub_skill": "constraint-propagation",
    "execution_mode": "planned"
  },
  "latency_ms": 12,
  "classifier_version": "2.0.0"
}
```

---

## Anti-Patterns and Common Pitfalls

| Anti-Pattern | Problem | Solution |
| :--- | :--- | :--- |
| **Keyword-Only Classification** | Ignores syntactic structure and context, leading to false positives | Use composite scoring with syntax and context signals |
| **Hardcoded Thresholds** | Different domains require different confidence levels | Make thresholds configurable per-domain |
| **No Calibration** | Raw scores are overconfident, causing premature execution | Apply temperature scaling or Platt scaling |
| **Single-Intent Assumption** | Misses multi-intent requests, executes only partial task | Use multi-intent parser for complex messages |
| **Ignoring Conversation History** | Each message classified in isolation, missing context momentum | Feed conversation history as contextual signal |
| **No Fallback Strategy** | Unrecognized intents cause errors or undefined behavior | Always define a safe fallback intent (explanation) |

---

## Handoff & Related References
- Goal Decomposition: [goal-decomposition-trees.md](goal-decomposition-trees.md)
- Constraint Propagation: [constraint-propagation.md](constraint-propagation.md)
- OODA Loop Patterns: [ooda-loop-patterns.md](ooda-loop-patterns.md)
- Pre-Flight Validation: [preflight-validation.md](preflight-validation.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive intent classification details preserved)
Strict compliance with multi-stage classification, confidence calibration, and disambiguation protocols.
-->
