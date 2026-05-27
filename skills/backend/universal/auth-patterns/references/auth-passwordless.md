# Passwordless Authentication

## Overview
Implement passwordless authentication flows — magic links, OTP via email/SMS, WebAuthn/passkeys, and social login — reducing password-related security risks.

## Magic Link Authentication

```typescript
class MagicLinkAuth {
  private readonly TOKEN_TTL = 900; // 15 minutes
  private readonly TOKEN_LENGTH = 32;

  async requestMagicLink(email: string): Promise<void> {
    const token = crypto.randomBytes(this.TOKEN_LENGTH).toString('hex');
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    await MagicLinkToken.create({
      email,
      hashedToken,
      expiresAt: new Date(Date.now() + this.TOKEN_TTL * 1000),
      used: false,
    });

    await this.emailService.send({
      to: email,
      template: 'magic-link',
      data: {
        link: `${process.env.APP_URL}/auth/magic-link?token=${token}&email=${encodeURIComponent(email)}`,
        expiresIn: '15 minutes',
      },
    });
  }

  async verifyMagicLink(email: string, token: string): Promise<AuthResult> {
    const stored = await MagicLinkToken.findOne({
      email,
      expiresAt: { $gt: new Date() },
      used: false,
    }).sort({ createdAt: -1 });

    if (!stored) {
      return { success: false, error: 'TOKEN_INVALID' };
    }

    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');
    if (hashedToken !== stored.hashedToken) {
      return { success: false, error: 'TOKEN_MISMATCH' };
    }

    stored.used = true;
    await stored.save();

    const user = await this.findOrCreateUser(email);
    const session = await this.createSession(user);

    return { success: true, session, user };
  }
}
```

## OTP via Email/SMS

```typescript
class OtpAuth {
  private readonly OTP_LENGTH = 6;
  private readonly OTP_TTL = 300; // 5 minutes
  private readonly RESEND_COOLDOWN = 30; // seconds
  private readonly MAX_ATTEMPTS = 5;

  async requestOtp(identifier: string, channel: 'email' | 'sms'): Promise<void> {
    const recent = await OtpRecord.findOne({
      identifier,
      sentAt: { $gt: new Date(Date.now() - this.RESEND_COOLDOWN * 1000) },
    });

    if (recent) {
      throw new Error(`Please wait ${this.RESEND_COOLDOWN}s before requesting a new code`);
    }

    const otp = Array.from({ length: this.OTP_LENGTH }, () =>
      Math.floor(Math.random() * 10)
    ).join('');

    const hashedOtp = await bcrypt.hash(otp, 10);

    await OtpRecord.create({
      identifier,
      hashedOtp,
      channel,
      attemptsRemaining: this.MAX_ATTEMPTS,
      sentAt: new Date(),
      expiresAt: new Date(Date.now() + this.OTP_TTL * 1000),
    });

    if (channel === 'email') {
      await this.emailService.send({
        to: identifier,
        template: 'otp',
        data: { otp, expiresIn: '5 minutes' },
      });
    } else {
      await this.smsService.send({
        to: identifier,
        body: `Your verification code is: ${otp}. Expires in 5 minutes.`,
      });
    }
  }

  async verifyOtp(identifier: string, otp: string): Promise<AuthResult> {
    const record = await OtpRecord.findOne({
      identifier,
      expiresAt: { $gt: new Date() },
      verified: false,
    }).sort({ sentAt: -1 });

    if (!record) return { success: false, error: 'OTP_NOT_FOUND' };
    if (record.attemptsRemaining <= 0) return { success: false, error: 'OTP_EXPIRED' };

    const isValid = await bcrypt.compare(otp, record.hashedOtp);
    if (!isValid) {
      record.attemptsRemaining -= 1;
      await record.save();
      return { success: false, error: 'OTP_MISMATCH', attemptsRemaining: record.attemptsRemaining };
    }

    record.verified = true;
    await record.save();

    const user = await this.findOrCreateUser(identifier);
    const session = await this.createSession(user);
    return { success: true, session, user };
  }
}
```

## WebAuthn / Passkeys

```typescript
class WebAuthnAuth {
  private readonly RP_NAME = 'YourApp';
  private readonly RP_ID = 'yourdomain.com';

  async initiateRegistration(userId: string, userName: string): Promise<PublicKeyCredentialCreationOptions> {
    const challenge = crypto.randomBytes(32);
    const options: PublicKeyCredentialCreationOptions = {
      challenge,
      rp: { name: this.RP_NAME, id: this.RP_ID },
      user: {
        id: new TextEncoder().encode(userId),
        name: userName,
        displayName: userName,
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },   // ES256
        { type: 'public-key', alg: -257 },  // RS256
      ],
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        residentKey: 'required',
        userVerification: 'required',
      },
      timeout: 60000,
    };

    // Store challenge for verification
    await WebAuthnChallenge.create({
      userId,
      challenge: Buffer.from(challenge).toString('hex'),
      type: 'registration',
      expiresAt: new Date(Date.now() + 120000),
    });

    return options;
  }

  async verifyRegistration(userId: string, credential: any): Promise<boolean> {
    // Verify authenticator response against stored challenge
    const stored = await WebAuthnChallenge.findOne({
      userId,
      type: 'registration',
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!stored) return false;

    // Store credential for future authentication
    await WebAuthnCredential.create({
      userId,
      credentialId: credential.id,
      publicKey: credential.response.publicKey,
      counter: credential.response.counter,
      transports: credential.response.transports,
      createdAt: new Date(),
    });

    stored.used = true;
    await stored.save();
    return true;
  }

  async authenticate(userId: string): Promise<AuthResult> {
    const credentials = await WebAuthnCredential.find({ userId });
    if (credentials.length === 0) {
      return { success: false, error: 'NO_CREDENTIALS' };
    }

    const challenge = crypto.randomBytes(32);
    // Return assertion options to client
    return {
      success: true,
      assertionOptions: {
        challenge,
        allowCredentials: credentials.map(c => ({
          type: 'public-key',
          id: c.credentialId,
        })),
        userVerification: 'required',
        timeout: 60000,
      },
    };
  }
}
```

## Social Login (OAuth)

```typescript
class SocialAuth {
  async handleOAuthCallback(provider: string, code: string): Promise<AuthResult> {
    // Exchange code for tokens
    const tokens = await this.exchangeCode(provider, code);
    const profile = await this.getProfile(provider, tokens.accessToken);

    // Find or create user by provider + providerId
    const existingLink = await SocialLogin.findOne({
      provider,
      providerId: profile.id,
    });

    let user;
    if (existingLink) {
      user = await User.findById(existingLink.userId);
    } else {
      user = await User.create({
        email: profile.email,
        name: profile.name,
        emailVerified: profile.emailVerified,
      });
      await SocialLogin.create({
        userId: user.id,
        provider,
        providerId: profile.id,
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.expiresAt ? new Date(tokens.expiresAt) : null,
      });
    }

    const session = await this.createSession(user);
    return { success: true, session, user };
  }
}
```

## Key Points
- Magic links: single-use tokens with 15-minute TTL, hash before storage
- OTP: 6-digit codes with bcrypt hashing, 5-minute TTL, rate-limit resends
- WebAuthn/passkeys: platform-bound credentials with user verification
- Social login: link provider accounts to user profiles, handle token refresh
- Always rate-limit passwordless auth endpoints to prevent enumeration
