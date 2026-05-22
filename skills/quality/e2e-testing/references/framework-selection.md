# Framework Selection

## Playwright vs Cypress vs Selenium

| Feature | Playwright | Cypress | Selenium |
|---------|-----------|---------|----------|
| Browsers | Chromium, Firefox, WebKit | Chromium (inc. Electron) | Chrome, Firefox, Safari, IE |
| Language | TypeScript, JS, Python, Java, C# | JavaScript, TypeScript | Java, Python, C#, Ruby, JS |
| Waits | Auto-waiting | Auto-waiting | Manual (ExplicitWait) |
| Parallel | Native (workers) | Dashboard paid | Grid / vendor |
| Network | Native mock + intercept | cy.intercept() | Proxy / BrowserMob |
| Mobile | Emulation (Chrome DevTools) | Real device (paid) | Appium extension |
| Debugging | Trace viewer, VS Code debug | Time-travel, interactive runner | DevTools only |
| CI setup | Zero config | Requires Cypress binary | Requires Grid / vendor |

## Playwright Setup

```bash
npm init playwright@latest
# Interactive: TS / JS, tests folder, GitHub Actions
```

```typescript
// playwright.config.ts
import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e/specs",
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  use: {
    baseURL: process.env.BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { browserName: "chromium" } },
    { name: "firefox", use: { browserName: "firefox" } },
    { name: "webkit", use: { browserName: "webkit" } },
  ],
});
```

## Cypress Setup

```bash
npm install cypress --save-dev
npx cypress open
```

```javascript
// cypress.config.js
module.exports = {
  e2e: {
    baseUrl: 'http://localhost:3000',
    viewportWidth: 1280,
    viewportHeight: 720,
    experimentalRunAllSpecs: true,
  },
};
```

## Selenium Setup

```java
// Java example
WebDriver driver = new ChromeDriver();
driver.get("http://localhost:3000");
WebElement element = driver.findElement(By.id("email"));
element.sendKeys("user@example.com");
```

## Recommendation Algorithm

```
New project, modern stack → Playwright
Small team, needs debugging → Cypress
Legacy system, IE support → Selenium
Need real mobile device → Cypress + Dashboard
Need all 3 browser engines → Playwright
```
