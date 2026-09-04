# System Calls (The User/Kernel Boundary)

## 1. The Problem of Privilege
A User Space application (Ring 3) cannot access the hard drive directly. If it wants to read a file, it must ask the Kernel (Ring 0) to do it. 
However, User Space cannot simply call a C function in Kernel Space (like `kernel_read()`), because the memory is protected. 

## 2. The Legacy Way: Software Interrupts (`int 0x80`)
In 32-bit x86 Linux, user space would place the system call number in `EAX`, arguments in `EBX`, `ECX`, etc., and trigger a software exception using `int 0x80`. 
The CPU would trap this, look up IDT entry 0x80, jump to Ring 0, and execute the kernel handler.
*Flaw*: Traversing the IDT is incredibly slow (taking hundreds of clock cycles).

## 3. The Modern Way: `syscall` / `sysenter`
Modern 64-bit CPUs introduced dedicated hardware instructions (`syscall` for AMD/Intel, `sysenter` for legacy Intel) specifically for OS system calls. This bypasses the IDT entirely.

### The Fast Path
During boot, the OS writes the memory address of its primary system call handler into a special CPU Model-Specific Register (MSR).

When a C program calls `read()`:
1. Glibc (the C library) puts the syscall number for `read` (0 on Linux x86_64) into `RAX`.
2. Glibc executes the `syscall` instruction.
3. The CPU hardware **instantly**:
   - Saves the return address (User `RIP`) into `RCX`.
   - Switches privilege to Ring 0.
   - Jumps to the address stored in the MSR (the Kernel's `entry_SYSCALL_64`).
4. The Kernel executes. It checks `RAX` against a Syscall Table, validates the user's pointers (Crucial: never trust User Space pointers!), and reads the file.
5. The Kernel executes `sysret`, dropping back to Ring 3 and returning control to Glibc.

## 4. Context Switching during Syscalls
A system call does *not* necessarily trigger a process Context Switch. The Kernel is simply executing code on behalf of the current process, using the process's Kernel Stack. 
A Context Switch (swapping `CR3` and saving all registers) only occurs if the syscall blocks (e.g., waiting for the disk to spin up), forcing the Scheduler to pick a different process to run.
