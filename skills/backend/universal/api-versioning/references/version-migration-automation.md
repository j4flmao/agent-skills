# API Version Migration Automation

## Overview
Automate the process of versioning APIs, migrating consumers, and sunsetting old versions with minimal manual overhead.

## Migration Pipeline

```yaml
# .github/workflows/api-migration.yml
name: API Version Migration
on:
  workflow_dispatch:
    inputs:
      from_version:
        description: 'Old API version (e.g., v1)'
        required: true
      to_version:
        description: 'New API version (e.g., v2)'
        required: true

jobs:
  migration:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Check breaking changes
        run: npx openapi-diff --old=openapi-${{ inputs.from_version }}.yaml --new=openapi-${{ inputs.to_version }}.yaml
      - name: Generate migration guide
        run: |
          echo "# API Migration: ${{ inputs.from_version }} → ${{ inputs.to_version }}" > migration-guide.md
          echo "## Breaking Changes" >> migration-guide.md
          npx openapi-diff --old=openapi-${{ inputs.from_version }}.yaml --new=openapi-${{ inputs.to_version }}.yaml --markdown >> migration-guide.md
      - name: Create migration branch
        run: |
          git checkout -b migration/${{ inputs.to_version }}
          git add .
          git commit -m "chore: prepare ${{ inputs.to_version }} migration"
          git push origin migration/${{ inputs.to_version }}
      - name: Deploy new version
        run: npm run deploy:${{ inputs.to_version }}
```

## Version Router Setup

```typescript
// Automatic version routing
import { Router } from 'express';

class VersionRouter {
  private routers: Map<string, Router> = new Map();
  private sunsetDates: Map<string, Date> = new Map();

  register(version: string, router: Router, sunsetDate?: Date): void {
    this.routers.set(version, router);
    if (sunsetDate) {
      this.sunsetDates.set(version, sunsetDate);
    }
  }

  createHandler(): Router {
    const mainRouter = Router();

    for (const [version, router] of this.routers) {
      mainRouter.use(`/${version}`, (req, res, next) => {
        // Add deprecation headers for old versions
        const sunset = this.sunsetDates.get(version);
        if (sunset) {
          res.set('Deprecation', `version="${version}"`);
          res.set('Sunset', sunset.toUTCString());
          res.set('Link', `</v2>; rel="successor-version"`);

          if (new Date() >= sunset) {
            return res.status(410).json({
              success: false,
              error: { code: 'GONE', message: `API version ${version} has been sunset. Use v2.` },
            });
          }
        }
        next();
      }, router);
    }

    return mainRouter;
  }
}

// Usage
const versionRouter = new VersionRouter();
versionRouter.register('v1', v1Router, new Date('2026-08-15'));
versionRouter.register('v2', v2Router);
app.use(versionRouter.createHandler());
```

## Traffic Migration

```typescript
// Gradual traffic shift from old to new version
interface TrafficConfig {
  oldVersion: string;
  newVersion: string;
  oldWeight: number;  // percentage (0-100)
  newWeight: number;
}

async function migrateTraffic(config: TrafficConfig): Promise<void> {
  const gateway = await getGatewayClient();

  await gateway.updateRoute('order-route', {
    versionRouting: [
      { version: config.oldVersion, weight: config.oldWeight },
      { version: config.newVersion, weight: config.newWeight },
    ],
  });

  // Monitor error rates during migration
  const monitor = setInterval(async () => {
    const metrics = await getMetrics();
    const errorRate = metrics.errors / metrics.total;

    if (errorRate > 0.01) {
      // Rollback
      await gateway.updateRoute('order-route', {
        versionRouting: [
          { version: config.oldVersion, weight: 100 },
          { version: config.newVersion, weight: 0 },
        ],
      });
      clearInterval(monitor);
      throw new Error('Migration rolled back due to error rate spike');
    }

    console.log(`Migration progress: ${config.newVersion} ${metrics.newVersionPercent}%`);
  }, 30000);
}
```

## Sunset Automation

```typescript
async function sunsetVersion(version: string): Promise<void> {
  // 1. Check usage metrics
  const usage = await getVersionUsage(version);
  if (usage.activeConsumers > 0) {
    throw new Error(`Cannot sunset ${version}: ${usage.activeConsumers} active consumers`);
  }

  // 2. Remove from gateway
  await removeVersionFromGateway(version);

  // 3. Delete route handlers
  await deleteRouteFiles(version);

  // 4. Archive spec
  await archiveSpec(version);

  // 5. Update changelog
  await updateChangelog(`## Removed\n- \`${version}\` — Sunset on ${new Date().toISOString().split('T')[0]}`);

  // 6. Deploy clean
  await deploy();
}

// Scheduled sunset check
cron.schedule('0 0 * * 0', async () => {
  const versions = await getActiveVersions();
  for (const version of versions) {
    if (version.sunsetDate && new Date() >= version.sunsetDate) {
      const usage = await getVersionUsage(version.name);
      if (usage.activeConsumers === 0) {
        await sunsetVersion(version.name);
      }
    }
  }
});
```

## Key Points
- Automate migration pipelines that check breaking changes and generate guides
- Use version routers with automatic deprecation header injection
- Gradually shift traffic from old to new version with automatic rollback
- Automatically sunset versions when consumer count reaches zero
- Monitor error rates during migration and rollback on anomalies
