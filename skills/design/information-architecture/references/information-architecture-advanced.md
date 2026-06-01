# Information Architecture Advanced Topics

## Overview
Advanced IA extends beyond basic navigation to complex taxonomies, faceted classification, cross-domain metadata, content personalization, and AI-assisted navigation.

## Advanced Concepts

### Concept 1: Faceted Classification
Faceted navigation lets users filter content along multiple independent dimensions (type, price, brand, rating, color). Each facet is a category with values. Facets should be mutually exclusive and collectively exhaustive within their dimension. Facet ordering matters: put high-discrimination facets first.

### Concept 2: Taxonomy and Ontology
Taxonomy is a hierarchical classification (parent-child relationships). Ontology is a richer model with typed relationships (is-a, part-of, related-to), constraints, and inference rules. Ontologies enable semantic search, recommendation, and content linking.

### Concept 3: Cross-Domain IA
Single sign-on, cross-site navigation, shared taxonomies, and unified search across product suites. Requires: consistent labeling, shared metadata standards, and a cross-domain navigation framework. Users perceive multiple products as one brand.

### Concept 4: Personalization and Adaptive IA
Content organization adapts to user behavior and context: personalized navigation (frequent items shown first), role-based views, location-aware content, and search results ranked by user history. Personalization must respect privacy and allow opt-out.

### Concept 5: AI-Assisted IA
Machine learning enhances IA through: auto-categorization (classify content into taxonomies), semantic search (understand meaning, not just keywords), recommendation (related content), and content clustering (discover new categories). AI augments, not replaces, human-curated IA.

## Advanced Techniques

### Card Sorting Analysis
- Open card sort: users create their own categories → reveals mental models
- Closed card sort: users place items into predefined categories → validates existing IA
- Hybrid: users can create new categories or use existing ones
- Analyze with: similarity matrix, dendrogram, participant consensus score

### Tree Testing Methodology
- Give users tasks like "Find X" in text-only navigation tree
- Measure: success rate, directness (path length vs optimal), time, first click
- Test before visual design (tests IA, not UI)
- Minimum 20 participants per test round
- Iterate: fix failures, retest

### Search Log Analysis
- Zero-result queries → missing content or wrong labels
- High-frequency queries → should be in navigation
- Query reformulation → labeling mismatch
- Click-through rate on search results → ranking quality
- Export top 100 failing queries monthly, add to navigation

## Anti-Patterns

- Facet overload (too many filter options that don't help)
- Taxonomies that mirror org chart (users don't care about your departments)
- Auto-categorization without human review (garbage categories)
- Personalization without privacy controls
- IA designed for the homepage only (deep pages neglected)
- Navigation that changes behavior without indication
- Search with zero-result queries ignored for months
