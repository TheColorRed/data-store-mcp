# GraphQL Payload

Use this reference when constructing GraphQL requests through the data-store tools. GraphQL payloads include operation text and optional variables and headers, and should be reused across repeated calls in the same endpoint context. This document focuses on shape correctness and common pitfalls.
Concrete request examples are maintained in GraphQL asset files so this reference can focus on required fields and routing rules. Use these sections to verify whether a payload is structurally correct before execution. Then copy the closest asset template and adjust only operation-specific values.

## Field Details

GraphQL payloads are compact but sensitive to field correctness, especially when variables are required. This section describes each top-level field and how it interacts with operation execution. Validate fields here first if a request fails before changing tool routing.

- `query`: GraphQL query or mutation string.
- `variables`: Optional variables object for the query or mutation.
- `headers`: Optional request headers merged with connection config headers.

## Tool Mapping

Tool mapping should follow operation intent rather than endpoint type alone. Read-oriented query execution belongs on select, while write-oriented operations belong on mutation-aligned routes. Using the correct tool first reduces retries and avoids mismatched validation behavior.

- Use #tool:data-store/select for read-only GraphQL queries.
- Use #tool:data-store/mutation for GraphQL mutations.
- Use #tool:data-store/insert, #tool:data-store/update, or #tool:data-store/delete only when aliases are explicitly needed.

## Common Mistakes

Most GraphQL request failures come from intent mismatches or missing runtime inputs. This checklist highlights common errors that are easy to repeat when iterating quickly. Review it before retrying to avoid loops caused by payload drift.

- Sending mutation operations through `select`.
- Omitting variables referenced by the operation text.
- Repeating payload discovery for unchanged endpoint and operation pattern.

## Example Assets

Use these assets as canonical payload templates for GraphQL operations. They provide concrete patterns for query and mutation flows without embedding redundant JSON in this page. Start with the nearest operation and customize query text, variables, and headers.

- [assets/graphql/select.json](../assets/graphql/select.json)
- [assets/graphql/mutation.json](../assets/graphql/mutation.json)
- [assets/graphql/insert.json](../assets/graphql/insert.json)
- [assets/graphql/update.json](../assets/graphql/update.json)
- [assets/graphql/delete.json](../assets/graphql/delete.json)
