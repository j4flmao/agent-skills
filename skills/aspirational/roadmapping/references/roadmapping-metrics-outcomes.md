# Roadmapping Metrics & Outcomes

## Overview

A strategic roadmap is not a success simply because features were shipped on time. True roadmap performance must be measured through outcomes (whether the changes achieved the target OKRs) and process quality (whether the roadmapping process was accurate and predictable). This document specifies OKR alignment schemas, roadmap accuracy metrics, and closed-loop feedback models to ensure that roadmap execution feeds back into the strategic planning cycle.

## 1. OKR Alignment & Progress Tracking Schema

To trace features to outcomes, we define a standardized JSON schema modeling the relationship between Initiatives, Objectives, Key Results (KRs), and active metrics.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "title": "OkrAlignmentMatrix",
  "type": "object",
  "required": ["objective_id", "title", "owner", "key_results"],
  "properties": {
    "objective_id": { "type": "string", "format": "uuid" },
    "title": { "type": "string" },
    "owner": { "type": "string" },
    "key_results": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["kr_id", "description", "target_value", "current_value", "unit", "linked_initiatives"],
        "properties": {
          "kr_id": { "type": "string", "format": "uuid" },
          "description": { "type": "string" },
          "target_value": { "type": "number" },
          "current_value": { "type": "number" },
          "unit": { "type": "string" },
          "linked_initiatives": {
            "type": "array",
            "items": {
              "type": "object",
              "required": ["initiative_id", "contribution_percentage"],
              "properties": {
                "initiative_id": { "type": "string" },
                "contribution_percentage": { "type": "integer", "minimum": 1, "maximum": 100 }
              }
            }
          }
        }
      }
    }
  }
}
```

## 2. Roadmap Accuracy Metrics

Measuring the effectiveness of the roadmap planning process requires tracking predictability, alignment, and execution.

### Metrics Definitions

1.  **Commitment Reliability Rate (CRR)**
    $$\text{CRR} = \frac{\text{Number of Committed Initiatives Delivered on Time}}{\text{Total Number of Committed Initiatives Planned}}$$
    *Target*: $> 80\%$ per quarter.
2.  **Predictability Index (PI)**
    $$\text{PI} = \frac{\text{Actual Velocity Delivered on Roadmap Items}}{\text{Estimated Capacity at the Start of Quarter}}$$
    *Target*: $90\% - 110\%$.
3.  **OKR Alignment Density (OAD)**
    $$\text{OAD} = \frac{\text{Developer Capacity Spent on OKR-Aligned Tasks}}{\text{Total Developer Capacity Spent}}$$
    *Target*: $> 75\%$ for core product teams.
4.  **Slipped Initiatives Ratio (SIR)**
    $$\text{SIR} = \frac{\text{Number of Initiatives Defered / Slipped to Next Quarter}}{\text{Total Planned Initiatives}}$$
    *Target*: $< 20\%$.

## 3. Closed-loop Feedback Model

Roadmaps must adapt using real-world performance data. Below is the closed-loop lifecycle where actual outcomes update future priority matrices.

```
┌────────────────────────────────────────────────────────┐
│               Quarterly Roadmap Planning               │
│               - Priority Scores (RICE)                 │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                   Roadmap Execution                    │
│                   - Tracker webhook syncs              │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│                  Telemetry Analysis                    │
│                  - Log outcomes & OKR values           │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│               Closed-loop Optimization                 │
│               - Update RICE inputs (Confidence score)   │
│               - Recalibrate team velocity inputs       │
└────────────────────────────────────────────────────────┘
```

## 4. Performance Calculator

Below is a Python implementation of the closed-loop performance calculator which calculates accuracy metrics and updates prioritization records based on historical performance.

```python
from typing import List, Dict, Any

class RoadmapOutcomeCalculator:
    def __init__(self):
        self.outcomes: List[Dict[str, Any]] = []

    def record_outcome(
        self, 
        initiative_id: str, 
        committed: bool, 
        delivered_on_time: bool, 
        planned_points: float, 
        actual_points: float
    ):
        self.outcomes.append({
            "id": initiative_id,
            "committed": committed,
            "delivered_on_time": delivered_on_time,
            "planned_points": planned_points,
            "actual_points": actual_points
        })

    def compute_metrics(self) -> Dict[str, float]:
        committed_items = [o for o in self.outcomes if o["committed"]]
        
        # 1. Commitment Reliability Rate (CRR)
        if not committed_items:
            crr = 1.0
        else:
            delivered_committed = [c for c in committed_items if c["delivered_on_time"]]
            crr = len(delivered_committed) / len(committed_items)

        # 2. Predictability Index (PI)
        total_planned = sum(o["planned_points"] for o in self.outcomes)
        total_actual = sum(o["actual_points"] for o in self.outcomes)
        
        pi = (total_actual / total_planned) if total_planned > 0 else 1.0

        return {
            "commitment_reliability_rate": round(crr, 2),
            "predictability_index": round(pi, 2),
            "total_initiatives": len(self.outcomes)
        }

    def adjust_prioritization_confidence(self, current_rice_confidence: float, initiative_id: str) -> float:
        """
        Closed-loop tuning: Adjusts confidence score dynamically based on delivery slippage.
        """
        outcome = next((o for o in self.outcomes if o["id"] == initiative_id), None)
        if not outcome:
            return current_rice_confidence

        if not outcome["delivered_on_time"]:
            # Reduce confidence score by 20% for future calculations due to estimation drift
            adjusted = current_rice_confidence * 0.8
            return max(0.2, round(adjusted, 2))
            
        return current_rice_confidence
```

## Key Points

- Outcomes are measured by OKR progression, not just shipping deadlines.
- Use CRR (Commitment Reliability Rate) to measure roadmap forecasting quality.
- Track OAD (OKR Alignment Density) to prevent engineering capacity leaks to un-aligned tasks.
- Implement closed-loop prioritization feedback: slip outcomes should automatically degrade confidence scores in RICE/WSJF calculators.
- Store objective history schema records in analytical storage for baseline trend audits.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with strategic roadmapping, outcome tracking, OKR schemas, and metrics calculators.
-->
