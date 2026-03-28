---
name: data-store-graphql
description: 'Execute operations against GraphQL servers, such as querying, mutating, and managing data. Use this skill to interact with GraphQL servers and perform various operations on them.'
---

# GraphQL Servers

**ALWAYS** #tool:read/readFile [these additional instructions](../../agents.instructions.md) to understand the Data Store flow, tools need to be used in the correct order in order for the tools to work properly.

- Use the #tool:data-store/select tool for GraphQL queries.
- Use the #tool:data-store/mutation tool for GraphQL mutations.
- The #tool:data-store/insert, #tool:data-store/update, and #tool:data-store/delete tools are supported aliases for mutations.

## Payload

- [Payload](references/payload.instructions.md)
