# Report Distribution and Delivery

## Delivery Channels

### Channel Comparison

| Channel | Latency | Reliability | Payload Size | Use Case |
|---------|---------|-------------|-------------|----------|
| Email | Minutes | Medium | < 25MB | Scheduled reports |
| API Download | Instant | High | Unlimited | On-demand reports |
| Webhook | Seconds | Medium | < 10MB | Event-triggered |
| S3/Cloud Storage | Minutes | High | Unlimited | Large archives |
| Slack/Teams | Seconds | Low | < 5MB | Quick summaries |
| FTP/SFTP | Minutes | High | Unlimited | Batch processing |

## Email Delivery

### Email Report Sender
```python
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email.mime.text import MIMEText
from email import encoders
from dataclasses import dataclass

@dataclass
class EmailAttachment:
    filename: str
    content: bytes
    mime_type: str

class EmailReportDelivery:
    def __init__(self, smtp_config: dict):
        self.smtp_host = smtp_config["host"]
        self.smtp_port = smtp_config["port"]
        self.username = smtp_config["username"]
        self.password = smtp_config["password"]
        self.use_tls = smtp_config.get("use_tls", True)

    def send_report(
        self,
        to: list[str],
        subject: str,
        html_body: str,
        attachments: list[EmailAttachment] = None,
        cc: list[str] = None,
        bcc: list[str] = None,
    ):
        msg = MIMEMultipart("mixed")
        msg["From"] = self.username
        msg["To"] = ", ".join(to)
        msg["Subject"] = subject

        if cc:
            msg["Cc"] = ", ".join(cc)
        if bcc:
            msg["Bcc"] = ", ".join(bcc)

        # HTML body
        msg.attach(MIMEText(html_body, "html"))

        # Text alternative
        text_part = MIMEText("This email requires HTML support.", "plain")
        msg.attach(text_part)

        # Attachments
        if attachments:
            for attachment in attachments:
                part = MIMEBase(
                    *attachment.mime_type.split("/", 1)
                )
                part.set_payload(attachment.content)
                encoders.encode_base64(part)
                part.add_header(
                    "Content-Disposition",
                    f"attachment; filename={attachment.filename}",
                )
                msg.attach(part)

        # Send
        with smtplib.SMTP(self.smtp_host, self.smtp_port) as server:
            if self.use_tls:
                server.starttls()
            if self.username:
                server.login(self.username, self.password)
            server.send_message(msg)
```

## API Delivery

### Signed URL Generation
```python
import hmac
import hashlib
import time
import base64
from urllib.parse import urlencode

class SecureReportUrl:
    def __init__(self, secret_key: str, base_url: str):
        self.secret_key = secret_key.encode()
        self.base_url = base_url

    def generate_download_url(
        self,
        report_id: str,
        user_id: str,
        expires_in: int = 3600,
    ) -> str:
        expires = int(time.time()) + expires_in
        payload = f"{report_id}:{user_id}:{expires}"
        signature = hmac.new(
            self.secret_key,
            payload.encode(),
            hashlib.sha256,
        ).hexdigest()

        params = urlencode({
            "token": base64.urlsafe_b64encode(payload.encode()).decode(),
            "sig": signature,
        })

        return f"{self.base_url}/reports/{report_id}/download?{params}"

    def verify_download_url(self, token: str, signature: str) -> bool:
        try:
            decoded = base64.urlsafe_b64decode(token).decode()
            report_id, user_id, expires = decoded.split(":")
            expected_sig = hmac.new(
                self.secret_key,
                decoded.encode(),
                hashlib.sha256,
            ).hexdigest()

            if not hmac.compare_digest(signature, expected_sig):
                return False

            if int(time.time()) > int(expires):
                return False

            return True
        except Exception:
            return False
```

### API Endpoint
```python
from fastapi import FastAPI, HTTPException, Depends
from fastapi.responses import FileResponse, StreamingResponse

app = FastAPI()

@app.get("/reports/{report_id}/download")
async def download_report(
    report_id: str,
    token: str,
    sig: str,
    format: str = "pdf",
    url_service: SecureReportUrl = Depends(get_url_service),
):
    if not url_service.verify_download_url(token, sig):
        raise HTTPException(status_code=403, detail="Invalid or expired link")

    report_path = await generate_report(report_id, format)

    if format == "pdf":
        media_type = "application/pdf"
    elif format == "xlsx":
        media_type = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    else:
        media_type = "text/csv"

    return FileResponse(
        report_path,
        media_type=media_type,
        filename=f"report_{report_id}.{format}",
    )

@app.get("/reports/{report_id}/stream")
async def stream_report(report_id: str, format: str = "csv"):
    async def generate():
        async for chunk in generate_report_stream(report_id, format):
            yield chunk

    return StreamingResponse(
        generate(),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=report_{report_id}.csv",
        },
    )
```

## Storage Integration

### S3 Upload
```python
import boto3
from botocore.config import Config

class S3ReportStorage:
    def __init__(self, bucket: str, prefix: str = "reports/"):
        self.client = boto3.client(
            "s3",
            config=Config(
                retries={"max_attempts": 3, "mode": "adaptive"},
            ),
        )
        self.bucket = bucket
        self.prefix = prefix

    def upload_report(
        self,
        report_id: str,
        file_path: str,
        format: str = "pdf",
    ) -> str:
        key = f"{self.prefix}{report_id}.{format}"
        extra_args = {}

        if format == "pdf":
            extra_args["ContentType"] = "application/pdf"
        elif format == "xlsx":
            extra_args["ContentType"] = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"

        self.client.upload_file(
            file_path,
            self.bucket,
            key,
            ExtraArgs=extra_args,
        )

        return key

    def get_presigned_url(
        self,
        key: str,
        expires_in: int = 3600,
    ) -> str:
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires_in,
        )

    def delete_old_reports(self, retention_days: int = 30):
        response = self.client.list_objects_v2(
            Bucket=self.bucket,
            Prefix=self.prefix,
        )

        for obj in response.get("Contents", []):
            age = (datetime.now() - obj["LastModified"]).days
            if age > retention_days:
                self.client.delete_object(
                    Bucket=self.bucket,
                    Key=obj["Key"],
                )
```

## Report Permissions

### Permission Model
```python
from enum import Enum
from dataclasses import dataclass

class ReportPermission(Enum):
    VIEW = "view"
    DOWNLOAD = "download"
    SCHEDULE = "schedule"
    SHARE = "share"
    DELETE = "delete"

@dataclass
class ReportAccess:
    report_id: str
    user_id: str
    permissions: list[ReportPermission]
    expires_at: datetime = None

class ReportPermissionService:
    def __init__(self, db):
        self.db = db

    async def check_access(
        self,
        report_id: str,
        user_id: str,
        required: ReportPermission,
    ) -> bool:
        access = await self.get_user_access(report_id, user_id)
        if not access:
            return False
        if access.expires_at and access.expires_at < datetime.now():
            return False
        return required in access.permissions

    async def grant_access(
        self,
        report_id: str,
        user_id: str,
        permissions: list[ReportPermission],
        expires_in: int = None,
    ):
        access = ReportAccess(
            report_id=report_id,
            user_id=user_id,
            permissions=permissions,
            expires_at=(
                datetime.now() + timedelta(seconds=expires_in)
                if expires_in else None
            ),
        )
        await self.db.save(access)
```

## Notification on Completion

### Webhook Notifications
```python
import httpx
from dataclasses import dataclass

@dataclass
class ReportCompletionEvent:
    report_id: str
    title: str
    format: str
    size_bytes: int
    download_url: str
    generated_at: datetime

class ReportWebhookNotifier:
    def __init__(self):
        self.client = httpx.AsyncClient(timeout=10)

    async def notify(self, webhook_url: str, event: ReportCompletionEvent):
        payload = {
            "event": "report.completed",
            "data": {
                "report_id": event.report_id,
                "title": event.title,
                "format": event.format,
                "size": event.size_bytes,
                "download_url": event.download_url,
                "generated_at": event.generated_at.isoformat(),
            },
        }

        try:
            response = await self.client.post(webhook_url, json=payload)
            response.raise_for_status()
        except Exception as e:
            logger.error(f"Failed to notify webhook {webhook_url}: {e}")
```

## Delivery Scheduling

### Scheduled Delivery
```python
from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger

class ReportDeliveryScheduler:
    def __init__(self, scheduler: AsyncIOScheduler):
        self.scheduler = scheduler

    def schedule_delivery(
        self,
        report_id: str,
        cron_expression: str,
        channels: list[str],
        recipients: list[str],
    ):
        self.scheduler.add_job(
            self.deliver_report,
            CronTrigger.from_crontab(cron_expression),
            args=[report_id, channels, recipients],
            id=f"delivery_{report_id}",
            replace_existing=True,
        )

    async def deliver_report(
        self,
        report_id: str,
        channels: list[str],
        recipients: list[str],
    ):
        report = await generate_report(report_id)

        for channel in channels:
            if channel == "email":
                for recipient in recipients:
                    await self.email_delivery.send_report(
                        [recipient],
                        f"Report: {report.title}",
                        report.html_body,
                        report.attachments,
                    )
            elif channel == "s3":
                key = await self.s3_storage.upload_report(
                    report_id, report.file_path
                )
                url = self.s3_storage.get_presigned_url(key)

            elif channel == "webhook":
                for webhook_url in recipients:
                    await self.webhook_notifier.notify(
                        webhook_url,
                        ReportCompletionEvent(
                            report_id=report_id,
                            title=report.title,
                            format=report.format,
                            size_bytes=report.size,
                            download_url=url,
                            generated_at=datetime.now(),
                        ),
                    )
```

## Key Points
- Multiple delivery channels: email, API, webhook, cloud storage, messaging
- Email delivery with attachments supports HTML body and text fallback
- Signed URLs provide secure, time-limited report downloads
- Streaming large reports avoids memory issues
- S3 integration with presigned URLs for scalable report distribution
- Permission-based access controls report visibility per user
- Webhook notifications enable automated downstream processing
- Scheduled delivery with cron expressions automates recurring distribution
- Retention policies automatically archive or delete old reports
- Delivery logs track distribution history for audit purposes
