# Verifier Agent Patterns

## Foundations of Verification Agents

Verification agents are dedicated LLM agents whose sole purpose is to validate, cross-check, and certify the outputs of primary generation agents. Unlike LLM-as-judge patterns (which score outputs), verifier agents actively investigate claims, execute validation logic, and produce structured verification reports with evidence chains.

The key distinction:
- **LLM-as-Judge**: Scores outputs on subjective dimensions using rubrics
- **Verifier Agent**: Actively verifies factual claims, logical consistency, and code correctness through execution and cross-referencing

```
+-------------------------------------------------------------------+
|                    VERIFIER AGENT TOPOLOGY                          |
+-------------------------------------------------------------------+
|                                                                     |
|  [Generator Agent] ──► Output ──► [Verifier Agent] ──► Verdict     |
|                                        │                            |
|                                   ┌────┴────┐                      |
|                                   │         │                      |
|                              [Tool Call]  [Cross-Ref]              |
|                              (execute)    (search)                 |
|                                   │         │                      |
|                                   └────┬────┘                      |
|                                        ▼                            |
|                                  Evidence Chain                     |
|                                                                     |
+-------------------------------------------------------------------+
```

---

## Verifier Architecture Patterns

### Pattern 1: Single Verifier (Serial)

A single verification agent reviews the output after generation.

```
[Generator] ──► [Output] ──► [Verifier] ──► [Verdict: PASS/FAIL]
                                  │
                             Uses tools:
                             - Code executor
                             - Web search
                             - Database lookup
                             - Schema validator
```

**Use When**: Simple outputs with clear verification criteria (code, factual claims, math).

### Pattern 2: Multi-Aspect Verifier (Parallel)

Multiple specialized verifiers run in parallel, each checking a different aspect.

```
                         ┌──► [Factual Verifier]    ──► fact_verdict
                         │
[Generator] ──► [Output] ├──► [Logic Verifier]      ──► logic_verdict
                         │
                         ├──► [Safety Verifier]      ──► safety_verdict
                         │
                         └──► [Style Verifier]       ──► style_verdict
                                                              │
                                                     [Verdict Aggregator]
                                                              │
                                                        FINAL VERDICT
```

**Use When**: Complex outputs requiring different expertise domains for verification.

### Pattern 3: Adversarial Debate

Two agents debate the correctness of an output, with a judge deciding the winner.

```
[Generator] ──► [Output] ──► [Advocate Agent] ──► "Output is correct because..."
                                                          │
                         ──► [Critic Agent]    ──► "Output is wrong because..."
                                                          │
                                              [Judge Agent] ──► Final Verdict
```

**Use When**: Ambiguous outputs where correctness depends on interpretation or assumptions.

### Pattern 4: Iterative Refinement Verifier

The verifier provides feedback, and the generator revises until the verifier approves or a max iteration limit is reached.

```
[Generator] ──► [Output v1] ──► [Verifier] ──► FAIL: "Missing error handling"
     ▲                                              │
     │                                              │
     └──────────── Feedback Loop ──────────────────┘
                                                    │
[Generator] ──► [Output v2] ──► [Verifier] ──► PASS
```

**Use When**: Code generation, document drafting, or any task where iterative improvement is expected.

---

## Python Implementation

```python
import json
import subprocess
import tempfile
import os
import time
from typing import List, Dict, Any, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
from pathlib import Path

class VerificationStatus(Enum):
    PASS = "pass"
    FAIL = "fail"
    PARTIAL = "partial"
    ERROR = "error"
    SKIPPED = "skipped"

@dataclass
class VerificationCheck:
    name: str
    description: str
    status: VerificationStatus
    evidence: str
    confidence: float
    latency_ms: float
    details: Dict[str, Any] = field(default_factory=dict)

@dataclass
class VerificationReport:
    output_id: str
    overall_status: VerificationStatus
    checks: List[VerificationCheck]
    total_checks: int
    passed_checks: int
    failed_checks: int
    overall_confidence: float
    total_latency_ms: float
    recommendations: List[str] = field(default_factory=list)

class CodeExecutionVerifier:
    """
    Verifies code outputs by actually executing them and checking results
    against expected behavior.
    """
    
    def __init__(self, timeout_seconds: int = 30, sandbox_dir: Optional[str] = None):
        self.timeout = timeout_seconds
        self.sandbox_dir = sandbox_dir or tempfile.mkdtemp(prefix="verifier_")
    
    def verify_python_code(
        self,
        code: str,
        test_cases: List[Dict[str, Any]],
        expected_no_errors: bool = True
    ) -> VerificationCheck:
        """
        Executes Python code and runs test cases against it.
        """
        start = time.time()
        
        # Write code to temp file
        code_file = os.path.join(self.sandbox_dir, "solution.py")
        with open(code_file, "w") as f:
            f.write(code)
        
        # Build test runner
        test_code = f"""
import sys
sys.path.insert(0, '{self.sandbox_dir}')
from solution import *
import json

results = []
test_cases = {json.dumps(test_cases)}

for i, tc in enumerate(test_cases):
    try:
        func_name = tc.get("function", "main")
        args = tc.get("args", [])
        kwargs = tc.get("kwargs", {{}})
        expected = tc.get("expected")
        
        func = globals().get(func_name) or locals().get(func_name)
        if func is None:
            results.append({{"test": i, "status": "error", "message": f"Function '{{func_name}}' not found"}})
            continue
        
        actual = func(*args, **kwargs)
        
        if expected is not None and actual == expected:
            results.append({{"test": i, "status": "pass", "actual": str(actual)}})
        elif expected is not None:
            results.append({{"test": i, "status": "fail", "expected": str(expected), "actual": str(actual)}})
        else:
            results.append({{"test": i, "status": "pass", "actual": str(actual), "note": "no expected value"}})
    except Exception as e:
        results.append({{"test": i, "status": "error", "message": str(e)}})

print(json.dumps(results))
"""
        test_file = os.path.join(self.sandbox_dir, "test_runner.py")
        with open(test_file, "w") as f:
            f.write(test_code)
        
        try:
            result = subprocess.run(
                ["python", test_file],
                capture_output=True,
                text=True,
                timeout=self.timeout,
                cwd=self.sandbox_dir
            )
            
            latency = (time.time() - start) * 1000
            
            if result.returncode != 0 and expected_no_errors:
                return VerificationCheck(
                    name="code_execution",
                    description="Execute code and run test cases",
                    status=VerificationStatus.FAIL,
                    evidence=f"Execution failed: {result.stderr[:500]}",
                    confidence=1.0,
                    latency_ms=latency,
                    details={"stderr": result.stderr, "returncode": result.returncode}
                )
            
            test_results = json.loads(result.stdout)
            passed = sum(1 for t in test_results if t["status"] == "pass")
            total = len(test_results)
            
            status = VerificationStatus.PASS if passed == total else (
                VerificationStatus.PARTIAL if passed > 0 else VerificationStatus.FAIL
            )
            
            return VerificationCheck(
                name="code_execution",
                description="Execute code and run test cases",
                status=status,
                evidence=f"Passed {passed}/{total} test cases",
                confidence=passed / total if total > 0 else 0.0,
                latency_ms=latency,
                details={"test_results": test_results, "pass_rate": passed/total if total > 0 else 0.0}
            )
            
        except subprocess.TimeoutExpired:
            latency = (time.time() - start) * 1000
            return VerificationCheck(
                name="code_execution",
                description="Execute code and run test cases",
                status=VerificationStatus.FAIL,
                evidence=f"Execution timed out after {self.timeout}s",
                confidence=1.0,
                latency_ms=latency
            )
        except Exception as e:
            latency = (time.time() - start) * 1000
            return VerificationCheck(
                name="code_execution",
                description="Execute code and run test cases",
                status=VerificationStatus.ERROR,
                evidence=f"Verification error: {str(e)}",
                confidence=0.0,
                latency_ms=latency
            )

class SchemaVerifier:
    """Verifies that agent outputs conform to expected JSON schemas."""
    
    def verify_json_schema(
        self,
        output: str,
        schema: Dict[str, Any]
    ) -> VerificationCheck:
        """
        Validates output against a JSON schema.
        """
        start = time.time()
        
        try:
            parsed = json.loads(output)
        except json.JSONDecodeError as e:
            return VerificationCheck(
                name="json_schema",
                description="Validate output against JSON schema",
                status=VerificationStatus.FAIL,
                evidence=f"Invalid JSON: {str(e)}",
                confidence=1.0,
                latency_ms=(time.time() - start) * 1000
            )
        
        errors = self._validate_schema(parsed, schema, path="$")
        latency = (time.time() - start) * 1000
        
        if not errors:
            return VerificationCheck(
                name="json_schema",
                description="Validate output against JSON schema",
                status=VerificationStatus.PASS,
                evidence="Output conforms to schema",
                confidence=1.0,
                latency_ms=latency
            )
        
        return VerificationCheck(
            name="json_schema",
            description="Validate output against JSON schema",
            status=VerificationStatus.FAIL,
            evidence=f"Schema violations: {'; '.join(errors[:5])}",
            confidence=1.0,
            latency_ms=latency,
            details={"errors": errors}
        )
    
    def _validate_schema(self, data: Any, schema: Dict, path: str) -> List[str]:
        """Simple recursive schema validator."""
        errors = []
        expected_type = schema.get("type")
        
        type_map = {
            "string": str, "number": (int, float), "integer": int,
            "boolean": bool, "array": list, "object": dict
        }
        
        if expected_type and expected_type in type_map:
            if not isinstance(data, type_map[expected_type]):
                errors.append(f"{path}: expected {expected_type}, got {type(data).__name__}")
                return errors
        
        if expected_type == "object" and "properties" in schema:
            for prop, prop_schema in schema["properties"].items():
                if prop in (schema.get("required") or []) and prop not in data:
                    errors.append(f"{path}.{prop}: required property missing")
                elif prop in data:
                    errors.extend(self._validate_schema(data[prop], prop_schema, f"{path}.{prop}"))
        
        if expected_type == "array" and "items" in schema and isinstance(data, list):
            for i, item in enumerate(data):
                errors.extend(self._validate_schema(item, schema["items"], f"{path}[{i}]"))
        
        return errors


class VerifierOrchestrator:
    """
    Orchestrates multiple verification checks and produces a unified report.
    """
    
    def __init__(self):
        self.code_verifier = CodeExecutionVerifier()
        self.schema_verifier = SchemaVerifier()
        self.custom_verifiers: List[Callable] = []
    
    def add_custom_verifier(self, verifier_fn: Callable[[str], VerificationCheck]):
        """Register a custom verification function."""
        self.custom_verifiers.append(verifier_fn)
    
    def verify(
        self,
        output: str,
        output_id: str,
        checks: List[Dict[str, Any]]
    ) -> VerificationReport:
        """
        Run all configured verification checks on an output.
        
        checks: List of check configs like:
          {"type": "code_execution", "test_cases": [...]}
          {"type": "json_schema", "schema": {...}}
          {"type": "custom", "verifier_index": 0}
        """
        results: List[VerificationCheck] = []
        total_latency = 0.0
        
        for check_config in checks:
            check_type = check_config["type"]
            
            if check_type == "code_execution":
                result = self.code_verifier.verify_python_code(
                    code=output,
                    test_cases=check_config.get("test_cases", [])
                )
            elif check_type == "json_schema":
                result = self.schema_verifier.verify_json_schema(
                    output=output,
                    schema=check_config.get("schema", {})
                )
            elif check_type == "custom" and check_config.get("verifier_index") is not None:
                idx = check_config["verifier_index"]
                if idx < len(self.custom_verifiers):
                    result = self.custom_verifiers[idx](output)
                else:
                    result = VerificationCheck(
                        name="custom",
                        description="Custom verifier",
                        status=VerificationStatus.ERROR,
                        evidence=f"Verifier index {idx} out of range",
                        confidence=0.0,
                        latency_ms=0.0
                    )
            else:
                result = VerificationCheck(
                    name=check_type,
                    description=f"Unknown check type: {check_type}",
                    status=VerificationStatus.SKIPPED,
                    evidence="Check type not recognized",
                    confidence=0.0,
                    latency_ms=0.0
                )
            
            results.append(result)
            total_latency += result.latency_ms
        
        passed = sum(1 for r in results if r.status == VerificationStatus.PASS)
        failed = sum(1 for r in results if r.status == VerificationStatus.FAIL)
        total = len(results)
        
        if failed > 0:
            overall = VerificationStatus.FAIL
        elif passed == total:
            overall = VerificationStatus.PASS
        else:
            overall = VerificationStatus.PARTIAL
        
        overall_confidence = sum(r.confidence for r in results) / total if total > 0 else 0.0
        
        recommendations = []
        for r in results:
            if r.status == VerificationStatus.FAIL:
                recommendations.append(f"Fix {r.name}: {r.evidence}")
        
        return VerificationReport(
            output_id=output_id,
            overall_status=overall,
            checks=results,
            total_checks=total,
            passed_checks=passed,
            failed_checks=failed,
            overall_confidence=overall_confidence,
            total_latency_ms=total_latency,
            recommendations=recommendations
        )
```

---

## Multi-Agent Debate Protocol

### Debate Configuration Schema

```yaml
debate_config:
  max_rounds: 3
  advocate_model: "claude-3-5-sonnet"
  critic_model: "gpt-4o"
  judge_model: "claude-3-5-sonnet"
  
  advocate_system_prompt: |
    You are an advocate. Your job is to defend the following output as correct.
    Provide specific evidence and reasoning for why the output is valid.
    Be honest - if you find genuine issues, acknowledge them.
  
  critic_system_prompt: |
    You are a critic. Your job is to find problems with the following output.
    Look for factual errors, logical inconsistencies, missing information,
    and potential issues. Be thorough but fair.
  
  judge_system_prompt: |
    You are a judge. Review the debate between the advocate and critic.
    Determine whether the original output is correct based on the arguments presented.
    
  early_termination:
    enabled: true
    consensus_threshold: 0.9
```

### Debate Implementation

```python
@dataclass
class DebateRound:
    round_number: int
    advocate_argument: str
    critic_argument: str
    
@dataclass 
class DebateVerdict:
    verdict: VerificationStatus
    confidence: float
    reasoning: str
    rounds: List[DebateRound]
    consensus_reached: bool

class DebateVerifier:
    """
    Implements adversarial debate verification between
    advocate and critic agents, with a judge deciding.
    """
    
    def __init__(self, llm_client, config: Dict[str, Any]):
        self.llm = llm_client
        self.config = config
        self.max_rounds = config.get("max_rounds", 3)
    
    def run_debate(
        self,
        output: str,
        task_description: str,
        context: str = ""
    ) -> DebateVerdict:
        rounds = []
        
        debate_history = f"## Output Under Review\n{output}\n\n## Task\n{task_description}\n"
        if context:
            debate_history += f"\n## Context\n{context}\n"
        
        for round_num in range(self.max_rounds):
            # Advocate argues for correctness
            advocate_prompt = f"""{self.config['advocate_system_prompt']}

{debate_history}

{"## Previous Debate" if rounds else ""}
{self._format_history(rounds)}

Present your argument for Round {round_num + 1}. Respond in JSON:
{{"argument": "<your argument>", "confidence": <0.0-1.0>}}"""
            
            advocate_response = self.llm.complete(
                advocate_prompt,
                model=self.config.get("advocate_model", "gpt-4o"),
                temperature=0.3
            )
            advocate_parsed = json.loads(advocate_response)
            
            # Critic argues against
            critic_prompt = f"""{self.config['critic_system_prompt']}

{debate_history}

## Advocate's Argument (Round {round_num + 1})
{advocate_parsed['argument']}

{"## Previous Debate" if rounds else ""}
{self._format_history(rounds)}

Present your counter-argument. Respond in JSON:
{{"argument": "<your counter-argument>", "confidence": <0.0-1.0>}}"""
            
            critic_response = self.llm.complete(
                critic_prompt,
                model=self.config.get("critic_model", "gpt-4o"),
                temperature=0.3
            )
            critic_parsed = json.loads(critic_response)
            
            round_record = DebateRound(
                round_number=round_num + 1,
                advocate_argument=advocate_parsed["argument"],
                critic_argument=critic_parsed["argument"]
            )
            rounds.append(round_record)
            
            # Check for early consensus
            if (advocate_parsed.get("confidence", 0) > 0.9 and 
                critic_parsed.get("confidence", 0) < 0.3):
                break
        
        # Judge makes final verdict
        judge_prompt = f"""{self.config['judge_system_prompt']}

{debate_history}

## Complete Debate
{self._format_history(rounds)}

Render your verdict. Respond in JSON:
{{
  "verdict": "pass" or "fail" or "partial",
  "confidence": <0.0-1.0>,
  "reasoning": "<your reasoning>"
}}"""
        
        judge_response = self.llm.complete(
            judge_prompt,
            model=self.config.get("judge_model", "gpt-4o"),
            temperature=0.1
        )
        judge_parsed = json.loads(judge_response)
        
        status_map = {
            "pass": VerificationStatus.PASS,
            "fail": VerificationStatus.FAIL,
            "partial": VerificationStatus.PARTIAL
        }
        
        return DebateVerdict(
            verdict=status_map.get(judge_parsed["verdict"], VerificationStatus.ERROR),
            confidence=judge_parsed["confidence"],
            reasoning=judge_parsed["reasoning"],
            rounds=rounds,
            consensus_reached=len(rounds) < self.max_rounds
        )
    
    def _format_history(self, rounds: List[DebateRound]) -> str:
        lines = []
        for r in rounds:
            lines.append(f"### Round {r.round_number}")
            lines.append(f"**Advocate**: {r.advocate_argument}")
            lines.append(f"**Critic**: {r.critic_argument}")
            lines.append("")
        return "\n".join(lines)
```

---

## Best Practices

1. **Use execution-based verification for code**: LLM judges are poor at catching subtle code bugs. Always execute code and run test cases.
2. **Separate generation and verification models**: Using different model families reduces self-enhancement bias.
3. **Limit debate rounds**: More than 3 rounds rarely improves verdict quality and increases cost linearly.
4. **Cache verification results**: Identical outputs should not be re-verified. Use content hashing for cache keys.
5. **Log all evidence chains**: Verification evidence must be preserved for audit trails and debugging.

---

## Handoff & Related References
- LLM-as-Judge Patterns: [llm-as-judge-patterns.md](llm-as-judge-patterns.md)
- Hallucination Scoring: [hallucination-scoring.md](hallucination-scoring.md)
- Trajectory Evaluation: [trajectory-evaluation.md](trajectory-evaluation.md)

<!-- COMPRESSION FOOTER -->
<!--
Compression Level: 5 (Comprehensive verifier patterns & implementation code preserved)
-->
