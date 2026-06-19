---
name: firebase
description: >
  Use this skill when working with Firebase platform — Firestore, Authentication, Cloud Storage, Cloud Functions, Hosting, Security Rules, Firebase Admin SDK, Firebase Extensions.
  This skill enforces: proper security rules, Firestore data modeling (no nesting >3), auth provider configuration, function cold start mitigation, cost-aware query design.
  Do NOT use for: Supabase, AWS Amplify, custom backend, general PostgreSQL/NoSQL database design.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
compatibility:
  claude-code: true
  cursor: true
  codex: true
  windsurf: true
tags: [backend, universal, firebase, baas, phase-4]
---

# Firebase

## Purpose
Architect serverless backends on Firebase — Firestore document modeling, Authentication providers, Cloud Functions triggers, Storage security, Hosting configuration, and operational best practices.

## Agent Protocol

### Trigger
User request includes: `Firebase`, `Firestore`, `Firebase Auth`, `Cloud Functions`, `Firebase Storage`, `Firebase Hosting`, `security rules`, `Firebase Admin`, `Firebase Extensions`, `Firebase App Check`, `Firebase Remote Config`, `Firebase emulator`, `Firebase cost`.

### Input Context
- All Firebase capabilities needed (DB, auth, storage, functions, hosting)
- Target platforms (web, iOS, Android, Node.js admin)
- Estimated user/request scale
- Auth providers (email, Google, Apple, custom)

### Output Artifact
Firebase project architecture, security rules, data model, function triggers, hosting config.

### Response Format
Produce artifact directly. No preamble, no postamble, no explanations. No filler, no hedging, no transitions. Strip articles a/an/the where unambiguous. Compress output — why use many token when few do trick.

### Completion Criteria
- Firestore data model designed (collections, documents, indexes, subcollections)
- Security rules defined (read/write/validate per collection)
- Auth providers configured (web + mobile SDK setup)
- Cloud Functions triggers mapped (onCreate, onUpdate, onDelete, onRequest, scheduled)
- Storage security rules + Hosting config (rewrites, headers, redirects)
- Cost optimization plan (read/write counts, indexes, function timeout/memory)

### Max Response Length
4096 tokens

## Decision Tree

### Firestore vs Realtime Database?

```
What data access pattern do you need?
  ├── Complex queries, filtering, sorting, transactions
  │   └── Firestore — rich querying, multi-collection, auto-scaling
  ├── Low-latency real-time sync, simple key-value data
  │   └── Realtime Database — lower latency, simpler pricing (bandwidth), WebSocket-native
  └── I need both
      └── Use Firestore for structured data, RTDB for presence/live cursors
```

### Data Model: Subcollection vs Top-Level?

```
How does this data relate and grow?
  ├── 1:few relationship (<100 items, bounded), always accessed together
  │   └── Subcollection — query within parent document context
  ├── 1:many relationship (unbounded), independent queries needed
  │   └── Top-level collection — separate queries, no parent dependency
  └── Many:many or cross-collection needs
      └── Top-level collection + composite indexes
```

### Cloud Function Trigger Location?

```
Where in the data lifecycle?
  ├── After document write → onCreate, onUpdate, onDelete
  ├── On HTTP request → onRequest (Express-style handler)
  ├── On schedule → pubsub.schedule (cron-like)
  ├── On auth event → functions.auth.user().onCreate
  └── On storage event → functions.storage.object().onFinalize
```

## Workflow

### Step 1: Project Setup
```bash
npm install firebase firebase-admin
npm install -g firebase-tools

firebase login
firebase init
# Select: Firestore, Functions, Storage, Hosting, Emulators
```

```typescript
// src/lib/firebase.ts (client SDK)
import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { getStorage } from 'firebase/storage';

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);

// Admin SDK (server-side)
import { initializeApp as initializeAdmin, cert } from 'firebase-admin/app';
import { getFirestore as getAdminFirestore } from 'firebase-admin/firestore';
import { getAuth as getAdminAuth } from 'firebase-admin/auth';

const adminApp = initializeAdmin({ credential: cert(serviceAccount) });
export const adminDb = getAdminFirestore(adminApp);
export const adminAuth = getAdminAuth(adminApp);
```

### Step 2: Firestore Data Modeling
```
Collection: users/{userId}
  name, email, avatar, createdAt, role

Collection: posts/{postId}
  title, content, authorId, tags[], published, likeCount, createdAt
  Subcollection: comments/{commentId}
    authorId, content, createdAt

Collection: tags/{tagId}
  name, postCount
```

### Step 3: Security Rules
```
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    function isAuth() { return request.auth != null; }
    function isOwner(userId) { return request.auth.uid == userId; }
    function isAdmin() { return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin'; }

    match /users/{userId} {
      allow read: if true;
      allow write: if isOwner(userId) || isAdmin();
      allow create: if isAuth() && request.resource.data.email is string;
    }

    match /posts/{postId} {
      allow read: if true;
      allow create: if isAuth() && request.resource.data.authorId == request.auth.uid;
      allow update, delete: if isOwner(resource.data.authorId) || isAdmin();
    }

    match /posts/{postId}/comments/{commentId} {
      allow read: if true;
      allow write: if isAuth();
    }
  }
}

service firebase.storage {
  match /b/{bucket}/o {
    match /users/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth.uid == userId;
    }
  }
}
```

### Step 4: Cloud Functions
```typescript
import * as functions from 'firebase-functions';
import * as admin from 'firebase-admin';

admin.initializeApp();

export const onPostCreate = functions.firestore
  .document('posts/{postId}')
  .onCreate(async (snap, context) => {
    const post = snap.data();
    await admin.firestore().doc(`users/${post.authorId}`).update({
      postCount: admin.firestore.FieldValue.increment(1),
    });
  });

export const scheduledCleanup = functions.pubsub
  .schedule('every 24 hours')
  .onRun(async () => {
    const old = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    const snaps = await admin.firestore()
      .collection('posts')
      .where('createdAt', '<', old)
      .where('published', '==', false)
      .get();
    const batch = admin.firestore().batch();
    snaps.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
  });
```

### Step 5: Authentication
```typescript
// Email/password sign up
import { createUserWithEmailAndPassword } from 'firebase/auth';
await createUserWithEmailAndPassword(auth, email, password);

// Google sign in
import { GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
const provider = new GoogleAuthProvider();
await signInWithPopup(auth, provider);

// Custom claims (Admin SDK)
await adminAuth.setCustomUserClaims(uid, { role: 'admin' });

// Verify ID token
const decoded = await adminAuth.verifyIdToken(idToken);
if (decoded.role === 'admin') { /* allow */ }
```

### Step 6: Firestore Query Patterns

```typescript
// Efficient queries — always use existing indexes
const posts = await adminDb
  .collection('posts')
  .where('published', '==', true)
  .where('tags', 'array-contains', 'javascript')
  .orderBy('createdAt', 'desc')
  .limit(20)
  .get();

// Pagination with cursors
const firstPage = await adminDb
  .collection('posts')
  .orderBy('createdAt', 'desc')
  .limit(10)
  .get();

const lastVisible = firstPage.docs[firstPage.docs.length - 1];
const secondPage = await adminDb
  .collection('posts')
  .orderBy('createdAt', 'desc')
  .startAfter(lastVisible)
  .limit(10)
  .get();

// Aggregation (use counters, don't count docs)
async function updatePostCount(userId: string, delta: number) {
  await adminDb.runTransaction(async (tx) => {
    const ref = adminDb.doc(`counters/${userId}`);
    const snap = await tx.get(ref);
    const current = snap.data()?.postCount ?? 0;
    tx.set(ref, { postCount: current + delta }, { merge: true });
  });
}
```

### Step 7: Batched Writes and Transactions

```typescript
// Batched write (atomic, up to 500 operations)
async function createPostWithTags(post: Post, tagIds: string[]) {
  const batch = adminDb.batch();
  const postRef = adminDb.collection('posts').doc();
  batch.set(postRef, { ...post, createdAt: admin.firestore.FieldValue.serverTimestamp() });

  for (const tagId of tagIds) {
    const tagRef = adminDb.doc(`tags/${tagId}`);
    batch.update(tagRef, { postCount: admin.firestore.FieldValue.increment(1) });
  }

  await batch.commit();
}

// Transaction (read-then-write, strong consistency)
async function transferPoints(fromId: string, toId: string, amount: number) {
  await adminDb.runTransaction(async (tx) => {
    const fromRef = adminDb.doc(`users/${fromId}`);
    const toRef = adminDb.doc(`users/${toId}`);
    const fromSnap = await tx.get(fromRef);
    const toSnap = await tx.get(toRef);

    if (fromSnap.data()!.points < amount) {
      throw new Error('Insufficient points');
    }

    tx.update(fromRef, { points: admin.firestore.FieldValue.increment(-amount) });
    tx.update(toRef, { points: admin.firestore.FieldValue.increment(amount) });
  });
}
```

### Step 8: Cost Optimization

| Strategy | Impact | Implementation |
|----------|--------|---------------|
| Limit document reads | 90% cost reduction | Paginate, cache, avoid listing all docs |
| Use collection group queries instead of subcollection per doc | Avoid per-doc reads | @firebase/ Firestore collection group indexes |
| Denormalize frequently-read data | Fewer reads | Store user displayName directly in post documents |
| Avoid listening to large collections | Unbounded reads | Always filter with where() clauses |
| Use Firestore bundle for static data | Zero reads for cached data | Generate bundles on schedule, deploy to CDN |
| Shard hot documents at >1 write/s | Avoid contention | Add random suffix to document IDs |
| Set TTL policies | Auto-delete old data | Firestore TTL policy on collections |

### Step 9: Firebase Extensions

Use built-in extensions to reduce custom code:
- **Resize Images**: auto-resize on storage upload
- **Translate Text**: auto-translate Firestore fields using Cloud Translation
- **Trigger Email**: send emails from Firestore writes
- **Delete User Data**: cascade delete when auth user is removed
- **Firestore Stripe Subscriptions**: manage subscriptions via Firestore writes

## Production Considerations

| Concern | Practice |
|---------|----------|
| Firestore max 1 write/s per doc | Use distributed counters for hot documents |
| Cold start for Functions | Set minInstances for latency-sensitive endpoints. Budget impact: cost per idle instance |
| Function timeouts | Set timeout: 60s for HTTP, 540s for event-driven. Increase for heavy processing |
| Memory allocation | 256MB for light triggers, 1GB+ for image processing, 2GB+ for ML/model loading |
| Emulator suite | Run locally for development. Never develop against production |
| Point-in-time recovery | Enable PITR (7d) for production projects. Additional cost |
| App Check | Enable to block unauthorized client requests. Supports reCAPTCHA, App Attest, SafetyNet |
| Secret management | Store service account JSON in Secret Manager, never in repo |

## Security

| Risk | Mitigation |
|------|-----------|
| Unsecured Firestore | Validate security rules with Firebase emulator. Deploy rules before app |
| Over-permissive read rules | Always scope reads with auth checks. Don't allow `read: if true` for private data |
| Client-side validation bypass | Security rules validate every request independently |
| Function endpoint abuse | Callable functions verify auth automatically. HTTP functions must validate |
| Storage public access | Use signed URLs with expiry for private files. Block public by default |
| API key exposure | Firebase API keys are public-by-design. Use App Check for additional security |

## Anti-Patterns

| Anti-Pattern | Why It's Bad | Fix |
|-------------|-------------|-----|
| Deeply nested data >20 levels | Cannot query, hard to secure | Use subcollections or top-level collections |
| Counting documents with get() | O(N) reads, expensive | Use distributed counter or maintained count field |
| Listening to entire collection | Unbounded reads and updates | Always use where() filters |
| Reading document in security rule for every access | 1 extra read per access | Use custom claims for role info |
| Functions without error handling | Silent failures, debugging nightmare | Always wrap in try/catch, log errors |
| Huge batched writes (>500 ops) | Batch limit is 500 operations | Split into multiple batches or use more targeted updates |
| Storing arrays for data that grows | Cannot atomically modify large arrays | Use subcollection or map with keys |
| Over-indexing | Each index adds write cost | Only create indexes for actual queries |

## Rules
- Firestore: max 1 write per second on a document — use aggregations for counters.
- Use subcollections instead of nested objects when data grows unbounded.
- Security rules evaluate on every read/write — limit get() calls within rules.
- Cloud Functions: set memory/timeout based on workload — 256MB for light triggers, 1GB+ for heavy processing.
- Firebase Pricing: Firestore charges per read/write/delete — index writes count as 1 write + 1 per index.
- Use Firebase App Check to block unauthorized client requests.
- Enable Firestore PITR (point-in-time recovery) for production.
- Functions: use `minInstances` for latency-sensitive endpoints (cost trade-off).
- Store service account JSON outside the repo — use secret manager.
- Every Firebase SDK call from client must be scoped by security rules.
- Denormalize for read performance — data duplication is acceptable in Firestore.
- Always use emulator for development. Never point a client SDK at production Firestore during development.

## Implementation Patterns

### Firestore Repository

```typescript
import { Firestore, CollectionReference, DocumentData, Query } from 'firebase/firestore';

interface Entity {
  id?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

class FirestoreRepository<T extends Entity> {
  constructor(
    private firestore: Firestore,
    private collectionPath: string
  ) {}

  get collection(): CollectionReference<T> {
    return this.firestore.collection(this.collectionPath) as CollectionReference<T>;
  }

  async create(data: Omit<T, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const docRef = await this.collection.add({
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any);
    return docRef.id;
  }

  async get(id: string): Promise<T | null> {
    const doc = await this.collection.doc(id).get();
    return doc.exists ? { id: doc.id, ...doc.data() } as T : null;
  }

  async update(id: string, data: Partial<Omit<T, 'id'>>): Promise<void> {
    await this.collection.doc(id).update({
      ...data,
      updatedAt: new Date(),
    } as any);
  }

  async delete(id: string): Promise<void> {
    await this.collection.doc(id).delete();
  }

  async query(queries: ((ref: CollectionReference) => Query)[]): Promise<T[]> {
    let q: Query = this.collection;
    for (const queryFn of queries) {
      q = queryFn(this.collection);
    }
    const snapshot = await q.get();
    return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }) as T);
  }
}
```

## Architecture Decision Trees

### Firebase When to Use

```
Should you use Firebase?
├── Small to medium app (< 100K users)
│   ├── Need real-time sync → Firestore
│   ├── Need auth → Firebase Auth (social providers, email)
│   └── Need file storage → Firebase Storage
│
├── MVP / Prototype
│   └── Firebase = fastest time to ship
│
├── Complex queries, joins, aggregations
│   └── Consider a relational DB (Firestore limits queries)
│
└── Heavy server-side processing
    └── Cloud Functions + Firebase or use a backend framework
```

## Anti-Patterns

| Anti-Pattern | Why It Fails | Correct Approach |
|---|---|---|
| Deeply nested collections (>3 levels) | Slow queries, high read cost | Shallow collections with references |
| Missing composite indexes | Queries fail with vague errors | Create indexes when query requires them |
| Storing arrays for growing data | Can't atomically modify large arrays | Use subcollections or maps |
| Not using emulators | Costs accumulate, slow iteration | Firestore emulator for development |
| Functions without error handling | Silent failures | Always wrap in try/catch, log errors |
| Over-indexing | Each index adds write cost | Only index for actual queries |

## Performance Optimization

- **Batch reads in parallel**: Use `getAll()` to fetch multiple documents in one batch. Reduces latency from N sequential reads to 1 parallel batch.
- **Data denormalization for read performance**: Duplicate data across documents to avoid joins. Accept data duplication — Firestore charges per read, not per storage.
