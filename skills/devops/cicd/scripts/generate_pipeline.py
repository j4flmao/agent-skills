import argparse
import sys
import os

NODE_PIPELINE = """\
name: Node.js CI/CD Pipeline

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Use Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '18.x'
    - run: npm ci
    - run: npm run build --if-present
    - run: npm test

  sast-scan:
    needs: build-and-test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Run njsscan
      id: njsscan
      uses: ajinabraham/njsscan-action@master
      with:
        args: '. --sarif --output results.sarif || true'
    - name: Upload njsscan report
      uses: github/codeql-action/upload-sarif@v2
      with:
        sarif_file: results.sarif

  deploy:
    needs: sast-scan
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - name: Deploy
      run: echo "Deploying Node application..."
"""

PYTHON_PIPELINE = """\
name: Python CI/CD Pipeline

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.10'
    - name: Install dependencies
      run: |
        python -m pip install --upgrade pip
        pip install flake8 pytest
        if [ -f requirements.txt ]; then pip install -r requirements.txt; fi
    - name: Lint with flake8
      run: |
        flake8 . --count --select=E9,F63,F7,F82 --show-source --statistics
    - name: Test with pytest
      run: |
        pytest

  sast-scan:
    needs: build-and-test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Run Bandit
      uses: PyCQA/bandit-action@v1
      with:
        target: '.'

  deploy:
    needs: sast-scan
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - name: Deploy
      run: echo "Deploying Python application..."
"""

GO_PIPELINE = """\
name: Go CI/CD Pipeline

on:
  push:
    branches: [ "main" ]
  pull_request:
    branches: [ "main" ]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Set up Go
      uses: actions/setup-go@v4
      with:
        go-version: '1.20'
    - name: Build
      run: go build -v ./...
    - name: Test
      run: go test -v ./...

  sast-scan:
    needs: build-and-test
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Run Gosec Security Scanner
      uses: securego/gosec@master
      with:
        args: ./...

  deploy:
    needs: sast-scan
    runs-on: ubuntu-latest
    if: github.ref == 'refs/heads/main'
    steps:
    - name: Deploy
      run: echo "Deploying Go application..."
"""

def main():
    parser = argparse.ArgumentParser(description="Generate a standardized CI/CD GitHub Actions YAML pipeline.")
    parser.add_argument("--type", choices=['node', 'go', 'python'], required=True, help="Project type")
    parser.add_argument("--output", default=".github/workflows/ci.yml", help="Output file path")
    
    args = parser.parse_args()
    
    pipelines = {
        'node': NODE_PIPELINE,
        'python': PYTHON_PIPELINE,
        'go': GO_PIPELINE
    }
    
    content = pipelines[args.type]
    
    out_path = args.output
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    
    with open(out_path, 'w') as f:
        f.write(content)
        
    print(f"Successfully generated {args.type} pipeline at {out_path}")

if __name__ == "__main__":
    main()
