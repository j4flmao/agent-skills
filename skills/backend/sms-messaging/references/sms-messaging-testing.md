# SMS Messaging Testing

## Overview
Testing SMS workflows requires validating message formatting, provider integration, rate limiting, opt-in/out compliance, and delivery status. Use simulators, test credentials, and integration test suites.

## Testing SMS with Twilio Test Credentials

```typescript
// Twilio test credentials (never use real credentials in tests)
const twilio = require('twilio');
const client = twilio('ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'test');

// Twilio test phone numbers
// +15005550006: Passes all requests
// +15005550001: Fails all requests (error 21611)
// +15005550002: Returns undelivered
// +15005550003: Message blocked for landline

async function testSending() {
  const message = await client.messages.create({
    to: '+15005550006',
    from: '+15005550006',
    body: 'Test message',
  });
  console.log(message.status); // 'queued'
}
```

## Unit Testing the Messaging Service

```typescript
// messaging.service.test.ts
import { MessagingService } from './messaging.service';

describe('MessagingService', () => {
  let service: MessagingService;
  let mockPrimary: jest.Mocked<MessageProvider>;
  let mockSecondary: jest.Mocked<MessageProvider>;

  beforeEach(() => {
    mockPrimary = { name: 'twilio', send: jest.fn(), getStatus: jest.fn(), getBalance: jest.fn() };
    mockSecondary = { name: 'sns', send: jest.fn(), getStatus: jest.fn(), getBalance: jest.fn() };
    service = new MessagingService(mockPrimary, mockSecondary);
  });

  it('sends via primary provider on success', async () => {
    mockPrimary.send.mockResolvedValue({ messageId: 'msg1', status: 'sent' });
    const result = await service.send({ to: '+1234567890', body: 'Hello', type: 'transactional' });
    expect(result.status).toBe('sent');
    expect(mockPrimary.send).toHaveBeenCalledTimes(1);
    expect(mockSecondary.send).not.toHaveBeenCalled();
  });

  it('fails over to secondary on primary failure', async () => {
    mockPrimary.send.mockRejectedValue(new Error('timeout'));
    mockSecondary.send.mockResolvedValue({ messageId: 'msg2', status: 'sent' });
    const result = await service.send({ to: '+1234567890', body: 'Hello', type: 'transactional' });
    expect(result.status).toBe('sent');
    expect(mockPrimary.send).toHaveBeenCalledTimes(1);
    expect(mockSecondary.send).toHaveBeenCalledTimes(1);
  });

  it('throws when all providers fail', async () => {
    mockPrimary.send.mockRejectedValue(new Error('timeout'));
    mockSecondary.send.mockRejectedValue(new Error('quota exceeded'));
    await expect(service.send({ to: '+1234567890', body: 'Hello', type: 'transactional' }))
      .rejects.toThrow('All message providers failed');
  });
});
```

## Testing OTP Flow

```typescript
// otp.service.test.ts
import { OTPService } from './otp.service';
import { OtpRecord } from './otp.model';

describe('OTPService', () => {
  let otpService: OTPService;
  let mockMessaging: jest.Mocked<MessagingService>;

  beforeEach(() => {
    mockMessaging = { send: jest.fn() } as any;
    otpService = new OTPService(mockMessaging);
  });

  it('generates and sends a 6-digit OTP', async () => {
    OtpRecord.findOne.mockResolvedValue(null);
    OtpRecord.create.mockResolvedValue({});
    mockMessaging.send.mockResolvedValue({ messageId: 'otp1', status: 'sent' });

    const result = await otpService.generateAndSend('user1', 'sms', '+1234567890');
    expect(result.expiresIn).toBe(300);
    expect(mockMessaging.send).toHaveBeenCalledWith(
      expect.objectContaining({ to: '+1234567890', type: 'otp' })
    );
  });

  it('enforces resend cooldown', async () => {
    OtpRecord.findOne.mockResolvedValue({ sentAt: new Date() });
    await expect(otpService.generateAndSend('user1', 'sms', '+1234567890'))
      .rejects.toThrow('Please wait');
  });

  it('verifies a valid OTP code', async () => {
    const hashedCode = await bcrypt.hash('123456', 10);
    OtpRecord.findOne.mockResolvedValue({
      hashedCode,
      expiresAt: new Date(Date.now() + 300000),
      verified: false,
      attemptsRemaining: 3,
      save: jest.fn(),
    });
    const result = await otpService.verify('user1', '123456');
    expect(result).toBe(true);
  });
});
```

## Integration Test with SMS Simulator

```yaml
# docker-compose.test.yml
services:
  sms-simulator:
    image: wiremock/wiremock:latest
    ports:
      - "8080:8080"
    volumes:
      - ./mocks/sms:/home/wiremock/mappings
```

```typescript
// sms-provider.integration.test.ts
describe('TwilioProvider Integration', () => {
  it('sends message and returns message ID', async () => {
    const provider = new TwilioProvider({
      accountSid: 'test',
      authToken: 'test',
      fromNumber: '+15005550006',
      baseUrl: 'http://localhost:8080', // WireMock endpoint
    });
    const result = await provider.send({
      to: '+1234567890',
      body: 'Integration test message',
    });
    expect(result.messageId).toBeDefined();
    expect(result.status).toBe('sent');
  });
});
```

## Testing Compliance Features

```typescript
describe('ConsentManager', () => {
  it('blocks sending to opted-out numbers', async () => {
    ConsentRecord.findOne.mockResolvedValue({
      phoneNumber: '+1234567890',
      channel: 'sms',
      status: 'opted_out',
    });
    const hasConsent = await consentManager.checkConsent('+1234567890', 'sms');
    expect(hasConsent).toBe(false);
  });

  it('processes STOP keyword opt-out', async () => {
    ConsentRecord.updateMany.mockResolvedValue({ modifiedCount: 1 });
    await consentManager.processInboundReply('+1234567890', 'STOP');
    expect(ConsentRecord.updateMany).toHaveBeenCalledWith(
      { phoneNumber: '+1234567890', status: 'opted_in' },
      { status: 'opted_out', optOutDate: expect.any(Date), optOutMethod: 'reply_stop' }
    );
  });
});
```

## Testing Rate Limiting

```typescript
describe('SmsRateLimiter', () => {
  let limiter: SmsRateLimiter;
  let mockRedis: jest.Mocked<Redis>;

  beforeEach(() => {
    mockRedis = { get: jest.fn(), incr: jest.fn(), expire: jest.fn(), pipeline: jest.fn() } as any;
    mockRedis.pipeline.mockReturnValue({ incr: jest.fn().mockReturnThis(), expire: jest.fn().mockReturnThis(), exec: jest.fn() });
    limiter = new SmsRateLimiter(mockRedis);
  });

  it('allows sending within limits', async () => {
    mockRedis.get.mockResolvedValue('0');
    const check = await limiter.checkLimit('+1234567890', '+1555111111');
    expect(check.allowed).toBe(true);
  });

  it('blocks when recipient limit exceeded', async () => {
    mockRedis.get.mockResolvedValue('5');
    const check = await limiter.checkLimit('+1234567890', '+1555111111');
    expect(check.allowed).toBe(false);
    expect(check.violations).toContain(expect.stringContaining('perRecipient'));
  });
});
```

## CI Pipeline Integration

```yaml
# .github/workflows/sms-tests.yml
name: SMS Tests
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    services:
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - run: npm ci
      - run: npm test -- --testPathPattern=sms
        env:
          TWILIO_ACCOUNT_SID: test
          TWILIO_AUTH_TOKEN: test
          REDIS_URL: redis://localhost:6379
```

## Key Points
- Use provider test credentials and phone numbers in test environments
- Mock provider interfaces for unit tests; use simulators for integration tests
- Test failover, rate limiting, OTP flow, and compliance features
- Run tests in CI with service containers for Redis, simulators
- Never use real credentials, real phone numbers, or production configurations in test suites
