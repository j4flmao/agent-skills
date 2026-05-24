# WAF Rules — OWASP CRS, Tuning, False Positives

## Layers of Defense

```
1. Provider managed rules (Cloudflare Managed, AWS Managed, Akamai KSD)
   – Curated, updated by vendor, broad coverage
2. OWASP Core Rule Set (CRS)
   – Open source, paranoid by default, tune down
3. Custom rules
   – App-specific (block /admin from non-corp IPs, etc.)
4. Rate limits
   – Per IP / per session / per route
5. Bot management
   – ML-driven, separates good bots (Googlebot) from bad
```

## OWASP CRS Baseline

```
SQLi (REQUEST-942)
XSS (REQUEST-941)
LFI / Path traversal (REQUEST-930)
RFI / Remote file inclusion (REQUEST-931)
Command injection (REQUEST-932)
PHP-specific (REQUEST-933)
Java-specific (REQUEST-944)
Session fixation (REQUEST-943)
Generic attacks (REQUEST-934)
Generic data leakage (RESPONSE-95x)
HTTP protocol enforcement (REQUEST-920)
HTTP scanner detection (REQUEST-913)
```

Paranoia levels:
- PL1: minimal, low FP, broad coverage
- PL2: tighter, some FP, typical production
- PL3: strict, many FP, requires tuning
- PL4: paranoid, only for hardened apps

Start at PL2 for typical SaaS; PL3+ for high-security.

## Deployment Workflow

```
Phase 1 (Week 1-2): Log only
  - Deploy CRS at PL2 in log-only mode
  - Collect all "blocked" events as logs
  - Identify legitimate traffic flagged (false positives)

Phase 2 (Week 3): Tune
  - For each FP, write exclusion rule (by request path, source IP, header)
  - Re-run log-only with exclusions in place

Phase 3 (Week 4): Block in canary
  - Enable block mode for 5% traffic / one geo
  - Monitor real customer error rate
  - Roll back any new FP discovered

Phase 4 (Week 5-6): Full block
  - 100% block mode
  - Keep weekly review of triggered rules

Phase 5 (ongoing): Continuous tune
  - New app endpoints → check WAF logs
  - New attack patterns → add custom rules
  - Quarterly review of CRS version updates
```

## Custom Rule Examples

```yaml
# Cloudflare Ruleset Engine syntax

# Block admin from non-corp IPs
- expression: '(http.request.uri.path matches "^/admin") and not (ip.src in $corp_ips)'
  action: block

# Challenge suspicious user agents
- expression: '(http.user_agent contains "sqlmap") or (http.user_agent contains "nikto")'
  action: block

# Rate-limit login endpoint
- expression: '(http.request.uri.path eq "/api/login") and (http.request.method eq "POST")'
  action: challenge
  ratelimit:
    threshold: 5
    period: 60
    mitigation_timeout: 900

# Block requests with no UA
- expression: '(http.user_agent eq "")'
  action: block

# Allow Googlebot (real) — uses verified-bot check
- expression: 'cf.verified_bot_category eq "search_engine"'
  action: skip
  skip: managed_challenge
```

```hcl
# AWS WAF v2 — IPSet rule example
resource "aws_wafv2_ip_set" "corp_ips" {
  name               = "corp-ips"
  scope              = "CLOUDFRONT"
  ip_address_version = "IPV4"
  addresses          = ["203.0.113.0/24", "198.51.100.0/24"]
}

resource "aws_wafv2_web_acl" "main" {
  name  = "main"
  scope = "CLOUDFRONT"
  default_action { allow {} }
  rule {
    name     = "block-admin-non-corp"
    priority = 10
    action { block {} }
    statement {
      and_statement {
        statement {
          byte_match_statement {
            search_string         = "/admin"
            positional_constraint = "STARTS_WITH"
            field_to_match { uri_path {} }
            text_transformation { priority = 0; type = "LOWERCASE" }
          }
        }
        statement {
          not_statement {
            statement {
              ip_set_reference_statement { arn = aws_wafv2_ip_set.corp_ips.arn }
            }
          }
        }
      }
    }
    visibility_config {
      cloudwatch_metrics_enabled = true
      sampled_requests_enabled   = true
      metric_name                = "block-admin"
    }
  }
}
```

## Bot Management

```
Good bots:    Googlebot, Bingbot, monitoring (Pingdom), payment provider callbacks
Bad bots:     credential stuffing, scraping, inventory hoarding, ad fraud

Mitigation tiers:
  1. Verify good bots (reverse DNS + IP match)
  2. Managed challenge (JS challenge invisible to user)
  3. CAPTCHA (visible, hCaptcha / Turnstile)
  4. Block outright (for known-bad signatures)
```

Cloudflare Bot Management: ML score 1-99; block above 30, challenge above 10.
Akamai Bot Manager Premier: tightest enterprise detection.

## False Positive Workflow

```
1. WAF event log → triage queue
2. Categorize:
     - True positive (block stays)
     - False positive — legitimate request blocked
     - Suspicious — needs more data
3. For FP:
     - Identify rule ID that triggered (e.g., 942100 SQLi)
     - Identify why (input that looks like SQL, e.g., SELECT in a search field)
     - Add exclusion: skip this rule for this path or this parameter
4. Verify exclusion doesn't open hole (review with security)
5. Log exclusion in repo (CRS overrides committed to git)
6. Quarterly review of all exclusions
```

## Logging + Forwarding

```
WAF events ship to:
  Cloudflare Logpush → S3 / Datadog / Splunk
  AWS WAF Logs → Kinesis Firehose → S3 / CloudWatch
  Fastly real-time logs → Splunk / Sumo / S3

Required fields:
  timestamp, client_ip, country, asn, uri, method, ua,
  matched_rule_id, action_taken (block/challenge/log), request_headers, body_sample
```

## Compliance / Audit

```
PCI DSS 6.6           WAF required for any public-facing app handling cardholder data
HIPAA                 WAF as compensating control for known vulnerabilities
ISO 27001 A.13.1.1    network protection (WAF qualifies)
```

## Anti-Patterns

- Deploying CRS straight to block mode without log-only baseline → mass false positives, on-call paged
- Whitelist by IP for everything → easy lateral attack from one compromised office
- Treating bot management as on/off → spectrum needed, score-based
- Skipping logging → cannot tune, cannot audit
- Never reviewing exclusions → exclusion list grows forever, security degrades
- WAF on edge but origin reachable directly → attacker bypasses with origin IP
- WAF latency added but cache-miss tickets ignored → WAF turning into bottleneck
