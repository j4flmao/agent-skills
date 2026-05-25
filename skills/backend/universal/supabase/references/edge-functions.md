# Edge Functions

## Overview
Supabase Edge Functions — Deno-based serverless functions, triggers, deployment, secrets, CORS, webhooks, warm starts, and monitoring.

## Setup & Structure

```
supabase/
├── functions/
│   ├── hello-world/
│   │   └── index.ts
│   ├── webhook-stripe/
│   │   └── index.ts
│   └── send-email/
│       └── index.ts
└── config.toml
```

```bash
# Create new function
supabase functions new hello-world

# Serve locally
supabase functions serve hello-world --env-file .env.local

# Deploy
supabase functions deploy hello-world
supabase functions deploy hello-world --project-ref <ref>

# List functions
supabase functions list

# Delete function
supabase functions delete hello-world
```

```typescript
// supabase/functions/hello-world/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

console.log('Hello from Edge Function!');  // Runs once at cold start

serve(async (req) => {
  const { name } = await req.json().catch(() => ({ name: 'World' }));

  return new Response(
    JSON.stringify({ message: `Hello ${name}!` }),
    { headers: { 'Content-Type': 'application/json' } }
  );
});
```

## Request & Response

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
  // Read method and headers
  const method = req.method;
  const authHeader = req.headers.get('Authorization');

  // Parse body
  const body = method === 'POST'
    ? await req.json()
    : await req.json().catch(() => ({}));

  // CORS handling
  if (method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  return new Response(JSON.stringify({ success: true, body }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'no-cache',
    },
  });
});
```

## Supabase Client in Edge Functions

```typescript
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    {
      global: {
        headers: { Authorization: req.headers.get('Authorization')! },
      },
    }
  );

  // Auth check (if --no-verify-jwt flag is NOT set, JWT is auto-verified)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  // Query with RLS enforced (using user's JWT)
  const { data: posts } = await supabase
    .from('posts')
    .select('*')
    .limit(10);

  return new Response(JSON.stringify({ user, posts }), {
    headers: { 'Content-Type': 'application/json' },
  });
});
```

## Database Webhooks

```typescript
// Edge Functions can be triggered by database webhooks
// Configure in Supabase Dashboard → Database → Webhooks

// Example: send notification on new comment
// supabase/functions/on-comment/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
  const { type, table, record, old_record } = await req.json();

  if (type === 'INSERT' && table === 'comments') {
    const { author_id, post_id, content } = record;
    // Send push notification, email, etc.
  }

  return new Response('ok', { status: 200 });
});

// Deploy with no JWT verification (since webhooks don't send auth)
// supabase functions deploy on-comment --no-verify-jwt
```

## Secrets & Environment

```bash
# Set secrets
supabase secrets set STRIPE_SECRET_KEY=sk_live_xxx SENDGRID_KEY=SG.xxx

# Set project-specific secrets
supabase secrets set --project-ref <ref> MY_SECRET=value

# List secrets
supabase secrets list

# Unset secrets
supabase secrets unset STRIPE_SECRET_KEY

# Local development
echo "STRIPE_SECRET_KEY=sk_test_xxx" > .env.local
supabase functions serve hello-world --env-file .env.local
```

```typescript
// Access secrets in function
const stripeKey = Deno.env.get('STRIPE_SECRET_KEY')!;
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
```

## Webhook Handlers

```typescript
// supabase/functions/stripe-webhook/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const body = await req.text();

  // Verify Stripe webhook signature
  // const event = stripe.webhooks.constructEvent(body, signature, webhookSecret);

  const event = JSON.parse(body);

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        { auth: { autoRefreshToken: false, persistSession: false } }
      );
      await supabase.from('orders').insert({
        stripe_session_id: session.id,
        customer_email: session.customer_details.email,
        amount_total: session.amount_total,
        status: 'completed',
      });
      break;
    }
  }

  return new Response('ok', { status: 200 });
});
```

## Warm Starts & Performance

```typescript
// Connection pooling — reuse connections
let _supabase: ReturnType<typeof createClient> | null = null;

function getSupabaseClient(req: Request) {
  if (!_supabase) {
    _supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );
  }
  return _supabase;
}

// Global initialization (runs once at cold start, not per request)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')!;

// Heavy imports at top level
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
  // Function body — fast path
});

// Configure minimum instances in config.toml
// [functions.hello-world]
// min_instances = 1  # Keep warm — costs but reduces latency
```

```toml
# supabase/config.toml
[functions]
enabled = true
include = []

[functions.hello-world]

[functions.api]
verify_jwt = false  # Disable JWT verification for public endpoints

[functions.background-worker]
# Resource configuration
memory = 256     # MB (default: 256)
cpu = 0.5        # cores (default: 0.5)
timeout_seconds = 300  # max 900 seconds (15 min)
min_instances = 1
max_instances = 10
```

## Background Tasks & Queues

```typescript
// Long-running tasks (up to 15 min timeout)
// supabase/functions/process-video/index.ts
import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

serve(async (req) => {
  const { videoId } = await req.json();

  // Acknowledge receipt immediately
  const response = new Response(null, { status: 202 });

  // Process in background (bypasses HTTP response wait)
  EdgeRuntime.waitUntil((async () => {
    console.log(`Processing video ${videoId}...`);
    await new Promise(r => setTimeout(r, 60000));  // Simulate work
    console.log(`Video ${videoId} processed`);
    // Update DB, send notification, etc.
  })());

  return response;
});
```

## Monitoring & Logging

```bash
# View logs
supabase functions logs hello-world
supabase functions logs hello-world --limit 100

# Follow logs in real-time
supabase functions logs hello-world --follow

# Filter by severity
supabase functions logs hello-world --filter "error"
```

```typescript
// Use console.log for logging
console.log('Processing request', { method: req.method, path: req.url });
console.error('Failed to process', error);

// These appear in Supabase Dashboard → Edge Functions → Logs
```

## Key Points
- Edge Functions run on Deno — use `https://esm.sh/` or `https://deno.land/x/` for imports.
- `--no-verify-jwt` flag disables auto JWT verification — for webhooks and public endpoints.
- Default timeout: 300 seconds (5 min), max: 900 seconds (15 min).
- Memory: default 256MB, configurable up to 1GB in config.toml.
- Min instances reduce cold starts at additional cost.
- Secrets are encrypted and injected as environment variables.
- Database webhooks trigger edge functions on INSERT/UPDATE/DELETE.
- Use `EdgeRuntime.waitUntil()` for background processing after response is sent.
