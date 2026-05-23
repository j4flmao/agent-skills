# Concurrency Patterns

> Real-world async, threading, and parallel patterns in C#.

---

## Core Concurrency Patterns

### 1. Thread Pool

**Intent:** Reuse worker threads, avoiding thread-creation overhead per request.

**Problem:** Creating threads is expensive; unbounded creation causes resource exhaustion.

**Solution:** Maintain a pool of reusable threads. Tasks are queued; idle threads pick them up.

```csharp
ThreadPool.QueueUserWorkItem(static state => Console.WriteLine(state), "item");
Task.Run(() => Thread.Sleep(100));
Parallel.For(0, 100, i => ProcessItem(i));
ThreadPool.SetMinThreads(8, 8);
```

**Trade-offs:** Pro — avoids creation overhead, bounds resource usage. Con — scheduling latency under burst, no fairness guarantee.

---

### 2. Active Object

**Intent:** Decouple method invocation from execution — the caller never blocks.

**Problem:** A thread-safe object serializes access. Invoking directly blocks callers.

**Solution:** Enqueue requests onto a command queue. A scheduler thread executes them. Caller gets a `Task<T>`.

```csharp
public sealed class ActiveObject<TState>
{
    private readonly TState _state;
    private readonly Channel<Func<ValueTask>> _queue =
        Channel.CreateUnbounded<Func<ValueTask>>(new() { SingleReader = true });

    public ActiveObject(TState initial) { _state = initial; Task.Run(Scheduler); }

    public Task<TResult> Submit<TResult>(Func<TState, TResult> fn)
    {
        var tcs = new TaskCompletionSource<TResult>(TaskCreationOptions.RunContinuationsAsynchronously);
        _queue.Writer.TryWrite(() => { try { tcs.TrySetResult(fn(_state)); } catch (Exception e) { tcs.TrySetException(e); } return default; });
        return tcs.Task;
    }

    private async Task Scheduler()
    {
        await foreach (var w in _queue.Reader.ReadAllAsync()) await w();
    }
}
// var ao = new ActiveObject<List<int>>([]); var c = await ao.Submit(l => { l.Add(1); return l.Count; });
```

**Trade-offs:** Pro — no caller blocking, natural serialization. Con — single-threaded throughput cap, extra allocation.

---

### 3. Monitor Object

**Intent:** Ensure one thread executes a method at a time with condition waiting.

**Problem:** Concurrent writes to shared state produce data races.

**Solution:** `lock` (Monitor) with `Wait`/`Pulse` for condition variables.

```csharp
public sealed class BoundedBuffer<T>
{
    private readonly Queue<T> _q = new(capacity);
    private readonly int _cap;

    public BoundedBuffer(int cap) => _cap = cap;
    public void Put(T item) { lock (_q) { while (_q.Count >= _cap) Monitor.Wait(_q); _q.Enqueue(item); Monitor.PulseAll(_q); } }
    public T Take() { lock (_q) { while (_q.Count == 0) Monitor.Wait(_q); var i = _q.Dequeue(); Monitor.PulseAll(_q); return i; } }
}
```

**Trade-offs:** Pro — simple, language-native. Con — coarse lock, deadlock-prone, `PulseAll` thundering-herd.

---

### 4. Read-Write Lock

**Intent:** Allow concurrent reads but exclusive writes.

**Problem:** A `lock` serializes all access. When reads dominate, reader concurrency is wasted.

**Solution:** `ReaderWriterLockSlim` — multiple readers can hold the lock; writers wait for all readers to release.

```csharp
public sealed class ThreadSafeCache<TKey, TValue> where TKey : notnull
{
    private readonly Dictionary<TKey, TValue> _map = new();
    private readonly ReaderWriterLockSlim _rw = new();

    public TValue? Read(TKey key) { _rw.EnterReadLock(); try { return _map.GetValueOrDefault(key); } finally { _rw.ExitReadLock(); } }
    public void Write(TKey key, TValue val) { _rw.EnterWriteLock(); try { _map[key] = val; } finally { _rw.ExitWriteLock(); } }
    public TValue GetOrAdd(TKey key, Func<TKey,TValue> f) { _rw.EnterUpgradeableReadLock(); try { if (_map.TryGetValue(key, out var v)) return v; _rw.EnterWriteLock(); try { return _map[key] = f(key); } finally { _rw.ExitWriteLock(); } } finally { _rw.ExitUpgradeableReadLock(); } }
}
```

**Trade-offs:** Pro — high read concurrency. Con — writer starvation, heavier than `lock`.

---

### 5. Double-Checked Locking

**Intent:** Lazy init with minimal lock contention.

**Problem:** Naive lazy init locks on every access or initializes without synchronization.

**Solution:** Check without lock, lock and re-check. Use `Lazy<T>` in C#.

```csharp
public sealed class Singleton
{
    private static readonly Lazy<Singleton> _i = new(() => new Singleton(), LazyThreadSafetyMode.ExecutionAndPublication);
    public static Singleton Instance => _i.Value;
    private Singleton() { }
}

// Manual (fragile — prefer Lazy<T>)
private static volatile Singleton? _m;
private static readonly object _s = new();
public static Singleton Manual { get { if (_m is null) lock (_s) if (_m is null) { var t = new Singleton(); Thread.MemoryBarrier(); _m = t; } return _m; } }
```

**Trade-offs:** Pro — near-zero hot-path cost. Con — memory-model bugs if manual; `Lazy<T>` is always preferable.

---

### 6. Thread-Safe Interface

**Intent:** Wrapper providing thread-safe access to a non-thread-safe class.

**Problem:** Existing class (`List<T>`, `Random`) is not thread-safe but must be used from multiple threads.

**Solution:** Delegating wrapper using `lock`.

```csharp
public interface IStore { void Write(string k, string v); string? Read(string k); }
public sealed class MemStore : IStore { readonly Dictionary<string,string> _m = new(); public void Write(string k,string v) => _m[k]=v; public string? Read(string k) => _m.GetValueOrDefault(k); }
public sealed class SafeStore : IStore { readonly MemStore _i; readonly Lock _l = new(); public SafeStore(MemStore i) => _i=i; public void Write(string k,string v){ lock(_l) _i.Write(k,v); } public string? Read(string k){ lock(_l) return _i.Read(k); } }
```

**Trade-offs:** Pro — no changes to original class. Con — all callers share one lock.

---

### 7. Balking

**Intent:** Abort an operation when the object is in the wrong state.

**Problem:** Operation must only execute in a valid state; wait or block is unacceptable.

**Solution:** Check guard inside lock; if false, return immediately.

```csharp
public sealed class Latch
{
    private readonly object _l = new();
    private bool _set; private TaskCompletionSource? _tcs;
    public bool TrySet() { lock (_l) { if (_set) return false; _set = true; _tcs?.TrySetResult(); return true; } }
    public Task WaitAsync() { lock (_l) { if (_set) return Task.CompletedTask; _tcs ??= new(TaskCreationOptions.RunContinuationsAsynchronously); return _tcs.Task; } }
}
```

**Trade-offs:** Pro — fail-fast. Con — caller must handle failure.

---

### 8. Guarded Suspension

**Intent:** Suspend a thread until a condition is true.

**Problem:** Consumer needs data but buffer is empty; polling wastes CPU.

**Solution:** Acquire lock, check predicate in a `while` loop, wait (`Monitor.Wait` / `SemaphoreSlim`). Producer signals.

```csharp
public T Take() { lock (_l) { while (_q.Count == 0) Monitor.Wait(_l); return _q.Dequeue(); } }
// Producer: lock (_l) { _q.Enqueue(i); Monitor.Pulse(_l); }

// Modern: Channel
var ch = Channel.CreateBounded<string>(new BoundedChannelOptions(100) { FullMode = BoundedChannelFullMode.Wait });
await ch.Writer.WriteAsync("msg");
await foreach (var m in ch.Reader.ReadAllAsync()) { }
```

**Trade-offs:** Pro — zero CPU while waiting. Con — spurious wakeups, deadlock if signal missed.

---

### 9. Scheduler

**Intent:** Run tasks at a specified time, after delay, or on a schedule.

**Problem:** Periodic polling, retry backoff, delayed notifications.

**Solution:** `PeriodicTimer`, `Task.Delay`, or a Channel-based scheduler.

```csharp
// PeriodicTimer
using var timer = new PeriodicTimer(TimeSpan.FromSeconds(30));
using var cts = new CancellationTokenSource();
while (await timer.WaitForNextTickAsync(cts.Token)) await PollAsync();

// Exponential backoff
async Task RetryAsync(Func<Task> op, int max)
{
    for (int i = 0; i <= max; i++) { try { await op(); return; } catch when (i < max) { await Task.Delay(TimeSpan.FromMilliseconds(Math.Pow(2, i) * 100)); } }
}
```

**Trade-offs:** Pro — cancellable, clean async interface. Con — `Task.Delay` has ms precision.

---

## Async / Reactive Patterns

### 10. Reactor

**Intent:** Demultiplex I/O events via a synchronous event loop (select/epoll).

**Problem:** Many sockets; thread-per-socket doesn't scale.

**Solution:** Single thread blocks on `Socket.Select`, dispatches to registered handlers.

```csharp
public sealed class Reactor
{
    readonly List<Socket> _socks = new();
    readonly Dictionary<Socket, Func<Socket, Task>> _handlers = new();
    public void Register(Socket s, Func<Socket, Task> h) { _socks.Add(s); _handlers[s] = h; }
    public async Task RunAsync(CancellationToken ct) { while (!ct.IsCancellationRequested) { var r = new List<Socket>(_socks); Socket.Select(r, null, null, 1_000_000); foreach (var s in r) if (_handlers.TryGetValue(s, out var h)) await h(s); } }
}
```

**Trade-offs:** Pro — single-threaded, no locks. Con — `Select` doesn't scale to millions; CPU handlers block loop.

---

### 11. Proactor

**Intent:** Async I/O with OS completion notification (IOCP).

**Problem:** Reactor needs readiness. Overlapped I/O is more efficient with completion callbacks.

**Solution:** Submit async requests; OS posts completions to IOCP. Used by Kestrel.

```csharp
// SocketAsyncEventArgs — proactor pattern used by Kestrel
var socket = await listenSocket.AcceptAsync();
var args = new SocketAsyncEventArgs();
args.SetBuffer(new byte[4096]);
// Internally uses IOCP completions
```

**Trade-offs:** Pro — max throughput for overlapped I/O. Con — OS-specific (IOCP/io_uring).

---

### 12. Promise / Future

**Intent:** Placeholder for a not-yet-available result.

**Problem:** Start an async operation and consume result later without blocking.

**Solution:** Return `Task<T>`. Await when needed. `TaskCompletionSource<T>` creates manual promises.

```csharp
Task<int> ft = FetchAsync();
int r = await ft; // await unwraps the future

// Manual timeout with TaskCompletionSource
public static Task<T> TimeoutAfter<T>(this Task<T> t, TimeSpan ts)
{
    var tcs = new TaskCompletionSource<T>();
    var timer = new Timer(_ => tcs.TrySetException(new TimeoutException()), null, ts, Timeout.InfiniteTimeSpan);
    t.ContinueWith(t2 => { timer.Dispose(); if (t2.IsFaulted) tcs.TrySetException(t2.Exception!.InnerExceptions); else if (t2.IsCanceled) tcs.TrySetCanceled(); else tcs.TrySetResult(t2.Result); });
    return tcs.Task;
}

// ValueTask — avoids allocation for sync-completing paths
public static async ValueTask<int> MaybeCached() => _cached ??= await FetchAsync();
```

**Trade-offs:** Pro — foundation of async/await, composable. Con — state machine allocation per await.

---

### 13. Async Method Invocation

**Intent:** Invoke asynchronously, get notified via callback.

**Problem:** Start long operation without blocking, be notified on completion.

**Solution:** Return `Task` with `ContinueWith` or fire-and-forget with error handler.

```csharp
public static void FireAndForget(this Task t, Action<Exception?>? cb = null) => _ = t.ContinueWith(t2 => { if (t2.IsFaulted) cb?.Invoke(t2.Exception?.GetBaseException()); else cb?.Invoke(null); });
// Usage: ProcessAsync(id).FireAndForget(ex => Log.Error(ex, "fail"));
```

**Trade-offs:** Pro — decoupled. Con — loses `HttpContext`, silent exceptions.

---

### 14. Coroutine

**Intent:** Suspendable computation — "function that can pause."

**Problem:** Sequential I/O steps must not block threads; state machines are complex.

**Solution:** `async/await` — compiler generates the state machine. Each `await` suspends; resumes on captured context.

```csharp
public async Task<Result> ProcessAsync(Order o) { var v = await ValidateAsync(o); var p = await PayAsync(v); return await ConfirmAsync(p); }

// Iterator coroutine
public IEnumerable<int> Fib(int n) { int a=0,b=1; for(int i=0;i<n;i++){ yield return a; (a,b)=(b,a+b); } }

// Custom awaitable
public readonly struct Awaiter : INotifyCompletion { public Awaiter GetAwaiter()=>this; public bool IsCompleted=>false; public void OnCompleted(Action c)=>ThreadPool.QueueUserWorkItem(_=>c()); public void GetResult(){} }
```

**Trade-offs:** Pro — sequential code, no blocking. Con — state machine allocation.

---

### 15. Reactive Streams

**Intent:** Async sequences with non-blocking backpressure.

**Problem:** Fast producer overwhelms slow consumer; memory grows unbounded.

**Solution:** Bounded `Channel<T>` or Rx operators with backpressure.

```csharp
var ch = Channel.CreateBounded<Work>(new BoundedChannelOptions(500) { FullMode = BoundedChannelFullMode.Wait });
// Producer: await ch.Writer.WriteAsync(item, ct); — waits if full (backpressure)
// Consumer: await foreach (var i in ch.Reader.ReadAllAsync()) Process(i);

// Rx backpressure
source.Buffer(TimeSpan.FromMilliseconds(100), 100).SelectMany(b => b.ToObservable()).Subscribe(Process);
```

**Trade-offs:** Pro — memory-safe under load. Con — backpressure adds latency.

---

### 16. Publisher-Subscriber

**Intent:** Broadcast messages to many subscribers asynchronously.

**Problem:** Events need to reach multiple handlers without coupling.

**Solution:** In-memory event bus with `Subject<T>` or Channels.

```csharp
public sealed class Bus { readonly Dictionary<Type, object> _s = new(); readonly object _l = new();
    public IObservable<T> Get<T>() where T:class { lock(_l) { if(!_s.TryGetValue(typeof(T), out var x)) _s[typeof(T)]=x=new Subject<T>(); return ((Subject<T>)x).AsObservable(); } }
    public void Pub<T>(T e) where T:class { lock(_l) if(_s.TryGetValue(typeof(T), out var x)) ((Subject<T>)x).OnNext(e); }
}
// bus.Get<OrderPlaced>().Subscribe(e => SendEmail(e.Customer));
// bus.Pub(new OrderPlaced { CustomerEmail = "a@b.com" });
```

**Trade-offs:** Pro — decoupled, extensible. Con — in-memory only; subscriber exceptions cascade unless caught.

---

## Parallel Patterns

### 17. Fork-Join

**Intent:** Split work, process in parallel, merge results.

**Problem:** Large computation is embarrassingly parallel but sequential is slow.

**Solution:** Partition input, process each on a `Task`, join with `Task.WhenAll`, merge.

```csharp
public static async Task<long> SumAsync(int[] data)
{
    var d = Environment.ProcessorCount; var cs = data.Length / d;
    var tasks = Enumerable.Range(0, d).Select(i => Task.Run(() => { long s=0; var end=i==d-1?data.Length:(i+1)*cs; for(int j=i*cs;j<end;j++)s+=data[j]; return s; }));
    return (await Task.WhenAll(tasks)).Sum();
}
// PLINQ: data.AsParallel().Sum();
```

**Trade-offs:** Pro — near-linear speedup. Con — overhead dominates small inputs.

---

### 18. Master-Worker

**Intent:** Coordinator distributes work, collects results, handles failures.

**Problem:** Batch job with many items; workers may fail.

**Solution:** Master enqueues items. Workers read from `Channel<T>`, process, write results.

```csharp
public sealed class MasterWorker<TIn, TOut>
{
    readonly Channel<TIn> _wq = Channel.CreateBounded<TIn>(new BoundedChannelOptions(10_000){FullMode=BoundedChannelFullMode.Wait});
    readonly Channel<TOut> _r = Channel.CreateUnbounded<TOut>();
    readonly Func<TIn, CancellationToken, Task<TOut>> _fn; readonly int _n;
    public MasterWorker(Func<TIn, CancellationToken, Task<TOut>> fn, int n) { _fn=fn; _n=n; }
    public async IAsyncEnumerable<TOut> Run(IEnumerable<TIn> items, [EnumeratorCancellation] CancellationToken ct) {
        foreach(var i in items) await _wq.Writer.WriteAsync(i, ct); _wq.Writer.Complete();
        var ws = Enumerable.Range(0,_n).Select(_ => Worker(ct)).ToArray(); await Task.WhenAll(ws); _r.Writer.Complete();
        await foreach(var o in _r.Reader.ReadAllAsync(ct)) yield return o; }
    async Task Worker(CancellationToken ct) { await foreach(var i in _wq.Reader.ReadAllAsync(ct)) { try { await _r.Writer.WriteAsync(await _fn(i,ct), ct); } catch {} } }
}
```

**Trade-offs:** Pro — linear scaling, fault isolation. Con — master is SPOF.

---

### 19. Pipeline

**Intent:** Chain concurrent processing stages — the "assembly line."

**Problem:** Data flows through transforms; sequential processing underutilizes parallelism.

**Solution:** Each stage is a `Channel<T>` with a dedicated task.

```csharp
public static async Task Pipeline(IAsyncEnumerable<string> src, CancellationToken ct)
{
    var d = Channel.CreateBounded<string>(100);
    var s1 = Task.Run(async () => { await foreach(var u in src.WithCancellation(ct)) { var h=await new HttpClient().GetStringAsync(u,ct); await d.Writer.WriteAsync(h,ct); } d.Writer.Complete(); });
    var p = Channel.CreateBounded<Data>(100);
    var s2 = Task.Run(async () => { await foreach(var h in d.Reader.ReadAllAsync(ct)) await p.Writer.WriteAsync(Parse(h),ct); p.Writer.Complete(); });
    var s3 = Task.Run(async () => { await foreach(var d in p.Reader.ReadAllAsync(ct)) await SaveAsync(d,ct); });
    await Task.WhenAll(s1,s2,s3);
}
```

**Trade-offs:** Pro — stages scale independently. Con — depth adds per-item latency.

---

### 20. MapReduce

**Intent:** Parallel map (transform) then reduce (aggregate) over large datasets.

**Problem:** Billions of records → group by key → aggregate per key.

**Solution:** Map → shuffle (group) → reduce (per-key aggregation).

```csharp
public sealed class MapReduce<TIn, TK, TV, TR> where TK : notnull
{
    readonly Func<TIn, IEnumerable<KeyValuePair<TK, TV>>> _m;
    readonly Func<TK, IEnumerable<TV>, TR> _r;
    public MapReduce(Func<TIn, IEnumerable<KeyValuePair<TK, TV>>> m, Func<TK, IEnumerable<TV>, TR> r) { _m=m; _r=r; }
    public async Task<Dictionary<TK, TR>> Run(IEnumerable<TIn> data, int d=0) {
        d = d>0?d:Environment.ProcessorCount; var parts = data.Chunk(data.Count()/d+1);
        var mapped = await Task.WhenAll(parts.Select(c => Task.Run(() => c.SelectMany(_m))));
        var grouped = mapped.SelectMany(x => x).GroupBy(k => k.Key, v => v.Value);
        var reduced = await Task.WhenAll(grouped.Select(g => Task.Run(() => new KeyValuePair<TK,TR>(g.Key,_r(g.Key,g)))));
        return new Dictionary<TK,TR>(reduced);
    }
}
// Word count: new MapReduce<string,string,int,int>(l=>l.Split(' ').Select(w=>new(w,1)),(_,c)=>c.Sum()).Run(File.ReadLines("huge.txt"));
```

**Trade-offs:** Pro — massively parallelizable. Con — shuffle is expensive.

---

### 21. Producer-Consumer

**Intent:** Decouple production from consumption via a thread-safe queue.

**Problem:** Service receives requests faster than processing. Blocking is unacceptable.

**Solution:** Producers enqueue into bounded `Channel<T>`. Consumers dequeue and process.

```csharp
public sealed class ProdCons<T>
{
    readonly Channel<T> _ch; readonly Func<T,CancellationToken,Task> _fn; readonly CancellationTokenSource _cts=new(); Task _consumer=Task.CompletedTask;
    public ProdCons(Func<T,CancellationToken,Task> fn, int cap=1000) { _fn=fn; _ch=Channel.CreateBounded<T>(new BoundedChannelOptions(cap){FullMode=BoundedChannelFullMode.Wait}); }
    public void Start() => _consumer = RunAsync();
    public ValueTask Produce(T item, CancellationToken ct=default) => _ch.Writer.WriteAsync(item, ct);
    public async Task Stop() { _ch.Writer.TryComplete(); _cts.Cancel(); await _consumer; }
    async Task RunAsync() { await foreach(var i in _ch.Reader.ReadAllAsync(_cts.Token)) await _fn(i,_cts.Token); }
}

// Multiple consumers
var ch = Channel.CreateBounded<Work>(new BoundedChannelOptions(500){FullMode=BoundedChannelFullMode.Wait});
var workers = Enumerable.Range(0,4).Select(_ => Task.Run(async () => { await foreach(var i in ch.Reader.ReadAllAsync()) Process(i); })).ToArray();
```

**Trade-offs:** Pro — smooths bursts, backpressure prevents OOM. Con — consumer crash loses items.

---

### 22. Parallel Loop

**Intent:** Execute loop iterations concurrently across cores.

**Problem:** Sequential `for` loop leaves cores idle.

**Solution:** `Parallel.For`, `Parallel.ForEach`, PLINQ.

```csharp
long total = 0;
Parallel.For(0, data.Length, new ParallelOptions { MaxDegreeOfParallelism = Environment.ProcessorCount },
    () => 0L, (i, _, s) => s + data[i], s => Interlocked.Add(ref total, s));

await Parallel.ForEachAsync(urls, new ParallelOptions { MaxDegreeOfParallelism = 10 }, async (url, ct) => { var c = await http.GetStringAsync(url, ct); await ProcessAsync(c, ct); });
```

**Trade-offs:** Pro — simple data parallelism. Con — overhead for fine-grained work.

---

## Anti-Patterns to Avoid

| Anti-Pattern | Why It Hurts |
|---|---|
| `Task.Run` in a tight loop | Scheduling overhead dwarfs work |
| Blocking on async (`.Result`, `.Wait()`) | Thread-pool starvation, deadlocks |
| Fire-and-forget without error handling | Unobserved exceptions crash finalizer |
| `lock(this)` / `lock(typeof(T))` | Public lock invites interference |
| `Thread.Abort` | Deprecated; use `CancellationToken` |
| Over-partitioning small data | Parallel overhead > sequential time |

---

## Decision Flowchart

```
I/O-bound? → events? → Yes: Reactive Streams (Channel/Rx)
                       → No:  async/await (Promise/Coroutine)
CPU-bound? → data independent? → Yes: Parallel.For / PLINQ
                               → No:  Fork-Join / Master-Worker
Stateful?  → Yes: Active Object / Monitor Object
           → No:  Producer-Consumer / Pipeline
```

---

## References

- *Concurrent Programming on Windows* — Joe Duffy
- *Pattern-Oriented Software Architecture, Vol. 2* — Schmidt et al.
- *C# in a Nutshell* — Albahari (Concurrency)
- Stephen Cleary — *Concurrency in C# Cookbook*
