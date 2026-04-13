---
name: Error Recovery Instructions
description: 'Use when a data-store tool call fails and the agent must diagnose, adjust payloads, and retry safely.'
---

# Error Recovery Instructions

Handle failures with a small, deterministic loop and avoid repeating the same request unchanged.

## Recovery Flow

1. Capture the exact error and identify whether it is auth, schema, payload, syntax, permission, or network related.
2. Re-check connection selection with #tool:data-store/connections only if the target appears wrong or the connection may have changed.
3. Re-check payload requirements with #tool:data-store/payload only for payload/validation errors or provider changes.
4. Re-check structure with #tool:data-store/schema only when names, fields, or shape assumptions are suspect.
5. Retry once with a concrete fix.
6. If the second attempt fails for the same reason, stop retrying and report the blocker clearly.
7. Do not repeat identical #tool:data-store/payload or #tool:data-store/schema calls in the same recovery cycle unless the request inputs changed.

## Common Fix Patterns

- SQL: correct placeholder style and identifier quoting for the active dialect.
- REST/GraphQL: fix endpoint path, method, headers, or variables.
- MongoDB/Redis: fix key, collection, or command-specific payload field names.
- FTP/Object storage: fix path/container/bucket/key/blob naming and method-specific fields.
