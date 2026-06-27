# State Management

## Purpose
This document explores state management strategies in modern PHP 8.3+ systems. Proper state management across HTTP requests, caching layers, and asynchronous workers is vital for scaling.

## Core Principles
1. Stateless HTTP interactions where possible
2. Distributed caching for shared state
3. Immutable state transitions
4. Idempotency in state mutation
5. Event-driven state updates

## Detailed Architectural Overview
```text
+-------------------+       +-------------------+
|   Client Request  | ----> |   Load Balancer   |
+-------------------+       +-------------------+
                                    |
                                    v
+-------------------+       +-------------------+
|   PHP Worker A    |       |   PHP Worker B    |
+-------------------+       +-------------------+
        |                           |
        +-------------+-------------+
                      |
                      v
            +-------------------+
            |   Redis Cluster   |
            |   (Global State)  |
            +-------------------+
```

## Algorithms and Formulations
Cache hit ratio optimization:
$H_{ratio} = \frac{Hits}{Hits + Misses} \times 100\%$
Aim for $H_{ratio} > 95\%$.

## Decision Matrix
```text
Do you need persistent session state?
├── Yes -> Use Redis/Memcached Session Handler
└── No -> Use JWT/Stateless Auth
    ├── High security needed? -> Short-lived JWT + Refresh Token
    └── Simple API? -> Long-lived Bearer Token
```

## Data Schemas
```json
{
  "state_manager": "redis",
  "cluster_mode": true,
  "ttl_seconds": 3600
}
```

## Code Examples

### PHP 8.3+ (Core Logic)
```php
<?php
declare(strict_types=1);

namespace App\Infrastructure\State;

use Illuminate\Support\Facades\Cache;
use App\Domain\State\{StateInterface, StateData};

readonly class RedisStateManager implements StateInterface
{
    public function __construct(
        private string $prefix = 'state:'
    ) {}

    public function getState(string $id): ?StateData
    {
        $data = Cache::get($this->prefix . $id);
        return $data ? unserialize($data) : null;
    }

    public function setState(string $id, StateData $state, int $ttl = 3600): void
    {
        Cache::put($this->prefix . $id, serialize($state), $ttl);
    }
}
```

### Python (State Verification Script)
```python
import redis

def check_redis_state(host: str, port: int):
    r = redis.Redis(host=host, port=port)
    keys = r.keys('state:*')
    print(f"Found {len(keys)} state entries.")
```

## Configuration Templates
```yaml
cache:
  default: redis
  stores:
    redis:
      driver: redis
      connection: cache
      lock_connection: default
```

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| State Mismatch | Race Conditions | Use atomic locks |
| Eviction | Memory Limit Hit| Scale Redis memory |
| Stale Data | TTL Too High | Reduce cache TTL |
| High Latency | Network Delay | Move Redis closer to workers |
| Connection Drop | Timeout Configs | Tune TCP keepalives |
| Serialization Error| Complex Object | Only cache simple arrays/DTOs |

## Best Practices and Anti-Patterns
- **Best Practice**: Treat distributed cache as ephemeral.
- **Anti-Pattern**: Storing large, deeply nested objects in sessions.





























































































































































































































































































































































































