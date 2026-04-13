---
name: Provider Capability Matrix Instructions
description: 'Use when validating whether a requested operation is supported by SQL, document, key-value, REST, GraphQL, FTP, or object storage providers.'
---

# Provider Capability Matrix Instructions

Use this reference to set expectations and avoid invalid tool usage.

## Capability Summary

- SQL: full CRUD plus mutation and schema.
- Document (MongoDB): CRUD and mutation patterns through provider payload rules.
- Key-Value (Redis): CRUD-style operations mapped to key and hash operations.
- REST: endpoint-driven operations; schema support may be limited.
- GraphQL: read via query and write via mutation semantics.
- FTP: file and directory operations mapped through payload fields.
- Object storage: object read, list, upload, update, and delete by container/bucket and key/blob.

## Routing Guidance

If requested behavior is unsupported or ambiguous for a provider, state the limitation, choose the closest safe operation, and explain the adjustment.
