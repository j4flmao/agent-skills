---
name: backend-transactional-email
description: >
  Enforce transactional email patterns including SMTP/SES/SendGrid/Resend setup,
  MJML responsive template design, deliverability (SPF/DKIM/DMARC), webhook
  handling, rate limiting, and GDPR-compliant email operations. NOT for marketing
  campaigns, newsletters, or bulk unsolicited email.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, email, phase-10]
---

# Transactional Email Skill

## Purpose
Build reliable, deliverable, and compliant transactional email systems using proven provider integrations, responsive MJML templates, and deliverability best practices.

## Architecture Decision Trees

### Provider Selection

| Criterion | Amazon SES | SendGrid | Resend | Postmark | SMTP (self) |
|-----------|-----------|----------|--------|----------|-------------|
| Volume pricing | $0.10/1K (62K free) | $19.95/50K | Free tier: 3K/mo | $10/10K | Infrastructure cost |
| Deliverability | Good (reputation shared) | Good | Excellent (dedicated IP) | Excellent | Depends on setup |
| Template engine | Custom HTML | Dynamic templates | React Email / MJML | Custom HTML | Any |
| Webhooks | SNS + SQS | Event Webhook | Webhooks (built-in) | Webhooks | Custom |
| Open/click tracking | SES Config Set | Built-in | Built-in | Built-in | Custom |
| Dedicated IP | Yes (paid) | Yes (paid) | Yes | Yes | Yes |
| API style | AWS SDK / SMTP | REST / SMTP | REST (simple) | REST / SMTP | SMTP |
| Best for | High volume, AWS shops | Mid-volume marketing | Modern DX, dev teams | Transactional only | Full control |

Decision: Resend for modern apps with great DX. SES for cost-sensitive high volume. Postmark for transactional-only where deliverability is critical.

### Template Rendering Strategy

| Strategy | Pros | Cons | Best For |
|----------|------|------|----------|
| MJML → HTML (build-time) | Fast, no runtime dep | Rebuild to change templates | Static templates |
| MJML → HTML (runtime) | Dynamic per-user | CPU cost per send | Personalized templates |
| React Email (JSX) | Component reuse, type-safe | Node.js only, build step | React codebases |
| Handlebars + HTML | Universal, simple | No responsive guarantees | Mixed stacks |
| Provider templates (SendGrid, SES) | No rendering code | Vendor lock-in, less flexible | Simple notifications |

Decision: MJML compiled at build-time with runtime variable injection via Handlebars. React Email for all-React codebases.

### Delivery Architecture Patterns

| Pattern | Description | Latency | Reliability | Complexity |
|---------|-------------|---------|-------------|------------|
| Direct send (API) | Send immediately in request handler | Lowest | Low (no retry) | Simplest |
| Queue + worker | Push to queue, worker sends | Medium | High (retry + DLQ) | Moderate |
| Dedicated email service | Separate microservice | Higher | Highest (isolated) | Complex |
| Third-party API | Provider API only | Low | Provider-dependent | Simplest |

Decision: Queue + worker for production. Direct send for low-volume admin emails only.

## Agent Protocol

### Trigger
User mentions transactional email, email delivery, SMTP, SES, SendGrid, Resend, email templates, MJML, email testing, email webhooks, email analytics, email localization, email compliance, or deliverability setup.

### Input Context
- Email provider choice and credentials
- Template types needed (welcome, reset password, invoice, notification)
- Volume estimates and sending quotas
- Compliance requirements (GDPR, CAN-SPAM)
- Locale/language requirements

### Output Artifact
SKILL.md adherence document plus implemented email delivery code, MJML templates, webhook handlers, and deliverability configuration.

### Response Format
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] Email provider configured with SMTP or API credentials
- [ ] MJML responsive templates created for all required transactional types
- [ ] SPF/DKIM/DMARC DNS records documented or applied
- [ ] Webhook endpoints for bounces/complaints implemented
- [ ] Rate limiting and sending quotas enforced
- [ ] Email testing setup (MailHog or Ethereal) operational
- [ ] Template localization strategy defined
- [ ] GDPR compliance (unsubscribe, data retention) implemented

### Max Response Length
4096 tokens

## Workflow

1. **Provider Selection & Setup**: Choose provider based on volume, cost, feature needs. Configure SMTP credentials or API keys as environment variables.

```typescript
// Resend example
import { Resend } from 'resend';
const resend = new Resend(process.env.RESEND_API_KEY);

await resend.emails.send({
  from: 'noreply@yourdomain.com',
  to: 'user@example.com',
  subject: 'Welcome to Our Platform',
  html: '<p>Welcome!</p>',
});
```

```python
# SES with boto3
import boto3
from botocore.exceptions import ClientError

ses = boto3.client('ses', region_name='us-east-1')
response = ses.send_email(
  Source='noreply@yourdomain.com',
  Destination={'ToAddresses': ['user@example.com']},
  Message={
    'Subject': {'Data': 'Welcome'},
    'Body': {'Html': {'Data': '<p>Welcome!</p>'}}
  }
)
```

2. **MJML Template Creation**: Build responsive, mobile-first email templates. Use MJML components for consistent rendering across clients.

```mjml
<mjml>
  <mj-head>
    <mj-title>Welcome to Our Platform</mj-title>
    <mj-preview>Start your journey with us</mj-preview>
    <mj-attributes>
      <mj-all font-family="Inter, Arial, sans-serif" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f4f4f4">
    <mj-section>
      <mj-column>
        <mj-image src="{{logoUrl}}" width="120px" />
        <mj-text font-size="24px" font-weight="bold" color="#1a1a1a">
          Welcome, {{name}}!
        </mj-text>
        <mj-text font-size="16px" color="#555555">
          We're excited to have you on board. Get started by exploring our features.
        </mj-text>
        <mj-button href="{{actionUrl}}" background-color="#0066ff" border-radius="8px">
          Get Started
        </mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

3. **Deliverability Configuration**: Set up SPF, DKIM, and DMARC DNS records for your sending domain.

```typescript
// SPF record (TXT): v=spf1 include:amazonses.com include:sendgrid.net ~all
// DKIM record (TXT): Selector and public key from provider
// DMARC record (TXT): v=DMARC1; p=quarantine; rua=mailto:dmarc@yourdomain.com
```

4. **Webhook Handling**: Process delivery events — bounces, complaints, opens, clicks.

```typescript
// SendGrid event webhook
app.post('/webhooks/email', (req, res) => {
  const events = req.body;
  for (const event of events) {
    switch (event.event) {
      case 'bounce':
        await markEmailAsBounced(event.email, event.reason);
        break;
      case 'spamreport':
        await addToSuppressionList(event.email);
        break;
      case 'open':
        await trackOpen(event.email, event.timestamp);
        break;
    }
  }
  res.status(200).send('OK');
});
```

5. **Rate Limiting & Quotas**: Enforce sending limits per recipient, per domain, per hour.

```typescript
class EmailRateLimiter {
  private limits: Map<string, number[]> = new Map();

  async canSend(recipientDomain: string): Promise<boolean> {
    const now = Date.now();
    const window = 3600000; // 1 hour
    const maxPerHour = 100;

    const timestamps = this.limits.get(recipientDomain) || [];
    const recent = timestamps.filter(t => now - t < window);

    if (recent.length >= maxPerHour) return false;

    recent.push(now);
    this.limits.set(recipientDomain, recent);
    return true;
  }
}
```

6. **Template Management**: Version templates, support localization, store in database or file system.

```typescript
interface EmailTemplate {
  id: string;
  type: 'welcome' | 'reset_password' | 'invoice' | 'notification';
  subject: string;
  bodyMjml: string;
  locale: string;
  version: number;
  variables: string[];
  updatedAt: Date;
}
```

7. **Email Testing**: Use MailHog locally or Ethereal for dev/test environments.

```yaml
# docker-compose.yml for MailHog
services:
  mailhog:
    image: mailhog/mailhog
    ports:
      - "1025:1025" # SMTP
      - "8025:8025" # Web UI
```

## Implementation Patterns

### Pattern: Queue-Based Email Worker with Retry

```typescript
// email-queue.ts
import { Queue, Worker } from 'bullmq';
import Redis from 'ioredis';

const connection = new Redis(process.env.REDIS_URL!);
const emailQueue = new Queue('transactional-email', { connection });

interface EmailJob {
  to: string;
  subject: string;
  body: { html: string; text: string };
  templateId?: string;
  variables?: Record<string, unknown>;
  metadata?: { userId: string; type: string };
  idempotencyKey: string;
}

async function enqueueEmail(job: EmailJob, delay = 0) {
  const existing = await emailQueue.getJob(job.idempotencyKey);
  if (existing) return existing;
  return emailQueue.add(job.idempotencyKey, job, {
    jobId: job.idempotencyKey,
    attempts: 3,
    backoff: { type: 'exponential', delay: 2000 },
    removeOnComplete: 1000,
    removeOnFail: 100,
    delay,
  });
}

const worker = new Worker<EmailJob>('transactional-email', async (job) => {
  const provider = getActiveProvider();
  try {
    const result = await provider.send({
      from: process.env.FROM_EMAIL!,
      to: job.data.to,
      subject: job.data.subject,
      html: job.data.body.html,
      text: job.data.body.text,
      headers: {
        'X-Entity-Ref-ID': job.data.idempotencyKey,
        'List-Unsubscribe': `<${process.env.UNSUBSCRIBE_URL}?uid=${job.data.metadata?.userId}>`,
      },
    });
    await trackEvent(job.data.metadata?.type || 'unknown', 'sent', { jobId: job.id, messageId: result.id });
    return result;
  } catch (error) {
    await trackEvent(job.data.metadata?.type || 'unknown', 'failed', { jobId: job.id, error: error.message });
    throw error; // triggers BullMQ retry
  }
}, { connection, concurrency: 10, limiter: { max: 50, duration: 1000 } });
```

### Pattern: Provider Abstraction (Strategy Pattern)

```typescript
// providers/provider-interface.ts
interface EmailProvider {
  name: string;
  send(params: SendParams): Promise<SendResult>;
  verifyAddress(email: string): Promise<boolean>;
  getSuppressionList(): Promise<string[]>;
  addToSuppressionList(email: string): Promise<void>;
  removeFromSuppressionList(email: string): Promise<void>;
}

// providers/resend.provider.ts
import { Resend } from 'resend';
export class ResendProvider implements EmailProvider {
  name = 'resend';
  private client = new Resend(process.env.RESEND_API_KEY);

  async send(params: SendParams): Promise<SendResult> {
    const { data, error } = await this.client.emails.send({
      from: params.from, to: params.to, subject: params.subject,
      html: params.html, text: params.text,
      headers: params.headers,
    });
    if (error) throw new Error(error.message);
    return { id: data!.id, provider: this.name };
  }

  async verifyAddress(email: string) {
    const { data } = await this.client.contacts.create({ email, audienceId: 'audit' });
    return !!data;
  }

  async getSuppressionList() { return []; }
  async addToSuppressionList(email: string) { /* Resend manages automatically */ }
  async removeFromSuppressionList(email: string) { /* Resend manages automatically */ }
}

// providers/ses.provider.ts
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
export class SesProvider implements EmailProvider {
  name = 'ses';
  private client = new SESClient({ region: process.env.AWS_REGION });

  async send(params: SendParams): Promise<SendResult> {
    const cmd = new SendEmailCommand({
      Source: params.from,
      Destination: { ToAddresses: [params.to] },
      Message: {
        Subject: { Data: params.subject, Charset: 'UTF-8' },
        Body: {
          Html: { Data: params.html, Charset: 'UTF-8' },
          Text: { Data: params.text, Charset: 'UTF-8' },
        },
      },
      ConfigurationSetName: process.env.SES_CONFIG_SET,
    });
    const result = await this.client.send(cmd);
    return { id: result.MessageId!, provider: this.name };
  }

  async verifyAddress(email: string) {
    try { await this.client.send(new SendEmailCommand({ Source: 'verify@domain.com', Destination: { ToAddresses: [email] }, Message: { Subject: { Data: 'Verify' }, Body: { Text: { Data: 'verify' } } } })); return true; }
    catch { return false; }
  }
  async getSuppressionList(): Promise<string[]> { return []; }
  async addToSuppressionList(email: string) { /* Use SES suppression list */ }
  async removeFromSuppressionList(email: string) { /* Use SES suppression list */ }
}
```

### Pattern: MJML Template with Handlebars

```typescript
// template-engine.ts
import Handlebars from 'handlebars';
import mjml from 'mjml';
import fs from 'fs';
import path from 'path';

interface CompiledTemplate {
  render(variables: Record<string, unknown>): { html: string; text: string; subject: string };
}

class EmailTemplateEngine {
  private cache = new Map<string, CompiledTemplate>();

  loadTemplate(type: string, locale = 'en'): CompiledTemplate {
    const key = `${type}:${locale}`;
    if (this.cache.has(key)) return this.cache.get(key)!;

    const mjmlSource = fs.readFileSync(path.join(__dirname, `templates/${locale}/${type}.mjml`), 'utf-8');
    const { html, errors } = mjml(mjmlSource, { validationLevel: 'strict' });
    if (errors.length > 0) throw new Error(`MJML errors: ${errors.map(e => e.message).join(', ')}`);

    const template = Handlebars.compile(html);
    const textTemplate = Handlebars.compile(stripHtml(html));
    const subjectTemplate = Handlebars.compile(extractSubject(mjmlSource));

    const compiled: CompiledTemplate = {
      render: (variables) => ({
        html: template(variables),
        text: textTemplate(variables),
        subject: subjectTemplate(variables),
      }),
    };
    this.cache.set(key, compiled);
    return compiled;
  }
}
```

## Production Considerations

### Deliverability
- Warm up dedicated IPs gradually: start at 50/day, increase 20% daily over 4-6 weeks
- Monitor reputation: bounce rate <2%, complaint rate <0.1%, spam trap hits = 0
- Implement feedback loop: process ARF reports (Abuse Reporting Format) from ISPs
- Domain reputation: use subdomain per email type (e.g., tx.example.com, mktg.example.com)
- Throttle sending: never send >50% of daily volume in first hour

### Infrastructure
- Run email worker as separate process with dedicated resources
- DLQ for failed emails after exhausting retries — alert on DLQ growth
- Rate limit per provider: track usage and failover to secondary provider at 80% quota
- Template caching: compile MJML → HTML at deploy time, not at send time

### Monitoring
- Metrics: send rate, delivery rate, bounce rate, complaint rate, open rate, click rate, latency p50/p95/p99
- Alerts: bounce rate >3%, complaint rate >0.1%, queue depth >10K, any provider returning 5xx
- Dashboards: Grafana with email funnel (enqueued → sent → delivered → opened → clicked)

## Anti-Patterns

| Anti-Pattern | Why | Fix |
|-------------|-----|-----|
| Sending email in request handler | Blocks response; no retry on failure | Queue + worker pattern |
| Using FROM address without domain auth | Gmail/Outlook will spam or reject | Set up SPF, DKIM, DMARC first |
| Ignoring suppression list | High complaint rate; account suspension | Check suppression list before every send |
| HTML-only emails | Spam filters penalize; accessibility broken | Always include plaintext multipart/alternative |
| Generic sender name ("noreply") | Low open rates; users don't recognize | Use recognizable name like "Acme Support" |
| No tracking of bounces/complaints | Ignorance of deliverability problems | Process webhooks; store event per email |
| Sending to unverified domains | High bounce rate damages reputation | Verify domain ownership; warm up gradually |
| Same template for all locales | Poor engagement; legal risk in some regions | Locale-specific templates with i18n |

## Security Considerations

- Store API keys in secrets manager (AWS Secrets Manager, HashiCorp Vault), never in code or env files committed to git
- Rotate SMTP credentials and API keys every 90 days
- Validate all email addresses against allow-list for security-critical emails (password reset, 2FA)
- Implement HMAC-signed unsubscribe links to prevent abuse unsubscribe
- Rate limit password reset emails: max 3 per hour per user
- Never include raw user input in email subject or body without escaping
- Use subdomains for transactional vs. marketing to isolate reputation risk
- TLS required for all SMTP connections — reject connections that downgrade to plaintext

## Testing Strategies

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { MailHog } from 'mailhog';

async function testEmailDelivery() {
  const mailhog = new MailHog({ host: 'localhost', port: 8025 });

  describe('Transactional Email', () => {
    beforeAll(async () => {
      await mailhog.deleteAll();
    });

    it('sends welcome email', async () => {
      await sendWelcomeEmail({ name: 'Test User', email: 'test@example.com' });
      const messages = await mailhog.messages();
      const msg = messages.items.find(m => m.to.includes('test@example.com'));
      expect(msg).toBeDefined();
      expect(msg.subject).toBe('Welcome to Our Platform');
      expect(msg.html).toContain('Test User');
    });

    it('renders MJML template correctly', async () => {
      const { html } = renderTemplate('welcome', { name: 'Alice' });
      expect(html).toContain('Alice');
      expect(html).toContain('<mjml>'); // compiled, not raw
    });

    it('validates email format before sending', () => {
      expect(validateEmail('not-an-email')).toBe(false);
      expect(validateEmail('user@example.com')).toBe(true);
    });

    it('enforces rate limits', async () => {
      const results = await Promise.allSettled(
        Array.from({ length: 101 }, (_, i) => sendEmail({ email: `user${i}@test.com` }))
      );
      const rejected = results.filter(r => r.status === 'rejected');
      expect(rejected.length).toBeGreaterThan(0);
    });

    it('processes bounce webhook', async () => {
      const result = await handleBounceWebhook({
        email: 'bounce@example.com',
        reason: '550 mailbox full',
        timestamp: new Date().toISOString(),
      });
      expect(result.suppressed).toBe(true);
      const suppressed = await isSuppressed('bounce@example.com');
      expect(suppressed).toBe(true);
    });
  });
}
```

- Use MailHog in CI for integration testing without real email delivery
- Test all 10+ email clients with Email on Acid or Litmus before going live
- Validate SPF/DKIM/DMARC records with `checkdmarc` Python library in CI
- Load test: send 10K emails through queue, measure throughput and worker utilization
- A/B test subject lines and sender names for open rate optimization

## Rules
  - references/deliverability.md — Email Deliverability
  - references/delivery-setup.md — Email Delivery Setup
  - references/email-analytics.md — Email Analytics
  - references/email-compliance.md — Email Compliance
  - references/email-testing.md — Email Testing
  - references/mjml-templates.md — MJML Email Templates
  - references/transactional-email-advanced.md — Transactional Email Advanced Topics
  - references/transactional-email-fundamentals.md — Transactional Email Fundamentals
## Handoff
- `backend/sms-messaging` — Alternative messaging channel for 2FA and notifications
- `data/analytics` — Email analytics and reporting integration
- `security/compliance` — GDPR and data retention compliance patterns
