# Email Deliverability

## Overview
Email deliverability determines whether your messages reach recipients' inboxes or are filtered as spam. Proper authentication (SPF, DKIM, DMARC), reputation management, and bounce handling are essential for maintaining high deliverability rates.

## SPF (Sender Policy Framework)

### How SPF Works
SPF allows domain owners to specify which mail servers are authorized to send email on behalf of their domain. The receiving mail server checks the SPF record to verify that the sending server is authorized.

### SPF Record Syntax

```dns
; SPF record as a TXT record
; Format: v=spf1 <mechanisms> <qualifier>

; Simple SPF record for single provider
v=spf1 include:amazonses.com ~all

; Multiple providers
v=spf1 include:amazonses.com include:sendgrid.net include:spf.mandrillapp.com ~all

; With custom mail server
v=spf1 mx include:amazonses.com include:sendgrid.net ip4:203.0.113.0/24 ~all

; Soft fail (recommended for testing)
v=spf1 include:amazonses.com ~all

; Hard fail (strict)
v=spf1 include:amazonses.com -all

; Neutral
v=spf1 include:amazonses.com ?all
```

### SPF Mechanisms

```dns
; include - Delegate authority to another domain
include:sendgrid.net

; ip4 - Authorize specific IPv4 address or range
ip4:203.0.113.0/24

; ip6 - Authorize specific IPv6 address or range
ip6:2001:db8::/32

; mx - Authorize domain's MX servers
mx

; a - Authorize domain's A record servers
a

; exists - Check if sender IP exists (for macros)
exists:%{i}._spf.example.com

; all - Match all remaining IPs (~ = softfail, - = hardfail, ? = neutral, + = pass)
~all
```

### SPF Lookup Limit

```typescript
// SPF has a 10 DNS lookup limit
// Use SPF flattening tools to reduce lookups
async function flattenSpfRecord(domain: string): Promise<string> {
  const records = await dns.resolveTxt(domain);
  const spfRecord = records.find(r => r.join('').startsWith('v=spf1'));

  if (!spfRecord) return '';

  const spfString = spfRecord.join('');
  const includes = spfString.match(/include:(\S+)/g) || [];

  if (includes.length <= 10) return spfString;

  // Flatten includes to raw IP ranges
  console.warn(`SPF for ${domain} has ${includes.length} lookups, flattening recommended`);
  return await flattenToIps(spfString);
}
```

## DKIM (DomainKeys Identified Mail)

### How DKIM Works
DKIM adds a digital signature to outgoing email headers. The receiving server verifies this signature by looking up the sender's public key in DNS. This confirms the email hasn't been tampered with and is genuinely from the claimed domain.

### DKIM Record Format

```dns
; DKIM record format
; <selector>._domainkey.<domain> IN TXT "v=DKIM1; p=<public_key>"

; Example DKIM record for selector "default"
default._domainkey.yourdomain.com IN TXT "v=DKIM1; k=rsa; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC4i4Q5Lj8Y...Abz3hwIDAQAB"

; With additional tags
default._domainkey.yourdomain.com IN TXT "v=DKIM1; k=rsa; h=sha256; s=email; p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC4i4Q5Lj8Y...Abz3hwIDAQAB"
```

### DKIM Signing Implementation

```typescript
import crypto from 'crypto';
import { SignOptions } from 'dkim-signer';

interface DkimSignOptions {
  domain: string;
  selector: string;
  privateKey: string;
  headers: string[];
  algorithm?: 'rsa-sha256' | 'rsa-sha1';
  canonicalization?: 'simple/simple' | 'relaxed/relaxed' | 'simple/relaxed' | 'relaxed/simple';
  bodyLength?: number;
}

function signWithDkim(email: string, options: DkimSignOptions): string {
  const signer = crypto.createSign('RSA-SHA256');
  signer.update(email);
  const signature = signer.sign(options.privateKey, 'base64');

  const dkimHeader = [
    `v=1`,
    `a=${options.algorithm || 'rsa-sha256'}`,
    `c=${options.canonicalization || 'relaxed/relaxed'}`,
    `d=${options.domain}`,
    `s=${options.selector}`,
    `h=${options.headers.join(':')}`,
    `bh=${computeBodyHash(email)}`,
    `b=${signature}`,
  ].join('; ');

  return `DKIM-Signature: ${dkimHeader}\r\n${email}`;
}
```

### Key Rotation Strategy

```typescript
interface DkimKey {
  selector: string;
  privateKey: string;
  publicKey: string;
  created: Date;
  active: boolean;
}

class DkimKeyManager {
  private keys: DkimKey[] = [];

  async rotateKeys(): Promise<void> {
    const newKey = await this.generateKeyPair();
    newKey.selector = `s${Math.floor(Date.now() / 1000)}`;

    await this.publishToDns(newKey);
    this.keys.push(newKey);

    // Deactivate old keys after 7 days
    const oldKeys = this.keys.filter(k => k.active && k.created < new Date(Date.now() - 7 * 86400000));
    for (const key of oldKeys) {
      key.active = false;
    }
  }

  private async generateKeyPair(): Promise<DkimKey> {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    return {
      selector: '',
      privateKey,
      publicKey: publicKey.toString('base64'),
      created: new Date(),
      active: true,
    };
  }
}
```

## DMARC (Domain-based Message Authentication, Reporting & Conformance)

### How DMARC Works
DMARC builds on SPF and DKIM by telling receiving servers what to do when authentication fails. It also provides reporting to help domain owners monitor authentication results.

### DMARC Record Format

```dns
; DMARC record at _dmarc.<domain>
_dmarc.yourdomain.com IN TXT "v=DMARC1; p=none; rua=mailto:dmarc@yourdomain.com; ruf=mailto:forensic@yourdomain.com; pct=100"

; Quarantine policy (recommended for production)
_dmarc.yourdomain.com IN TXT "v=DMARC1; p=quarantine; sp=quarantine; rua=mailto:dmarc@yourdomain.com; pct=100; fo=1"

; Reject policy (strict)
_dmarc.yourdomain.com IN TXT "v=DMARC1; p=reject; sp=reject; rua=mailto:dmarc@yourdomain.com; ri=86400"
```

### DMARC Policy Tags

```dns
; p - Policy for the domain (none, quarantine, reject)
p=quarantine

; sp - Policy for subdomains
sp=reject

; rua - Aggregate report URIs (where to send XML reports)
rua=mailto:dmarc@yourdomain.com

; ruf - Forensic report URIs (individual failure reports)
ruf=mailto:forensic@yourdomain.com

; pct - Percentage of messages to apply policy to
pct=100

; ri - Reporting interval in seconds
ri=86400

; fo - Forensic reporting options (0=generate if SPF and DKIM both fail, 1=generate if either fails, d=generate if DKIM fails, s=generate if SPF fails)
fo=1

; adkim - DKIM alignment mode (r=relaxed, s=strict)
adkim=r

; aspf - SPF alignment mode (r=relaxed, s=strict)
aspf=r
```

### DMARC Report Processing

```typescript
import { parseStringPromise } from 'xml2js';
import { compress } from 'zlib';

interface DmarcReport {
  orgName: string;
  email: string;
  extraContactInfo: string;
  reportId: string;
  dateRange: { begin: number; end: number };
  policies: {
    domain: string;
    adkim: string;
    aspf: string;
    p: string;
    sp: string;
    pct: number;
  };
  records: DmarcRecord[];
}

interface DmarcRecord {
  sourceIp: string;
  count: number;
  disposition: string;
  dkim: string;
  spf: string;
  envelopeTo: string;
  headerFrom: string;
}

async function processDmarcReport(reportXml: string): Promise<DmarcReport> {
  const parsed = await parseStringPromise(reportXml);

  return {
    orgName: parsed.feedback.report_metadata[0].org_name[0],
    email: parsed.feedback.report_metadata[0].email[0],
    extraContactInfo: parsed.feedback.report_metadata[0].extra_contact_info?.[0],
    reportId: parsed.feedback.report_metadata[0].report_id[0],
    dateRange: {
      begin: parseInt(parsed.feedback.report_metadata[0].date_range[0].begin[0]),
      end: parseInt(parsed.feedback.report_metadata[0].date_range[0].end[0]),
    },
    policies: {
      domain: parsed.feedback.policy_published[0].domain[0],
      adkim: parsed.feedback.policy_published[0].adkim[0],
      aspf: parsed.feedback.policy_published[0].aspf[0],
      p: parsed.feedback.policy_published[0].p[0],
      sp: parsed.feedback.policy_published[0].sp[0],
      pct: parseInt(parsed.feedback.policy_published[0].pct[0]),
    },
    records: parsed.feedback.record.map(record => ({
      sourceIp: record.row[0].source_ip[0],
      count: parseInt(record.row[0].count[0]),
      disposition: record.row[0].policy_evaluated[0].disposition[0],
      dkim: record.row[0].policy_evaluated[0].dkim[0],
      spf: record.row[0].policy_evaluated[0].spf[0],
      envelopeTo: record.identifiers[0].envelope_to[0],
      headerFrom: record.identifiers[0].header_from[0],
    })),
  };
}

async function handleIncomingDmarcReport(email: EmailMessage): Promise<void> {
  // Extract report from email attachment
  for (const attachment of email.attachments) {
    if (attachment.contentType === 'application/gzip') {
      const decompressed = await new Promise<Buffer>((resolve, reject) => {
        gunzip(attachment.content, (err, result) => {
          if (err) reject(err);
          else resolve(result);
        });
      });

      const report = await processDmarcReport(decompressed.toString());
      await storeDmarcReport(report);
      await analyzeDeliverability(report);
    }
  }
}
```

## Bounce Handling

### Bounce Classification

```typescript
interface BounceRecord {
  email: string;
  type: 'hard' | 'soft' | 'complaint';
  reason: string;
  timestamp: Date;
  source: 'smtp' | 'webhook' | 'feedback_loop';
  provider: string;
  messageId: string;
}

const BOUNCE_CATEGORIES = {
  hard: {
    'user-unknown': 'Address does not exist',
    'mailbox-full': 'Mailbox full (temporary)',
    'invalid-domain': 'Domain does not exist',
    'rejected': 'Server rejected message',
    'bad-address': 'Malformed email address',
  },
  soft: {
    'mailbox-full': 'Mailbox full',
    'try-later': 'Server temporarily unavailable',
    'rate-limit': 'Rate limit exceeded',
    'content-error': 'Message content rejected',
    'connection-timed-out': 'Connection timed out',
  },
};

function classifyBounce(smtpCode: number, diagMessage: string): BounceClassification {
  if (smtpCode === 550 && diagMessage.includes('does not exist')) {
    return { type: 'hard', category: 'user-unknown', permanent: true };
  }
  if (smtpCode === 552 || diagMessage.includes('mailbox full')) {
    return { type: 'soft', category: 'mailbox-full', permanent: false };
  }
  if (smtpCode >= 500 && smtpCode < 600) {
    return { type: 'hard', category: 'rejected', permanent: true };
  }
  if (smtpCode >= 400 && smtpCode < 500) {
    return { type: 'soft', category: 'try-later', permanent: false };
  }
  return { type: 'soft', category: 'unknown', permanent: false };
}
```

### Bounce Processing Pipeline

```typescript
class BounceProcessor {
  private readonly HARD_BOUNCE_THRESHOLD = 1;
  private readonly SOFT_BOUNCE_THRESHOLD = 3;
  private readonly BOUNCE_WINDOW = 7 * 86400000; // 7 days

  async processBounce(bounce: BounceRecord): Promise<void> {
    if (bounce.type === 'hard') {
      await this.suppressAddress(bounce.email, 'Hard bounce');
      await this.notifyUser(bounce.email);
    } else if (bounce.type === 'soft') {
      const recentBounces = await this.countRecentBounces(bounce.email, this.BOUNCE_WINDOW);
      if (recentBounces >= this.SOFT_BOUNCE_THRESHOLD) {
        await this.suppressAddress(bounce.email, `Soft bounce threshold reached (${recentBounces})`);
      }
    } else if (bounce.type === 'complaint') {
      await this.suppressAddress(bounce.email, 'Spam complaint');
      await this.notifyAdmin(bounce.email);
    }

    await this.storeBounceRecord(bounce);
  }

  private async suppressAddress(email: string, reason: string): Promise<void> {
    await SuppressionList.create({
      email,
      reason,
      suppressedAt: new Date(),
      source: 'bounce_processor',
    });

    // Remove from active lists
    await UserList.updateMany(
      { 'subscribers.email': email },
      { $pull: { subscribers: { email } } }
    ).exec();
  }

  private async countRecentBounces(email: string, window: number): Promise<number> {
    return await BounceRecord.countDocuments({
      email,
      timestamp: { $gte: new Date(Date.now() - window) },
      type: 'soft',
    }).exec();
  }
}
```

## Complaint Handling

### Feedback Loop Integration

```typescript
interface ComplaintRecord {
  email: string;
  type: 'abuse' | 'fraud' | 'virus' | 'other';
  timestamp: Date;
  source: 'arl' | 'sendgrid' | 'ses' | 'manual';
  userAgent?: string;
  reportedBy?: string;
}

class ComplaintManager {
  async processComplaint(complaint: ComplaintRecord): Promise<void> {
    await SuppressionList.create({
      email: complaint.email,
      reason: `Spam complaint (${complaint.type})`,
      suppressedAt: new Date(),
      source: 'complaint',
    });

    // Remove from all mailing lists
    await this.removeFromAllLists(complaint.email);

    // Update sender reputation
    await this.updateReputation(complaint.email);

    // Notify compliance team if threshold exceeded
    const complaintRate = await this.calculateComplaintRate();
    if (complaintRate > 0.001) {
      await this.alertComplianceTeam(complaintRate);
    }
  }

  private async calculateComplaintRate(): Promise<number> {
    const lastWeek = new Date(Date.now() - 7 * 86400000);
    const complaints = await ComplaintRecord.countDocuments({ timestamp: { $gte: lastWeek } });
    const sent = await SentMessage.countDocuments({ sentAt: { $gte: lastWeek } });
    return sent > 0 ? complaints / sent : 0;
  }
}
```

## Reputation Monitoring

### Reputation Score Calculation

```typescript
interface ReputationScore {
  domain: string;
  score: number;        // 0-100
  bounceRate: number;
  complaintRate: number;
  spamTrapHits: number;
  unknownUserRate: number;
  engagementRate: number;
  level: 'high' | 'medium' | 'low' | 'poor';
}

class ReputationMonitor {
  async calculateReputation(domain: string): Promise<ReputationScore> {
    const [bounceRate, complaintRate, engagementRate] = await Promise.all([
      this.getBounceRate(domain),
      this.getComplaintRate(domain),
      this.getEngagementRate(domain),
    ]);

    let score = 100;

    // Bounce rate penalties
    if (bounceRate > 0.02) score -= 20;
    if (bounceRate > 0.05) score -= 20;
    if (bounceRate > 0.10) score -= 20;

    // Complaint rate penalties
    if (complaintRate > 0.001) score -= 25;
    if (complaintRate > 0.005) score -= 25;

    // Engagement bonuses
    if (engagementRate > 0.3) score += 10;
    if (engagementRate > 0.5) score += 10;

    score = Math.max(0, Math.min(100, score));

    return {
      domain,
      score,
      bounceRate,
      complaintRate,
      spamTrapHits: await this.getSpamTrapHits(domain),
      unknownUserRate: await this.getUnknownUserRate(domain),
      engagementRate,
      level: score >= 80 ? 'high' : score >= 60 ? 'medium' : score >= 40 ? 'low' : 'poor',
    };
  }

  async getDailyReport(domain: string): Promise<ReputationReport> {
    const [sent, delivered, opened, clicked, bounced, complained] = await Promise.all([
      this.count('sent', domain),
      this.count('delivered', domain),
      this.count('opened', domain),
      this.count('clicked', domain),
      this.count('bounced', domain),
      this.count('complained', domain),
    ]);

    return {
      date: new Date(),
      domain,
      sent,
      delivered,
      opened,
      clicked,
      bounced,
      complained,
      deliveredRate: sent > 0 ? delivered / sent : 0,
      openRate: delivered > 0 ? opened / delivered : 0,
      clickRate: delivered > 0 ? clicked / delivered : 0,
      bounceRate: sent > 0 ? bounced / sent : 0,
      complaintRate: sent > 0 ? complained / sent : 0,
    };
  }
}
```

## List Hygiene

### Email Validation Pipeline

```typescript
class EmailValidator {
  async validate(email: string): Promise<ValidationResult> {
    // Step 1: Syntax validation
    if (!this.checkSyntax(email)) {
      return { valid: false, reason: 'Invalid syntax' };
    }

    const domain = email.split('@')[1];

    // Step 2: Domain validation
    const hasMx = await this.checkMxRecord(domain);
    if (!hasMx) {
      return { valid: false, reason: 'Domain has no MX records' };
    }

    // Step 3: Disposable email check
    if (await this.isDisposable(domain)) {
      return { valid: false, reason: 'Disposable email domain' };
    }

    // Step 4: Role-based account check
    const localPart = email.split('@')[0];
    if (this.isRoleBased(localPart)) {
      return { valid: false, reason: 'Role-based email address' };
    }

    // Step 5: SMTP verification
    const smtpValid = await this.verifySmtp(email);
    if (!smtpValid) {
      return { valid: false, reason: 'SMTP verification failed' };
    }

    return { valid: true };
  }

  private async checkMxRecord(domain: string): Promise<boolean> {
    try {
      const addresses = await dns.resolveMx(domain);
      return addresses && addresses.length > 0;
    } catch {
      return false;
    }
  }

  private isRoleBased(localPart: string): boolean {
    const roleAccounts = [
      'admin', 'support', 'info', 'contact', 'hello', 'hi',
      'help', 'sales', 'marketing', 'team', 'noreply', 'no-reply',
      'webmaster', 'postmaster', 'hostmaster', 'abuse',
    ];
    return roleAccounts.includes(localPart.toLowerCase());
  }
}
```

## Key Points

- Always implement SPF, DKIM, and DMARC with a policy progression (none → quarantine → reject)
- Keep SPF lookups under 10 to avoid DNS lookup limit
- Monitor DMARC reports daily for authentication failures
- Process bounces in real-time with automatic suppression
- Maintain complaint rate below 0.1% and bounce rate below 2%
- Implement feedback loop with all major ISPs (AOL, Comcast, Yahoo, Gmail, Outlook)
- Use email validation before sending to reduce bounces
- Implement delivery tracking with webhooks for real-time status
- Monitor blacklists (Spamhaus, Barracuda, SURBL) daily
- Maintain list hygiene with regular re-engagement campaigns
- Ramp sending volume gradually for new IPs (IP warmup)
- Use engagement-based sending (send only to engaged users)
- Implement sunset policy for inactive subscribers (6 months)
- Monitor sending reputation with Google Postmaster Tools and Microsoft SNDS
- Keep consistent sending volume and avoid sudden spikes
- Use dedicated IP for high-volume sending (>100K/month)
- Implement suppression list at domain level (not per campaign)
- Always provide clear unsubscribe mechanism in every email
- Segment lists by engagement level for targeted sending
- Audit authentication records quarterly for compliance
