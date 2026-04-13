---
name: data-store-object-storage
description: 'Use when working with object storage systems such as Amazon S3 or Azure Blob Storage to list, download, upload, overwrite, or delete objects.'
---

# Object Storage

Use this skill when the user needs to inspect or manage objects in cloud object storage such as Amazon S3 or Azure Blob Storage. This skill covers common object storage workflows such as listing content, downloading files, uploading new objects, replacing existing objects, and deleting storage items. It is designed for operations that are centered on object resources rather than relational tables or document records.

**ALWAYS** #tool:read/readFile [these additional instructions](../../agents.instructions.md) to understand the Data Store flow. Use the tools in the correct order to operate on object storage resources.

## When To Use

Use this skill when the user wants to list, download, upload, replace, or delete objects in a bucket or container. It should be selected whenever the problem is about object-level storage operations rather than standard database queries. This skill also applies when the user explicitly mentions Amazon S3 or Azure Blob Storage, or when they need metadata, signed URLs, or content from a cloud object store.

- Use this skill when the user wants to list, download, upload, replace, or delete objects in a bucket or container.
- Use this skill when the user needs metadata, signed URLs, or content from object storage.
- Use this skill for both Amazon S3 and Azure Blob Storage operations.

## Tool Usage

The object storage skill uses the shared data store toolset to map storage methods to the appropriate tool operations. Each tool corresponds to a concrete storage action, and using the correct tool helps keep payload construction consistent. Rely on these tool mappings when responding to requests about object storage operations.

- Use the #tool:data-store/select tool to get the object content or metadata.
- Use the #tool:data-store/insert tool to upload an object (`INSERT`).
- Use the #tool:data-store/update tool to overwrite an object (`UPDATE`).
- Use the #tool:data-store/delete tool to remove an object (`DELETE`).
- Use the #tool:data-store/mutation tool as a generic alias for `INSERT`, `UPDATE`, `DELETE`, `GET`, and `SELECT`.
- Use the #tool:data-store/schema tool to get metadata for the bucket/container and objects.

## Provider Notes

Provider-specific naming matters because Amazon S3 and Azure Blob Storage use different field names for the same logical concepts. This section describes how each provider maps the shared object storage model to its own payload fields. Understanding these differences reduces errors and helps the agent choose the correct payload format.

- Amazon S3 uses `bucket` and `key`; Azure Blob Storage uses `container` and `blob`.
- The same methods apply to both providers, but the exact field names differ.
- `SELECT` is a listing operation. For S3, `key` is optional and acts as a prefix when provided; omitting `key` lists from the bucket root. For Azure Blob, `blob` is optional and acts as a prefix filter.
- `GET`, `INSERT`, `UPDATE`, and `DELETE` identify a single object and require an exact object path.
- `INSERT` and `UPDATE` always require both `sourceType` and `sourceValue`. When `sourceType` is `path`, the MIME type is detected automatically from the file extension.
- S3 `GET` returns a `signedUrl` pre-signed for one hour in addition to the object body and metadata.
- Azure Blob `DELETE` returns a `succeeded` flag and an `errorCode`; it does not throw on a missing blob.
- If the connection provides a default bucket or container, that field may be omitted from the payload.

## Object Storage Payload

The provider-specific payload instructions contain the exact fields and requirements for each supported storage service. Always consult the instructions before generating the final payload, because they explain required fields, optional fields, and method-specific behavior. These references are the authoritative source for field names and shape expectations.

- [Amazon S3 Payload](references/payload-s3.instructions.md)
- [Azure Blob Storage Payload](references/payload-azure-blob.instructions.md)

## Example Assets

Example payload files are included to show concrete request shapes for each operation and provider. Review the examples before building a payload so you can confirm the correct field names and minimal required properties. These assets are helpful as templates for both Amazon S3 and Azure Blob Storage requests.

### Amazon S3

The S3 examples demonstrate how to construct valid payloads for each supported method. Each file is intentionally minimal and shows the required fields for that operation.

- [Amazon S3 GET payload](assets/s3/get.json)
- [Amazon S3 SELECT payload](assets/s3/select.json)
- [Amazon S3 INSERT payload](assets/s3/insert.json)
- [Amazon S3 UPDATE payload](assets/s3/update.json)
- [Amazon S3 DELETE payload](assets/s3/delete.json)

### Azure Blob Storage

The Azure Blob examples illustrate the same operations using Azure-native field names. Use these files when working with containers and blob paths, and compare them to the S3 examples if you need to verify the shared model.

- [Azure Blob GET payload](assets/azure-blob/get.json)
- [Azure Blob SELECT payload](assets/azure-blob/select.json)
- [Azure Blob INSERT payload](assets/azure-blob/insert.json)
- [Azure Blob UPDATE payload](assets/azure-blob/update.json)
- [Azure Blob DELETE payload](assets/azure-blob/delete.json)
