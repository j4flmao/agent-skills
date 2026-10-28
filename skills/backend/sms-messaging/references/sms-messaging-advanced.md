# SMS Messaging Advanced: Architecture, Throughput, Failover, Webhooks and Fraud Defense

Production architecture for high-volume or business-critical SMS: asynchronous sending pipeline, throughput limits and pacing, idempotency and retries without duplicates, multi-provider failover, secure webhook handling, SMS pumping fraud defense, cost control and channel fallback. Fundamentals (encoding, sender types) are in `sms-messaging-fundamentals.md`; provider abstraction code is in `sms-providers.md`.

## Sending Pipeline

```text
API / domain event
   -> validate (E.164, opt-out status, quiet hours, template render, segment count)
   -> persist message record (status=pending, idempotency key)
   -> enqueue (SQS, RabbitMQ, Kafka, Redis streams, background job framework)
   -> sender workers (rate limited per sender number / provider account)
   -> provider API (returns provider message ID)
   -> status webhooks -> status updates -> metrics, retries or fallback
```

Never call the provider synchronously inside a user-facing request for bulk or non-urgent messages. For OTPs, sending can be synchronous but still goes through the same validation and rate-limit layer.

### Message record

```sql
CREATE TABLE sms_messages (
  id               BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  idempotency_key  TEXT NOT NULL,
  to_number        TEXT NOT NULL,              -- E.164
  template_id      TEXT NOT NULL,
  body             TEXT NOT NULL,
  segments         SMALLINT NOT NULL,
  provider         TEXT,
  provider_msg_id  TEXT,
  status           TEXT NOT NULL CHECK (status IN ('pending','submitted','sent','delivered','undelivered','failed','suppressed')),
  error_code       TEXT,
  attempts         SMALLINT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (idempotency_key)
);
CREATE INDEX ON sms_messages (provider, provider_msg_id);
CREATE INDEX ON sms_messages (to_number, created_at);
```

Store message bodies only as long as needed; they may contain personal data.

## Throughput and Pacing

Throughput is constrained at several layers:

| Layer | Limit example |
|-------|---------------|
| Provider account | API requests per second, queue length limits |
| Sender number | Messages per second (MPS) per long code / toll-free / short code |
| Carrier (US 10DLC) | Daily and per-minute caps by brand trust score and campaign type, per carrier |
| Destination country | Local regulations and operator filtering |

- Use a token bucket per sender (and per provider account) in the workers; segments, not messages, often count toward MPS.
- Large campaigns: spread over time, respect quiet hours per recipient time zone, and prioritize transactional traffic (separate queues and senders for OTP/transactional vs marketing so a campaign never delays a login code).
- Number pools: distribute load across multiple registered numbers with sticky sender (same recipient always gets the same number) to keep conversations coherent. "Snowshoeing" (spreading spam across many numbers to evade filters) violates carrier rules; pools must be within registered campaigns.

## Idempotency and Retries

Duplicate SMS is a visible defect (and doubles cost). Rules:

- Assign an idempotency key per logical message (for example `order-shipped:{orderId}`) and enforce uniqueness in the database.
- Retry provider API calls only when the request certainly did not create a message: connection failures before sending, `429` and `5xx` responses. A timeout after sending is ambiguous; check status by your reference before resending if the provider supports lookup, or accept the risk explicitly for OTPs.
- Use exponential backoff with jitter and a maximum attempt count; then mark `failed` and alert.
- Never retry on permanent errors (invalid number, opted out, landline, blocked content).
- Status callbacks: process idempotently; ignore transitions that go backwards (`delivered` followed by a late `sent`).

## Multi-Provider Failover

| Strategy | Description | Caveat |
|----------|-------------|--------|
| Primary/secondary | Switch on provider outage (error rate or latency SLO breach) | Secondary must have registered senders for the same traffic |
| Per-country routing | Choose provider by destination quality and price | Requires quality metrics per country |
| Least-cost with quality floor | Cheapest provider meeting delivery-rate thresholds | Grey routes are cheap but unreliable and may violate rules |

- Sender registrations (10DLC campaigns, toll-free verification, short codes, alphanumeric IDs) are often tied to a provider; failover only works if registration exists on both.
- Use a circuit breaker per provider; health is measured from API errors and from delivery receipt rates (delivery rate dropping is an outage signal even when the API returns 200).
- Avoid failing over within a single OTP attempt in a way that sends two codes; let the user request a resend instead, and invalidate the previous code.

## Webhook Security

Status and inbound webhooks are public endpoints. Validate every request:

- Verify the provider's signature with its SDK helper. Example: Twilio signs requests with the `X-Twilio-Signature` header (HMAC over the full URL and POST parameters using your auth token); Vonage supports signed webhooks/JWT; AWS End User Messaging delivers events through SNS or other AWS destinations rather than public signatures.
- Use the exact public URL (scheme, host, path, query) the provider called when verifying; reverse proxies that rewrite URLs cause false failures.
- Return `2xx` quickly and process asynchronously; providers retry on timeouts and errors, so handlers must be idempotent.
- Rate-limit and log rejected webhook requests.

```ts
import twilio from "twilio";

export function verifyTwilio(req: { headers: Record<string, string>; body: Record<string, string> }, publicUrl: string): boolean {
  const signature = req.headers["x-twilio-signature"] ?? "";
  return twilio.validateRequest(process.env.TWILIO_AUTH_TOKEN!, signature, publicUrl, req.body);
}
```

## SMS Pumping (Artificially Inflated Traffic) Defense

Attackers trigger your app to send SMS (signup, OTP, "send me a link") to premium or attacker-controlled number ranges and share revenue with complicit carriers. Signs: spikes in sends to unusual countries or sequential number ranges, low verification completion rates, many requests per IP or device.

| Control | Detail |
|---------|--------|
| Geo permissions | Allow only countries you serve, at the provider account level |
| Rate limits | Per phone number, per IP, per device/session, per prefix range, and global per country |
| Bot protection | CAPTCHA or proof-of-work on unauthenticated SMS triggers; managed bot detection |
| Conversion monitoring | Alert when OTP completion rate for a country or prefix drops |
| Provider fraud tools | Built-in fraud guards in verification products (for example Twilio Verify Fraud Guard) |
| Spend caps | Daily budget alerts and hard caps per country |
| Line-type checks | Block or challenge non-mobile and high-risk number types for OTP |

Prefer authenticator apps or passkeys over SMS OTP where possible; SMS is vulnerable to SIM swap and interception, so treat it as a weaker factor.

## Cost Control

- Segment count drives cost: enforce maximum segments per template and catch UCS-2 switches.
- Country pricing varies widely; maintain a per-country cost table and budget.
- Suppress sends to known-bad numbers (repeated permanent failures, landlines, opted out).
- Track cost per message type and per feature; marketing and verification typically dominate.

## Channel Fallback

| Channel | Use |
|---------|-----|
| RCS Business Messaging | Rich branded messages on supported devices and carriers (Android; iOS 18 added RCS support), falls back to SMS |
| WhatsApp Business Platform | Popular in many countries; template approval and per-conversation pricing |
| Push notifications | Cheapest for app users; not guaranteed delivery |
| Email / voice | Fallback for OTP or critical alerts |

Implement channel selection by user preference, availability and cost, with a single message record tracking which channel delivered.

## Observability

| Metric | Alert on |
|--------|----------|
| Submission success rate per provider | Drops below baseline |
| Delivery rate per country, provider, sender | Sudden drop (filtering, outage) |
| Time to delivery (p95) | OTP latency above target |
| Queue depth and age | Backlog growth |
| Opt-out rate per campaign | Spikes (content or targeting problem) |
| Spend per hour per country | Unexpected spikes (fraud) |

## Checklist

- [ ] Asynchronous pipeline with persisted records and idempotency keys
- [ ] Separate queues and senders for transactional vs marketing traffic
- [ ] Per-sender pacing that respects MPS and carrier caps
- [ ] Retries only for safe cases; permanent errors suppressed
- [ ] Failover provider with matching sender registrations and circuit breakers
- [ ] Webhooks signature-verified, fast, idempotent
- [ ] Geo permissions, multi-dimensional rate limits and spend alerts against SMS pumping
- [ ] Delivery, latency, opt-out and cost metrics monitored
