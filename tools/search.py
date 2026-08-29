import sys
sys.stdout.reconfigure(encoding='utf-8')
import os
import sys
import re
import argparse

# ANSI Colors for CLI
BLUE = '\033[94m'
GREEN = '\033[92m'
YELLOW = '\033[93m'
RESET = '\033[0m'

def search_skills(query, base_dir='skills'):
    print(f"\n🔍 Searching for {YELLOW}'{query}'{RESET} in {base_dir}/...\n")
    
    pattern = re.compile(query, re.IGNORECASE)
    match_count = 0

    for root, dirs, files in os.walk(base_dir):
        for file in files:
            if file.endswith('.md'):
                filepath = os.path.join(root, file)
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        lines = f.readlines()
                        
                    file_matched = False
                    for i, line in enumerate(lines):
                        if pattern.search(line):
                            if not file_matched:
                                print(f"{BLUE}📂 {filepath}{RESET}")
                                file_matched = True
                                match_count += 1
                            
                            # Print snippet (strip whitespace)
                            snippet = line.strip()
                            # Highlight query
                            highlighted = pattern.sub(lambda m: f"{GREEN}{m.group(0)}{RESET}", snippet)
                            print(f"   Line {i+1}: {highlighted}")
                    
                    if file_matched:
                        print("-" * 40)
                except Exception as e:
                    pass

    if match_count == 0:
        print("❌ No matches found.")
    else:
        print(f"✅ Found matches in {match_count} files.\n")

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='Search through Agent Skills')
    parser.add_argument('query', type=str, help='The text or regex to search for')
    args = parser.parse_args()
    
    # Run search starting from the project root's skills dir
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    skills_dir = os.path.join(project_root, 'skills')
    
    if os.path.exists(skills_dir):
        search_skills(args.query, skills_dir)
    else:
        print(f"Error: {skills_dir} not found. Are you running this from the project root?")
