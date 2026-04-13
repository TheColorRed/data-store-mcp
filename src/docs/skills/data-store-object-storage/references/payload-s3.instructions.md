# Amazon S3 Payload Instructions

Use these instructions when the user wants to perform object storage operations against an Amazon S3 bucket. The payload shape is intentionally simple but must match the required S3 field names exactly. This reference helps you choose the correct fields for each supported method.

The payload is a JSON object that must include a `method` and the fields required for that operation.

- `method` — one of `GET`, `SELECT`, `INSERT`, `UPDATE`, or `DELETE`
- `bucket` — the S3 bucket name
- `key` — the object key or prefix within the bucket
- `sourceType` — `path` or `raw`
- `sourceValue` — local file path or raw object content for uploads
- `maxResults` — optional number of objects to list for `SELECT`

## Field details

The fields listed here are the fundamental properties for every S3 payload. Knowing which fields are required versus optional is critical for producing valid requests. The provider-specific references below explain how the values are interpreted for each method.

- `bucket` may be omitted only when the connection configuration already defines a default bucket.
- `key` is required for `GET`, `INSERT`, `UPDATE`, and `DELETE`.
- For `SELECT`, `key` is optional and acts as a prefix when provided.
- If `SELECT` omits `key`, the prefix defaults to `""` and lists from the root of the bucket.
- For `GET`, `INSERT`, `UPDATE`, and `DELETE`, `key` must identify a single exact object path.
- `sourceType` and `sourceValue` are required for upload operations (`INSERT` and `UPDATE`).

## Method requirements

Each method has a different set of required fields and a different purpose. These requirements ensure the payload is matched correctly to the intended S3 operation. Review the method descriptions carefully when choosing which fields to include.

### GET

Retrieve an exact object from S3 along with its metadata. This is used when the user needs the contents or attributes of a specific object. The `key` must identify one exact object path in the bucket. The response includes a pre-signed URL valid for one hour, the raw object body, and rich metadata such as ETag, content type, version ID, and storage class.

- Required: `method`, `bucket` (or default bucket), `key`
- Purpose: retrieve a single object and its metadata.
- Response fields: `bucket`, `key`, `signedUrl`, `url`, `path`, `body`, `contentType`, `contentLength`, `contentEncoding`, `contentLanguage`, `contentDisposition`, `eTag`, `versionId`, `lastModified`, `metadata`, `storageClass`, `checksumSHA1`, `checksumSHA256`, `checksumType`, `acceptRanges`, `expiration`, `expiresString`, `partsCount`

### SELECT

List objects in a bucket, optionally filtered by a key prefix. The `key` field acts as the prefix when supplied. If `key` is omitted, listing starts at the root with an empty prefix. Results come from the AWS `ListObjectsV2` API and include the raw SDK response fields alongside the bucket and prefix used.

- Required: `method`, `bucket` (or default bucket)
- Optional: `key` as a prefix filter, `maxResults`
- Purpose: list objects in a bucket whose keys begin with the given prefix.
- Response fields: `bucket`, `prefix`, plus the raw `ListObjectsV2Command` response

### INSERT

Upload a new object into the bucket using the provided content source. This is the method to use when the user wants to add a file that did not previously exist or when the intention is to create new content. Both `sourceType` and `sourceValue` are mandatory. The response confirms the uploaded object with checksum and version information.

- Required: `method`, `bucket` (or default bucket), `key`, `sourceType`, `sourceValue`
- Purpose: upload a new object.
- Response fields: `bucket`, `key`, `eTag`, `versionId`, `checksumSHA1`, `checksumSHA256`, `checksumType`, `expiration`, `size`

### UPDATE

Overwrite an existing object with new content. This method should be used when the user intends to replace the object at the same key. The payload must include the upload source information for the replacement content. The response is identical in shape to an `INSERT` response.

- Required: `method`, `bucket` (or default bucket), `key`, `sourceType`, `sourceValue`
- Purpose: overwrite an existing object.
- Response fields: `bucket`, `key`, `eTag`, `versionId`, `checksumSHA1`, `checksumSHA256`, `checksumType`, `expiration`, `size`

### DELETE

Remove a specific object from the bucket. This operation deletes the object identified by the exact key value. No upload fields are required for this method. The response indicates whether a delete marker was created, which is relevant for versioned buckets.

- Required: `method`, `bucket` (or default bucket), `key`
- Purpose: delete a single object.
- Response fields: `bucket`, `key`, `deleteMarker`, `versionId`

## Upload fields

Upload methods need additional fields to describe where the content comes from. This section clarifies how to provide either a local file path or raw object content. The selected `sourceType` determines how the extension interprets `sourceValue`.

If `method` is `INSERT` or `UPDATE`:

- `sourceType` must be `path` or `raw`.
- `sourceValue` must contain the local path or raw payload.
- Use `sourceType: "path"` when uploading a local file. Prefer an absolute file path to avoid working-directory ambiguity.
- Use `sourceType: "raw"` when uploading content directly. For `raw`, `sourceValue` is literal content and is not treated as a file path.

## List fields

Listing operations use a small set of optional fields to control how many results are returned. This section describes the list-specific options and the cases when they should be included. Avoid using these fields for non-listing methods.

- `maxResults` is optional and defaults to `100` if not provided.
- Do not use `maxResults` for `GET`, `INSERT`, `UPDATE`, or `DELETE`.

## Common mistakes

These common mistakes highlight frequent errors made when constructing S3 payloads. Reviewing them helps catch issues before generating a request. Pay careful attention to field requirements and the difference between exact object paths and prefixes.

- Providing an exact key when you intended a broad `SELECT`; for `SELECT`, `key` is a prefix filter.
- Using a prefix as the `key` for `GET` or `DELETE`; these methods require an exact object path.
- Omitting `sourceType` or `sourceValue` for `INSERT` or `UPDATE`.
- Passing a file path with `sourceType: "raw"`; file paths belong to `sourceType: "path"`.
- Assuming `bucket` is always required when the connection may already provide it.
- Assuming `GET` returns only the body; it also returns a `signedUrl` valid for one hour.
