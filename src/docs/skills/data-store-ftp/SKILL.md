---
name: data-store-ftp
description: 'Use when working with FTP servers to list files, read file contents, upload files, overwrite files, or delete files.'
---

# FTP Servers

Use this skill when the user needs to inspect or manage files on an FTP server. FTP operations are file-oriented, so payloads focus on remote paths, upload source values, and directory listing options instead of table or document structures. This skill provides consistent tool routing for list, read, upload, overwrite, and delete workflows.

**ALWAYS** #tool:read/readFile [these additional instructions](../../agents.instructions.md) to understand the Data Store flow, tools need to be used in the correct order in order for the tools to work properly.

## When To Use

Use this skill for any request that targets remote files or directories over FTP. It applies to both read-only operations like listing and reading file content, and write operations like uploading and overwriting files. Choose this skill whenever the source is an FTP server instead of an API or database.

- Use this skill when the user wants to browse files or directories on an FTP server.
- Use this skill when the user wants to download, upload, replace, or delete files over FTP.

## Tool Usage

FTP actions map to standard CRUD-style tools using method-driven payloads. Use `select` for directory listing and file retrieval behavior, then route uploads, overwrites, and deletes to their corresponding write tools. Keep `mutation` as a generic alias only when a dedicated CRUD tool is not a better fit.

- Use the #tool:data-store/select tool to list files (`SELECT`) or read file contents (`GET`).
- Use the #tool:data-store/insert tool to upload files (`INSERT`).
- Use the #tool:data-store/update tool to re-upload/overwrite files (`UPDATE`).
- Use the #tool:data-store/delete tool to remove files (`DELETE`).
- The #tool:data-store/mutation tool is a generic alias for `INSERT`, `UPDATE`, and `DELETE` operations.

## FTP Payload

FTP payloads include remote path targeting and optional upload/listing controls. Read the payload reference before building requests so method-specific required fields are set correctly and redundant retries are avoided. Reuse known payload shape for repeated operations in the same FTP context.

**ALWAYS** read the payload instructions document at least once before using the FTP skill to understand how to properly format the payload for FTP operations, including the required and optional fields for different operation types.

- [Payload](references/payload.instructions.md)

## Example Assets

Use these FTP payload assets as starting templates for each operation type.
Keeping examples in dedicated asset files avoids duplicating large JSON blocks in instructional prose. It also makes maintenance easier when payload fields evolve over time. Choose the asset that matches the intended action and adjust only path and content-specific values.

- [FTP SELECT payload](assets/ftp/select.json)
- [FTP GET payload](assets/ftp/get.json)
- [FTP INSERT payload](assets/ftp/insert.json)
- [FTP UPDATE payload](assets/ftp/update.json)
- [FTP DELETE payload](assets/ftp/delete.json)
