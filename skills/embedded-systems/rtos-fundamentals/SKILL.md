# RTOS (Real-Time Operating Systems)

## 1. Skill Context
**Focus**: Engineering software for embedded devices (cars, medical devices, satellites) where missing a deadline causes physical harm or catastrophic failure.
**Triggers**: rtos, embedded, freertos, vxworks, deterministic-latency, interrupts.

## 2. General-Purpose OS vs. RTOS
- **General-Purpose OS (Linux/Windows)**: Designed for *fairness* and *throughput*. If you click a button and the OS is busy doing a background update, your click might process 500ms later. This is acceptable for a PC.
- **RTOS (FreeRTOS, VxWorks)**: Designed for *deterministic latency*. If an airbag sensor fires an interrupt, the OS MUST execute the airbag deployment code within exactly 2 milliseconds. It doesn't matter if it's "fair" to other tasks; the high-priority task preempts everything instantly.

## 3. Core Concepts
### Task Scheduling
An RTOS uses strict Priority-Based Preemptive Scheduling.
- If Task A (Priority High) and Task B (Priority Low) are ready to run, Task A will ALWAYS run. Task B will starve indefinitely if Task A doesn't explicitly yield or block.

### Priority Inversion
A classic RTOS bug (which famously crashed the Mars Pathfinder in 1997).
1. Low Priority task acquires a Mutex lock.
2. High Priority task needs that Mutex, so it blocks (goes to sleep).
3. A Medium Priority task preempts the Low Priority task.
**Result**: The High Priority task is effectively blocked by a Medium Priority task.
**Solution**: The RTOS implements **Priority Inheritance**—temporarily boosting the Low Priority task to High Priority until it releases the lock.

## 4. Interrupt Service Routines (ISRs)
In an RTOS, ISRs must be microscopic.
- Never use `printf()`, `malloc()`, or blocking Mutexes inside an ISR.
- The ISR should simply clear the hardware flag, push a lightweight event to a Queue (using special `FromISR` functions like `xQueueSendFromISR`), and return immediately. The actual processing happens in a normal Task.
