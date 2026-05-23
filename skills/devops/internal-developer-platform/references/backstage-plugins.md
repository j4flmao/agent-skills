# Backstage Plugin Development

## Plugin Types
| Type | Description | Example |
|------|-------------|---------|
| Frontend plugin | UI in Backstage | Service catalog, tech docs |
| Backend plugin | API endpoints | Catalog, scaffolder, search |
| Backend module | Extend existing plugin | Auth provider, catalog processor |

## Basic Plugin Structure
`
plugins/
  └── my-plugin/
      ├── src/
      │   ├── index.ts — plugin export
      │   ├── components/ — React components
      │   └── routes.ts — API routes
      ├── dev/ — development setup
      └── package.json
`

## Common Plugin Patterns
- Service catalog processors: ingest data from external systems
- Custom scaffolder actions: organization-specific provisioning
- TechDocs backends: custom documentation storage
- Search collators: index additional data sources
