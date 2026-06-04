# Roadmapping Scenario Planning

## Overview

Static timelines fail because external market factors, technical discoveries, and organizational resource fluctuations occur continuously. Production-grade strategic planning utilizes Scenario Planning (or Multitrack Planning) to build adaptability directly into the roadmap. This document defines the frameworks, decision trees, python tracking tools, and pivot triggers used to manage target, optimistic, and pessimistic tracks.

## 1. Scenario Planning Model

Scenario planning structures delivery targets across three distinct tracks based on resource availability, velocity confidence, and market dynamics.

```
                         ┌─────────────────────────────┐
                         │   Initial Discovery Phase   │
                         └──────────────┬──────────────┘
                                        │
                                        ▼
                  ┌───────────────────────────────────────────┐
                  │          Scenario Analysis Gate           │
                  └──────┬──────────────┬──────────────┬──────┘
                         │              │              │
        Resource Loss    │              │ Normal       │ Outperformance
        Velocity Drop    ▼              ▼              ▼
     ┌──────────────────────┐  ┌────────────────┐  ┌──────────────────────┐
     │  Pessimistic Track   │  │  Target Track  │  │   Optimistic Track   │
     │  - Core SLO fixes    │  │  - Primary KRs │  │  - Future R&D bets   │
     │  - Must-haves only   │  │  - Core Epics  │  │  - Expansion scale   │
     └──────────────────────┘  └────────────────┘  └──────────────────────┘
```

### Track Definitions

1.  **Pessimistic Track (Commitment / Must-Haves)**
    *   **Probability of Achievement**: $> 90\%$
    *   **Focus**: SLA/SLO enforcement, system stability, high-priority customer contract commitments.
    *   **Resource Allocation**: Minimum footprint, heavily protected.
2.  **Target Track (Planned / Strategic Focus)**
    *   **Probability of Achievement**: $70 - 80\%$
    *   **Focus**: Primary OKRs, standard feature releases, product expansion epics.
    *   **Resource Allocation**: Base team allocation.
3.  **Optimistic Track (Stretch / Strategic Bets)**
    *   **Probability of Achievement**: $50\%$
    *   **Focus**: New product lines, experimental technologies, long-term capability building.
    *   **Resource Allocation**: Dynamic allocation when base objectives are tracking ahead of schedule.

## 2. Pivot Trigger Matrix

Pivot triggers define the explicit conditions under which the product team shifts resources from one track to another. These rules prevent reactive, emotional decision-making when milestones slip.

| Trigger Category | Metric / Condition | Pivot Action |
|---|---|---|
| **Resource Contraction** | Core team headcount decreases by $\ge 20\%$ or budget is cut. | Transition immediately to Pessimistic track. Suspend all Later/Optimistic items. |
| **Velocity Deficit** | Sprint velocity drops below $75\%$ of moving average for 3 consecutive sprints. | Trigger reprioritization. Re-route target track items to the backlog. |
| **Outperformance Gate** | Target OKRs achieved ahead of schedule ($> 90\%$ progress by month 2). | Reallocate excess capacity to Optimistic track bets. |
| **Market Shift** | Major competitor launches a feature that affects customer acquisition rates by $\ge 15\%$. | Initiate product strategy review. Pivot H2 roadmap themes to match feature parity. |
| **Technical Impediment** | Research Spike reveals that architecture requires $\ge 2\times$ estimated effort. | Split initiative. Move core API design to Target and defer complex SDK generation to Later. |

## 3. Scenario Matrix Tracker

Below is a Python implementation of a scenario matrix tracker that automates resource re-allocation and path switching based on active triggers.

```python
import logging
from enum import Enum
from typing import Dict, List, Optional

logger = logging.getLogger("ScenarioTracker")

class TrackMode(Enum):
    PESSIMISTIC = "pessimistic"
    TARGET = "target"
    OPTIMISTIC = "optimistic"

class RoadmapScenarioManager:
    def __init__(self, current_capacity_fte: float):
        self.capacity_fte = current_capacity_fte
        self.initiatives: Dict[str, dict] = {}
        self.active_track = TrackMode.TARGET

    def add_initiative(self, name: str, min_fte: float, target_fte: float, track: TrackMode):
        self.initiatives[name] = {
            "name": name,
            "min_fte": min_fte,
            "target_fte": target_fte,
            "required_track": track,
            "status": "scheduled"
        }

    def evaluate_triggers(self, velocity_ratio: float, team_attrition_fte: float) -> TrackMode:
        """
        Dynamically adjusts the target track mode based on capacity and velocity.
        """
        available_fte = self.capacity_fte - team_attrition_fte
        
        # Scenario 1: Severe capacity degradation
        if available_fte < (self.capacity_fte * 0.8) or velocity_ratio < 0.75:
            logger.warning("Capacity or velocity trigger tripped. Moving to PESSIMISTIC execution mode.")
            self.active_track = TrackMode.PESSIMISTIC
        # Scenario 2: Outperforming expectation
        elif velocity_ratio > 1.15 and team_attrition_fte == 0:
            logger.info("High velocity detected. Enabling OPTIMISTIC roadmap track.")
            self.active_track = TrackMode.OPTIMISTIC
        else:
            self.active_track = TrackMode.TARGET

        return self.active_track

    def get_active_roadmap(self) -> List[dict]:
        """Returns the list of initiatives matching the current track capability."""
        active_items = []
        for name, data in self.initiatives.items():
            req_track = data["required_track"]
            
            # Pessimistic track only does pessimistic work
            if self.active_track == TrackMode.PESSIMISTIC:
                if req_track == TrackMode.PESSIMISTIC:
                    active_items.append(data)
            # Target track does pessimistic and target work
            elif self.active_track == TrackMode.TARGET:
                if req_track in [TrackMode.PESSIMISTIC, TrackMode.TARGET]:
                    active_items.append(data)
            # Optimistic track does everything
            else:
                active_items.append(data)
                
        return active_items
```

## Key Points

- Structure roadmaps dynamically using three parallel tracks (Pessimistic, Target, Optimistic).
- Define numeric, trigger-based pivot points to automate decision execution.
- Maintain a protected "Must-Have" footprint inside the Pessimistic track to defend reliability and core contracts.
- Integrate spike discovery periods early in planning loops to flush out technical complexity before timelines lock.
- Evaluate tracking confidence levels on a recurring sprint cadence to catch drift early.

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with strategic roadmapping, multitrack scenarios, pivot triggers, and tracking logic.
-->
