# Diff Algorithms, Failure Modes, and Threshold Math

Scope: how screenshot comparators decide "changed", where each algorithm fails, and how to pick tolerances from measured noise. Environment pinning and page freezing live in `screenshot-comparison.md`; tool pricing and selection live in `visual-regression-tools.md`. Facts are current as of late 2026; unverified items are labeled.

## 1. Two Independent Knobs

Every pixel comparator answers two separate questions. Mixing them up is the most common tuning mistake.

| Knob | Question it answers | Playwright name | Default |
|---|---|---|---|
| Per-pixel color tolerance | Is this one pixel different enough to count? | `threshold` (0 strict … 1 lax) | `0.2` |
| Image-level count tolerance | How many counted pixels are acceptable? | `maxDiffPixels` (count) / `maxDiffPixelRatio` (0–1) | **unset** |

- With `maxDiffPixels` and `maxDiffPixelRatio` unset, a single pixel over `threshold` fails `toHaveScreenshot`.
- pixelmatch's README states that `threshold` "is not a percentage of the image". To tolerate a share of pixels, compare the returned mismatch count to `width * height` yourself.
- Rule: tune `threshold` for **color noise**, tune `maxDiffPixels` for **count noise**. Never use one to compensate for the other.
  - Lowering `threshold` turns anti-aliasing (AA) and gamma noise into counted pixels.
  - Raising `maxDiff*` hides small, localized real regressions.

## 2. Algorithms Compared

| Algorithm / mode | Color model | Catches well | Fails on | Use when |
|---|---|---|---|---|
| pixelmatch (Playwright default comparator) | Upstream README: OKLab with HyAB distance; older versions and secondary sources: YIQ (see §3) | Color, position, and obvious text changes | 1px lines and glyph stems that look like AA; blur/shadow gradients; subpixel layout shifts where every edge moves | Default for a pinned single-environment suite |
| odiff (Zig + SIMD, Node API `odiff-bin`) | YIQ NTSC + AA detection | Same differences as pixelmatch on equal inputs | Does not reduce flakiness, only time | Large suites bottlenecked on diff time; `playwright-odiff` adds `toHaveScreenshotOdiff` |
| Playwright `comparator: "ssim-cie94"` | CIE94, default threshold `0.01` | Filters Chromium's nondeterministic AA | **Experimental**, absent from the public API page | Only if Chromium AA noise dominates and an unstable option is acceptable |
| DSSIM / multi-scale SSIM | L\*a\*b\*, linear-light scaling | Gradients, photographic content | Compresses small high-contrast changes (one wrong digit) into tiny scores; scores not comparable across tools or DSSIM versions | Image content, not text-heavy UI |
| Chromatic `diffThreshold` | Hosted | Defaults to `0.063` (0 = exact color, 1 = any color) | No published false-positive rate | Keep the default |
| Argos | Hosted, two diff passes, AA detection on | Ignores AA-only pixels | Docs cited via search summary | Hosted review with deterministic pixel diffing |
| Applitools match levels | "Visual AI" | See §4 | No published FP/FN rates | Layout level for i18n and cross-environment runs |

### pixelmatch defaults (upstream README)

```js
// pixelmatch options and their upstream defaults
const options = {
  threshold: 0.1,          // per-pixel color tolerance (Playwright overrides to 0.2)
  includeAA: false,        // AA pixels are detected and NOT counted
  alpha: 0.1,              // opacity of the unchanged image in the diff output
  aaColor: [255, 255, 0],  // AA pixels drawn yellow in the diff
  diffColor: [255, 0, 0],  // counted pixels drawn red
  diffMask: false,         // draw the diff over a transparent background
};
// Newer options: diffColorAlt, checkerboard (true), windowSize (Infinity), ignoreMask.
// Inputs must have identical dimensions; the CLI handles PNG only.
```

AA detection uses Vyšniauskas (2009), "anti-aliased pixel and intensity slope detector".

### odiff benchmarks (README, single-threaded)

| Input | odiff | pixelmatch | ImageMagick |
|---|---|---|---|
| Cypress full page | 1.168 s | 7.712 s | 8.881 s |
| 8K image | 1.951 s | 10.614 s | 9.326 s |

The README states the produced diffs were identical. odiff also offers `ignoreRegions`, `outputDiffMask`, `failOnLayoutDiff`, `reduceRamUsage`, `diffOverlay`, `captureDiffLines`, and compares PNG/JPEG/WebP/TIFF, including across formats.

### DSSIM specifics

- Output is `1/SSIM − 1`: 0 means identical, the range is unbounded.
- The README gives no pass/fail thresholds.
- Correlation with TID2013 human ratings (v3.2): Spearman −0.84 to −0.95 depending on distortion class.
- Single-scale SSIM is biased toward differences smaller than its Gaussian kernel.
- Color-profile mismatches can make identical pixels compare as different.

## 3. Open Conflict: YIQ vs OKLab

- The current pixelmatch README describes OKLab with HyAB distance (Ottosson 2020; Abasi et al. 2019).
- odiff's README and several secondary sources still describe pixelmatch-style comparison as YIQ.
- Playwright vendors its own pixelmatch copy. Whether it uses YIQ or OKLab/HyAB is **unverified**, so Playwright's `threshold: 0.2` cannot be mapped onto upstream's `0.1`.
- Likely explanation: a pixelmatch v7 change. Also unverified.
- Practical consequence: never port a `threshold` value between tools. Re-measure noise (§6) after switching comparator or upgrading Playwright.

## 4. Applitools Match Levels

| Level | Checks | Ignores | Fit |
|---|---|---|---|
| Exact | Pixel by pixel | Nothing | Docs: "not recommended for ordinary verification purposes" |
| Strict | Text, font, color, graphic, position changes a human would notice | Software/hardware rendering differences | One browser/OS, mostly static content |
| Ignore Colors | Strict minus color | Color | Theme-agnostic checks |
| Layout | Relative positions of text, images, buttons, columns; appear/disappear/move | Text content, graphics, color, style | Dynamic content, localization, cross-environment against one baseline |
| Dynamic | Text against patterns (dates, emails, URLs, numbers, currency) | Pattern-matching values | Web only; default for Web tests on recent SDKs; admins can change team default |

"Content" no longer appears on the current page; treat it as legacy or removed. Applitools publishes no quantitative false-positive or false-negative rates; "Visual AI" accuracy claims are marketing until independently measured.

## 5. Mobile Tolerance Knobs (same two-knob logic)

| Tool | Knob | Meaning |
|---|---|---|
| Roborazzi | `changeThreshold` | Fraction of differing pixels (count knob) |
| Roborazzi | `SimpleImageComparator(maxDistance, vShift, hShift)` | Color distance plus shift tolerance for AA |
| swift-snapshot-testing | `precision` / `perceptualPrecision` | Teams use `perceptualPrecision` ≈ 0.98 to absorb GPU AA, shadow, blur; exact semantics and defaults unverified |
| Shot | `shot { tolerance = 0.1 }` | Percent; recommended mainly for Compose cross-device variance |
| Alchemist | `diffThreshold` | Default `0.0` |
| Paparazzi 2.0.0-alpha04 | max-percent-diff | Can overwrite snapshots when the threshold is reached (changelog) |

Host-rendered (JVM, `flutter test`) tools are deterministic on the same JDK and fonts: keep tolerance at or near zero. Small tolerances are justified mainly for GPU or device rendering. Setup details live in `visual-test-setup.md`.

## 6. Threshold Math

### Why ratios are dangerous

A ratio scales with screenshot area; a regression does not.

```text
allowed_pixels = width × height × maxDiffPixelRatio

1280 × 800   × 0.01 =  10,240 px   (viewport shot)
1280 × 4000  × 0.01 =  51,200 px   (full-page shot)
```

51,200 pixels is enough to hide a whole changed button or a line of text. A missing 2px focus ring around a 120×40 button changes roughly 2 × (124 + 44) ≈ 336 pixels (illustrative arithmetic, not a measured figure): invisible under any common ratio, visible under a small absolute count.

### Decision rules

1. Pinned container, single environment: keep `threshold` at the default (0.2 in Playwright, about 0.1 in raw pixelmatch), leave AA detection on, set a **small absolute** `maxDiffPixels` (tens of pixels) from measured noise.
2. Cross-environment comparison (different OS/GPU on purpose): a ratio, or a layout-level comparator, is acceptable. Label those suites as low-sensitivity.
3. Prefer per-snapshot overrides over suite-wide changes. One noisy chart should not loosen every button test.
4. Raise tolerances gradually and only after confirming the flagged pixels are edges or text AA, not a 1px border.
5. Never set `threshold` near 1. It hides lost focus rings and 1px borders.

### Measure your noise floor

No reliable published flake-rate data exists for web visual suites; practitioner sources say most failures are AA, subpixel layout, or hinting differences, without rates. Measure your own:

```ts
// scripts/noise-floor.ts — run INSIDE the pinned Playwright container
// Captures each target N times, diffs every capture against the first,
// and prints the max mismatched-pixel count per target.
import { chromium } from 'playwright';
import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

const RUNS = 20;
const targets = [
  { name: 'dashboard', url: 'http://localhost:3000/dashboard' },
  { name: 'settings', url: 'http://localhost:3000/settings' },
];

async function capture(url: string): Promise<PNG> {
  const browser = await chromium.launch({
    args: ['--font-render-hinting=none', '--disable-lcd-text', '--force-color-profile=srgb'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1 });
    await page.clock.setFixedTime(new Date('2026-01-15T10:00:00Z'));
    await page.goto(url, { waitUntil: 'networkidle' });
    await page.evaluate(() => document.fonts.ready);
    return PNG.sync.read(await page.screenshot({ animations: 'disabled', caret: 'hide' }));
  } finally {
    await browser.close();
  }
}

for (const t of targets) {
  const first = await capture(t.url);
  const counts: number[] = [];
  for (let i = 1; i < RUNS; i++) {
    const next = await capture(t.url);
    if (next.width !== first.width || next.height !== first.height) {
      throw new Error(`Size changed for ${t.name}: ${first.width}x${first.height} -> ${next.width}x${next.height}`);
    }
    counts.push(pixelmatch(first.data, next.data, null, first.width, first.height, { threshold: 0.1 }));
  }
  console.log(`${t.name}: max=${Math.max(...counts)} counts=${counts.join(',')}`);
}
```

- Set `maxDiffPixels` just above the observed maximum (for example max + a small margin).
- A target whose maximum is far above the others has a determinism bug: fix it (see `screenshot-comparison.md`) instead of raising its tolerance.
- Re-run after any environment change: Docker tag, Playwright version, CPU architecture, GPU/SwiftShader availability.
- Note: the script uses raw pixelmatch with `threshold: 0.1`; Playwright's internal comparator may differ (§3). For exact parity, run `npx playwright test --repeat-each=20` against existing baselines and read the reported diff counts from failures.

## 7. Failure Mode Catalogue

| Symptom | Likely cause | Fix (in order) |
|---|---|---|
| Every edge pixel flagged, large count | Subpixel layout shift (font metrics, DPR, zoom) | Pin fonts and `deviceScaleFactor`; check font load timing |
| Text edges flagged with red/blue fringes | LCD subpixel AA on one machine | `--disable-lcd-text`; capture only in the container |
| Rounded corners and soft shadows flagged | AA/shadow rasterization varies per run or GPU | Pin GPU/SwiftShader backend; then small `maxDiffPixels` |
| Real 1px border change passes | `threshold` too lax or ratio too large | Lower `maxDiff*`; switch ratio to absolute |
| Wrong digit passes SSIM-based check | SSIM compresses small high-contrast areas | Use pixel diff for text-heavy UI |
| Diff only in gradient region | pixelmatch AA detection weak on gradients | Mask or crop the gradient; consider SSIM for that region only |
| Same images, "different" result between tools | Different color model / threshold semantics | Re-measure per tool; never port values |
| Identical-looking images fail | Color-profile mismatch | `--force-color-profile=srgb`; consistent PNG pipeline |

Semantic or "AI" comparison cuts pixel noise but adds model false negatives (missed subtle defects) and false positives. No academic study measures FP/FN of pixelmatch vs SSIM vs visual AI on the same web defect set. For vision-model judging evidence, see `visual-testing-advanced.md`.

## 8. Checklist

- [ ] `threshold` left at tool default unless measured color noise demands otherwise.
- [ ] `maxDiffPixels` absolute, derived from a 20-run noise measurement in the pinned container.
- [ ] No `maxDiffPixelRatio` on full-page shots of a single-environment suite.
- [ ] AA detection on (`includeAA: false` in pixelmatch semantics).
- [ ] Per-snapshot overrides documented with the measured reason.
- [ ] Experimental `ssim-cie94` only with an explicit "unstable API" note.
- [ ] Noise floor re-measured after every environment bump.
