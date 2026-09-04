# Assembly Skill Architecture

## 1. Skill Context
**Focus**: CPU Instruction Sets, reverse engineering, kernel entry/exit paths, compiler optimization analysis.
**Triggers**: assembly, asm, x86_64, arm64, abi, calling-conventions, registers.

## 2. Application Binary Interface (ABI)
When C code calls a function, how does the CPU know where the parameters are? This is defined by the ABI (Calling Convention). If you write a Kernel system call handler in Assembly, you MUST manually adhere to the C ABI so C programs can call it.

### System V AMD64 ABI (Linux/macOS x86_64)
- **Parameters**: Passed in registers in this exact order: `RDI`, `RSI`, `RDX`, `RCX`, `R8`, `R9`. (Additional parameters are pushed onto the Stack).
- **Return Value**: Stored in `RAX`.
- **Callee-Saved Registers**: `RBX`, `RBP`, `R12-R15`. If your assembly function modifies these, you *must* push them to the stack at the start and pop them before returning, or you will corrupt the caller's state.

### AAPCS64 (ARM64)
- **Parameters**: `X0` through `X7`.
- **Return Value**: `X0`.
- **Link Register**: `X30` holds the return address (unlike x86 which pushes it to the stack).

## 3. The Stack and Base Pointers
Understanding the stack frame is critical for exploiting buffer overflows or writing debuggers.
- **x86_64**: `RSP` points to the top of the stack (grows downwards towards address 0). `RBP` points to the base of the current function's frame.
- **Function Prologue**:
  ```assembly
  push rbp      ; Save caller's base pointer
  mov rbp, rsp  ; Set our base pointer
  sub rsp, 16   ; Allocate 16 bytes for local variables
  ```
- **Function Epilogue**:
  ```assembly
  mov rsp, rbp  ; Restore stack pointer (destroys local vars)
  pop rbp       ; Restore caller's base pointer
  ret           ; Pop return address from stack and jump to it
  ```

## 4. Context Switching (Hardware Level)
An OS Kernel achieves multitasking by forcibly stopping a program, saving its entire state, and loading another. This *cannot* be written in C. It must be Assembly.
1. A hardware timer interrupt fires.
2. The CPU automatically pushes the Instruction Pointer (`RIP`) and flags to the stack.
3. The Assembly interrupt handler (`isr_stub`) executes.
4. It manually pushes *all* general-purpose registers (`pusha` / `push rdi`, `rsi`, etc.) to the stack.
5. It swaps the `CR3` register (changing the Virtual Memory Page Directory to the next process).
6. It pops the registers of the *next* process from its stack.
7. `iretq` (Interrupt Return) resumes the new process.
