# Error Handling

## Purpose
Comprehensive documentation on error handling, logging, and monitoring in PHP 8.3+. Focuses on exception hierarchies, centralized reporting, and graceful degradation.

## Core Principles
1. Fail Fast, Recover Gracefully
2. Centralized Error Logging (Monolog)
3. Do not leak sensitive information to users
4. Alerting on critical severity only
5. Contextual logging (User ID, Trace ID)

## Detailed Architectural Overview
```text
+-------------------+       +-------------------+
|   PHP Application | ----> |   Monolog Handler |
|   (Throws Exception|       |   (Formats Log)   |
+-------------------+       +-------------------+
                                    |
                                    v
+-------------------+       +-------------------+
|   Alerting        | <---- |   Log Aggregator  |
|   (Slack/PagerDuty|       |   (ELK/Datadog)   |
+-------------------+       +-------------------+
```

## Algorithms and Formulations
Error Rate formulation:
$ER = \frac{5xx\ Responses}{Total\ Responses} \times 100\%$

## Decision Matrix
```text
Is it an expected condition?
├── Yes -> Return specific Domain Exception (4xx)
└── No -> Throw Runtime Exception (5xx)
    ├── Can we recover? -> Catch, Log warning, use fallback data
    └── Catastrophic? -> Let it crash, trigger critical alert
```

## Data Schemas
```json
{
  "error_tracking": "sentry",
  "log_level": "error",
  "include_stacktrace": true
}
```

## Code Examples

### PHP 8.3+ (Core Logic)
```php
<?php
declare(strict_types=1);

namespace App\Exceptions;

use Exception;
use Throwable;
use Illuminate\Support\Facades\Log;

class ExceptionHandler
{
    public function handle(Throwable $e): void
    {
        $context = [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace_id' => request()->header('X-Trace-Id')
        ];

        if ($e instanceof DomainException) {
            Log::warning($e->getMessage(), $context);
        } else {
            Log::critical('Unexpected System Error', array_merge($context, ['trace' => $e->getTraceAsString()]));
            // Send to Sentry/Bugsnag
            app('sentry')->captureException($e);
        }
    }
}
```

### Python (Log Parsing Script)
```python
import json

def parse_php_logs(filepath: str):
    with open(filepath, 'r') as f:
        for line in f:
            if 'critical' in line.lower():
                log_data = json.loads(line)
                print(f"CRITICAL ERROR: {log_data.get('message')} at {log_data.get('time')}")
```

## Configuration Templates
```php
// logging.php
return [
    'default' => env('LOG_CHANNEL', 'stack'),
    'channels' => [
        'stack' => [
            'driver' => 'stack',
            'channels' => ['single', 'sentry'],
            'ignore_exceptions' => false,
        ],
        'sentry' => [
            'driver' => 'sentry',
        ],
    ],
];
```

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| Disk Full | Log files too large | Implement log rotation |
| No Stacktrace | Stripped in prod | Ensure Sentry config is correct |
| False Alarms | Logging 404s as Errors| Filter NotFoundHttpException |
| Missing Context | Auth state lost | Add UserId to Monolog processor |
| Log Drop | Network partition | Buffer logs locally before shipping|
| Slow Response | Synchronous Logging| Dispatch logs to a queue/UDP |

## Best Practices and Anti-Patterns
- **Best Practice**: Use meaningful Exception subclasses (`UserNotFoundException` instead of general `Exception`).
- **Anti-Pattern**: Using `@` operator to suppress warnings.





























































































































































































































































































































































































