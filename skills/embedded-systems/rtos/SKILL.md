---
name: rtos
description: >
  Use this skill when the user says 'FreeRTOS', 'RTOS task', 'xTaskCreate', 'task priority', 'mutex vs semaphore', 'priority inversion', 'task notification', 'stack overflow in task', 'Zephyr thread', 'RTOS queue', 'ISR to task'. Designs and reviews code on a real-time kernel (FreeRTOS primary, Zephyr notes): task partitioning, priorities, inter-task communication, ISR deferral, memory and stack sizing, timing analysis and debugging. Do NOT use for: scheduling theory and RTOS selection (use rtos-fundamentals), bare-metal superloops without a kernel (use c-cpp-patterns or bare-metal-rust), Linux userspace threads.
version: "2.0.0"
author: "j4flmao"
license: "MIT"
tags: [embedded, rtos, freertos, zephyr, real-time, concurrency]
---

# RTOS Engineering (FreeRTOS / Zephyr)

## Purpose
Turn a firmware feature into a set of tasks, priorities and communication primitives that meet deadlines deterministically. The skill covers how the FreeRTOS kernel actually schedules, which primitive to use for each interaction, how to keep ISRs short, how to size stacks and heaps statically, and how to prove timing on the target.

## Agent Protocol

### Trigger
"FreeRTOS", "RTOS task", "xTaskCreate", "task priority", "mutex vs semaphore", "priority inversion", "task notification", "stack overflow", "Zephyr thread", "RTOS queue", "ISR to task".

### Input Context
- MCU/core (Cortex-M0/M3/M4F/M7/M33, RISC-V, ESP32), clock, RAM/flash budget
- Kernel and version (FreeRTOS V10/V11, SMP or not; Zephyr version)
- Deadlines and periods of each activity, interrupt sources and rates
- Safety/coding standard (MISRA C, IEC 61508/ISO 26262 context)

### Output Artifact
Task table, primitive choices, C code for tasks/ISRs, `FreeRTOSConfig.h` settings. No file unless requested.

### Response Format
```
Tasks: {name | priority | period/deadline | stack words | blocks on}
IPC: {producer -> primitive -> consumer}
ISRs: {source | work done in ISR | deferred to}
Config: {key FreeRTOSConfig.h settings}
Code: {snippet}
Verification: {WCET/response-time check, stack high-water marks, trace}
```

## 1. How the FreeRTOS Scheduler Works
- Fixed-priority preemptive scheduling (`configUSE_PREEMPTION 1`). The highest-priority Ready task always runs; equal priorities round-robin on each tick when `configUSE_TIME_SLICING 1` (default).
- Ready tasks live in `pxReadyTasksLists[configMAX_PRIORITIES]`; a context switch saves registers on the task's stack and updates the TCB stack pointer. On Cortex-M the switch runs in the lowest-priority `PendSV` exception, triggered by `portYIELD()`; the tick comes from SysTick (`xTaskIncrementTick()` moves delayed tasks to Ready).
- Priority 0 is the idle task. Higher number = higher priority (opposite of Cortex-M NVIC, where lower number = more urgent).
- Tickless idle (`configUSE_TICKLESS_IDLE 1`) suppresses ticks while idle for low power.
- SMP: FreeRTOS V11 merged SMP support (`configNUMBER_OF_CORES > 1`, e.g. RP2040, ESP32 via ESP-IDF's own variant). Two tasks of different priority can then run simultaneously — do not use priority as a mutual-exclusion mechanism.

## 2. Task Design Rules
1. One task per independent timing domain (sensor sampling, control loop, comms, UI), not one per feature.
2. Assign priorities by deadline (Rate/Deadline Monotonic): shorter deadline → higher priority. Not by "importance".
3. Every task blocks somewhere (`xQueueReceive`, `ulTaskNotifyTake`, `vTaskDelayUntil`). A task that never blocks starves everything below it.
4. Periodic tasks use `vTaskDelayUntil(&lastWake, period)` (or `xTaskDelayUntil`) — `vTaskDelay` drifts because it is relative to the call time.
5. Create everything at startup with static allocation; never create/delete tasks in steady state.

```c
#define CTRL_STACK_WORDS 512
static StackType_t ctrlStack[CTRL_STACK_WORDS];
static StaticTask_t ctrlTcb;

static void vControlTask(void *arg)
{
    (void)arg;
    TickType_t lastWake = xTaskGetTickCount();
    const TickType_t period = pdMS_TO_TICKS(5);       /* 200 Hz loop */
    for (;;) {
        vTaskDelayUntil(&lastWake, period);
        control_step();                                /* bounded WCET */
    }
}

void app_start(void)
{
    TaskHandle_t h = xTaskCreateStatic(vControlTask, "ctrl", CTRL_STACK_WORDS,
                                       NULL, tskIDLE_PRIORITY + 4, ctrlStack, &ctrlTcb);
    configASSERT(h != NULL);
    vTaskStartScheduler();                             /* does not return */
    for (;;) { }
}
```
Note: the stack depth argument is in words (`StackType_t`), not bytes.

## 3. Choosing the Communication Primitive

| Need | Primitive | Notes |
|------|-----------|-------|
| ISR or task signals one specific task | Direct-to-task notification (`xTaskNotifyGive` / `vTaskNotifyGiveFromISR`, `ulTaskNotifyTake`) | Fastest and smallest; one receiver only |
| Pass data by copy | Queue (`xQueueSend`, `xQueueReceive`) | Items copied; send pointers to static buffers for large data |
| Byte stream / variable messages, one writer one reader | Stream / message buffer | Single writer + single reader unless you add locking |
| Protect a shared resource | Mutex (`xSemaphoreCreateMutexStatic`) | Has priority inheritance; never take in an ISR |
| Count events / resources | Counting semaphore | No inheritance |
| Wait on several flags | Event group | Bits limited by `configTICK_TYPE_WIDTH_IN_BITS` (24 usable bits for 32-bit ticks) |
| Deferred function call | Timer service / `xTimerPendFunctionCallFromISR` | Runs in the timer daemon task — keep callbacks short and non-blocking |

Mutex vs binary semaphore: a mutex has an owner and priority inheritance and must be released by the task that took it; a binary semaphore is for signalling and has neither.

## 4. Priority Inversion and Inheritance
Classic failure (Mars Pathfinder, 1997): low task holds a lock, high task blocks on it, medium task preempts low — high waits on medium. FreeRTOS mutexes apply priority inheritance: the holder is raised to the highest waiter's priority and lowered again when it gives the mutex back (since V10 the original priority is restored once it holds no more mutexes, and a waiter timing out can lower the inherited priority). Inheritance is not transitive-safe against long critical sections: keep mutex-held code short, never block on another primitive while holding a mutex, and take multiple mutexes in a fixed global order to avoid deadlock.

## 5. ISRs and Deferral
```c
void ADC_IRQHandler(void)
{
    BaseType_t woken = pdFALSE;
    sample_buf[idx] = ADC1->DR;                         /* read clears the flag on many parts */
    vTaskNotifyGiveFromISR(adcTaskHandle, &woken);
    portYIELD_FROM_ISR(woken);                          /* switch now if a higher task woke */
}
```
- Only `...FromISR` APIs inside ISRs; never block, `printf`, or allocate.
- Cortex-M: ISRs that call FreeRTOS APIs must have a numeric priority >= `configMAX_SYSCALL_INTERRUPT_PRIORITY` (i.e. logically lower or equal urgency). Higher-urgency ISRs may run but must not call the kernel. Getting this wrong corrupts kernel lists — `configASSERT` catches it on ports that support the check.
- STM32 HAL: call `HAL_NVIC_SetPriorityGrouping(NVIC_PRIORITYGROUP_4)` (all bits preemption, no sub-priority), as the FreeRTOS Cortex-M port expects.

## 6. Memory and Stacks
- Prefer `configSUPPORT_STATIC_ALLOCATION 1` and the `...Static` creation APIs. If a heap is needed, use `heap_4` (coalescing) or `heap_5` (multiple regions); `heap_1` (no free) for create-at-startup-only systems.
- Enable `configCHECK_FOR_STACK_OVERFLOW 2` and implement `vApplicationStackOverflowHook`; check `uxTaskGetStackHighWaterMark()` under worst-case load and keep >= 20-25% margin.
- Implement `vApplicationMallocFailedHook` even if you think you never allocate.
- Cortex-M4F/M7: FPU context is stacked lazily by hardware; tasks using floats need larger stacks.

## 7. Timing Verification
- Measure WCET of each task body on target (DWT `CYCCNT` on Cortex-M3+), not in a simulator.
- Response-time analysis for fixed priority: R_i = C_i + B_i + Σ_{j∈hp(i)} ⌈R_i / T_j⌉·C_j, iterate to a fixed point; schedulable if R_i <= D_i (B_i = longest blocking by lower tasks via mutexes).
- Trace with Percepio Tracealyzer, SEGGER SystemView, or `configUSE_TRACE_FACILITY` + run-time stats (`configGENERATE_RUN_TIME_STATS`).

## 8. Zephyr Equivalents
| FreeRTOS | Zephyr |
|----------|--------|
| `xTaskCreateStatic` | `K_THREAD_DEFINE` / `k_thread_create` |
| Priorities: higher number = higher | Lower number = higher; negative = cooperative (non-preemptible) |
| Queue | `k_msgq` |
| Mutex (inheritance) | `k_mutex` (inheritance) |
| Task notification | `k_sem` / `k_event` / `k_poll` |
| `FromISR` APIs | Same APIs, ISR-safe variants marked; use `K_NO_WAIT` in ISRs |

## 9. Anti-Patterns
| Anti-pattern | Consequence | Fix |
|--------------|-------------|-----|
| Busy-wait polling a flag in a task | Starves lower priorities, wastes power | Block on notification/queue |
| `vTaskDelay` for periodic work | Period drift | `vTaskDelayUntil` |
| Mutex in ISR / blocking call in ISR | Kernel corruption or hard fault | Notify a task |
| Same priority for everything | Round-robin jitter, missed deadlines | Deadline-monotonic priorities |
| Large structs passed through queues by value | Long copies inside critical sections | Pass pointer to pool buffer |
| Holding a mutex while waiting on a queue | Deadlock / unbounded inversion | Release before blocking |
| Unchecked return values (`pdFAIL`, `NULL`) | Silent failures | `configASSERT` + error path |

## 10. Checklist
- [ ] Task table with period, deadline, WCET, priority, stack size
- [ ] All objects statically created before `vTaskStartScheduler()`
- [ ] ISR priorities respect `configMAX_SYSCALL_INTERRUPT_PRIORITY`
- [ ] Stack overflow + malloc-failed hooks implemented; high-water marks recorded
- [ ] `configASSERT` enabled in debug builds
- [ ] Response-time analysis or trace evidence that deadlines hold at worst-case load
- [ ] Watchdog fed from a supervisor that checks every task's liveness, not from the idle hook alone
