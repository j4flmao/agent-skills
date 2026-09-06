# Visual Regression Testing

## 1. Concept
Visual regression tests compare a screenshot of your web app against a baseline image. If the UI shifts by even 1 pixel (e.g., CSS padding changes), the test fails.

## 2. Playwright Implementation
Playwright uses `pixelmatch` under the hood.
```typescript
test('homepage matches snapshot', async ({ page }) => {
  await page.goto('https://example.com');
  // First run: Creates the baseline image.
  // Subsequent runs: Compares against the baseline.
  await expect(page).toHaveScreenshot('homepage.png', {
    maxDiffPixels: 100, // Allow minor anti-aliasing differences
  });
});
```

## 3. CI/CD Inconsistencies
**Warning**: Fonts and rendering engines render differently on Mac (Local) vs Linux (Github Actions). If you generate baseline images on your Mac, CI will fail.
**Solution**: ALWAYS generate baseline images using a Docker container that matches your CI environment.
```bash
docker run --rm -v $(pwd):/work/ -w /work/ mcr.microsoft.com/playwright:v1.40.0-jammy npx playwright test --update-snapshots
```
