# Chaos Engineering Practices

## Steady State Validation

```python
import requests
import time
from dataclasses import dataclass
from typing import Dict, List

@dataclass
class ServiceMetrics:
    latency_p99: float
    error_rate: float
    request_rate: float

def measure_steady_state(endpoints: List[str], duration_sec: int = 60) -> Dict[str, ServiceMetrics]:
    """Measure baseline metrics for services."""
    results = {}
    end_time = time.time() + duration_sec

    while time.time() < end_time:
        for endpoint in endpoints:
            start = time.time()
            try:
                response = requests.get(endpoint, timeout=5)
                latency = time.time() - start
                service = endpoint.split("//")[1].split(":")[0]

                if service not in results:
                    results[service] = {"latencies": [], "errors": 0, "count": 0}

                results[service]["latencies"].append(latency)
                results[service]["count"] += 1

                if response.status_code >= 500:
                    results[service]["errors"] += 1

            except requests.RequestException:
                pass

            time.sleep(1)

    metrics = {}
    for service, data in results.items():
        sorted_lats = sorted(data["latencies"])
        p99_idx = int(len(sorted_lats) * 0.99)
        metrics[service] = ServiceMetrics(
            latency_p99=sorted_lats[p99_idx] if sorted_lats else 0,
            error_rate=data["errors"] / max(data["count"], 1),
            request_rate=data["count"] / duration_sec,
        )

    return metrics

def validate_hypothesis(baseline: Dict[str, ServiceMetrics], after: Dict[str, ServiceMetrics]) -> bool:
    """Validate that system meets steady state hypothesis."""
    for service in baseline:
        if service not in after:
            return False
        if after[service].error_rate > baseline[service].error_rate * 1.5:
            return False
        if after[service].latency_p99 > baseline[service].latency_p99 * 2:
            return False
    return True
```

## Experiment Automation

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Workflow
metadata:
  name: chaos-experiment
spec:
  entrypoint: run-experiment
  templates:
    - name: run-experiment
      steps:
        - - name: validate-steady-state
            template: measure-steady-state
        - - name: inject-chaos
            template: inject-pod-failure
        - - name: wait-for-recovery
            template: wait
        - - name: validate-post-chaos
            template: measure-steady-state
        - - name: report
            template: generate-report

    - name: inject-pod-failure
      script:
        image: litmuschaos/chaos-executor:latest
        command: [python]
        source: |
          import subprocess
          experiment_json = {
              "apiVersion": "litmuschaos.io/v1alpha1",
              "kind": "ChaosEngine",
              "metadata": {"name": "pod-failure"},
              "spec": {
                  "appinfo": {
                      "appns": "production",
                      "applabel": f"app={{{chaos_target}}}"
                  },
                  "experiments": [{"name": "pod-delete"}]
              }
          }
          subprocess.run(["kubectl", "apply", "-f", "-"],
                         input=json.dumps(experiment_json).encode())
```

## Key Points

- Define clear hypotheses before experiments
- Measure baseline metrics for steady state
- Implement automated rollback conditions
- Use progressive experimentation (small to large)
- Validate blast radius controls
- Monitor all dependent services during experiments
- Document every experiment with results
- Use game days to practice incident response
- Integrate with incident management tools
- Schedule regular chaos experiments
- Share learnings across engineering teams
- Build dashboards for chaos experiment results
