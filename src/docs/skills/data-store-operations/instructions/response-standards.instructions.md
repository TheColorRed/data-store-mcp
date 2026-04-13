---
name: Response Standards Instructions
description: 'Use when presenting data-store tool results so outputs are concise, consistent, and auditable across all providers.'
---

# Response Standards Instructions

Return useful outcomes first, then include the minimum technical detail needed for traceability.

## Output Format

1. State what operation ran and on which `connectionId`.
2. Summarize result counts (rows, records, objects, files, or affected items).
3. Include key identifiers changed or retrieved.
4. Include relevant warnings or skipped steps.
5. For failures, include root cause and the next actionable fix.

## Consistency Rules

- Do not expose secrets, tokens, or credentials in output.
- Keep payload and query echoes concise; include full content only when explicitly requested.
- Use consistent terminology by provider (rows for SQL, documents for MongoDB, keys for Redis, objects for S3/Azure Blob, files for FTP, responses for REST/GraphQL).
