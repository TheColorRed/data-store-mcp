---
name: data-store-document
description: 'Use when working with NoSQL data sources, currently MongoDB, to query documents, write documents, inspect collections, or delete data.'
---

# NoSQL

Use this skill when the user needs to work with document-oriented data sources such as MongoDB. Document stores are modeled around collections and JSON-like records rather than relational tables, so query and mutation patterns differ from SQL. This skill focuses on selecting, inserting, updating, and deleting documents while preserving MongoDB-specific payload expectations.

**ALWAYS** #tool:read/readFile [these additional instructions](../../agents.instructions.md) to understand the Data Store flow, tools need to be used in the correct order in order for the tools to work properly.

## When To Use

Use this skill whenever the requested operation targets MongoDB collections or document-shaped data. It applies to both read and write paths and is the correct entry point for method-driven MongoDB payloads. Prefer this skill over SQL guidance when the source is explicitly MongoDB or another document store.

- Use this skill when the user wants to query, insert, update, or delete MongoDB documents.
- Use this skill when the user needs collection-level operations or MongoDB-specific payload guidance.

## Tool Usage

MongoDB operations map cleanly to the shared data-store tools, but payload details remain MongoDB-specific. Use the routing below to pick the right tool first, then construct the method payload. Keep `mutation` for cases where a generic dispatcher is needed.
This separation keeps intent selection simple and moves provider complexity into payload construction. It also helps reduce accidental write calls when a read-only action is requested. In repeated requests with the same provider and action pattern, keep using the same routing unless new errors indicate stale assumptions.

## MongoDB

These mappings represent the primary CRUD flow for MongoDB-backed sources. Use `select` for read retrieval and reserve write tools for state-changing operations. The generic mutation path is available but should not replace standard CRUD usage when a specific tool fits.

- Use the #tool:data-store/select tool to query documents in a collection (`SELECT`).
- Use the #tool:data-store/insert tool to insert documents (`INSERT`).
- Use the #tool:data-store/update tool to update documents (`UPDATE`).
- Use the #tool:data-store/delete tool to delete documents (`DELETE`).
- Use the #tool:data-store/mutation tool as a generic dispatcher for `SELECT`, `INSERT`, `UPDATE`, `DELETE`, and `DELETE_TABLE`.

## NoSQL Payload

MongoDB uses a method-driven payload with fields such as `tableName`, `filter`, and `value`. Read the payload reference before generating requests so required fields and method-specific constraints are applied correctly. Reuse known payload shape across repeated operations unless validation signals stale assumptions.
This section exists to keep payload details centralized and easier to maintain as formats evolve. It also prevents duplicated examples from drifting across multiple markdown files. Use the linked payload reference and assets as the canonical source for request structure.

**ALWAYS** read the payload instructions document at least once before using the NoSQL skill to understand how to properly format the payload for NoSQL operations, including the required and optional fields for different operation types.

- [MongoDB Payload](references/payload-mongo.instructions.md)

## Example Assets

Use these MongoDB payload assets as templates for common operations. Each file demonstrates a valid method-driven payload shape that can be adapted for your target collection.
These examples are intentionally separated from the prose reference to avoid duplicated inline JSON blocks. They are easier to test, diff, and update as behavior changes. Start from the closest operation asset and then adjust collection name, filters, and values for the task.

- [MongoDB SELECT payload](assets/mongodb/select.json)
- [MongoDB INSERT payload](assets/mongodb/insert.json)
- [MongoDB UPDATE payload](assets/mongodb/update.json)
- [MongoDB DELETE payload](assets/mongodb/delete.json)
- [MongoDB mutation payload](assets/mongodb/mutation.json)
