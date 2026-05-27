# Python Packaging and Dependency Management

## Overview
Python packaging encompasses tools and practices for distributing Python projects. Modern tools like Poetry, PDM, and pip-tools improve dependency resolution, virtual environment management, and publishing workflows.

## Modern Packaging Tools

### Poetry
```toml
# pyproject.toml
[tool.poetry]
name = "myapp"
version = "0.1.0"
description = "My application"
authors = ["Alice <alice@example.com>"]
license = "MIT"
readme = "README.md"
homepage = "https://github.com/alice/myapp"
repository = "https://github.com/alice/myapp"

[tool.poetry.dependencies]
python = "^3.11"
fastapi = "^0.104.0"
uvicorn = {version = "^0.24.0", extras = ["standard"]}
pydantic = "^2.5.0"
sqlalchemy = "^2.0.0"
alembic = "^1.12.0"
httpx = {version = "^0.25.0", optional = true}
redis = "^5.0.0"

[tool.poetry.group.dev.dependencies]
pytest = "^7.4.0"
pytest-cov = "^4.1.0"
ruff = "^0.1.0"
mypy = "^1.7.0"
black = "^23.11.0"
pre-commit = "^3.5.0"

[tool.poetry.group.docs.dependencies]
mkdocs = "^1.5.0"
mkdocs-material = "^9.4.0"

[tool.poetry.scripts]
myapp = "myapp.cli:main"

[build-system]
requires = ["poetry-core"]
build-backend = "poetry.core.masonry.api"
```

```bash
# Poetry commands
poetry new myapp
poetry init
poetry add fastapi
poetry add --group dev pytest
poetry install
poetry install --without dev
poetry update
poetry shell
poetry build
poetry publish
poetry export -f requirements.txt --output requirements.txt
```

### pip-tools
```txt
# requirements.in
fastapi>=0.104.0
uvicorn[standard]>=0.24.0
pydantic>=2.5.0
sqlalchemy>=2.0.0
alembic>=1.12.0
redis>=5.0.0

# Compile with: pip-compile requirements.in
# Output: requirements.txt with pinned versions
```

```bash
# pip-tools workflow
pip-compile requirements.in
pip-compile dev-requirements.in
pip-sync requirements.txt dev-requirements.txt
```

## Virtual Environments

### Environment Management
```bash
# venv (built-in)
python -m venv .venv
source .venv/bin/activate  # Linux/macOS
.venv\Scripts\activate     # Windows
pip install -r requirements.txt
deactivate

# virtualenv (more features)
pip install virtualenv
virtualenv .venv --python=3.11

# pyenv-virtualenv
pyenv virtualenv 3.11.5 myapp-env
pyenv activate myapp-env

# conda
conda create -n myapp python=3.11
conda activate myapp
```

## Package Structure

### Standard Layout
```
myapp/
├── pyproject.toml
├── README.md
├── LICENSE
├── .gitignore
├── src/
│   └── myapp/
│       ├── __init__.py
│       ├── __main__.py
│       ├── cli.py
│       ├── config.py
│       ├── models.py
│       ├── services/
│       │   ├── __init__.py
│       │   ├── user_service.py
│       │   └── auth_service.py
│       └── utils/
│           ├── __init__.py
│           └── validators.py
├── tests/
│   ├── __init__.py
│   ├── conftest.py
│   ├── test_models.py
│   ├── test_services/
│   │   ├── __init__.py
│   │   └── test_user_service.py
│   └── fixtures/
│       └── test_data.json
└── docs/
    ├── index.md
    └── installation.md
```

### Entry Points
```python
# src/myapp/__main__.py
from myapp.cli import main

if __name__ == "__main__":
    main()

# src/myapp/cli.py
import argparse

def main():
    parser = argparse.ArgumentParser(description="MyApp CLI")
    parser.add_argument("--config", default="config.yml")
    args = parser.parse_args()
    run_app(args.config)
```

## Dependency Resolution

### Version Specifiers
```python
# Exact version
package==1.2.3

# Compatible release
package~=1.2.3  # >=1.2.3, ==1.2.*
package~=1.2    # >=1.2.0, ==1.*

# Greater/Less than
package>=1.0.0
package<=2.0.0
package>1.5.0

# Range
package>=1.0.0,<2.0.0

# Wildcard
package==1.2.*

# Not equal
package!=1.3.0
```

### Lock Files
```bash
# Poetry lock
poetry lock

# pip-tools
pip-compile --generate-hashes requirements.in

# Pipenv
pipenv lock

# PDM
pdm lock
```

## Publishing

### Building and Publishing
```bash
# Build distributions
python -m build
# or
poetry build

# Check distribution
twine check dist/*

# Publish to PyPI
twine upload dist/*
# or
poetry publish

# Publish to Test PyPI
twine upload --repository testpypi dist/*
```

### Package Metadata
```toml
[project]
name = "myapp"
version = "0.1.0"
description = "My awesome Python package"
requires-python = ">=3.11"
license = {text = "MIT"}
authors = [
    {name = "Alice", email = "alice@example.com"},
]
classifiers = [
    "Development Status :: 4 - Beta",
    "Programming Language :: Python :: 3",
    "Programming Language :: Python :: 3.11",
    "License :: OSI Approved :: MIT License",
]
dependencies = [
    "fastapi>=0.104.0",
    "uvicorn[standard]>=0.24.0",
]

[project.urls]
Homepage = "https://github.com/alice/myapp"
Documentation = "https://myapp.readthedocs.io"
Repository = "https://github.com/alice/myapp"

[project.optional-dependencies]
dev = [
    "pytest>=7.4.0",
    "mypy>=1.7.0",
    "ruff>=0.1.0",
]
docs = [
    "mkdocs>=1.5.0",
    "mkdocs-material>=9.4.0",
]

[project.scripts]
myapp = "myapp.cli:main"
```

## Key Points
- pyproject.toml is the modern standard for Python packaging
- Poetry manages dependencies, virtual environments, and publishing
- pip-tools compiles loose requirements into pinned versions
- Source layout (src/) prevents import confusion
- Version specifiers follow PEP 440
- Lock files ensure reproducible installations
- Virtual environments isolate project dependencies
- Build backends: setuptools, poetry-core, flit_core, hatchling
- Entry points define CLI commands
- Optional dependencies group related extras
- Twine uploads distributions to PyPI
- Local development installs with pip install -e .
- Dependency resolution handles transitive dependencies
- Hash-locked requirements verify package integrity
- Semantic versioning communicates update impact
- Pre-commit hooks automate linting and formatting
- CI/CD should cache dependency installations
- Private package indices for internal packages
- Platform-specific dependencies with markers
- Conda for non-Python dependencies (NumPy, SciPy)
