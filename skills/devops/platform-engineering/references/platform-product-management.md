# Platform Product Management

## Overview

An internal developer platform is a product — its users are developers, its value is velocity, and its success depends on adoption and satisfaction. This guide covers treating the platform as a product: user research, roadmap management, feature prioritization, developer experience measurement, and platform marketing.

## Platform as a Product Mindset

```yaml
platform_product_mindset:
  mental_model_shifts:
    from_project_to_product:
      before: "Platform is a project with a delivery date"
      after: "Platform is a product with continuous evolution"
    from_features_to_outcomes:
      before: "Success = number of platform features shipped"
      after: "Success = developer velocity improvement"
    from_tech_to_user:
      before: "Build what is technically interesting"
      after: "Build what reduces developer friction"
    from_mandate_to_adoption:
      before: "Mandate platform usage through policy"
      after: "Earn adoption through superior developer experience"
      
  platform_personas:
    power_user:
      description: "Experienced developer who values flexibility and customization"
      needs: ["Self-service", "Advanced configuration options", "Debugging access"]
      pain_points: ["Over-abstracted interfaces", "Limited escape hatches"]
    mainstream_user:
      description: "Typical developer who wants to focus on business logic"
      needs: ["Golden paths", "Clear documentation", "Working defaults"]
      pain_points: ["Slow provisioning", "Inconsistent tooling"]
    novice_user:
      description: "Junior developer or new hire getting started"
      needs: ["Guided onboarding", "Templates", "Clear error messages"]
      pain_points: ["Too many choices", "No hand-holding", "Scattered docs"]
    skeptical_user:
      description: "Developer who prefers their own tooling and workflows"
      needs: ["Proven value", "Gradual migration", "Exit options"]
      pain_points: ["Being forced to adopt", "Loss of control"]
```

## User Research for Platforms

```yaml
platform_user_research:
  methods:
    developer_interviews:
      format: "30-minute 1:1 interviews with developers from different teams"
      frequency: "Quarterly — 5-8 interviews per quarter"
      questions:
        - "What's the most frustrating part of your development workflow?"
        - "If you could change one thing about our infrastructure, what would it be?"
        - "How long does it take you to create a new service?"
        - "What tools or workflows do you avoid using?"
        
    developer_survey:
      format: "Annual platform satisfaction survey (10-15 questions)"
      metrics:
        - "Overall satisfaction (1-5 scale)"
        - "Time to provision infrastructure (current vs target)"
        - "Documentation quality rating"
        - "Net Promoter Score: 'How likely to recommend the platform?'"
      sample: "Target 50%+ response rate across all engineering"
      
    workflow_observation:
      format: "Observe developers performing common tasks (provision, deploy, debug)"
      duration: "1 hour per session, 3-5 developers"
      observe:
        - "Where do they look for information?"
        - "What commands or clicks do they try?"
        - "Where do they get stuck or confused?"
        - "What workarounds do they use?"
        
    analytics:
      sources:
        - "Portal usage metrics (page views, template usage, search queries)"
        - "CI/CD pipeline metrics (time, failure rate, stage duration)"
        - "Infrastructure provisioning time (request to ready)"
        - "Support ticket volume and categories"
      tools: ["Backstage analytics module", "Google Analytics on portal", "Datadog for pipeline metrics"]
```

## Roadmap Management

```yaml
roadmap_management:
  input_sources:
    top_down: "Engineering leadership priorities (security, cost, compliance)"
    bottom_up: "Developer pain points and feature requests"
    data_driven: "Adoption metrics, support tickets, performance data"
    industry: "Platform engineering trends, new tools, community practices"
    
  prioritization_framework:
    dimensions:
      developer_impact: "How many developers benefit and how much time saved"
      implementation_effort: "Platform team weeks required"
      strategic_value: "Alignment with platform vision and architecture goals"
      risk_reduction: "Security, compliance, reliability improvements"
      
    scoring:
      high_impact_low_effort: "Quick wins — do first, builds credibility"
      high_impact_high_effort: "Strategic initiatives — plan for next quarter"
      low_impact_low_effort: "Nice to haves — fit in between major work"
      low_impact_high_effort: "Avoid — revisit if circumstances change"
      
  roadmap_categories:
    adopt: "New capabilities that address known developer pain points"
    optimize: "Improve performance, reliability, and experience of existing capabilities"
    retire: "Deprecate low-adoption or outdated platform capabilities"
    maintain: "Boring but essential — upgrades, patches, security fixes"
```

## Developer Experience Measurement

```yaml
developer_experience:
  metrics_framework:
    velocity:
      time_to_production:
        definition: "Time from first commit to production deployment"
        target: "<1 hour for standard services"
      deployment_frequency:
        definition: "Deployments per week per service"
        target: "Multiple times per day"
      lead_time:
        definition: "Time from commit to production"
        target: "<15 minutes for standard changes"
        
    satisfaction:
      platform_nps:
        definition: "'How likely to recommend the platform to other developers?' — scored 0-10"
        target: ">30 (good), >50 (excellent)"
      documentation_completeness:
        definition: "Percentage of platform capabilities with up-to-date documentation"
        target: ">90%"
      onboarding_time:
        definition: "Time for a new developer to make their first production change"
        target: "<2 days"
        
    adoption:
      template_usage:
        definition: "Percentage of new services created via platform templates"
        target: ">80%"
      catalog_coverage:
        definition: "Percentage of production services registered in service catalog"
        target: ">95%"
      portal_dau:
        definition: "Daily active users of developer portal / total developers"
        target: ">60%"
        
    reliability:
      platform_uptime:
        definition: "Uptime of platform components (portal, CI/CD, templates)"
        target: ">99.9%"
      pipeline_failure_rate:
        definition: "Percentage of pipeline runs that fail due to platform issues"
        target: "<1%"
```

## Platform Marketing and Communication

```yaml
platform_marketing:
  internal_marketing_channels:
    slack:
      channel: "#platform-announcements"
      content: "New features, deprecation notices, tips and tricks, office hours"
      frequency: "2-3 per week"
    email:
      list: "platform-users@company.com"
      content: "Monthly newsletter: new capabilities, roadmap status, adoption stats"
      frequency: "Monthly"
    office_hours:
      format: "30-min weekly session — demo new features, Q&A, collect feedback"
      attendance: "Platform team + rotating developers from each team"
    internal_docs:
      location: "Backstage TechDocs or company wiki"
      content: "Getting started guides, tutorials, reference docs, FAQs"
      
  adoption_growth_techniques:
    bottom_up:
      - "Find 1-2 power users in each team who champion the platform"
      - "Provide early access to new features for champions"
      - "Celebrate champion wins in platform communications"
      - "Create platform advocate program with recognition"
    top_down:
      - "Present platform metrics to engineering leadership quarterly"
      - "Quantify time saved (developers × hours per week)"
      - "Align platform roadmap with company OKRs"
      
  communication_templates:
    new_feature:
      title: "New: {Feature Name}"
      body: |
        {Feature Name} is now available! 
        
        What: {2-sentence description}
        Why: {Problem it solves for developers}
        How: {Link to documentation} or {Instructions}
        
        Questions? Ask in #platform-support
        
    deprecation:
      title: "Deprecation Notice: {Feature Name}"
      body: |
        {Feature Name} will be deprecated on {Date}.
        
        Alternative: {Alternative solution}
        Migration guide: {Link to guide}
        
        Timeline:
        - Now: Deprecation announced
        - {Date}: Feature auto-disabled for new projects
        - {Date}: Feature fully removed
```

## Platform Team Metrics

```yaml
platform_team_metrics:
  velocity:
    stories_per_sprint: "Team's own delivery velocity"
    bugs_fixed: "Platform bugs resolved per sprint"
    tech_debt_reduced: "Time spent on platform improvements vs new features"
    
  developer_satisfaction:
    feature_satisfaction_score: "Post-launch satisfaction survey for each major feature"
    support_ticket_resolution_time: "Average time to close developer support tickets"
    
  business_impact:
    aggregated_time_saved: "Sum of time saved across all developers (hours/week)"
    developer_productivity_improvement: "Change in deployment frequency, lead time, MTTR"
    infrastructure_cost_efficiency: "Cost per developer or cost per deployment"
    
  team_health:
    burnout_risk: "On-call load, overtime, meeting load"
    skill_growth: "Time allocated to learning new technologies"
    squad_health: "Regular team health check (mood, workload, psychological safety)"
```
