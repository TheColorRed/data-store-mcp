---
name: data-store-document
description: 'Use when working with NoSQL data sources, currently MongoDB, to query documents, write documents, inspect collections, or delete data.'
---

# NoSQL

Use this skill when the user needs to work with document-oriented data sources such as MongoDB.

**ALWAYS** #tool:read/readFile [these additional instructions](../../agents.instructions.md) to understand the Data Store flow, tools need to be used in the correct order in order for the tools to work properly.

## When To Use

- Use this skill when the user wants to query, insert, update, or delete MongoDB documents.
- Use this skill when the user needs collection-level operations or MongoDB-specific payload guidance.

## Tool Usage

## MongoDB

- Use the #tool:data-store/select tool to query documents in a collection (`SELECT`).
- Use the #tool:data-store/insert tool to insert documents (`INSERT`).
- Use the #tool:data-store/update tool to update documents (`UPDATE`).
- Use the #tool:data-store/delete tool to delete documents (`DELETE`).
- Use the #tool:data-store/mutation tool as a generic dispatcher for `SELECT`, `INSERT`, `UPDATE`, `DELETE`, and `DELETE_TABLE`.

## NoSQL Payload

**ALWAYS** read the payload instructions document at least once before using the NoSQL skill to understand how to properly format the payload for NoSQL operations, including the required and optional fields for different operation types.

MongoDB uses a method-driven payload that includes collection name, filters, and optional values for writes. Refer to the MongoDB payload documentation for the supported fields and shapes.

- [MongoDB Payload](references/payload-mongo.instructions.md)
