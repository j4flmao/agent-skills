# Firestore Database

## Overview
Cloud Firestore data modeling, queries, indexes, real-time listeners, offline persistence, security rules, and cost optimization.

## Data Model

```
Collection: users/{userId}
  ├── name: string
  ├── email: string
  ├── avatar: string (URL)
  ├── role: string (user | admin)
  ├── createdAt: timestamp
  ├── postCount: number (aggregated counter)
  └── Subcollection: notifications/{notificationId}
       ├── type: string
       ├── message: string
       ├── read: boolean
       └── createdAt: timestamp

Collection: posts/{postId}
  ├── title: string
  ├── content: string
  ├── authorId: reference (users)
  ├── tags: array<string>
  ├── published: boolean
  ├── likeCount: number
  ├── createdAt: timestamp
  ├── updatedAt: timestamp
  └── Subcollection: comments/{commentId}
       ├── authorId: reference (users)
       ├── content: string
       └── createdAt: timestamp

Collection: tags/{tagId}
  ├── name: string
  └── postCount: number
```

## Document Structure Guidelines

```
/ Do NOT use deeply nested objects (max 3 levels):
users/{id}: { profile: { address: { city: { name: "NYC" } } } }

/ DO use flat documents:
users/{id}: { city: "NYC" }

/ DO use subcollections for arrays that grow unbounded:
users/{id}/notifications/{nid}  ✓
users: { notifications: [...] } ✗ (array grows, 1MB doc limit)
```

## Queries

```typescript
import { collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  query, where, orderBy, limit, startAfter, onSnapshot, setDoc, Timestamp,
  increment, arrayUnion, arrayRemove, serverTimestamp } from 'firebase/firestore';

// Single document read
const userSnap = await getDoc(doc(db, 'users', userId));
if (userSnap.exists()) {
  const user = userSnap.data();
}

// Query with filters
const q = query(
  collection(db, 'posts'),
  where('published', '==', true),
  where('tags', 'array-contains', 'javascript'),
  orderBy('createdAt', 'desc'),
  limit(20)
);
const snapshot = await getDocs(q);

// Cursor pagination
const firstPage = await getDocs(query(
  collection(db, 'posts'),
  where('published', '==', true),
  orderBy('createdAt', 'desc'),
  limit(20)
));
const lastVisible = firstPage.docs[firstPage.docs.length - 1];

const secondPage = await getDocs(query(
  collection(db, 'posts'),
  where('published', '==', true),
  orderBy('createdAt', 'desc'),
  startAfter(lastVisible),
  limit(20)
));

// Compound queries (require composite index)
const filtered = query(
  collection(db, 'posts'),
  where('authorId', '==', userId),
  where('published', '==', true),
  orderBy('createdAt', 'desc')
);

// Real-time listener
const unsubscribe = onSnapshot(doc(db, 'users', userId), (doc) => {
  if (doc.exists()) {
    console.log('User updated:', doc.data());
  }
});
// Clean up listener
unsubscribe();

// Batch writes (max 500 operations)
import { writeBatch } from 'firebase/firestore';
const batch = writeBatch(db);
batch.set(doc(db, 'users', userId), { name: 'Alice' });
batch.update(doc(db, 'users', userId), { lastLogin: serverTimestamp() });
batch.delete(doc(db, 'posts', postId));
await batch.commit();

// Transactions
import { runTransaction } from 'firebase/firestore';
await runTransaction(db, async (transaction) => {
  const postRef = doc(db, 'posts', postId);
  const postDoc = await transaction.get(postRef);
  if (!postDoc.exists()) throw new Error('Post not found');
  transaction.update(postRef, { likeCount: increment(1) });
});
```

## Indexes

```
// Automatic: single-field indexes on all fields
// Composite: must be created explicitly

// Required composite indexes:
// 1. posts: published ASC, createdAt DESC
// 2. posts: authorId ASC, published ASC, createdAt DESC
// 3. posts: tags ARRAY_CONTAINS, published ASC, createdAt DESC

// Create via Firebase Console or CLI:
// firebase firestore:indexes
```

```json
// firestore.indexes.json
{
  "indexes": [
    {
      "collectionGroup": "posts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "published", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "posts",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "authorId", "order": "ASCENDING" },
        { "fieldPath": "published", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    }
  ]
}
```

## Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Helper functions
    function isAuth() { return request.auth != null; }
    function isOwner(userId) { return request.auth.uid == userId; }
    function hasRole(role) {
      return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == role;
    }

    match /users/{userId} {
      allow read: if true;
      allow create: if isAuth() && request.auth.uid == userId;
      allow update: if isOwner(userId) || hasRole('admin');
      allow delete: if hasRole('admin');
      // Validate data
      allow write: if request.resource.data.keys().hasAll(['name', 'email']);
    }

    match /posts/{postId} {
      allow read: if resource.data.published == true || isOwner(resource.data.authorId);
      allow create: if isAuth() && request.resource.data.authorId == request.auth.uid;
      allow update: if isOwner(resource.data.authorId) && resource.data.published == false;
      allow delete: if isOwner(resource.data.authorId) || hasRole('admin');
      // Validate on write
      allow write: if request.resource.data.title is string
        && request.resource.data.title.size() > 0;
    }

    match /posts/{postId}/comments/{commentId} {
      allow read: if true;
      allow create: if isAuth() && request.resource.data.authorId == request.auth.uid;
      allow delete: if isOwner(resource.data.authorId) || hasRole('admin');
    }
  }
}
```

## Offline Persistence

```typescript
import { enableMultiTabIndexedDbPersistence } from 'firebase/firestore';

// Enable offline persistence (web)
enableMultiTabIndexedDbPersistence(db).catch((err) => {
  if (err.code === 'failed-precondition') {
    // Multiple tabs open — persistence can only be enabled in one tab at a time
  } else if (err.code === 'unimplemented') {
    // Browser doesn't support IndexedDB
  }
});

// Mobile SDKs: offline persistence enabled by default on Android/iOS
// FirebaseFirestore.getInstance().setPersistenceEnabled(true);
```

## Cost Optimization

```
Firestore billing:
- Document reads: $0.06/100,000
- Document writes: $0.18/100,000
- Document deletes: $0.02/100,000
- Stored data: $0.108/GB/month
- Network egress: $0.12/GB

Optimization strategies:
1. Use collection group queries instead of per-document reads
2. Cache frequent reads with Firebase Remote Config
3. Aggregate counters (likeCount, postCount) in parent documents
4. Batch writes up to 500 operations
5. Use select() to fetch only needed fields
6. Avoid listening to large collections in real-time — add filters
7. Index writes cost 1 write + 1 write per indexed field value
```

## Key Points
- Firestore is eventually consistent — strong consistency only within a single-document transaction.
- Maximum document size: 1 MiB — store large blobs in Storage, not Firestore.
- Array fields support `array-contains` and `array-contains-any` but NOT ordering.
- IN queries (max 10 values) are equivalent to multiple equality queries.
- Queries require composite indexes for any combination of equality + range + orderBy.
- Security rules `get()` calls count as reads — minimize their use.
- Enable PITR (point-in-time recovery) for production at $0.015/GB/hour for 7 days.
