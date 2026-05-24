# Zachman Framework for Enterprise Architecture

## Introduction

The Zachman Framework is an enterprise ontology that provides a structured way to view and describe an enterprise. Named after John Zachman, the framework is organized as a 6x6 matrix representing the intersection of six stakeholder perspectives (rows) and six interrogative dimensions (columns). Each cell represents a unique architectural artifact.

## Framework Structure

### The Six Rows (Audience Perspectives)

| Row | Perspective | Stakeholder | Abstraction Level |
|-----|-------------|-------------|-------------------|
| 1 | Scope | Executive/Planner | Contextual -- high-level scope and direction |
| 2 | Business | Business Owner | Conceptual -- business model and operations |
| 3 | System | Architect/Designer | Logical -- system requirements and design |
| 4 | Technology | Engineer/Builder | Physical -- technology implementation |
| 5 | Detailed | Technician/Implementer | Detailed -- component-level specifications |
| 6 | Operations | User/Operator | Functional -- running system instances |

### The Six Columns (Interrogatives)

| Column | Question | Description |
|--------|----------|-------------|
| 1 | What (Data) | Inventory of things, entities, data |
| 2 | How (Function) | Processes, functions, activities |
| 3 | Where (Network) | Locations, distribution, connectivity |
| 4 | Who (People) | Roles, organizations, responsibilities |
| 5 | When (Time) | Events, schedules, triggers, cycles |
| 6 | Why (Motivation) | Goals, strategies, objectives, constraints |

## Detailed Row-Column Matrix

### Row 1 -- Scope (Planner)
| Column | Artifact | Description |
|--------|----------|-------------|
| What | Business Entity List | High-level things of interest |
| How | Business Process List | Functions the enterprise performs |
| Where | Business Location List | Geographic areas of operation |
| Who | Organization Chart | Major organizational units |
| When | Event List | Key business events and cycles |
| Why | Goal/Strategy List | Enterprise mission and objectives |

### Row 2 -- Business (Owner)
| Column | Artifact | Description |
|--------|----------|-------------|
| What | Business Entity Model | Semantic model of business entities |
| How | Business Process Model | End-to-end business process flow |
| Where | Business Logistics Network | Business locations and distribution |
| Who | Role-Entity Matrix | Who does what with which entities |
| When | Business Master Schedule | Business cycle and event schedule |
| Why | Business Plan | Business goals, strategies, tactics |

### Row 3 -- System (Designer)
| Column | Artifact | Description |
|--------|----------|-------------|
| What | Logical Data Model | Entities, relationships, attributes |
| How | Application Architecture | System functions and data flow |
| Where | Distributed System Architecture | System nodes and data distribution |
| Who | Access Rights Model | User interface and security roles |
| When | Processing Structure | Event triggers and process sequencing |
| Why | Business Rule Model | Constraint and rule specifications |

### Row 4 -- Technology (Builder)
| Column | Artifact | Description |
|--------|----------|-------------|
| What | Physical Data Model | Database schema, tables, columns |
| How | System Design | Program architecture, APIs, services |
| Where | Network Architecture | Topology, protocols, connectivity |
| Who | Security Architecture | Authentication, authorization, audit |
| When | Control Flow | Execution timing, batch schedules |
| Why | Rule Design | Implementation-level rule enforcement |

### Row 5 -- Detailed (Implementer)
| Column | Artifact | Description |
|--------|----------|-------------|
| What | Data Definition | DDL, storage definitions, indexes |
| How | Program Implementation | Source code, configuration scripts |
| Where | Network Configuration | IP assignments, DNS, routing tables |
| Who | Identity Management Configuration | Directory entries, permissions |
| When | Timing Definitions | Scheduler configurations, triggers |
| Why | Rule Implementation | Constraint enforcement in code |

### Row 6 -- Operations (User)
| Column | Artifact | Description |
|--------|----------|-------------|
| What | Operational Data | Actual data instances in production |
| How | Executed Functions | Running processes and transactions |
| Where | Active Network | Live network nodes and connections |
| Who | Active Users | Actual authenticated users and sessions |
| When | Operational Events | Real-time event logs and timestamps |
| Why | Operational Decisions | Decisions made and actions taken |

## Using the Framework

### Cell-Based Analysis
- Each cell is uniquely defined by its row (perspective) and column (interrogative)
- No cell is more important than another -- all are necessary
- Cells are interrelated -- artifact in one cell constrains related cells
- Changes in higher rows cascade to lower rows
- Vertical integration ensures alignment across perspectives

### Matrix Navigation
- **Horizontal**: Understand how one interrogative dimension is represented across all perspectives
- **Vertical**: Understand how one perspective addresses each interrogative dimension
- **Diagonal**: Trace transformation from high-level scope to detailed implementation
- **Cell-to-cell**: Analyze relationships between related cells (e.g., Row 3 What affects Row 4 What)

### Integration Rules
- Row 2 cells constrain Row 3 cells in the same column
- Row 3 cells provide specification for Row 4 cells
- Row 1 cells set direction for all lower rows
- Column 1 relationships must be consistent with Column 2 transformations
- Every cell must be consistent with vertically adjacent cells

## Applying the Framework

### Common Use Cases
- **Baseline architecture**: Populate cells for current state
- **Target architecture**: Populate cells for desired future state
- **Impact analysis**: Assess change impact across cells
- **Gap analysis**: Identify missing or incomplete cells
- **Tool selection**: Evaluate tools against cell coverage
- **Communication**: Provide standard perspective-based views

### Best Practices
- Populate Row 1-3 before detailed technical work
- Maintain explicit mappings between cells
- Use standard notations per cell (BPMN, ERD, UML, ArchiMate)
- Version cells independently for incremental updates
- Relate cells to ADM phases for method integration
- Review row-column completeness periodically
