# Streaming SSR

## React Streaming Setup

```typescript
import { renderToPipeableStream } from 'react-dom/server'
import { Response } from 'express'

interface StreamConfig {
  onShellReady?: () => void
  onError?: (error: Error) => void
  bootstrapScripts?: string[]
  bootstrapModules?: string[]
}

function renderToStream(url: string, res: Response, config: StreamConfig = {}) {
  const { pipe, abort } = renderToPipeableStream(
    <App />,
    {
      bootstrapScripts: config.bootstrapScripts,
      bootstrapModules: config.bootstrapModules,
      onShellReady() {
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/html')
        pipe(res)
        config.onShellReady?.()
      },
      onShellError(error) {
        res.statusCode = 500
        res.send(`<!DOCTYPE html><h1>Error</h1><p>${error.message}</p>`)
        config.onError?.(error)
      },
      onError(error) {
        console.error('Streaming SSR error:', error)
        config.onError?.(error)
      },
    }
  )

  setTimeout(() => abort(), 10000)
}
```

## Streaming with Suspense Boundaries

```typescript
function DashboardPage() {
  return (
    <html>
      <head>
        <title>Dashboard</title>
      </head>
      <body>
        <Layout>
          <Nav />
          <Suspense fallback={<NavSkeleton />}>
            <AsyncNav />
          </Suspense>
          <main>
            <Suspense fallback={<DashboardSkeleton />}>
              <DashboardContent />
            </Suspense>
            <Suspense fallback={<ActivitySkeleton />}>
              <ActivityFeed />
            </Suspense>
          </main>
        </Layout>
        <Scripts />
      </body>
    </html>
  )
}
```

## Progressive HTML Delivery

```typescript
function createStreamingResponse(App: React.ComponentType, req: Request) {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(encoder.encode('<!DOCTYPE html>'))
      controller.enqueue(encoder.encode('<html><head><title>Streaming App</title></head><body>'))
      controller.enqueue(encoder.encode('<div id="root">'))
    },
  })

  const { pipe } = renderToPipeableStream(<App />, {
    onShellReady() {
      stream.pipeTo(
        new WritableStream({
          write(chunk) {
            controller.enqueue(chunk)
          },
        })
      )
    },
  })

  return new Response(stream, {
    headers: { 'Content-Type': 'text/html' },
  })
}
```

## Streaming with Node.js Streams

```typescript
import { Readable } from 'stream'
import { renderToPipeableStream } from 'react-dom/server'

function streamResponse(res: Response, Component: React.ComponentType) {
  const readable = new Readable({
    read() {},
  })

  const { pipe, abort } = renderToPipeableStream(<Component />, {
    onShellReady() {
      readable.push('<div id="root">')
      pipe(
        new Writable({
          write(chunk, encoding, callback) {
            readable.push(chunk)
            callback()
          },
          final(callback) {
            readable.push('</div>')
            readable.push(null)
            callback()
          },
        })
      )
    },
    onShellError(error) {
      readable.destroy(error)
    },
  })

  res.setHeader('Content-Type', 'text/html')
  readable.pipe(res)
}

// HTML shell wrapper
function createShell(headContent: string): string {
  return `
    <!DOCTYPE html>
    <html>
      <head>
        ${headContent}
      </head>
      <body>
        <div id="root">${content}</div>
      </body>
    </html>
  `
}
```

## Streaming Data Fetching

```typescript
async function streamDataResponse(req: Request, res: Response) {
  const encoder = new TextEncoder()
  const stream = new TransformStream()
  const writer = stream.writable.getWriter()

  res.writeHead(200, {
    'Content-Type': 'text/html',
    'Transfer-Encoding': 'chunked',
  })

  const send = async (data: string) => {
    await writer.write(encoder.encode(data))
  }

  await send('<html><body><div id="root">')

  renderToPipeableStream(<App />, {
    bootstrapScripts: ['/main.js'],
    async onShellReady() {
      const data = await fetchData()
      const dataScript = `<script>window.__INITIAL_DATA__ = ${JSON.stringify(data)}</script>`
      await send(dataScript)
      const { pipe } = renderToPipeableStream(<App data={data} />)
      pipe(
        new Writable({
          async write(chunk) {
            await send(chunk)
          },
          async final() {
            await send('</div></body></html>')
            await writer.close()
          },
        })
      )
    },
  })
}
```

## Streaming Error Recovery

```typescript
function StreamErrorBoundary({ fallback, children }: {
  fallback: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Suspense fallback={fallback}>
      <ErrorBoundary fallback={fallback}>
        {children}
      </ErrorBoundary>
    </Suspense>
  )
}

function renderWithErrorRecovery(url: string, res: Response) {
  let hasErrored = false

  const { pipe, abort } = renderToPipeableStream(
    <StreamErrorBoundary fallback={<FullPageFallback />}>
      <App />
    </StreamErrorBoundary>,
    {
      onShellReady() {
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/html')
        res.write('<div id="root">')
        pipe(res)
      },
      onShellError(error) {
        if (!hasErrored) {
          hasErrored = true
          res.statusCode = 500
          res.send(`<h1>Error</h1><p>${error.message}</p>`)
        }
      },
      onError(error) {
        if (!hasErrored) {
          console.error('Streaming error, falling back to CSR:', error)
          hasErrored = true
          abort()
          res.end('</div><script>window.__CSR_FALLBACK__ = true</script>')
        }
      },
    }
  )
}
```

## Timeout Handling

```typescript
function streamWithTimeout(Component: React.ComponentType, timeoutMs = 5000) {
  return new Promise<ReadableStream>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Streaming timeout exceeded'))
    }, timeoutMs)

    const stream = new ReadableStream({
      start(controller) {
        const { pipe, abort } = renderToPipeableStream(<Component />, {
          onShellReady() {
            clearTimeout(timeout)
            const writer = new WritableStream({
              write(chunk) {
                controller.enqueue(chunk)
              },
              close() {
                controller.close()
              },
            })
            pipe(writer)
          },
          onShellError(error) {
            clearTimeout(timeout)
            reject(error)
          },
        })
      },
    })

    resolve(stream)
  })
}
```

## Performance Monitoring

```typescript
interface StreamMetrics {
  ttfb: number
  shellTime: number
  totalTime: number
  chunkCount: number
  totalBytes: number
  errors: Error[]
}

class StreamMonitor {
  private startTime: number = 0
  private shellStartTime: number = 0
  private shellEndTime: number = 0
  private chunkCount: number = 0
  private totalBytes: number = 0
  private errors: Error[] = []

  start(): void {
    this.startTime = performance.now()
  }

  shellReady(): void {
    this.shellStartTime = performance.now()
  }

  shellComplete(): void {
    this.shellEndTime = performance.now()
  }

  chunkReceived(chunk: Buffer): void {
    this.chunkCount++
    this.totalBytes += chunk.length
  }

  error(error: Error): void {
    this.errors.push(error)
  }

  getMetrics(): StreamMetrics {
    const now = performance.now()
    return {
      ttfb: this.shellStartTime - this.startTime,
      shellTime: this.shellEndTime - this.shellStartTime,
      totalTime: now - this.startTime,
      chunkCount: this.chunkCount,
      totalBytes: this.totalBytes,
      errors: this.errors,
    }
  }

  report(): void {
    const metrics = this.getMetrics()
    console.log(`Streaming SSR Metrics:
      TTFB: ${metrics.ttfb.toFixed(2)}ms
      Shell: ${metrics.shellTime.toFixed(2)}ms
      Total: ${metrics.totalTime.toFixed(2)}ms
      Chunks: ${metrics.chunkCount}
      Bytes: ${(metrics.totalBytes / 1024).toFixed(2)}KB
      Errors: ${metrics.errors.length}`)
  }
}
```

## Key Points

- Use renderToPipeableStream for React streaming SSR
- Wrap async content in Suspense boundaries for progressive rendering
- Send HTML shell immediately, stream content as it resolves
- Implement error boundaries within streams to prevent total failure
- Set timeouts on streaming operations to avoid hanging requests
- Monitor TTFB, shell time, and total stream duration
- Handle streaming errors gracefully with CSR fallback
- Stream data fetching results alongside HTML chunks
- Use Transfer-Encoding: chunked for proper streaming delivery
- Order critical content first in the stream for faster LCP
