# Data Governance Tools

## Overview

Data governance tools enable organizations to implement, automate, and scale their governance programs. This reference covers tool categories, evaluation criteria, leading tools comparison, integration patterns, deployment considerations, and implementation guidance for data cataloging, lineage tracking, quality monitoring, and policy enforcement tools.

## Tool Categories

### Governance Tool Landscape

```
+--------------------------------------------------+
|              Data Governance Tools                |
+--------------------------------------------------+
|  +-------------+  +-------------+  +------------+|
|  | Data Catalog |  | Data Lineage|  | Data Qual  ||
|  | - Atlan      |  | - DataHub   |  | - dbt test ||
|  | - DataHub    |  | - Atlan     |  | - GE       ||
|  | - Collibra   |  | - Collibra  |  | - Soda     ||
|  | - Alation    |  | - MANTA     |  | - Deequ    ||
|  +-------------+  +-------------+  +------------+|
+--------------------------------------------------+
|  +-------------+  +-------------+  +------------+|
|  | PII/Discovery| | Policy MGMT |  | Monitoring ||
|  | - BigID      | | - Immuta    |  | - Monte    ||
|  | - Privitar   | | - Okera     |  |   Carlo    ||
|  | - OneTrust   | | - Privitar  |  | - Sifflet  ||
|  +-------------+  +-------------+  +------------+|
+--------------------------------------------------+
```

### Tool Selection Criteria

```yaml
evaluation_criteria:
  functional:
    - "Data cataloging (schema, glossary, tags)"
    - "Data lineage (column-level, automated capture)"
    - "Data quality (profiling, monitoring, alerting)"
    - "PII/classification (automated detection)"
    - "Policy enforcement (contracts, masking)"
    - "Collaboration (comments, workflows, notifications)"
    
  technical:
    - "Integration with data stack (dbt, Airflow, Kafka, Snowflake)"
    - "API and SDK availability"
    - "Deployment model (SaaS vs self-hosted)"
    - "Scalability (data volume, user count)"
    - "Authentication (SSO, SAML, OIDC)"
    - "Backup and DR capabilities"
    
  operational:
    - "Time to value (implementation speed)"
    - "User adoption (ease of use, documentation)"
    - "Support and community"
    - "Total cost of ownership"
    - "Vendor lock-in risk"
    - "Upgrade and maintenance requirements"
```

## Data Catalog Tools

### Leading Tools Comparison

| Feature | DataHub | Atlan | Collibra | Alation |
|---|---|---|---|---|
| Deployment | Self-hosted / SaaS | SaaS | Self-hosted / SaaS | SaaS |
| Open Source | Yes | No | No | No |
| Column-level lineage | Yes | Yes | Yes | Yes |
| Automated lineage | dbt, Airflow, Kafka | dbt, Airflow | dbt, Airflow | Custom |
| Data quality | dbt, GE integration | dbt, GE, Soda | Built-in quality | dbt, GE |
| ML model catalog | Yes | Yes | Limited | Yes |
| Collaboration | Comments, tasks | Rich UI, tasks | Workflows | Q&A, docs |
| Glossary | Tag-based | Domain-based | Hierarchical | Structured |
| API | GraphQL | GraphQL | REST | REST |
| SSO | Yes | Yes | Yes | Yes |
| Community | Very active | Active | Enterprise | Enterprise |
| Cost | Free (open source) | Per-user pricing | High | High |

### DataHub Deployment

```yaml
# DataHub deployment via Helm
datahub:
  version: "0.12.0"
  
  components:
    - "datahub-frontend"
    - "datahub-gms"
    - "datahub-mae-consumer"
    - "datahub-mce-consumer"
    
  storage:
    mysql: "8.0+"
    elasticsearch: "7.x+"
    kafka: "2.x+"
    
  ingress:
    host: "datahub.example.com"
    tls: true
    
  authentication:
    type: "oidc"
    provider: "azure-ad"
    
  ingestion:
    sources:
      - "dbt"
      - "snowflake"
      - "airflow"
      - "kafka"
```

```yaml
# dbt ingestion recipe for DataHub
source:
  type: "dbt"
  config:
    manifest_path: "./target/manifest.json"
    catalog_path: "./target/catalog.json"
    sources_path: "./target/sources.json"
    env: "PROD"
    target_platform: "snowflake"

sink:
  type: "datahub-rest"
  config:
    server: "http://datahub-gms:8080"
```

### Atlan Integration

```yaml
# Atlan configuration and integration
atlan:
  workspace: "https://your-org.atlan.com"
  api_token: "${ATLAN_API_TOKEN}"
  
  integrations:
    dbt:
      enabled: true
      sync_interval: "6 hours"
      assets:
        - "models"
        - "sources"
        - "exposures"
        
    snowflake:
      enabled: true
      profile_schedule: "daily"
      include:
        - "PRODUCTION.*"
        - "ANALYTICS.*"
        
    tableau:
      enabled: true
      sync_interval: "12 hours"
```

## Data Lineage Tools

### Lineage Capture Approaches

```yaml
lineage_approaches:
  automated:
    pros:
      - "Always up to date"
      - "Column-level granularity"
      - "No manual effort"
    cons:
      - "Requires tool integration"
      - "Dependency on pipeline tooling"
    tools:
      - "dbt + DataHub/Atlan"
      - "Airflow lineage backend"
      - "Kafka schema registry"
      
  manual:
    pros:
      - "Covers non-instrumented sources"
      - "Rich business context"
    cons:
      - "Stale quickly"
      - "Labor intensive"
      - "Prone to errors"
    tools:
      - "DataHub UI"
      - "Collibra Edge"
      
  hybrid:
    pros:
      - "Combines best of both"
      - "Progressive automation"
    cons:
      - "Requires governance discipline"
    approach:
      - "Automate where possible (dbt, Airflow)"
      - "Manual for legacy / external sources"
```

### dbt Lineage Configuration

```yaml
# dbt_project.yml
lineage:
  generate_docs: true
  catalog_targets:
    - schema: "PRODUCTION"
      database: "ANALYTICS"
  
  column_level:
    enabled: true
    track_downstream_columns: true
    
  exposures:
    - name: "Revenue Dashboard"
      type: "dashboard"
      depends_on:
        - ref("fct_orders")
        - ref("dim_customers")
      owner:
        name: "Analytics Team"
```

### OpenLineage Integration

```yaml
# Airflow OpenLineage configuration
openlineage:
  transport:
    type: "http"
    url: "http://marquez:5000/api/v1/lineage"
    api_key: "${OPENLINEAGE_API_KEY}"
    compression: "gzip"
    
  namespace: "production"
  source: "airflow"
  
  facets:
    job_type: "airflow_task"
    environment: "production"
```

## Data Quality Tools

### Tool Comparison

| Feature | dbt test | Great Expectations | Soda Core | Deequ |
|---|---|---|---|---|
| Type | Native dbt | Standalone | Standalone | Spark |
| Language | SQL/YAML | Python | YAML | Scala/Python |
| Data sources | dbt models | Any SQL | Any SQL | Spark |
| Profiling | No | Yes | Yes | Yes |
| Expectation library | Built-in | Extensive | Moderate | Moderate |
| Data docs | Via dbt docs | Built-in | Limited | Limited |
| Alerting | dbt Cloud | Custom | Integration | Custom |
| CI integration | Native | Good | Excellent | Good |
| Learning curve | Low | Medium | Low | Medium |

### dbt Test Configuration

```yaml
# tests/schema.yml
tests:
  - name: "fct_orders"
    test_types:
      unique: ["order_id"]
      not_null: ["order_id", "customer_id", "order_date", "order_amount"]
      relationships:
        - from: "customer_id"
          to: "dim_customers.customer_id"
      accepted_values:
        - column: "order_status"
          values: ["pending", "shipped", "delivered", "cancelled"]
      custom:
        - "row_count_between(1000, 100000000)"
        - "freshness(order_date, 24)"
```

### Great Expectations Checkpoint

```yaml
# GE checkpoint configuration
checkpoint:
  name: "production_quality_check"
  
  config_version: 3.0
  
  action_list:
    - name: "store_validation"
      action:
        class_name: "StoreValidationResultAction"
    
    - name: "update_docs"
      action:
        class_name: "UpdateDataDocsAction"
    
    - name: "alert_on_failure"
      action:
        class_name: "SlackNotificationAction"
        slack_webhook: "${SLACK_WEBHOOK}"
        notify_on: "failure"
    
    - name: "create_ticket"
      action:
        class_name: "CreateTicketAction"
        notify_on: "failure"
        ticket_project: "DATA"
```

### Soda Core Configuration

```yaml
# Soda Core configuration
soda:
  warehouse:
    my_database:
      type: "snowflake"
      connection:
        account: "${SNOWFLAKE_ACCOUNT}"
        user: "${SNOWFLAKE_USER}"
        password: "${SNOWFLAKE_PASSWORD}"
        database: "PRODUCTION"
        schema: "PUBLIC"
  
  checks:
    - table: "fct_orders"
      checks:
        - row_count > 1000
        - freshness(order_date) < 24h
        - duplicate_percent(order_id) = 0
        - null_percent(order_id) = 0
        - null_percent(customer_id) < 1
        - max(order_amount) < 1000000
        - min(order_amount) >= 0
```

## PII Discovery Tools

### Tool Comparison

| Feature | BigID | Privitar | OneTrust | Private AI |
|---|---|---|---|---|
| Deployment | SaaS/On-prem | On-prem | SaaS | SaaS/On-prem |
| ML-based detection | Yes | Yes | Yes | Yes |
| Regex patterns | Extensive | Good | Good | Good |
| Image/OCR | Yes | No | Yes | No |
| Unstructured data | Yes | Yes | Yes | Yes |
| Structured data | Yes | Yes | Yes | Yes |
| Data mapping | Yes | Yes | Yes | Yes |
| DSAR automation | Yes | Yes | Yes | Yes |
| Cost | High | High | Medium | Medium |

### Automated PII Scanning

```yaml
# PII scanning configuration
pii_scan:
  schedule: "weekly"
  scope: "all databases"
  
  detectors:
    - type: "regex"
      patterns:
        - "email": "[^@]+@[^@]+\\.[^@]+"
        - "ssn": "\\d{3}-\\d{2}-\\d{4}"
        - "credit_card": "\\d{4}-\\d{4}-\\d{4}-\\d{4}"
        - "phone": "\\d{3}-\\d{3}-\\d{4}"
        - "ip_address": "\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}\\.\\d{1,3}"
    
    - type: "ml"
      model: "pii_classifier"
      confidence_threshold: 0.95
      
  actions:
    - "Tag columns with PII type"
    - "Update classification to Restricted"
    - "Notify data owner"
    - "Add to data catalog with PII flag"
```

## Policy Enforcement Tools

### Tool Comparison

| Feature | Immuta | Okera | Privitar | Custom |
|---|---|---|---|---|
| Dynamic masking | Yes | Yes | Yes | Custom |
| Row-level security | Yes | Yes | Yes | Custom |
| Attribute-based access | Yes | Yes | Yes | Custom |
| Policy-as-code | YAML | YAML | Custom | Any |
| Data source integration | Snowflake, S3, Databricks | S3, Hive | Snowflake, S3 | Custom |
| Audit logging | Yes | Yes | Yes | Custom |
| Cost | High | High | High | Development |

### Policy Definition

```yaml
# Immuta policy example
policies:
  - name: "Mask PII for non-privileged users"
    description: "Automatically mask PII columns for users without explicit access"
    
    conditions:
      - attribute: "user.role"
        operator: "not_in"
        value: ["data_owner", "compliance_officer"]
    
    actions:
      - type: "mask"
        columns:
          - name: "customer_email"
            method: "partial_mask"
            config: { prefix: 3, suffix: 3 }
          - name: "customer_phone"
            method: "full_mask"
            config: { replacement: "***-***-****" }
          - name: "ssn"
            method: "full_mask"
            config: { replacement: "XXX-XX-XXXX" }
    
    datasources:
      - "PRODUCTION.FCT_ORDERS"
      - "PRODUCTION.DIM_CUSTOMERS"
```

## Integration Architecture

### Tools Integration Pattern

```
[dbt] --- lineae ---> [DataHub/Atlan]
  |                       |
  | quality               | catalog
  v                       v
[Great Exp] ---> [Slack Alerts]
  |
  | metadata
  v
[Data Catalog] <--- [Airflow] <--- [PII Scanner]
  |                       |
  | lineage               | pipeline
  v                       v
[Collibra/Manual]     [Production Data]
```

### Deployment Considerations

```yaml
deployment_considerations:
  data_catalog:
    - "Self-hosted for data sovereignty"
    - "SaaS for faster time-to-value"
    - "Consider backup and DR for self-hosted"
    
  lineage:
    - "Start with dbt and Airflow integration"
    - "Add manual lineage for legacy systems"
    - "Column-level lineage for critical data only"
    
  quality:
    - "Start with dbt test (low friction)"
    - "Add Great Expectations for comprehensive coverage"
    - "Soda Core for quick CI checks"
    
  pii_detection:
    - "Start with regex patterns (free)"
    - "Add ML-based detection for accuracy"
    - "Automate tagging in data catalog"
```

## Tool Implementation Roadmap

### Phase 1: Foundation (Months 1-3)

```yaml
tools_phase_1:
  goal: "Establish basic governance tooling"
  
  actions:
    - "Deploy dbt test for all models"
    - "Set up basic data catalog (DataHub)"
    - "Implement SQLFluff linting"
    - "Create quality dashboards"
    
  tools_chosen:
    catalog: "DataHub (self-hosted)"
    quality: "dbt test + dbt-expectations"
    linting: "SQLFluff"
```

### Phase 2: Automation (Months 4-6)

```yaml
tools_phase_2:
  goal: "Automate quality and lineage"
  
  actions:
    - "Integrate dbt with DataHub for lineage"
    - "Deploy Great Expectations for critical tables"
    - "Implement automated PII scanning (regex)"
    - "Set up quality alerting"
    
  tools_added:
    quality: "Great Expectations"
    lineage: "DataHub dbt integration"
    pii: "Custom regex scanner"
    alerting: "Slack + PagerDuty"
```

### Phase 3: Enterprise (Months 7-12)

```yaml
tools_phase_3:
  goal: "Enterprise governance platform"
  
  actions:
    - "Evaluate and deploy enterprise catalog (Atlan or Collibra)"
    - "Implement column-level lineage for critical domains"
    - "Deploy dynamic masking for PII"
    - "Automate data contract validation"
    - "Full governance metrics dashboard"
    
  tools_added:
    catalog: "Atlan (migrate from DataHub)"
    masking: "Immuta"
    contracts: "Custom CI/CD validation"
    dashboard: "Grafana + Great Expectations"
```

## Key Points

- Tool selection depends on organization size, technical capability, and budget
- DataHub (open source) is excellent for starting catalog and lineage
- dbt test is the lowest friction quality tool for dbt users
- Great Expectations provides comprehensive quality profiling and monitoring
- Soda Core offers simpler YAML-based quality checks for CI
- Automated lineage via dbt + Airflow + OpenLineage provides column-level tracking
- PII detection starts with regex patterns, evolves to ML-based scanning
- Data quality alerts via Slack/PagerDuty ensure rapid issue response
- Start with basic tooling and evolve to enterprise platforms
- Integration between tools (dbt -> DataHub -> quality) creates unified governance
- Self-hosted vs SaaS depends on data sovereignty and operational capability
- Dynamic masking enforces access control at query time
- Data contracts provide schema and SLA guarantees between producer and consumer
- Governance metrics dashboard tracks KPI progress and compliance
- Tool implementation roadmap aligns with governance maturity stages
- API and SDK availability enables custom integrations
- SSO and RBAC integration critical for user adoption

## Data Catalog Tools Deep Dive

### Apache Atlas

```yaml
apache_atlas:
  type: "Open-source data catalog and governance platform"
  key_features:
    - "Automated metadata ingestion from 30+ sources"
    - "Full data lineage with column-level provenance"
    - "Tag-based classification and policy enforcement"
    - "REST API for integration with custom tooling"
    - "Apache Ranger integration for access policy management"
  deployment:
    infrastructure: "Java application on Kubernetes or VMs"
    dependencies: ["Apache Kafka", "Apache HBase", "Apache Solr"]
    scale: "10M+ objects per cluster"
    ha: "Active-passive with shared storage"
  integration_pattern:
    - "Hook-based metadata collection from Hive, HBase, Kafka"
    - "Push metadata to Atlas via Kafka notifications"
    - "Atlas processes and indexes metadata in Solr"
    - "REST API queries for metadata consumption"

  lineage_example:
    pipeline: "S3 -> Spark -> Hive -> BI Tool"
    lineage_graph:
      nodes:
        - id: "s3_raw"
          type: "s3_bucket"
          name: "raw-data-bucket"
        - id: "spark_job"
          type: "spark_process"
          name: "data-cleansing-job"
        - id: "hive_table"
          type: "hive_table"
          name: "cleansed_customers"
        - id: "bi_report"
          type: "tableau_dashboard"
          name: "Customer Analytics"
      edges:
        - from: "s3_raw" to: "spark_job" type: "source"
        - from: "spark_job" to: "hive_table" type: "output"
        - from: "hive_table" to: "bi_report" type: "source"

  classification_example:
    - entity: "customer_email_column"
      classifications:
        - name: "PII"
          attributes:
            sensitivity: "HIGH"
            jurisdiction: "GDPR"
        - name: "DataQuality"
          attributes:
            completeness: "99.5%"
            last_validated: "2024-01-15"
    - entity: "customer_ssn_column"
      classifications:
        - name: "PII"
          attributes:
            sensitivity: "CRITICAL"
            jurisdiction: "GDPR, CCPA"
        - name: "Encrypted"
          attributes:
            algorithm: "AES-256"
            key_vault: "aws-kms-customer-master"
```

### DataHub

```yaml
datahub:
  type: "Open-source metadata platform (Acryl Data)"
  key_features:
    - "Real-time metadata ingestion via events"
    - "Column-level lineage with SQL parsing"
    - "Documentation and annotation capabilities"
    - "Role-based access control"
    - "Integration with dbt, Airflow, Great Expectations"
  deployment:
    infrastructure: "Docker Compose or Helm for production"
    components:
      - "datahub-frontend (React UI)"
      - "datahub-gms (GraphQL backend)"
      - "datahub-mae-consumer (Metadata Audit Events)"
      - "datahub-mce-consumer (Metadata Change Events)"
      - "Elasticsearch (search and indexing)"
      - "Kafka (event bus)"
    scale: "Up to 100K+ metadata objects on single GMS"

  ingestion_pattern:
    recipe_example:
      source:
        type: "snowflake"
        config:
          account_id: "my_account"
          warehouse: "COMPUTE_WH"
          database: "PROD"
          include_views: true
          include_tables: true
          profiling:
            enabled: true
            profile_table_where_clause: "last_updated > DATEADD(day, -7, CURRENT_DATE())"
      sink:
        type: "datahub-rest"
        config:
          server_url: "http://datahub-gms:8080"

  dbt_integration:
    - "Ingest dbt model definitions (sources, models, tests)"
    - "Column-level lineage from dbt SQL compilation"
    - "Test results as Dataset properties"
    - "dbt docs descriptions sync as DataHub documentation"
    - "dbt exposures for dashboard lineage"
```

### Collibra

```yaml
collibra:
  type: "Commercial data governance and catalog platform"
  key_features:
    - "Business glossary with workflow-driven approval"
    - "Data lineage with automated and manual entry"
    - "Data marketplace for self-service data access"
    - "Policy management and enforcement"
    - "Data quality integration and dashboards"
  pricing: "Perpetual or SaaS subscription (contact for quote)"
  typical_enterprise_deployment:
    - "Central Collibra instance with Data Governance Office admin"
    - "Domain structure mirrors business organization"
    - "Integration via REST APIs and Edge Gateway"
```

## Data Quality Tooling

### Great Expectations

```yaml
great_expectations:
  type: "Open-source data quality framework"
  key_components:
    - "Expectations: Declarative data quality assertions"
    - "Data Docs: HTML documentation of quality results"
    - "Profiling: Automated column-level profiling"
    - "Validation: Batch or streaming validation"
    - "Store: Backend for expectations and results"

  expectation_suite_example:
    suite_name: "customer_master_validation"
    expectations:
      - expectation_type: "expect_column_values_to_not_be_null"
        kwargs:
          column: "customer_id"
        meta:
          criticality: "HIGH"
          business_rule: "Customer ID is mandatory"
      - expectation_type: "expect_column_values_to_be_unique"
        kwargs:
          column: "customer_email"
        meta:
          criticality: "HIGH"
          business_rule: "Email addresses must be unique"
      - expectation_type: "expect_column_values_to_match_regex"
        kwargs:
          column: "phone_number"
          regex: "^\+[1-9]\d{1,14}$"
        meta:
          criticality: "MEDIUM"
          business_rule: "Phone numbers in E.164 format"
      - expectation_type: "expect_column_value_lengths_to_be_between"
        kwargs:
          column: "postal_code"
          min_value: 5
          max_value: 10
        meta:
          criticality: "LOW"
          business_rule: "Postal code between 5-10 characters"

  checkpoint_configuration:
    name: "hourly_customer_check"
    config_version: 3.0
    class_name: "Checkpoint"
    run_name_template: "customer_validation_%Y%m%d-%H%M%S"
    action_list:
      - name: "store_validation_result"
        action:
          class_name: "StoreValidationResultAction"
      - name: "update_data_docs"
        action:
          class_name: "UpdateDataDocsAction"
      - name: "send_slack_notification"
        action:
          class_name: "SlackNotificationAction"
          slack_webhook: "${SLACK_WEBHOOK_URL}"
          notify_on: "all"
      - name: "send_email_on_failure"
        action:
          class_name: "EmailAction"
          notify_on: "failure"
          renderer:
            module_name: "great_expectations.render"
            class_name: "EmailRenderer"
    validations:
      - batch_request:
          datasource_name: "snowflake_datasource"
          data_connector_name: "default_inferred_data_connector_name"
          data_asset_name: "PROD.CUSTOMER_MASTER"
        expectation_suite_name: "customer_master_validation"
```

### dbt Tests

```yaml
dbt_quality_tests:
  generic_tests:
    - name: "not_null"
      description: "Column values must not be null"
      config:
        severity: error
        error_if: ">5"
    - name: "unique"
      description: "Column values must be unique"
    - name: "accepted_values"
      description: "Column values must be in defined list"
    - name: "relationships"
      description: "Referential integrity between tables"
    - name: "custom_test"
      description: "User-defined SQL test"

  custom_test_example:
    tests/schema.yml:
      version: 2
      models:
        - name: "customer_summary"
          columns:
            - name: "customer_id"
              tests:
                - not_null
                - unique
            - name: "email"
              tests:
                - not_null:
                    config:
                      severity: error
                      where: "status = 'ACTIVE'"
                - custom_test_name

    tests/custom_test_name.sql:
      target_sql: |
        SELECT customer_id
        FROM {{ ref('customer_summary') }}
        WHERE email NOT LIKE '%@%'
          AND status = 'ACTIVE'

  freshness_test:
    source: "source_name.table_name"
    loaded_at_field: "last_updated_at"
    freshness:
      warn_after:
        count: 24
        period: hour
      error_after:
        count: 48
        period: hour
'

