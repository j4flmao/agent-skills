# Domain Decomposition Patterns

## Decomposition Methodology

```
Business Capability Mapping
├── Step 1: Identify all business capabilities
│   E.g., Order Management, Product Catalog, Inventory, Billing, Marketing
├── Step 2: Group by business function
│   Order Management + Billing + Collections → Commerce Domain
│   Inventory + Fulfillment + Logistics → Operations Domain
├── Step 3: Identify data produced per group
│   Commerce produces: orders, payments, invoices, carts
│   Operations produces: inventory levels, shipments, supplier data
├── Step 4: Identify data consumed per group
│   Commerce consumes: products (from Catalog), customer profiles (from Customer)
│   Operations consumes: orders (from Commerce), supplier contracts (from Finance)
├── Step 5: Check Conway's Law
│   Team organization must match domain boundaries
│   Split if: one team serves multiple domains or domain spans multiple teams
└── Step 6: Validate independence
    Can this domain's data products be developed, tested, deployed independently?
```

## Common Domain Decompositions

### E-Commerce / Retail

```yaml
domains:
  commerce:
    data_products: [orders, carts, returns, product_reviews]
    consumption: products(from catalog), inventory(from operations), customer(from customer)
    team_size: 8
  catalog:
    data_products: [products, categories, pricing, promotions]
    consumption: sales_velocity(from commerce)
    team_size: 5
  operations:
    data_products: [inventory, shipments, suppliers, warehouse]
    consumption: orders(from commerce)
    team_size: 6
  customer:
    data_products: [customer_360, segments, interactions, preferences]
    consumption: orders(from commerce), support_tickets(from support)
    team_size: 7
  finance:
    data_products: [revenue, invoices, payments, budgets, taxes]
    consumption: orders(from commerce), inventory(from operations)
    team_size: 5
  marketing:
    data_products: [campaigns, leads, attribution, channels]
    consumption: orders(from commerce), segments(from customer)
    team_size: 4
```

### Fintech / Banking

```yaml
domains:
  accounts:
    data_products: [accounts, account_transactions, balances]
    team_size: 8
  payments:
    data_products: [payments, settlements, disputes, chargebacks]
    consumption: accounts(from accounts)
    team_size: 6
  lending:
    data_products: [loans, credit_score, amortization, collateral]
    consumption: accounts(from accounts), payments(from payments)
    team_size: 7
  fraud:
    data_products: [fraud_scores, alerts, blocked_transactions, blacklist]
    consumption: payments(from payments), accounts(from accounts), sessions(from auth)
    team_size: 5
  compliance:
    data_products: [regulatory_reports, audit_trail, kyc_status, sar_filings]
    consumption: all(product monitors)
    team_size: 4
```

### Healthcare

```yaml
domains:
  patient:
    data_products: [patient_demographics, medical_history, allergies, immunizations]
    team_size: 6
  clinical:
    data_products: [encounters, diagnoses, procedures, lab_results, medications]
    consumption: patient(from patient)
    team_size: 8
  billing:
    data_products: [claims, payments, prior_auth, coverage]
    consumption: encounters(from clinical), patient(from patient)
    team_size: 5
  pharmacy:
    data_products: [prescriptions, dispense_log, formularies, interactions]
    consumption: patient(from patient), allergies(from clinical)
    team_size: 4
  operations:
    data_products: [appointments, staffing, bed_mgmt, supplies]
    consumption: encounters(from clinical)
    team_size: 5
```

## Anti-Patterns

| Anti-Pattern | Problem | Fix |
|---|---|---|
| **Technology domain** | Spark team owns all Spark pipelines | Split by business domain, platform team owns Spark infra |
| **Shared database** | Two domains write to same schema | Split into separate schemas with owned tables |
| **Orphan domain** | Domain produces data no one consumes | Merge into consuming domain or deprecate |
| **Tiny domain** | 1-2 person team, single table | Combine with related domain until scalable |
| **Super domain** | One domain owns >50% of all data products | Split by sub-capability or lifecycle phase |
| **Hidden dependency** | A relies on B's internal table, not data product | Enforce: all cross-domain access via data product output ports |
| **No output port** | Domain has data product with no consumers | Delete or add output port with SLA |

## Domain Evolution Pattern

```
Phase 1: Foundation (months 1-3)
├── Decompose 2-3 domains (e.g., Commerce, Customer, Finance)
├── Each domain: 1 data product (the most critical output)
└── Platform: basic compute + storage + catalog

Phase 2: Expansion (months 4-9)
├── Add 2-3 more domains
├── Each domain: 2-3 data products covering major tables
├── Cross-domain sharing: all consumption via data product APIs
└── Platform: self-serve onboarding, monitoring, schema registry

Phase 3: Maturity (months 10-18)
├── All domains onboarded with full data product coverage
├── Federated governance: global policies + domain extensions
├── Automated data product lifecycle: CI/CD for schema, SLA, quality
└── Platform: data product marketplace, cost attribution, usage analytics
```
