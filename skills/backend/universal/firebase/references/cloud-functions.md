# Cloud Functions

## Overview
Firebase Cloud Functions — triggers, deployment, cold start mitigation, memory/config optimization, monitoring, and error handling.

## Trigger Types

```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

// Firestore triggers
export const onPostCreate = functions.firestore
  .document('posts/{postId}')
  .onCreate(async (snap, context) => {
    const post = snap.data();
    await admin.firestore().doc(`users/${post.authorId}`).update({
      postCount: admin.firestore.FieldValue.increment(1),
      lastPostAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

export const onPostUpdate = functions.firestore
  .document('posts/{postId}')
  .onUpdate(async (change, context) => {
    const before = change.before.data();
    const after = change.after.data();
    if (before.published !== after.published && after.published) {
      // Send notifications for newly published posts
    }
  });

export const onPostDelete = functions.firestore
  .document('posts/{postId}')
  .onDelete(async (snap, context) => {
    const post = snap.data();
    // Clean up related data
  });

// Auth triggers
export const onUserCreate = functions.auth
  .user()
  .onCreate(async (user) => {
    await admin.firestore().doc(`users/${user.uid}`).set({
      email: user.email,
      displayName: user.displayName,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });

export const onUserDelete = functions.auth
  .user()
  .onDelete(async (user) => {
    await admin.firestore().doc(`users/${user.uid}`).delete();
  });

// HTTP triggers
export const api = functions.https.onRequest(async (req, res) => {
  // Express app or direct handler
  res.json({ status: 'ok' });
});

// Callable functions (with auth context)
export const createPost = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError('unauthenticated', 'Login required');
  const { title, content } = data;
  const post = await admin.firestore().collection('posts').add({
    title,
    content,
    authorId: context.auth.uid,
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  return { id: post.id };
});

// Storage triggers
export const onFileUpload = functions.storage
  .object()
  .onFinalize(async (object) => {
    const filePath = object.name;
    const contentType = object.contentType;
    // Process uploaded file
  });

// Scheduled functions
export const dailyDigest = functions.pubsub
  .schedule('0 8 * * *')
  .timeZone('UTC')
  .onRun(async () => {
    // Send daily email digest
  });

// Task queue functions
import { onTaskDispatched } from 'firebase-functions/v2/tasks';

export const processVideo = onTaskDispatched(
  { retryConfig: { maxAttempts: 3 }, rateLimits: { maxConcurrentDispatches: 10 } },
  async (req) => {
    const { videoId } = req.data;
    // Process video
  }
);
```

## Deployment & Config

```bash
# Deploy specific functions
firebase deploy --only functions:onPostCreate,functions:api

# Deploy all functions
firebase deploy --only functions

# Set environment variables
firebase functions:config:set stripe.key="sk_live_xxx" sendgrid.key="SG.xxx"
firebase functions:config:get > .runtimeconfig.json

# View logs
firebase functions:log --only onPostCreate
firebase functions:log --filter "ERROR"
```

```typescript
// Access configuration
const stripeKey = functions.config().stripe.key;

// Retry on failure
export const retryableFunction = functions.firestore
  .document('orders/{orderId}')
  .onCreate(async (snap, context) => {
    // If this throws, function automatically retries (up to configured attempts)
    throw new functions.https.HttpsError('internal', 'Temporary failure');
  }, { retry: true });
```

## Cold Start Mitigation

```typescript
// Option 1: Set minInstances (keeps N instances warm — costs money)
export const api = functions.https.onRequest(
  {
    minInstances: 1, // Keep at least 1 instance always running
    maxInstances: 10,
  },
  async (req, res) => {
    res.json({ status: 'ok' });
  }
);

// Option 2: Keep dependencies outside function handler
import { admin } from './shared/init'; // Initialized once at cold start
import { expensiveModule } from './shared/utils'; // Loaded once

export const handler = functions.https.onCall(async (data, context) => {
  // admin and expensiveModule are already initialized
});

// Option 3: Use 2nd gen functions (better cold start)
// 2nd gen uses Cloud Run infrastructure — faster cold starts
export const apiV2 = functionsv2.https.onRequest(
  {
    minInstances: 0,
    concurrency: 80,
    cpu: 1,
    memory: '512MiB',
  },
  async (req, res) => {
    res.json({ status: 'ok' });
  }
);
```

## Memory & Timeout

```typescript
// Memory options: 128MB (default), 256MB, 512MB, 1GB, 2GB, 4GB, 8GB
// Timeout options: 1-540 seconds (9 minutes) for 1st gen, up to 60 min for 2nd gen

export const heavyProcessing = functions.https.onCall(
  { memory: '1GB', timeoutSeconds: 300 },
  async (data, context) => {
    // CPU/memory intensive work
    return { result: 'done' };
  }
);

export const lightweightTrigger = functions.firestore
  .document('logs/{logId}')
  .onCreate(async (snap, context) => {
    // Minimal work — 128MB is sufficient
  }, { memory: '128MB', timeoutSeconds: 60 });
```

## Error Handling & Monitoring

```typescript
// Callable function error handling
export const safeFunction = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError(
      'unauthenticated',
      'The function must be called while authenticated.'
    );
  }

  if (!data.title || typeof data.title !== 'string') {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The function requires a title string.'
    );
  }

  try {
    const result = await doRiskyOperation(data);
    return result;
  } catch (error) {
    functions.logger.error('Operation failed', { error, data });
    throw new functions.https.HttpsError(
      'internal',
      'An internal error occurred. Please contact support.',
    );
  }
});

// Structured logging
functions.logger.info('Processing post', {
  postId: context.params.postId,
  authorId: post.authorId,
});

// Error reporting (automatic with Google Cloud Error Reporting)
// Monitor in Firebase Console → Functions → Logs
// Set up alerts: Cloud Monitoring → Alerting → Create alert
```

## Key Points
- 1st gen functions: max 9 min timeout, 2nd gen: up to 60 min.
- `minInstances` eliminates cold start but incurs cost — use only for latency-sensitive endpoints.
- Function ID must be unique across the project — use descriptive names.
- Environment variables via `functions.config()` are read-only at runtime.
- Callable functions auto-deserialize errors on client for `HttpsError`.
- Maximum function size: 100MB (compiled source + node_modules).
- For heavy dependencies, use 2nd gen functions with larger memory and concurrency.
- Task queue functions for long-running, retry-eligible workloads (video processing, bulk emails).
