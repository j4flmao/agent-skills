# Email Delivery Setup

## Overview
Transactional email delivery requires careful provider selection, proper configuration, and adherence to sending best practices. This reference covers SMTP and API-based delivery setups for major providers.

## SMTP Configuration

### Standard SMTP Settings

```typescript
const smtpConfig = {
  host: process.env.SMTP_HOST,        // e.g., email-smtp.us-east-1.amazonaws.com
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false,                       // true for 465, false for 587
  auth: {
    user: process.env.SMTP_USERNAME,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: true,
    minVersion: 'TLSv1.2',
  },
};
```

### Nodemailer Transport Setup

```typescript
import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  pool: true,                          // Use pooled connections
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 1000,                     // 1 second
  rateLimit: 10,                       // 10 messages per second
});

async function sendEmail(options: SendMailOptions): Promise<void> {
  try {
    const info = await transporter.sendMail(options);
    console.log('Message sent:', info.messageId);
    console.log('Accepted:', info.accepted);
    console.log('Rejected:', info.rejected);
    return info;
  } catch (error) {
    console.error('Send failed:', error);
    throw error;
  }
}
```

## AWS SES Setup

### SES Client Configuration

```python
import boto3
from botocore.config import Config

config = Config(
    region_name='us-east-1',
    retries={'max_attempts': 3, 'mode': 'adaptive'},
    max_pool_connections=50,
)

ses = boto3.client('ses', config=config)

def send_email_via_ses(to: str, subject: str, html: str, text: str = None):
    try:
        response = ses.send_email(
            Source='noreply@yourdomain.com',
            Destination={
                'ToAddresses': [to],
            },
            Message={
                'Subject': {'Data': subject},
                'Body': {
                    'Html': {'Data': html},
                    'Text': {'Data': text or strip_html(html)},
                },
            },
            ConfigurationSetName='transactional-config-set',
            Tags=[
                {'Name': 'Environment', 'Value': os.getenv('ENV', 'production')},
                {'Name': 'MessageType', 'Value': 'transactional'},
            ],
        )
        return response['MessageId']
    except ClientError as e:
        if e.response['Error']['Code'] == 'MessageRejected':
            handle_bounce(to, e.response['Error']['Message'])
        raise
```

### SES Configuration Set

```json
{
  "ConfigurationSet": {
    "Name": "transactional-config-set",
    "EventDestination": {
      "Name": "sns-events",
      "Enabled": true,
      "SNSDestination": {
        "TopicARN": "arn:aws:sns:us-east-1:123456789012:ses-events"
      },
      "EventTypes": [
        "send",
        "reject",
        "bounce",
        "complaint",
        "delivery",
        "open",
        "click",
        "renderingFailure"
      ]
    }
  }
}
```

## SendGrid Setup

### API Key Configuration

```typescript
import sgMail from '@sendgrid/mail';

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

interface SendGridOptions {
  to: string | string[];
  from: { email: string; name: string };
  subject: string;
  html: string;
  text?: string;
  templateId?: string;
  dynamicTemplateData?: Record<string, unknown>;
  categories?: string[];
  customArgs?: Record<string, string>;
  sendAt?: number;
  mailSettings?: {
    sandboxMode?: { enable: boolean };
    bypassListManagement?: { enable: boolean };
    bypassSpamManagement?: { enable: boolean };
    bypassBounceManagement?: { enable: boolean };
    bypassUnsubscribeManagement?: { enable: boolean };
  };
}

async function sendWithSendGrid(options: SendGridOptions): Promise<void> {
  const msg = {
    to: options.to,
    from: options.from,
    subject: options.subject,
    html: options.html,
    text: options.text,
    templateId: options.templateId,
    dynamicTemplateData: options.dynamicTemplateData,
    categories: options.categories,
    customArgs: options.customArgs,
    sendAt: options.sendAt,
    mailSettings: options.mailSettings,
    trackingSettings: {
      clickTracking: { enable: true },
      openTracking: { enable: true },
      subscriptionTracking: { enable: true },
      ganalytics: { enable: true },
    },
  };

  try {
    await sgMail.send(msg);
  } catch (error) {
    if (error.response) {
      console.error('SendGrid API error:', error.response.body);
    }
    throw error;
  }
}
```

### SendGrid Subuser Management

```typescript
// Subusers for separation of concerns
interface SubuserConfig {
  username: string;
  email: string;
  password: string;
  ips: string[];
  reputation: 'high' | 'medium' | 'low';
}

async function createSubuser(config: SubuserConfig): Promise<void> {
  const response = await fetch('https://api.sendgrid.com/v3/subusers', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      username: config.username,
      email: config.email,
      password: config.password,
      ips: config.ips,
    }),
  });

  if (!response.ok) throw new Error('Failed to create subuser');
}
```

## Resend Setup

### SDK Configuration

```typescript
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendWithResend(options: {
  to: string | string[];
  from: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
  tags?: { name: string; value: string }[];
}): Promise<void> {
  const { data, error } = await resend.emails.send({
    from: options.from,
    to: options.to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    reply_to: options.replyTo,
    headers: options.headers,
    tags: options.tags,
  });

  if (error) {
    console.error('Resend error:', error);
    throw new Error(error.message);
  }

  console.log('Resend message ID:', data?.id);
}
```

### Resend Batch Sending

```typescript
async function sendBatchWithResend(emails: {
  from: string;
  to: string;
  subject: string;
  html: string;
}[]): Promise<void> {
  const batchSize = 100;
  const batches = [];

  for (let i = 0; i < emails.length; i += batchSize) {
    batches.push(emails.slice(i, i + batchSize));
  }

  for (const batch of batches) {
    const promises = batch.map(email => resend.emails.send(email));
    await Promise.allSettled(promises);
  }
}
```

## Sending Quotas

### Provider Quota Comparison

```typescript
interface ProviderQuota {
  provider: string;
  maxPerDay: number;
  maxPerSecond: number;
  maxPerEmail: number;
  warmupRequired: boolean;
}

const QUOTAS: Record<string, ProviderQuota> = {
  ses: {
    provider: 'AWS SES',
    maxPerDay: 50000,          // Can be increased via support request
    maxPerSecond: 14,          // Starting limit, can be increased
    maxPerEmail: 500,          // Recipients per message
    warmupRequired: false,
  },
  sendgrid: {
    provider: 'SendGrid',
    maxPerDay: 100,            // Free tier; 100K+ on paid plans
    maxPerSecond: 100,         // Varies by plan
    maxPerEmail: 1000,
    warmupRequired: true,      // For new dedicated IPs
  },
  resend: {
    provider: 'Resend',
    maxPerDay: 100,            // Free tier
    maxPerSecond: 10,
    maxPerEmail: 50,
    warmupRequired: false,
  },
  smtp: {
    provider: 'Custom SMTP',
    maxPerDay: Infinity,       // Limited by infrastructure
    maxPerSecond: Infinity,    // Limited by infrastructure
    maxPerEmail: Infinity,
    warmupRequired: false,
  },
};
```

### Client-Side Throttling

```typescript
class EmailThrottle {
  private queue: EmailTask[] = [];
  private processing = false;
  private sentCount = 0;
  private windowStart = Date.now();

  constructor(
    private maxPerSecond: number = 10,
    private maxPerHour: number = 10000,
  ) {}

  async enqueue(task: EmailTask): Promise<void> {
    this.queue.push(task);
    if (!this.processing) {
      this.processing = true;
      await this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    while (this.queue.length > 0) {
      await this.checkWindow();

      const task = this.queue.shift()!;
      await task.send();
      this.sentCount++;
    }
    this.processing = false;
  }

  private async checkWindow(): Promise<void> {
    const now = Date.now();

    // Reset per-second counter
    if (now - this.windowStart >= 1000) {
      this.windowStart = now;
      this.sentCount = 0;
      return;
    }

    // Check per-second limit
    if (this.sentCount >= this.maxPerSecond) {
      await delay(1000 - (now - this.windowStart));
      this.sentCount = 0;
      this.windowStart = Date.now();
    }
  }
}
```

## IP Warmup

### Warmup Schedule

```typescript
interface WarmupSchedule {
  day: number;
  volume: number;
}

const warmupPlan: WarmupSchedule[] = [
  { day: 1, volume: 50 },
  { day: 2, volume: 100 },
  { day: 3, volume: 200 },
  { day: 4, volume: 500 },
  { day: 5, volume: 1000 },
  { day: 6, volume: 2000 },
  { day: 7, volume: 5000 },
  { day: 14, volume: 10000 },
  { day: 21, volume: 25000 },
  { day: 30, volume: 50000 },
];

class IPWarmup {
  private currentDay = 0;
  private dailyVolume: Map<string, number> = new Map();

  async shouldSend(ipAddress: string): Promise<boolean> {
    const sentToday = this.dailyVolume.get(ipAddress) || 0;
    const allowedVolume = this.getAllowedVolume(ipAddress);
    return sentToday < allowedVolume;
  }

  private getAllowedVolume(ipAddress: string): number {
    const day = this.currentDay;
    for (let i = warmupPlan.length - 1; i >= 0; i--) {
      if (day >= warmupPlan[i].day) {
        return warmupPlan[i].volume;
      }
    }
    return warmupPlan[0].volume;
  }

  async trackSend(ipAddress: string): Promise<void> {
    const current = this.dailyVolume.get(ipAddress) || 0;
    this.dailyVolume.set(ipAddress, current + 1);
  }
}
```

## Connection Pooling

### Pooled Transport Configuration

```typescript
import nodemailer from 'nodemailer';

const pool = nodemailer.createTransport({
  pool: true,
  maxConnections: 10,
  maxMessages: 200,
  rateDelta: 1000,
  rateLimit: 15,
  host: process.env.SMTP_HOST,
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  socketTimeout: 30000,
  connectionTimeout: 10000,
  greetingTimeout: 10000,
});

// Close pool gracefully on shutdown
process.on('SIGTERM', async () => {
  await pool.close();
});
```

## Provider Fallback

### Multi-Provider Strategy

```typescript
type ProviderName = 'ses' | 'sendgrid' | 'resend' | 'smtp';

interface EmailProvider {
  name: ProviderName;
  send(message: EmailMessage): Promise<SendResult>;
  isHealthy(): Promise<boolean>;
  weight: number;  // Higher = more traffic
}

class EmailRouter {
  private providers: EmailProvider[];

  constructor(providers: EmailProvider[]) {
    this.providers = providers;
  }

  async send(message: EmailMessage): Promise<SendResult> {
    // Try primary provider first with retry
    for (let attempt = 0; attempt < 3; attempt++) {
      const provider = this.selectProvider();
      try {
        return await provider.send(message);
      } catch (error) {
        console.warn(`Provider ${provider.name} failed:`, error);
        await this.markUnhealthy(provider.name);
      }
    }

    // Fallback to any healthy provider
    for (const provider of this.filterHealthy()) {
      try {
        return await provider.send(message);
      } catch (error) {
        console.error(`Fallback ${provider.name} also failed:`, error);
      }
    }

    throw new Error('All email providers failed');
  }

  private selectProvider(): EmailProvider {
    const healthy = this.filterHealthy();
    const totalWeight = healthy.reduce((s, p) => s + p.weight, 0);
    let random = Math.random() * totalWeight;

    for (const provider of healthy) {
      random -= provider.weight;
      if (random <= 0) return provider;
    }

    return healthy[0];
  }

  private filterHealthy(): EmailProvider[] {
    return this.providers.filter(p => p.isHealthy());
  }

  private async markUnhealthy(name: string): Promise<void> {
    // Implement circuit breaker logic
    await redis.setex(`provider:${name}:unhealthy`, 60, 'true');
  }
}
```

## Key Points

- Always use environment variables for SMTP credentials and API keys
- Implement connection pooling for high-volume sending
- Use client-side rate limiting to stay within provider quotas
- Implement IP warmup for new dedicated IPs to establish reputation
- Use provider fallback with circuit breaker pattern for reliability
- Monitor sending quotas and request limit increases before hitting caps
- Log all sent messages with message IDs for traceability
- Implement TLS 1.2+ for all SMTP connections
- Use configuration sets (SES) or categories (SendGrid) for event tracking
- Validate email addresses before attempting delivery
