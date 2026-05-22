# RLHF & DPO

## RLHF Pipeline

```
Step 1: SFT on instruction data
Step 2: Train reward model on preference data
Step 3: Optimize policy with PPO using reward model
```

## Reward Model Training

```python
from transformers import AutoModelForSequenceClassification, AutoTokenizer
from datasets import Dataset

# Reward model: binary classifier (chosen > rejected)
reward_model = AutoModelForSequenceClassification.from_pretrained(
    "meta-llama/Llama-2-7b-hf",
    num_labels=1,  # scalar reward
    torch_dtype=torch.bfloat16,
)

tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-2-7b-hf")
tokenizer.pad_token = tokenizer.eos_token

# Preference pairs
preference_data = [
    {
        "prompt": "What is the meaning of life?",
        "chosen": "Life's meaning is subjective and varies per person...",
        "rejected": "There is no meaning, everything is pointless.",
    },
]

def format_pair(example):
    chosen_text = f"### Prompt:\n{example['prompt']}\n\n### Response:\n{example['chosen']}"
    rejected_text = f"### Prompt:\n{example['prompt']}\n\n### Response:\n{example['rejected']}"
    return {"chosen": chosen_text, "rejected": rejected_text}

dataset = Dataset.from_list(preference_data).map(format_pair)

# Bradley-Terry loss: maximize log(sigmoid(reward_chosen - reward_rejected))
import torch.nn.functional as F

def compute_loss(reward_chosen, reward_rejected):
    return -F.logsigmoid(reward_chosen - reward_rejected).mean()
```

## PPO Training

```python
from trl import PPOTrainer, PPOConfig, AutoModelForCausalLMWithValueHead
from transformers import AutoTokenizer

# Add value head for PPO
model = AutoModelForCausalLMWithValueHead.from_pretrained("meta-llama/Llama-2-7b-chat-hf")
tokenizer = AutoTokenizer.from_pretrained("meta-llama/Llama-2-7b-chat-hf")
tokenizer.pad_token = tokenizer.eos_token

ppo_config = PPOConfig(
    model_name="meta-llama/Llama-2-7b-chat-hf",
    learning_rate=1.41e-5,
    batch_size=16,
    mini_batch_size=4,
    gradient_accumulation_steps=4,
    optimize_cuda_cache=True,
    early_stopping=True,
    target_kl=0.1,
    ppo_epochs=4,
    init_kl_coef=0.2,
    adap_kl_ctrl=True,
)

ppo_trainer = PPOTrainer(
    config=ppo_config,
    model=model,
    ref_model=None,  # will be created from model
    tokenizer=tokenizer,
)

# Training loop
for epoch in range(10):
    for batch in dataloader:
        query_tensors = tokenizer(batch["prompt"], return_tensors="pt").input_ids
        response_tensors = ppo_trainer.generate(
            query_tensors,
            max_new_tokens=128,
            temperature=0.7,
        )
        responses = tokenizer.batch_decode(response_tensors, skip_special_tokens=True)

        # Compute reward using trained reward model
        rewards = reward_model(batch["prompt"], responses)

        # PPO step
        stats = ppo_trainer.step(query_tensors, response_tensors, rewards)
        print(f"Epoch {epoch}: reward={rewards.mean():.3f}, kl={stats['kl']:.3f}")
```

## DPO (Direct Preference Optimization)

```python
from trl import DPOTrainer, DPOConfig

# DPO doesn't need a separate reward model
# It directly optimizes the policy on preference data

dpo_config = DPOConfig(
    output_dir="./dpo-checkpoints",
    beta=0.1,  # KL penalty coefficient
    learning_rate=5e-6,
    per_device_train_batch_size=4,
    gradient_accumulation_steps=8,
    num_train_epochs=3,
    warmup_steps=100,
    logging_steps=10,
    save_steps=500,
    fp16=True,
    max_length=2048,
    max_prompt_length=1024,
    remove_unused_columns=False,
)

dpo_trainer = DPOTrainer(
    model=model,                    # policy model
    ref_model=ref_model,            # frozen reference model
    tokenizer=tokenizer,
    args=dpo_config,
    train_dataset=preference_dataset,
)

dpo_trainer.train()

# Preference dataset format for DPO
# {
#     "prompt": "What is the capital of France?",
#     "chosen": "Paris is the capital of France.",
#     "rejected": "London is the capital of France."
# }
```

## Preference Data Construction

```python
# Generate preference pairs from model outputs
class PreferencePairGenerator:
    def __init__(self, model, tokenizer):
        self.model = model
        self.tokenizer = tokenizer

    def generate_pairs(self, prompts, num_candidates=4):
        pairs = []
        for prompt in prompts:
            candidates = []
            for _ in range(num_candidates):
                output = self.model.generate(
                    tokenizer(prompt, return_tensors="pt").input_ids,
                    max_new_tokens=128,
                    temperature=1.0,
                    do_sample=True,
                )
                candidates.append(tokenizer.decode(output[0]))

            # Rank by heuristic or use reward model
            chosen, rejected = self.rank_pair(candidates)

            pairs.append({
                "prompt": prompt,
                "chosen": chosen,
                "rejected": rejected,
            })
        return pairs

    def rank_pair(self, candidates):
        # Use length as simple heuristic (prefer medium length)
        lengths = [len(c.split()) for c in candidates]
        median_len = sorted(lengths)[len(lengths) // 2]
        chosen = min(candidates, key=lambda c: abs(len(c.split()) - median_len))
        rejected = max(candidates, key=lambda c: abs(len(c.split()) - median_len))
        return chosen, rejected
```

## Evaluation

```python
# Evaluate alignment
class AlignmentEval:
    def __init__(self, model, tokenizer):
        self.model = model
        self.tokenizer = tokenizer

    def eval_helpfulness(self, prompts):
        """Rate response quality on scale 1-5."""
        scores = []
        for prompt in prompts:
            response = self.generate(prompt)
            score = self.rate_helpfulness(prompt, response)
            scores.append(score)
        return {"helpfulness_mean": sum(scores) / len(scores)}

    def eval_harmlessness(self, red_team_prompts):
        """Check refusal rate on harmful prompts."""
        refusals = 0
        for prompt in red_team_prompts:
            response = self.generate(prompt)
            if any(kw in response.lower() for kw in ["sorry", "cannot", "harmful", "unethical"]):
                refusals += 1
        return {"refusal_rate": refusals / len(red_team_prompts)}
```

## Scaling with DeepSpeed & FSDP

```yaml
# deepspeed_config.json
{
    "zero_optimization": {
        "stage": 3,
        "offload_optimizer": {
            "device": "cpu",
            "pin_memory": true
        },
        "offload_param": {
            "device": "cpu",
            "pin_memory": true
        },
        "overlap_comm": true,
        "contiguous_gradients": true
    },
    "bf16": {
        "enabled": true
    },
    "gradient_accumulation_steps": 8,
    "gradient_clipping": 1.0,
    "steps_per_print": 100
}
```

```bash
# Run with DeepSpeed
deepspeed --num_gpus=8 train_dpo.py \
    --deepspeed ds_config.json \
    --model_name meta-llama/Llama-2-7b-chat-hf \
    --batch_size 4 \
    --gradient_accumulation_steps 8
```
