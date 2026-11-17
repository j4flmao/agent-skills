# Tool-Specific Debugging

## GDB / LLDB (Native Code)

Essential commands for C, C++, Rust, and other native debugging.

### Breakpoints
```
break main.cpp:42              # break at file:line
break func_name                # break at function entry
break main.cpp:42 if x > 5    # conditional breakpoint
rbreak regex_pattern           # break on all functions matching pattern
```
In LLDB: `breakpoint set --file main.cpp --line 42`.

### Watchpoints (Data Breakpoints)
```
watch my_variable              # break when value changes
watch -l my_variable           # watch memory address (GDB)
```
In LLDB: `watchpoint set variable my_variable`.

### Execution Control
```
run (r)          # start program with args
continue (c)     # resume execution
next (n)         # step over (skip function calls)
step (s)         # step into function
finish (fin)     # step out of current function
until line_no    # run until line
```

### Inspection
```
backtrace (bt)          # print call stack
frame (f)               # select and inspect frame
info locals             # print local variables
info args               # print function arguments
print expression (p)    # evaluate expression
display expression      # auto-print on every stop
list                    # show source code around current line
```

### Reverse Debugging (rr)
```
rr record ./myprogram    # record execution
rr replay                # replay with reverse execution
reverse-continue (rc)    # go backward to previous breakpoint
reverse-step (rs)        # step backward
```
Use rr for Heisenbugs that disappear under debugger — record once, replay indefinitely with reverse execution.

### Core Dump Analysis
```
gdb ./myprogram core.dump
bt                      # backtrace at crash point
frame 5                 # inspect frame 5
info locals             # see variable values at crash
```

## Chrome DevTools

### Source Tab
- Breakpoints: click line number. Conditional: right-click → enter condition. Logpoints: right-click → "Logpoint" → expression to log without pausing.
- Blackbox scripts: right-click framework file → "Blackbox script" to hide from stack traces.

### Network Tab
- Waterfall view: request timing breakdown (DNS, TCP, TLS, TTFB, download).
- Initiator column: click to see what code triggered the request.
- Throttling: simulate Slow 3G, Fast 3G, or custom bandwidth/latency profiles.

### Memory Tab
- Heap snapshot: take snapshot A, perform action, take snapshot B, switch to "Comparison" view to see delta. Retainers view shows the GC root path for selected objects.

### Performance Tab
- Record: perform the slow action, stop recording.
- Flame chart: view main thread activity — long yellow tasks (>50ms) indicate blocking JavaScript.
- Bottom-up: sort functions by total time (self + children) to find the single most expensive function.

## VS Code Debugger

### Launch Configurations (.vscode/launch.json)
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Launch Program",
      "program": "${workspaceFolder}/src/index.js",
      "env": { "NODE_ENV": "development" }
    },
    {
      "type": "node",
      "request": "attach",
      "name": "Attach to Process",
      "port": 9229
    }
  ]
}
```

### Key Features
- Conditional breakpoints: right-click breakpoint → "Edit Breakpoint" → enter condition.
- Logpoints: right-click gutter → "Logpoint" → enter expression to log without pausing.
- Data breakpoints: right-click variable in Debug view → "Break on Value Change".
- Multi-target: add multiple configurations to launch.json, start "compound" launch.
- Function breakpoints: Debug view → + → "Function Breakpoint" → enter function name.

## dotMemory (.NET Memory)

### Snapshot Workflow
Take snapshot A, perform operation N times, take snapshot B, switch to Comparison view to see which types grew in count or size. Trace retention path from each growing type to find the leak culprit.

### Key Views
- Retention Path: chain from GC root to selected object. First non-GC-root object is the leak.
- Dominators: largest objects by retained size. Start here for high-memory investigations.
- Allocation Call Stack: see where leaking objects were allocated.

## Valgrind (C/C++)

### Memcheck (Default Tool)
```
valgrind --leak-check=full --show-leak-kinds=all ./myprogram
valgrind --tool=memcheck --track-origins=yes ./myprogram
```

Reports: definitely lost (real leak), indirectly lost (leaked via leaked pointers), possibly lost (ambiguous), still reachable (not freed at exit but still accessible). Fix "definitely lost" first — they represent real memory that will never be reclaimed.

### Helgrind (Thread Sanitizer)
```
valgrind --tool=helgrind ./myprogram
```

Detects: data races (two threads access same memory without synchronization), lock order violations (potential deadlocks), POSIX API misuse. Pair with ThreadSanitizer (`-fsanitize=thread` in Clang/GCC) for production-speed race detection.

### Callgrind (Call Graph Profiler)
```
valgrind --tool=callgrind ./myprogram
```

Generates call graph with instruction counts per function. Visualize with `kcachegrind`. Use to find which functions are called most frequently and which callees dominate execution time.

### Cachegrind (Cache Profiler)
Reports L1 and LLC cache misses per function. High miss rates indicate poor data locality — restructure data layouts from AoS to SoA, align allocations to cache lines.
