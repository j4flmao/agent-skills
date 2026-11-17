# Generative UI (Vercel AI SDK)

## 1. Skill Context
**Focus**: Generating interactive Frontend components on-the-fly using LLMs, instead of static Markdown text.
**Triggers**: generative-ui, rsc, react-server-components, vercel-ai-sdk.

## 2. The Markdown Limitation
Traditionally, an LLM returns a markdown string. If a user asks "Show me the weather", the LLM returns **Temperature**: 25C. This is boring and non-interactive.

## 3. Streaming React Server Components (RSC)
With the Vercel AI SDK and Next.js App Router, the AI doesn't just return text.
1. The User asks for the weather.
2. The AI invokes a get_weather tool.
3. The Server intercepts the tool call, fetches the data, and immediately streams a fully interactive <WeatherCard temp={25} /> React Component directly to the client browser.
The user sees an interactive widget (buttons, charts) in the chat UI.

Status note: the AI SDK's RSC API (`ai/rsc`, `streamUI`) is marked experimental and its development is paused. The AI SDK docs recommend AI SDK UI instead: stream tool calls to the client with `useChat` and render a component per tool-call part. Validate tool outputs before rendering and never render model-produced HTML unescaped.
