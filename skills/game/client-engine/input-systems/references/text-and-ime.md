---
title: Text Input and IME
description: Character vs key events, IME composition, keyboard layout, focus routing, paste and CJK handling.
---

# Text & IME — Deep Reference

## 1. Characters ≠ Keys

- **Key events** = `keydown/keyup` (scancode) — for binding/gameplay.
- **Text input** = *characters* (char). A single `keydown` can produce 0..multiple chars (dead keys, compose) and is *layout-dependent*.

Rule: gameplay reads keys; text fields read chars. Never type a letter from a key code.

## 2. The Text Input Events

```
charReceived(char)          // a committed UTF-8/16 char (or a paste slur)
compositionStart(text)      // IME begins (CJK: 打 → composition)
compositionUpdate(text)
compositionEnd(text)        // IME commits
```
Runtime: the OS provides these (`WM_CHAR`+`WM_IME_*` on Windows; IME APIs on OSX/Linux; `insertText` on platforms).

## 3. IME Handling Done Right

| Platform | API pieces |
|----------|-----------|
| Windows | `ImmSetCompositionWindow` + `WM_IME_STARTCOMPOSITION`... |
| macOS | NSTextInputClient |
| Linux | GTK/Qt input context |
| Web/mobile | synthetic via the DOM / native keyboards |

The engine must:
1. Route `compositionStart/Update/End` to the *focused text field*.
2. Position the IME candidate window at the caret (a `imeCompositionRect` from the UI).
3. **Cancel** on a `Esc` key (mid-composition) correctly.

## 4. Layout: The Two Tables

- Key-to-char mapping via the layout (azerty: `A`→`q`).
- Key-to-physical binding via scancode (muscle memory preserved: WASD stays WASD even on azerty — the *physical* code).

Keep both: scancodes for actions; layout chars for text. Never conflate (see device-abstraction).

## 5. Focus Routing

A text input is only active when the UI thread has focus (chat field open). Rules:
- When the focus is *not* on a text field, text events go nowhere (don't type game commands from raw keys).
- The focused UI field **owns** the IME composition; a focus change mid-composition → `compositionCancel`.
- Multiple windows (chat + menu) — one focus owner.

## 6. Paste & Surrogate Pairs

- Paste isn't a key — it's a `charReceived` burst (the platform delivers it as committed text).
- UTF handling: the engine works in Unicode (UTF-8 internally); surrogate pairs/combining marks handled by lib (ICU or hand+test).
- Emoji (ZWJ sequences) = a paste/mobile arrives as a few chars — display correctly, don't split invalidly.

## 7. Security & Sanitization

- Cap field length in *characters*, not bytes (CJK chars are multi-byte).
- Ban control chars; strip scripts per context (chat may allow nothing executable).
- Autofocus vs privacy (password fields: dot display, no IME suggestion in some stores).

## 8. Testing

- Unit: layout table (azerty/dvorak), IME composition state machine, pasted strings.
- E2E: a CJK IME test (Windows: install Microsoft IME; simulate composition events).
- Regression: dead keys (é via `'+e` on some layouts).

## 9. Pitfalls

| Pitfall | Fix |
|---------|-----|
| Char from key code | chars only |
| No IME routing | composition events → focused field |
| IME window not at caret | compositionRect |
| UTF count vs bytes | count characters |
| Focus steal mid-compose | cancel + route |
| Paste split by bytes | char-accurate |

## 10. Checklist

- [ ] Text = char events; keys separate.
- [ ] IME state machine + candidate window positioning.
- [ ] Focus routes text to one field.
- [ ] Layout tables separate (action vs char).
- [ ] UTF-safe sanitization + caps.
- [ ] CJK/dead-key E2E tests.