# Scheduling Security

Secure job scheduling prevents unauthorized access, data leaks, and resource abuse.

## Authentication and Authorization

Jobs should authenticate before accessing resources:

```typescript
class SecureJob {
  async execute(context: JobContext): Promise<void> {
    // Verify job identity
    if (!this.verifyJobToken(context.jobToken)) {
      throw new Error('Invalid job token');
    }

    // Check authorization for the operation
    if (!context.permissions.canExecute(this.name)) {
      throw new Error('Job not authorized');
    }

    await this.run(context);
  }

  private verifyJobToken(token: string): boolean {
    try {
      const payload = jwt.verify(token, process.env.JOB_SECRET!);
      return payload.job === this.name && payload.issuer === 'scheduler';
    } catch {
      return false;
    }
  }
}
```

## Secret Management

Never hardcode secrets in job definitions:

```typescript
class SecureScheduler {
  private vault: VaultClient;

  async scheduleJob(job: JobDefinition): Promise<void> {
    // Store reference to secret, not the secret itself
    const secretRef = await this.vault.createSecret(job.name, {
      apiKey: job.apiKey,
      dbPassword: job.dbPassword,
    });

    await this.scheduler.schedule({
      ...job,
      secretRef: secretRef.path,
      // never store actual secrets
      apiKey: undefined,
      dbPassword: undefined,
    });
  }

  async executeJob(jobName: string): Promise<void> {
    const job = await this.scheduler.getJob(jobName);
    const secrets = await this.vault.readSecret(job.secretRef);

    // Inject secrets into job execution context
    await this.runJob(job, secrets);
  }
}
```

## Permission Model

Define what each job can access:

```yaml
jobs:
  invoice-generation:
    permissions:
      database:
        - SELECT FROM invoices
        - SELECT FROM customers
      network:
        - POST email-service.send
      filesystem:
        - READ /tmp/reports
        - WRITE /tmp/reports
    resource_limits:
      memory: 512MB
      timeout: 300s
      max_retries: 3
```

## Input Validation

Validate all job inputs before execution:

```typescript
class SecureJobRunner {
  async run(job: JobDefinition, params: Record<string, unknown>): Promise<void> {
    // Validate parameters against schema
    const schema = this.getJobSchema(job.name);
    const validated = schema.parse(params);

    // Sanitize file paths
    if (validated.outputPath) {
      validated.outputPath = path.resolve('/safe/dir', path.basename(validated.outputPath));
      if (!validated.outputPath.startsWith('/safe/dir')) {
        throw new Error('Path traversal detected');
      }
    }

    await job.handler(validated);
  }
}
```

## Audit Logging

Log all job scheduling and execution events:

```typescript
function logJobEvent(event: string, jobName: string, details: Record<string, unknown>): void {
  logger.info({
    event: `job.${event}`,
    jobName,
    scheduledBy: details.scheduledBy,
    executedBy: details.executedBy,
    timestamp: new Date().toISOString(),
    ip: details.ip,
    result: details.result,
  });
}

// Usage
logJobEvent('scheduled', 'invoice-generation', {
  scheduledBy: 'admin@example.com',
  schedule: '0 8 * * 1-5',
  ip: '192.168.1.1',
});

logJobEvent('completed', 'invoice-generation', {
  executedBy: 'scheduler-node-3',
  durationMs: 4523,
  result: 'success',
});
```

## Network Isolation

Run jobs with restricted network access:

```typescript
class NetworkIsolatedJobRunner {
  async run(job: JobDefinition): Promise<void> {
    const allowedHosts = this.getAllowedHosts(job.name);

    // Patch DNS resolution to restrict network access
    const originalLookup = dns.lookup;
    dns.lookup = (hostname: string, options: unknown, callback: Function) => {
      if (!allowedHosts.includes(hostname) && !allowedHosts.includes('*')) {
        callback(new Error(`Network access to ${hostname} not allowed`));
        return;
      }
      originalLookup(hostname, options, callback);
    };

    try {
      await job.handler();
    } finally {
      dns.lookup = originalLookup; // restore
    }
  }
}
```

## Resource Quotas

Prevent jobs from consuming excessive resources:

```typescript
class ResourceConstrainedJobRunner {
  async run(job: JobDefinition): Promise<void> {
    const quota = this.getResourceQuota(job.name);

    // Set memory limit
    if (quota.memoryMB) {
      const usage = process.memoryUsage();
      if (usage.heapUsed > quota.memoryMB * 1024 * 1024) {
        throw new Error(`Job exceeded memory quota of ${quota.memoryMB}MB`);
      }
    }

    // Enforce runtime limit
    const controller = new AbortController();
    const timeout = setTimeout(() => {
      controller.abort();
      throw new Error(`Job exceeded runtime limit of ${quota.timeout}s`);
    }, quota.timeout * 1000);

    try {
      await job.handler({ signal: controller.signal });
    } finally {
      clearTimeout(timeout);
    }
  }
}
```

## Key Points
- Authenticate jobs before execution with tokens
- Store secrets in a vault, never in job definitions or config files
- Define granular permissions per job (DB, network, filesystem)
- Validate and sanitize all job input parameters
- Log all scheduling and execution events for audit trail
- Restrict network access per job to only required hosts
- Enforce resource quotas (memory, runtime, retries) per job
- Use process isolation for untrusted or user-submitted jobs
