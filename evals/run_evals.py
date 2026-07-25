import os
import json
import argparse
from typing import Dict, Any, List

def load_test_cases(test_cases_dir: str) -> List[Dict[str, Any]]:
    """Loads all JSON test cases from the specified directory."""
    test_cases = []
    if not os.path.exists(test_cases_dir):
        print(f"Warning: Test cases directory '{test_cases_dir}' does not exist.")
        return test_cases
        
    for filename in os.listdir(test_cases_dir):
        if filename.endswith(".json"):
            filepath = os.path.join(test_cases_dir, filename)
            with open(filepath, 'r', encoding='utf-8') as f:
                try:
                    test_case = json.load(f)
                    test_case['_filename'] = filename
                    test_cases.append(test_case)
                except json.JSONDecodeError as e:
                    print(f"Error reading {filename}: {e}")
    return test_cases

def simulate_agent_output(test_case: Dict[str, Any]) -> str:
    """
    Simulates getting output from an agent based on the prompt.
    In a real eval framework, this would call the actual agent API.
    """
    # Mocking agent output for demonstration
    prompt = test_case.get('prompt', '')
    if "React" in prompt:
        return "Here is the React component using functional components and hooks."
    return "Generic agent response."

def call_llm_judge(agent_output: str, test_case: Dict[str, Any]) -> Dict[str, Any]:
    """
    Simulates an LLM judge evaluating the output against constraints.
    In a real framework, this would call an LLM API (e.g., GPT-4 or Claude).
    """
    expected_constraints = test_case.get('expected_constraints', [])
    skill_file = test_case.get('skill_file', 'unknown')
    
    # Mock evaluation logic
    score = 1.0
    feedback = []
    for constraint in expected_constraints:
        if "functional components" in constraint.lower() and "functional components" not in agent_output.lower():
            score -= 1.0 / len(expected_constraints)
            feedback.append(f"Failed constraint: {constraint}")
        elif "hooks" in constraint.lower() and "hooks" not in agent_output.lower():
            score -= 1.0 / len(expected_constraints)
            feedback.append(f"Failed constraint: {constraint}")
        else:
             feedback.append(f"Passed constraint: {constraint}")
            
    # Ensure score is bound between 0 and 1
    score = max(0.0, min(1.0, score))
    passed = score >= 0.8
    
    return {
        "score": score,
        "passed": passed,
        "feedback": feedback
    }

def run_evaluations(test_cases_dir: str):
    """Runs all evaluations in the given directory."""
    print(f"Starting evaluations from {test_cases_dir}...")
    test_cases = load_test_cases(test_cases_dir)
    
    if not test_cases:
        print("No test cases found. Exiting.")
        return

    results = []
    total_passed = 0
    
    for tc in test_cases:
        name = tc.get('name', tc.get('_filename'))
        print(f"\nEvaluating: {name}")
        
        # 1. Get Agent Output
        agent_output = simulate_agent_output(tc)
        print(f"Agent Output snippet: {agent_output[:50]}...")
        
        # 2. Judge the Output
        eval_result = call_llm_judge(agent_output, tc)
        
        # 3. Record Result
        if eval_result['passed']:
            print(f"Result: PASS (Score: {eval_result['score']:.2f})")
            total_passed += 1
        else:
            print(f"Result: FAIL (Score: {eval_result['score']:.2f})")
            
        print("Feedback:")
        for fb in eval_result['feedback']:
            print(f"  - {fb}")
            
        results.append({
            "test_case": name,
            "result": eval_result
        })

    # Summary
    print("\n" + "="*40)
    print("EVALUATION SUMMARY")
    print("="*40)
    print(f"Total Tests : {len(test_cases)}")
    print(f"Passed      : {total_passed}")
    print(f"Failed      : {len(test_cases) - total_passed}")
    print(f"Success Rate: {(total_passed / len(test_cases)) * 100:.1f}%")
    
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run Agent Skill Evaluations")
    parser.add_argument("--test-dir", type=str, default="evals/test_cases", help="Directory containing test case JSON files")
    args = parser.parse_args()
    
    run_evaluations(args.test_dir)
