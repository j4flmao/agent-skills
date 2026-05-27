# Email Testing

## Overview
Comprehensive email testing covers local development with MailHog or Ethereal, template rendering validation, webhook simulation, cross-client rendering, and CI pipeline integration.

## Local Development with MailHog

### MailHog Setup

```yaml
# docker-compose.yml
services:
  mailhog:
    image: mailhog/mailhog
    container_name: mailhog
    ports:
      - "1025:1025"   # SMTP server
      - "8025:8025"   # Web UI
    environment:
      MH_STORAGE: maildir
      MH_MAILDIR_PATH: /maildir
      MH_SMTP_AUTH_STR: "true"
      MH_SMTP_REQUIRE_AUTH: "true"
    volumes:
      - mailhog_data:/maildir

volumes:
  mailhog_data:
```

### Application Configuration for MailHog

```typescript
// config/email.ts
function getEmailConfig() {
  if (process.env.NODE_ENV === 'development') {
    return {
      host: 'localhost',
      port: 1025,
      secure: false,
      auth: {
        user: '',  // MailHog accepts any user/pass
        pass: '',
      },
      ignoreTLS: true,
    };
  }

  return {
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT),
    secure: process.env.SMTP_SECURE === 'true',
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  };
}
```

### MailHog API Integration

```typescript
class MailHogClient {
  private baseUrl: string;

  constructor(baseUrl = 'http://localhost:8025') {
    this.baseUrl = baseUrl;
  }

  async listMessages(limit = 50): Promise<MailHogMessage[]> {
    const response = await fetch(`${this.baseUrl}/api/v2/messages?limit=${limit}`);
    return response.json();
  }

  async getMessageById(id: string): Promise<MailHogMessage> {
    const response = await fetch(`${this.baseUrl}/api/v1/messages/${id}`);
    return response.json();
  }

  async deleteAll(): Promise<void> {
    await fetch(`${this.baseUrl}/api/v1/messages`, { method: 'DELETE' });
  }

  async waitForMessage(predicate: (msg: MailHogMessage) => boolean, timeout = 10000): Promise<MailHogMessage> {
    const start = Date.now();

    while (Date.now() - start < timeout) {
      const messages = await this.listMessages();
      const found = messages.find(predicate);
      if (found) return found;
      await new Promise(r => setTimeout(r, 500));
    }

    throw new Error('Timeout waiting for email message');
  }
}
```

## Ethereal Email

### Temporary Email Service

```typescript
import nodemailer from 'nodemailer';

async function createEtherealAccount(): Promise<{ account: unknown; transporter: nodemailer.Transporter }> {
  const testAccount = await nodemailer.createTestAccount();

  const transporter = nodemailer.createTransport({
    host: 'smtp.ethereal.email',
    port: 587,
    secure: false,
    auth: {
      user: testAccount.user,
      pass: testAccount.pass,
    },
  });

  return { account: testAccount, transporter };
}

async function sendTestEmail(transporter: nodemailer.Transporter, options: SendMailOptions): Promise<void> {
  const info = await transporter.sendMail(options);
  console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
  return info;
}
```

### Ethereal Integration with Test Suites

```typescript
describe('Email Service', () => {
  let etherealAccount: nodemailer.TestAccount;
  let transporter: nodemailer.Transporter;

  beforeAll(async () => {
    etherealAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: etherealAccount.user,
        pass: etherealAccount.pass,
      },
    });
  });

  afterAll(() => {
    transporter.close();
  });

  it('should send welcome email', async () => {
    const info = await transporter.sendMail({
      from: '"Test" <noreply@test.com>',
      to: 'user@example.com',
      subject: 'Welcome',
      html: '<h1>Welcome!</h1>',
    });

    expect(info.messageId).toBeDefined();
    console.log('Preview:', nodemailer.getTestMessageUrl(info));
  });
});
```

## Template Preview System

### Live Template Preview

```typescript
import express from 'express';
import mjml2html from 'mjml';
import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';

const previewApp = express();

interface PreviewRequest {
  templateName: string;
  data: Record<string, unknown>;
  locale?: string;
}

previewApp.get('/preview', async (req, res) => {
  const { templateName, data, locale } = req.query as unknown as PreviewRequest;

  try {
    const templatePath = path.join(__dirname, `../templates/${templateName}.mjml`);
    let mjml = await fs.readFile(templatePath, 'utf-8');

    // Apply locale if provided
    if (locale) {
      const localePath = path.join(__dirname, `../locales/${locale}.json`);
      const translations = JSON.parse(await fs.readFile(localePath, 'utf-8'));
      mjml = mjml.replace(/\{\{(localized\.\w+)\}\}/g, (match, key) => {
        const translationKey = key.replace('localized.', '');
        return translations[translationKey] || match;
      });
    }

    // Compile Handlebars
    const template = Handlebars.compile(mjml, { noEscape: true });
    const mjmlWithData = template(data || {});

    // Convert to HTML
    const { html, errors } = mjml2html(mjmlWithData, { validationLevel: 'strict' });

    if (errors?.length) {
      return res.status(400).json({ errors });
    }

    res.send(`
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { background: #f4f4f4; padding: 20px; font-family: monospace; }
          .email-container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          .info-bar { background: #1a1a1a; color: white; padding: 8px 16px; font-size: 12px; display: flex; justify-content: space-between; }
        </style>
      </head>
      <body>
        <div class="email-container">
          <div class="info-bar">
            <span>📧 ${templateName} ${locale ? `| ${locale}` : ''}</span>
            <span>${new Date().toISOString()}</span>
          </div>
          ${html}
        </div>
      </body>
      </html>
    `);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

previewApp.listen(4000, () => {
  console.log('Template preview: http://localhost:4000/preview?templateName=welcome');
});
```

## Webhook Testing

### Webhook Simulator

```typescript
class WebhookSimulator {
  async simulateBounce(email: string, type: 'hard' | 'soft' = 'hard'): Promise<void> {
    const payload = this.getBouncePayload(email, type);
    await fetch(`${process.env.WEBHOOK_URL}/webhooks/email/ses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  async simulateComplaint(email: string): Promise<void> {
    const payload = {
      notificationType: 'Complaint',
      complaint: {
        complainedRecipients: [{ emailAddress: email }],
        complaintFeedbackType: 'abuse',
        timestamp: new Date().toISOString(),
      },
      mail: {
        messageId: `test-${Date.now()}`,
        destination: [email],
      },
    };

    await fetch(`${process.env.WEBHOOK_URL}/webhooks/email/ses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  }

  private getBouncePayload(email: string, type: 'hard' | 'soft') {
    return {
      notificationType: 'Bounce',
      bounce: {
        bounceType: type === 'hard' ? 'Permanent' : 'Transient',
        bouncedRecipients: [{ emailAddress: email }],
        timestamp: new Date().toISOString(),
      },
      mail: {
        messageId: `test-${Date.now()}`,
      },
    };
  }
}
```

### Webhook Testing Suite

```typescript
describe('Email Webhook Handlers', () => {
  let simulator: WebhookSimulator;

  beforeAll(() => {
    simulator = new WebhookSimulator();
  });

  it('should process hard bounce and suppress address', async () => {
    const email = `bounce-test-${Date.now()}@example.com`;
    await simulator.simulateBounce(email, 'hard');

    // Wait for async processing
    await new Promise(r => setTimeout(r, 1000));

    const suppressed = await SuppressionList.findOne({ email }).exec();
    expect(suppressed).toBeDefined();
    expect(suppressed?.reason).toContain('Hard bounce');
  });

  it('should process complaint and suppress address', async () => {
    const email = `complaint-test-${Date.now()}@example.com`;
    await simulator.simulateComplaint(email);

    await new Promise(r => setTimeout(r, 1000));

    const record = await ComplaintRecord.findOne({ email }).exec();
    expect(record).toBeDefined();
    expect(record?.type).toBe('abuse');
  });

  it('should return 200 OK for valid webhook events', async () => {
    const response = await fetch(`${process.env.APP_URL}/webhooks/email/ses`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        notificationType: 'Delivery',
        delivery: {
          recipients: ['user@example.com'],
          timestamp: new Date().toISOString(),
        },
        mail: { messageId: 'test123' },
      }),
    });

    expect(response.status).toBe(200);
  });
});
```

## Cross-Client Rendering Tests

### Email Client Testing

```typescript
import puppeteer from 'puppeteer';

interface EmailClientTest {
  name: string;
  width: number;
  userAgent: string;
}

const EMAIL_CLIENTS: EmailClientTest[] = [
  { name: 'Gmail-Chrome', width: 1280, userAgent: 'Mozilla/5.0 Chrome/120 Gmail/1.0' },
  { name: 'Outlook-Desktop', width: 1280, userAgent: 'Mozilla/5.0 Outlook/16.0' },
  { name: 'Apple-Mail', width: 1280, userAgent: 'Mozilla/5.0 AppleMail/14.0' },
  { name: 'Yahoo-Mail', width: 1280, userAgent: 'Mozilla/5.0 YahooMail/1.0' },
  { name: 'iPhone-Mail', width: 375, userAgent: 'Mozilla/5.0 iPhone Mail/14.0' },
  { name: 'Gmail-Android', width: 412, userAgent: 'Mozilla/5.0 Android Gmail/1.0' },
];

async function testCrossClientRendering(html: string): Promise<RenderTestResult[]> {
  const browser = await puppeteer.launch();
  const results: RenderTestResult[] = [];

  for (const client of EMAIL_CLIENTS) {
    const page = await browser.newPage();
    await page.setViewport({ width: client.width, height: 800 });
    await page.setUserAgent(client.userAgent);
    await page.setContent(html, { waitUntil: 'networkidle0' });

    const result = await page.evaluate(() => {
      const body = document.querySelector('.mjml-body') || document.body;
      const rect = body.getBoundingClientRect();
      const images = Array.from(document.querySelectorAll('img'));
      const brokenImages = images.filter(img => !img.complete || img.naturalWidth === 0);

      return {
        width: rect.width,
        height: rect.height,
        visibleText: document.body.innerText?.length || 0,
        brokenImageCount: brokenImages.length,
        overlappingElements: checkOverlapping(),
      };
    });

    results.push({ client: client.name, ...result });
    await page.close();
  }

  await browser.close();
  return results;
}
```

### Litmus/Email on Acid Integration

```typescript
interface EmailClientTestRequest {
  testName: string;
  html: string;
  text: string;
  subject: string;
  clients: string[];
}

async function submitToLitmus(emailHtml: string, subject: string): Promise<string> {
  const response = await fetch('https://api.litmus.com/v1/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.LITMUS_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      email: {
        html_body: emailHtml,
        subject,
      },
      testing_clients: [
        'gmailnew', 'outlookcom', 'office365', 'outlook2016',
        'apple13', 'iphonemini6', 'ipadair4', 'androidgmailapp',
      ],
    }),
  });

  const data = await response.json();
  return data.email.id;
}
```

## CI Integration

### GitHub Actions Email Test Pipeline

```yaml
name: Email Tests

on:
  pull_request:
    paths:
      - 'templates/**'
      - 'emails/**'

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      mailhog:
        image: mailhog/mailhog
        ports:
          - 1025:1025
          - 8025:8025

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20

      - name: Install dependencies
        run: npm ci

      - name: Validate MJML templates
        run: npm run validate-templates

      - name: Run email unit tests
        run: npm run test:emails
        env:
          SMTP_HOST: localhost
          SMTP_PORT: 1025
          MAILHOG_API: http://localhost:8025

      - name: Run webhook integration tests
        run: npm run test:webhooks

      - name: Check SPF/DKIM/DMARC records
        run: npm run check-dns

      - name: Generate email previews
        run: npm run generate-previews

      - name: Upload email previews
        uses: actions/upload-artifact@v4
        with:
          name: email-previews
          path: previews/

      - name: Check for hardcoded credentials
        run: |
          if grep -r "SMTP_PASSWORD\|SENDGRID_API_KEY\|RESEND_API_KEY" --include="*.mjml" --include="*.html" --include="*.ts" --include="*.js" | grep -v ".env.example" | grep -v "test"; then
            echo "Found hardcoded credentials!"
            exit 1
          fi
```

### Template Validation Script

```typescript
import { glob } from 'glob';
import mjml2html from 'mjml';
import fs from 'fs/promises';

async function validateAllTemplates(): Promise<void> {
  const files = await glob('templates/**/*.mjml');
  let hasErrors = false;

  for (const file of files) {
    const content = await fs.readFile(file, 'utf-8');
    const { html, errors } = mjml2html(content);

    if (errors && errors.length > 0) {
      console.error(`✗ ${file}:`);
      for (const error of errors) {
        console.error(`  ${error.message}`);
      }
      hasErrors = true;
      continue;
    }

    if (!html || html.trim().length === 0) {
      console.error(`✗ ${file}: Empty output`);
      hasErrors = true;
      continue;
    }

    console.log(`✓ ${file} (${html.length} bytes)`);
  }

  if (hasErrors) {
    process.exit(1);
  }
}

async function validatePlaceholders(): Promise<void> {
  const files = await glob('locales/**/*.json');
  const baseLocale = JSON.parse(await fs.readFile('locales/en.json', 'utf-8'));
  const baseKeys = Object.keys(baseLocale).sort();

  for (const file of files) {
    if (file.endsWith('en.json')) continue;

    const translations = JSON.parse(await fs.readFile(file, 'utf-8'));
    const translationKeys = Object.keys(translations).sort();

    const missing = baseKeys.filter(k => !translationKeys.includes(k));
    const extra = translationKeys.filter(k => !baseKeys.includes(k));

    if (missing.length > 0) {
      console.warn(`⚠ ${file}: Missing keys: ${missing.join(', ')}`);
    }
    if (extra.length > 0) {
      console.warn(`⚠ ${file}: Extra keys: ${extra.join(', ')}`);
    }
  }
}

validateAllTemplates().catch(console.error);
```

## Performance Testing

### Load Testing Email Sending

```typescript
import autocannon from 'autocannon';

async function loadTestEmailSending(): Promise<void> {
  const instance = autocannon({
    url: 'http://localhost:3000/api/emails/send',
    connections: 10,
    duration: 30,
    headers: {
      'Content-Type': 'application/json',
    },
    requests: [
      {
        method: 'POST',
        body: JSON.stringify({
          to: 'test@example.com',
          subject: 'Load Test',
          template: 'welcome',
          data: { firstName: 'Test' },
        }),
      },
    ],
  });

  instance.on('done', (results) => {
    console.log('Requests/sec:', results.requests.average);
    console.log('Latency (p99):', results.latency.p99);
    console.log('Errors:', results.errors);
  });
}
```

## Key Points

- Use MailHog for local development with SMTP capture and web UI inspection
- Use Ethereal for disposable test email accounts in CI/test environments
- Test email rendering across all major email clients (Gmail, Outlook, Apple Mail, Yahoo)
- Validate MJML templates in CI with strict validation level
- Simulate webhook events (bounces, complaints, deliveries) in integration tests
- Check DNS records (SPF, DKIM, DMARC) automatically in CI pipeline
- Generate and review visual previews for every template change
- Validate placeholder consistency across all supported locales
- Use performance testing to ensure email API handles expected load
- Automate email testing as part of the CI/CD pipeline
- Test with real-world network conditions (slow connections, timeouts)
- Verify plaintext fallback generation alongside HTML
- Check for hardcoded credentials in templates and code
- Test unsubscribe mechanism functions correctly
- Validate rate limiting behavior under load
- Test webhook signature verification with valid and invalid signatures
- Verify suppression list integration with bounce/complaint processing
- Monitor email delivery latency in staging environment
- Test with international characters, RTL text, and special characters
- Maintain a library of test emails for regression testing
