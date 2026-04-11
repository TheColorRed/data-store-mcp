# FTP Payload

The payload for making any FTP operation is a JSON object with the following structure:

```json
{
	"method": "GET" | "INSERT" | "UPDATE" | "DELETE" | "SELECT",
	"path": "/path/on/server",
	"destinationPath": "/path/on/server/target.txt",
	"sourceType": "path" | "raw",
	"sourceValue": "<local file path or raw contents>",
	"maxResults": 100,
	"onlyDirectories": false
}
```

- `method`: Operation to perform. Use `GET` to fetch file contents, `SELECT` to list files, `INSERT` to upload, `UPDATE` to re-upload, `DELETE` to remove.
- `path`: Remote file or directory path for `GET`, `SELECT`, or `DELETE`. Defaults to "/" when omitted.
- `destinationPath`: Remote path where an upload (`INSERT`/`UPDATE`) is written.
- `sourceType`: Upload source kind; `"path"` reads from a local file, `"raw"` uses inline contents.
- `sourceValue`: Local path or raw contents, matching `sourceType`.
- `maxResults`: Maximum number of entries returned by `SELECT`. Use 0 for no limit.
- `onlyDirectories`: When true, `SELECT` returns directories only.
