# Prompt Templates

## Template Patterns

### System + User Pattern
```
System: You are a {role}. {behavior_guidelines}
User: {user_input}
Assistant: 
```

### Few-Shot Pattern
```
System: Classify customer queries into categories.
Examples:
  Query: "I want to cancel my subscription"
  Category: cancellation
  
  Query: "When will my order arrive?"
  Category: shipping
  
  Query: "The website won't load"
  Category: technical
  
User: {query}
Category:
```

## Parameterized Templates

### Python String Template
```python
from string import Template

template = Template("""
You are a $role assistant specializing in $domain.

Context Information:
$context

User Question:
$question

Provide a $tone response that addresses the question
using only the provided context.
""")

prompt = template.safe_substitute(
    role="customer support",
    domain="refund policies",
    context="Our return policy allows 30-day returns...",
    question="Can I return my laptop after 45 days?",
    tone="helpful and concise"
)
```

### Jinja2 Templates
```jinja
{% if context %}
Context:
{% for doc in context %}
[{{ loop.index }}] {{ doc }}
{% endfor %}
{% endif %}

{% if conversation_history %}
Previous conversation:
{% for msg in conversation_history %}
{{ msg.role }}: {{ msg.content }}
{% endfor %}
{% endif %}

User: {{ question }}
Assistant: {% if constraints.concise %}Keep your response under 3 sentences.{% endif %}
```

## Template Categories

### Query Classification
```
Classify the following customer message:
Message: "{message}"

Categories:
- Billing: payment, invoice, subscription
- Technical: bug, error, login, performance
- Account: password, settings, profile
- Product: feature request, how-to, feedback
- Other: anything else

Category:
Confidence (0-1):
```

### Extraction
```
Extract structured data from the following text:
"{text}"

Fields to extract:
- date (ISO format YYYY-MM-DD)
- amount (number, no currency symbol)
- currency (3-letter code)
- description (string, max 50 chars)
- category (from: income, expense, transfer)

Output as JSON.
```

### Summarization
```
Summarize the following text in {sentence_count} sentences.
Focus on: {focus_area}
Target audience: {audience}

Text:
{text}

Summary:
```

### Safety Refusal
```
The user asked: "{user_input}"

This request appears to involve:
{identified_issue}

Generate a polite refusal that:
1. Acknowledges the request
2. States you cannot fulfill it
3. Briefly explains why (policy, safety)
4. Offers alternative help if appropriate

Do not provide any information related to the harmful request.
```

## Template Versioning

```yaml
template:
  name: "customer-support-v3"
  version: "3.1.0"
  variables:
    - name: context
      type: string
      required: true
      max_length: 4000
    - name: question
      type: string
      required: true
    - name: tone
      type: string
      enum: ["concise", "detailed", "friendly"]
      default: "concise"
  changelog:
    "3.1.0": "Added tone parameter"
    "3.0.0": "Switched from single to multi-turn format"
```

## A/B Testing Variants

### Variant A (Concise)
```
Answer the question using the context. Be brief.
Context: {context}
Question: {question}
```

### Variant B (Detailed)
```
Using the provided context, give a thorough answer
that includes relevant details and explanations.
Context: {context}
Question: {question}
```

## Template Management Rules

- One variable per purpose (don't overload parameters)
- Default values for optional parameters
- Validation rules for each variable (type, enum, length)
- Max template length: 2000 tokens
- Test each template with representative inputs
- Document expected output format per template
