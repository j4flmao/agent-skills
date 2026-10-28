# SMS Messaging Fundamentals: Encoding, Segments, Numbers, Sender Types and Delivery

The essential mechanics behind application-to-person (A2P) SMS: how messages are encoded and split into billable segments, phone number formatting, sender types and registration requirements, message lifecycle and delivery receipts, and consent rules. Provider-specific integration is in `sms-providers.md`; OTP flows in `2fa-sms.md`; regulation details in `compliance-analytics.md`.

## Encoding and Segments

SMS payloads are 140 bytes. The characters that fit depend on the encoding:

| Encoding | Used when | Single message | Per segment when concatenated |
|----------|-----------|----------------|-------------------------------|
| GSM-7 (GSM 03.38) | All characters in the GSM basic set (plus extension table) | 160 characters | 153 characters |
| UCS-2 (UTF-16 subset) | Any character outside GSM-7 (emoji, most non-Latin scripts, many accented letters) | 70 characters | 67 characters |

- Concatenated messages carry a User Data Header (UDH) in each segment, which is why per-segment capacity drops.
- GSM-7 extension characters (`^ { } [ ] ~ \ | €` and form feed) take two septets each.
- **One non-GSM character switches the whole message to UCS-2.** Curly quotes (`'` `"`), an en dash, or an emoji in a template can more than double segment count and cost.
- Emoji outside the Basic Multilingual Plane use two UTF-16 code units, counting as two characters in UCS-2.
- Providers bill per segment; carriers may also cap segments (often around 10) per message.

```ts
const GSM7_BASIC = new Set(
  "@£$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞ ÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
);
const GSM7_EXT = new Set("^{}\\[~]|€\f");

export function segmentInfo(text: string): { encoding: "GSM-7" | "UCS-2"; units: number; segments: number } {
  let units = 0;
  let gsm = true;
  for (const ch of text) {
    if (GSM7_BASIC.has(ch)) units += 1;
    else if (GSM7_EXT.has(ch)) units += 2;
    else { gsm = false; break; }
  }
  if (gsm) return { encoding: "GSM-7", units, segments: units <= 160 ? 1 : Math.ceil(units / 153) };
  const ucs2Units = text.length;                     // UTF-16 code units
  return { encoding: "UCS-2", units: ucs2Units, segments: ucs2Units <= 70 ? 1 : Math.ceil(ucs2Units / 67) };
}
```

Run templates through a check like this in CI or in the template editor, and normalize smart punctuation to ASCII where the language allows. (Segment boundaries in practice also avoid splitting a two-septet character or a surrogate pair, so real counts can be marginally higher.)

## Phone Numbers

- Store and send numbers in **E.164**: `+` then country code and subscriber number, up to 15 digits, no spaces (`+14155550123`, `+447700900123`).
- Parse and validate input with libphonenumber (`libphonenumber-js`, `phonenumbers` for Python, `libphonenumber` for Java/Go ports) using the user's region as default.
- Number type matters: many providers can look up line type (mobile, landline, VoIP) and carrier; landlines cannot receive SMS, and some VoIP numbers are associated with higher fraud risk.
- Numbers get reassigned: a number verified years ago may now belong to someone else. Re-verify periodically for sensitive messages; in the US, the FCC Reassigned Numbers Database can be checked before calling or texting.

## Sender Types

| Sender | Format | Throughput | Two-way | Notes |
|--------|--------|------------|---------|-------|
| Long code (10DLC in US) | Local phone number | Moderate; set by registration tier and carrier | Yes | US requires brand and campaign registration with The Campaign Registry |
| Toll-free number | `+1 8XX` (US/Canada) | Moderate to high after verification | Yes | Toll-free verification required before sending A2P traffic in the US/Canada |
| Short code | 5 to 6 digits | Highest | Yes | Leased per country; application and carrier approval take weeks |
| Alphanumeric sender ID | Up to 11 characters (`ACME`) | Varies | No (one-way) | Not supported in the US and Canada; many countries require pre-registration (for example India's DLT system) |

Unregistered A2P traffic in the US is filtered or blocked by carriers. Registration requirements differ per country; check your provider's country guidelines before launching.

## Message Lifecycle and Delivery Receipts

```text
API accepted -> queued (provider) -> sent to carrier/aggregator -> delivered to handset
                                  \-> undelivered / failed (with error code)
```

| Status (typical) | Meaning |
|------------------|---------|
| `queued` / `accepted` | Provider accepted the request |
| `sending` / `sent` | Handed to the downstream carrier |
| `delivered` | Carrier reported delivery to the handset (DLR) |
| `undelivered` | Carrier could not deliver (unreachable, blocked, filtered) |
| `failed` | Provider could not send (invalid number, account issue) |

- Delivery receipts come asynchronously via webhook (status callback) and are carrier-dependent: some networks do not return final receipts, so `sent` may be the last status you see.
- Store the provider message ID with your own message record, and update status from callbacks idempotently (callbacks can arrive more than once or out of order).
- Error codes distinguish permanent failures (invalid or landline number, opted out) from transient ones; do not resend on permanent errors.

## Inbound Messages and Keywords

- Two-way numbers deliver replies to an inbound webhook (sender, recipient number, body).
- Standard opt-out keywords in the US (CTIA guidance) include STOP, STOPALL, UNSUBSCRIBE, CANCEL, END, QUIT; HELP must return program information. Some providers handle these automatically at the number level, but your system must also record the opt-out and stop sending.
- Opt-back-in keywords (START, UNSTOP) re-enable messaging.

## Consent and Content Basics

| Requirement | Practice |
|-------------|----------|
| Consent | Collect explicit opt-in for marketing (and keep records: timestamp, source, wording shown); transactional messages still require a relationship and number ownership |
| Identification | Include the brand name in messages |
| Opt-out | Honor immediately; include opt-out instructions in marketing messages |
| Quiet hours | Avoid marketing at night in the recipient's time zone; some jurisdictions set legal limits |
| Content | No prohibited content (carrier rules restrict categories such as cannabis, certain financial offers); avoid public URL shorteners, which carriers often filter; use branded domains |

US marketing texts fall under the TCPA; other regions apply GDPR/ePrivacy, CASL (Canada) and local telecom rules. Consult legal counsel for your programs.

## Message Design

- Keep within one GSM-7 segment where possible (160 characters).
- Put the essential information first; previews truncate.
- Use a consistent sender per conversation; changing numbers confuses users and looks like spam.
- Links: branded domain, HTTPS, short paths. Never include secrets or full personal data in SMS; messages are not end-to-end encrypted and appear on lock screens.

## Checklist

- [ ] Numbers stored and validated in E.164 with libphonenumber
- [ ] Templates checked for encoding and segment count
- [ ] Sender type chosen per country and registered (10DLC, toll-free verification, short code, sender ID)
- [ ] Provider message IDs stored; status callbacks processed idempotently
- [ ] Opt-in records kept; STOP/HELP handled and enforced in your own data
- [ ] No sensitive data in message bodies
