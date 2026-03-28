---
name: data-store-s3
description: 'Execute operations against Amazon S3 data sources, such as listing objects in a bucket, uploading objects, downloading objects, and deleting objects. Use this skill to manage objects in S3 buckets.'
---

# Amazon S3

**ALWAYS** #tool:read/readFile [these additional instructions](../../agents.instructions.md) to understand the Data Store flow, tools need to be used in the correct order in order for the tools to work properly.

- Use the #tool:data-store/select tool to get the object, such as `signedUrl` and the `body`.
- Use the #tool:data-store/insert tool to upload an object (`INSERT`).
- Use the #tool:data-store/update tool to overwrite an object (`UPDATE`).
- Use the #tool:data-store/delete tool to remove an object (`DELETE`).
- Use the #tool:data-store/mutation tool as a generic alias for `INSERT`, `UPDATE`, `DELETE`, `GET`, and `SELECT`.
- Use the #tool:data-store/schema to get detailed metadata about the item.

## Payload

- [Payload](references/payload.instructions.md)
