# MJML Email Templates

## Overview
MJML is a markup language designed to reduce the pain of coding responsive email layouts. It abstracts the complexities of email client compatibility and provides a component-based approach to email template development.

## MJML Fundamentals

### Basic Template Structure

```mjml
<mjml>
  <mj-head>
    <mj-title>Email Title</mj-title>
    <mj-preview>Preheader text appears after subject line</mj-preview>
    <mj-attributes>
      <mj-all font-family="Inter, Arial, Helvetica, sans-serif" />
      <mj-class name="heading" font-size="24px" font-weight="bold" color="#1a1a1a" line-height="1.3" />
      <mj-class name="body-text" font-size="16px" color="#555555" line-height="1.6" />
      <mj-class name="link" color="#0066ff" text-decoration="underline" />
    </mj-attributes>
    <mj-style inline="inline">
      .hover-button:hover { background-color: #0052cc !important; }
      .responsive-img { max-width: 100%; height: auto; }
      @media only screen and (max-width: 480px) {
        .mobile-stack { display: block !important; width: 100% !important; }
      }
    </mj-style>
  </mj-head>

  <mj-body background-color="#f4f4f6">
    <mj-section background-color="#ffffff" padding="40px 24px">
      <mj-column>
        <mj-image src="https://yourdomain.com/logo.png" alt="Company Logo" width="150px" padding-bottom="20px" />
        <mj-text mj-class="heading" padding-bottom="16px">
          Welcome to Our Platform
        </mj-text>
        <mj-text mj-class="body-text" padding-bottom="24px">
          Hi {{firstName}},<br/><br/>
          We're thrilled to have you on board. Your account has been successfully created and you're ready to explore all the features our platform has to offer.
        </mj-text>
        <mj-button href="{{actionUrl}}" background-color="#0066ff" border-radius="8px" font-size="16px" font-weight="600" inner-padding="14px 32px" css-class="hover-button">
          Get Started
        </mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

## Component Library

### Header Component

```mjml
<mjml>
  <mj-head>
    <mj-attributes>
      <mj-all font-family="Inter, Arial, sans-serif" />
    </mj-attributes>
  </mj-head>
  <mj-section background-color="#1a1a1a" padding="20px 24px">
    <mj-column>
      <mj-image src="{{logoUrl}}" alt="{{companyName}}" width="120px" />
    </mj-column>
    <mj-column>
      <mj-text color="#ffffff" font-size="12px" align="right">
        <a href="{{webmailUrl}}" style="color: #999999; text-decoration: none;">View in browser</a>
      </mj-text>
    </mj-column>
  </mj-section>
</mjml>
```

### Footer Component

```mjml
<mjml>
  <mj-section background-color="#f8f8f8" padding="32px 24px">
    <mj-column>
      <mj-text font-size="12px" color="#999999" align="center" line-height="1.5">
        <p>© {{year}} {{companyName}}. All rights reserved.</p>
        <p>{{companyAddress}}</p>
        <p>
          <a href="{{unsubscribeUrl}}" style="color: #999999; text-decoration: underline;">Unsubscribe</a> |
          <a href="{{privacyUrl}}" style="color: #999999; text-decoration: underline;">Privacy Policy</a>
        </p>
      </mj-text>
      <mj-divider border-width="1px" border-color="#e0e0e0" padding="16px 0" />
      <mj-text font-size="11px" color="#bbbbbb" align="center">
        <p>You're receiving this because you signed up for {{companyName}}. If you'd prefer not to receive these emails, you can <a href="{{unsubscribeUrl}}" style="color: #bbbbbb;">unsubscribe here</a>.</p>
      </mj-text>
    </mj-column>
  </mj-section>
</mjml>
```

## Transactional Template Patterns

### Welcome Email

```mjml
<mjml>
  <mj-head>
    <mj-title>Welcome to {{productName}}</mj-title>
    <mj-preview>Start your journey with us</mj-preview>
    <mj-attributes>
      <mj-all font-family="Inter, Arial, sans-serif" />
    </mj-attributes>
  </mj-head>
  <mj-body background-color="#f4f4f6">
    <!-- Hero Section -->
    <mj-section background-color="#0066ff" padding="60px 24px" background-url="{{heroImageUrl}}" background-size="cover">
      <mj-column>
        <mj-text font-size="36px" font-weight="800" color="#ffffff" align="center" padding-bottom="8px">
          Welcome, {{firstName}}!
        </mj-text>
        <mj-text font-size="18px" color="rgba(255,255,255,0.9)" align="center" padding-bottom="32px">
          You've taken the first step toward {{benefitPhrase}}
        </mj-text>
        <mj-button href="{{actionUrl}}" background-color="#ffffff" color="#0066ff" border-radius="8px" font-size="16px" font-weight="700" inner-padding="14px 40px">
          Explore Dashboard
        </mj-button>
      </mj-column>
    </mj-section>

    <!-- Features Section -->
    <mj-section background-color="#ffffff" padding="40px 24px">
      <mj-column>
        <mj-text font-size="20px" font-weight="700" color="#1a1a1a" padding-bottom="24px">
          Here's what you can do
        </mj-text>
      </mj-column>
    </mj-section>
    <mj-section background-color="#ffffff" padding="0 24px 40px">
      <mj-column width="33.33%" padding="8px">
        <mj-image src="{{feature1Icon}}" width="48px" padding-bottom="12px" />
        <mj-text font-size="16px" font-weight="600" color="#1a1a1a" align="center" padding-bottom="4px">
          {{feature1Title}}
        </mj-text>
        <mj-text font-size="14px" color="#666666" align="center">
          {{feature1Description}}
        </mj-text>
      </mj-column>
      <mj-column width="33.33%" padding="8px">
        <mj-image src="{{feature2Icon}}" width="48px" padding-bottom="12px" />
        <mj-text font-size="16px" font-weight="600" color="#1a1a1a" align="center" padding-bottom="4px">
          {{feature2Title}}
        </mj-text>
        <mj-text font-size="14px" color="#666666" align="center">
          {{feature2Description}}
        </mj-text>
      </mj-column>
      <mj-column width="33.33%" padding="8px">
        <mj-image src="{{feature3Icon}}" width="48px" padding-bottom="12px" />
        <mj-text font-size="16px" font-weight="600" color="#1a1a1a" align="center" padding-bottom="4px">
          {{feature3Title}}
        </mj-text>
        <mj-text font-size="14px" color="#666666" align="center">
          {{feature3Description}}
        </mj-text>
      </mj-column>
    </mj-section>

    <!-- CTA Section -->
    <mj-section background-color="#f8f9fa" padding="40px 24px" border-radius="12px">
      <mj-column>
        <mj-text font-size="18px" color="#1a1a1a" align="center" padding-bottom="16px">
          Need help getting started? Our support team is here for you.
        </mj-text>
        <mj-button href="{{supportUrl}}" background-color="transparent" color="#0066ff" border="2px solid #0066ff" border-radius="8px" font-size="14px" inner-padding="10px 24px">
          Contact Support
        </mj-button>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

### Password Reset Email

```mjml
<mjml>
  <mj-head>
    <mj-title>Reset your {{productName}} password</mj-title>
    <mj-preview>You requested a password reset</mj-preview>
  </mj-head>
  <mj-body background-color="#f4f4f6">
    <mj-section background-color="#ffffff" padding="48px 24px" border-radius="12px">
      <mj-column>
        <mj-image src="https://yourdomain.com/lock-icon.png" width="64px" padding-bottom="24px" />
        <mj-text font-size="24px" font-weight="700" color="#1a1a1a" align="center" padding-bottom="8px">
          Reset Your Password
        </mj-text>
        <mj-text font-size="16px" color="#666666" align="center" padding-bottom="24px">
          We received a request to reset the password for your account.<br/>
          Click the button below to create a new password.
        </mj-text>

        <!-- Warning box -->
        <mj-section background-color="#fff8e1" border-radius="8px" padding="16px">
          <mj-column>
            <mj-text font-size="13px" color="#8d6e00" align="center">
              This link expires in 60 minutes. If you didn't request a password reset, please ignore this email.
            </mj-text>
          </mj-column>
        </mj-section>

        <mj-button href="{{resetUrl}}" background-color="#0066ff" border-radius="8px" font-size="16px" font-weight="600" inner-padding="14px 40px" padding="32px 0 0">
          Reset Password
        </mj-button>

        <mj-text font-size="14px" color="#999999" align="center" padding-top="24px">
          Or copy and paste this link into your browser:<br/>
          <a href="{{resetUrl}}" style="color: #0066ff; word-break: break-all;">{{resetUrl}}</a>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

### Invoice/Receipt Email

```mjml
<mjml>
  <mj-head>
    <mj-title>Invoice from {{companyName}}</mj-title>
    <mj-preview>Your receipt for {{amount}}</mj-preview>
  </mj-head>
  <mj-body background-color="#f4f4f6">
    <mj-section background-color="#ffffff" padding="40px 24px">
      <mj-column>
        <mj-text font-size="24px" font-weight="700" color="#1a1a1a">
          Invoice #{{invoiceNumber}}
        </mj-text>
        <mj-text font-size="14px" color="#666666" padding-bottom="24px">
          {{companyName}} | {{invoiceDate}}
        </mj-text>

        <mj-divider border-color="#e0e0e0" />

        <!-- Billing Details -->
        <mj-section padding="16px 0">
          <mj-column>
            <mj-text font-size="12px" color="#999999" text-transform="uppercase" letter-spacing="1px">
              Billed To
            </mj-text>
            <mj-text font-size="14px" color="#1a1a1a">
              {{customerName}}<br/>
              {{customerEmail}}
            </mj-text>
          </mj-column>
          <mj-column>
            <mj-text font-size="12px" color="#999999" text-transform="uppercase" letter-spacing="1px">
              Payment Method
            </mj-text>
            <mj-text font-size="14px" color="#1a1a1a">
              {{paymentMethod}} ending in {{lastFour}}
            </mj-text>
          </mj-column>
        </mj-section>

        <mj-divider border-color="#e0e0e0" />

        <!-- Line Items -->
        <mj-table font-size="14px" color="#1a1a1a">
          <tr style="border-bottom: 1px solid #e0e0e0; background-color: #f8f8f8;">
            <th style="padding: 12px; text-align: left; font-weight: 600;">Description</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">Qty</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">Price</th>
            <th style="padding: 12px; text-align: right; font-weight: 600;">Total</th>
          </tr>
          {{#each lineItems}}
          <tr style="border-bottom: 1px solid #f0f0f0;">
            <td style="padding: 12px;">{{description}}</td>
            <td style="padding: 12px; text-align: right;">{{quantity}}</td>
            <td style="padding: 12px; text-align: right;">${{unitPrice}}</td>
            <td style="padding: 12px; text-align: right;">${{totalPrice}}</td>
          </tr>
          {{/each}}
        </mj-table>

        <!-- Totals -->
        <mj-section padding="16px 0">
          <mj-column>
            <mj-table>
              {{#if discount}}
              <tr>
                <td style="padding: 4px 12px; font-size: 14px; color: #666;">Discount</td>
                <td style="padding: 4px 12px; font-size: 14px; text-align: right; color: #666;">-${{discount}}</td>
              </tr>
              {{/if}}
              <tr>
                <td style="padding: 4px 12px; font-size: 14px; color: #666;">Subtotal</td>
                <td style="padding: 4px 12px; font-size: 14px; text-align: right;">${{subtotal}}</td>
              </tr>
              <tr>
                <td style="padding: 4px 12px; font-size: 14px; color: #666;">Tax ({{taxRate}}%)</td>
                <td style="padding: 4px 12px; font-size: 14px; text-align: right;">${{tax}}</td>
              </tr>
              <tr style="border-top: 2px solid #1a1a1a;">
                <td style="padding: 12px; font-size: 18px; font-weight: 700;">Total</td>
                <td style="padding: 12px; font-size: 18px; font-weight: 700; text-align: right;">${{total}}</td>
              </tr>
            </mj-table>
          </mj-column>
        </mj-section>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

### Notification Email

```mjml
<mjml>
  <mj-head>
    <mj-title>Notification from {{appName}}</mj-title>
  </mj-head>
  <mj-body background-color="#f4f4f6">
    <mj-section background-color="#ffffff" padding="32px 24px">
      <mj-column>
        <mj-image src="{{notificationIcon}}" width="48px" padding-bottom="16px" />
        <mj-text font-size="20px" font-weight="700" color="#1a1a1a" padding-bottom="8px">
          {{notificationTitle}}
        </mj-text>
        <mj-text font-size="15px" color="#555555" line-height="1.6" padding-bottom="24px">
          {{notificationBody}}
        </mj-text>

        {{#if actionRequired}}
        <mj-button href="{{actionUrl}}" background-color="#0066ff" border-radius="8px" font-size="15px" inner-padding="12px 28px">
          {{actionLabel}}
        </mj-button>
        {{/if}}

        <mj-text font-size="12px" color="#999999" padding-top="16px">
          {{timestamp}} | <a href="{{preferencesUrl}}" style="color: #999999;">Notification preferences</a>
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

## Localization Patterns

### Multi-Locale Templates

```mjml
<!-- Template for {{locale}} rendering -->
<mjml>
  <mj-head>
    <mj-title>{{localized.title}}</mj-title>
    <mj-preview>{{localized.preview}}</mj-preview>
  </mj-head>
  <mj-body background-color="#f4f4f6">
    <mj-section>
      <mj-column>
        <mj-text>
          {{localized.greeting}}, {{firstName}}!
        </mj-text>
        <mj-text>
          {{localized.body}}
        </mj-text>
        <mj-button href="{{actionUrl}}">
          {{localized.cta}}
        </mj-button>
      </mj-column>
    </mj-section>
    <mj-section>
      <mj-column>
        <mj-text font-size="12px" color="#999999">
          {{localized.footer}} {{companyName}}. {{localized.rightsReserved}}.
        </mj-text>
      </mj-column>
    </mj-section>
  </mj-body>
</mjml>
```

## Template Rendering Engine

### MJML to HTML Compilation

```typescript
import mjml2html from 'mjml';
import Handlebars from 'handlebars';

interface TemplateRenderOptions {
  template: string;
  data: Record<string, unknown>;
  locale?: string;
}

async function renderEmailTemplate(options: TemplateRenderOptions): Promise<{ html: string; text: string }> {
  // 1. Compile Handlebars variables into MJML
  const compileMjml = Handlebars.compile(options.template, {
    noEscape: true, // MJML uses HTML tags
  });
  const mjmlWithData = compileMjml(options.data);

  // 2. Convert MJML to responsive HTML
  const { html, errors } = mjml2html(mjmlWithData, {
    beautify: true,
    minify: false,
    validationLevel: 'strict',
  });

  if (errors && errors.length > 0) {
    console.warn('MJML compilation warnings:', errors);
  }

  // 3. Generate plaintext fallback
  const text = convertHtmlToPlainText(html);

  return { html, text };
}
```

### Template Caching

```typescript
class TemplateCache {
  private cache: Map<string, { compiled: HandlebarsTemplateFunction; mjml: string }> = new Map();
  private compiledCache: Map<string, string> = new Map();

  async getOrCompile(templateId: string, locale: string, data: Record<string, unknown>): Promise<string> {
    const cacheKey = `${templateId}:${locale}`;

    // Check compiled HTML cache
    const cachedHtml = this.compiledCache.get(cacheKey);
    if (cachedHtml) return cachedHtml;

    // Get or compile MJML template
    let template = this.cache.get(cacheKey);
    if (!template) {
      const rawMjml = await this.loadTemplate(templateId, locale);
      const compiled = Handlebars.compile(rawMjml, { noEscape: true });
      template = { compiled, mjml: rawMjml };
      this.cache.set(cacheKey, template);
    }

    // Inject data and compile to HTML
    const mjmlWithData = template.compiled(data);
    const { html } = mjml2html(mjmlWithData);

    this.compiledCache.set(cacheKey, html);

    // Expire compiled cache after 1 hour
    setTimeout(() => this.compiledCache.delete(cacheKey), 3600000);

    return html;
  }

  private async loadTemplate(templateId: string, locale: string): Promise<string> {
    // Load from database or file system
    const template = await TemplateModel.findOne({ id: templateId, locale });
    if (!template) throw new Error(`Template ${templateId} not found for locale ${locale}`);
    return template.bodyMjml;
  }
}
```

## Testing & Preview

### Local MJML Preview

```typescript
import express from 'express';
import mjml2html from 'mjml';
import fs from 'fs';

const app = express();

app.get('/preview/:templateName', (req, res) => {
  const mjml = fs.readFileSync(`./templates/${req.params.templateName}.mjml`, 'utf-8');
  const { html } = mjml2html(mjml);
  res.send(html);
});

app.listen(4000, () => console.log('Template preview at http://localhost:4000/preview/welcome'));
```

### Automated Template Testing

```typescript
import puppeteer from 'puppeteer';

async function testTemplateRendering(templateId: string, locales: string[]): Promise<void> {
  const browser = await puppeteer.launch();

  for (const locale of locales) {
    const html = await renderEmailTemplate({
      template: await loadTemplate(templateId, locale),
      data: getTestData(locale),
    });

    const page = await browser.newPage();
    await page.setContent(html.html);
    await page.setViewport({ width: 600, height: 800 });

    // Check rendering
    const content = await page.evaluate(() => document.body.innerText);
    if (!content || content.trim().length === 0) {
      throw new Error(`Template ${templateId} rendered empty for locale ${locale}`);
    }

    // Check for broken images
    const brokenImages = await page.evaluate(() => {
      return Array.from(document.querySelectorAll('img'))
        .filter(img => !img.complete || img.naturalWidth === 0)
        .length;
    });

    if (brokenImages > 0) {
      console.warn(`Template ${templateId} has ${brokenImages} broken images for locale ${locale}`);
    }
  }

  await browser.close();
}
```

## Key Points

- Use MJML components (mj-section, mj-column, mj-button, mj-text, mj-image, mj-divider, mj-table, mj-spacer, mj-hero, mj-navbar, mj-social, mj-carousel, mj-accordion, mj-group, mj-wrapper) for structured layouts
- Define global styles using mj-attributes and mj-class for consistency
- Use mjml2html for server-side compilation with Handlebars template injection
- Always provide plain-text fallback alongside HTML
- Follow responsive design patterns with mobile-first columns
- Test templates across email clients (Gmail, Outlook, Apple Mail, Yahoo, ProtonMail)
- Use mj-preview for preheader text optimization
- Implement template versioning and locale-specific translations
- Cache compiled templates and rendered HTML for performance
- Validate MJML structure with strict validation level during development
- Use background-color and border-radius carefully (Outlook ignores border-radius)
- Avoid complex CSS selectors — most email clients strip <style> blocks
- Test with dark mode enabled (many clients auto-darken emails)
- Use inline styles via mj-style for better client compatibility
- Always include unsubscribe link and physical mailing address
- Test email rendering with real-world data edge cases (long names, special characters, RTL text)
