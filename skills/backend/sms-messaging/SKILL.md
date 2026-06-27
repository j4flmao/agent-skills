---
name: backend-sms-messaging
description: >
  Enforce SMS and messaging patterns including Twilio/AWS SNS/Vonage integration,
  WhatsApp Business API, 2FA OTP delivery, TCPA compliance, message templates,
  rate limiting, and delivery analytics. NOT for push notifications or in-app messaging.
version: "1.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, messaging, phase-10]
---

# SMS Messaging Skill

## Purpose
Build reliable, compliant SMS and messaging systems supporting transactional messages, 2FA delivery, WhatsApp integration, and comprehensive delivery tracking.

## Agent Protocol

### Trigger
User mentions SMS, text messaging, Twilio, AWS SNS, Vonage, WhatsApp API, 2FA via SMS, OTP delivery, message templates, TCPA compliance, opt-in/out, SMS delivery tracking, or messaging analytics.

### Input Context
- SMS provider selection and credentials
- Message types (transactional, 2FA, notifications, alerts)
- Volume estimates and sending quotas
- Compliance requirements (TCPA, GDPR, local regulations)
- WhatsApp Business API requirements (template approval, opt-in)
- Fallback channel requirements
- International sending needs

### Output Artifact
SKILL.md adherence document plus implemented messaging service, provider integration, template management, delivery tracking, and compliance handling.

### Response Format
No preamble. No postamble. No explanations. No filler/hedging/transitions. Compress output — why use many token when few do trick.

### Completion Criteria
- [ ] SMS provider integrated with failover/secondary provider
- [ ] Message template system with variable injection implemented
- [ ] 2FA OTP generation, delivery, verification flow operational
- [ ] Rate limiting per recipient, per number, per campaign enforced
- [ ] Opt-in/opt-out mechanism with consent record storage
- [ ] Delivery status tracking (sent, delivered, failed, undelivered)
- [ ] WhatsApp Business API integration with approved templates
- [ ] Cost tracking and budget alerts configured
- [ ] Fallback channel (SMS -> Voice -> Email) implemented
- [ ] Compliance documentation (TCPA, GDPR) generated

### Max Response Length
4096 tokens

## Workflow

1. **Provider Abstraction**: Unified interface over multiple providers with failover.

```typescript
interface MessageProvider {
  name: string;
  send(params: SendParams): Promise<SendResult>;
  getStatus(messageId: string): Promise<DeliveryStatus>;
  getBalance(): Promise<number>;
}

class MessagingService {
  private providers: MessageProvider[];

  constructor(primary: MessageProvider, secondary: MessageProvider) {
    this.providers = [primary, secondary];
  }

  async send(params: SendParams): Promise<SendResult> {
    const errors: Error[] = [];

    for (const provider of this.providers) {
      try {
        const result = await provider.send(params);
        await this.recordMessage({ ...params, provider: provider.name, messageId: result.messageId });
        return result;
      } catch (error) {
        errors.push(error);
        await this.recordFailover(params, provider.name, error.message);
      }
    }

    throw new AggregateError(errors, 'All message providers failed');
  }

  private async recordMessage(data: MessageRecord): Promise<void> {
    await MessageLog.create({
      to: data.to,
      from: data.from,
      body: data.body,
      provider: data.provider,
      messageId: data.messageId,
      status: 'sent',
      sentAt: new Date(),
      type: data.type,
    });
  }
}
```

2. **Twilio Integration**: SMS and Voice with webhook status callbacks.

```typescript
import twilio from 'twilio';

const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN);

async function sendSmsTwilio(to: string, body: string): Promise<SendResult> {
  const message = await client.messages.create({
    to,
    from: process.env.TWILIO_PHONE_NUMBER,
    body,
    statusCallback: `${process.env.BASE_URL}/webhooks/sms/twilio`,
  });

  return { messageId: message.sid, status: 'sent' };
}

// Status callback webhook
app.post('/webhooks/sms/twilio', (req, res) => {
  const { MessageSid, MessageStatus, To, ErrorCode, ErrorMessage } = req.body;

  const statusMap: Record<string, string> = {
    queued: 'queued',
    sent: 'sent',
    delivered: 'delivered',
    undelivered: 'failed',
    failed: 'failed',
  };

  MessageLog.updateOne(
    { messageId: MessageSid },
    {
      status: statusMap[MessageStatus] || MessageStatus,
      errorCode: ErrorCode,
      errorMessage: ErrorMessage,
      updatedAt: new Date(),
    }
  ).exec();

  res.send('<Response></Response>');
});
```

3. **2FA OTP Delivery**: Generate, send, verify, expire OTP codes.

```typescript
class OTPService {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_TTL = 300; // 5 minutes
  private readonly MAX_ATTEMPTS = 3;
  private readonly RESEND_COOLDOWN = 60; // 1 minute

  async generateAndSend(
    userId: string,
    channel: 'sms' | 'voice' | 'email',
    recipient: string
  ): Promise<{ expiresIn: number }> {
    const recent = await OtpRecord.findOne({
      userId,
      sentAt: { $gt: new Date(Date.now() - this.RESEND_COOLDOWN * 1000) },
    });
    if (recent) {
      throw new Error(`Please wait ${this.RESEND_COOLDOWN} seconds before requesting a new OTP`);
    }

    const code = this.generateCode();
    const hashedCode = await bcrypt.hash(code, 10);

    await OtpRecord.create({
      userId,
      hashedCode,
      channel,
      recipient,
      sentAt: new Date(),
      expiresAt: new Date(Date.now() + this.OTP_TTL * 1000),
      attemptsRemaining: this.MAX_ATTEMPTS,
    });

    let message: string;
    if (channel === 'sms') {
      message = `Your verification code is: ${code}. It expires in 5 minutes. Do not share this code.`;
      await messagingService.send({ to: recipient, body: message, type: 'otp' });
    } else if (channel === 'voice') {
      message = `Your verification code is: ${code.split('').join(', ')}. Repeat: ${code.split('').join(', ')}.`;
      await voiceService.call(recipient, message);
    }

    return { expiresIn: this.OTP_TTL };
  }

  async verify(userId: string, code: string): Promise<boolean> {
    const record = await OtpRecord.findOne({
      userId,
      expiresAt: { $gt: new Date() },
      verified: false,
    }).sort({ sentAt: -1 });

    if (!record) return false;
    if (record.attemptsRemaining <= 0) return false;

    const isValid = await bcrypt.compare(code, record.hashedCode);
    if (!isValid) {
      record.attemptsRemaining -= 1;
      await record.save();
      return false;
    }

    record.verified = true;
    record.verifiedAt = new Date();
    await record.save();
    return true;
  }

  private generateCode(): string {
    const digits = '0123456789';
    let code = '';
    for (let i = 0; i < this.OTP_LENGTH; i++) {
      code += digits[Math.floor(Math.random() * digits.length)];
    }
    return code;
  }
}
```

4. **Message Templates**: Pre-approved, localized message templates.

```typescript
interface MessageTemplate {
  id: string;
  name: string;
  type: 'transactional' | 'otp' | 'notification' | 'alert';
  channel: 'sms' | 'whatsapp' | 'voice';
  locale: string;
  body: string;           // Handlebar-style: {{variable}}
  variables: string[];
  status: 'draft' | 'approved' | 'rejected';
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

function renderTemplate(template: MessageTemplate, variables: Record<string, string>): string {
  let body = template.body;
  for (const [key, value] of Object.entries(variables)) {
    body = body.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), value);
  }
  return body;
}

// Example: "Your appointment is confirmed for {{date}} at {{time}} with {{doctorName}}."
// Rendered: "Your appointment is confirmed for May 26, 2026 at 2:30 PM with Dr. Smith."
```

5. **Rate Limiting & Throttling**: Per-recipient, per-number, global limits.

```typescript
class SmsRateLimiter {
  private readonly redis: Redis;

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async checkLimit(recipient: string, fromNumber: string): Promise<LimitCheck> {
    const now = Math.floor(Date.now() / 1000);

    const perRecipient = await this.redis.get(`ratelimit:recipient:${recipient}`);
    const perNumber = await this.redis.get(`ratelimit:number:${fromNumber}`);
    const global = await this.redis.get(`ratelimit:global`);

    const limits = {
      perRecipient: { current: perRecipient ? parseInt(perRecipient) : 0, max: 5, window: 3600 },
      perNumber: { current: perNumber ? parseInt(perNumber) : 0, max: 100, window: 3600 },
      global: { current: global ? parseInt(global) : 0, max: 10000, window: 3600 },
    };

    const violations = [];
    for (const [key, limit] of Object.entries(limits)) {
      if (limit.current >= limit.max) {
        violations.push(`${key} limit reached (${limit.current}/${limit.max})`);
      }
    }

    return {
      allowed: violations.length === 0,
      violations,
      limits,
    };
  }

  async increment(recipient: string, fromNumber: string): Promise<void> {
    const now = Math.floor(Date.now() / 1000);
    const pipeline = this.redis.pipeline();

    pipeline.incr(`ratelimit:recipient:${recipient}`);
    pipeline.expire(`ratelimit:recipient:${recipient}`, 3600);

    pipeline.incr(`ratelimit:number:${fromNumber}`);
    pipeline.expire(`ratelimit:number:${fromNumber}`, 3600);

    pipeline.incr('ratelimit:global');
    pipeline.expire('ratelimit:global', 3600);

    await pipeline.exec();
  }
}
```

6. **Opt-In/Opt-Out Management**: TCPA-compliant consent tracking.

```typescript
interface ConsentRecord {
  id: string;
  userId: string;
  phoneNumber: string;
  channel: 'sms' | 'whatsapp' | 'voice';
  status: 'opted_in' | 'opted_out';
  source: string;          // where consent was obtained
  ipAddress: string;
  consentDate: Date;
  optOutDate?: Date;
  optOutMethod?: 'reply_stop' | 'webhook' | 'portal' | 'api';
}

class ConsentManager {
  async checkConsent(phoneNumber: string, channel: string): Promise<boolean> {
    const record = await ConsentRecord.findOne({
      phoneNumber,
      channel,
      status: 'opted_in',
    }).sort({ consentDate: -1 });

    return record !== null;
  }

  async optOut(phoneNumber: string, method: string): Promise<void> {
    await ConsentRecord.updateMany(
      { phoneNumber, status: 'opted_in' },
      { status: 'opted_out', optOutDate: new Date(), optOutMethod: method }
    ).exec();
  }

  async processInboundReply(from: string, body: string): Promise<void> {
    const normalized = body.trim().toLowerCase();
    if (['stop', 'cancel', 'end', 'quit', 'unsubscribe'].includes(normalized)) {
      await this.optOut(from, 'reply_stop');
      await this.sendConfirmation(from, 'You have been unsubscribed. Reply START to resubscribe.');
    } else if (['start', 'yes', 'unstop'].includes(normalized)) {
      await ConsentRecord.create({
        phoneNumber: from,
        channel: 'sms',
        status: 'opted_in',
        source: 'sms_reply',
        consentDate: new Date(),
      });
      await this.sendConfirmation(from, 'You have been resubscribed.');
    }
  }
}
```

7. **WhatsApp Business API**: Template-based messaging with opt-in.

```typescript
async function sendWhatsAppMessage(to: string, templateName: string, params: Record<string, string>): Promise<SendResult> {
  const response = await fetch(`https://graph.facebook.com/v18.0/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to,
      type: 'template',
      template: {
        name: templateName,
        language: { code: params.locale || 'en' },
        components: [{
          type: 'body',
          parameters: Object.entries(params)
            .filter(([k]) => k !== 'locale')
            .map(([, v]) => ({ type: 'text', text: v })),
        }],
      },
    }),
  });

  const data = await response.json();
  if (!response.ok) throw new Error(`WhatsApp API error: ${data.error?.message}`);

  return { messageId: data.messages?.[0]?.id, status: 'sent' };
}
```

## Rules

1. Never send SMS without prior express written consent (TCPA).
2. Always honor STOP/HELP keywords and immediately process opt-outs.
3. Never send messages during restricted hours (9PM-8AM local time for promotional).
4. Always implement message length detection and concatenation for >160 characters.
5. Never store plaintext OTP codes — always hash with bcrypt before storage.
6. Always implement carrier filtering for landline numbers (SMS to landline fails).
7. Never exceed 5 messages per recipient per hour without explicit opt-in.
8. Always include sender identification (business name) in message body.
9. Never send sensitive data (passwords, full SSN, CVV) via SMS.
10. Always implement Unicode detection and fallback for non-GSM characters.
11. Never use shared short codes — dedicated numbers preferred for transactional.
12. Always test with real carrier numbers, not just VoIP/test numbers.
13. Never hardcode phone numbers — use E.164 format (+1XXXXXXXXXX) consistently.
14. Always implement delivery receipt tracking for critical messages (2FA).
15. Never cache opt-out status — always check live consent database.
16. Always implement failover to secondary provider on delivery failure.
17. Never send to numbers on DNC (Do Not Contact) registry.
18. Always implement cost tracking and budget alerts per campaign/month.
19. Never send WhatsApp messages without opt-in and approved templates.
20. Always implement rate limiting per provider to avoid carrier filtering.

## References
  - references/2fa-sms.md — Two-Factor Authentication via SMS
  - references/compliance-analytics.md — Compliance and Analytics
  - references/sms-messaging-advanced.md — Sms Messaging Advanced Topics
  - references/sms-messaging-fundamentals.md — Sms Messaging Fundamentals
  - references/sms-messaging-monitoring.md — SMS Messaging Monitoring
  - references/sms-messaging-testing.md — SMS Messaging Testing
  - references/sms-providers.md — SMS Providers
  - references/whatsapp-api.md — WhatsApp API
## Architecture Decision Trees

### Provider Selection
```
Message volume per month?
├── < 10K → Single provider (Twilio/AWS SNS)
│   Simple integration. No failover needed. Monitor manually.
├── 10K - 1M → Primary + secondary failover
│   Twilio primary, Vonage secondary. Automated failover on timeout.
│   Cost-aware routing: prefer cheaper provider for non-critical.
└── > 1M → Multi-provider with intelligent routing
    Route by destination country, carrier, time of day.
    Provider A for US/CA, Provider B for EU, Provider C for APAC.
    Real-time delivery stats influence routing decisions.
```

### Channel Selection
```
Message urgency and content type?
├── Time-sensitive, critical → SMS (high open rate, immediate)
│   2FA codes, payment confirmations, fraud alerts.
│   Fallback: SMS → Voice call → Email.
├── Rich media, marketing → WhatsApp
│   High engagement, images + buttons. Requires opt-in + approved templates.
│   Best for: receipts, shipping updates, customer service.
└── Low urgency, informational → Email
    Newsletters, weekly summaries, account statements.
    Cost: nearly free. Risk: spam filters, low open rates.
```

## Implementation Patterns

### Pattern: Multi-Provider Failover with Circuit Breaker

```typescript
class ResilientMessagingService {
  private providers: MessageProvider[];
  private circuitState: Map<string, { failures: number; lastFailure: Date; open: boolean }> = new Map();
  private readonly THRESHOLD = 3;
  private readonly RESET_TIMEOUT = 300_000; // 5min

  async send(params: SendParams): Promise<SendResult> {
    for (const provider of this.providers) {
      if (this.isCircuitOpen(provider.name)) continue;

      try {
        const result = await provider.send(params);
        this.recordSuccess(provider.name);
        return result;
      } catch (error) {
        this.recordFailure(provider.name);
      }
    }
    throw new Error('All providers exhausted');
  }

  private isCircuitOpen(name: string): boolean {
    const state = this.circuitState.get(name);
    if (!state || !state.open) return false;
    if (Date.now() - state.lastFailure.getTime() > this.RESET_TIMEOUT) {
      state.open = false;
      state.failures = 0;
      return false;
    }
    return true;
  }

  private recordFailure(name: string): void {
    const state = this.circuitState.get(name) || { failures: 0, lastFailure: new Date(), open: false };
    state.failures++;
    state.lastFailure = new Date();
    if (state.failures >= this.THRESHOLD) state.open = true;
    this.circuitState.set(name, state);
  }
}
```

### Pattern: Delivery Webhook Aggregation

```typescript
// Aggregates delivery receipts from multiple providers into normalized format
class DeliveryAggregator {
  async handleWebhook(provider: string, payload: any): Promise<void> {
    const normalized = this.normalize(provider, payload);
    await DeliveryRecord.findOneAndUpdate(
      { messageId: normalized.messageId },
      { status: normalized.status, providerStatus: normalized.rawStatus, updatedAt: new Date() }
    ).exec();

    if (normalized.status === 'failed') {
      await this.triggerFailover(normalized);
    }
  }

  private normalize(provider: string, payload: any): NormalizedEvent {
    const mappings: Record<string, any> = {
      twilio: { messageId: payload.MessageSid, status: this.twilioStatus(payload.MessageStatus) },
      vonage: { messageId: payload.messageId, status: this.vonageStatus(payload.status) },
    };
    return { ...mappings[provider], rawStatus: payload.MessageStatus || payload.status };
  }
}
```

## Production Considerations

### Scalability
- Message queue all outbound sends. Never block HTTP request on SMS delivery.
- Rate limiting per provider: stay under TPS limits (Twilio: 1/sec per phone number, AWS SNS: 300/sec per account).
- Database writes for message logs: batch inserts every 100ms or 100 messages, whichever comes first.
- Webhook handlers: process idempotently (store received webhook IDs, skip duplicates).

### Cost Management
- Track cost per message, per provider, per campaign. Alert on cost anomalies.
- Route non-critical messages to cheaper providers. Reserve premium providers for 2FA and alerts.
- Carrier lookup before sending: skip landline numbers for SMS. Saves ~5% on failed sends.
- Concatenated messages cost per segment. Optimize message length to fit single segment (160 GSM chars).

## Anti-Patterns

| Anti-Pattern | Why It Hurts | Fix |
|---|---|---|
| Single provider | SPOF. Provider outage blocks all messaging. | Minimum 2 providers with auto-failover |
| No delivery tracking | Blind to failures. Customers don't receive messages. | Webhook handler + real-time status dashboard |
| OTP in plaintext database | Breach exposes all OTP codes. | bcrypt hash. In-memory TTL cache as alternative |
| Shared short codes | Carrier filtering, reputation issues. | Dedicated long codes for transactional messaging |
| Sending without consent check | TCPA fines up to $1500 per message. | Consent check before every send. Audit trail of consent. |
| Blocking on send | SMS API latency adds to page load time. | Async send with queue. Webhook for status. |

## Performance Optimization

- Connection pooling for SMS provider APIs. Reuse HTTP clients (keep-alive).
- Template pre-compilation: compile message templates once, cache rendered versions.
- Redis-based rate limiter: sliding window per recipient. Single Redis call per check.
- Batch opt-out processing: aggregate STOP replies, process in batches every 30 seconds.
- Database indexing: message_logs on (status, sent_at), consent on (phone_number, channel).
- CDN for MMS/media content: avoid re-uploading images per message. Reference CDN URLs.
- Connection pooling for Twilio/Vonage HTTP clients: 10-25 connections per provider.

## Security Considerations

- API keys for SMS providers stored in secrets manager (AWS Secrets Manager, Vault). Never in code.
- OTP codes: generated with `crypto.randomInt()` (Node.js) or `secrets.randbelow()` (Python). Never `Math.random()`.
- OTP storage: bcrypt hashed in database. TTL enforced at read time. Max 3 verify attempts then invalidate.
- Rate limiting on OTP endpoints: per phone number (max 5/min), per IP (max 20/min).
- Message content scanning: block PII leakage (SSN, credit cards) in outbound messages. Regex patterns + ML scanning.
- TLS for all provider API calls. mTLS for high-security environments.
- Webhook signatures: validate Twilio `X-Twilio-Signature` header. Reject unsigned webhooks.
- Data retention: message logs retained per regulatory requirements. Purge after compliance window.
- Consent records: immutable append-only log. Export for regulatory audit within 24 hours.
