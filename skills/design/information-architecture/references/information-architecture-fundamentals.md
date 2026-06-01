# Information Architecture Fundamentals

## Overview
Information Architecture (IA) is the practice of organizing, structuring, and labeling content to help users find information and complete tasks effectively. This reference covers fundamental concepts, frameworks, and best practices.

## Core Concepts

### Concept 1: Content Organization
Content can be organized by: hierarchy (taxonomy), equivalence (folksonomy/tags), chronology (time-based), geography (location-based), or audience (role-based). Pick the schema that matches the user's mental model, not the organization's internal structure.

### Concept 2: Navigation Systems
Navigation includes global navigation (main menu), local navigation (section-specific), contextual navigation (related links), and supplemental navigation (sitemaps, search, breadcrumbs). Each serves a different user need and should be designed intentionally.

### Concept 3: Labeling Systems
Labels must be user-centered, not organization-centered. Use the user's vocabulary (what they would search for), not internal terminology. Test labels with card sorting and preference testing.

### Concept 4: Search Systems
Search complements navigation. Effective search requires: indexing strategy, result ranking, faceted filtering, search-as-you-type, and clear error handling for no-results. Log search queries to identify gaps in navigation.

### Concept 5: Wayfinding
Wayfinding helps users understand where they are, what's available, what's nearby, and what to expect. Use breadcrumbs, current location indicators, consistent page titles, and clear section headers.

## Architecture Patterns

### Pattern 1: Top-Down IA
Start with business goals and content categories, then organize content into the predefined structure. Works well for well-understood domains with stable content.

### Pattern 2: Bottom-Up IA
Start with content audit, then derive categories from the content itself using card sorting and cluster analysis. Works well for content-rich sites with evolving domains.

### Pattern 3: Hybrid IA
Top-down for primary navigation, bottom-up for sub-navigation. Business goals drive the top-level structure; content analysis drives the details.

## Best Practices

- Design IA for the user's mental model, not org chart
- Use card sorting (open and closed) to validate categories
- Test navigation tree with tree testing
- Keep navigation breadth (options per level) under 7 items
- Limit depth to 3 levels max for key tasks
- Log search queries to find navigation gaps
- Use consistent labeling throughout
- Include breadcrumbs for deep sites
- Provide "you are here" indicators

## Anti-Patterns

- Organizing by org chart (users don't know your internal structure)
- Deep navigation (more than 3 clicks to reach content)
- Inconsistent labels (same thing called different names in different places)
- Overloaded navigation (too many options on one level)
- Missing search or broken search results
- No wayfinding cues (users don't know where they are)
