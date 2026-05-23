# Web Security Headers

## Header Reference Table

| Header | Recommended Value | Protection |
|--------|------------------|------------|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self' 'nonce-{random}' 'strict-dynamic'; object-src 'none'; base-uri 'none'` | XSS, data injection |
| `X-Content-Type-Options` | `nosniff` | MIME type sniffing |
| `X-Frame-Options` | `DENY` | Clickjacking |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains; preload` | MITM, SSL stripping |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Referrer leakage |
| `Permissions-Policy` | `camera=(), microphone=(), geolocation=()` | Feature restriction |

## Express.js Helmet Config

```typescript
import helmet from 'helmet'

app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'strict-dynamic'", "'nonce-{random}'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", 'data:', 'https:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
  })
)
```

## Next.js Headers (next.config.js)

```typescript
const nextConfig = {
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}
```

## Nginx Headers

```nginx
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "DENY" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' 'strict-dynamic';" always;
add_header Strict-Transport-Security "max-age=63072000; includeSubDomains; preload" always;
```

## SRI Hash Generator

```bash
# Generate integrity hash for a CDN resource
openssl dgst -sha384 -binary file.js | openssl base64 -A
# Or use: https://www.srihash.org/
```

## Permissions-Policy Examples

```
# Block everything by default
Permissions-Policy: geolocation=(), camera=(), microphone=()

# Allow only same-origin
Permissions-Policy: geolocation=(self)

# Allow specific origins
Permissions-Policy: geolocation=(self "https://trusted.com")
```
