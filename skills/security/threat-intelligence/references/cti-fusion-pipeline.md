# Threat Intelligence: Intelligence Fusion Pipeline Architecture

## Overview

Intelligence fusion is the process of combining threat data from multiple sources, domains, and classification levels to produce enriched, correlated, and actionable intelligence. This reference covers the system architecture for building an intelligence fusion pipeline that integrates strategic, operational, tactical, and technical intelligence into a unified knowledge graph.

## Core Architecture Concepts

### Intelligence Fusion Model

Fusion operates across four intelligence domains:

```
Strategic Intel (Board/Exec level)
├── Threat landscape reports
├── Industry-specific risks
├── Regulatory impact analysis
├── Geopolitical threat assessment

Operational Intel (SOC Manager/CSIRT Lead)
├── Campaign tracking
├── Threat actor TTP evolution
├── Sector-specific attack patterns
├── Tool and infrastructure analysis

Tactical Intel (SOC Analyst/Incident Responder)
├── TTP mappings and detection guidance
├── Hunting hypotheses
├── Indicator enrichment context
├── Mitigation recommendations

Technical Intel (Detection Engineer/Platform Team)
├── IoC feeds (IPs, domains, hashes)
├── YARA/Sigma rules
├── Detection logic and signatures
├── Exploit and malware analysis
```

### Fusion Pipeline Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Source Layer                              │
│  OSINT   Commercial   ISACs   Internal Telemetry   Dark Web     │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Ingestion & Normalization                     │
│  Feed Handlers  XML/JSON/CSV → STIX 2.1   Validation/QC       │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Cross-Source Correlation                      │
│  Entity Resolution  Deduplication  Conflict Resolution         │
│  Source Weighting  Temporal Alignment                          │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Fusion Engine                                 │
│  Graph Merge   Relationship Inference  Confidence Aggregation   │
│  Temporal Fusion  Multi-INT Correlation                        │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Knowledge Graph                               │
│  Entities   Relationships   Campaigns   Threat Actors           │
│  TTPs  Tools  Infrastructure  Victims                          │
└──────────────────────────┬──────────────────────────────────────┘
                           ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Dissemination & Feedback                      │
│  TAXII   MISP   SIEM Feeds   Reports   Alert Enrichment         │
└─────────────────────────────────────────────────────────────────┘
```

## Architecture Decision Trees

### Decision 1: Entity Resolution Strategy

```
Question: How to determine if two indicators from different sources represent the same entity?
├── Deterministic matching
│   ├── Exact match: hash, IP, domain, email
│   ├── Normalized match: lowercase domain, expanded IP ranges
│   └── Pros: Zero false positives, simple implementation
│       Cons: Misses fuzzy matches, typos, variations
├── Probabilistic matching
│   ├── Token-based: Jaccard similarity for domain names
│   ├── Edit distance: Levenshtein for similar hashes
│   └── Pros: Catches variations, fuzzy matches
│       Cons: False positives, compute-intensive
└── ML-based matching
    ├── Feature-rich comparison using graph context
    ├── Pros: Highest recall, adapts to new patterns
    └── Cons: Requires labeled data, black box

Recommendation: Deterministic for technical IoCs, probabilistic for threat actors
and campaigns, ML for complex TTP correlation.
```

### Decision 2: Confidence Aggregation

```
Question: How to combine confidence scores from multiple sources?
├── Weighted average
│   ├── weight_sum(confidence_i * source_weight_i) / sum(weights)
│   ├── Pros: Simple, explainable
│   └── Cons: Assumes independent sources
├── Bayesian fusion
│   ├── P(real|evidence) = P(evidence|real) * P(real) / P(evidence)
│   ├── Pros: Theoretically sound, handles conflicting evidence
│   └── Cons: Requires prior probabilities, complex
├── Dempster-Shafer theory
│   ├── Handles uncertainty and ignorance explicitly
│   ├── Pros: No prior needed, handles conflicting sources
│   └── Cons: Computationally expensive, counter-intuitive results

Recommendation: Weighted average for real-time, Bayesian for batch analysis,
Dempster-Shafer for high-stakes decisions.
```

### Decision 3: Multi-INT Correlation

```
Question: Correlate across intelligence disciplines?
├── SIGINT (Signals Intelligence)
│   ├── C2 communications, protocol analysis
│   └── Integration: network flow data
├── HUMINT (Human Intelligence)
│   ├── Analyst reports, partner intel
│   └── Integration: structured reports
├── TECHINT (Technical Intelligence)
│   ├── Malware analysis, forensic artifacts
│   └── Integration: malware sandbox, reverse engineering
├── OSINT (Open Source Intelligence)
│   ├── Social media, forums, paste sites
│   └── Integration: scrapers, crawlers

Fusion approach: Map all INT types to common STIX objects, then use
graph-based correlation to link related entities across disciplines.
```

## Implementation Strategies

### Phase 1: Source Integration (Weeks 1-6)
- Map all available intelligence sources with quality scoring
- Implement STIX 2.1 normalization for all sources
- Deploy source health monitoring and alerting
- Create source catalog with metadata (TLP, coverage, refresh rate, reliability)

### Phase 2: Correlation Engine (Weeks 7-14)
- Build entity resolution service with deterministic matching
- Implement cross-source deduplication with configurable merge rules
- Deploy confidence aggregation engine
- Create temporal fusion for time-series intelligence data

### Phase 3: Knowledge Graph (Weeks 15-22)
- Design graph schema (STIX 2.1 compatible)
- Implement graph merge algorithms
- Build relationship inference engine
- Deploy graph query interface (GraphQL, Gremlin, or Cypher)

### Phase 4: Multi-INT Fusion (Weeks 23-30)
- Integrate non-technical intelligence sources
- Build cross-discipline correlation rules
- Implement strategic intelligence ingestion
- Create fusion quality metrics dashboard

## Integration Patterns

### Cross-Source Entity Resolution

```
Source A: IP 203.0.113.5 → C2 server (confidence: 85)
Source B: IP 203.0.113.5/32 → Command & Control (confidence: 92)

Fusion Output:
  Entity: IP 203.0.113.5
  Type: IPv4Address
  Role: C2 Server
  Confidence: 91 (weighted: A×0.4 + B×0.6)
  Evidence: [Source A, Source B]
  First Seen: min(A.timestamp, B.timestamp)
  Last Seen: max(A.timestamp, B.timestamp)
  Tags: [C2, MalwareNetwork, Active]
```

### Campaign Fusion Pattern

```
Input Sources:
  A: Phishing campaign targeting finance sector
  B: Malware sample with unique C2 protocol
  C: Network detection of C2 beacon on finance subnet

Fusion:
  Link: Phishing email → delivered malware hash
  Link: Malware hash → C2 domain
  Link: C2 domain → finance subnet beacon
  Result: Complete campaign with kill chain
  ATT&CK: T1566 (Phishing) → T1204 (User Execution) → T1071 (C2)
```

### Temporal Fusion Pattern

```
Indicator: 203.0.113.5
Timeline:
  Day 1: Source A reports as C2 (confidence: 70)
  Day 3: Source B also reports (confidence: 85)
  Day 7: Source C reports sinkhole (confidence: 90)
  Day 10: Source D reports as legitimate (confidence: 60)

Fusion Algorithm:
  Day 1-3: Confidence increases, more sources agree
  Day 7: Sinkhole detection → change label to "Sinkhole"
  Day 10: Conflicting source → investigate (DNS change?)
  
  Decision: Accept sinkhole label, reduce confidence on malicious
  classification, maintain historical view.
```

## Performance Optimization

### Fusion Throughput

| Stage | Bottleneck | Strategy |
|-------|-----------|----------|
| Entity Resolution | Comparison matrix O(n²) | Blocking keys, minhash LSH, parallel batches |
| Graph Merge | Write contention on hot nodes | Partitioned graph, eventual consistency |
| Confidence Update | Recalculation cascade | Incremental updates, bounded propagation |
| Temporal Fusion | Time-series query performance | Pre-aggregated time buckets, materialized views |
| Relationship Inference | Graph traversal depth | Limit traversal depth, indexed adjacency |

### Graph Partitioning Strategy

```
Partition by:
├── Domain (technical, operational, strategic)
├── Source TLP level (RED, AMBER, GREEN, CLEAR)
├── Time window (hot: last 7d, warm: 7-90d, cold: >90d)
└── Entity type (indicators, TTPs, actors, campaigns)

Hot partition: In-memory, full-text and graph indexes
Warm partition: SSD-backed, compressed indexes
Cold partition: HDD/S3, minimal indexes, query on demand
```

## Security Considerations

### Multi-Level Security

```
TLP:RED fusion
├── Only with authenticated, same-TLP sources
├── Output remains TLP:RED
├── Separate encrypted storage partition
└── Analyst access: named individuals only

Cross-TLP fusion
├── RED + AMBER = RED (highest classification)
├── AMBER + GREEN = AMBER
├── GREEN + CLEAR = GREEN
└── Rule: Output inherits highest TLP of any input

Sanitization pipeline
├── Remove PII before fusion
├── Strip source-identifying metadata
├── Apply data minimization at each fusion stage
└── Audit trail for all fusion operations
```

### Fusion Pipeline Security
- End-to-end encryption for cross-source data transfer
- Input validation and sanitization at every ingestion point
- Anomaly detection on fused output (sudden confidence changes)
- Access control at entity level, not just source level
- Immutable audit log of all fusion decisions

## Operational Excellence

### Fusion Quality Metrics

| Metric | What It Measures | Target |
|--------|-----------------|--------|
| Entity Resolution Accuracy | Correct merges / total merges | >99% |
| Fusion Latency | Source to fused output | <5 min |
| Cross-Source Coverage | % entities with 2+ sources | >80% |
| Conflict Rate | % entities with conflicting evidence | <5% |
| False Fusion Rate | Incorrect entity merges detected | <0.1% |
| Graph Completeness | % expected relationships present | >90% |

### Fusion Operations
- Daily quality review of automated fusion decisions
- Weekly manual review of high-confidence conflict cases
- Monthly source quality reassessment
- Quarterly fusion algorithm recalibration
- Annual architecture review with new source integration

## Testing Strategy

### Fusion Testing
- **Unit tests**: Individual fusion algorithms with known inputs/outputs
- **Regression tests**: Re-fuse historical data, verify unchanged results
- **Conflict resolution tests**: Feed conflicting data, verify correct handling
- **Performance tests**: 10x normal data volume, measure latency
- **Security tests**: Verify TLP boundaries, data leakage, sanitization

### Quality Assurance
- Random sample of 100 fusion decisions reviewed weekly
- Automated alerts for unexpected confidence shifts
- Regular cross-validation against manual analyst fusion
- Source quality degradation monitoring

## Common Pitfalls

| Pitfall | Symptom | Root Cause | Prevention |
|---------|---------|------------|------------|
| Entity confusion | Different actors merged as one | Overly aggressive matching | Conservative thresholds, manual review |
| Source poisoning | Bad data degrades quality | No source vetting | Source reliability scoring, anomaly detection |
| Temporal blindness | Old data treated as current | No time-weighting | Time-decay in confidence scoring |
| Feedback suppression | Confidence never decreases | No negative feedback | Sighting-based confidence adjustment |
| Fusion cascade | One bad merge corrupts graph | Propagation without validation | Incremental fusion with rollback |
| TLP leakage | RED data in GREEN distribution | Classification failures | Storage-level TLP enforcement |

## Key Takeaways

- Intelligence fusion combines four domains: strategic, operational, tactical, technical
- Use entity resolution strategies appropriate to data type: deterministic for IoCs, probabilistic for actors, ML for complex patterns
- Aggregate confidence with weighted average for speed, Bayesian for accuracy
- Fuse all intelligence disciplines into a unified STIX 2.1 knowledge graph
- Implement multi-level security with strict TLP inheritance rules
- Partition the graph by domain, TLP, time, and entity type for performance
- Monitor fusion quality with precision, recall, and coverage metrics
- Close the feedback loop to continuously improve confidence and relevance
- Design for rollback and auditability of all fusion decisions

## Related References
- references/cti-lifecycle.md — Intelligence lifecycle
- references/ti-sharing.md — Sharing frameworks
- references/ti-platforms.md — Platform selection
- references/threat-hunting.md — Hunting integration
- references/threat-intelligence-fundamentals.md — Foundational concepts
- references/threat-intelligence-advanced.md — Advanced patterns
