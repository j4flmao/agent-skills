# Persona Creation Guide

## Persona Structure

### Core Components
```
Persona Name: {name, job title, archetype}
Tagline: {one sentence that captures their core need}

Demographics:
  - Age range, location, education
  - Job title, industry, company size
  - Technical proficiency level

Goals:
  - Primary goal: {the main thing they want to accomplish}
  - Secondary goals: {related objectives}

Pain Points:
  - Current frustrations with existing solutions
  - Obstacles to achieving their goals

Behavior Patterns:
  - How they discover and evaluate solutions
  - Their decision-making process
  - Tool and technology preferences

Quote: "{A real or representative quote from research}"
```

## Research-Based Personas

### Data Collection
- Interview 5-10 users per persona
- Analyze behavioral data (analytics, support tickets)
- Review market research and competitive analysis
- Include both qualitative and quantitative data

### Validation
- Test drafts with stakeholders for recognizability
- Validate with additional user interviews
- Check analytics for behavioral alignment
- Iterate based on feedback

## Persona Types

### Primary Persona
- The main target user
- Design primary experience for this persona
- Do NOT try to satisfy all personas equally

### Secondary Persona
- Additional user with different needs
- Enhancements to accommodate without compromising primary

### Anti-Persona
- Explicitly NOT a target user
- Helps avoid scope creep
- Examples: competitors, internal admin users

## Application

### Design Decisions
```
Feature: Add bulk upload
Primary (Operations Manager): Needs to process 1000s of records
Secondary (Individual User): Rarely uploads, prefers single entry
Decision: Build bulk upload with simple single-entry as fallback
```

### Prioritization
```
Persona Weighting:
  Operations Manager: 60% of users
  Individual User: 40% of users
  
Feature Score = Persona Weight × Feature Importance
```

### Communication
- Display personas prominently in workspace
- Reference by name in discussions: "Would Sarah use this?"
- Include in onboarding materials for new team members
- Review and update personas annually

## Common Mistakes

- Creating personas based on assumptions, not research
- Too many personas (ideal: 3-5 maximum)
- Stereotypes rather than real user insights
- Including irrelevant demographic details
- Not using personas in decision-making
- Letting personas become stale
- Designing for the "average user" instead of specific personas
