---
name: data-store-s3
description: 'Use when working with Amazon S3 to list objects, download objects, upload objects, overwrite objects, or delete objects in a bucket.'
---

# Amazon S3

Use this skill when the user needs to inspect or manage objects stored in Amazon S3.

**ALWAYS** #tool:read/readFile [these additional instructions](../../agents.instructions.md) to understand the Data Store flow, tools need to be used in the correct order in order for the tools to work properly.

## When To Use

- Use this skill when the user wants to list, download, upload, replace, or delete S3 objects.
- Use this skill when the user needs bucket object metadata or S3 payload guidance.

## Tool Usage

- Use the #tool:data-store/select tool to get the object, such as `signedUrl` and the `body`.
- Use the #tool:data-store/insert tool to upload an object (`INSERT`).
- Use the #tool:data-store/update tool to overwrite an object (`UPDATE`).
- Use the #tool:data-store/delete tool to remove an object (`DELETE`).
- Use the #tool:data-store/mutation tool as a generic alias for `INSERT`, `UPDATE`, `DELETE`, `GET`, and `SELECT`.
- Use the #tool:data-store/schema to get detailed metadata about the item.

## S3 Payload

**ALWAYS** read the payload instructions document at least once before using the Amazon S3 skill to understand how to properly format the payload for making S3 operations, including the required and optional fields for different operation types.

- [Payload](references/payload.instructions.md)
