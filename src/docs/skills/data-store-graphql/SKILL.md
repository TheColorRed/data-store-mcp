---
name: data-store-graphql
description: 'Use when working with GraphQL APIs to run queries, send mutations, and inspect GraphQL responses.'
---

# GraphQL Servers

Use this skill when the user needs to interact with a GraphQL API using queries or mutations.

**ALWAYS** #tool:read/readFile [these additional instructions](../../agents.instructions.md) to understand the Data Store flow, tools need to be used in the correct order in order for the tools to work properly.

## When To Use

- Use this skill when the user wants to run GraphQL queries.
- Use this skill when the user wants to execute GraphQL mutations or otherwise send GraphQL operation payloads.

## Tool Usage

- Use the #tool:data-store/select tool for GraphQL queries.
- Use the #tool:data-store/mutation tool for GraphQL mutations.
- The #tool:data-store/insert, #tool:data-store/update, and #tool:data-store/delete tools are supported aliases for mutations.

## GraphQL Payload

**ALWAYS** read the payload instructions document at least once before using the GraphQL skill to understand how to properly format the payload for GraphQL operations, including the required and optional fields for different operation types.

- [Payload](references/payload.instructions.md)
