# WhatsApp API

## Overview
WhatsApp Business API enables programmatic messaging on the WhatsApp platform. It supports template-based outbound messaging (notifications, alerts) and free-form conversational messaging (customer support, order updates) within the 24-hour customer service window.

## API Integration

### Cloud API Client

```python
from dataclasses import dataclass, field
from datetime import datetime
from enum import Enum

class MessageType(Enum):
    TEXT = "text"
    TEMPLATE = "template"
    IMAGE = "image"
    DOCUMENT = "document"
    AUDIO = "audio"
    VIDEO = "video"
    STICKER = "sticker"
    LOCATION = "location"
    CONTACTS = "contacts"
    INTERACTIVE = "interactive"

class WhatsAppMessage:
    id: str
    to_number: str
    message_type: MessageType
    content: dict
    template_name: str | None = None
    template_params: dict = field(default_factory=dict)
    status: str = "pending"
    wa_message_id: str = ""
    created_at: datetime = field(default_factory=datetime.utcnow)

class WhatsAppCloudAPI:
    def __init__(self, phone_number_id: str, token: str,
                 api_version: str = "v17.0"):
        self.phone_number_id = phone_number_id
        self.token = token
        self.base_url = (
            f"https://graph.facebook.com/{api_version}"
            f"/{phone_number_id}/messages"
        )

    async def send_text(self, to: str, body: str,
                         preview_url: bool = False) -> WhatsAppMessage:
        msg = WhatsAppMessage(
            to_number=to, message_type=MessageType.TEXT,
            content={"body": body, "preview_url": preview_url}
        )
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "text",
            "text": {"body": body, "preview_url": preview_url}
        }
        return await self._send(payload, msg)

    async def send_template(self, to: str, template_name: str,
                             language: str = "en",
                             params: list[dict] | None = None
                             ) -> WhatsAppMessage:
        components = []
        if params:
            components.append({
                "type": "body",
                "parameters": params
            })
        msg = WhatsAppMessage(
            to_number=to, message_type=MessageType.TEMPLATE,
            template_name=template_name,
            template_params={"language": language, "params": params}
        )
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "template",
            "template": {
                "name": template_name,
                "language": {"code": language},
                "components": components
            }
        }
        return await self._send(payload, msg)

    async def send_interactive(self, to: str,
                                interactive: dict) -> WhatsAppMessage:
        msg = WhatsAppMessage(
            to_number=to, message_type=MessageType.INTERACTIVE,
            content=interactive
        )
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "interactive",
            "interactive": interactive
        }
        return await self._send(payload, msg)

    async def send_image(self, to: str, image_url: str,
                          caption: str = "") -> WhatsAppMessage:
        payload = {
            "messaging_product": "whatsapp",
            "recipient_type": "individual",
            "to": to,
            "type": "image",
            "image": {"link": image_url, "caption": caption}
        }
        return await self._send(payload, WhatsAppMessage(
            to_number=to, message_type=MessageType.IMAGE,
            content={"url": image_url, "caption": caption}
        ))

    async def _send(self, payload: dict,
                     msg: WhatsAppMessage) -> WhatsAppMessage:
        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.base_url,
                headers={
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/json"
                },
                json=payload
            ) as resp:
                if resp.status == 200:
                    data = await resp.json()
                    msg.wa_message_id = data.get("messages", [{}])[0].get("id", "")
                    msg.status = "sent"
                elif resp.status == 401:
                    msg.status = "failed"
                    raise WhatsAppAuthError("Invalid token")
                else:
                    error_data = await resp.json()
                    msg.status = "failed"
                    raise WhatsAppAPIError(
                        error_data.get("error", {}).get("message", "Unknown error")
                    )
        return msg
```

## Template Management

```python
class WhatsAppTemplateManager:
    def __init__(self, waba_id: str, token: str,
                 api_version: str = "v17.0"):
        self.waba_id = waba_id
        self.token = token
        self.base_url = (
            f"https://graph.facebook.com/{api_version}"
            f"/{waba_id}/message_templates"
        )

    async def create_template(self, name: str, category: str,
                               body_text: str,
                               header: dict | None = None,
                               footer: str | None = None,
                               buttons: list[dict] | None = None
                               ) -> dict:
        components = [{"type": "BODY", "text": body_text}]
        if header:
            components.insert(0, header)
        if footer:
            components.append({"type": "FOOTER", "text": footer})
        if buttons:
            components.append({"type": "BUTTONS", "buttons": buttons})

        payload = {
            "name": name,
            "language": "en",
            "category": category,
            "components": components
        }
        async with aiohttp.ClientSession() as session:
            async with session.post(
                self.base_url,
                headers={
                    "Authorization": f"Bearer {self.token}",
                    "Content-Type": "application/json"
                },
                json=payload
            ) as resp:
                data = await resp.json()
                if resp.status == 200:
                    return data
                raise WhatsAppTemplateError(
                    data.get("error", {}).get("message", "Template creation failed")
                )

    async def get_templates(self, status: str | None = None) -> list[dict]:
        params = {}
        if status:
            params["status"] = status
        async with aiohttp.ClientSession() as session:
            async with session.get(
                self.base_url, params=params,
                headers={"Authorization": f"Bearer {self.token}"}
            ) as resp:
                data = await resp.json()
                return data.get("data", [])

    async def delete_template(self, template_id: str):
        url = f"{self.base_url}/{template_id}"
        async with aiohttp.ClientSession() as session:
            async with session.delete(
                url,
                headers={"Authorization": f"Bearer {self.token}"}
            ) as resp:
                if resp.status != 200:
                    raise WhatsAppTemplateError("Failed to delete template")
```

## Webhook Handling

```python
class WhatsAppWebhookHandler:
    def __init__(self, message_handler: callable,
                 status_handler: callable):
        self.message_handler = message_handler
        self.status_handler = status_handler

    async def verify(self, request: WebhookRequest) -> str:
        mode = request.query.get("hub.mode")
        token = request.query.get("hub.verify_token")
        challenge = request.query.get("hub.challenge")
        if mode == "subscribe" and token == self.verify_token:
            return challenge
        raise WhatsAppVerificationError("Invalid verify token")

    async def handle_callback(self, payload: dict):
        for entry in payload.get("entry", []):
            for change in entry.get("changes", []):
                value = change.get("value", {})
                for msg in value.get("messages", []):
                    await self._process_message(msg, value)
                for status in value.get("statuses", []):
                    await self._process_status(status)

    async def _process_message(self, msg: dict, value: dict):
        message_type = msg.get("type")
        from_number = msg.get("from")
        wa_message_id = msg.get("id")
        timestamp = msg.get("timestamp")

        content = {}
        if message_type == "text":
            content["body"] = msg["text"]["body"]
        elif message_type == "interactive":
            content = msg["interactive"]
        elif message_type == "button":
            content = msg["button"]

        inbound = InboundMessage(
            source="whatsapp",
            from_number=from_number,
            wa_message_id=wa_message_id,
            message_type=message_type,
            content=content,
            profile_name=value.get("contacts", [{}])[0].get("profile", {}).get("name", ""),
            received_at=datetime.utcfromtimestamp(int(timestamp))
        )
        await self.message_handler(inbound)

    async def _process_status(self, status: dict):
        status_update = StatusUpdate(
            wa_message_id=status.get("id"),
            status=status.get("status"),
            timestamp=datetime.utcfromtimestamp(int(status.get("timestamp", 0))),
            error=status.get("errors", [{}])[0] if status.get("errors") else None
        )
        await self.status_handler(status_update)
```

## Interactive Messages

```python
class InteractiveMessageBuilder:
    @staticmethod
    def reply_buttons(body: str, buttons: list[dict]) -> dict:
        return {
            "type": "button",
            "body": {"text": body},
            "action": {
                "buttons": [
                    {
                        "type": "reply",
                        "reply": {"id": btn["id"], "title": btn["title"]}
                    }
                    for btn in buttons
                ]
            }
        }

    @staticmethod
    def list_message(body: str, button_text: str,
                     sections: list[dict]) -> dict:
        return {
            "type": "list",
            "body": {"text": body},
            "action": {
                "button": button_text,
                "sections": sections
            }
        }

    @staticmethod
    def quick_reply(header: str, body: str,
                    options: list[dict]) -> dict:
        return {
            "type": "button",
            "header": {"type": "text", "text": header},
            "body": {"text": body},
            "action": {
                "buttons": [
                    {
                        "type": "reply",
                        "reply": {"id": opt["id"], "title": opt["title"]}
                    }
                    for opt in options
                ]
            }
        }

    @staticmethod
    def flow_message(body: str, flow_id: str,
                     flow_data: dict) -> dict:
        return {
            "type": "flow",
            "body": {"text": body},
            "action": {
                "name": "flow",
                "parameters": {
                    "flow_message_version": "3",
                    "flow_token": str(uuid4()),
                    "flow_id": flow_id,
                    "flow_cta": "Continue",
                    "flow_action": "navigate",
                    "flow_action_payload": {"screen": "INITIAL"},
                    "data": flow_data
                }
            }
        }
```

## Rate Limiting

```python
class WhatsAppRateLimiter:
    def __init__(self, messages_per_second: int = 80,
                 messages_per_day: int = 250000):
        self.rate_per_sec = messages_per_second
        self.daily_limit = messages_per_day
        self.tokens = messages_per_second
        self.daily_count = 0
        self.last_refill = datetime.utcnow()
        self.daily_reset = datetime.utcnow().replace(
            hour=0, minute=0, second=0, microsecond=0
        )

    async def acquire(self):
        await self._refill()
        if self.daily_count >= self.daily_limit:
            raise DailyLimitExceededError(
                f"Daily limit of {self.daily_limit} reached"
            )
        if self.tokens <= 0:
            wait_time = 1 / self.rate_per_sec
            await asyncio.sleep(wait_time)
        self.tokens -= 1
        self.daily_count += 1

    async def _refill(self):
        now = datetime.utcnow()
        elapsed = (now - self.last_refill).total_seconds()
        refill = int(elapsed * self.rate_per_sec)
        if refill > 0:
            self.tokens = min(self.tokens + refill, self.rate_per_sec)
            self.last_refill = now
        if now.date() > self.daily_reset.date():
            self.daily_count = 0
            self.daily_reset = now.replace(
                hour=0, minute=0, second=0, microsecond=0
            )
```

## Key Points

- WhatsApp Cloud API provides REST endpoints for sending text, template, image, and interactive messages.
- Message templates require pre-approval by Meta for outbound notifications outside the 24-hour session.
- Interactive messages support reply buttons, lists, quick replies, and data collection flows.
- Webhooks deliver real-time inbound messages and delivery status updates.
- Template management includes creation, approval status tracking, and deletion via the Graph API.
- Rate limits apply per second (80 msg/s default) and per day (250K default) per phone number.
- Business verification is required for production access with higher rate limits.
- The 24-hour customer service window allows free-form messaging after a user-initiated conversation.
- Opt-in management tracks user consent and prevents unsolicited outbound messages.
