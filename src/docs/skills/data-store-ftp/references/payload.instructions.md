**ALWAYS** #tool:read/readFile [select.json](../assets/ftp/select.json) to understand the expected payload shape for FTP SELECT operations, including required fields like `path` and optional fields like `maxResults` and `onlyDirectories`. This is crucial for properly formatting requests and avoiding validation errors.

**ALWAYS** #tool:read/readFile [get.json](../assets/ftp/get.json) to understand the expected payload shape for FTP GET operations, including required fields like `path` and optional fields like `hideBody`. This is crucial for properly formatting requests and avoiding validation errors.

**ALWAYS** #tool:read/readFile [insert.json](../assets/ftp/insert.json) to understand the expected payload shape for FTP INSERT operations, including required fields like `destinationPath`, `sourceType`, and `sourceValue`. This is crucial for properly formatting requests and avoiding validation errors.

**ALWAYS** #tool:read/readFile [update.json](../assets/ftp/update.json) to understand the expected payload shape for FTP UPDATE operations, including required fields like `destinationPath`, `sourceType`, and `sourceValue`. This is crucial for properly formatting requests and avoiding validation errors.

**ALWAYS** #tool:read/readFile [delete.json](../assets/ftp/delete.json) to understand the expected payload shape for FTP DELETE operations, including required fields like `path`. This is crucial for properly formatting requests and avoiding validation errors.

# FTP Payload

Use this reference when constructing FTP requests for list, read, upload, overwrite, or delete actions. FTP payloads are method-driven and rely on remote path fields and upload source fields rather than query syntax. This document outlines required fields and method-specific behavior.
Concrete payload templates are maintained in the FTP asset files so this page can focus on field requirements and routing behavior. Use the section details below to validate shape, then copy the closest asset as your starting point. This keeps examples consistent and reduces duplicated JSON across documentation.

## Field Details

Field requirements vary by FTP method, so validate required path and source fields before running a request. This section explains how each field participates in list, read, upload, and delete flows. For repeated calls in unchanged context, preserve the same field structure and only update operation-specific values.

- `method`: Operation to perform. Use `GET` to fetch file contents, `SELECT` to list files, `INSERT` to upload, `UPDATE` to re-upload, `DELETE` to remove.
- `path`: Remote file or directory path for `GET`, `SELECT`, or `DELETE`. Defaults to "/" when omitted.
- `destinationPath`: Remote path where an upload (`INSERT`/`UPDATE`) is written.
- `sourceType`: Upload source kind; `"path"` reads from a local file, `"raw"` uses inline contents.
- `sourceValue`: Local path or raw contents, matching `sourceType`.
- `maxResults`: Maximum number of entries returned by `SELECT`. Use 0 for no limit.
- `onlyDirectories`: When true, `SELECT` returns directories only.

## Method Requirements

Method requirements define the minimum valid field set for each FTP action. Use this list as a preflight checklist before sending requests, especially for write operations. Most validation failures are caused by missing destination or source fields during uploads.

- `GET`: Requires `path` to a remote file.
- `SELECT`: Uses `path` as directory target; optional `maxResults` and `onlyDirectories`.
- `INSERT`: Requires `destinationPath`, `sourceType`, and `sourceValue`.
- `UPDATE`: Requires `destinationPath`, `sourceType`, and `sourceValue`.
- `DELETE`: Requires `path` to the target file.

## Common Mistakes

FTP payload errors are often subtle because path-related fields look similar but have different roles. Reviewing these mistakes before retries can prevent repeated failures with nearly identical payloads. Keep method intent and required field combinations aligned to avoid unnecessary discovery loops.

- Providing `path` instead of `destinationPath` for uploads.
- Omitting `sourceType` or `sourceValue` for `INSERT`/`UPDATE`.
- Using `raw` for binary content when file-path uploads are more reliable.
- Re-running payload/schema discovery for repeated FTP operations with unchanged context.
