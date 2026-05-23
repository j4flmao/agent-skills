# Federation Architecture

## Subgraph Design Principles
- Each subgraph owns its domain (users, orders, reviews, inventory)
- Subgraphs are independent: deployable, scalable, testable separately
- Use @key to define entity reference fields
- Minimize cross-subgraph dependencies
- Each subgraph has its own database

## Apollo Federation Version Comparison
| Feature | Federation 1 | Federation 2 |
|---------|--------------|--------------|
| @key | Required | Required |
| @extends | Required | Not needed (implicit) |
| @external | Required | Not needed (implicit) |
| @requires | Available | Available |
| @provides | Available | Available |
| @shareable | N/A | Available |
| @override | N/A | Available |
| @inaccessible | N/A | Available |

## Subgraph Boundaries
| Domain | Subgraph | Entity | Key |
|--------|----------|--------|-----|
| Users | accounts | User | id |
| Products | products | Product | id |
| Orders | orders | Order | id, User, Product |
| Reviews | reviews | Review | id, User, Product |
| Inventory | inventory | Product | id |
