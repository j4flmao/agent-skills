# Zachman Framework Implementation

## Overview

The Zachman Framework is an enterprise architecture ontology that provides a structured way to classify and organize architectural artifacts. Unlike TOGAF's prescriptive method, Zachman is a descriptive framework that answers six fundamental communication questions (What, How, Where, Who, When, Why) across six stakeholder perspectives (Executive, Business Owner, Architect, Engineer, Technician, User). This reference provides a comprehensive guide to implementing and using the Zachman Framework.

## Framework Structure

### The Zachman Ontology (6x6 Matrix)

The Zachman Framework is organized as a 6x6 matrix with rows representing stakeholder perspectives and columns representing interrogative dimensions.

```
              What     How      Where    Who      When     Why
              (Data)   (Function)(Network)(People) (Time)   (Motivation)
              
Row 1   [Scope]          Contextual (Planner/Executive)
Row 2   [Business]       Conceptual (Business Owner)
Row 3   [System]         Logical (Architect)
Row 4   [Technology]     Physical (Engineer)
Row 5   [Detailed]       As-Built (Technician)
Row 6   [Functioning]    Operational (User)
```

### Row Descriptions (Stakeholder Perspectives)

| Row | Perspective | Stakeholder | Abstraction | Question |
|---|---|---|---|---|
| 1 | Scope | Executive / Planner | Contextual | What are the boundaries and scope? |
| 2 | Business | Business Owner | Conceptual | How does the business operate? |
| 3 | System | Architect | Logical | What is the system design? |
| 4 | Technology | Engineer / Builder | Physical | How is it implemented? |
| 5 | Detailed | Technician | As-Built | What are the exact specifications? |
| 6 | Functioning | User | Operational | How is it running? |

### Column Descriptions (Interrogative Dimensions)

| Column | Dimension | Question | Description |
|---|---|---|---|
| 1 | What (Data) | What things are important? | Data entities, information objects, business objects |
| 2 | How (Function) | How does it work? | Processes, functions, activities, transformations |
| 3 | Where (Network) | Where are things located? | Locations, nodes, network topology, distribution |
| 4 | Who (People) | Who does what? | Actors, roles, organizations, responsibilities |
| 5 | When (Time) | When do things happen? | Events, cycles, schedules, triggers |
| 6 | Why (Motivation) | Why are things done? | Goals, strategies, objectives, constraints |

## Cell-by-Cell Analysis

### Row 1: Scope Contextual (Executive Perspective)

This row sets the boundaries and identifies the most important elements of the enterprise.

**Cell 1.1 (What - Scope) - List of Things Important to the Business**:
```yaml
scope_data:
  entities:
    - "Customer"
    - "Product"
    - "Order"
    - "Supplier"
    - "Employee"
    - "Invoice"
  description: "High-level identification of business-relevant entities"
  artifact: "Business entity list, domain glossary"
```

**Cell 1.2 (How - Scope) - List of Processes**:
```yaml
scope_function:
  processes:
    - "Acquire Customers"
    - "Fulfill Orders"
    - "Manage Products"
    - "Support Customers"
    - "Report Financials"
  description: "High-level business process identification"
  artifact: "Process area list, value chain"
```

**Cell 1.3 (Where - Scope) - List of Locations**:
```yaml
scope_network:
  locations:
    - "Headquarters (New York)"
    - "Distribution Center (Chicago)"
    - "Regional Office (London)"
    - "Data Center (Ashburn, VA)"
    - "Cloud Region (us-east-1)"
  description: "Business locations and operational areas"
  artifact: "Location list, geographic scope"
```

**Cell 1.4 (Who - Scope) - List of Organizations**:
```yaml
scope_people:
  organizations:
    - "Sales Department"
    - "Marketing Department"
    - "Operations"
    - "Customer Service"
    - "Finance"
    - "IT"
  description: "Major organizational units and stakeholder groups"
  artifact: "Organization chart (level 1), stakeholder list"
```

**Cell 1.5 (When - Scope) - List of Events**:
```yaml
scope_time:
  events:
    - "Order Placed"
    - "Payment Received"
    - "Inventory Low"
    - "Fiscal Year End"
    - "Customer Complaint"
  description: "Major business events and cycles"
  artifact: "Event list, business cycle calendar"
```

**Cell 1.6 (Why - Scope) - List of Goals**:
```yaml
scope_motivation:
  goals:
    - "Increase market share by 15%"
    - "Reduce operational costs by 20%"
    - "Improve customer satisfaction to 90%"
    - "Achieve SOC 2 compliance"
    - "Launch new product line"
  description: "High-level business goals and strategies"
  artifact: "Goal list, strategy statement"
```

### Row 2: Business Concept (Business Owner Perspective)

This row translates scope elements into business concepts and models.

**Cell 2.1 (What - Business) - Business Entity Relationship Model**:
```yaml
business_data:
  entities:
    - entity: "Customer"
      definition: "Person or organization purchasing products"
      attributes: ["CustomerID", "Name", "Email", "Segment"]
      relationships:
        - type: "places"
          target: "Order"
          cardinality: "1:N"
    - entity: "Order"
      definition: "Customer purchase request"
      attributes: ["OrderID", "OrderDate", "Status", "Total"]
      relationships:
        - type: "contains"
          target: "OrderItem"
          cardinality: "1:N"
    - entity: "Product"
      definition: "Good or service offered for sale"
      attributes: ["ProductID", "Name", "Price", "Category"]
      relationships:
        - type: "referenced in"
          target: "OrderItem"
          cardinality: "1:N"
  artifact: "Business entity relationship diagram, semantic model"
```

**Cell 2.2 (How - Business) - Business Process Model**:
```yaml
business_function:
  process_model:
    - process: "Order to Cash"
      subprocesses:
        - "Receive Order"
        - "Validate Order"
        - "Check Inventory"
        - "Process Payment"
        - "Ship Products"
        - "Send Invoice"
      triggers: ["Customer Order Received"]
      outputs: ["Shipped Order", "Invoice", "Payment"]
      metrics: ["Cycle Time", "Error Rate", "Cost per Order"]
  artifact: "Business process model (BPMN), value stream map"
```

**Cell 2.3 (Where - Business) - Business Logistics Network**:
```yaml
business_network:
  nodes:
    - "Customer Location"
    - "Sales Office"
    - "Distribution Center"
    - "Supplier Facility"
    - "Payment Gateway"
  flows:
    - from: "Customer Location"
      to: "Sales Office"
      flow_type: "Order Request"
    - from: "Sales Office"
      to: "Distribution Center"
      flow_type: "Fulfillment Request"
    - from: "Distribution Center"
      to: "Customer Location"
      flow_type: "Product Shipment"
  artifact: "Business logistics diagram, distribution network"
```

**Cell 2.4 (Who - Business) - Organization Chart and Role Model**:
```yaml
business_people:
  organizational_units:
    - unit: "Sales"
      roles: ["Sales Manager", "Account Executive", "Sales Support"]
      responsibilities: ["Lead qualification", "Order processing", "Account management"]
    - unit: "Operations"
      roles: ["Operations Manager", "Warehouse Associate", "Logistics Coordinator"]
      responsibilities: ["Inventory management", "Order fulfillment", "Shipping"]
  artifact: "Organizational chart, responsibility assignment matrix"
```

**Cell 2.5 (When - Business) - Business Event and Cycle Model**:
```yaml
business_time:
  cycles:
    - cycle: "Order Fulfillment"
      phases: ["Receive (0-1h)", "Validate (1-2h)", "Ship (2-24h)", "Invoice (24-48h)"]
      metrics: ["Cycle time target: 24 hours"]
    - cycle: "Financial Close"
      phases: ["Month End (days 1-3)", "Review (days 3-5)", "Report (days 5-7)"]
      metrics: ["Close time target: 7 business days"]
  artifact: "Business cycle diagram, event-response model"
```

**Cell 2.6 (Why - Business) - Business Objective and Strategy Model**:
```yaml
business_motivation:
  goals:
    - goal: "Improve Order Accuracy"
      measures: ["Order accuracy rate: target 99.5%"]
      strategies: ["Automated order validation", "Real-time inventory check"]
      constraints: ["Budget: $500K", "Timeline: 6 months"]
  artifact: "Business strategy model, balanced scorecard"
```

### Row 3: System Logic (Architect Perspective)

This row represents the logical system design independent of implementation technology.

**Cell 3.1 (What - System) - Logical Data Model**:
```yaml
system_data:
  entity_relationship:
    Customer:
      attributes:
        - {name: CustomerID, type: Identifier}
        - {name: Name, type: String}
        - {name: Email, type: String}
        - {name: Segment, type: Code}
      relationships:
        Order: "1:N (Customer places Order)"
    Order:
      attributes:
        - {name: OrderID, type: Identifier}
        - {name: OrderDate, type: DateTime}
        - {name: Status, type: Code}
        - {name: TotalAmount, type: Money}
      relationships:
        OrderItem: "1:N (Order contains OrderItem)"
    Product:
      attributes:
        - {name: ProductID, type: Identifier}
        - {name: Name, type: String}
        - {name: Price, type: Money}
        - {name: Category, type: Code}
      relationships:
        OrderItem: "1:N (Product referenced in OrderItem)"
  artifact: "Logical data model (ERD), normalized schema"
```

**Cell 3.2 (How - System) - Application Architecture Model**:
```yaml
system_function:
  applications:
    Customer Relationship Management:
      functions:
        - "Lead Management"
        - "Contact Management"
        - "Opportunity Tracking"
      data_entities: ["Customer", "Lead", "Opportunity"]
    Order Management System:
      functions:
        - "Order Entry"
        - "Order Validation"
        - "Order Status Tracking"
      data_entities: ["Order", "OrderItem"]
    Enterprise Resource Planning:
      functions:
        - "Inventory Management"
        - "Procurement"
        - "Financial Accounting"
      data_entities: ["Product", "Inventory", "Invoice"]
  artifact: "Application architecture diagram, function-entity mapping"
```

**Cell 3.3 (Where - System) - Distributed System Model**:
```yaml
system_network:
  nodes:
    - node: "Web Application Cluster"
      type: "Application Server"
      software: "Node.js / React"
    - node: "API Gateway"
      type: "Integration"
      software: "Kong / AWS API Gateway"
    - node: "Application Services"
      type: "Microservices"
      software: "Spring Boot / Go"
    - node: "Database Cluster"
      type: "Data Store"
      software: "PostgreSQL / Redis"
  connections:
    - from: "Web Application"
      to: "API Gateway"
      protocol: "HTTPS/REST"
    - from: "API Gateway"
      to: "Application Services"
      protocol: "gRPC"
    - from: "Application Services"
      to: "Database Cluster"
      protocol: "PostgreSQL wire protocol"
  artifact: "System deployment architecture, network topology diagram"
```

**Cell 3.4 (Who - System) - User Role and Security Model**:
```yaml
system_people:
  roles:
    - role: "Customer"
      permissions: ["View products", "Place orders", "View order history"]
      security: "JWT authentication, OIDC"
    - role: "Sales Agent"
      permissions: ["Manage leads", "Create orders", "View customer data"]
      security: "MFA required, role-based access"
    - role: "Admin"
      permissions: ["All operations", "User management", "Configuration"]
      security: "MFA required, elevated session"
  artifact: "User role matrix, security model, ACL design"
```

**Cell 3.5 (When - System) - Sequence and Timing Model**:
```yaml
system_time:
  sequences:
    - process: "Order Processing"
      steps:
        - {step: 1, action: "Submit Order", duration: "1s", trigger: "User action"}
        - {step: 2, action: "Validate Order", duration: "2s", trigger: "Order submitted event"}
        - {step: 3, action: "Process Payment", duration: "5s", trigger: "Validation success"}
        - {step: 4, action: "Confirm Order", duration: "1s", trigger: "Payment success"}
      total_duration: "9s (p95: 15s)"
      sla: "30s"
  artifact: "Sequence diagram, timing model, SLA definitions"
```

**Cell 3.6 (Why - System) - Business Rule Model**:
```yaml
system_motivation:
  business_rules:
    - rule: "Order Discount"
      condition: "Order total > $1,000"
      action: "Apply 10% discount"
      source: "Sales Policy"
    - rule: "Credit Limit"
      condition: "Customer credit < Order total"
      action: "Require manager approval"
      source: "Risk Management Policy"
    - rule: "Shipping Method"
      condition: "Order within 50 miles of distribution center"
      action: "Free same-day shipping"
      source: "Customer Promise"
  artifact: "Business rules catalog, decision table, rule engine spec"
```

### Row 4: Technology Physics (Engineer Perspective)

This row maps logical designs to specific technologies.

**Cell 4.1 (What - Technology) - Physical Data Model**:
```sql
-- Physical database schema
CREATE TABLE customers (
    customer_id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    segment VARCHAR(50),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE orders (
    order_id UUID PRIMARY KEY,
    customer_id UUID REFERENCES customers(customer_id),
    order_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status VARCHAR(50) NOT NULL,
    total_amount DECIMAL(12,2) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_orders_customer ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(status);
```

**Cell 4.2 (How - Technology) - Technology Design and Implementation**:
```yaml
technology_function:
  api_specification:
    - endpoint: "POST /api/v1/orders"
      technology: "AWS API Gateway + Lambda"
      implementation:
        runtime: "Node.js 20"
        database: "PostgreSQL Aurora"
        cache: "ElastiCache Redis"
        auth: "OAuth2 with Cognito"
      performance:
        expected_latency: "<500ms p95"
        throughput: "1000 req/s"
```

**Cell 4.3 (Where - Technology) - Technology Infrastructure**:
```yaml
technology_network:
  cloud_infrastructure:
    provider: "AWS"
    regions:
      - "us-east-1 (primary)"
      - "eu-west-1 (DR)"
    services:
      compute: "EKS (Kubernetes 1.28)"
      database: "Aurora PostgreSQL (Multi-AZ)"
      cache: "ElastiCache Redis (Cluster mode)"
      cdn: "CloudFront"
      dns: "Route 53"
```

**Cell 4.4 (Who - Technology) - Technology Access and Entitlement**:
```yaml
technology_people:
  iam_policies:
    - role: "application-service"
      permissions:
        - "rds:Query"
        - "sqs:SendMessage"
        - "s3:GetObject"
      technology: "AWS IAM roles for service accounts"
    - role: "developer"
      permissions:
        - "ecr:PushImage"
        - "eks:DescribeCluster"
      technology: "IAM Identity Center with SSO"
```

**Cell 4.5 (When - Technology) - Technology Timing and Sequencing**:
```yaml
technology_time:
  scheduling:
    batch_jobs:
      - job: "Nightly Data Sync"
        schedule: "0 2 * * * (2 AM daily)"
        duration: "30 minutes"
        technology: "AWS Glue"
      - job: "Weekly Report Generation"
        schedule: "0 6 * * 1 (6 AM Monday)"
        duration: "2 hours"
        technology: "Amazon Redshift + QuickSight"
```

**Cell 4.6 (Why - Technology) - Technology Rules and Constraints**:
```yaml
technology_motivation:
  constraints:
    - "All API traffic must go through API Gateway for audit"
    - "Database connections must use IAM auth, not passwords"
    - "Secrets must be stored in AWS Secrets Manager"
    - "All deployments must pass security scanning"
```

### Row 5: Detailed Specification (Technician Perspective)

This row contains the detailed, as-built specifications.

**Cell 5.1 (What - Detailed) - Data Definition and Schema**:
Complete database DDL, view definitions, stored procedures, data dictionaries, and data quality rules.

**Cell 5.2 (How - Detailed) - Program and Module Specifications**:
Detailed API specifications (OpenAPI), method signatures, algorithm specifications, configuration files.

**Cell 5.3 (Where - Detailed) - Network Configuration**:
DNS records, load balancer configs, firewall rules, VPC configurations, TLS certificate specifications.

**Cell 5.4 (Who - Detailed) - Security Configuration**:
IAM policy documents, Kubernetes RBAC definitions, secret definitions, access audit configurations.

**Cell 5.5 (When - Detailed) - Timing Definitions**:
Cron job definitions, workflow DAG definitions, timeout configurations, retry policy specifications.

**Cell 5.6 (Why - Detailed) - Rule Specifications**:
Validation rule implementations, business rule engine configurations, constraint definitions in code, test specifications.

### Row 6: Functioning Enterprise (User Perspective)

This row represents the actual running system.

**Cell 6.1 (What - Functioning) - Operational Data**:
Actual database instances, data volumes, data quality metrics, data lineage traces.

**Cell 6.2 (How - Functioning) - Running Processes**:
Active instances, running workflows, process performance metrics, queue depths.

**Cell 6.3 (Where - Functioning) - Operational Infrastructure**:
Live network topology, active endpoints, current routing tables, health check status.

**Cell 6.4 (Who - Functioning) - Active Users**:
Current logged-in users, active sessions, role assignments, user activity logs.

**Cell 6.5 (When - Functioning) - Actual Timing**:
Measured response times, actual batch run times, SLA compliance metrics, timing logs.

**Cell 6.6 (Why - Functioning) - Goal Attainment**:
Business KPI actuals, goal attainment rates, performance against targets, compliance status.

## Implementing Zachman in Practice

### Methodology Integration

**Zachman + TOGAF Integration**:

| Activity | TOGAF Phase | Zachman Cells |
|---|---|---|
| Enterprise scope definition | Preliminary | Row 1 (All columns) |
| Business architecture | Phase B | Row 2 (All columns) |
| Data architecture | Phase C (Part 1) | Cell 3.1, 4.1, 5.1 |
| Application architecture | Phase C (Part 2) | Cell 3.2, 4.2, 5.2 |
| Technology architecture | Phase D | Cells 3.3, 3.4, 4.3, 4.4 |
| Migration planning | Phase F | Cells 5.x |
| Governance | Phase G | Row 6 |
| Change management | Phase H | All cells (delta) |

**Zachman + Agile Integration**:

```yaml
agile_integration:
  epic_level:
    zachman_coverage: "Row 1-2 (Scope and Business)"
    artifacts:
      - "Epic includes business goals (Cell 2.6)"
      - "User stories map to business processes (Cell 2.2)"
      
  feature_level:
    zachman_coverage: "Row 3 (System)"
    artifacts:
      - "Feature specifications (Cell 3.2)"
      - "Logical data model changes (Cell 3.1)"
      
  story_level:
    zachman_coverage: "Row 4-5 (Technology and Detail)"
    artifacts:
      - "Technical implementation (Cell 4.2)"
      - "Configuration (Cell 5.2)"
      
  sprint_review:
    zachman_coverage: "Row 6 (Functioning)"
    artifacts:
      - "Working software (Cell 6.2)"
      - "User acceptance (Cell 6.4)"
```

### Cell Population Strategy

**Prioritization Approach**:

```yaml
cell_prioritization:
  critical_cells:
    - "2.1 (Business data model)"
    - "2.2 (Business process model)"
    - "3.1 (Logical data model)"
    - "3.2 (Application architecture)"
    rationale: "Core business understanding and system design"
    
  high_priority:
    - "1.x (Scope row)"
    - "2.6 (Business goals)"
    - "3.3 (System distribution)"
    - "4.1 (Physical data model)"
    rationale: "Strategic alignment and implementation planning"
    
  medium_priority:
    - "3.4 (User roles)"
    - "3.6 (Business rules)"
    - "4.2 (Technology design)"
    rationale: "Detailed design specification"
    
  low_priority:
    - Row 5 (Detailed specs - populated as-built)
    - Row 6 (Functioning - live operational data)
    rationale: "Filled during implementation and operations"
```

**Cell Population Guidelines**:

| Cell Type | Population Approach | Detail Level |
|---|---|---|
| Row 1 | Brainstorming sessions, C-level interviews | List format, 5-15 items each |
| Row 2 | Business workshops, process walkthroughs | Diagrams with definitions |
| Row 3 | Architecture design sessions | Formal models (ERD, BPMN, UML) |
| Row 4 | Technology design decisions | Specific technology choices |
| Row 5 | Implementation documentation | Complete specifications |
| Row 6 | Monitoring and analytics data | Live metrics and dashboards |

### Zachman Tool Support

**Tool Mapping**:

| Tool | Zachman Support | Best For |
|---|---|---|
| Sparx Enterprise Architect | Native Zachman support, matrix views | Comprehensive EA tool |
| Archi (ArchiMate) | Zachman import/export via ArchiMate | Open source, TOGAF-aligned |
| LeanIX | Fact sheet approach aligning to Zachman rows | Lightweight EA tool |
| erwin | Strong data modeling (cells 1.1-6.1) | Data architecture focus |
| BPMN tools (Signavio) | Process modeling (cells 1.2-6.2) | Business process focus |
| Microsoft Excel | Simple cell-by-cell tracking | Getting started, small orgs |

**Sparx EA Configuration for Zachman**:

```yaml
sparx_ea_config:
  zachman_perspective:
    - name: "Scope (Planner)"
      definition: "Enterprise scope and boundaries"
      columns: ["Data", "Function", "Network", "People", "Time", "Motivation"]
    - name: "Enterprise (Owner)"
      definition: "Business concepts and models"
      columns: ["Data", "Function", "Network", "People", "Time", "Motivation"]
    - name: "System (Designer)"
      definition: "Logical system design"
      columns: ["Data", "Function", "Network", "People", "Time", "Motivation"]
  
  artifact_types:
    data:
      - "Entity Definition"
      - "Data Model"
      - "Database Schema"
    function:
      - "Process Definition"
      - "Application Service"
      - "API Specification"
    network:
      - "Location"
      - "Node"
      - "Network Connection"
```

## Zachman for Architecture Assessment

### Gap Analysis Using Zachman

**Method**: Evaluate each cell for completeness and identify gaps.

```yaml
gap_analysis:
  assessment:
    cell_2_1_business_data:
      status: "Complete"
      description: "Business entity model documented"
      artifact_link: "business-entity-model.bpmn"
      
    cell_2_2_business_function:
      status: "Partial"
      description: "Core processes documented, exceptions missing"
      action: "Document exception handling processes"
      owner: "Business Analyst"
      timeline: "Q2 2026"
      
    cell_3_1_system_data:
      status: "Missing"
      description: "No logical data model exists"
      action: "Create logical data model from business entities"
      owner: "Data Architect"
      timeline: "Q3 2026"
```

**Gap Heat Map**:

```yaml
heat_map:
  columns: ["What", "How", "Where", "Who", "When", "Why"]
  rows:
    Row_1_Scope:
      cells: ["Green", "Green", "Green", "Yellow", "Red", "Green"]
    Row_2_Business:
      cells: ["Green", "Yellow", "Yellow", "Green", "Yellow", "Green"]
    Row_3_System:
      cells: ["Red", "Yellow", "Green", "Yellow", "Red", "Red"]
    Row_4_Technology:
      cells: ["Yellow", "Green", "Green", "Yellow", "Yellow", "Yellow"]
    Row_5_Detailed:
      cells: ["Red", "Yellow", "Green", "Red", "Red", "Red"]
    Row_6_Functioning:
      cells: ["Green", "Green", "Green", "Yellow", "Yellow", "Yellow"]
  legend:
    Green: "Complete and current"
    Yellow: "Partial or needs update"
    Red: "Missing or significantly outdated"
```

### Transformation Planning

Zachman naturally supports transformation by comparing current-state cells with target-state cells.

| Cell | Current State | Target State | Gap | Migration Approach |
|---|---|---|---|---|
| 2.1 | 15 separate entity definitions | 50 standardized entities | Missing relationships | Entity relationship workshop |
| 3.1 | No logical model | Full ERD | Complete new work | Hire data architect |
| 4.1 | SQL Server schema | Aurora PostgreSQL schema | Schema migration | AWS DMS migration |
| 6.2 | Batch processing | Event-driven real-time | Significant gap | Phased event stream implementation |

## Zachman and ArchiMate Alignment

The Zachman Framework and ArchiMate modeling language are complementary. ArchiMate provides a notation to describe content in Zachman cells.

| Zachman Column | ArchiMate Layer | ArchiMate Aspect |
|---|---|---|
| What (Data) | Business, Data | Passive Structure |
| How (Function) | Business, Application, Technology | Behavior |
| Where (Network) | Technology | Passive Structure (location) |
| Who (People) | Business | Active Structure |
| When (Time) | Cross-layer | Behavior (events) |
| Why (Motivation) | Motivation Extension | Motivation |

**Row-to-Layer Mapping**:

```yaml
archimate_mapping:
  row_2_business:
    archimate_layers:
      - "Business Layer"
      - "Motivation Extension"
    key_elements:
      - "Business Actor"
      - "Business Role"
      - "Business Process"
      - "Business Object"
      
  row_3_system:
    archimate_layers:
      - "Application Layer"
      - "Data Layer"
    key_elements:
      - "Application Component"
      - "Application Service"
      - "Data Object"
      
  row_4_technology:
    archimate_layers:
      - "Technology Layer"
      - "Physical Layer"
    key_elements:
      - "Node"
      - "Artifact"
      - "Technology Service"
```

## Zachman Maturity Model

### Maturity Levels

| Level | Name | Characteristics |
|---|---|---|
| 0 | None | No architecture artifacts, no framework |
| 1 | Initial | Partial Row 1 (Scope), some columns only |
| 2 | Managed | Rows 1-2 populated, business perspective covered |
| 3 | Defined | Rows 1-3 populated, system perspective established |
| 4 | Measured | Rows 1-4 maintained, technology aligned with business |
| 5 | Optimized | All rows active, cells regularly updated, gap-driven improvement |

### Maturity Assessment Criteria

```yaml
maturity_assessment:
  row_completeness:
    row_1_target: "All 6 columns populated, reviewed quarterly"
    row_2_target: "All 6 columns populated, maintained by business analysts"
    row_3_target: "All 6 columns populated, maintained by architects"
    row_4_target: "4+ columns populated, technology alignment verified"
    
  governance:
    - "Cell ownership assigned"
    - "Regular review cycles established"
    - "Change management process for cell updates"
    - "Tool support for matrix management"
    
  usage:
    - "Zachman used for new initiative scoping"
    - "Gap analysis performed before architecture work"
    - "Transformation planning uses current/target cell comparison"
    - "Compliance verification against cell definitions"
```

## Common Implementation Challenges

### Challenge 1: Framework Overhead

**Problem**: Teams spend more time filling cells than doing architecture work.
**Solution**: Start with only Rows 1-2 for business context. Add Row 3 for system design. Fill Rows 4-6 only as needed for implementation and operations. Zachman is a classification system, not a documentation template.

### Challenge 2: Tool Support Limitations

**Problem**: Finding integrated tools that support the full Zachman matrix.
**Solution**: Use specialized tools per cell type (ERD tools for What, BPMN tools for How) and maintain a simple inventory spreadsheet that links to detailed artifacts.

### Challenge 3: Framework Rigidity

**Problem**: Insisting every cell must be filled perfectly leads to analysis paralysis.
**Solution**: Apply the 80/20 rule. Fill cells to the level of detail needed for current decisions. Empty cells are acceptable as long as the gap is recognized.

### Challenge 4: Zachman vs Method Confusion

**Problem**: Zachman describes what to represent but not how to create it.
**Solution**: Always pair Zachman with a method (TOGAF ADM, agile, or custom). Use Zachman for classification and gap identification. Use the method for the process of creating artifacts.

## Zachman and Digital Transformation

### Applying Zachman to Cloud Migration

| What | How | Where | Who | When | Why |
|---|---|---|---|---|---|
| R1: On-prem vs cloud entities | R1: Migration processes | R1: Source and target locations | R1: Migration team | R1: Migration timeline | R1: Cloud adoption goals |
| R2: Business data classification | R2: Rehost/refactor decisions | R2: Hybrid connectivity | R2: Cloud Center of Excellence | R2: Migration waves | R2: Cost savings targets |
| R3: Cloud data architecture | R3: Cloud-native app patterns | R3: Cloud network topology | R3: Cloud IAM roles | R3: Deployment pipelines | R3: Cloud governance |
| R4: Database migration specs | R4: Container/K8s specs | R4: VPC/subnet design | R4: Service accounts | R4: CI/CD schedules | R4: Cost optimization rules |
| R5: Schema conversion | R5: Infrastructure as code | R5: DNS/firewall rules | R5: K8s RBAC | R5: Cron job configs | R5: Budget alerts |
| R6: Cloud data stores | R6: Running containers | R6: Live endpoints | R6: Active sessions | R6: Actual migration progress | R6: Cost actuals |

### Applying Zachman to Microservices Adoption

| Cell | Question | Microservice Consideration |
|---|---|---|
| 2.1 (What - Business) | What data entities exist? | Bounded context identification |
| 3.2 (How - System) | What functions do services perform? | Service decomposition |
| 3.3 (Where - System) | How do services communicate? | Service mesh, API gateway |
| 3.5 (When - System) | When do events occur? | Event-driven communication |
| 4.2 (How - Technology) | How are services implemented? | Technology stack per service |
| 4.6 (Why - Technology) | What rules govern services? | Service-level objectives (SLOs) |

## Zachman Artifact Templates

### Artifact Inventory

```yaml
artifact_inventory:
  - cell: "1.1"
    name: "Business Entity List"
    template: "spreadsheet with entity name, definition, domain"
    
  - cell: "2.2"
    name: "Business Process Model"
    template: "BPMN 2.0 diagram with swimlanes"
    
  - cell: "3.1"
    name: "Logical Data Model"
    template: "Entity-Relationship Diagram (UML or ER notation)"
    
  - cell: "4.1"
    name: "Physical Database Schema"
    template: "DDL SQL scripts"
    
  - cell: "5.4"
    name: "Security Configuration"
    template: "IAM policy JSON, K8s RBAC YAML"
    
  - cell: "6.6"
    name: "KPI Dashboard"
    template: "Dashboard with business KPIs vs targets"
```

## Zachman Cell Example: Order Management

### Complete Cell Trace: Order Processing

| Row \ Column | What | How | Where | Who | When | Why |
|---|---|---|---|---|---|---|
| R1 (Scope) | Order | Order Fulfillment | Customer Site | Customer | Fiscal Year | Revenue Growth |
| R2 (Business) | Order entity with attributes | Order-to-Cash process | Distribution Network | Sales, Ops, Finance | SLA: 24h fulfillment | Customer Satisfaction |
| R3 (System) | Order data model (ERD) | Order Service API | Microservice cluster | OAuth2 roles | Order processing sequence | Business rules engine |
| R4 (Technology) | PostgreSQL schema | Node.js REST API | EKS container | IAM service accounts | 30s timeout, 3 retries | SLO: 99.9% uptime |
| R5 (Detailed) | DDL scripts | Express route handlers | Kubernetes deployment | K8s ServiceAccount | Cron for cleanup | Rate limiting rule |
| R6 (Functioning) | Active orders table | Running containers | Live endpoints | Active sessions | p95 latency: 120ms | 99.95% actual uptime |

## References

- `togaf-architecture-development.md` -- TOGAF Architecture Development
- `togaf-zachman-fundamentals.md` -- TOGAF Zachman Fundamentals
- `togaf-zachman-advanced.md` -- TOGAF Zachman Advanced Topics
- `zachman-framework.md` -- Zachman Framework for Enterprise Architecture
- `togaf-framework.md` -- TOGAF Architecture Development Method (ADM)
- `architecture-content.md` -- Architecture Content Framework
- `ea-governance.md` -- Enterprise Architecture Governance
