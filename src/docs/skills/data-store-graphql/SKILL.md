---
name: data-store-graphql
description: 'ALWAYS load this skill before any GraphQL operation — even if you are familiar with the GraphQL query language. Skipping it is a leading cause of failures from wrong tool routing, missing variables fields, and treating GraphQL like a REST endpoint. Use when working with GraphQL APIs to run queries, send mutations, or inspect responses. This skill mandates: (1) reading the payload reference before constructing any operation so the query string, variables, and headers are shaped correctly, (2) routing all read/list/search GraphQL queries to the select tool — not mutation, (3) routing all GraphQL mutations to the mutation tool — not insert/update/delete unless they are aliases, and (4) never using REST payload guidance for a GraphQL endpoint even if it is served over HTTP. GraphQL is not REST — REST patterns produce invalid requests. Co-load with domain skills — they provide context; this skill governs operation authoring and routing. They are complementary, not interchangeable.'
---

**ALWAYS** #tool:read/readFile [these additional instructions](../../instructions/agents.instructions.md) to understand the Data Store flow, tools need to be used in the correct order in order for the tools to work properly.

# GraphQL Servers

Use this skill when the user needs to interact with a GraphQL API using queries or mutations. GraphQL payloads center on operation text and optional variables, with routing based on read versus mutation intent. This skill helps map those operations to the appropriate data-store tools while keeping request shape provider-correct.

## When To Use

Use this skill whenever the source is a GraphQL endpoint and the user asks for query or mutation execution. It applies to both simple retrieval operations and write-oriented mutation flows. Prefer this skill over REST guidance when the request is GraphQL operation text driven.

- Use this skill when the user wants to run GraphQL queries.
- Use this skill when the user wants to execute GraphQL mutations or otherwise send GraphQL operation payloads.

## Tool Usage

GraphQL read requests should route to `select`, while write-style operations generally route to `mutation`. The insert/update/delete tools are supported aliases for mutation semantics, but `select` remains the preferred tool for read/list/search behavior. Always choose tools by operation intent, not by keyword frequency.

- Use the #tool:data-store/select tool for GraphQL queries.
- Use the #tool:data-store/mutation tool for GraphQL mutations.
- The #tool:data-store/insert, #tool:data-store/update, and #tool:data-store/delete tools are supported aliases for mutations.

## GraphQL Payload

GraphQL payloads typically contain a `query` string plus optional `variables` and request headers. Read the payload reference before constructing operations when shape is unknown or stale. Reuse known payload context across repeated calls in the same endpoint/provider context.

**ALWAYS** read the payload instructions document at least once before using the GraphQL skill to understand how to properly format the payload for GraphQL operations, including the required and optional fields for different operation types.

- [Payload](references/payload.instructions.md)

## Example Assets

Use these GraphQL payload assets as operation templates for query and mutation flows.
These templates prevent duplicated inline examples and keep request shapes consistent across docs. They also provide quick starting points for common operation types without re-reading the full payload reference each time. Copy the matching asset first, then adjust operation text, variables, and headers.

- [GraphQL SELECT payload](assets/graphql/select.json)
- [GraphQL mutation payload](assets/graphql/mutation.json)
- [GraphQL INSERT payload](assets/graphql/insert.json)
- [GraphQL UPDATE payload](assets/graphql/update.json)
- [GraphQL DELETE payload](assets/graphql/delete.json)
