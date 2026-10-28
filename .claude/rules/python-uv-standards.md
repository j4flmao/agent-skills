---
description: "j4flmao/rules — Python projects are managed exclusively with uv"
glob: "*.py,pyproject.toml,uv.lock"
---

# Python + uv Standards

Cursor/AI MUST follow these rules in any Python project of this org.

## 1. uv Is the Only Toolchain
- **Rule**: Use `uv sync`, `uv run`, `uv add`, `uv add --dev`, `uvx`. Never `pip install`, `python -m venv`, `poetry`, or a bare global `python`.
- **Why**: uv-managed interpreters + `uv.lock` give reproducible environments for every agent and CI.

## 2. src Layout + pyproject
- **Rule**: Code in `src/<package>/`, tests in `tests/`, all config (ruff, mypy, pytest) in `pyproject.toml`. Pin `requires-python` and keep `.python-version` for the dev interpreter.
- **Rule**: Optional/heavy dependencies go in `[project.optional-dependencies]` and are imported lazily with a clear "install extra X" error.

## 3. Quality Gate
- **Rule**: Before reporting completion run `uv run ruff check .`, `uv run ruff format --check .`, `uv run mypy src`, `uv run pytest -q` and report real output.

## 4. Typing & Style
- **Rule**: Full type hints, `mypy --strict` clean, `from __future__ import annotations`, frozen slotted dataclasses for value objects.
- **Rule**: `logging` (to stderr) instead of `print` in library code.

## 5. Lock Discipline
- **Rule**: Never hand-edit `uv.lock`. Change deps only through `uv add` / `uv remove` and commit `pyproject.toml` + `uv.lock` together.
