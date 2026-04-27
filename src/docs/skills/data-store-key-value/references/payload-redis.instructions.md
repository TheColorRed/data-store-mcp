**ALWAYS** #tool:read/readFile [select.json](../assets/redis/select.json) to understand the expected payload shape for Redis SELECT operations, including required fields like `method` and `key`, and optional fields like `hField` and `hValue`. This is crucial for properly formatting requests and avoiding validation errors.

**ALWAYS** #tool:read/readFile [insert.json](../assets/redis/insert.json) to understand the expected payload shape for Redis INSERT operations, including required fields like `method`, `key`, and `value`, and optional fields like `hField` and `hValue`. This is crucial for properly formatting requests and avoiding validation errors.

**ALWAYS** #tool:read/readFile [update.json](../assets/redis/update.json) to understand the expected payload shape for Redis UPDATE operations, including required fields like `method`, `key`, and `value`, and optional fields like `hField` and `hValue`. This is crucial for properly formatting requests and avoiding validation errors.

**ALWAYS** #tool:read/readFile [delete.json](../assets/redis/delete.json) to understand the expected payload shape for Redis DELETE operations, including required fields like `method` and `key`, and optional fields like `hField`. This is crucial for properly formatting requests and avoiding validation errors.

**ALWAYS** #tool:read/readFile [mutation.json](../assets/redis/mutation.json) to understand the expected payload shape for Redis operations when using the generic mutation tool, including how to specify the `method` field along with required and optional fields for each operation type. This is crucial for properly formatting requests and avoiding validation errors when not using specific CRUD tools.

# Redis Payload

Redis operations use a method-driven payload with command-like method names. This reference documents the supported fields and how to route methods to the correct data-store tool. Use it when payload shape is unknown or stale.

## Base Shape

```json
{
  "method": "get",
  "key": "example:key",
  "value": "stored value",
  "hField": "fieldName",
  "hValue": "fieldValue"
}
```

## Field Details

- `method`: Required. Must be one of the supported Redis methods.
- `key`: Required for most methods. Use a string for single-key operations or an array for methods like `mGet`.
- `value`: Required for write methods such as `in`, `hIn`, `mSet`, and update-style methods that need a value.
- `hField`: Required for hash field reads/checks such as `hGet` and `hExists`.
- `hValue`: Required for hash writes and arithmetic methods such as `hIn`, `hIncrBy`, and `hDecrBy`.
- `schemaSampleStartIndex`: Optional schema sampling offset for `#tool:data-store/schema`.
- `maxKeysToShow`: Optional maximum key sample size for `#tool:data-store/schema`.

## Supported Methods

- Insert methods: `in`, `hIn`, `mSet`
- Select methods: `get`, `exists`, `keys`, `hGet`, `hGetAll`, `hExists`, `mGet`, `type`
- Update methods: `up`, `incr`, `incrBy`, `decr`, `decrBy`, `append`, `hIncr`, `hDecr`, `hIncrBy`, `hDecrBy`, `expire`, `persist`
- Delete methods: `del`, `hDel`

## Tool Mapping

- Use #tool:data-store/select with select methods.
- Use #tool:data-store/insert with insert methods.
- Use #tool:data-store/update with update methods.
- Use #tool:data-store/delete with delete methods.
- Use #tool:data-store/mutation as a generic write alias when needed.

## Common Mistakes

- Using `hValue` where `hField` is expected for `hGet`/`hExists`.
- Passing array keys to methods that expect a single string key.
- Sending `mSet` values as an array instead of an object.
- Repeating payload discovery calls in unchanged connection/provider context.
