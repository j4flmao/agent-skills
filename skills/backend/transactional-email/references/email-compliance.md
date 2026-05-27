# Email Compliance

## Overview
Ensure transactional email complies with GDPR, CAN-SPAM Act, and other regulations. Implement proper consent, unsubscribe mechanisms, data retention, and audit trails.

## CAN-SPAM Compliance

```typescript
// CAN-SPAM requires: accurate header, non-deceptive subject, opt-out, physical address

interface CanSpamRequirements {
  fromName: string;                    // Accurate sender identification
  fromEmail: string;                   // Valid reply-to address
  subject: string;                     // Not deceptive
  physicalAddress: string;             // Valid physical postal address
  unsubscribeUrl: string;              // Working opt-out link
  preferenceCenterUrl?: string;        // Preference management
}

const CAN_SPAM_CONFIG: CanSpamRequirements = {
  fromName: 'Your Company Name',       // Not generic
  fromEmail: 'noreply@yourdomain.com', // Reply-to monitored
  subject: 'Your Order Confirmation',  // Reflects content
  physicalAddress: '123 Main St, City, State 12345',
  unsubscribeUrl: 'https://yourdomain.com/unsubscribe?id={{emailId}}',
  preferenceCenterUrl: 'https://yourdomain.com/preferences',
};

function ensureCanSpamCompliance(template: string, email: Email): string {
  const footer = `
    <div style="font-size: 12px; color: #666; margin-top: 32px;">
      <p>Sent by ${CAN_SPAM_CONFIG.fromName} | ${CAN_SPAM_CONFIG.physicalAddress}</p>
      <p>
        <a href="${CAN_SPAM_CONFIG.unsubscribeUrl.replace('{{emailId}}', email.id)}">
          Unsubscribe
        </a>
        ${CAN_SPAM_CONFIG.preferenceCenterUrl
          ? `| <a href="${CAN_SPAM_CONFIG.preferenceCenterUrl}">Manage Preferences</a>`
          : ''}
      </p>
    </div>
  `;
  return template + footer;
}
```

## GDPR Compliance

```typescript
// GDPR requires: consent, data processing basis, right to erasure, data retention limits

interface GdprConsent {
  userId: string;
  email: string;
  consentType: 'transactional' | 'marketing' | 'both';
  grantedAt: Date;
  ipAddress: string;
  userAgent: string;
  consentMethod: 'checkbox' | 'api' | 'double_opt_in';
  expiresAt?: Date;
  withdrawnAt?: Date;
}

class GdprService {
  async recordConsent(consent: GdprConsent): Promise<void> {
    await ConsentLog.create({
      ...consent,
      grantedAt: new Date(),
      consentVersion: '1.0',
    });
  }

  async withdrawConsent(userId: string): Promise<void> {
    await ConsentLog.updateMany(
      { userId, withdrawnAt: null },
      { withdrawnAt: new Date() }
    ).exec();

    // Create suppression record
    const consent = await ConsentLog.findOne({ userId }).sort({ grantedAt: -1 });
    if (consent) {
      await SuppressionList.create({
        email: consent.email,
        reason: 'consent_withdrawn',
        createdAt: new Date(),
      });
    }
  }

  async rightToErasure(userId: string): Promise<void> {
    // Anonymize or delete all email-related data
    await Promise.all([
      ConsentLog.updateMany(
        { userId },
        { $set: { email: `deleted-${userId}@redacted.local`, anonymized: true } }
      ).exec(),
      EmailEvent.updateMany(
        { recipient: { $regex: userId } },
        { $set: { recipient: `deleted@redacted.local` } }
      ).exec(),
      SuppressionList.deleteMany({ email: { $regex: userId } }).exec(),
    ]);
  }
}
```

## Unsubscribe Mechanism

```typescript
// List-Unsubscribe header and one-click unsubscribe (RFC 8058)

function setUnsubscribeHeaders(email: Email): Record<string, string> {
  const unsubscribeUrl = `https://yourdomain.com/unsubscribe/${email.id}`;
  const mailtoUnsubscribe = `mailto:unsubscribe@yourdomain.com?subject=unsubscribe-${email.id}`;

  return {
    'List-Unsubscribe': `<${unsubscribeUrl}>, <${mailtoUnsubscribe}>`,
    'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click', // RFC 8058
    'List-Id': `yourdomain.com`,
  };
}

// One-click unsubscribe handler
app.post('/unsubscribe/:emailId', async (req, res) => {
  const { emailId } = req.params;
  const email = await EmailSummary.findOne({ emailId });

  if (!email) {
    return res.status(404).send('Email not found');
  }

  await SuppressionList.create({
    email: email.recipient,
    reason: 'one_click_unsubscribe',
    source: 'email_header',
    createdAt: new Date(),
  });

  await ConsentLog.updateMany(
    { email: email.recipient, status: 'opted_in' },
    { status: 'opted_out', optOutDate: new Date(), optOutMethod: 'one_click_unsubscribe' }
  ).exec();

  // RFC 8058 requires 200 OK with empty body
  res.status(200).send('');
});
```

## Suppression List Management

```typescript
interface SuppressionEntry {
  id: string;
  email: string;
  domain: string;
  reason: 'bounce_hard' | 'bounce_soft_repeated' | 'complaint' | 'unsubscribe' | 'consent_withdrawn';
  source: 'webhook' | 'api' | 'email_header' | 'manual';
  createdAt: Date;
  expiresAt?: Date; // soft bounces expire after 7 days
}

class SuppressionListService {
  private readonly SOFT_BOUNCE_EXPIRY_DAYS = 7;
  private readonly MAX_SOFT_BOUNCES = 3;

  async isSuppressed(email: string): Promise<boolean> {
    const entry = await SuppressionList.findOne({
      email,
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    });
    return entry !== null;
  }

  async addBounce(email: string, bounceType: 'hard' | 'soft', reason: string): Promise<void> {
    if (bounceType === 'hard') {
      await SuppressionList.create({
        email,
        domain: email.split('@')[1],
        reason: 'bounce_hard',
        source: 'webhook',
        createdAt: new Date(),
      });
    } else {
      // Count recent soft bounces
      const recentSoftBounces = await SuppressionList.countDocuments({
        email,
        reason: 'bounce_soft_repeated',
        createdAt: { $gte: new Date(Date.now() - this.SOFT_BOUNCE_EXPIRY_DAYS * 86400000) },
      });

      if (recentSoftBounces >= this.MAX_SOFT_BOUNCES) {
        await SuppressionList.create({
          email,
          domain: email.split('@')[1],
          reason: 'bounce_soft_repeated',
          source: 'webhook',
          createdAt: new Date(),
          expiresAt: new Date(Date.now() + this.SOFT_BOUNCE_EXPIRY_DAYS * 86400000),
        });
      }
    }
  }

  async bulkCheck(emails: string[]): Promise<Map<string, boolean>> {
    const suppressed = await SuppressionList.find({
      email: { $in: emails },
      $or: [
        { expiresAt: null },
        { expiresAt: { $gt: new Date() } },
      ],
    });
    const result = new Map<string, boolean>();
    for (const email of emails) {
      result.set(email, suppressed.some(s => s.email === email));
    }
    return result;
  }
}
```

## Data Retention Policies

```typescript
class DataRetentionService {
  private readonly retentionPolicies: Record<string, number> = {
    email_events: 90,       // days — raw events
    email_summaries: 365,   // days — aggregated summaries
    consent_logs: 730,      // days — 2 years (GDPR)
    suppression_list: null, // never delete — permanent block
  };

  async applyRetentionPolicies(): Promise<RetentionResult> {
    const results: RetentionResult = { deleted: {} };

    for (const [collection, retentionDays] of Object.entries(this.retentionPolicies)) {
      if (retentionDays === null) continue;

      const cutoff = new Date(Date.now() - retentionDays * 86400000);
      const model = this.getModel(collection);

      const result = await model.deleteMany({
        timestamp: { $lt: cutoff },
      }).exec();

      results.deleted[collection] = result.deletedCount;
    }

    return results;
  }

  private getModel(collection: string): any {
    const models: Record<string, any> = {
      email_events: EmailEvent,
      email_summaries: EmailSummary,
      consent_logs: ConsentLog,
      suppression_list: SuppressionList,
    };
    return models[collection];
  }
}

// Scheduled task (cron job)
async function retentionCron(): Promise<void> {
  const service = new DataRetentionService();
  const result = await service.applyRetentionPolicies();
  logger.info('Retention policies applied', { deleted: result.deleted });
}
```

## Audit Logging

```typescript
interface ComplianceAudit {
  id: string;
  action: 'consent_granted' | 'consent_withdrawn' | 'email_sent' | 'unsubscribed'
       | 'right_to_erasure' | 'suppression_added' | 'data_export';
  userId: string;
  email?: string;
  metadata: Record<string, any>;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

class AuditService {
  async log(audit: Omit<ComplianceAudit, 'id' | 'timestamp'>): Promise<void> {
    await ComplianceAudit.create({
      ...audit,
      timestamp: new Date(),
    });
  }

  async getAuditTrail(userId: string): Promise<ComplianceAudit[]> {
    return ComplianceAudit.find({ userId })
      .sort({ timestamp: -1 })
      .lean()
      .exec();
  }
}
```

## Key Points
- Include List-Unsubscribe header in every email (RFC 8058 one-click unsubscribe)
- Never send to suppressed emails — always check suppression list before sending
- Record consent with timestamp, IP, method; support withdrawal and right to erasure
- Implement data retention policies: raw events 90 days, consent logs 2 years
- Maintain audit trail for all compliance-related actions
- CAN-SPAM requires: accurate header, valid physical address, working unsubscribe
- GDPR requires: consent record, right to erasure, data retention limits, audit log
