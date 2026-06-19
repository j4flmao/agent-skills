$skillsDir = "d:\j4flmao-org\skills\harness-engineering"

$missingRefs = @{
    "agent-legibility" = @("progressive-context-disclosure.md", "agent-optimized-readmes.md", "workspace-configuration.md", "codebase-navigation-hints.md")
    "agent-observability" = @("decision-audit-logging.md", "performance-profiling.md", "anomaly-detection-agents.md", "cost-tracking-optimization.md", "latency-analysis-optimization.md")
    "error-recovery" = @("error-taxonomy-classification.md", "retry-strategies.md", "checkpoint-recovery.md", "graceful-degradation.md", "fallback-chain-patterns.md", "dead-letter-processing.md", "error-budget-management.md", "chaos-testing-agents.md")
    "evaluation-testing" = @("hallucination-scoring.md", "eval-dataset-management.md")
    "feedback-loops" = @("output-verification-layers.md", "automated-validation-hooks.md", "correction-trigger-mechanisms.md", "quality-gate-frameworks.md", "continuous-improvement-loops.md")
    "feedforward-controls" = @("anticipatory-error-prevention.md")
    "guardrails-safety" = @("guardrail-testing-validation.md", "guardrail-monitoring-alerting.md")
    "multi-agent-coordination" = @("state-sharing-mechanisms.md", "failure-rate-mitigation.md", "role-specialization-patterns.md", "consensus-coordination.md")
    "sandbox-execution" = @("workspace-isolation.md", "state-persistence-snapshots.md", "filesystem-sandboxing.md", "network-isolation-policies.md", "resource-quota-enforcement.md")
    "tool-orchestration" = @("tool-error-handling.md", "tool-version-compatibility.md")
}

foreach ($skill in $missingRefs.Keys) {
    $skillDir = Join-Path $skillsDir $skill
    $refDir = Join-Path $skillDir "references"
    
    if (-not (Test-Path $refDir)) {
        New-Item -ItemType Directory -Force -Path $refDir | Out-Null
    }
    
    foreach ($file in $missingRefs[$skill]) {
        $filePath = Join-Path $refDir $file
        if (-not (Test-Path $filePath)) {
            $name = [System.IO.Path]::GetFileNameWithoutExtension($file)
            $funcName = $name.Replace("-", "_")
            $content = "# $name`n`n## Purpose`nDetailed documentation for $name.`n`n## Core Principles`n1. Principle 1`n2. Principle 2`n3. Principle 3`n4. Principle 4`n5. Principle 5`n`n## Implementation Details`nCode examples and configurations.`n`n``````python`n# Example implementation`ndef $funcName():`n    pass`n``````"
            Set-Content -Path $filePath -Value $content
            Write-Host "Created $filePath"
        }
    }
}
Write-Host "Done creating missing reference files."
