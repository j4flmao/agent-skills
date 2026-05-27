# Internal Developer Portal

## Overview

An Internal Developer Portal (IDP) is the user-facing interface of an Internal Developer Platform. It provides self-service capabilities, service catalog, documentation, and insights to development teams. This guide covers portal architecture, Backstage configuration, software templates, service catalog design, and adoption strategies.

## Portal Architecture

```yaml
portal_architecture:
  components:
    frontend:
      technology: "Backstage (open source), Port (SaaS), or custom React app"
      features:
        - "Service catalog with search and filtering"
        - "Software templates for scaffolding new services"
        - "Tech documentation with MkDocs or TechDocs"
        - "API documentation portal"
        - "Cost and resource usage dashboards"
        - "Deployment status and pipeline visibility"
        
    backend:
      technology: "Backstage backend (Node.js/TypeScript) or custom API layer"
      responsibilities:
        - "Service catalog data aggregation"
        - "Template execution orchestration"
        - "Integration with infrastructure APIs"
        - "User and permission management"
        - "Scorecard and compliance evaluation"
        
    integrations:
      source_control: ["GitHub", "GitLab", "Bitbucket"]
      ci_cd: ["GitHub Actions", "Jenkins", "GitLab CI", "ArgoCD"]
      monitoring: ["Datadog", "Grafana", "CloudWatch", "PagerDuty"]
      cost: ["CloudHealth", "AWS Cost Explorer", "Azure Cost Management"]
      security: ["Snyk", "SonarQube", "Trivy", "Dependabot"]
      infrastructure: ["Kubernetes", "Terraform", "Pulumi", "Crossplane"]
      collaboration: ["Slack", "Microsoft Teams", "Jira", "Confluence"]
```

## Backstage Configuration

```yaml
backstage_configuration:
  app_config_yaml:
    organization:
      name: "Company Name"
      
    backend:
      baseUrl: "https://backstage.company.com"
      listen:
        port: 7007
      database:
        client: "pg"
        connection:
          host: "backstage-db.cluster-xxxxx.rds.amazonaws.com"
          port: 5432
          user: "backstage"
          
    auth:
      providers:
        github:
          development:
            clientId: "${AUTH_GITHUB_CLIENT_ID}"
            clientSecret: "${AUTH_GITHUB_CLIENT_SECRET}"
            
    catalog:
      import:
        entityFilename: "catalog-info.yaml"
        pullRequestBranchName: "backstage-integration"
      rules:
        - allow: [Component, API, Resource, System, Domain, Group, User, Location]
      locations:
        - type: url
          target: "https://github.com/company/service-catalog/blob/main/catalog-info.yaml"
          
    techdocs:
      builder: "external"
      generators:
        techdocs: "docker"
      publisher:
        type: "awsS3"
        awsS3:
          bucketName: "company-backstage-techdocs"
          s3BucketRootPath: "/"
          
    lighthouse:
      baseUrl: "https://lighthouse.company.com"
      
    proxy:
      "/jenkins":
        target: "https://jenkins.company.com"
        changeOrigin: true
```

## Service Catalog Entity Structure

```yaml
catalog_entity:
  apiVersion: "backstage.io/v1alpha1"
  kind: "Component"
  metadata:
    name: "order-service"
    description: "Order processing and fulfillment service"
    annotations:
      github.com/project-slug: "company/order-service"
      jenkins.io/job-full-name: "order-service/ci-pipeline"
      backstage.io/techdocs-ref: "https://github.com/company/order-service/docs"
      backstage.io/view-url: "https://github.com/company/order-service"
      pagerduty.com/service-id: "P123456"
      datadoghq.com/slo: "order-service-sli"
      snyk.io/org-id: "abc-123"
      
  spec:
    type: "service"
    lifecycle: "production"
    owner: "platform-team"
    system: "order-management"
    subcomponentOf: "ecommerce-platform"
    
    dependsOn:
      - "Component:payment-service"
      - "Component:notification-service"
      - "Resource:orders-database"
      - "Resource:orders-queue"
      
    providesApis:
      - "API:order-service-api"
      
    consumesApis:
      - "API:payment-service-api"
      - "API:notification-service-api"
```

## Software Templates

```yaml
software_templates:
  template_structure:
    template_yaml:
      apiVersion: "scaffolder.backstage.io/v1beta3"
      kind: "Template"
      metadata:
        name: "new-microservice"
        title: "New Microservice"
        description: "Scaffold a new microservice with CI/CD, monitoring, and documentation"
      spec:
        owner: "platform-team"
        type: "service"
        parameters:
          - title: "Service Details"
            properties:
              serviceName:
                title: "Service Name"
                type: "string"
                pattern: "^[a-z0-9-]+$"
              description:
                title: "Description"
                type: "string"
              team:
                title: "Owning Team"
                type: "string"
                enum: ["platform", "payments", "orders", "users"]
              language:
                title: "Programming Language"
                type: "string"
                enum: ["typescript", "python", "go", "java", "rust"]
                
        steps:
          - id: "template"
            name: "Generate Service from Template"
            action: "fetch:template"
            input:
              url: "https://github.com/company/service-template"
              values:
                serviceName: "${{ parameters.serviceName }}"
                description: "${{ parameters.description }}"
                
          - id: "publish"
            name: "Publish to GitHub"
            action: "publish:github"
            input:
              repoUrl: "github.com?repo=${{ parameters.serviceName }}&owner=company"
              defaultBranch: "main"
              
          - id: "register"
            name: "Register in Catalog"
            action: "catalog:register"
            input:
              repoContentsUrl: "${{ steps.publish.output.repoContentsUrl }}"
              catalogInfoPath: "/catalog-info.yaml"
              
          - id: "slack"
            name: "Notify Team"
            action: "slack:sendMessage"
            input:
              channel: "platform-announcements"
              message: "New service created: ${{ parameters.serviceName }} by ${{ parameters.team }}"
              
        output:
          links:
            - title: "Service Repository"
              url: "${{ steps.publish.output.remoteUrl }}"
            - title: "Open in Catalog"
              url: "https://backstage.company.com/catalog/default/component/${{ parameters.serviceName }}"
              
  template_catalog:
    service_templates:
      - "new-microservice (Node.js/TypeScript)"
      - "new-microservice (Python/FastAPI)"
      - "new-microservice (Go/Gin)"
      - "new-microservice (Java/Spring Boot)"
      - "new-frontend (React/Next.js)"
      - "new-data-pipeline (Python/Apache Beam)"
      - "new-terraform-module"
      - "new-serverless-function (Node.js)"
      
    infrastructure_templates:
      - "new-kubernetes-namespace"
      - "new-database (RDS/Cloud SQL)"
      - "new-cache (Redis/Memorystore)"
      - "new-queue (SQS/RabbitMQ)"
      - "new-s3-bucket"
      - "new-load-balancer"
```

## Scorecards and Governance

```yaml
scorecards:
  dimensions:
    ownership:
      criteria:
        - "Has an assigned owner (team or individual)"
        - "Owner is active (committed code in last 90 days)"
        - "Service has documented on-call rotation"
    documentation:
      criteria:
        - "TechDocs published for the service"
        - "API documentation available (OpenAPI spec)"
        - "Runbook exists for common incidents"
        - "Architecture decision records (ADRs) documented"
    reliability:
      criteria:
        - "SLO defined and published"
        - "Error budget tracked"
        - "Automated rollback capability"
        - "Disaster recovery tested in last 6 months"
    security:
      criteria:
        - "Dependency scanning enabled"
        - "SAST scanning in CI pipeline"
        - "No critical or high CVEs open >30 days"
        - "Secrets scanning enabled"
    cost:
      criteria:
        - "Monthly cost tracked and attributed"
        - "Cost efficiency measured (cost per request/user)"
        - "Right-sizing recommendations reviewed quarterly"
        
  scoring:
    bronze: "40-60% — minimum bar for production services"
    silver: "60-80% — good practices, most criteria met"
    gold: "80-100% — excellent, all criteria met or exceeded"
```

## Adoption Strategy

```yaml
adoption_strategy:
  phase_1_foundation:
    duration: "4-8 weeks"
    deliverables:
      - "Backstage instance deployed and configured"
      - "Service catalog seeded with 10-20 initial services"
      - "TechDocs enabled with MkDocs"
      - "Integration with source control (GitHub)"
    adoption_target: "Platform team uses portal for their own services"
    
  phase_2_self_service:
    duration: "Week 8-16"
    deliverables:
      - "3 software templates published (microservice, frontend, data pipeline)"
      - "CI/CD pipeline integration (status visible in portal)"
      - "Monitoring integration (Datadog/Grafana dashboards linked)"
      - "Documentation template for service owners"
    adoption_target: "1-2 pilot teams adopt templates for new services"
    
  phase_3_expansion:
    duration: "Week 16-24"
    deliverables:
      - "10+ software templates covering common service types"
      - "Self-service infrastructure actions (databases, caches, queues)"
      - "Cost visibility integrated"
      - "Security scanning results visible in catalog"
      - "Scorecards enabled for all production services"
    adoption_target: "All engineering teams use catalog; 50% use templates for new services"
    
  phase_4_platform_ecosystem:
    duration: "Month 6+"
    deliverables:
      - "Inner source contributions to platform components"
      - "Dynamic scorecards with automated checks"
      - "Cross-service dependency graph"
      - "Automated compliance checks via scorecards"
      - "Developer satisfaction survey loop"
    adoption_target: "Portal is default entry point for all developer workflows"
```
