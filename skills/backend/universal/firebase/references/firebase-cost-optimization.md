# Firebase Cost Optimization

## Overview
Optimize Firebase costs: Firestore read/write reduction, Cloud Functions efficiency, Storage optimization, unused resource cleanup, and budget alerts.

## Firestore Cost Reduction

```typescript
class FirestoreCostOptimizer {
  // Batch reads instead of individual document reads
  async batchGetUsers(userIds: string[]): Promise<User[]> {
    const batches: Promise<DocumentSnapshot>[][] = [];

    // Split into batches of 10 (Firestore limit)
    for (let i = 0; i < userIds.length; i += 10) {
      const batch = userIds.slice(i, i + 10).map(id =>
        adminDb.collection('users').doc(id).get()
      );
      batches.push(Promise.all(batch));
    }

    const results = await Promise.all(batches.map(b => b));
    return results.flatMap(b => b.map(doc => ({ id: doc.id, ...doc.data() } as User)));
  }

  // Use document references instead of full reads
  async getPostWithAuthorRef(postId: string) {
    const post = await adminDb.collection('posts').doc(postId).get();
    const data = post.data()!;
    // Store author reference instead of full author data
    return {
      ...data,
      authorRef: data.authorId, // Client fetches author separately if needed
    };
  }

  // Use aggregations instead of counting documents
  async getPostCount(userId: string): Promise<number> {
    // Use count aggregation (1 read) instead of loading all docs
    const snapshot = await adminDb.collection('posts')
      .where('authorId', '==', userId)
      .count()
      .get();
    return snapshot.data().count;
  }
}
```

## Query Optimization

```typescript
class QueryOptimizer {
  // Avoid collection group queries (expensive)
  // Instead: denormalize parent ID into subcollection documents
  async getCommentsForPost(postId: string, limit = 20) {
    // Good: Direct subcollection query (efficient)
    return adminDb.collection('posts')
      .doc(postId)
      .collection('comments')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
  }

  // Use selective field returns (avoid reading large fields)
  async getUserProfile(userId: string) {
    const userDoc = await adminDb.collection('users').doc(userId).get();
    const data = userDoc.data()!;
    // Return only needed fields
    return {
      name: data.name,
      avatar: data.avatar,
    };
  }
}
```

## Cloud Functions Cost

```typescript
class FunctionsCostOptimizer {
  // Use minimal memory for simple functions
  configureFunctionMemory(): void {
    // 128MB for simple transforms, 256MB for DB ops, 1GB+ for image processing
    // Lower memory = lower cost per invocation
  }

  // Batch Firestore writes in functions
  async batchUpdatePosts(userId: string, updates: Partial<Post>[]): Promise<void> {
    // Instead of multiple individual writes, use batched writes
    const batch = adminDb.batch();
    for (const update of updates) {
      batch.update(adminDb.collection('posts').doc(update.id!), update);
    }
    await batch.commit(); // 1 write cost per document, but fewer function invocations
  }

  // Use scheduled functions for periodic tasks instead of real-time triggers
  scheduleCleanupJob(): void {
    // Instead of onDelete triggers (per-deletion cost), run daily cleanup
    // functions.pubsub.schedule('every 24 hours')
  }
}
```

## Storage Cost Reduction

```typescript
class StorageCostOptimizer {
  async cleanupUnusedFiles(): Promise<CleanupResult> {
    // Find and remove files not referenced in the database
    const storageFiles = await admin.storage().bucket().getFiles();
    const referencedPaths = new Set(
      (await adminDb.collection('posts').get())
        .docs.map(d => d.data().imagePath)
    );

    let removed = 0;
    for (const file of storageFiles[0]) {
      if (!referencedPaths.has(file.name)) {
        await file.delete();
        removed++;
      }
    }

    return { filesRemoved: removed, timestamp: new Date() };
  }

  async archiveOldFiles(daysOld: number): Promise<void> {
    // Move files older than N days to nearline/coldline storage
    const bucket = admin.storage().bucket();
    const [files] = await bucket.getFiles();
    const cutoff = Date.now() - daysOld * 86400000;

    for (const file of files) {
      if (file.metadata.timeCreated && new Date(file.metadata.timeCreated).getTime() < cutoff) {
        await file.move(file.name, {
          destination: bucket.file(`archive/${file.name}`),
          predefinedAcl: 'projectPrivate',
        });
      }
    }
  }
}
```

## Budget Alerts

```typescript
class FirebaseBudgetManager {
  setupBudgetAlerts(): void {
    // Configure budget alerts in Google Cloud Console:
    // 1. Set monthly budget (e.g., $500)
    // 2. Alert thresholds: 50%, 75%, 90%, 100%
    // 3. Notify to Slack/Email
  }

  async trackDailyCosts(): Promise<CostSummary> {
    // Use Cloud Billing API to track daily spend
    const yesterday = new Date(Date.now() - 86400000);
    const costs = await this.getBillingData(yesterday);

    return {
      date: yesterday,
      firestoreReads: costs.firestore.read,
      firestoreWrites: costs.firestore.write,
      firestoreDeletes: costs.firestore.delete,
      functionInvocations: costs.functions.invocations,
      functionComputeTime: costs.functions.computeSeconds,
      storageGB: costs.storage.gbStored,
      totalEstimatedCost: costs.total,
    };
  }

  async detectCostAnomalies(): Promise<AnomalyReport> {
    const today = await this.trackDailyCosts();
    const yesterday = await this.getPreviousDayCosts();

    const anomalies: string[] = [];

    if (today.firestoreReads > yesterday.firestoreReads * 2) {
      anomalies.push(`Firestore reads doubled: ${today.firestoreReads} vs ${yesterday.firestoreReads}`);
    }
    if (today.functionInvocations > yesterday.functionInvocations * 3) {
      anomalies.push(`Function invocations tripled: ${today.functionInvocations} vs ${yesterday.functionInvocations}`);
    }

    return { anomalies, detected: anomalies.length > 0 };
  }
}
```

## Key Points
- Batch Firestore reads/writes where possible (batches of 10 documents)
- Use count aggregations instead of loading entire document collections
- Lower Cloud Functions memory reduces per-invocation cost
- Use scheduled functions instead of real-time triggers for periodic tasks
- Clean up unused storage files not referenced in the database
- Archive old files to nearline/coldline storage tiers
- Set budget alerts at 50%, 75%, 90%, 100% thresholds
- Monitor daily cost anomalies: double reads, triple invocations
