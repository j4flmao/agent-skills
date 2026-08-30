# Code & Runtime Optimizations

If Provisioned Concurrency is too expensive, developers must optimize the Init phase.

## Global Scope Caching
Code executed outside the handler runs during the Init phase and is frozen into the MicroVM's memory. When subsequent requests hit the same warm VM, this code is not re-executed.

```javascript
// BAD: Initialized on EVERY invocation (adds latency to warm starts)
exports.handler = async (event) => {
    const db = await connectToDatabase();
    return await db.query("...");
};

// GOOD: Initialized ONLY during cold start. Reused in warm starts.
const dbPromise = connectToDatabase(); 

exports.handler = async (event) => {
    const db = await dbPromise; // Instantly resolves on warm starts
    return await db.query("...");
};
```

## AOT Compilation (GraalVM)
Heavy runtimes like Java (JVM) or .NET (CLR) suffer massive cold starts (2-5 seconds) due to JIT (Just-In-Time) compilation and class loading.
- **Solution**: GraalVM `native-image`. It performs AOT (Ahead-of-Time) compilation, scanning the entire Java application at build time and compiling it directly to an OS-specific executable binary. 
- **Result**: Startup times plummet from 3000ms down to ~50ms, mimicking the performance of Go or Rust binaries.

## Lazy Loading dependencies
If your Lambda function has multiple routes (e.g., using a micro-framework), do not import heavy libraries globally if they are only used in a single, rarely-called route.

```python
def handler(event, context):
    if event['route'] == 'generate-pdf':
        import pdfkit # Lazy load: 500ms cost only incurred if this route is hit
        return pdfkit.generate()
    return {"status": "success"}
```
