# FastAPI Background Tasks

## BackgroundTasks

### Basic Usage
```python
from fastapi import FastAPI, BackgroundTasks, Depends

app = FastAPI()

def write_log(message: str):
    with open("log.txt", "a") as f:
        f.write(f"{message}\n")

@app.post("/send-notification")
async def send_notification(email: str, background_tasks: BackgroundTasks):
    background_tasks.add_task(write_log, f"notification sent to {email}")
    return {"message": "Notification sent"}

# With dependencies
def get_logger():
    return write_log

@app.post("/process")
async def process(
    background_tasks: BackgroundTasks,
    logger: callable = Depends(get_logger),
):
    background_tasks.add_task(logger, "processing started")
    return {"status": "processing"}
```

### Email Sending
```python
from fastapi import BackgroundTasks
from app.services.email import send_email as send_email_service

@app.post("/register")
async def register_user(
    email: str,
    name: str,
    background_tasks: BackgroundTasks,
):
    user = await create_user(email, name)
    background_tasks.add_task(
        send_welcome_email,
        user_id=user.id,
        email=user.email,
        template="welcome",
    )
    return {"user_id": user.id}

async def send_welcome_email(user_id: int, email: str, template: str):
    html = render_template(template, user_id=user_id)
    await send_email_service(email, "Welcome!", html)
```

### Database Operations
```python
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db

@app.post("/orders")
async def create_order(
    order_data: OrderCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db),
):
    order = await create_order_in_db(db, order_data)
    background_tasks.add_task(
        update_inventory_async, order.id, order.items
    )
    background_tasks.add_task(
        notify_analytics, order.id, order.total
    )
    return order

async def update_inventory_async(order_id: int, items: list):
    async with get_db() as db:
        for item in items:
            await db.execute(
                update(Inventory)
                .where(Inventory.product_id == item.product_id)
                .values(quantity=Inventory.quantity - item.quantity)
            )
        await db.commit()
```

## Celery Integration

### Celery Config
```python
# app/celery_app.py
from celery import Celery

celery_app = Celery(
    "worker",
    broker="redis://redis:6379/0",
    backend="redis://redis:6379/1",
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_time_limit=30 * 60,
    task_soft_time_limit=25 * 60,
)
```

### Task Definition
```python
# app/tasks.py
from app.celery_app import celery_app
from app.services.reporting import generate_report_service

@celery_app.task(bind=True, max_retries=3)
def generate_report(self, report_id: int):
    try:
        result = generate_report_service(report_id)
        return {"status": "completed", "report_id": report_id, "url": result}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)
```

### Dispatching from FastAPI
```python
from fastapi import FastAPI, HTTPException
from app.tasks import generate_report
from celery.result import AsyncResult

app = FastAPI()

@app.post("/reports")
async def create_report(report_config: ReportConfig):
    task = generate_report.delay(
        report_id=report_config.id,
    )
    return {"task_id": task.id, "status": "processing"}

@app.get("/reports/{task_id}")
async def get_report_status(task_id: str):
    task = AsyncResult(task_id)

    if task.failed():
        return {"status": "failed", "error": str(task.result)}

    if task.successful():
        return {"status": "completed", "result": task.result}

    return {
        "status": task.status,
        "task_id": task_id,
        "state": task.state,
        "info": task.info,
    }
```

## Background Task Queue with ARQ

### ARQ Setup
```python
# app/arq_app.py
from redis import asyncio as aioredis
from arq import create_pool
from arq.connections import RedisSettings

class WorkerSettings:
    functions = [
        "app.tasks.send_email",
        "app.tasks.process_webhook",
        "app.tasks.generate_thumbnail",
    ]
    redis_settings = RedisSettings(
        host="redis",
        port=6379,
        database=0,
    )
    keep_result = 3600
    keep_result_forever = False
    max_jobs = 10
```

### ARQ Tasks
```python
# app/tasks.py
import httpx

async def send_email(ctx, to: str, subject: str, body: str):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://api.email-service.com/send",
            json={"to": to, "subject": subject, "body": body},
            timeout=30,
        )
    return response.status_code

async def process_webhook(ctx, payload: dict, webhook_id: str):
    await validate_webhook(payload)
    await store_webhook_event(webhook_id, payload)
    return {"webhook_id": webhook_id, "status": "processed"}
```

### FastAPI with ARQ
```python
from fastapi import FastAPI
from arq import create_pool

app = FastAPI()

@app.on_event("startup")
async def startup():
    app.state.redis = await aioredis.from_url("redis://redis:6379/0")
    app.state.arq_pool = await create_pool(
        RedisSettings(host="redis", port=6379)
    )

@app.on_event("shutdown")
async def shutdown():
    await app.state.arq_pool.close()
    await app.state.redis.close()

@app.post("/send-email")
async def send_email_endpoint(to: str, subject: str, body: str):
    job = await app.state.arq_pool.enqueue_job(
        "app.tasks.send_email",
        to,
        subject,
        body,
    )
    return {"job_id": job.id}
```

## Scheduled Tasks (APScheduler)

### APScheduler Integration
```python
from fastapi import FastAPI
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from contextlib import asynccontextmanager

scheduler = AsyncIOScheduler()

async def cleanup_expired_tokens():
    await database.execute(
        delete(Token).where(Token.expires_at < func.now())
    )

async def generate_daily_report():
    data = await fetch_daily_metrics()
    await store_report("daily", data)

async def health_check_ping():
    await redis.set("health:last_ping", datetime.now().isoformat())

@asynccontextmanager
async def lifespan(app: FastAPI):
    scheduler.add_job(
        cleanup_expired_tokens,
        CronTrigger(hour=3, minute=0),
        id="cleanup_tokens",
    )
    scheduler.add_job(
        generate_daily_report,
        CronTrigger(hour=6, minute=0),
        id="daily_report",
    )
    scheduler.add_job(
        health_check_ping,
        "interval",
        minutes=5,
        id="health_ping",
    )
    scheduler.start()
    yield
    scheduler.shutdown()

app = FastAPI(lifespan=lifespan)
```

## Task Monitoring

### Monitoring Endpoint
```python
from arq.jobs import Job
from arq.connections import ArqRedis

@app.get("/tasks/{job_id}")
async def get_task_status(job_id: str):
    pool: ArqRedis = app.state.arq_pool
    job = Job(job_id, pool)

    if await job.status() == "not_found":
        raise HTTPException(status_code=404, detail="Job not found")

    return {
        "job_id": job_id,
        "status": await job.status(),
        "result": await job.result(),
        "progress": await job.progress(),
    }

@app.get("/tasks/queue-size")
async def get_queue_size():
    pool: ArqPool = app.state.arq_pool
    queues = {}
    for queue_name in ["default", "email", "reports"]:
        queues[queue_name] = await pool.queues.queued_jobs(queue_name)
    return queues
```

## Key Points
- BackgroundTasks runs lightweight post-response functions in the same process
- Celery provides distributed task queues with retry, scheduling, and monitoring
- ARQ offers a lightweight async task queue using Redis
- APScheduler handles cron-based periodic tasks within the FastAPI process
- Task monitoring endpoints check job status, results, and queue sizes
- Background tasks are ideal for email sending, notifications, log writing
- Celery/ARQ tasks handle heavy processing like report generation, image processing
- Schedule cleanup, reporting, and health check tasks with cron triggers
- Lifecycle events (startup/shutdown) manage connection pools and scheduler
- Task retry with backoff handles transient failures gracefully
