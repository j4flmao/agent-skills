# Rendering Determinism Engineering

Scope: removing nondeterminism from web screenshot capture before any threshold is touched. Comparator math lives in `visual-testing-fundamentals.md`; baseline review and CI cost live in `baseline-management.md`. Facts are current as of late 2026 (Playwright v1.64.x line); items marked "unverified" rest on known APIs or practitioner sources not re-checked against primary docs.

## 1. Fix Order (never reorder)

1. **Pin the environment**: Docker image tag, `@playwright/test` version, Chromium build, CPU architecture.
2. **Pin render flags**: headless mode, GPU vs SwiftShader, font hinting, LCD text, color profile.
3. **Freeze page state**: clock, network, fonts, animations, caret, hover, lazy content.
4. **Mask or hide the rest**: `mask`, `stylePath`.
5. **Only then** consider tolerances (`visual-testing-fundamentals.md`).

Noise sources, roughly by how often they bite: text rasterization (hinting, subpixel/LCD AA, font fallback, late webfonts) → rendering backend (GPU vs SwiftShader, headless shell vs new headless) → OS, DPR, color profile → dynamic content (time, animation, caret, network, lazy images, third-party iframes). Flakiness usually comes from late fonts, mid-frame animations, or lazy images, not from the diff algorithm.

## 2. Pin the Environment

Playwright warns that screenshots vary with host OS, version, settings, hardware, power source, and headless mode, and says to generate and compare baselines in the same environment.

| Item | Rule | Source |
|---|---|---|
| Image | `mcr.microsoft.com/playwright:v1.64.1` (= `-noble`, Ubuntu 24.04); also `-jammy` (22.04), `-resolute` (26.04). Alpine/musl unsupported | Playwright Docker docs |
| Version match | Image version must equal `@playwright/test`, or browsers are not found | Playwright Docker docs |
| Tag | "Always pin your Docker image to a specific version"; never `:latest` | Playwright Docker docs |
| Run flags | `--ipc=host` (Chromium OOM otherwise), `--init` (zombie processes) | Playwright Docker docs |
| User | Root disables the Chromium sandbox: fine for trusted E2E code. For untrusted sites use `pwuser` + `seccomp_profile.json` | Playwright Docker docs |
| Architecture | Pin amd64 vs arm64; QEMU-emulated images on Apple Silicon may rasterize differently | Inference, no source quantifies it |

Pin three things together: Docker tag, `@playwright/test` (lockfile), and the Chromium build it implies. Any bump is its own rebaseline PR, run inside the container with `--update-snapshots=changed`.

### Local runs against the container (remote mode)

```bash
# Terminal 1: browser server inside the pinned image
docker run --rm --init --ipc=host -p 3000:3000 \
  --add-host=hostmachine:host-gateway \
  mcr.microsoft.com/playwright:v1.64.1-noble \
  /bin/sh -c "npx -y playwright@1.64.1 run-server --port 3000 --host 0.0.0.0"

# Terminal 2: tests on the host, browsers in the container
PW_TEST_CONNECT_WS_ENDPOINT=ws://127.0.0.1:3000/ npx playwright test --project=visual
```

In remote mode the app under test is reached from the container as `http://hostmachine:<port>`.

### CI job

```yaml
# .github/workflows/visual.yml
jobs:
  visual:
    runs-on: ubuntu-24.04
    container:
      image: mcr.microsoft.com/playwright:v1.64.1-noble
      options: --ipc=host --init
    steps:
      - uses: actions/checkout@v4
      - run: npm ci
      - run: npx playwright test --project=visual
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: visual-diffs
          path: test-results/
```

Every shard must use the same image; sharding itself does not cause pixel differences.

## 3. Pin Render Flags

### Headless mode

- **Playwright headless uses `chromium-headless-shell` (old headless) by default.** `channel: 'chromium'` opts into new headless. Branded Chrome and Edge always use new headless, "so behavior can differ". Install with `--only-shell` (headless CI only) or `--no-shell`.
- Chrome now runs headless and headful on shared code; since Chrome 132.0.6793.0, old headless ships only as the standalone `chrome-headless-shell` binary.
- Baselines from headless shell, new headless, and branded Chrome are **not interchangeable**. Switching mode = full rebaseline.

### GPU vs SwiftShader

- **Since Chromium 139, SwiftShader fallback is opt-in.** Configs relying on `--disable-gpu` now also need `--enable-unsafe-swiftshader`.
- Chromium's WPT team found SwiftShader fixed some CSS rendering regressions but increased runtime by up to 50% and regressed canvas tests, so they disabled it by default for headless-shell WPT runs.
- Moving to a GPU runner, or crossing Chromium 139 with `--disable-gpu`, can shift canvas, WebGL, filters, blur, and shadows. Pin the backend and rebaseline deliberately.
- Headless canvas/WebGPU captures can come out black even when rendering works. Verify a WebGPU/canvas shot is non-empty before trusting it as a baseline.

### Text and color flags

| Flag | Effect | Caveat |
|---|---|---|
| `--font-render-hinting=none` | Glyphs not snapped to the platform pixel grid (Chromium default is "full") | Read **only in headless mode**; no effect headed |
| `--disable-lcd-text` | Grayscale AA instead of subpixel; removes red/blue fringing | Reduces, does not remove, cross-OS differences |
| `--force-color-profile=srgb` | Treats all displays as sRGB | Color-profile handling in Playwright's PNG pipeline is undocumented |
| `--force-device-scale-factor=1`, fixed `--window-size` | Stable DPR and size | Prefer Playwright `deviceScaleFactor`/`viewport` |
| `--deterministic-mode` | Deterministic rendering (e.g., border radius) | Experimental; expects BeginFrames over CDP |
| `--disable-partial-raster`, `--disable-font-subpixel-positioning`, `--disable-skia-runtime-opts` | Community flag sets | Anecdotal, unverified for current Chromium |

A system font stack resolves to different fonts per OS, and macOS and Linux rasterize glyphs differently: flags never make native captures match container captures. Capture baselines in one environment, usually CI.

## 4. Recommended Config

```ts
// playwright.config.ts — visual project, run inside mcr.microsoft.com/playwright:v1.64.1-noble
import { defineConfig } from '@playwright/test';

export default defineConfig({
  // No {platform}: every capture runs in the container, so one baseline set.
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}{-projectName}{ext}',
  updateSnapshots: 'missing',
  expect: {
    toHaveScreenshot: {
      maxDiffPixels: 40,            // from measured noise floor, not a ratio
      animations: 'disabled',
      caret: 'hide',
      scale: 'css',
      stylePath: './tests/visual/stabilize.css',
    },
  },
  projects: [
    {
      name: 'visual',
      testDir: './tests/visual',
      use: {
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
        locale: 'en-US',
        timezoneId: 'UTC',
        colorScheme: 'light',
        reducedMotion: 'reduce',     // known API; not re-verified this cycle
        launchOptions: {
          args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'],
        },
      },
    },
  ],
});
```

`timezoneId` affects only the browser. The test runner process uses the `TZ` environment variable; set `TZ=UTC` in CI when test code formats dates.

## 5. Freeze Page State

### What `toHaveScreenshot` already does

- Defaults: `animations: "disabled"`, `caret: "hide"`, `scale: "css"`, `fullPage: false`, `omitBackground: false`, `maskColor: #FF00FF`, `type: "png"` (`"webp"` is lossless).
- Stability loop: captures until two consecutive screenshots match, then compares the last one to the baseline. With no baseline, it saves the last stable capture.
- The screenshotter waits for `document.fonts.ready` (narrowed to the relevant frame by PR #15058; release unconfirmed).

### What it does not do

- `animations: "disabled"` fast-forwards finite CSS animations/transitions and cancels infinite ones; it does **not** stop JS animation (rAF loops, canvas, Lottie) or `<video>` (from API knowledge, not re-fetched).
- The two-stable-frames loop does not catch a skeleton that has stopped animating but is still on screen.
- `document.fonts.ready` can resolve while a fallback font is in use (even for a nonexistent font).

### Test-level freezing

```ts
// tests/visual/dashboard.spec.ts
import { test, expect, type Page } from '@playwright/test';

async function settle(page: Page, fontFace: string): Promise<void> {
  // Load the exact face, then await ready: ready alone can resolve on a fallback.
  await page.evaluate((face) => document.fonts.load(face).then(() => document.fonts.ready), fontFace);
  // Force lazy images eager and wait for every image to decode.
  await page.evaluate(async () => {
    document.querySelectorAll('img[loading="lazy"]').forEach((img) => img.setAttribute('loading', 'eager'));
    await Promise.all(
      Array.from(document.images).map((img) =>
        img.complete && img.naturalWidth > 0 ? Promise.resolve() : img.decode().catch(() => {
          throw new Error(`Image failed to load: ${img.currentSrc || img.src}`);
        }),
      ),
    );
  });
  await expect(page.locator('[data-skeleton]')).toHaveCount(0);
  await page.mouse.move(-1, -1); // hover state is captured otherwise
}

test('dashboard', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-01-15T10:00:00Z')); // before navigation
  await page.routeFromHAR('tests/visual/fixtures/dashboard.har', { notFound: 'abort' });
  await page.goto('/dashboard');
  await settle(page, '16px "Brand Sans"');
  await expect(page).toHaveScreenshot('dashboard.png', {
    mask: [page.getByTestId('avatar'), page.getByTestId('map')],
  });
});
```

### Clock API

- `page.clock.setFixedTime()` is the recommended call: fixes `Date.now()` and `new Date()`.
- `install()` enables `pauseAt`, `fastForward`, `runFor`, `resume`; `setSystemTime` is for advanced cases.
- Overrides `Date`, `Temporal.Now`, `setTimeout`/`setInterval`, `requestAnimationFrame`, `requestIdleCallback`, `performance`, `Event.timeStamp`. Use it to stop rAF-driven animation that `animations: "disabled"` misses.

### Network

- Route all API and third-party traffic: `page.route` for targeted stubs, `routeFromHAR` with `notFound: 'abort'` for whole pages (known API, not re-verified this cycle).
- `notFound: 'abort'` makes an unrecorded request fail loudly instead of silently hitting a live backend.
- Third-party iframes (ads, embeds, maps) are not documented beyond masking or hiding; hide them.

### Emulation

`viewport`, `deviceScaleFactor`, `colorScheme` (`light`/`dark`/`no-preference`, also via `page.emulateMedia`), `locale`, `timezoneId`. Fix all of them per project; vary them only as deliberate modes (see `baseline-management.md` for mode cost).

## 6. Mask and Hide

```css
/* tests/visual/stabilize.css — injected by stylePath (string or array; per project allowed) */
::-webkit-scrollbar { display: none; }
iframe, video, [data-visual="volatile"] { visibility: hidden !important; }
[data-skeleton] { display: none !important; }
*, *::before, *::after { caret-color: transparent !important; }
```

| Content | Tool | Why |
|---|---|---|
| Avatars, ads, maps, live charts | `mask: Locator[]` (overlay in `maskColor`) | Keeps layout, removes pixels |
| Iframes, video, blinking elements, scrollbars | `stylePath` CSS | Removes noise without test code changes |
| Dynamic text (timestamps, counts) | Clock + HAR fixtures, or `page.evaluate` replacement | Deterministic value beats masking |

Scrollbar CSS is common practice, not re-verified against primary docs. Prefer `visibility: hidden` over `display: none` when the element's box affects layout.

## 7. Snapshot Paths and Update Modes

- Default name: `<test-name>-<n>-<browser|project>-<platform>.png`, e.g. `example-test-1-chromium-darwin.png`.
- `snapshotPathTemplate` tokens: `{arg} {ext} {platform} {projectName} {snapshotDir} {testDir} {testFileDir} {testFileBaseName} {testFileName} {testFilePath} {testName}`. A one-character prefix such as `{/projectName}` or `{-projectName}` is emitted only when the token is non-empty. Per-assertion override: `expect.toHaveScreenshot.pathTemplate`.

| Situation | Template rule |
|---|---|
| All captures (local + CI) run in the container | Drop `{platform}`: one baseline set |
| Developers capture natively | Keep `{platform}`; only `-linux` is authoritative in CI; do not commit darwin/win32 files |

| `updateSnapshots` | Behavior | Use |
|---|---|---|
| `none` | Never writes | Strict CI |
| `missing` | Writes missing baselines only | Default for CI config |
| `changed` | Rewrites only mismatching baselines | Rebaseline PRs |
| `all` | Rewrites every baseline, even matching ones | Avoid; churns history |
| `default` | Creates missing snapshots but **fails** those tests | Prevents silent passes |

## 8. Determinism Checklist

- [ ] Docker tag, `@playwright/test`, and CPU architecture pinned together.
- [ ] Headless shell vs new headless chosen and documented; no `channel` change without rebaseline.
- [ ] GPU/SwiftShader backend explicit; `--enable-unsafe-swiftshader` present wherever `--disable-gpu` is.
- [ ] `--font-render-hinting=none`, `--disable-lcd-text`, `--force-color-profile=srgb`.
- [ ] Fixed viewport, DPR, locale, timezone (browser + `TZ`), color scheme, reduced motion.
- [ ] Clock fixed before navigation; network via HAR or routes with abort on miss.
- [ ] Exact font face loaded, lazy images decoded, skeletons detached, mouse moved away.
- [ ] Masks for volatile regions; `stylePath` for iframes, video, scrollbars.
- [ ] Canvas/WebGPU shots checked for black output.
- [ ] Noise floor measured after the checklist, not before.
