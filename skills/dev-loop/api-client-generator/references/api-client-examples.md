# API Client Examples

## curl
```bash
# Simple GET
curl -sS https://api.example.com/users

# POST with bearer auth
curl -sS -X POST https://api.example.com/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"name":"Alice","email":"alice@example.com"}'

# GET with query params
curl -sS "https://api.example.com/users?role=admin&page=1&limit=20"

# File upload
curl -sS -X POST https://api.example.com/upload \
  -F "file=@/path/to/document.pdf" \
  -H "Authorization: Bearer $TOKEN"
```

## httpie
```bash
# Simple GET
http GET https://api.example.com/users

# POST with auth
http POST https://api.example.com/users \
  Authorization:"Bearer $TOKEN" \
  name=Alice email=alice@example.com
```

## fetch (JS)
```js
const res = await fetch('https://api.example.com/users', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ name: 'Alice' })
});
if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
const data = await res.json();
```

## axios (TS)
```ts
import axios from 'axios';
const { data } = await axios.post<User>(
  'https://api.example.com/users',
  { name: 'Alice' },
  { headers: { Authorization: `Bearer ${token}` } }
);
```

## Python requests
```python
import requests
resp = requests.post(
    'https://api.example.com/users',
    json={'name': 'Alice'},
    headers={'Authorization': f'Bearer {token}'}
)
resp.raise_for_status()
data = resp.json()
```
