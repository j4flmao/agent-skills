# Email Analytics

## Overview
Track email engagement metrics — opens, clicks, bounces, complaints — to monitor deliverability, optimize campaigns, and detect issues early. Integrate with webhooks and build reporting dashboards.

## Open & Click Tracking

```typescript
// Tracking pixel for open detection
function generateTrackingPixel(emailId: string): string {
  return `<img src="${process.env.TRACKING_DOMAIN}/v1/track/open?emailId=${emailId}" width="1" height="1" alt="" />`;
}

// Click tracking link wrapper
function wrapLink(emailId: string, originalUrl: string): string {
  const encodedUrl = encodeURIComponent(originalUrl);
  return `${process.env.TRACKING_DOMAIN}/v1/track/click?emailId=${emailId}&url=${encodedUrl}`;
}

// Tracking endpoint handler
app.get('/v1/track/open', async (req, res) => {
  const { emailId } = req.query;
  if (emailId) {
    await EmailEvent.create({
      emailId,
      type: 'open',
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
      timestamp: new Date(),
    });
  }
  // Return 1x1 transparent GIF
  res.setHeader('Content-Type', 'image/gif');
  res.send(Buffer.from('R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7', 'base64'));
});
```

## Email Event Schema

```typescript
// email-event.model.ts
interface EmailEvent {
  id: string;
  emailId: string;
  recipient: string;
  type: 'sent' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained' | 'unsubscribed';
  metadata?: {
    url?: string;          // clicked link
    userAgent?: string;
    ipAddress?: string;
    bounceType?: 'hard' | 'soft';
    bounceReason?: string;
    complaintType?: string;
  };
  timestamp: Date;
}

interface EmailSummary {
  emailId: string;
  templateType: string;
  recipient: string;
  sentAt: Date;
  deliveredAt?: Date;
  openedAt?: Date;
  clickedAt?: Date;
  openCount: number;
  clickCount: number;
  status: 'sending' | 'delivered' | 'opened' | 'clicked' | 'bounced' | 'complained';
}
```

## Aggregation Queries

```typescript
// Analytics queries using aggregation pipeline
class EmailAnalytics {
  async getEngagementStats(startDate: Date, endDate: Date): Promise<EngagementReport> {
    const events = await EmailEvent.aggregate([
      { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
      {
        $group: {
          _id: '$type',
          count: { $sum: 1 },
          uniqueRecipients: { $addToSet: '$recipient' },
        },
      },
    ]);

    const stats: Record<string, number> = {};
    for (const event of events) {
      stats[event._id] = event.count;
    }

    const sent = stats.sent || 0;
    return {
      totalSent: sent,
      totalDelivered: stats.delivered || 0,
      totalOpened: stats.opened || 0,
      totalClicked: stats.clicked || 0,
      totalBounced: stats.bounced || 0,
      totalComplained: stats.complained || 0,
      deliveryRate: sent > 0 ? ((stats.delivered || 0) / sent * 100).toFixed(2) : '0',
      openRate: (stats.delivered || 0) > 0 ? ((stats.opened || 0) / (stats.delivered || 0) * 100).toFixed(2) : '0',
      clickRate: (stats.opened || 0) > 0 ? ((stats.clicked || 0) / (stats.opened || 0) * 100).toFixed(2) : '0',
      bounceRate: sent > 0 ? ((stats.bounced || 0) / sent * 100).toFixed(2) : '0',
      complaintRate: sent > 0 ? ((stats.complained || 0) / sent * 100).toFixed(2) : '0',
    };
  }

  async getTemplatePerformance(): Promise<TemplatePerformance[]> {
    return EmailSummary.aggregate([
      {
        $group: {
          _id: '$templateType',
          totalSent: { $sum: 1 },
          totalOpened: { $sum: { $cond: [{ $gt: ['$openCount', 0] }, 1, 0] } },
          totalClicked: { $sum: { $cond: [{ $gt: ['$clickCount', 0] }, 1, 0] } },
          totalBounced: { $sum: { $cond: [{ $eq: ['$status', 'bounced'] }, 1, 0] } },
          avgOpenCount: { $avg: '$openCount' },
          avgClickCount: { $avg: '$clickCount' },
        },
      },
      { $sort: { totalSent: -1 } },
    ]);
  }
}
```

## Real-Time Dashboard

```typescript
// Socket.IO dashboard for real-time email stats
import { Server } from 'socket.io';

class EmailDashboard {
  private io: Server;

  constructor(server: HttpServer) {
    this.io = new Server(server, { path: '/dashboard' });
  }

  async streamEvent(event: EmailEvent): Promise<void> {
    // Emit to dashboard clients in real-time
    this.io.emit('email-event', {
      type: event.type,
      templateType: event.metadata?.templateType,
      recipient: maskEmail(event.recipient),
      timestamp: event.timestamp,
    });

    // Check for anomalies
    if (event.type === 'bounced') {
      await this.checkBounceRate();
    }
    if (event.type === 'complained') {
      await this.checkComplaintRate();
    }
  }

  private async checkBounceRate(): Promise<void> {
    const recent = await EmailEvent.countDocuments({
      type: 'bounced',
      timestamp: { $gte: new Date(Date.now() - 600000) },
    });
    const total = await EmailEvent.countDocuments({
      type: 'sent',
      timestamp: { $gte: new Date(Date.now() - 600000) },
    });
    const rate = total > 0 ? (recent / total) * 100 : 0;

    if (rate > 5) {
      this.io.emit('alert', {
        severity: 'critical',
        message: `Bounce rate spike: ${rate.toFixed(1)}% in last 10 minutes`,
      });
    }
  }
}
```

## Webhook Event Processing

```typescript
// SendGrid event webhook with detailed analytics
app.post('/webhooks/email/sendgrid', async (req, res) => {
  const events: SendGridEvent[] = req.body;

  for (const event of events) {
    const emailEvent: Partial<EmailEvent> = {
      emailId: event.sg_message_id,
      recipient: event.email,
      type: mapSendGridEvent(event.event),
      timestamp: new Date(event.timestamp * 1000),
    };

    if (event.event === 'click') {
      emailEvent.metadata = { url: event.url };
    }
    if (event.event === 'bounce') {
      emailEvent.metadata = {
        bounceType: event.type === 'blocked' ? 'soft' : 'hard',
        bounceReason: event.reason,
      };
    }
    if (event.event === 'spamreport') {
      emailEvent.metadata = { complaintType: 'abuse' };
    }

    await EmailEvent.create(emailEvent);
    await updateEmailSummary(event.sg_message_id, event.event);
  }

  res.status(200).send('OK');
});

function mapSendGridEvent(event: string): string {
  const map: Record<string, string> = {
    processed: 'sent',
    delivered: 'delivered',
    open: 'opened',
    click: 'clicked',
    bounce: 'bounced',
    dropped: 'bounced',
    spamreport: 'complained',
    unsubscribe: 'unsubscribed',
  };
  return map[event] || 'unknown';
}
```

## Reporting & Export

```typescript
class EmailReportGenerator {
  async generateDailyReport(date: Date): Promise<Report> {
    const startOfDay = new Date(date.setHours(0, 0, 0, 0));
    const endOfDay = new Date(date.setHours(23, 59, 59, 999));

    const stats = await analytics.getEngagementStats(startOfDay, endOfDay);
    const templates = await analytics.getTemplatePerformance();
    const hourlyBreakdown = await this.getHourlyBreakdown(startOfDay, endOfDay);

    return {
      date: startOfDay.toISOString().split('T')[0],
      summary: stats,
      templates,
      hourly: hourlyBreakdown,
      anomalies: await this.detectAnomalies(stats),
    };
  }

  async exportCsv(report: Report): Promise<string> {
    const rows = [
      ['Metric', 'Value'],
      ['Sent', report.summary.totalSent],
      ['Delivered', report.summary.totalDelivered],
      ['Opened', report.summary.totalOpened],
      ['Clicked', report.summary.totalClicked],
      ['Bounced', report.summary.totalBounced],
      ['Delivery Rate (%)', report.summary.deliveryRate],
      ['Open Rate (%)', report.summary.openRate],
      ['Click Rate (%)', report.summary.clickRate],
      ['Bounce Rate (%)', report.summary.bounceRate],
      ['Complaint Rate (%)', report.summary.complaintRate],
    ];
    return rows.map(row => row.join(',')).join('\n');
  }
}
```

## Key Points
- Use transparent tracking pixel for open detection; wrap links for click tracking
- Store every email event with timestamp, type, and metadata
- Monitor delivery rate (>95%), bounce rate (<2%), complaint rate (<0.1%)
- Build real-time dashboards with Socket.IO for immediate anomaly detection
- Implement hourly/daily automated reports with CSV export
- Alert on anomalies: bounce rate spikes, complaint rate increases, delivery drops
