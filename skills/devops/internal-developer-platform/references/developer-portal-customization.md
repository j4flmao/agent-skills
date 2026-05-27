# Developer Portal Customization Guide

## Overview

A production-grade developer portal goes beyond out-of-the-box Backstage, Port, or custom portals. This guide covers deep customization: custom plugins, scaffolder template design, TechDocs, software catalog modeling, API documentation, search integration, and plugin marketplace management.

## Backstage Custom Plugin Development

### Plugin Architecture

Backstage plugins follow a three-layer architecture: frontend, backend, and common. Each plugin is a separate npm package within the Backstage monorepo.

```
plugin-name/
  ├── src/
  │   ├── index.ts          # Plugin export
  │   ├── plugin.ts         # Plugin definition
  │   ├── components/       # React components
  │   ├── api/              # API client
  │   └── routes.ts         # Routing
  ├── dev/                  # Development index
  └── package.json
```

### Creating a Plugin

```typescript
// plugins/my-custom-plugin/src/plugin.ts
import { createPlugin, createRouteRef } from '@backstage/core-plugin-api';

export const rootRouteRef = createRouteRef({
  id: 'my-custom-plugin',
});

export const myCustomPlugin = createPlugin({
  id: 'my-custom-plugin',
  routes: {
    root: rootRouteRef,
  },
});
```

```typescript
// plugins/my-custom-plugin/src/components/ExampleComponent.tsx
import React from 'react';
import { useApi } from '@backstage/core-plugin-api';
import { myCustomApiRef } from '../api';
import { Table, TableColumn } from '@backstage/core-components';

export const ExampleComponent = () => {
  const client = useApi(myCustomApiRef);
  const [data, setData] = React.useState([]);

  React.useEffect(() => {
    client.fetchData().then(setData);
  }, [client]);

  const columns: TableColumn[] = [
    { title: 'Name', field: 'name' },
    { title: 'Status', field: 'status' },
    { title: 'Owner', field: 'owner' },
  ];

  return <Table columns={columns} data={data} title="My Custom Data" />;
};
```

### Backend Plugin with API

```typescript
// plugins/my-custom-backend/src/index.ts
import { createRouter } from './router';
import { PluginEnvironment } from '../types';

export default async function createPlugin({
  logger,
  database,
  config,
}: PluginEnvironment) {
  return await createRouter({ logger, database, config });
}
```

```typescript
// plugins/my-custom-backend/src/router.ts
import { Router } from 'express';
import { Logger } from 'winston';

export async function createRouter(options: {
  logger: Logger;
  database: any;
  config: any;
}): Promise<Router> {
  const { logger, database } = options;
  const router = Router();

  router.get('/health', (_, res) => {
    res.json({ status: 'ok' });
  });

  router.get('/data', async (req, res) => {
    try {
      const results = await database.query('SELECT * FROM my_table');
      res.json(results);
    } catch (error) {
      logger.error('Failed to fetch data', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  router.post('/data', async (req, res) => {
    try {
      const { name, status } = req.body;
      await database.query(
        'INSERT INTO my_table (name, status) VALUES (?, ?)',
        [name, status]
      );
      res.status(201).json({ success: true });
    } catch (error) {
      logger.error('Failed to insert data', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });

  return router;
}
```

### Plugin Package Configuration

```json
{
  "name": "@internal/plugin-my-custom",
  "version": "0.1.0",
  "main": "src/index.ts",
  "types": "src/index.ts",
  "license": "Apache-2.0",
  "backstage": {
    "role": "frontend-plugin",
    "pluginId": "my-custom",
    "pluginPackages": [
      "@internal/plugin-my-custom"
    ]
  },
  "dependencies": {
    "@backstage/core-components": "^0.13.0",
    "@backstage/core-plugin-api": "^1.7.0",
    "@backstage/theme": "^0.4.0",
    "@material-ui/core": "^4.12.2",
    "react": "^17.0.2"
  },
  "devDependencies": {
    "@backstage/cli": "^0.22.0"
  }
}
```

## Scaffolder Template Design

### Template Structure

```yaml
# templates/microservice/template.yaml
apiVersion: scaffolder.backstage.io/v1beta3
kind: Template
metadata:
  name: microservice-fastapi
  title: FastAPI Microservice
  description: Create a new FastAPI microservice with CI/CD and monitoring
  tags:
    - python
    - fastapi
    - microservice
    - kubernetes
spec:
  owner: platform-team
  type: service
  parameters:
    - title: Service Details
      required:
        - service_name
        - owner
      properties:
        service_name:
          title: Service Name
          type: string
          pattern: '^[a-z0-9-]+$'
          minLength: 3
          maxLength: 40
        description:
          title: Description
          type: string
          maxLength: 200
        owner:
          title: Owner
          type: string
          ui:field: OwnerPicker
        team:
          title: Team
          type: string
          ui:field: EntityPicker
          ui:options:
            catalogFilter:
              kind: Group
    - title: Infrastructure
      required:
        - environment
      properties:
        environment:
          title: Environment
          type: string
          enum:
            - development
            - staging
            - production
        cpu_limit:
          title: CPU Limit
          type: string
          default: "500m"
          enum: ["250m", "500m", "1000m", "2000m"]
        memory_limit:
          title: Memory Limit
          type: string
          default: "512Mi"
          enum: ["256Mi", "512Mi", "1Gi", "2Gi"]
  steps:
    - id: template
      name: Generate Service
      action: fetch:template
      input:
        url: ./skeleton
        values:
          service_name: ${{ parameters.service_name }}
          description: ${{ parameters.description }}
          owner: ${{ parameters.owner }}
          team: ${{ parameters.team }}
    - id: publish
      name: Publish to GitHub
      action: publish:github
      input:
        allowedHosts: ['github.com']
        repoUrl: github.com?owner=${{ parameters.team }}&repo=${{ parameters.service_name }}
        defaultBranch: main
        repoVisibility: private
    - id: register
      name: Register in Catalog
      action: catalog:register
      input:
        catalogInfoUrl: github.com?owner=${{ parameters.team }}&repo=${{ parameters.service_name }}&file=catalog-info.yaml
    - id: deploy
      name: Initial Deployment
      action: debug:log
      input:
        message: "Service ${{ parameters.service_name }} ready for deployment"
  output:
    links:
      - title: Open in GitHub
        icon: github
        url: ${{ steps.publish.output.remoteUrl }}
      - title: Open in Catalog
        icon: catalog
        url: ${{ steps.register.output.entityRef }}
```

### Template Skeleton Structure

```
templates/microservice/skeleton/
  ├── catalog-info.yaml
  ├── Dockerfile
  ├── Makefile
  ├── README.md
  ├── pyproject.toml
  ├── src/
  │   ├── __init__.py
  │   ├── main.py
  │   ├── routers/
  │   │   ├── __init__.py
  │   │   └── health.py
  │   ├── models/
  │   │   ├── __init__.py
  │   │   └── schemas.py
  │   └── config/
  │       ├── __init__.py
  │       └── settings.py
  ├── tests/
  │   ├── __init__.py
  │   └── test_health.py
  ├── k8s/
  │   ├── deployment.yaml
  │   ├── service.yaml
  │   ├── ingress.yaml
  │   └── hpa.yaml
  └── .github/
      └── workflows/
          └── ci.yaml
```

## TechDocs Setup

### Configuration

```yaml
# app-config.yaml
techdocs:
  builder: 'local'
  generators:
    techdocs: '@backstage/techdocs-cli'
  publisher:
    type: 'local'
    local:
      publishDirectory: './techdocs-published'
  scaffolder:
    mkdocs:
      strict:
        - true
```

### Service Documentation Template

```markdown
# {{ service_name }}

## Overview
{{ description }}

## Architecture
<!-- Architecture diagram and description -->

## API Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | /health | Health check |
| GET | /api/v1/items | List items |
| POST | /api/v1/items | Create item |

## Configuration
Environment variables:
| Variable | Default | Description |
|----------|---------|-------------|
| DATABASE_URL | - | PostgreSQL connection string |
| LOG_LEVEL | INFO | Logging level |
| PORT | 8000 | HTTP server port |

## Development

```bash
# Install dependencies
pip install -r requirements.txt

# Run locally
uvicorn src.main:app --reload

# Run tests
pytest
```

## Deployment

```bash
# Build container
docker build -t {{ service_name }} .

# Deploy to Kubernetes
kubectl apply -f k8s/
```

## Monitoring
- Grafana Dashboard: [link]
- Sentry Project: [link]
- PagerDuty Schedule: [link]

## Runbooks
### High CPU Usage
1. Check HPA metrics: `kubectl get hpa {{ service_name }}`
2. Review recent deployments for code changes
3. Scale horizontally if CPU > 80% for > 5 minutes

### Database Connection Errors
1. Verify database pod status: `kubectl get pods -l app=postgres`
2. Check connection pool exhaustion in logs
3. Restart connection pool if needed
```

## Software Catalog Modeling

### Entity Descriptor

```yaml
# catalog-info.yaml
apiVersion: backstage.io/v1alpha1
kind: Component
metadata:
  name: payment-service
  description: Payment processing microservice
  annotations:
    backstage.io/techdocs-ref: dir:.
    github.com/project-slug: team-alpha/payment-service
    sentry.io/project-slug: payment-service
    pagerduty.com/service-id: PXXXXX
    grafana/dashboard-selector: "payment-service"
spec:
  type: service
  lifecycle: production
  owner: team-alpha
  system: payment-platform
  subcomponentOf: payment-gateway
  dependsOn:
    - component:default/database-cluster
    - resource:default/stripe-api-key
    - api:default/stripe-api
  providesApis:
    - payment-api
```

### System and Resource Entities

```yaml
# system-payment-platform.yaml
apiVersion: backstage.io/v1alpha1
kind: System
metadata:
  name: payment-platform
  description: End-to-end payment processing platform
spec:
  owner: team-alpha
  domain: financial-services
---
apiVersion: backstage.io/v1alpha1
kind: Resource
metadata:
  name: database-cluster
  description: PostgreSQL primary-replica cluster
  annotations:
    terraform/module: "database/postgresql"
spec:
  type: database
  owner: platform-team
  system: payment-platform
  dependsOn:
    - resource:default/aws-rds-cluster
```

### API Entity with Spec

```yaml
apiVersion: backstage.io/v1alpha1
kind: API
metadata:
  name: payment-api
  description: Payment processing REST API
  tags:
    - rest
    - payments
spec:
  type: openapi
  lifecycle: production
  owner: team-alpha
  system: payment-platform
  definition:
    $text: ./openapi.yaml
```

## API Documentation Integration

### OpenAPI Spec Ingestion

```yaml
# app-config.yaml
catalog:
  locations:
    - type: url
      target: https://raw.githubusercontent.com/team-alpha/payment-service/main/openapi.yaml
      rules:
        - allow: [API]
```

### Custom API Doc Component

```typescript
// plugins/api-docs/src/components/ApiDocsPage.tsx
import React from 'react';
import { ApiEntity } from '@backstage/catalog-model';
import { useEntity } from '@backstage/plugin-catalog-react';
import { Grid } from '@material-ui/core';
import { ApiDefinitionCard } from '@backstage/plugin-api-docs';
import { EntityAboutCard } from '@backstage/plugin-catalog';

export const CustomApiDocsPage = () => {
  const { entity } = useEntity<ApiEntity>();

  return (
    <Grid container spacing={3}>
      <Grid item md={6}>
        <EntityAboutCard variant="gridItem" />
      </Grid>
      <Grid item md={6}>
        <ApiDefinitionCard
          definition={entity.spec.definition}
          type={entity.spec.type}
        />
      </Grid>
    </Grid>
  );
};
```

## Search Integration

### Backstage Search Configuration

```yaml
# app-config.yaml
search:
  elasticsearch:
    host: ${ELASTICSEARCH_HOST}
    port: ${ELASTICSEARCH_PORT}
    auth:
      apiKey: ${ELASTICSEARCH_API_KEY}
  collators:
    catalog:
      schedule:
        frequency: { minutes: 30 }
        timeout: { minutes: 3 }
    techdocs:
      schedule:
        frequency: { hours: 2 }
        timeout: { minutes: 5 }
```

### Custom Search Collator

```typescript
// plugins/my-custom-backend/src/search/CustomCollator.ts
import { DocumentCollator } from '@backstage/plugin-search-common';
import { Logger } from 'winston';

export class CustomCollator implements DocumentCollator {
  public readonly type = 'my-custom';

  constructor(private readonly logger: Logger) {}

  async execute() {
    this.logger.info('Executing custom search collator');

    return [
      {
        title: 'Custom Document 1',
        text: 'Content of custom document 1',
        location: '/my-custom/doc1',
        metadata: {
          type: 'my-custom',
          author: 'platform-team',
        },
      },
      {
        title: 'Custom Document 2',
        text: 'Content of custom document 2',
        location: '/my-custom/doc2',
        metadata: {
          type: 'my-custom',
          author: 'platform-team',
        },
      },
    ];
  }
}
```

## Plugin Marketplace Management

### Plugin Registry

```yaml
# plugins/plugin-registry.yaml
plugins:
  - name: '@internal/plugin-cost-insights'
    version: '0.2.0'
    status: stable
    category: Infrastructure
    owner: platform-team
    description: Cloud cost analysis and optimization recommendations
    documentation: https://backstage.io/docs/plugins/cost-insights
  - name: '@internal/plugin-firehydrant'
    version: '0.1.0'
    status: beta
    category: Incident Management
    owner: sre-team
    description: Incident management integration with FireHydrant
    documentation: https://backstage.io/docs/plugins/firehydrant
  - name: '@internal/plugin-custom-metrics'
    version: '0.3.0'
    status: stable
    category: Monitoring
    owner: platform-team
    description: Custom business metrics dashboard
    documentation: /docs/plugins/custom-metrics
```

### Plugin Lifecycle Management

```typescript
// plugins/plugin-admin/src/PluginManager.ts
interface PluginVersion {
  name: string;
  version: string;
  status: 'alpha' | 'beta' | 'stable' | 'deprecated';
  installed: boolean;
  dependsOn: string[];
}

class PluginManager {
  private registry: Map<string, PluginVersion>;

  async installPlugin(name: string, version: string): Promise<void> {
    const plugin = this.registry.get(name);
    if (!plugin) throw new Error(`Plugin ${name} not found`);

    // Check dependency tree
    for (const dep of plugin.dependsOn) {
      if (!this.registry.get(dep)?.installed) {
        throw new Error(`Dependency ${dep} not installed`);
      }
    }

    // Install plugin package
    await this.runCommand(`yarn add ${name}@${version}`);
    plugin.installed = true;

    // Register in Backstage config
    await this.updateAppConfig(name, version);
  }

  async uninstallPlugin(name: string): Promise<void> {
    const dependents = Array.from(this.registry.values())
      .filter(p => p.installed && p.dependsOn.includes(name));

    if (dependents.length > 0) {
      throw new Error(
        `Cannot uninstall ${name}: used by ${dependents.map(d => d.name).join(', ')}`
      );
    }

    await this.runCommand(`yarn remove ${name}`);
    this.registry.get(name)!.installed = false;
  }

  private async updateAppConfig(name: string, version: string): Promise<void> {
    // Update app-config.yaml with new plugin configuration
    console.log(`Registering ${name}@${version} in app-config.yaml`);
  }

  private async runCommand(command: string): Promise<void> {
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
      exec(command, { cwd: '/backstage' }, (err: any) => {
        if (err) reject(err);
        else resolve();
      });
    });
  }
}
```

### Plugin Testing Strategy

```typescript
// plugins/my-custom-plugin/src/setupTests.ts
import '@testing-library/jest-dom';

// plugins/my-custom-plugin/src/components/ExampleComponent.test.tsx
import React from 'react';
import { render } from '@testing-library/react';
import { TestApiProvider } from '@backstage/test-utils';
import { ExampleComponent } from './ExampleComponent';
import { myCustomApiRef } from '../api';

const mockApi = {
  fetchData: jest.fn().mockResolvedValue([
    { name: 'Item 1', status: 'active', owner: 'team-a' },
    { name: 'Item 2', status: 'inactive', owner: 'team-b' },
  ]),
};

describe('ExampleComponent', () => {
  it('renders data in table', async () => {
    const { findByText } = render(
      <TestApiProvider apis={[[myCustomApiRef, mockApi]]}>
        <ExampleComponent />
      </TestApiProvider>
    );

    expect(await findByText('Item 1')).toBeInTheDocument();
    expect(await findByText('team-a')).toBeInTheDocument();
  });

  it('shows loading state', () => {
    mockApi.fetchData.mockImplementationOnce(() => new Promise(() => {}));
    const { getByText } = render(
      <TestApiProvider apis={[[myCustomApiRef, mockApi]]}>
        <ExampleComponent />
      </TestApiProvider>
    );

    expect(getByText('Loading...')).toBeInTheDocument();
  });
});
```

## Key Points

- Backstage plugins follow a three-layer architecture: frontend (React), backend (Express), common (types)
- Scaffolder templates use v1beta3 API with parameterized inputs, multi-step workflows, and structured outputs
- TechDocs integrates mkdocs with Backstage for service documentation that stays close to the code
- Software Catalog supports Component, System, Resource, API, Group, User, and Domain entity kinds with rich annotation mapping
- Search integration enables Elasticsearch-based indexing with customizable collators for any data source
- Plugin marketplace management requires registry tracking, dependency resolution, versioning, and lifecycle policies
