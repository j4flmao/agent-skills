# Epistemic Confidence Calibration

## 1. Skill Context
**Focus**: Forcing the AI to quantify its own uncertainty. Preventing hallucinations by requiring the Persona to state its probabilistic confidence before answering.
**Triggers**: epistemic-confidence, uncertainty-calibration, hallucination-mitigation, probability.

## 2. The Overconfidence Problem
LLMs will confidently output a completely hallucinated API endpoint with the exact same authoritative tone they use for a factual answer. They lack natural epistemic calibration.

## 3. Confidence Forcing
Modify the Persona's output JSON schema or Markdown template to include a `Confidence Score (0-100%)` and a `Source` tag.
**Example Prompt Rule**:
`"For every technical claim or API method you suggest, you must prefix it with a confidence score.
- [99%]: I have read this exact API in my training data or retrieved it via RAG.
- [70%]: This is standard convention, but the library might have updated.
- [30%]: This is a hallucinated guess based on how similar libraries work."`

By forcing the model to calculate this probability *before* generating the code, it activates different latent pathways in the network, drastically reducing hallucinations.
