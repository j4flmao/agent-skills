# Research Methods

## Generative vs Evaluative

| Dimension | Generative | Evaluative |
|-----------|------------|------------|
| Question | What should we build? | Does it work? |
| When | Discovery, early alpha | Beta, live |
| Methods | Interviews, diary studies, field observation | Usability testing, surveys, A/B testing |
| Output | Problem definition, opportunity areas | Usability scores, satisfaction metrics |
| Participants | 5–8 per segment | 5 per segment (qual), 50+ (quant) |

## User Interviews

Structure:
1. **Introduction** (5 min): consent, recording, explain format
2. **Warm-up** (5 min): background, current role, tools they use
3. **Main exploration** (20 min): how they currently perform the task, walk through a recent example
4. **Concept response** (10 min): show prototype or concept, gather reactions
5. **Debrief** (5 min): anything we missed, questions for us

Question tips:
- "Tell me about the last time you [task]"
- "What was frustrating about that?"
- "If you could change one thing, what would it be?"
- "Walk me through how you [subtask]"

Avoid:
- "Would you use [feature]?" → hypothetical, unreliable
- "Do you think it's good?" → leading, social desirability bias
- Multiple questions in one → confusing, partial answers

## Surveys

Best for: satisfaction measurement (CSAT, NPS, SUS), feature prioritization, demographic validation.

Question types: Likert scales (1–5 or 1–7), multiple choice (single + select-all), ranking, open-ended (optional, max 3 per survey).

Max survey length: 10 minutes, 20 questions. Longer = drop-off.

Pilot with 5 people before full launch to catch ambiguous questions.

## Unmoderated Testing

Tools: UserTesting, Maze, UserZoom, Lookback.

Best for: task completion validation, first-click testing, prototype feedback at scale.

Structure: screener → scenario → task(s) → SUS survey → debrief question.

Recordings are asynchronous — write clear, unambiguous task instructions. Include a test task to confirm participants understand the format.

## Method Selection Matrix

| Need | Method | Participants | Timeline |
|------|--------|-------------|----------|
| Understand user behavior | Diary study | 8–12 | 2–3 weeks |
| Validate problem | Interviews | 5–8 | 1–2 weeks |
| Test navigation | Tree test / card sort | 20–50 | 1 week |
| Test usability | Moderated test | 5–8 | 1–2 weeks |
| Measure satisfaction | Survey | 50–500 | 1 week |
| Validate visual design | Preference test | 50+ | 3–5 days |
