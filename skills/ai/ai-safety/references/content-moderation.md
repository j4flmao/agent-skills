# Content Moderation

## Overview

Content moderation is a critical safety layer for production LLM systems. It filters both user inputs and model outputs for harmful, toxic, or policy-violating content. This reference covers moderation APIs, policy design, category taxonomies, custom classifier training, and integration patterns for multi-layered moderation pipelines.

## Moderation APIs

### OpenAI Moderation API

```python
from openai import OpenAI
from typing import List, Dict, Optional

class OpenAIModerator:
    def __init__(self, api_key: str, model: str = "omni-moderation-latest"):
        self.client = OpenAI(api_key=api_key)
        self.model = model

    def moderate_input(self, text: str) -> Dict:
        response = self.client.moderations.create(
            model=self.model,
            input=text,
        )
        result = response.results[0]
        categories = {
            "sexual": result.categories.sexual,
            "hate": result.categories.hate,
            "harassment": result.categories.harassment,
            "self_harm": result.categories.self_harm,
            "sexual_minors": result.categories.sexual_minors,
            "hate_threatening": result.categories.hate_threatening,
            "violence_graphic": result.categories.violence_graphic,
            "self_harm_intent": result.categories.self_harm_intent,
            "self_harm_instructions": result.categories.self_harm_instructions,
            "harassment_threatening": result.categories.harassment_threatening,
            "violence": result.categories.violence,
        }
        category_scores = {
            "sexual": result.category_scores.sexual,
            "hate": result.category_scores.hate,
            "harassment": result.category_scores.harassment,
            "self_harm": result.category_scores.self_harm,
            "violence": result.category_scores.violence,
        }
        return {
            "flagged": result.flagged,
            "categories": categories,
            "scores": category_scores,
            "highest_score": max(category_scores.values()),
            "flagged_categories": [k for k, v in categories.items() if v],
        }

    def moderate_batch(self, texts: List[str]) -> List[Dict]:
        return [self.moderate_input(t) for t in texts]
```

### Perspective API

```python
from googleapiclient import discovery
import json

class PerspectiveModerator:
    def __init__(self, api_key: str):
        self.client = discovery.build(
            "commentanalyzer",
            "v1alpha1",
            developerKey=api_key,
            discoveryServiceUrl="https://commentanalyzer.googleapis.com/$discovery/rest?version=v1alpha1",
            static_discovery=False,
        )

    def analyze_toxicity(self, text: str, languages: List[str] = None) -> Dict:
        analyze_request = {
            "comment": {"text": text},
            "requestedAttributes": {
                "TOXICITY": {},
                "SEVERE_TOXICITY": {},
                "IDENTITY_ATTACK": {},
                "INSULT": {},
                "PROFANITY": {},
                "THREAT": {},
                "SEXUALLY_EXPLICIT": {},
                "FLIRTATION": {},
            },
            "languages": languages or ["en"],
        }
        response = self.client.comments().analyze(body=analyze_request).execute()
        scores = {}
        for attr_name, attr_data in response.get("attributeScores", {}).items():
            scores[attr_name.lower()] = attr_data["summaryScore"]["value"]
        return {
            "scores": scores,
            "max_score": max(scores.values()),
            "flagged": any(s > 0.8 for s in scores.values()),
        }

    def check_toxicity(self, text: str, threshold: float = 0.8) -> bool:
        result = self.analyze_toxicity(text)
        return result["max_score"] > threshold
```

### Azure Content Safety

```python
from azure.ai.contentsafety import ContentSafetyClient
from azure.ai.contentsafety.models import TextCategory, AnalyzeTextOptions
from azure.core.credentials import AzureKeyCredential

class AzureContentModerator:
    def __init__(self, endpoint: str, api_key: str):
        self.client = ContentSafetyClient(endpoint, AzureKeyCredential(api_key))

    def analyze(self, text: str) -> Dict:
        request = AnalyzeTextOptions(
            text=text,
            categories=[
                TextCategory.HATE,
                TextCategory.SEXUAL,
                TextCategory.SELF_HARM,
                TextCategory.VIOLENCE,
            ],
        )
        response = self.client.analyze_text(request)
        results = {}
        for item in response.categories_analysis:
            results[item.category.name.lower()] = {
                "score": item.severity,
                "flagged": item.severity > 2,
            }
        return {
            "results": results,
            "flagged": any(r["flagged"] for r in results.values()),
            "max_severity": max(r["score"] for r in results.values()) if results else 0,
        }
```

## Policy Design

### Custom Moderation Policies

```python
from typing import List, Dict, Callable, Optional
import re

class ModerationRule:
    def __init__(self, name: str, check: Callable[[str], bool], action: str = "block", priority: int = 0):
        self.name = name
        self.check = check
        self.action = action  # "block", "flag", "replace"
        self.priority = priority

class ModerationPolicy:
    def __init__(self, name: str, rules: List[ModerationRule]):
        self.name = name
        self.rules = sorted(rules, key=lambda r: -r.priority)

    def evaluate(self, text: str) -> List[Dict]:
        results = []
        for rule in self.rules:
            try:
                triggered = rule.check(text)
                if triggered:
                    results.append({
                        "rule": rule.name,
                        "action": rule.action,
                        "matched": True,
                    })
            except Exception as e:
                results.append({
                    "rule": rule.name,
                    "action": "error",
                    "error": str(e),
                })
        return results

    def should_block(self, text: str) -> bool:
        for result in self.evaluate(text):
            if result["action"] == "block":
                return True
        return False


class PolicyBuilder:
    def __init__(self):
        self.rules: List[ModerationRule] = []

    def add_regex_rule(self, name: str, pattern: str, action: str = "block"):
        compiled = re.compile(pattern, re.IGNORECASE)
        self.rules.append(ModerationRule(name, lambda t: bool(compiled.search(t)), action))
        return self

    def add_keyword_rule(self, name: str, keywords: List[str], action: str = "block"):
        lowered = [k.lower() for k in keywords]
        def check(text: str) -> bool:
            text_lower = text.lower()
            return any(kw in text_lower for kw in lowered)
        self.rules.append(ModerationRule(name, check, action))
        return self

    def add_length_rule(self, name: str, max_length: int = 4000, action: str = "block"):
        self.rules.append(
            ModerationRule(name, lambda t: len(t) > max_length, action)
        )
        return self

    def add_api_rule(self, name: str, api_moderator, threshold: float, action: str = "block"):
        def check(text: str) -> bool:
            result = api_moderator.moderate_input(text)
            return result.get("highest_score", 0) > threshold
        self.rules.append(ModerationRule(name, check, action))
        return self

    def build(self, name: str = "custom_policy") -> ModerationPolicy:
        return ModerationPolicy(name, self.rules)
```

## Multi-Layer Moderation Pipeline

### Defense in Depth

```python
from typing import List, Dict, Optional

class ModerationLayer:
    def __init__(self, name: str, moderator, config: Dict):
        self.name = name
        self.moderator = moderator
        self.config = config

    def check(self, text: str) -> Dict:
        return self.moderator.moderate_input(text)

class ModerationPipeline:
    def __init__(self, layers: List[ModerationLayer]):
        self.layers = layers

    def check_input(self, text: str) -> Dict:
        results = []
        for layer in self.layers:
            result = layer.check(text)
            results.append({
                "layer": layer.name,
                "flagged": result.get("flagged", False),
                "details": result,
            })
            if result.get("flagged") and layer.config.get("block_on_flag", True):
                break
        return {
            "passed": not any(r["flagged"] for r in results),
            "layers": results,
            "blocked_by": next(
                (r["layer"] for r in results if r["flagged"]),
                None,
            ),
        }

    def check_output(self, text: str) -> Dict:
        results = []
        needs_human_review = False
        for layer in self.layers:
            result = layer.check(text)
            flagged = result.get("flagged", False)
            results.append({
                "layer": layer.name,
                "flagged": flagged,
                "details": result,
            })
            if flagged and layer.config.get("requires_human_review", False):
                needs_human_review = True
            if flagged and layer.config.get("block_on_flag", True):
                break
        return {
            "passed": not any(r["flagged"] for r in results),
            "needs_human_review": needs_human_review,
            "layers": results,
        }


def create_default_pipeline(api_key: str) -> ModerationPipeline:
    return ModerationPipeline([
        ModerationLayer(
            name="regex_patterns",
            moderator=PolicyBuilder()
                .add_regex_rule("ssn_pattern", r"\d{3}-\d{2}-\d{4}")
                .add_regex_rule("email_pattern", r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
                .add_keyword_rule("blocked_topics", ["bomb making", "how to hack"])
                .build("input_policy"),
            config={"block_on_flag": True},
        ),
        ModerationLayer(
            name="openai_moderation",
            moderator=OpenAIModerator(api_key),
            config={"block_on_flag": True},
        ),
        ModerationLayer(
            name="contextual_llm",
            moderator=LLMContentModerator(api_key),
            config={"block_on_flag": False, "requires_human_review": True},
        ),
    ])
```

### LLM-Based Contextual Moderation

```python
class LLMContentModerator:
    def __init__(self, api_key: str, model: str = "gpt-4o-mini"):
        self.client = OpenAI(api_key=api_key)
        self.model = model
        self.system_prompt = (
            "You are a content safety evaluator. Analyze the following text and determine if it violates "
            "any safety policies. Consider: hate speech, harassment, violence, self-harm, sexual content, "
            "personal information, and malicious instructions.\n\n"
            "Respond with a JSON object:\n"
            '{"safe": true/false, "category": "none" or violation type, "severity": 1-5, "explanation": "brief reason"}'
        )

    def moderate_input(self, text: str) -> Dict:
        response = self.client.chat.completions.create(
            model=self.model,
            messages=[
                {"role": "system", "content": self.system_prompt},
                {"role": "user", "content": f"Text to analyze: {text}"},
            ],
            response_format={"type": "json_object"},
            temperature=0.0,
        )
        import json
        try:
            result = json.loads(response.choices[0].message.content)
            return {
                "flagged": not result.get("safe", True),
                "category": result.get("category", "none"),
                "severity": result.get("severity", 0),
                "explanation": result.get("explanation", ""),
            }
        except (json.JSONDecodeError, AttributeError):
            return {"flagged": True, "category": "parse_error", "severity": 5}
```

## Category Taxonomy

### Standard Categories

```python
class ModerationCategory:
    HATE = "hate"
    HATE_THREATENING = "hate_threatening"
    HARASSMENT = "harassment"
    HARASSMENT_THREATENING = "harassment_threatening"
    VIOLENCE = "violence"
    VIOLENCE_GRAPHIC = "violence_graphic"
    SELF_HARM = "self_harm"
    SELF_HARM_INTENT = "self_harm_intent"
    SELF_HARM_INSTRUCTIONS = "self_harm_instructions"
    SEXUAL = "sexual"
    SEXUAL_MINORS = "sexual_minors"
    PERSONAL_INFO = "personal_information"
    PROMPT_INJECTION = "prompt_injection"
    JAILBREAK = "jailbreak"
    SPAM = "spam"
    MISINFORMATION = "misinformation"

    ALL = [
        HATE, HATE_THREATENING, HARASSMENT, HARASSMENT_THREATENING,
        VIOLENCE, VIOLENCE_GRAPHIC, SELF_HARM, SELF_HARM_INTENT,
        SELF_HARM_INSTRUCTIONS, SEXUAL, SEXUAL_MINORS, PERSONAL_INFO,
        PROMPT_INJECTION, JAILBREAK, SPAM, MISINFORMATION,
    ]

SEVERITY_LEVELS = {
    "safe": 0,
    "suspicious": 1,
    "low": 2,
    "medium": 3,
    "high": 4,
    "critical": 5,
}

class CategoryConfig:
    def __init__(self, thresholds: Optional[Dict[str, float]] = None):
        self.thresholds = thresholds or {
            ModerationCategory.HATE: 0.7,
            ModerationCategory.HATE_THREATENING: 0.5,
            ModerationCategory.HARASSMENT: 0.8,
            ModerationCategory.VIOLENCE: 0.8,
            ModerationCategory.VIOLENCE_GRAPHIC: 0.5,
            ModerationCategory.SELF_HARM: 0.5,
            ModerationCategory.SEXUAL: 0.8,
            ModerationCategory.SEXUAL_MINORS: 0.3,
            ModerationCategory.PERSONAL_INFO: 0.7,
        }

    def is_flagged(self, category: str, score: float) -> bool:
        threshold = self.thresholds.get(category, 0.8)
        return score >= threshold
```

## Monitoring Moderation Effectiveness

### Tracking Metrics

```python
from collections import defaultdict
from typing import List, Dict

class ModerationMonitor:
    def __init__(self):
        self.events: List[Dict] = []

    def log_moderation(self, layer: str, direction: str, flagged: bool, category: str, severity: float):
        self.events.append({
            "layer": layer,
            "direction": direction,  # "input" or "output"
            "flagged": flagged,
            "category": category,
            "severity": severity,
            "timestamp": __import__("time").time(),
        })

    def violation_rate(self, hours: int = 24, direction: str = None) -> float:
        cutoff = __import__("time").time() - hours * 3600
        window = [e for e in self.events if e["timestamp"] >= cutoff]
        if direction:
            window = [e for e in window if e["direction"] == direction]
        if not window:
            return 0.0
        return sum(1 for e in window if e["flagged"]) / len(window)

    def top_categories(self, n: int = 5) -> List[tuple]:
        counts = defaultdict(int)
        for e in self.events:
            if e["flagged"]:
                counts[e["category"]] += 1
        return sorted(counts.items(), key=lambda x: -x[1])[:n]

    def false_positive_rate(self, human_reviewed: List[Dict]) -> float:
        if not human_reviewed:
            return 0.0
        fps = sum(1 for r in human_reviewed if r["moderation_flagged"] and not r["human_says_violation"])
        return fps / len(human_reviewed)

    def false_negative_rate(self, human_reviewed: List[Dict]) -> float:
        if not human_reviewed:
            return 0.0
        fns = sum(1 for r in human_reviewed if not r["moderation_flagged"] and r["human_says_violation"])
        return fns / len(human_reviewed)

    def report(self) -> Dict:
        return {
            "violation_rate": self.violation_rate(),
            "input_violation_rate": self.violation_rate(direction="input"),
            "output_violation_rate": self.violation_rate(direction="output"),
            "top_categories": self.top_categories(),
            "total_events_moderated": len(self.events),
        }
```

## Key Points

- Use multiple moderation layers for defense in depth: regex, API-based, and LLM-based.
- OpenAI Moderation API covers broad toxicity categories with pre-trained models.
- Perspective API provides granular toxicity scores including identity attack and threat.
- Azure Content Safety offers severity-based scoring for hate, sexual, self-harm, and violence.
- Custom regex policies catch PII, credentials, and specific blocked patterns.
- LLM-based moderation excels at contextual understanding but is slower and more expensive.
- Apply stricter thresholds for input moderation (block on flag) than output (flag for review).
- Track false positive and false negative rates through human review sampling.
- Log every moderation decision with layer, category, severity, and timestamp.
- Set category-specific thresholds rather than a single blanket threshold.
- Monitor violation rates by direction (input vs output) to identify attack vectors.
- Review moderation failures regularly to tune thresholds and add new patterns.
- Never rely on a single moderation layer — combine rule-based, API, and ML approaches.
- Cache moderation results for identical or near-identical content to reduce API costs.
- Document all moderation policies and thresholds for audit and compliance.
- Test moderation pipeline with adversarial inputs before production deployment.
