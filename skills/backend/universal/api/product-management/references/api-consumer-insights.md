# API Consumer Insights

## Consumer Lifecycle

```
Discovery → Signup → Activation → Adoption → Maturity → Expansion → Advocacy
                                                                         ↓
                                                                   Churn ← Attrition
```

### Lifecycle Stage Detection
```python
class ConsumerLifecycle:
    def detect_stage(self, consumer: dict) -> str:
        days_since_signup = consumer["days_since_signup"]
        days_since_last_call = consumer["days_since_last_call"]
        total_requests = consumer["total_requests"]
        requests_last_30d = consumer["requests_last_30d"]

        if days_since_signup <= 1:
            return "signup"
        if total_requests == 0:
            return "activation_pending"
        if total_requests < 10:
            return "activation"
        if days_since_last_call > 60:
            return "churned"
        if days_since_last_call > 14:
            return "at_risk"
        if requests_last_30d > 10000:
            return "power_user"
        if requests_last_30d > 1000:
            return "active"
        return "casual"
```

## Consumer Health Scoring

### Health Score Components
```python
class ConsumerHealthScore:
    WEIGHTS = {
        "recency": 0.30,         # Days since last call
        "frequency": 0.25,       # Calls per day (30d avg)
        "error_rate": 0.20,      # % of failed requests
        "support_tickets": 0.15, # Open support tickets
        "breadth": 0.10,         # Number of distinct endpoints used
    }

    def compute(self, consumer: dict) -> dict:
        scores = {
            "recency": self.recency_score(consumer["days_since_last_call"]),
            "frequency": self.frequency_score(consumer["requests_per_day_30d"]),
            "error_rate": self.error_rate_score(consumer["error_rate_30d"]),
            "support_tickets": self.support_score(consumer["open_tickets"]),
            "breadth": self.breadth_score(consumer["endpoints_used_30d"], consumer["total_endpoints"]),
        }

        total = sum(scores[k] * self.WEIGHTS[k] for k in scores)

        return {
            "score": round(total, 1),
            "components": scores,
            "health": "healthy" if total >= 80 else "attention" if total >= 60 else "critical",
        }

    def recency_score(self, days: int) -> float:
        if days <= 1: return 100
        if days <= 7: return 80
        if days <= 14: return 60
        if days <= 30: return 40
        return 0

    def frequency_score(self, calls_per_day: float) -> float:
        if calls_per_day >= 100: return 100
        if calls_per_day >= 10: return 80
        if calls_per_day >= 1: return 60
        return 30

    def error_rate_score(self, rate: float) -> float:
        if rate <= 0.001: return 100
        if rate <= 0.01: return 80
        if rate <= 0.05: return 50
        return 0

    def support_score(self, tickets: int) -> float:
        if tickets == 0: return 100
        if tickets == 1: return 70
        if tickets == 2: return 40
        return 0

    def breadth_score(self, used: int, total: int) -> float:
        if total == 0: return 50
        coverage = used / total
        if coverage >= 0.5: return 100
        if coverage >= 0.3: return 80
        if coverage >= 0.1: return 60
        return 40
```

## Consumer Feedback Loop

### Feedback Collection Points
```yaml
feedback_channels:
  in-api:
    - Deprecation notice in response headers
    - Usage tips in response headers (X-API-Usage-Tip)
    - Periodic survey requests (0.1% sampling)

  portal:
    - Documentation feedback ("Was this helpful?")
    - Feature request board
    - Community forum
    - NPS survey (quarterly)

  support:
    - Ticket follow-up survey
    - Churn survey (at account deactivation)
    - Onboarding survey (post-activation)
```

### Feedback Analysis
```python
class FeedbackAnalyzer:
    THEME_KEYWORDS = {
        "documentation": ["docs", "documentation", "example", "tutorial", "guide"],
        "performance": ["slow", "latency", "timeout", "fast"],
        "reliability": ["down", "error", "unavailable", "500", "502"],
        "features": ["missing", "wish", "need", "feature", "support"],
        "sdk": ["sdk", "client", "library", "python", "typescript"],
        "pricing": ["price", "expensive", "cost", "tier", "free"],
    }

    def categorize(self, feedback_text: str) -> list[str]:
        """Categorize feedback into themes."""
        text_lower = feedback_text.lower()
        themes = []
        for theme, keywords in self.THEME_KEYWORDS.items():
            if any(kw in text_lower for kw in keywords):
                themes.append(theme)
        return themes

    def trending_topics(self, period: str = "30d") -> list[dict]:
        """Get trending negative feedback topics."""
        feedback = self.db.fetchall("""
            SELECT theme, COUNT(*) as count
            FROM feedback
            WHERE sentiment = 'negative'
              AND created_at > NOW() - INTERVAL ?
            GROUP BY theme
            ORDER BY count DESC
        """, [period])

        return [{"theme": f["theme"], "count": f["count"]} for f in feedback]
```

## Key Points
- Consumer lifecycle stages (signup → activation → active → power user → churned) guide engagement strategies
- Health scoring combines recency, frequency, error rate, support, and breadth metrics
- Segmentation (power users, growing, declining, dormant, churned) enables targeted interventions
- Churn prediction based on risk factors (errors, latency, support tickets, inactivity)
- Feedback loop across API, portal, and support channels drives continuous improvement
- Topic analysis of feedback identifies systemic issues before they cause churn

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive architectural references & code details preserved)
Strict compliance with API product management, lifecycle standards, DX principles, and governance models.
-->
