# Information Architecture Methods Reference

## Card Sorting

Card sorting reveals how users group and label content. Participants organize cards (each representing a content item) into groups that make sense to them.

### Types

| Type | Process | Best For |
|------|---------|----------|
| Open | Users create and name their own groups | New structures, discovery |
| Closed | Users sort into predefined categories | Validating existing structure |
| Hybrid | Users sort into predefined groups but can rename/create | Balance of validation + insight |
| Reverse | Users match content to existing labels | Testing label clarity |

### Sample Size Requirements

| Method | Minimum | Recommended | Notes |
|--------|---------|-------------|-------|
| Open sort | 15 | 30-40 | More participants = better group identification |
| Closed sort | 20 | 30-50 | Statistical significance for category validation |
| Hybrid | 15 | 30-40 | Combination of above |
| Reverse | 20 | 25-35 | Focused on label accuracy |

### Conducting a Card Sort

1. **Prepare cards**: 30-60 cards, each with a content item name and brief description
2. **Recruit participants**: Representative of target users
3. **Moderated (in-person)**: Observe and ask participants to think aloud
4. **Unmoderated (remote)**: Use tools like OptimalSort, UserZoom, or Maze
5. **Analyze results**: Create a similarity matrix and dendrogram, identify cluster patterns

### Analysis Metrics
| Metric | What It Measures |
|--------|-----------------|
| Agreement matrix | Percentage of participants who placed two cards in same group |
| Cluster analysis | Natural groupings emerging from data |
| Category labels | Most common names participants assigned |
| Outliers | Cards that don't fit cleanly into any group |

### Analysis Example
```
Dendrogram (simplified):
Contact Us ─┐
About Us   ─┤── Company Info
Our Team   ─┘
Products   ─┐
Services   ─┤── What We Offer
Pricing    ─┘
Blog       ─── Resources
FAQ        ─── Support
```

## Tree Testing

Tree testing evaluates findability by presenting a text-only hierarchy and asking users where they'd navigate for specific tasks.

### Process
1. Create simplified text hierarchy (no visuals, no search)
2. Define 8-12 realistic tasks (e.g., "Where would you click to change your password?")
3. Participants navigate the tree to find each item
4. Measure success rate, directness, and time

### Metrics
| Metric | Target | Calculation |
|--------|--------|-------------|
| Success rate | >80% | Number of correct answers / total attempts |
| Directness | >70% | Number of direct paths / total attempts |
| Time per task | <15s | Average navigation time |
| First-click | >60% | Correct first click / total attempts |
| Findability index | >0.6 | Composite of success + speed |

### Sample Size
- Minimum: 30 participants per test round
- Optimal: 50 per round
- Iterate: 2-3 rounds with refined trees

## Open vs Closed Sorting

### Open Sorting
**Pros**: Reveals user mental models, discovers unexpected categories, generates new label ideas
**Cons**: More complex analysis, harder to compare across participants, requires more analysis effort

### Closed Sorting
**Pros**: Directly validates proposed structure, easier to analyze quantitatively, good for A/B comparison
**Cons**: May miss alternative structures, assumes categories are correct, limited discovery

### When to Use Each
- **Phase 1 (Discovery)**: Open sort to understand mental models
- **Phase 2 (Validation)**: Closed sort on proposed categories
- **Phase 3 (Refinement)**: Hybrid sort to fine-tune

## First-Click Testing

The first click a user makes determines navigation success more than any other factor.

### First-Click Rule
- A user who clicks the right path on the first attempt has 87% task success rate
- A user who clicks the wrong path on the first attempt has only 46% success rate

### Testing
1. Show users a page or interaction point
2. Ask a task question
3. Present a heat-map or list of clickable options
4. Record only the first click location

## Remote vs Moderated Testing

| Factor | Moderated | Remote Unmoderated |
|--------|-----------|-------------------|
| Cost | Higher (facilitator, equipment) | Lower (tool subscription) |
| Insight depth | High (can probe, follow up) | Moderate (limited to data) |
| Sample size | Smaller (5-15) | Larger (30-100+) |
| Time | Longer per session | Parallel, faster |
| Bias | Moderator influence | Less moderator bias |
| Best for | Exploratory, complex tasks | Validation, quantitative |
| Tools | In-person, video call | OptimalSort, Treejack, UserTesting |

### Recommendation
- **Moderated**: Early IA stages, open card sorts, when you need to understand why
- **Remote unmoderated**: Validation stages, closed card sorts, tree testing, quantitative benchmarks
