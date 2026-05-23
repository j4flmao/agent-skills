# Subscription Billing

## Subscription States
`
Active → Past Due → Canceled (end of period)
  ↓                    ↓
Paused → Active    Unpaid (immediate)
`

## Dunning Strategy
| Attempt | Delay | Action |
|---------|-------|--------|
| 1 | 0 days | Send invoice, attempt payment |
| 2 | 3 days | Retry payment, email reminder |
| 3 | 7 days | Retry payment, escalate email |
| 4 | 14 days | Retry payment, warning of cancellation |
| 5 | 21 days | Final retry, then cancel subscription |

## Proration Models
| Model | Description |
|-------|-------------|
| Full refund | Cancel now, refund remaining period |
| No refund | Cancel at end of billing period |
| Prorated | Refund unused portion |
| Usage-based | Bill for actual usage to date |
