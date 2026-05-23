# Remote Debugging Guide

## Overview

Remote debugging attaches a debugger to a process running on a different machine. Useful when bugs only reproduce in staging, in containers, or on specific hardware.

## Language-Specific Setup

### Node.js

```bash
# Start with debugger
node --inspect=0.0.0.0:9229 src/index.js

# Start with debugger, wait for connection
node --inspect-brk=0.0.0.0:9229 src/index.js

# For production-like debugging (low overhead)
node --inspect-publish-uid=http
```

**VS Code attach configuration:**
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "attach",
      "name": "Remote Attach",
      "address": "192.168.1.100",
      "port": 9229,
      "sourceMaps": true,
      "restart": true,
      "localRoot": "${workspaceFolder}",
      "remoteRoot": "/app"
    }
  ]
}
```

### Python

```bash
# Install
pip install debugpy

# Start with debugger
python -m debugpy --listen 0.0.0.0:5678 src/main.py

# Wait for attach
python -m debugpy --listen 0.0.0.0:5678 --wait-for-client src/main.py
```

**VS Code attach:**
```json
{
  "type": "python",
  "request": "attach",
  "name": "Remote Python",
  "connect": { "host": "192.168.1.100", "port": 5678 },
  "justMyCode": true
}
```

### Java

```bash
# JDWP — Java Debug Wire Protocol
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=n,address=*:5005 -jar app.jar

# Suspend until debugger attached
java -agentlib:jdwp=transport=dt_socket,server=y,suspend=y,address=*:5005 -jar app.jar
```

**VS Code attach:**
```json
{
  "type": "java",
  "request": "attach",
  "name": "Remote Java",
  "hostName": "192.168.1.100",
  "port": 5005
}
```

### .NET

```bash
# Enable debugger on startup
DOTNET_ENVIRONMENT=Development DOTNET_EnableDiagnostics=1 dotnet run

# Attach via VS Code or Visual Studio
# .NET CLI tools for remote diagnostics
dotnet-dump collect --process-id <pid>
dotnet-gcdump collect --process-id <pid>
dotnet-trace collect --process-id <pid>
```

### Go (Delve)

```bash
# Install Delve
go install github.com/go-delve/delve/cmd/dlv@latest

# Start headless debug server
dlv debug --headless --listen=:2345 --api-version=2 --accept-multiclient

# Attach to running process
dlv attach <pid> --headless --listen=:2345
```

**VS Code attach:**
```json
{
  "type": "go",
  "request": "attach",
  "name": "Remote Go",
  "mode": "remote",
  "remotePath": "${workspaceFolder}",
  "port": 2345,
  "host": "192.168.1.100"
}
```

### Rust

```bash
# Build with debug symbols
cargo build

# Run with debugger
rust-lldb target/debug/myapp

# Remote using gdb server
gdbserver :2345 ./target/debug/myapp
# Connect from another machine
rust-lldb -o "gdb-remote 192.168.1.100:2345"
```

## SSH Tunneling

When direct port access isn't available, use SSH tunnels:

```bash
# Local port forwarding
ssh -L 9229:localhost:9229 user@remote-server

# With jump host
ssh -J bastion@company.com -L 9229:localhost:9229 user@app-server

# Auto-reconnect tunnel
autossh -M 0 -o "ServerAliveInterval 30" -L 9229:localhost:9229 user@remote-server

# Multi-port tunnel
ssh -L 9229:localhost:9229 -L 5005:localhost:5005 user@remote-server
```

## Kubernetes Remote Debugging

### Ephemeral Debug Container

```bash
# kubectl debug creates an ephemeral container with diagnostic tools
kubectl debug my-pod -it --image=nicolaka/netshoot --target=my-container

# Node.js debug
kubectl debug my-pod --image=node:20 --target=my-app -- node --inspect=0.0.0.0:9229

# With port forwarding
kubectl port-forward pod/my-pod 9229:9229
```

### Debug Sidecar

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: my-app-debug
spec:
  containers:
  - name: app
    image: my-app:latest
  - name: debug
    image: nicolaka/netshoot
    command: ["sleep", "infinity"]
```

### Telepresence (intercept traffic)

```bash
# Intercept service traffic to local machine
telepresence intercept my-service --port 3000:80

# Now remote service routes to your local dev server
# All headers, auth, and context preserved
```

## Container Debugging

### Docker

```bash
# Debug port mapping
docker run -p 9229:9229 -p 3000:3000 my-app

# Exec into running container
docker exec -it <container-id> /bin/bash

# Debug with tools container
docker run --net container:<target-container> --pid container:<target-container> \
  -it nicolaka/netshoot /bin/bash
```

### docker-compose

```yaml
services:
  app:
    build: .
    ports:
      - "3000:3000"
      - "9229:9229"  # Debug port
    environment:
      - NODE_OPTIONS=--inspect=0.0.0.0:9229
    volumes:
      - .:/app
```

## Post-Mortem Debugging

### Core Dumps

```bash
# Enable core dumps
ulimit -c unlimited
echo "/tmp/core.%p" | sudo tee /proc/sys/kernel/core_pattern

# Generate core dump from running process
gcore <pid>           # Linux
dotnet-dump collect   # .NET
jmap -dump:file=heap.hprof <pid>  # Java

# Analyze core dump
gdb ./binary core.1234
lldb -c core.1234 binary
```

### Heap Dump Analysis

```bash
# Node.js
node --heapsnapshot-signal SIGUSR2 src/index.js
kill -USR2 <pid>
# Chrome DevTools → Memory → Load snapshot

# Java
jmap -dump:live,format=b,file=heap.hprof <pid>
# Analyze with Eclipse MAT or VisualVM

# .NET
dotnet-dump collect --type heap <pid>
# Analyze with Visual Studio or dotnet-dump analyze
```

## Remote Debugging Safety Rules

| Rule | Reason |
|------|--------|
| Never attach debugger to production | Breakpoints freeze entire process |
| Never suspend on breakpoint in prod | Stops request processing for all users |
| Use read-only connections | Avoid accidental state mutations |
| Time out idle debug sessions | Orphaned sessions consume resources |
| Remove debug endpoints before deploy | Debug endpoints are security holes |
| Use SSH tunnels, never expose debug ports | Debug ports have no auth |

## Failure Modes

| Symptom | Likely Cause | Fix |
|---------|-------------|-----|
| Connection refused | Debug port not exposed or firewalled | Check port mapping, firewall rules |
| Source not matching binaries | Source maps missing | Deploy with source maps, verify paths |
| Breakpoints not hitting | Code optimized out | Build with debug symbols, disable optimization |
| Timeout on attach | Port blocked by network policy | Use SSH tunnel |
| Symbols not loading | Debug symbols stripped | Build with `debug=true`, don't strip |
