---
name: Generated Zod compatibility
description: Workspace-specific compatibility note for Orval-generated Zod validators.
---

Orval can generate helpers such as `zod.int()` even though this workspace resolves the runtime validator package to Zod 3. Generated validators must use the equivalent Zod 3-compatible form, such as `zod.number().int()`, before library typechecks and the API server can build.

**Why:** Regenerating the API contract can reintroduce the mismatch even when the OpenAPI change itself is valid.

**How to apply:** After every API codegen run, check generated Zod output for Zod 4-only helpers and apply the established compatibility adjustment before running the workspace typechecks.