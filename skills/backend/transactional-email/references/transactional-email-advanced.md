# Advanced Transactional Email: Multi-Provider Resilience, Webhooks, Transport Security and Scale

Production concerns beyond basic sending: provider failover, secure webhook processing, mailbox-provider sender requirements, transport security (MTA-STS, TLS-RPT), brand indicators (BIMI), dedicated IP strategy, rate shaping, and operating at high volume. SPF/DKIM/DMARC setup, templates, analytics, compliance and testing are in sibling references.

## Mailbox Provider Sender Requirements

Since February 2024, Gmail and Yahoo require for **all** senders: SPF or DKIM authentication, valid forward and reverse DNS for sending IPs, TLS for transmission, and low spam rates. **Bulk senders** (Gmail: about 5,000+ messages per day to Gmail accounts) must additionally:
- authenticate with SPF **and** DKIM, and publish DMARC (at least `p=none`) with alignment of the From domain,
- support one-click unsubscribe (RFC 8058 `List-Unsubscribe` + `List-Unsubscribe-Post`) for marketing/subscribed messages,
- keep the user-reported spam rate below 0.3% (target below 0.1%).

Microsoft (Outlook.com) announced similar requirements for high-volume senders in 2025. Transactional messages are exempt from the unsubscribe requirement, but authentication and spam-rate rules apply to the whole domain's reputation.

## Multi-Provider Failover

```
                 +--> Provider A (primary, 100% of traffic)
email worker --> | 
                 +--> Provider B (warm standby, small % to keep reputation warm)
```

| Design point | Recommendation |
|---|---|
| Abstraction | Thin `EmailSender` interface; provider adapters map templates, tags, errors |
| Domain auth | Both providers authorized: SPF includes, separate DKIM selectors per provider (`a1._domainkey`, `b1._domainkey`) |
| Warm standby | Send a steady share through B so its IPs/domains have reputation when needed |
| Failover trigger | Error rate or latency SLO breach, provider incident; manual override flag |
| Idempotency | Same logical message must not be sent by both; track by your message ID |
| Templates | Render in your app (e.g. MJML -> HTML) so content does not depend on one provider's template engine |
| Webhooks | Normalize events from both into one schema |

```python
from __future__ import annotations

import logging
from dataclasses import dataclass
from typing import Protocol

log = logging.getLogger(__name__)


@dataclass(frozen=True, slots=True)
class OutboundEmail:
    message_id: str          # your ID, used for idempotency
    to: str
    subject: str
    html: str
    text: str
    category: str


class EmailSender(Protocol):
    name: str
    def send(self, email: OutboundEmail) -> str: ...


class RetryableSendError(Exception): ...


def send_with_failover(email: OutboundEmail, primary: EmailSender, secondary: EmailSender,
                       primary_healthy: bool) -> tuple[str, str]:
    order = (primary, secondary) if primary_healthy else (secondary, primary)
    last_exc: Exception | None = None
    for sender in order:
        try:
            return sender.name, sender.send(email)
        except RetryableSendError as exc:
            log.warning("Provider %s failed for message_id=%s: %s", sender.name, email.message_id, exc)
            last_exc = exc
    raise RuntimeError(f"All providers failed for message_id={email.message_id}") from last_exc
```
Only fail over on errors where the first provider definitely did not accept the message (connection refused, 5xx before acceptance). Ambiguous timeouts risk duplicates; check the first provider's message status API first or accept the duplicate risk explicitly for low-stakes categories.

## Webhook Processing

Providers post delivery events (processed, delivered, deferred, bounced, complained, opened, clicked, unsubscribed).

Security and correctness:
- **Verify signatures**: e.g. SendGrid signed event webhook (ECDSA public key), Mailgun HMAC-SHA256 with timestamp and token, Postmark basic auth/IP allow-list, Resend/Svix-style signed headers, SES via SNS message signatures. Reject unsigned or stale (timestamp skew) requests.
- **Respond fast** (2xx) and process asynchronously via a queue.
- **Deduplicate** by provider event ID; events are delivered at least once and may arrive out of order.
- **Order-tolerant state machine**: never move a message from `bounced` back to `delivered` because a late event arrived.

```python
import hashlib
import hmac
import time


def verify_mailgun(signing_key: str, timestamp: str, token: str, signature: str, max_skew_s: int = 300) -> None:
    if abs(time.time() - int(timestamp)) > max_skew_s:
        raise PermissionError("Webhook timestamp outside allowed window")
    expected = hmac.new(signing_key.encode(), f"{timestamp}{token}".encode(), hashlib.sha256).hexdigest()
    if not hmac.compare_digest(expected, signature):
        raise PermissionError("Invalid Mailgun webhook signature")
```
Also store used tokens for the skew window to prevent replay.

## Transport Security

| Mechanism | Purpose | Setup |
|---|---|---|
| TLS (STARTTLS) | Encrypt SMTP hops | Providers handle outbound; ensure your inbound MX supports it |
| MTA-STS (RFC 8461) | Tells senders to require TLS to your MX with valid certs | `_mta-sts.example.com` TXT + policy file at `https://mta-sts.example.com/.well-known/mta-sts.txt` |
| TLS-RPT (RFC 8460) | Daily reports of TLS failures delivering to you | `_smtp._tls.example.com TXT "v=TLSRPTv1; rua=mailto:tlsrpt@example.com"` |
| DANE (RFC 7672) | TLSA records with DNSSEC | Requires DNSSEC-signed zone |

```
# mta-sts.txt
version: STSv1
mode: enforce
mx: mx1.example.com
mx: mx2.example.com
max_age: 604800
```
Start with `mode: testing` and review TLS-RPT reports before enforcing.

## BIMI (Brand Indicators)
- Displays your logo in supporting inboxes (Gmail, Apple Mail, Yahoo and others).
- Requires DMARC at enforcement (`p=quarantine` or `p=reject`, with `pct=100`), an SVG Tiny PS logo, and for Gmail a Verified Mark Certificate (VMC) or Common Mark Certificate (CMC).
```
default._bimi.example.com TXT "v=BIMI1; l=https://example.com/bimi/logo.svg; a=https://example.com/bimi/vmc.pem"
```

## Dedicated IPs and Reputation
| Option | When |
|---|---|
| Shared IP pool | Low or irregular volume; provider manages reputation |
| Dedicated IPs | Consistent high volume (often hundreds of thousands per month or more) and you want isolation |
| Separate pools per stream | Transactional vs. marketing never share IPs |

Dedicated IPs need warm-up (gradually increasing daily volume over weeks) and steady volume; a cold dedicated IP can deliver worse than a good shared pool. Domain reputation (DKIM `d=` domain) matters as much as IP reputation.

## Rate Shaping and Scale
- Respect provider send-rate quotas (e.g. SES per-second rate) with a token bucket in workers.
- Prioritized queues: auth/security emails on a separate high-priority queue so a bulk receipt backlog never delays OTPs.
- Batch endpoints for high-volume notifications where supported.
- Digest low-priority notifications (hourly/daily) to reduce volume and complaints.
- Monitor queue age; alert when OTP queue age exceeds seconds, not minutes.

## Operational Monitoring
| Signal | Alert on |
|---|---|
| Provider API errors | Error rate spike per provider |
| Delivery latency p95 per category | OTP/reset above target |
| Bounce rate per domain (gmail.com, outlook.com) | Sudden increase (blocklisting, auth breakage) |
| Complaint rate | Approaching mailbox thresholds |
| DMARC aggregate reports | Unauthenticated sources using your domain |
| Google Postmaster Tools / Microsoft SNDS | Reputation drop |

## Incident Playbook (Delivery Failure)
1. Identify scope: one provider, one mailbox provider, one category?
2. Check DNS/auth (DKIM key rotation, SPF lookup limit, DMARC alignment) and provider status.
3. Fail over critical categories to the standby provider.
4. Pause non-critical sends to protect reputation.
5. Review recent content or volume changes; fix root cause; resume gradually.

## Checklist
- [ ] Bulk-sender requirements met (SPF+DKIM+DMARC, low complaint rate)
- [ ] Two providers authenticated; standby kept warm
- [ ] Webhooks signature-verified, deduplicated and order-tolerant
- [ ] MTA-STS and TLS-RPT published for your receiving domains
- [ ] Priority queues for security emails; rate shaping per provider quota
- [ ] Reputation dashboards (Postmaster Tools, SNDS, DMARC reports) monitored
