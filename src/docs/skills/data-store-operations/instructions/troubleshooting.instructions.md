---
name: Troubleshooting Instructions
description: 'Use when diagnosing data-store issues and directing users to the correct instruction or skill reference quickly.'
---

# Troubleshooting Instructions

Map failures to the most likely source and recommended next check.

## Quick Triage

1. Connection not found: run #tool:data-store/connections and confirm `connectionId`.
2. Payload validation error: run #tool:data-store/payload and correct required fields.
3. Unknown table/collection/key: run #tool:data-store/schema if supported.
4. Permission denied: verify source credentials and tool restrictions.
5. Syntax error: verify provider-specific formatting and placeholders.

Use the above discovery tools only for the corresponding failure mode, not as a default pre-step for every operation.

## Reference Routing

- SQL issues: `skills/data-store-sql/references/`
- MongoDB issues: `skills/data-store-document/references/payload-mongo.instructions.md`
- Redis issues: `skills/data-store-key-value/references/`
- REST issues: `skills/data-store-rest/references/payload.instructions.md`
- GraphQL issues: `skills/data-store-graphql/references/payload.instructions.md`
- FTP issues: `skills/data-store-ftp/references/payload.instructions.md`
- Object storage issues: `skills/data-store-object-storage/references/`
