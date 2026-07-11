import os
import glob

skills_dir = "d:/j4flmao-org/skills"
modified_count = 0

for root, _, files in os.walk(skills_dir):
    for file in files:
        if file.endswith(".md"):
            file_path = os.path.join(root, file)
            try:
                with open(file_path, "r", encoding="utf-8") as f:
                    content = f.read()
                
                original_content = content
                
                # \f is form feed (0x0C), \r is carriage return (0x0D)
                # We replace \f + rac with \frac
                # We replace \r + ight with \right
                
                content = content.replace("\x0crac", "\\frac")
                content = content.replace("\right", "\\right") # Wait, \r is \x0d. \x0dight -> \right
                content = content.replace("\x0dight", "\\right")
                
                if content != original_content:
                    with open(file_path, "w", encoding="utf-8") as f:
                        f.write(content)
                    modified_count += 1
            except Exception as e:
                print(f"Error processing {file_path}: {e}")

print(f"Fixed mathematical LaTeX errors in {modified_count} files.")
