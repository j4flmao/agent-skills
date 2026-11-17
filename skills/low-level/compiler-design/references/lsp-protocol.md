# Language Server Protocol (LSP)

## 1. Skill Context
**Focus**: The standardized protocol that allows IDEs (VSCode, Neovim, Cursor) to provide real-time IntelliSense, linting, and refactoring without compiling the code themselves.
**Triggers**: lsp, language-server-protocol, ast, intellisense, json-rpc.

## 2. The M x N Problem
Historically, if you had 3 languages (Python, Java, C++) and 3 editors (Vim, Eclipse, Sublime), the community had to write 9 different plugins for auto-complete.
Microsoft created **LSP** to solve this. 
- The Editor acts as a dumb client.
- A dedicated background process (The Language Server) parses the code and acts as the brain.

## 3. How LSP Works (JSON-RPC)
The Editor and the Server communicate via JSON-RPC over `stdio` or sockets.
1. **DidOpen**: User opens `main.py`. Editor sends the file content to the Server.
2. **DidChange**: User types `def`. Editor sends a diff. The Server updates its internal Abstract Syntax Tree (AST).
3. **Completion**: User types `.`. Editor sends `textDocument/completion` with the cursor coordinates (Line 10, Column 15).
4. **Response**: The Server traverses the AST, finds the object under the cursor, calculates its methods, and returns a JSON array of suggestions.
