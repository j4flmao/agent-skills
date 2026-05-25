# CSP Implementation

## Content Security Policy Directives

| Directive | Controls | Example |
|-----------|----------|---------|
| `default-src` | Fallback for all resource types | `'self'` |
| `script-src` | Script sources | `'self' 'nonce-{random}'` |
| `style-src` | Stylesheet sources | `'self' 'unsafe-inline'` |
| `img-src` | Image sources | `'self' data: https:` |
| `font-src` | Font sources | `'self' https://fonts.gstatic.com` |
| `connect-src` | Fetch/API/XHR/WS targets | `'self' https://api.example.com` |
| `frame-src` | iframe sources | `'self' https://player.vimeo.com` |
| `object-src` | `<object>`, `<embed>`, `<applet>` | `'none'` |
| `media-src` | `<audio>`, `<video>` | `'self'` |
| `base-uri` | `<base>` tag targets | `'none'` |
| `form-action` | Form submission targets | `'self'` |
| `frame-ancestors` | Who can embed the page | `'none'` |
| `worker-src` | Web Worker sources | `'self'` |
| `manifest-src` | Manifest sources | `'self'` |

## Strict CSP (Recommended)

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{random}' 'strict-dynamic';
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: https:;
  font-src 'self' data:;
  connect-src 'self' https://api.example.com;
  object-src 'none';
  base-uri 'none';
  form-action 'self';
  frame-ancestors 'none';
```

## Nonce Generation

```typescript
// Server-side: generate unique nonce per request
import crypto from 'node:crypto'

function generateNonce(): string {
  return crypto.randomBytes(16).toString('base64')
}

// Middleware pattern
app.use((req, res, next) => {
  res.locals.nonce = generateNonce()

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${res.locals.nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `object-src 'none'`,
    `base-uri 'none'`,
  ].join('; ')

  res.setHeader('Content-Security-Policy', csp)
  next()
})
```

## Nonce in HTML

```html
<!-- Attach nonce to inline scripts -->
<script nonce="{nonce}" src="/app.js"></script>
<script nonce="{nonce}">
  // inline script runs because nonce matches CSP
  window.INITIAL_DATA = { /* ... */ }
</script>
```

## Hash-Based CSP (Alternative to Nonce)

```typescript
// Generate SHA hash of a script/content for CSP
import crypto from 'node:crypto'

function getScriptHash(content: string): string {
  const hash = crypto.createHash('sha256').update(content).digest('base64')
  return `'sha256-${hash}'`
}

// CSP with hashes
// script-src 'self' 'sha256-abc123...' 'sha256-def456...'
```

## CSP Reporting

```http
# Report-only mode (test without blocking)
Content-Security-Policy-Report-Only:
  default-src 'self';
  script-src 'self';
  report-uri /csp-violation;

# Enforcement + reporting
Content-Security-Policy:
  default-src 'self';
  report-uri /csp-violation;
```

```typescript
// CSP violation report endpoint
app.post('/csp-violation', (req, res) => {
  const report = req.body['csp-report'] || req.body

  console.warn('CSP Violation:', {
    blockedURI: report['blocked-uri'],
    violatedDirective: report['violated-directive'],
    documentURI: report['document-uri'],
    sourceFile: report['source-file'],
    lineNumber: report['line-number'],
  })

  // Store in monitoring system
  logToMonitoring('csp-violation', report)

  res.status(204).end()
})
```

## CSP for Different Frameworks

```typescript
// Next.js middleware.ts
import { NextResponse } from 'next/server'

export function middleware(req: Request) {
  const nonce = crypto.randomBytes(16).toString('base64')
  const csp = `default-src 'self'; script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`

  const response = NextResponse.next()
  response.headers.set('Content-Security-Policy', csp)
  response.headers.set('x-nonce', nonce)  // pass to components
  return response
}

// Vite: set CSP in HTML via transform
export default defineConfig({
  plugins: [{
    name: 'csp',
    transformIndexHtml: {
      order: 'post',
      handler(html) {
        const nonce = crypto.randomBytes(16).toString('base64')
        return html
          .replace(/\<script/g, `<script nonce="${nonce}"`)
          .replace('</head>', `<meta http-equiv="Content-Security-Policy" content="script-src 'self' 'nonce-${nonce}'">\n</head>`)
      },
    },
  }],
})
```

## CSP Directives for Third-Party

| Service | Required CSP Directive |
|---------|----------------------|
| Google Analytics | `script-src https://www.google-analytics.com; connect-src https://www.google-analytics.com` |
| Google Fonts | `style-src https://fonts.googleapis.com; font-src https://fonts.gstatic.com` |
| Stripe | `script-src https://js.stripe.com; frame-src https://js.stripe.com` |
| Sentry | `connect-src https://o*.ingest.sentry.io` |
| Vimeo/YouTube | `frame-src https://player.vimeo.com https://www.youtube.com` |
| Cloudinary/Imgix | `img-src https://*.cloudinary.com https://*.imgix.net` |
| Hotjar | `script-src https://static.hotjar.com; connect-src https://*.hotjar.com` |

## CSP Implementation Checklist

- [ ] Start with `Content-Security-Policy-Report-Only` to discover violations
- [ ] Collect violation reports for 1-2 weeks before enforcing
- [ ] Use strict CSP (`nonce` + `strict-dynamic`) instead of whitelist
- [ ] Review and approve all third-party script sources
- [ ] Set `object-src 'none'` and `base-uri 'none'`
- [ ] Set `frame-ancestors 'none'` unless embedding needed
- [ ] Set `form-action 'self'` to limit form submissions
- [ ] Block `'unsafe-inline'` for scripts (use nonce instead)
- [ ] Block `'unsafe-eval'` unless required by framework
- [ ] Monitor violation reports in production
