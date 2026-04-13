---
name: Tool Routing Instructions
description: 'Use when deciding which data-store tool to call for SQL, document, key-value, REST, GraphQL, FTP, and object storage operations.'
---

# Tool Routing Instructions

Choose tools by operation intent, not by wording alone. Resolve the target connection first, then verify payload shape before execution. Run discovery tools only when the corresponding context is unknown or stale; otherwise reuse existing context.

## Routing Rules

1. Use #tool:data-store/connections only when `connectionId` is unknown or stale.
2. Use #tool:data-store/payload only when payload context is unknown or stale.
3. Use #tool:data-store/schema only when schema context is unknown or stale.
4. Use #tool:data-store/select for read-only retrieval operations.
5. Use #tool:data-store/insert for create operations.
6. Use #tool:data-store/update for modify operations.
7. Use #tool:data-store/delete for removal operations.
8. Use #tool:data-store/mutation only for operations that do not fit basic CRUD (DDL, stored procedures, provider-specific mutations, complex multi-step commands).
9. Never use #tool:data-store/mutation for read/list/search/filter requests; use #tool:data-store/select
10. For follow-up read requests in the same connection/provider context, run #tool:data-store/select directly unless a validation error indicates payload/schema context is stale.
11. Do not call #tool:data-store/payload or #tool:data-store/schema repeatedly with identical inputs in the same turn.

## Provider Notes

- GraphQL operations may require mutation for write behavior even when intent maps to insert, update, or delete.
- FTP and object storage actions still follow CRUD intent but payload fields differ by provider.
- If tool capability is partial for a provider, report that limitation and route to the closest valid tool.
