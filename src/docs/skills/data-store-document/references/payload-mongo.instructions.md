# MongoDB Payload

MongoDB operations use a method-driven payload that maps directly to common CRUD actions. This document describes the expected fields, when they are required, and how each method should be used. Use this reference whenever payload shape is unknown or a validation error indicates stale assumptions.
Canonical payload examples are provided in the MongoDB assets folder so this reference can stay focused on requirements and routing. Use the field and method sections below to validate shape, then copy the closest asset for concrete request construction. This reduces duplication and keeps examples consistent across skill documentation.

## Field Details

This section defines the meaning of each top-level payload field and when it must be provided. Treat these requirements as the source of truth for validation behavior. If an operation fails due to missing data, start by checking this section before changing tools.

- `method`: Required. Determines which MongoDB action is executed.
- `tableName`: Required for all methods. Represents the target collection.
- `filter`: Required for `SELECT`, `UPDATE`, and `DELETE` to scope affected documents.
- `value`: Required for `INSERT` and `UPDATE`.

## Method Requirements

Method requirements clarify minimal field combinations for each supported MongoDB action. Use this list to quickly verify whether a payload is complete before sending it. For repeated operations in the same collection, reuse the same shape and only change data values as needed.

- `SELECT`: Requires `tableName` and `filter`.
- `INSERT`: Requires `tableName` and `value`.
- `UPDATE`: Requires `tableName`, `filter`, and `value`.
- `DELETE`: Requires `tableName` and `filter`.
- `CREATE_TABLE`: Requires `tableName`.
- `DELETE_TABLE`: Requires `tableName`.

## Insert Operations

MongoDB insert behavior differs from relational systems because collections can be created implicitly. That means a separate pre-create step is usually unnecessary for normal write flows. Keeping this in mind helps avoid redundant tool calls and keeps execution paths shorter.

When doing an `INSERT`, if the target collection does not exist MongoDB creates it automatically. You do not need a separate create step before inserting documents. This behavior is expected for MongoDB and should be preferred over manual pre-creation in typical workflows.

## Common Mistakes

Most MongoDB payload issues come from field omission or mismatched tool intent. Reviewing this list before retries helps prevent repeated failures with slightly modified but still-invalid payloads. Focus first on method-field compatibility, then on collection and filter accuracy.

- Omitting `filter` for `UPDATE` or `DELETE`, which can cause broad unintended mutations.
- Sending SQL-style table assumptions instead of MongoDB collection names in `tableName`.
- Using `mutation` when standard `select`, `insert`, `update`, or `delete` tools already match the intent.

## Example Assets

Use the assets below as canonical payload templates for MongoDB operations. They provide concrete examples without duplicating long payload blocks in this reference. Start with the nearest operation and adapt only the collection and data-specific fields.

- [assets/mongodb/select.json](../assets/mongodb/select.json)
- [assets/mongodb/insert.json](../assets/mongodb/insert.json)
- [assets/mongodb/update.json](../assets/mongodb/update.json)
- [assets/mongodb/delete.json](../assets/mongodb/delete.json)
- [assets/mongodb/mutation.json](../assets/mongodb/mutation.json)
