# Frontend Security Reference

## Content Security Policy

```typescript
// Next.js CSP via middleware
export function middleware(request: NextRequest) {
  const nonce = crypto.randomUUID();
  
  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' https: data:`,
    `font-src 'self' data:`,
    `connect-src 'self' https://api.example.com`,
    `frame-ancestors 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
  ].join('; ');

  const response = NextResponse.next();
  response.headers.set('Content-Security-Policy', csp);
  response.headers.set('X-Nonce', nonce);
  return response;
}
```

## XSS Prevention

```typescript
// React — dangerouslySetInnerHTML with sanitization
import DOMPurify from 'dompurify';

function SafeHTML({ html }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href', 'target'],
  });
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}

// Angular — bypass security with sanitization
this.sanitizer.sanitize(SecurityContext.HTML, userContent);

// Vue — v-html with sanitization
import { sanitize } from 'isomorphic-dompurify';
computed: {
  safeHtml() { return sanitize(this.userContent); }
}
```

## Authentication Token Storage

```typescript
// Use httpOnly cookies, not localStorage
// Setting a secure cookie from the server
document.cookie = `access_token=${token}; Secure; HttpOnly; SameSite=Strict; Path=/; Max-Age=900`;

// Fetch with credentials
const response = await fetch('https://api.example.com/orders', {
  credentials: 'include',
  headers: { 'Content-Type': 'application/json' },
});
```

## Form Validation

```typescript
function validateForm(data) {
  const errors = {};
  
  if (!data.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    errors.email = 'Valid email is required';
  }
  
  if (!data.password || data.password.length < 8) {
    errors.password = 'Password must be at least 8 characters';
  }
  
  return Object.keys(errors).length > 0 ? errors : null;
}
```

## Subresource Integrity

```html
<!-- SRI for CDN scripts -->
<script 
  src="https://cdn.example.com/app.js"
  integrity="sha384-abc123def456..."
  crossorigin="anonymous"
></script>

<!-- SRI for stylesheets -->
<link
  rel="stylesheet"
  href="https://cdn.example.com/styles.css"
  integrity="sha384-xyz789..."
  crossorigin="anonymous"
/>
```

## Key Points

- CSP with nonces prevents inline script injection
- DOMPurify sanitizes HTML before rendering
- httpOnly cookies for token storage prevent XSS theft
- Form validation on both client and server
- Subresource Integrity ensures CDN assets are untampered
- Prevent clickjacking with X-Frame-Options: DENY
- Input maxlength attributes prevent buffer overflow
- HTTPS enforced for all API communication
- Obfuscate error messages in production
- Regular dependency audits with npm audit
