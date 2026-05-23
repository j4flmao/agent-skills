# Architecture Decision Framework

## Decision Process

### Step 1: Gather Context
- Business goals and constraints
- Technical requirements (functional + non-functional)
- Team size and expertise
- Timeline and budget
- Existing systems and integration points

### Step 2: Identify Architecture Characteristics
Rank the following by importance (1-5) for the specific system:

| Characteristic | Rank (1-5) | Notes |
|----------------|-----------|-------|
| Availability | | Uptime requirements, SLA |
| Scalability | | Users, data volume, growth rate |
| Performance | | Latency targets, throughput |
| Security | | Compliance, data sensitivity |
| Maintainability | | Team size, change frequency |
| Deployability | | Release frequency, CI/CD maturity |
| Testability | | Test automation level |
| Cost | | Infrastructure, operational budget |
| Time-to-market | | Deadline pressure |
| Evolvability | | Expected lifespan, future changes |

### Step 3: Generate Options
- Identify 2-3 viable architecture options
- Map each option to the ranked characteristics
- Consider integration with existing systems

### Step 4: Evaluate Trade-offs
For each option, document:
- **Pros**: Which NFRs it satisfies well
- **Cons**: Which NFRs it compromises
- **Risks**: Technical, schedule, team capability
- **Cost**: Relative development + operational cost

### Step 5: Decide
- Select the option with the best overall fit
- Document the decision as an ADR
- Include rejected alternatives with reasoning

### Step 6: Enforce
- Use architecture tests (ArchUnit, ArchTest)
- Code review checklist for architecture compliance
- Regular architecture review (quarterly)

## Evaluation Techniques

### ATAM (Architecture Trade-off Analysis Method)
1. Present architecture
2. Identify architectural approaches
3. Generate quality attribute utility tree
4. Analyze architectural approaches against quality attributes
5. Identify trade-offs, sensitivity points, and risks

### Decision Matrix
| Criteria | Weight | Option A | Option B | Option C |
|----------|--------|----------|----------|----------|
| Scalability | 30% | 8 | 6 | 9 |
| Maintainability | 25% | 7 | 9 | 5 |
| Time-to-market | 20% | 9 | 6 | 4 |
| Cost | 15% | 6 | 7 | 3 |
| Security | 10% | 7 | 8 | 8 |
| **Total** | **100%** | **7.55** | **7.0** | **5.95** |

### Lightweight ARID (for partial architectures)
- For component-level or interface-level decisions
- Focus on specific quality attributes relevant to that component
- Shorter cycle than full ATAM
