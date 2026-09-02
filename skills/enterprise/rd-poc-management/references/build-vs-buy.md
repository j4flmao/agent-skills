# Technology Evaluation: Build vs. Buy vs. Adopt

## 1. The R&D Trap (Not-Invented-Here Syndrome)
Engineering teams naturally love to write code. When tasked with a new PoC, the default instinct is to build a custom solution from scratch. However, building custom software requires ongoing maintenance, security patching, and scaling—costs that exist forever.

Before a Department starts a PoC, they must evaluate the **Build vs. Buy vs. Adopt** matrix.

## 2. Wardley Mapping & Core Domain
The decision relies on understanding your company's **Core Domain** (what makes you money and differentiates you from competitors) versus **Supporting Domains** (things every company needs but don't provide a competitive advantage).

### 1. Buy (Commercial SaaS)
- **Use Case**: Generic, highly commoditized problems (Supporting Domains).
- **Examples**: Authentication (Auth0, Okta), CRM (Salesforce), Payment Processing (Stripe), Email Delivery (SendGrid).
- **R&D Rule**: NEVER build a custom Authentication system for a PoC. It is an enormous security risk and provides zero business differentiation. Buy it.

### 2. Adopt (Open Source Software)
- **Use Case**: Core infrastructural components that require customization and vendor-neutrality.
- **Examples**: Message Queues (Kafka, RabbitMQ), Databases (PostgreSQL), Container Orchestration (Kubernetes).
- **R&D Rule**: Adopting OSS is not "free." The licensing is free, but the Ops burden (hosting, patching, upgrading) is heavy. Ensure Global Operations has the bandwidth to manage it.

### 3. Build (Custom In-House Code)
- **Use Case**: The absolute core differentiator of your business (Core Domain). 
- **Examples**: Netflix's video recommendation algorithm, Uber's real-time dispatch engine, High-Frequency Trading execution logic.
- **R&D Rule**: Only write custom code if it gives the company a unique strategic advantage that cannot be bought off the shelf.

## 3. The R&D PoC Strategy
When a Department proposes an R&D PoC, the proposal must explicitly state:
*"We are BUYING Auth0 for identity, ADOPTING Kafka for messaging, so that 100% of our R&D engineering hours are spent BUILDING the custom AI-driven pricing algorithm."*

This proves to Global Architecture that the Department is maximizing ROI and minimizing legacy maintenance debt.
