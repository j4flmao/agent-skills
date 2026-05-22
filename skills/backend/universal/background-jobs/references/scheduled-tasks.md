# Scheduled Tasks

## Cron Expression Format
```
*    *    *    *    *    *
┬    ┬    ┬    ┬    ┬    ┬
│    │    │    │    │    └─ day of week (0-7, 0/7=Sun)
│    │    │    │    └────── month (1-12)
│    │    │    └─────────── day of month (1-31)
│    │    └──────────────── hour (0-23)
│    └───────────────────── minute (0-59)
└────────────────────────── second (0-59, optional)
```

## Common Patterns
- Every hour at minute 0: `0 * * * *`
- Daily at midnight UTC: `0 0 * * *`
- Every Monday 9 AM UTC: `0 9 * * 1`
- Every 15 minutes: `*/15 * * * *`
- First day of month: `0 0 1 * *`

## Best Practices
- All cron expressions in UTC — convert to local time in display layer
- Avoid scheduling at the top of the hour (many systems do, causes thundering herd)
- Add jitter to cron: `random(0, 59)` minutes past the hour
- Document the expected timezone in the job metadata
- Use 6-field cron when second precision is needed
- Never schedule more than one instance of a job (use distributed lock)
- Monitor missed schedules (scheduler down = missed execution)
