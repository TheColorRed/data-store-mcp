# Amazon AWS S3 Payload

The payload for making any Amazon AWS S3 operation is a JSON object with the following structure:

```json
{
  "method": "GET" | "SELECT" | "INSERT" | "UPDATE" | "DELETE",
  "bucket": "<your-bucket-name>",
  "key": "path/to/your/object",
  "maxResults": 10,
  "sourceType": "path" | "raw",
  "sourceValue": "path/to/your/file"
}
```

1. The `method` key is always required and should be one of `GET`, `SELECT`, `INSERT`, `UPDATE`, or `DELETE`.
   1. `GET` - Will Get a specific object from the S3 bucket.
   2. `SELECT` - Will get a list of objects in the S3 bucket using a `key` as the prefix.
   3. `INSERT` - Will upload a file to the S3 bucket.
   4. `UPDATE` - Will update an existing object in the S3 bucket.
   5. `DELETE` - Will delete an object from the S3 bucket.
2. The `bucket` key is optional and should be the name of the S3 bucket.
3. The `key` key is required for `SELECT`, `INSERT`, `UPDATE`, and `DELETE` operations. It should be the path to the object in the S3 bucket.
   - This key can also be used in the #tool:data-store/schema tool to list objects in a specific directory/object.
4. `maxResults` is used for the #tool:data-store/schema tool to limit the number of results returned. It defaults to 100.
5. The `sourceType` key is required for `INSERT` and `UPDATE` operations. It should be either `path` or `raw`.
6. The `sourceValue` key is required for `INSERT` and `UPDATE` operations. If `sourceType` is `path`, it should be a full filesystem path to a file on the local filesystem. If `sourceType` is `raw`, it should be the raw content to upload.
