# Code Organization

## Purpose
Establishes rules for directory structures, namespace layouts, and Dependency Injection patterns to enforce SOLID principles and Domain-Driven Design in PHP 8.3+ projects.

## Core Principles
1. Organize by Feature/Domain, not by technical type
2. Strict namespace-to-directory mapping (PSR-4)
3. Interface-driven development
4. Encapsulation of internal logic
5. Uniform coding standards (PSR-12 / PER-CS)

## Detailed Architectural Overview
```text
src/
├── Application/
│   ├── UseCases/
│   └── DTOs/
├── Domain/
│   ├── Entities/
│   ├── ValueObjects/
│   └── Repositories/ (Interfaces)
└── Infrastructure/
    ├── Persistence/ (Eloquent/Doctrine)
    ├── Http/ (Controllers)
    └── Services/ (External API Clients)
```

## Algorithms and Formulations
Cohesion metric:
$LCOM = \text{Lack of Cohesion in Methods}$
Keep $LCOM$ close to 0 to ensure classes are highly cohesive.

## Decision Matrix
```text
Where does this class belong?
├── Is it business rules? -> Domain
├── Is it orchestrating flow? -> Application
└── Is it talking to DB/Network? -> Infrastructure
```

## Data Schemas
```json
{
  "autoload": {
    "psr-4": {
      "App\\": "src/"
    }
  }
}
```

## Code Examples

### PHP 8.3+ (Domain Driven Structure)
```php
<?php
declare(strict_types=1);

namespace App\Domain\Order\ValueObjects;

use InvalidArgumentException;

readonly class Money
{
    public function __construct(
        public int $amount,
        public string $currency = 'USD'
    ) {
        if ($amount < 0) {
            throw new InvalidArgumentException('Amount cannot be negative');
        }
    }

    public function add(Money $other): self
    {
        if ($this->currency !== $other->currency) {
            throw new InvalidArgumentException('Currency mismatch');
        }
        return new self($this->amount + $other->amount, $this->currency);
    }
}
```

### Python (Structure Verification Script)
```python
import os

def check_structure(base_path: str):
    required_dirs = ['Domain', 'Application', 'Infrastructure']
    for d in required_dirs:
        path = os.path.join(base_path, 'src', d)
        if not os.path.exists(path):
            print(f"Missing required directory: {d}")
        else:
            print(f"Directory {d} exists.")

if __name__ == '__main__':
    check_structure('.')
```

## Configuration Templates
```json
// phpcs.xml
<?xml version="1.0"?>
<ruleset name="Project Standard">
    <description>PSR-12 compliance.</description>
    <rule ref="PSR12"/>
    <file>src/</file>
    <file>tests/</file>
</ruleset>
```

## Extended Troubleshooting Guide
| Symptom | Primary Cause | Mitigation Action |
|---------|---------------|-------------------|
| Class not found | Autoload mismatch | Run composer dump-autoload |
| Circular Dep | Poor abstraction | Introduce an Interface/Event |
| Fat Models | Logic in Active Record| Move logic to Application Services|
| Hard to Test | New instances in code| Use Constructor Injection |
| Massive Ctrlr | Doing too much | Delegate to Use Cases / Actions |
| Git Conflicts | Huge files | Split classes, adhere to SRP |

## Best Practices and Anti-Patterns
- **Best Practice**: Make Domain models framework-agnostic.
- **Anti-Pattern**: Using Laravel Facades or helper functions inside the `Domain` layer.





























































































































































































































































































































































































