# Sitemaps and Taxonomy Reference

## Visual Sitemaps

A visual sitemap is a hierarchical diagram showing all pages/sections and their relationships.

### Sitemap Levels

| Level | Depth | Scope | Examples |
|-------|-------|-------|----------|
| L1 | Top level | Main sections | Home, Products, About, Blog, Contact |
| L2 | Sub-sections | Secondary pages | Product Categories, Team, Services |
| L3 | Detail pages | Individual content | Product detail, Article, Profile |
| L4+ | Nested | Deep content | FAQ answer, Review, Comment |

### Sitemap Notation
```
Home
├── Products
│   ├── Category (listing)
│   │   ├── Product Detail (repeating)
│   │   └── Reviews
│   └── Compare
├── About
│   ├── Our Team
│   ├── Careers
│   └── Press
├── Blog
│   ├── Article (repeating)
│   └── Categories
└── Support
    ├── FAQ
    ├── Contact
    └── Knowledge Base
        └── Article (repeating)
```

### Sitemap Best Practices
- **3-5 levels max**: Users get lost beyond 4 levels deep
- **20-50 items max at each level**: Cognitive load increases with choice count
- **Horizontal breadth over vertical depth**: Wide, shallow is more findable than narrow, deep
- **Label consistently**: Same terminology throughout the sitemap
- **Include page states**: Empty states, error states, authentication-gated pages

## Hierarchical Structures

### Structure Types

| Type | Description | Best For |
|------|-------------|----------|
| Tree | Single parent, multiple children (strict hierarchy) | Corporate sites, documentation |
| Polyhierarchy | Items appear in multiple parent locations | Content sites, knowledge bases |
| Network | Nodes connect via multiple relationships | Wikis, interconnected content |
| Faceted | Multi-dimensional classification | E-commerce, large catalogs |

### Depth vs. Breadth Decision

| Scenario | Recommended | Rationale |
|----------|-------------|-----------|
| Few items (30-50) | 2 levels, broad | Minimize clicks |
| Many items (500+) | 3-4 levels, deep | Manageable per level |
| Task-focused | Shallow (2-3 levels) | Fast task completion |
| Content browsing | Can be deeper (3-4) | Users expect granularity |
| Mobile | Shallow (2 levels max) | Limited screen area |

## Labeling

### Label Types
| Type | Example | Best For |
|------|---------|----------|
| Descriptive | "Our Services" | General clarity |
| Action-oriented | "Get Started" | CTAs, conversions |
| Icon + text | 🛒 Cart | Universal recognition |
| Keyword | "Pricing" | SEO, scanning |
| Metaphor | "Library" for resources | Content-rich sites |

### Label Testing
- **Card sorting**: Do users label groups the same way?
- **First-click test**: Do users click the right label for a task?
- **Comprehension test**: Ask users what a label means
- **A/B test**: Compare click-through on different labels

### Common Labeling Mistakes
- Internal jargon no user understands ("Portal", "Hub")
- Vague labels ("Resources", "Info")
- Creative labels that obscure meaning ("Playground" for support center)
- Inconsistent tense ("Create" vs. "Creation")
- Labels that overlap in meaning ("Products" vs. "Services")

## Synonym Rings

A synonym ring maps alternative terms to the canonical label. Critical for search and navigation.

```yaml
synonym_ring:
  canonical: "Support"
  synonyms:
    - Help
    - Help Center
    - FAQ
    - Customer Service
    - Contact Support
    - Get Help
    - Troubleshooting
    - Knowledge Base
    - Documentation
    - Guides
```

### Building Synonym Rings
1. Analyze search logs (what terms do users search for?)
2. Card sort labels (what terms do participants use?)
3. Domain expertise (what terms do support teams hear?)
4. Industry standards (what terms do competitors use?)

## Polyhierarchy

An item that appears in multiple parent locations in the hierarchy.

```yaml
article: "Using CSS Grid for Layout"
located_in:
  - /tutorials/css/advanced
  - /resources/code/css/grid
  - /topics/layout-techniques
```

### When to Use Polyhierarchy
- Content is relevant to multiple audiences
- Different user paths lead to the same content
- Cross-functional content (e.g., "pricing" is marketing AND sales AND customer support)
- Content tagging creates virtual categories (each tag is a parent)

### Implementation
```sql
-- Polyhierarchy via join table
CREATE TABLE content_hierarchy (
  content_id UUID REFERENCES content(id),
  parent_id UUID REFERENCES categories(id),
  PRIMARY KEY (content_id, parent_id)
);
```

## Cross-References

Related content links that create navigational connections outside the main hierarchy.

```yaml
cross_references:
  article: "Getting Started with React"
  see_also:
    - "React Hooks Guide"          (same section)
    - "Component Design Patterns"  (related topic)
    - "State Management Overview"  (prerequisite concept)
    - "React vs Vue"               (comparison)
```

### Types
| Type | Purpose | Frequency |
|------|---------|-----------|
| See also | Related content on same topic | Per article |
| Prerequisites | Content that should be read first | Tutorials, guides |
| Next steps | Suggested follow-up content | Bottom of articles |
| Related content | Algorithmically linked | Footer of content |
| References | Sources and citations | Academic/technical |

## Taxonomy Governance

```yaml
taxonomy_governance:
  owner: "Content Strategy Team"
  review_cycle: "Quarterly"
  approval_process:
    - "New term proposal submitted"
    - "Review for overlap with existing terms"
    - "Approve or reject within 5 business days"
    - "Publish to taxonomy registry"
  change_management:
    - "Term rename: update all content + redirects"
    - "Term deprecation: 90-day notice, replace in content"
    - "Term merge: consolidate into canonical term"
  audit:
    scrutiny: "Semi-annual content audit"
    metrics:
      - unused_terms (0 target)
      - ambiguous_terms (0 target)
      - orphaned_content without taxonomy assignment (<5%)
```
