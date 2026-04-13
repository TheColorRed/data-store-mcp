# Azure Blob Storage Payload Instructions

Use these instructions when the user wants to work with Azure Blob Storage containers. Azure Blob Storage payloads follow the same general object storage model as S3, but they require Azure-specific field names. This reference helps you map the shared method set to the Azure Blob Storage semantics.

The payload is a JSON object that must include a `method` and the fields required for that operation.

- `method` — one of `GET`, `SELECT`, `INSERT`, `UPDATE`, or `DELETE`
- `container` — the blob container name
- `blob` — the blob name or prefix within the container
- `sourceType` — `path` or `raw`
- `sourceValue` — local file path or raw blob content for uploads
- `maxResults` — optional number of items to list for `SELECT`

## Field details

The fields listed below define the Azure Blob payload contract. Understanding which fields are required for each method is important for constructing valid requests. This section also explains how the `blob` field behaves differently for listing versus single-object operations.

- `container` may be omitted only when the connection configuration already defines a default container.
- `blob` identifies the blob path within the container.
- For `SELECT`, `blob` is optional and is treated as a prefix filter when provided.
- For `GET`, `INSERT`, `UPDATE`, and `DELETE`, `blob` must identify a single exact blob path.
- `sourceType` and `sourceValue` are required for upload operations (`INSERT` and `UPDATE`).

## Method requirements

The method requirement section clarifies the fields required by each supported operation. Azure Blob Storage supports the same method set as S3, but the naming differences must be respected. Read each method description carefully before generating payloads.

### GET

Retrieve an exact blob from Azure Blob Storage, including its metadata if requested. This method is appropriate when the user needs the contents or attributes of a single blob. The payload must identify the exact `blob` path. The response contains the blob body as a string, HTTP metadata, and any custom metadata attached to the blob.

- Required: `method`, `container` (or default container), `blob`
- Purpose: retrieve a single blob and its metadata.
- Response fields: `url`, `body`, `contentType`, `contentLength`, `lastModified`, `metadata`, `blobName`, `container`

### SELECT

List blobs in a container, optionally filtered by prefix. When the `blob` field is provided, it is treated as a prefix rather than an exact path. The response includes a structured `items` array where each entry contains the blob name, its storage properties, and any custom metadata.

- Required: `method`, `container` (or default container)
- Optional: `blob` as a prefix filter, `maxResults`
- Purpose: list blobs in a container. When `blob` is provided, the returned list is limited to that prefix.
- Response fields: `container`, `prefix`, `items` (array of `{ name, properties, metadata }`), `count`

### INSERT

Upload a new blob into the specified container using the provided content source. This method creates the blob at the path identified by `blob`. It requires explicit upload source information in `sourceType` and `sourceValue`. The MIME type is automatically detected from the file extension when `sourceType` is `path`.

- Required: `method`, `container` (or default container), `blob`, `sourceType`, `sourceValue`
- Purpose: upload a new blob.
- Response fields: `etag`, `lastModified`, `requestId`, `versionId`, `blobName`, `container`

### UPDATE

Overwrite an existing blob with new content at the same path. Use this method when replacement is intended rather than creation of a new blob. The payload must include both the `blob` path and the upload source data. The response shape is the same as `INSERT`.

- Required: `method`, `container` (or default container), `blob`, `sourceType`, `sourceValue`
- Purpose: overwrite an existing blob.
- Response fields: `etag`, `lastModified`, `requestId`, `versionId`, `blobName`, `container`

### DELETE

Delete a specific blob from the container. This operation removes the blob identified by the exact `blob` path. The response includes a `succeeded` flag and an `errorCode` field that is populated if the deletion did not complete successfully.

- Required: `method`, `container` (or default container), `blob`
- Purpose: delete a single blob.
- Response fields: `succeeded`, `errorCode`, `blobName`, `container`

## Upload fields

Upload operations require additional fields to describe how the new content is provided. This section explains when to use a file path versus raw content. The correct upload source format is critical for `INSERT` and `UPDATE` operations.

If `method` is `INSERT` or `UPDATE`:

- `sourceType` must be provided.
- `sourceValue` must be provided.
- `sourceType: "path"` means `sourceValue` is a local file path. Prefer an absolute path to avoid working-directory ambiguity.
- `sourceType: "raw"` means `sourceValue` is raw blob content. For `raw`, `sourceValue` is not interpreted as a file path.

## List fields

List-specific fields control the number of returned results and whether a prefix filter is applied. Only `SELECT` uses these fields. Do not include them for methods that target a single blob.

- `maxResults` is optional and defaults to `100`.
- Do not use `maxResults` for `GET`, `INSERT`, `UPDATE`, or `DELETE`.

## Common mistakes

These common mistakes capture the most frequent payload errors for Azure Blob Storage. Reviewing them helps avoid incorrect field usage and invalid requests. Pay attention to the distinction between prefix-based listing and exact blob selection.

- Using `blob` as an exact path in `SELECT`; it is treated as a prefix and may return many results.
- Omitting `sourceType` or `sourceValue` for `INSERT` or `UPDATE`.
- Passing a file path with `sourceType: "raw"`; file paths should use `sourceType: "path"`.
- Forgetting that `container` may be provided by the connection instead of the payload.
- Expecting a boolean result from `DELETE`; the response is an object with `succeeded` and `errorCode`.
- Expecting `SELECT` to return a flat list; results are nested under an `items` array with `name`, `properties`, and `metadata` per blob.
