# Agent Planning Strategies

## Overview
Planning strategies define how agents decompose tasks, sequence actions, and adapt to changing conditions. The right strategy depends on task complexity, environment dynamics, and available compute.

## Planning Paradigms

### Task Decomposition

#### Hierarchical Decomposition
Break high-level goals into subgoals, then sub-subgoals. Each level abstracts implementation details.

```
Goal: "Plan a marketing campaign"
├── Research phase
│   ├── Analyze competitor campaigns
│   ├── Survey target audience
│   └── Identify channel performance
├── Strategy phase
│   ├── Define messaging pillars
│   ├── Select channels
│   └── Allocate budget
└── Execution phase
    ├── Create content calendar
    ├── Set up tracking
    └── Launch campaigns
```

```python
class HierarchicalPlanner:
    def plan(self, goal: str, depth: int = 3) -> list[Task]:
        if depth == 0:
            return [ExecutableTask(goal)]

        subgoals = self.decompose(goal)
        tasks = []
        for subgoal in subgoals:
            if self.needs_decomposition(subgoal):
                tasks.extend(self.plan(subgoal, depth - 1))
            else:
                tasks.append(ExecutableTask(subgoal))
        return tasks

    def decompose(self, goal: str) -> list[str]:
        prompt = f"Break down this goal into 3-5 subgoals:\nGoal: {goal}"
        response = self.llm.generate(prompt)
        return self.parse_subgoals(response)

    def needs_decomposition(self, goal: str) -> bool:
        prompt = f"Can this be done in one step? Answer yes/no:\n{goal}"
        return "no" in self.llm.generate(prompt).lower()
```

#### Sequential Planning
Ordered plan where step N+1 depends on step N. Each step produces output consumed by the next.

```python
class SequentialPlanner:
    def create_plan(self, goal: str) -> list[dict]:
        prompt = f"""
Create a sequential plan for: {goal}
Each step must specify:
- action: what to do
- input: what's needed
- output: what's produced
- depends_on: previous step index

Output as JSON list with 3-7 steps.
"""
        response = self.llm.generate(prompt)
        return json.loads(response)

    def execute_plan(self, plan: list[dict]) -> dict:
        context = {}
        for i, step in enumerate(plan):
            step_input = {**context, **step.get("input", {})}
            result = self.executor.execute(step["action"], step_input)
            context[step["output"]] = result
            context["_last_result"] = result
        return context
```

### Dynamic Replanning

#### Replan-on-Failure
When a step fails, the planner regenerates the remaining plan considering the failure context.

```python
class ReplanningAgent:
    def __init__(self):
        self.max_replans = 3
        self.replan_count = 0

    def execute_with_replan(self, goal: str):
        plan = self.planner.create_plan(goal)
        completed = []

        for step in plan:
            result = self.executor.execute(step)
            if result.failed and self.replan_count < self.max_replans:
                remaining_goal = self.format_remaining_goal(goal, completed)
                plan = self.planner.replan(remaining_goal, result.error)
                self.replan_count += 1
                continue
            elif result.failed:
                return self.handle_failure(goal, completed, result)
            completed.append(result)
            self.replan_count = 0

        return self.synthesize(goal, completed)
```

#### Continuous Replanning
Re-evaluate the plan after every step. The agent compares the actual outcome with the expected outcome and adjusts.

```python
class ContinuousPlanner:
    def execute(self, goal: str):
        plan = None
        context = {"goal": goal}

        while not self.is_goal_achieved(context):
            if plan is None:
                plan = self.plan(goal)

            current_step = self.select_next_step(plan, context)
            expected = self.predict_outcome(current_step, context)
            actual = self.executor.execute(current_step)

            if self.is_diverging(expected, actual):
                plan = self.replan(goal, context, actual)
            else:
                context = self.update_context(context, actual)
                plan = self.mark_completed(plan, current_step)

        return context
```

### Monte Carlo Tree Search (MCTS) Planning

Used for tasks with branching decisions where you can simulate outcomes before committing.

```python
class MCTSPlanner:
    def __init__(self, simulator, max_simulations=100):
        self.simulator = simulator
        self.max_simulations = max_simulations

    def plan(self, state, depth=5):
        root = Node(state)
        for _ in range(self.max_simulations):
            node = self.select(root)
            if node.visits > 0 and node.depth < depth:
                node = self.expand(node)
            reward = self.simulate(node)
            self.backpropagate(node, reward)
        return self.best_path(root)

    def select(self, node):
        while node.children and not node.is_terminal():
            node = max(node.children, key=self.uct_score)
        return node

    def uct_score(self, node):
        exploitation = node.value / (node.visits + 1e-6)
        exploration = (2 * np.log(node.parent.visits) / (node.visits + 1e-6)) ** 0.5
        return exploitation + exploration

    def expand(self, node):
        actions = self.simulator.valid_actions(node.state)
        for action in actions:
            child_state = self.simulator.transition(node.state, action)
            child = Node(child_state, parent=node, action=action)
            node.children.append(child)
        return random.choice(node.children) if node.children else node

    def simulate(self, node):
        state = node.state
        depth = 0
        while not self.simulator.is_terminal(state) and depth < 10:
            action = random.choice(self.simulator.valid_actions(state))
            state = self.simulator.transition(state, action)
            depth += 1
        return self.simulator.reward(state)

    def backpropagate(self, node, reward):
        while node:
            node.visits += 1
            node.value += reward
            node = node.parent
```

### LLM-based Planning with Feedback

#### Self-Critique Planning
The agent generates a plan, critiques it, revises, and iterates.

```python
class SelfCritiquePlanner:
    def plan_with_critique(self, goal: str, max_iterations=3):
        plan = self.llm.generate(f"Create a plan for: {goal}")

        for i in range(max_iterations):
            critique = self.llm.generate(f"""
Critique this plan for: {goal}
Plan: {plan}
Evaluate: completeness, correctness, efficiency, risks.
Output specific issues to fix.
""")
            if "no issues" in critique.lower():
                return plan

            plan = self.llm.generate(f"""
Original goal: {goal}
Previous plan: {plan}
Critique: {critique}
Revise the plan addressing all critique points.
""")

        return plan
```

#### Verification-Aware Planning
Plan includes verification steps that check intermediate results against expected outcomes.

```
Plan:
Step 1: Extract customer data from CRM
  Verify: data has expected fields and non-null
Step 2: Calculate churn risk scores
  Verify: scores in range 0-100, no NaN values
Step 3: Segment customers
  Verify: segments sum to total customers
Step 4: Generate intervention plan
  Verify: each segment has at least one intervention
```

### Plan Representation Formats

#### JSON Plan
```json
{
  "goal": "Generate Q4 report",
  "steps": [
    {
      "id": 1,
      "action": "collect_metrics",
      "inputs": {"quarter": "Q4", "year": 2025},
      "expected_output": "metrics_dataframe",
      "verification": "non_empty"
    },
    {
      "id": 2,
      "action": "generate_charts",
      "inputs": {"data": "$step1.output"},
      "expected_output": "chart_urls",
      "verification": "urls_valid"
    }
  ],
  "error_handling": {
    "1": "use cached_data",
    "2": "use_chart_template"
  }
}
```

#### DAG Plan (Parallel Steps)
```python
class DAGPlanner:
    def create_dag_plan(self, goal: str) -> dict:
        prompt = f"""
Create a DAG plan for: {goal}
Parallel steps can be at the same level.
Output as: {{"nodes": [{{"id", "action", "depends_on": []}}]}}
"""
        plan = json.loads(self.llm.generate(prompt))
        return self.validate_dag(plan)

    def execute_dag(self, plan: dict):
        dag = self.build_dag(plan["nodes"])
        results = {}
        in_progress = set()

        while not dag.is_complete():
            ready = [n for n in dag.nodes
                     if all(d in results for d in n.depends_on)
                     and n.id not in in_progress]
            for node in ready:
                in_progress.add(node.id)
                inputs = {k: results[d] for d in node.depends_on}
                asyncio.create_task(self.execute_node(node, inputs, results))

            await asyncio.sleep(0.1)

        return results
```

### Plan Execution Monitoring

```python
class PlanMonitor:
    def __init__(self):
        self.metrics = {"planned": 0, "completed": 0, "failed": 0, "replanned": 0}

    def track_step(self, step_id: str, status: str, duration: float, error: str = ""):
        self.metrics[status] += 1
        logger.info(f"Step {step_id}: {status} in {duration:.2f}s")
        if error:
            logger.error(f"Step {step_id} failed: {error}")

    def summary(self) -> dict:
        completion = self.metrics["completed"] / max(self.metrics["planned"], 1)
        return {
            "completion_rate": completion,
            "total_steps": self.metrics["planned"],
            "failures": self.metrics["failed"],
            "replans": self.metrics["replanned"],
        }
```

## Key Points
- Use hierarchical decomposition for complex goals with natural sub-structure
- Sequential planning for pipeline tasks where order matters
- Replan-on-failure for unpredictable environments
- MCTS planning when simulation is cheap and branching is wide
- Self-critique planning when plan quality matters more than speed
- Always include verification steps in critical path plans
- Monitor plan execution health: completion rate, step duration, failure patterns
- DAG plans for parallel execution opportunities
- Plan representation should be machine-parseable (JSON, YAML)
- Balance planning depth vs execution: overplanning wastes tokens, underplanning causes failures
