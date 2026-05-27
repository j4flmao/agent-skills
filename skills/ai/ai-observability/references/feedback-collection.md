# Feedback Collection

## Overview

User feedback is the most direct signal of LLM quality in production. Unlike offline metrics, feedback captures real user satisfaction, task completion, and qualitative issues. This reference covers feedback collection mechanisms, annotation pipelines, quality signal aggregation, and integration with observability platforms.

## Feedback Types

### Explicit Feedback

```python
from enum import Enum
from typing import Optional, List, Dict
from dataclasses import dataclass, field
import json

class FeedbackRating(Enum):
    THUMBS_UP = "thumbs_up"
    THUMBS_DOWN = "thumbs_down"
    STAR_1 = "star_1"  # lowest
    STAR_2 = "star_2"
    STAR_3 = "star_3"
    STAR_4 = "star_4"
    STAR_5 = "star_5"  # highest

@dataclass
class FeedbackEvent:
    trace_id: str
    user_id: str
    rating: FeedbackRating
    comment: Optional[str] = None
    category: Optional[str] = None
    metadata: Dict = field(default_factory=dict)
    timestamp: float = 0.0

class FeedbackCollector:
    def __init__(self, storage_backend=None):
        self.storage = storage_backend or []
        self.events: List[FeedbackEvent] = []

    def record_feedback(self, event: FeedbackEvent):
        event.timestamp = __import__("time").time()
        self.events.append(event)
        if self.storage is not None:
            self.storage.append(json.dumps({
                "trace_id": event.trace_id,
                "user_id": event.user_id,
                "rating": event.rating.value,
                "comment": event.comment,
                "category": event.category,
                "metadata": event.metadata,
                "timestamp": event.timestamp,
            }))

    def get_feedback_for_trace(self, trace_id: str) -> List[FeedbackEvent]:
        return [e for e in self.events if e.trace_id == trace_id]

    def positive_rate(self, time_window_hours: int = 24) -> float:
        cutoff = __import__("time").time() - time_window_hours * 3600
        recent = [e for e in self.events if e.timestamp >= cutoff]
        if not recent:
            return 0.0
        positive = sum(1 for e in recent if e.rating in [
            FeedbackRating.THUMBS_UP, FeedbackRating.STAR_4, FeedbackRating.STAR_5
        ])
        return positive / len(recent)

    def negative_rate(self, time_window_hours: int = 24) -> float:
        cutoff = __import__("time").time() - time_window_hours * 3600
        recent = [e for e in self.events if e.timestamp >= cutoff]
        if not recent:
            return 0.0
        negative = sum(1 for e in recent if e.rating in [
            FeedbackRating.THUMBS_DOWN, FeedbackRating.STAR_1, FeedbackRating.STAR_2
        ])
        return negative / len(recent)
```

### Implicit Feedback Signals

```python
class ImplicitFeedbackTracker:
    def __init__(self):
        self.signals: List[Dict] = []

    def log_copy(self, trace_id: str, user_id: str, text_length: int):
        self.signals.append({
            "trace_id": trace_id,
            "user_id": user_id,
            "signal": "copy",
            "value": text_length,
            "timestamp": __import__("time").time(),
        })

    def log_regenerate(self, trace_id: str, user_id: str):
        self.signals.append({
            "trace_id": trace_id,
            "user_id": user_id,
            "signal": "regenerate",
            "value": 1,
            "timestamp": __import__("time").time(),
        })

    def log_dismiss(self, trace_id: str, user_id: str):
        self.signals.append({
            "trace_id": trace_id,
            "user_id": user_id,
            "signal": "dismiss_without_read",
            "value": 1,
            "timestamp": __import__("time").time(),
        })

    def log_time_spent(self, trace_id: str, user_id: str, seconds: float):
        self.signals.append({
            "trace_id": trace_id,
            "user_id": user_id,
            "signal": "time_spent",
            "value": seconds,
            "timestamp": __import__("time").time(),
        })

    def engagement_score(self, user_id: str) -> float:
        user_signals = [s for s in self.signals if s["user_id"] == user_id]
        if not user_signals:
            return 0.0
        copies = sum(s["value"] for s in user_signals if s["signal"] == "copy")
        regenerates = sum(s["value"] for s in user_signals if s["signal"] == "regenerate")
        dismissals = sum(s["value"] for s in user_signals if s["signal"] == "dismiss_without_read")
        total = copies + regenerates + dismissals
        if total == 0:
            return 0.5
        return (copies - regenerates - dismissals) / total + 0.5
```

## Integration with Observability Platforms

### LangFuse Feedback Integration

```python
from langfuse import Langfuse

class LangfuseFeedbackCollector:
    def __init__(self, langfuse_client: Langfuse):
        self.client = langfuse_client

    def record_thumbs(self, trace_id: str, value: bool, comment: str = None):
        self.client.score(
            trace_id=trace_id,
            name="user_feedback",
            value=1.0 if value else 0.0,
            comment=comment,
        )

    def record_star_rating(self, trace_id: str, rating: int, category: str = None):
        self.client.score(
            trace_id=trace_id,
            name="star_rating",
            value=rating,
            comment=category,
        )

    def record_category_score(self, trace_id: str, category: str, value: float):
        self.client.score(
            trace_id=trace_id,
            name=category,
            value=value,
        )
```

### LangSmith Feedback Integration

```python
from langsmith import Client

class LangSmithFeedbackCollector:
    def __init__(self, client: Client):
        self.client = client

    def record_feedback(self, run_id: str, score: float, key: str = "user_score", comment: str = None):
        self.client.create_feedback(
            run_id=run_id,
            key=key,
            score=score,
            comment=comment,
        )

    def record_comparison(self, run_id: str, preferred_run_id: str):
        self.client.create_feedback(
            run_id=run_id,
            key="comparison",
            score=1.0,
            correction=f"preferred_run_id: {preferred_run_id}",
        )
```

## Annotation Pipelines

### Human Annotation Workflow

```python
from typing import List, Dict, Optional, Callable

class AnnotationTask:
    def __init__(self, trace_id: str, input_text: str, output_text: str, annotator_id: Optional[str] = None):
        self.trace_id = trace_id
        self.input_text = input_text
        self.output_text = output_text
        self.annotator_id = annotator_id
        self.labels: Dict[str, float] = {}
        self.comment: Optional[str] = None
        self.completed: bool = False

class AnnotationPipeline:
    def __init__(self, storage_backend: Callable):
        self.storage = storage_backend
        self.tasks: List[AnnotationTask] = []
        self.completed_tasks: List[AnnotationTask] = []

    def create_tasks_from_feedback(self, feedback_events: List[FeedbackEvent], threshold: float = 0.1):
        for event in feedback_events:
            if event.rating in [FeedbackRating.THUMBS_DOWN, FeedbackRating.STAR_1, FeedbackRating.STAR_2]:
                self.tasks.append(AnnotationTask(
                    trace_id=event.trace_id,
                    input_text=event.metadata.get("input", ""),
                    output_text=event.metadata.get("output", ""),
                ))

    def submit_annotation(self, task_index: int, labels: Dict[str, float], comment: str = None):
        if 0 <= task_index < len(self.tasks):
            task = self.tasks[task_index]
            task.labels = labels
            task.comment = comment
            task.completed = True
            self.completed_tasks.append(task)
            self.tasks.pop(task_index)

    def get_pending_tasks(self) -> List[AnnotationTask]:
        return [t for t in self.tasks if not t.completed]

    def inter_annotator_agreement(self) -> float:
        if len(self.completed_tasks) < 2:
            return 0.0
        import statistics
        agreements = []
        for i in range(len(self.completed_tasks)):
            for j in range(i + 1, len(self.completed_tasks)):
                task_i = self.completed_tasks[i]
                task_j = self.completed_tasks[j]
                if task_i.trace_id == task_j.trace_id:
                    common_keys = set(task_i.labels.keys()) & set(task_j.labels.keys())
                    if common_keys:
                        diffs = [
                            abs(task_i.labels[k] - task_j.labels[k])
                            for k in common_keys
                        ]
                        agreements.append(1.0 - (sum(diffs) / len(diffs) / 5.0))
        return statistics.mean(agreements) if agreements else 0.0
```

### Automated Annotation with LLM

```python
class AutomatedAnnotator:
    def __init__(self, llm, annotation_schema: Dict[str, List[str]]):
        self.llm = llm
        self.schema = annotation_schema

    async def annotate(self, input_text: str, output_text: str) -> Dict[str, float]:
        criteria_lines = []
        for dimension, options in self.schema.items():
            options_str = ", ".join(options)
            criteria_lines.append(f"- {dimension}: {options_str}")

        prompt = (
            f"Annotate the following AI response.\n\n"
            f"Input: {input_text}\nResponse: {output_text}\n\n"
            f"Rate each dimension:\n" + "\n".join(criteria_lines) +
            "\n\nReturn a JSON object with dimension names as keys and scores as values."
        )

        result = await self.llm.generate(prompt)
        import json, re
        match = re.search(r'\{.*\}', result, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except json.JSONDecodeError:
                pass
        return {}

    async def annotate_batch(self, pairs: List[Dict]) -> List[Dict]:
        import asyncio
        tasks = [self.annotate(p["input"], p["output"]) for p in pairs]
        results = await asyncio.gather(*tasks)
        return [
            {"input": p["input"], "output": p["output"], "annotations": r}
            for p, r in zip(pairs, results)
        ]
```

## Quality Signal Aggregation

### Aggregating Feedback into Quality Scores

```python
from collections import defaultdict
from datetime import datetime, timedelta
from typing import Dict, List

class QualityAggregator:
    def __init__(self, feedback_collector: FeedbackCollector, implicit_tracker: ImplicitFeedbackTracker):
        self.feedback = feedback_collector
        self.implicit = implicit_tracker

    def model_quality_score(self, model_name: str, hours: int = 24) -> float:
        cutoff = __import__("time").time() - hours * 3600
        model_events = [
            e for e in self.feedback.events
            if e.metadata.get("model") == model_name and e.timestamp >= cutoff
        ]
        if not model_events:
            return 0.5
        positive = sum(1 for e in model_events if e.rating in [
            FeedbackRating.THUMBS_UP, FeedbackRating.STAR_4, FeedbackRating.STAR_5
        ])
        negative = sum(1 for e in model_events if e.rating in [
            FeedbackRating.THUMBS_DOWN, FeedbackRating.STAR_1, FeedbackRating.STAR_2
        ])
        total = positive + negative
        if total == 0:
            return 0.5
        return positive / total

    def prompt_template_score(self, template_name: str, hours: int = 168) -> float:
        cutoff = __import__("time").time() - hours * 3600
        template_events = [
            e for e in self.feedback.events
            if e.metadata.get("prompt_template") == template_name and e.timestamp >= cutoff
        ]
        if not template_events:
            return None
        scores = []
        for e in template_events:
            if e.rating in [FeedbackRating.STAR_1, FeedbackRating.STAR_2, FeedbackRating.STAR_3, FeedbackRating.STAR_4, FeedbackRating.STAR_5]:
                scores.append(int(e.rating.value.split("_")[1]))
            elif e.rating == FeedbackRating.THUMBS_UP:
                scores.append(4.0)
            elif e.rating == FeedbackRating.THUMBS_DOWN:
                scores.append(2.0)
        return sum(scores) / len(scores) if scores else None

    def weekly_trend(self) -> Dict[str, List[float]]:
        daily_scores = defaultdict(list)
        for e in self.feedback.events:
            day = datetime.fromtimestamp(e.timestamp).strftime("%Y-%m-%d")
            if e.rating in [FeedbackRating.THUMBS_UP, FeedbackRating.STAR_4, FeedbackRating.STAR_5]:
                daily_scores[day].append(1.0)
            elif e.rating in [FeedbackRating.THUMBS_DOWN, FeedbackRating.STAR_1, FeedbackRating.STAR_2]:
                daily_scores[day].append(0.0)
        trend = {}
        for day, scores in sorted(daily_scores.items()):
            trend[day] = sum(scores) / len(scores)
        return trend
```

## Feedback-Driven Improvements

### Identifying Weaknesses from Feedback

```python
class FeedbackAnalyzer:
    def __init__(self, collector: FeedbackCollector):
        self.collector = collector

    def most_common_categories(self, top_n: int = 5) -> List[tuple]:
        category_counts = defaultdict(int)
        for e in self.collector.events:
            if e.category:
                category_counts[e.category] += 1
        return sorted(category_counts.items(), key=lambda x: -x[1])[:top_n]

    def negative_feedback_by_model(self) -> Dict[str, int]:
        model_counts = defaultdict(int)
        for e in self.collector.events:
            if e.rating in [FeedbackRating.THUMBS_DOWN, FeedbackRating.STAR_1, FeedbackRating.STAR_2]:
                model = e.metadata.get("model", "unknown")
                model_counts[model] += 1
        return dict(model_counts)

    def comment_analysis(self, n_negative: int = 20) -> List[str]:
        negative_comments = [
            e.comment for e in self.collector.events
            if e.rating in [FeedbackRating.THUMBS_DOWN, FeedbackRating.STAR_1, FeedbackRating.STAR_2]
            and e.comment
        ]
        return negative_comments[:n_negative]

    def improvement_recommendations(self) -> List[str]:
        recs = []
        by_model = self.negative_feedback_by_model()
        for model, count in sorted(by_model.items(), key=lambda x: -x[1]):
            if count > 10:
                recs.append(f"High negative feedback on {model} ({count} events) - investigate quality")
        by_category = self.most_common_categories(3)
        for category, count in by_category:
            if count > 5:
                recs.append(f"Frequent issue category '{category}' ({count} events) - consider prompt update")
        return recs
```

## Key Points

- Collect explicit feedback (thumbs, stars, comments) for direct quality measurement.
- Track implicit signals (copy, regenerate, dismiss, time spent) for passive quality estimation.
- Integrate feedback with observability platforms using SDK-native score APIs.
- Use human annotation pipelines for high-quality labeled data from negative feedback sampling.
- Use automated LLM annotation for scalable but lower-cost labeling.
- Aggregate feedback into per-model and per-prompt-template quality scores.
- Track weekly trends to detect quality regressions before they escalate.
- Analyze negative feedback by model and category to prioritize improvements.
- Trigger annotation workflows automatically when negative feedback exceeds thresholds.
- Measure inter-annotator agreement to ensure labeling quality and consistency.
- Store all feedback with trace IDs for full-context debugging.
- Use feedback scores as evaluation dataset filters for targeted retraining.
- Monitor feedback collection rate as a health metric — low rates may indicate fatigue.
- Always allow free-text comments alongside structured ratings for richer signals.
