# Two-Factor Authentication via SMS

## Overview
SMS-based two-factor authentication (2FA) sends one-time passcodes (OTP) via SMS as a second authentication factor. While SMS 2FA has known security limitations (SIM swapping, SS7 interception), it remains widely used due to universal phone coverage and ease of implementation.

## OTP Generation

### Code Generation

```python
import secrets
import string
from datetime import datetime, timedelta

class OTPGenerator:
    def __init__(self, length: int = 6,
                 validity_seconds: int = 300,
                 max_attempts: int = 3):
        self.length = length
        self.validity_seconds = validity_seconds
        self.max_attempts = max_attempts

    def generate(self) -> str:
        digits = string.digits
        otp = "".join(secrets.choice(digits) for _ in range(self.length))
        return otp

    def generate_alphanumeric(self) -> str:
        chars = string.digits + string.ascii_uppercase
        otp = "".join(secrets.choice(chars) for _ in range(self.length))
        return otp

class OTPRecord:
    def __init__(self, user_id: str, phone: str,
                 code: str, validity_seconds: int = 300):
        self.user_id = user_id
        self.phone = phone
        self.code = code
        self.attempts = 0
        self.max_attempts = 3
        self.created_at = datetime.utcnow()
        self.expires_at = datetime.utcnow() + timedelta(
            seconds=validity_seconds
        )
        self.verified = False

    @property
    def is_expired(self) -> bool:
        return datetime.utcnow() >= self.expires_at

    @property
    def is_blocked(self) -> bool:
        return self.attempts >= self.max_attempts

    def verify(self, input_code: str) -> bool:
        if self.is_expired:
            return False
        if self.is_blocked:
            return False
        self.attempts += 1
        if secrets.compare_digest(self.code, input_code):
            self.verified = True
            return True
        return False
```

### Time-Based One-Time Password

```python
import hmac
import hashlib
import struct
import time

class TOTPGenerator:
    def __init__(self, secret: bytes | None = None,
                 digits: int = 6, interval: int = 30):
        self.secret = secret or secrets.token_bytes(20)
        self.digits = digits
        self.interval = interval

    def generate(self, timestamp: int | None = None) -> str:
        if timestamp is None:
            timestamp = int(time.time())
        counter = timestamp // self.interval
        counter_bytes = struct.pack(">Q", counter)
        hmac_hash = hmac.new(
            self.secret, counter_bytes, hashlib.sha1
        ).digest()
        offset = hmac_hash[-1] & 0x0F
        truncated = struct.unpack(
            ">I", hmac_hash[offset:offset + 4]
        )[0] & 0x7FFFFFFF
        otp = truncated % (10 ** self.digits)
        return str(otp).zfill(self.digits)

    def verify(self, code: str,
               window: int = 1) -> bool:
        timestamp = int(time.time())
        for i in range(-window, window + 1):
            expected = self.generate(timestamp + i * self.interval)
            if hmac.compare_digest(code, expected):
                return True
        return False
```

## 2FA Flow

### Authentication Flow

```python
class SMS2FAService:
    def __init__(self, sms_provider: SMSProvider,
                 code_generator: OTPGenerator,
                 storage: OTPStorage):
        self.sms = sms_provider
        self.generator = code_generator
        self.storage = storage

    async def initiate_2fa(self, user_id: str,
                            phone: str) -> SendResult:
        existing = await self.storage.get_active(user_id)
        if existing:
            await self.storage.invalidate(existing)
        code = self.generator.generate()
        record = OTPRecord(user_id, phone, code)
        await self.storage.save(record)
        message = SMSMessage(
            id=str(uuid4()),
            to_number=phone,
            from_number="2FA-SVC",
            body=f"Your verification code is: {code}. "
                 f"Valid for {self.generator.validity_seconds // 60} minutes."
        )
        result = await self.sms.send(message)
        if result.status == MessageStatus.FAILED:
            await self.storage.invalidate(record)
            return SendResult(success=False,
                              error="Failed to send SMS")
        record.message_id = result.id
        await self.storage.update(record)
        return SendResult(success=True)

    async def verify_code(self, user_id: str,
                           code: str) -> VerificationResult:
        record = await self.storage.get_active(user_id)
        if not record:
            return VerificationResult(
                success=False, reason="no_code"
            )
        if record.is_expired:
            await self.storage.invalidate(record)
            return VerificationResult(
                success=False, reason="expired"
            )
        if record.is_blocked:
            return VerificationResult(
                success=False, reason="blocked"
            )
        if record.verify(code):
            await self.storage.mark_verified(record)
            return VerificationResult(success=True)
        return VerificationResult(
            success=False, reason="invalid_code",
            remaining_attempts=record.max_attempts - record.attempts
        )

    async def resend_code(self, user_id: str,
                           phone: str) -> SendResult:
        existing = await self.storage.get_active(user_id)
        if existing:
            code = existing.code
        else:
            code = self.generator.generate()
        message = SMSMessage(
            id=str(uuid4()),
            to_number=phone,
            from_number="2FA-SVC",
            body=f"Your verification code is: {code}. "
                 f"Valid for {self.generator.validity_seconds // 60} minutes."
        )
        result = await self.sms.send(message)
        if existing:
            existing.attempts = 0
            existing.code = code
            await self.storage.update(existing)
        return SendResult(success=result.status != MessageStatus.FAILED)
```

### Rate Limiting

```python
class TwoFARateLimiter:
    def __init__(self, redis_client,
                 max_per_phone: int = 5,
                 max_per_user: int = 10,
                 window_minutes: int = 15):
        self.redis = redis_client
        self.max_per_phone = max_per_phone
        self.max_per_user = max_per_user
        self.window = window_minutes * 60

    async def can_send(self, user_id: str,
                        phone: str) -> tuple[bool, str | None]:
        phone_key = f"2fa:phone:{phone}"
        user_key = f"2fa:user:{user_id}"
        phone_count = await self.redis.get(phone_key) or 0
        user_count = await self.redis.get(user_key) or 0
        if int(phone_count) >= self.max_per_phone:
            return False, "Phone rate limit exceeded"
        if int(user_count) >= self.max_per_user:
            return False, "User rate limit exceeded"
        return True, None

    async def record_send(self, user_id: str, phone: str):
        phone_key = f"2fa:phone:{phone}"
        user_key = f"2fa:user:{user_id}"
        async with self.redis.pipeline() as pipe:
            await pipe.incr(phone_key)
            await pipe.expire(phone_key, self.window)
            await pipe.incr(user_key)
            await pipe.expire(user_key, self.window)
            await pipe.execute()
```

## SMS Template

```python
class TwoFAMessageBuilder:
    def __init__(self, brand_name: str):
        self.brand_name = brand_name

    def build_verification_message(self, code: str,
                                    validity_minutes: int = 5) -> str:
        return (
            f"{self.brand_name}: Your verification code is {code}. "
            f"It expires in {validity_minutes} minutes. "
            f"Never share this code with anyone."
        )

    def build_login_alert(self, device: str,
                           location: str,
                           timestamp: str) -> str:
        return (
            f"{self.brand_name}: New login from "
            f"{device} in {location} at {timestamp}. "
            f"Not you? Change your password immediately."
        )

    def build_account_recovery(self, code: str) -> str:
        return (
            f"{self.brand_name}: Use code {code} to recover your account. "
            f"This code expires in 10 minutes. "
            f"If you did not request this, ignore this message."
        )
```

## Security Considerations

```python
class SMSSecurityValidator:
    def __init__(self, risk_engine: RiskEngine):
        self.risk = risk_engine

    async def validate_2fa_request(self, user_id: str,
                                    phone: str,
                                    request_context: dict) -> ValidationResult:
        flags = []
        if await self._is_suspicious_phone_change(user_id, phone):
            flags.append("phone_changed_recently")
        if self._is_high_risk_country(phone):
            flags.append("high_risk_country")
        risk_score = await self.risk.evaluate_2fa_risk(
            user_id, request_context
        )
        if risk_score > 70:
            flags.append("high_risk_context")
        return ValidationResult(
            is_allowed=len(flags) < 2,
            flags=flags,
            risk_score=risk_score
        )

    async def _is_suspicious_phone_change(self, user_id: str,
                                           phone: str) -> bool:
        user = await get_user(user_id)
        if user.phone != phone:
            return True
        phone_history = await get_phone_history(user_id)
        if len(phone_history) > 3:
            return True
        recent_changes = [
            h for h in phone_history
            if h.changed_at > datetime.utcnow() - timedelta(days=30)
        ]
        return len(recent_changes) > 1

    def _is_high_risk_country(self, phone: str) -> bool:
        high_risk = ["+222", "+252", "+98", "+93"]
        return any(phone.startswith(code) for code in high_risk)
```

## OTP Storage Schema

```sql
CREATE TABLE otp_codes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    phone VARCHAR(20) NOT NULL,
    code_hash VARCHAR(255) NOT NULL,
    attempts INTEGER DEFAULT 0,
    max_attempts INTEGER DEFAULT 3,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    expires_at TIMESTAMPTZ NOT NULL,
    verified_at TIMESTAMPTZ,
    invalidated_at TIMESTAMPTZ,
    message_id VARCHAR(255)
);

CREATE INDEX idx_otp_user_active ON otp_codes(user_id, verified_at, expires_at)
    WHERE verified_at IS NULL AND invalidated_at IS NULL;

CREATE TABLE twofa_attempts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id),
    phone VARCHAR(20) NOT NULL,
    ip_address INET,
    user_agent TEXT,
    success BOOLEAN NOT NULL,
    failure_reason VARCHAR(100),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_2fa_attempts_user ON twofa_attempts(user_id, created_at DESC);
CREATE INDEX idx_2fa_attempts_ip ON twofa_attempts(ip_address, created_at DESC);
```

## Key Points

- OTP codes should be generated using cryptographically secure random number generators (secrets module).
- Constant-time comparison (secrets.compare_digest / hmac.compare_digest) prevents timing attacks.
- Rate limiting prevents brute force attacks on both sending and verification endpoints.
- TOTP provides time-synchronized codes without SMS delivery delays using shared secrets.
- OTP codes must have short expiry (5 minutes) and limited verification attempts (3).
- Code hashing in storage protects against database breaches revealing active codes.
- Phone number change velocity detection flags potential account takeover via SIM swap.
- Rate limits should apply per phone number and per user with separate windows.
- SMS delivery failure tracking enables fallback to alternative 2FA methods (authenticator app, email).
- Audit logging of all 2FA attempts (successes and failures) supports security investigations.
