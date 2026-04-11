# Redis Payload

The payload for making any Redis operation is a JSON object with the following structure:

```json
{
  "method": "get" | "set" | "del" | "exists" | "keys" | "hGet" | "hGetAll" | "hExists" | "in" | "hIn" | "mSet" | "mGet" | "up" | "incr" | "incrBy" | "decr" | "decrBy" | "append" | "hIncr" | "hDecr" | "hIncrBy" | "hDecrBy" | "expire" | "persist" | "type" | "hDel",
  "key": "example:key" | ["key1", "key2"],
  "value": "stored value" | {"key1": "v1", "key2": "v2"} | 60,
  "hValue": "fieldName"
}
```

## Fields

1. `method` is required and must be one of the supported Redis commands (all camelCase):
   - Inserts
     - `set`, `in`, `hIn`, `mSet`
   - Reads
     - `get`, `exists`, `keys`, `hGet`, `hGetAll`, `hExists`, `mGet`, `type`
   - Updates
     - `up`, `incr`, `incrBy`, `decr`, `decrBy`, `append`, `hIncr`, `hDecr`, `hIncrBy`, `hDecrBy`, `expire`, `persist`
   - Deletes
     - `del`, `hDel`
2. `key` is required for most operations. For multi-key operations like `mGet`/`mSet`, use an array or object.
3. `value` is required for `set`, `in`, `hIn`, `mSet`, and similar write operations. For `mSet`, use an object mapping keys to values.
4. `hValue` is used for hash field operations (e.g., `hIn`, `hGet`, `hIncrBy`, `hDecrBy`, `hExists`, `hDel`).

## Tool Mapping

- Use #tool:data-store/select with `get`, `exists`, `keys`, `hGet`, `hGetAll`, `hExists`, `mGet`, `type`.
- Use #tool:data-store/insert with `set`, `in`, `hIn`, `mSet`.
- Use #tool:data-store/update with `up`, `incr`, `incrBy`, `decr`, `decrBy`, `append`, `hIncr`, `hDecr`, `hIncrBy`, `hDecrBy`, `expire`, `persist`.
- Use #tool:data-store/delete with `del`, `hDel`.
- Use #tool:data-store/mutation for any write operation.
- Use #tool:data-store/schema to inspect keys in the Redis store (see below).

## Examples

### Get a Value

````json

## Examples

### Basic Key Operations

#### Get, Set, Exists, Delete
```json
// Get a value
{
  "connectionId": "my-redis",
  "payload": { "method": "get", "key": "user:42" }
}
// Set a value
{
  "connectionId": "my-redis",
  "payload": { "method": "set", "key": "user:42", "value": "active" }
}
// Check if a key exists
{
  "connectionId": "my-redis",
  "payload": { "method": "exists", "key": "user:42" }
}
// Delete a key
{
  "connectionId": "my-redis",
  "payload": { "method": "del", "key": "user:42" }
}
````

#### Multi-Key Operations

```json
// Set multiple values
{
  "connectionId": "my-redis",
  "payload": { "method": "mSet", "value": { "user:1": "a", "user:2": "b" } }
}
// Get multiple values
{
  "connectionId": "my-redis",
  "payload": { "method": "mGet", "key": ["user:1", "user:2"] }
}
```

#### Expiration and Type

```json
// Set expiration (value is seconds)
{
  "connectionId": "my-redis",
  "payload": { "method": "expire", "key": "user:42", "value": 60 }
}
// Remove expiration
{
  "connectionId": "my-redis",
  "payload": { "method": "persist", "key": "user:42" }
}
// Get key type
{
  "connectionId": "my-redis",
  "payload": { "method": "type", "key": "user:42" }
}
```

#### Pattern Matching

```json
// List keys by pattern
{
  "connectionId": "my-redis",
  "payload": { "method": "keys", "key": "user:*" }
}
```

### Hash Field Operations (hValue)

#### Set, Get, Exists, Increment, Delete Hash Field

```json
// Set a hash field
{
  "connectionId": "my-redis",
  "payload": { "method": "hIn", "key": "user:42:profile", "hValue": "email", "value": "me@example.com" }
}
// Get a hash field
{
  "connectionId": "my-redis",
  "payload": { "method": "hGet", "key": "user:42:profile", "value": "email" }
}
// Check if a hash field exists
{
  "connectionId": "my-redis",
  "payload": { "method": "hExists", "key": "user:42:profile", "value": "email" }
}
// Increment a hash field by 2
{
  "connectionId": "my-redis",
  "payload": { "method": "hIncrBy", "key": "user:42:profile", "value": "score", "hValue": 2 }
}
// Delete a hash field
{
  "connectionId": "my-redis",
  "payload": { "method": "hDel", "key": "user:42:profile", "value": "email" }
}
```

### Show Schema (Key Summary)

Use this tool for a shortcut to `this.client.keys('*')` to inspect the available keys in the Redis store, since Redis does not have a formal schema but this can provide insight into the key structure.

You can use these optional fields to control the output of the schema inspection:

- `schemaSampleStartIndex` is an optional field that specifies the starting index for sampling keys when inspecting the schema. The default is 0.
- `maxKeysToShow` is an optional field that specifies the maximum number of keys to show when inspecting the schema. The default is 100.

```json
{
  "connectionId": "my-redis",
  "payload": {
    "schemaSampleStartIndex": 0, // Optional: starting index for sampling keys
    "maxKeysToShow": 100
  }
}
```

## Notes

- All method names are camelCase (e.g., `mSet`, `hGetAll`).
- `keys` expects the `key` field to contain a Redis pattern such as `*`, `user:*`, or `session:*`.
- `update` with `up` is stricter than `insert`: the current Redis implementation checks that the key already exists before overwriting it.
- `schema` for Redis does not return a table schema. It returns a summary including the total number of keys and a sample of keys.
- See the extension's TypeScript for the full list of supported methods and their argument requirements.
