# htmx Deployment

## CDN Delivery

```html
<!-- Production — pin exact version -->
<script src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.3/dist/htmx.min.js"></script>

<!-- With integrity hash -->
<script src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.3/dist/htmx.min.js"
        integrity="sha384-xxxxx"
        crossorigin="anonymous"></script>

<!-- Extensions -->
<script src="https://cdn.jsdelivr.net/npm/htmx.org@2.0.3/dist/ext/json-enc.js"></script>
```

## NPM + Bundler

```bash
npm install htmx.org
```

```js
// app.js
import htmx from 'htmx.org'
import 'htmx.org/dist/ext/json-enc'

// htmx is now available globally
```

```js
// vite.config.js
import { defineConfig } from 'vite'
export default defineConfig({
  build: {
    rollupOptions: { output: { manualChunks: { htmx: ['htmx.org'] } } },
  },
})
```

## Backend Integration

### Django

```python
# settings.py
INSTALLED_APPS = ['django_htmx']
MIDDLEWARE = ['django_htmx.middleware.HtmxMiddleware']

# views.py
def contact_list(request):
    if request.htmx:
        return render(request, 'contacts/_list.html', {'contacts': contacts})
    return render(request, 'contacts/index.html')
```

### Laravel

```php
// In Blade template
@if ($_SERVER['HTTP_HX_REQUEST'] ?? false)
  @include('contacts._list')
@else
  @extends('layouts.app')
  @section('content')
    @include('contacts._list')
  @endsection
@endif
```

### Go

```go
func ContactList(w http.ResponseWriter, r *http.Request) {
    if r.Header.Get("HX-Request") == "true" {
        tmpl.ExecuteTemplate(w, "contact-list", data)
        return
    }
    tmpl.ExecuteTemplate(w, "base", data)
}
```

### Node/Express

```js
app.get('/contacts', (req, res) => {
  if (req.headers['hx-request']) {
    return res.render('contacts/_list', { contacts })
  }
  res.render('contacts/index', { contacts })
})
```

## Security Headers

```nginx
# nginx
add_header X-Frame-Options "SAMEORIGIN" always;
add_header Content-Security-Policy "default-src 'self'; script-src 'self' cdn.jsdelivr.net" always;
```

## Performance Targets

| Metric | Target |
|--------|--------|
| htmx bundle | ~10kB min+gz |
| First paint | <1s |
| AJAX responses | <200ms |
| Swap time | <50ms |

## Caching Strategy

```html
<meta http-equiv="Cache-Control" content="no-cache, no-store, must-revalidate">
```

Server-side: Use ETag or Last-Modified headers for htmx-fetched fragments.

## Deployment Checklist

- [ ] htmx version pinned in package.json or CDN URL
- [ ] Backend detects HX-Request header for partial vs full responses
- [ ] CSRF tokens included in htmx requests (hx-headers)
- [ ] CSP allows inline event handlers if not using hx-on
- [ ] Extensions included and match htmx version
- [ ] [x-cloak] equivalent for htmx-indicator elements
- [ ] Custom event handlers use htmx: prefixed events
- [ ] HATEOAS: all server responses include available actions
- [ ] Error responses return appropriate HTML fragments (not JSON)
