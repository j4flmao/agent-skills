# Bazel Build Graphs Reference
## Overview
Configuration and examples for Bazel monorepo builds.
```starlark
load("@rules_python//python:defs.bzl", "py_binary")

py_binary(
    name = "my_app",
    srcs = ["my_app.py"],
    deps = [
        "//lib:my_lib",
    ],
)
```
