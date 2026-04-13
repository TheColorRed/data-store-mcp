---
name: Tool Routing Instructions
description: 'Use when deciding which data-store tool to call for SQL, document, key-value, REST, GraphQL, FTP, and object storage operations.'
---

# Tool Routing Instructions

Choose tools by operation intent, not by wording alone. Resolve the target connection first, then verify payload shape before execution. Run discovery tools only when the corresponding context is unknown or stale; otherwise reuse existing context.

## Routing Rules

1. Use #tool:data-store/connections only when `connectionId` is unknown or stale.
2. For a new user request, if the current request does not explicitly provide the exact `connectionId`, start by calling #tool:data-store/connections.
3. Use #tool:data-store/payload only when payload context is unknown or stale.
4. Use #tool:data-store/schema only when schema context is unknown or stale.
5. Use #tool:data-store/select for read-only retrieval operations.
6. Use #tool:data-store/insert for create operations.
7. Use #tool:data-store/update for modify operations.
8. Use #tool:data-store/delete for removal operations.
9. Use #tool:data-store/mutation only for operations that do not fit basic CRUD (DDL, stored procedures, provider-specific mutations, complex multi-step commands).
10. Never use #tool:data-store/mutation for read/list/search/filter requests; use #tool:data-store/select
11. Never use #tool:data-store/mutation for SQL metadata discovery such as `SHOW TABLES`, `SHOW CREATE TABLE`, `DESCRIBE`, `EXPLAIN`, `PRAGMA`, or metadata-table exploration when `connections` or `schema` is the right discovery tool.
12. For follow-up read requests in the same connection/provider context, run #tool:data-store/select directly unless a validation error indicates payload/schema context is stale.
13. Do not call #tool:data-store/payload or #tool:data-store/schema repeatedly with identical inputs in the same turn.
14. After a successful discovery call, the next step should normally be an execution tool, not another discovery call with the same inputs.
15. If a user asks for records, rows, matching items, or filtered results, do not stop at schema inspection once the target structure is known.
16. Repeating `schema` after it already identified the relevant tables or columns is an error unless the target changed or a mismatch error occurred.

## Provider Notes

- GraphQL operations may require mutation for write behavior even when intent maps to insert, update, or delete.
- FTP and object storage actions still follow CRUD intent but payload fields differ by provider.
- If tool capability is partial for a provider, report that limitation and route to the closest valid tool.
