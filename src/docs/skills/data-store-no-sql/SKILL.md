---
name: data-store-no-sql
description: 'Execute operations against NoSQL data sources. Currently supports MongoDB for listing collections, querying documents, inserting, updating, and deleting data.'
---

# NoSQL

**ALWAYS** #tool:read/readFile [these additional instructions](../../agents.instructions.md) to understand the Data Store flow, tools need to be used in the correct order in order for the tools to work properly.

## MongoDB

- Use the #tool:data-store/select tool to query documents in a collection (`SELECT`).
- Use the #tool:data-store/insert tool to insert documents (`INSERT`).
- Use the #tool:data-store/update tool to update documents (`UPDATE`).
- Use the #tool:data-store/delete tool to delete documents (`DELETE`).
- Use the #tool:data-store/mutation tool as a generic dispatcher for `SELECT`, `INSERT`, `UPDATE`, `DELETE`, and `DELETE_TABLE`.

### Payload

MongoDB uses a method-driven payload that includes collection name, filters, and optional values for writes. Refer to the MongoDB payload documentation for the supported fields and shapes.

- [MongoDB Payload](references/payload-mongo.instructions.md)
