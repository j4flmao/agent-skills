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

## Rules

1. Never hardcode email credentials — always use environment variables or secret management.
2. Always validate email addresses before sending (RFC 5321 syntax check + MX record check).
3. Always include List-Unsubscribe header for bulk-sending domains.
4. Never send marketing content through transactional email streams.
5. Always implement suppression list checks before sending.
6. Always use TLS for SMTP connections (port 587 or 465).
7. Never log full email body content in application logs.
8. Always provide plaintext fallback alongside HTML.
9. Always test emails with real-world email clients (Gmail, Outlook, Apple Mail).
10. Never exceed provider rate limits — implement client-side throttling.
11. Always monitor bounce rate (< 2%) and complaint rate (< 0.1%).
12. Never send to unverified domains without proper warmup.
13. Always implement idempotent email sending to prevent duplicates.
14. Never store sensitive data (passwords, tokens) in email body.
15. Always provide unsubscribe mechanism in every email.
16. Always track email lifecycle (sent, delivered, opened, clicked, bounced, complained).
17. Never assume HTML rendering — always test across clients.
18. Always implement gradual sending (IP warmup) for new domains.
19. Never use generic "from" name — use recognizable sender identity.
20. Always keep template rendering separate from business logic.

## References
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
