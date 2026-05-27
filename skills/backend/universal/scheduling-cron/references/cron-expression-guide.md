# Cron Expression Guide

A comprehensive reference for cron expressions with edge cases and best practices.

## Expression Format

```
┌───────── minute (0-59)
│ ┌───────── hour (0-23)
│ │ ┌───────── day of month (1-31)
│ │ │ ┌───────── month (1-12)
│ │ │ │ ┌───────── day of week (0-7, 0 and 7 = Sunday)
│ │ │ │ │
* * * * *
```

## Special Characters

| Character | Name | Description |
|-----------|------|-------------|
| `*` | Any | Matches all values |
| `,` | List | Multiple values: `1,3,5` |
| `-` | Range | Inclusive range: `1-5` |
| `/` | Step | Increment: `*/5` = every 5 units |
| `L` | Last | Last day of month or last weekday of month |
| `W` | Weekday | Nearest weekday to given day |
| `#` | Nth | Nth weekday of month: `2#1` = first Monday |

## Common Patterns

```yaml
# Every minute
* * * * *

# Every 5 minutes
*/5 * * * *

# Every hour at :00
0 * * * *

# Twice daily at 9am and 5pm
0 9,17 * * *

# Every weekday at 8am
0 8 * * 1-5

# Every Monday at midnight
0 0 * * 1

# First day of every month
0 0 1 * *

# Every 15 minutes during business hours (9-17)
*/15 9-17 * * 1-5

# Every 30 seconds (not standard cron — use */30 in some parsers)
*/30 * * * * *
```

## Advanced Patterns

```javascript
// Using cron-parser
const parser = require('cron-parser');

// Every 2 hours between 8am and 6pm on weekdays
const interval = parser.parseExpression('0 8-18/2 * * 1-5');
console.log(interval.next().toISOString());

// Last day of every month (use date limit, not cron)
// Standard cron can't do "last day of month" via expression alone
function getLastDayOfMonth(): Date {
  const date = new Date();
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}
```

## DST and Timezone Edge Cases

```javascript
const { DateTime } = require('luxon');

function getNextCronRun(cronExpr: string, timezone: string): DateTime | null {
  const now = DateTime.now().setZone(timezone);

  // Check if this is a "spring forward" gap
  if (now.isInDST && !now.plus({ hour: 1 }).isInDST) {
    logger.warn('Scheduled run may fall in DST gap — skipping');
    return null;
  }

  // Handle "fall back" — run only once
  if (!now.isInDST && now.plus({ hour: 1 }).isInDST) {
    logger.info('DST fallback — ensuring single execution');
    // deduplicate via lock
  }

  return computeNext(now, cronExpr);
}
```

## Non-Standard Extensions

Many schedulers support extended formats:

```yaml
# Quartz cron (6 fields: sec min hour day month dow)
0 0 8 ? * MON-FRI

# Spring @Scheduled
@Scheduled(cron = "0 0 8 * * MON-FRI", zone = "America/New_York")

# Node.js node-cron (standard 5 fields)
node-cron.schedule('0 8 * * 1-5', handler)

# Python schedule (human-readable)
schedule.every().day.at("08:00").do(handler)
```

## Validation

```typescript
function validateCronExpression(expression: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  const parts = expression.trim().split(/\s+/);

  if (parts.length !== 5 && parts.length !== 6) {
    errors.push('Cron expression must have 5 or 6 fields');
    return { valid: false, errors };
  }

  const validators = [
    { name: 'minute', min: 0, max: 59 },
    { name: 'hour', min: 0, max: 23 },
    { name: 'day-of-month', min: 1, max: 31 },
    { name: 'month', min: 1, max: 12 },
    { name: 'day-of-week', min: 0, max: 7 },
  ];

  validators.forEach(({ name, min, max }, i) => {
    if (parts[i] !== '*' && !/^[\d,\-/\#LW]+$/.test(parts[i])) {
      errors.push(`Invalid characters in ${name} field: '${parts[i]}'`);
    }
  });

  return { valid: errors.length === 0, errors };
}
```

## Key Points
- Standard cron has 5 fields (minute, hour, day-of-month, month, day-of-week)
- Use 6-field expression (with seconds) for sub-minute schedules
- Always specify timezone — never rely on server default
- Handle DST transitions: skip ambiguous runs during "spring forward"
- Use distributed locking for exactly-once semantics across nodes
- Validate cron expressions before scheduling
- Prefer literal expressions over complex combinations for readability
