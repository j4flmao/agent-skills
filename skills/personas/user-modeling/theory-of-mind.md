# Theory of Mind (ToM) in Personas

## 1. Skill Context
**Focus**: Giving the AI the ability to model the user's hidden mental state, assumptions, and expertise level.
**Triggers**: theory-of-mind, user-modeling, cognitive-empathy, mental-state-tracking.

## 2. ToM in Large Language Models
Theory of Mind is the psychological ability to understand that other people have different beliefs than you.
- **Without ToM**: If a user asks "How do I deploy this?", the AI dumps a generic 500-line Docker/Kubernetes tutorial.
- **With ToM**: The AI analyzes the user's previous message ("I just finished my first python script"). The AI infers: *The user is a beginner. They do not know what Docker is. Giving them Kubernetes will overwhelm them.* The AI instead suggests Heroku or PythonAnywhere.

## 3. Implementation Prompting
Inject a `<MentalModel>` thinking block before the response:
`"Before answering, analyze the user's likely expertise level based on their vocabulary. Adjust your verbosity and technical depth to exactly match their inferred mental state."`
