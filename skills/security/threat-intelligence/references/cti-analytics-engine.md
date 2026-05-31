# Threat Intelligence: CTI Analytics Engine & Tradecraft Architecture

## Overview

This reference defines the architecture of a cyber threat intelligence analytics engine — the system that transforms raw threat data into actionable intelligence through collection, processing, analysis, and dissemination pipelines. It covers the architectural components, decision frameworks, and trade-off analysis for building production-grade CTI platforms.

## Core Architecture Concepts

### Intelligence Value Chain

```
Data → Information → Intelligence → Knowledge → Wisdom
  │         │            │             │           │
  Raw     Processed   Contextual    Patterns    Decisions
  Feeds   Indicators  TTPs         Campaigns   Strategy
```

Each stage adds analytical value and reduces noise. The architecture must support automated progression through these stages while maintaining analyst-in-the-loop validation at critical decision points.

### CTI Analytics Pipeline Architecture

```
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Collection│──▶│Processing│──▶│ Analysis │──▶│Production│──▶│Dissemina-│
│   Layer   │   │  Layer   │   │  Layer   │   │  Layer   │   │tion Layer│
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
     │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼
 Feeds/APIs    Normalization   Correlation    Reports        SIEM/SOAR
 OSINT/DeepWeb  Dedup/Enrich   TTP Mapping    Briefings     Firewall/EDR
 Commercial     Scoring        Campaign       Indicators     Stakeholders
 Intel          Validation     Attribution    CTF/CTI Notes  Portal

```

### System Components

| Component | Function | Scale Factor | Tech Options |
|-----------|----------|-------------|--------------|
| Feed Ingestion | Collect from 100+ sources | Number of sources | Python scrapers, MISP feeds, TAXII clients |
| Normalization | Convert to STIX 2.1 | Documents/sec | STIX library, custom parser |
| Deduplication | Merge identical indicators | IoC/sec | Bloom filter, Elasticsearch fuzzy match |
| Enrichment | Cross-reference indicators | API calls/sec | OpenCTI connectors, custom enrichment |
| Correlation | Link IoCs to TTPs, campaigns | Graph edges/sec | Neo4j, OpenCTI knowledge graph |
| Scoring | Calculate confidence/relevance | Indicators/sec | ML model, heuristic rules |
| Dissemination | Push to consuming tools | Feeds/sec | TAXII server, MISP sync, custom API |

## Architecture Decision Trees

### Decision 1: Intelligence Platform Selection

```
Question: Build or buy CTI analytics platform?
├── Data volume < 10K IoCs/day
│   ├── Team has Python/security skills?
│   │   ├── Yes → Build custom with MISP + Python + Elastic
│   │   └── No → OpenCTI (self-hosted)
├── Data volume 10K-100K IoCs/day
│   ├── Need collaboration/sharing?
│   │   ├── Yes → OpenCTI + MISP cluster
│   │   └── No → OpenCTI with custom connectors
└── Data volume > 100K IoCs/day
    ├── Compliance requirements?
    │   ├── Strict → Commercial (Recorded Future, ThreatConnect)
    │   └── Flexible → OpenCTI scale-out with dedicated infra
```

### Decision 2: IoC Scoring Model

```
Question: How to score indicator relevance?
├── Heuristic approach
│   ├── Components: Source reputation + age + sightings + context match
│   ├── Pros: Explainable, fast, low compute
│   └── Cons: May miss novel patterns, requires manual tuning
└── ML approach
    ├── Components: Feature vector from indicator metadata + graph features
    ├── Pros: Adapts to new patterns, higher accuracy at scale
    └── Cons: Black box, compute-intensive, needs labeled training data

Hybrid approach recommended: Heuristic for real-time scoring, ML for batch
re-scoring and anomaly detection.
```

### Decision 3: Data Storage Architecture

| Store Type | Data | Query Pattern | Technology |
|-----------|------|--------------|------------|
| Document Store | STIX objects, reports | Full-text search, metadata queries | Elasticsearch, OpenSearch |
| Graph Database | Relationships, TTP mapping | Traversal, path analysis, influence scoring | Neo4j, OpenCTI native |
| Time-Series | IoC first/last seen, sighting counts | Temporal aggregation, trend analysis | TimescaleDB, InfluxDB |
| Blob Store | Raw feeds, reports, artifacts | Write-once, read-rarely | S3, MinIO |
| Cache | Active IoCs, hot enrichment | Key-value, TTL-based | Redis, Memcached |

## Implementation Strategies

### Phase 1: Collection Foundation (Weeks 1-4)
- Deploy MISP instance with community feed subscriptions
- Configure TAXII client for structured feed ingestion
- Build OSINT collection framework (Shodan, Censys, AlienVault OTX)
- Implement feed health monitoring (uptime, latency, volume trends)
- Create feed categorization and priority matrix

### Phase 2: Processing and Normalization (Weeks 5-8)
- Implement STIX 2.1 normalization pipeline
- Build IoC deduplication engine with configurable merge rules
- Deploy enrichment connectors (VT, AbuseIPDB, URLScan)
- Create indicator scoring model
- Implement data quality checks and anomaly detection

### Phase 3: Analysis Capabilities (Weeks 9-16)
- Deploy knowledge graph (OpenCTI or Neo4j)
- Build automated TTP mapping to MITRE ATT&CK
- Implement campaign correlation engine
- Create threat actor profile management
- Deploy analytics dashboard for threat researchers

### Phase 4: Production and Dissemination (Weeks 17-24)
- Build TAXII server for downstream distribution
- Create SIEM integration (automated feed updates)
- Implement SOAR enrichment integration
- Build stakeholder portal and reporting
- Deploy feedback loop for indicator dispositioning

## Integration Patterns

### Feed Ingestion Architecture

```
External Sources → Feed Handler → Normalization → Dedup → Storage
     │                │               │            │        │
     ▼                ▼               ▼            ▼        ▼
 MISP/TAXII     Rate-limited      STIX 2.1     Bloom     Elastic/
 OSINT Scrapers  Retry logic       Mapper       Filter    Neo4j
 Commercial API  Circuit Breaker   Validator    Merge     S3
```

### SIEM Integration Pattern

```
CTI Platform → TAXII Server → SIEM TAXII Client → Correlation Rules
     │              │               │                   │
     ▼              ▼               ▼                   ▼
 New IoCs      TLS 1.3 Auth     Scheduled Pull     IAL: indicators match alerts
 Updated       Client Cert      Paginated          Creates enriched alerts
 Confidence    Rate Limited     Incremental Sync   Tags with intel context
```

### Feedback Loop Pattern

```
SIEM/EDR Detection → Sighting Data → CTI Platform
        │                │                │
        ▼                ▼                ▼
  IoC Matched      Confidence +/-     Update Score
  User/Process      Sighting Count    Adjust Expiry
  Timestamp         Context Tags      Promote/Demote

This closes the intelligence cycle: collection → analysis → dissemination → feedback
```

## Performance Optimization

### Processing Throughput

| Stage | Bottleneck | Optimization Strategy |
|-------|-----------|---------------------|
| Feed Collection | Network bandwidth, API rate limits | Parallel workers per feed, backpressure handling |
| Normalization | CPU for parsing complex formats | Pre-compiled parsers, SIMD for hash computation |
| Deduplication | Memory for bloom filters | Sharded bloom filters, tiered TTL |
| Enrichment | External API latency | Parallel lookup with batching, aggressive caching |
| TTP Mapping | Graph traversal complexity | Pre-computed adjacency, materialized views |
| Scoring | Feature computation | Incremental scoring, pre-computed features |

### Caching Architecture

```
Level 1: Hot Cache (Memory)
- Active IoCs matched in last 24h
- TTL: 1 hour
- Size: 100K entries
- Eviction: LRU

Level 2: Warm Cache (Redis)
- All IoCs with confidence > 80
- TTL: 24 hours  
- Size: 10M entries
- Eviction: TTL + maxmemory

Level 3: Cold Store (Elasticsearch)
- All historical IoCs
- Retention: Configurable (default 1 year)
- Query pattern: Search, not scan
```

## Security Considerations

### Feed Integrity
- All feed sources authenticated via API key or mTLS
- Feed content validated against schema before ingestion
- Anomaly detection on feed volume and content patterns
- Feed poisoning detection: unexpected confidence spikes, known-good indicators flagged as malicious
- Outbound rate limiting to prevent data exfiltration

### TLP Handling
```
TLP:RED → Stored encrypted, limited analyst access, never automated distribution
TLP:AMBER → Stored encrypted, org-wide access, SIEM use only
TLP:GREEN → Stored with standard controls, community sharing enabled
TLP:CLEAR → Full access, public sharing permitted

Architecture: Data classification enforced at storage layer, not just application layer.
Encryption keys per TLP level, access control via IAM policies.
```

## Operational Excellence

### Intelligence Quality Metrics

| Metric | Description | Target | Measurement |
|--------|-------------|--------|-------------|
| False Positive Rate | IoCs that never fire in SIEM | <20% | Sighting data from SIEM |
| Time to Intelligence | Feed to SIEM latency | <5 min | End-to-end monitoring |
| Coverage | ATT&CK techniques with intelligence | >70% | Periodic mapping audit |
| Source Reliability | % of sources meeting SLA | >95% | Feed health monitoring |
| Enrichment Success | % of IoCs successfully enriched | >90% | Enrichment pipeline tracking |
| Analyst Productivity | IoCs processed per analyst-hour | >500 | Case management metrics |

### Intelligence Lifecycle Automation

```
1. Collection (Automated)
   ↓
2. Processing (Automated)
   ↓
3. Analysis (Automated + Analyst Validation)
   ├── Automated: Correlation, scoring, TTP mapping
   └── Analyst: Campaign identification, actor attribution, report writing
   ↓
4. Dissemination (Automated)
   ↓
5. Feedback (Automated from SIEM/SOAR)
   ↓
   ↺ Back to step 1 (confidence updated)
```

## Testing Strategy

### Pipeline Testing
- Unit test each processing stage with known inputs
- Integration test: end-to-end feed → storage → distribution
- Stress test: simulate 10x normal feed volume
- Chaos test: upstream API failures, network partitions
- Data quality test: verify dedup, scoring, and enrichment accuracy

### Content Testing
- STIX 2.1 schema validation for all ingested content
- Cross-reference test: known-good IoCs should score low
- Regression test: re-process historical feed, verify scores unchanged
- TLP boundary test: verify RED data never leaks to GREEN distribution

## Common Pitfalls

| Pitfall | Symptom | Root Cause | Prevention |
|---------|---------|------------|------------|
| Intelligence overload | Analysts overwhelmed | No scoring, all IoCs treated equal | Confidence scoring, tiered analysis |
| Feed decay | Old IoCs still in active blocklist | No expiry management | TTL-based IoC lifecycle |
| Confirmation bias | Only tracking known threats | No strategic intelligence | Balanced strategic/tactical collection |
| Sharing friction | Limited community contribution | Complex sharing agreements | TLP framework, MISP auto-sharing |
| Metric manipulation | Numbers look good, security hasn't improved | Vanity metrics | Outcome-focused metrics (prevention rate) |
| Tool fragmentation | 5 different intel tools, no correlation | No integration strategy | Single pane of glass via OpenCTI |

## Key Takeaways

- Build CTI analytics as a pipeline: Collect → Process → Analyze → Disseminate → Feedback
- Use a hybrid scoring model: heuristic for speed, ML for accuracy at scale
- Store different intelligence types in purpose-built databases (documents, graphs, time-series)
- Close the intelligence feedback loop from detection tools back to the CTI platform
- Implement TLP-level data classification at the storage layer
- Measure intelligence quality by outcomes, not volume
- Automate the entire lifecycle but keep analyst validation for critical decisions
- Design for feed integrity monitoring and poisoning detection
- Use STIX 2.1 as the canonical data model across all pipeline stages

## Related References
- references/cti-lifecycle.md — Intelligence lifecycle management
- references/osint-collection.md — OSINT collection methodology
- references/ti-platforms.md — TIP comparison and selection
- references/ti-sharing.md — Intelligence sharing frameworks
- references/threat-hunting.md — Threat hunting integration
- references/threat-intelligence-fundamentals.md — Foundational concepts
