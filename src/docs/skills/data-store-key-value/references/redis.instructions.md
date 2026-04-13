# Redis

Redis is a popular in-memory key-value data store that supports various data structures such as strings, hashes, lists, sets, and sorted sets. It is commonly used for caching, session management, real-time analytics, and as a message broker.

When working with Redis using the Key-Value Data Store skill, you can perform operations such as querying values by key, inserting new key-value pairs, updating existing keys, and deleting keys. The skill provides a method-driven payload structure that allows you to specify the Redis command you want to execute along with the necessary parameters.

## Tool Usage

Tool selection for Redis should follow read-versus-write intent before choosing method values. This keeps behavior predictable and aligns with the broader data-store routing model. Once the tool is selected, use method and field rules from the payload reference to finalize the request.

- #tool:data-store/select: Use this tool for read operations such as `GET`, `EXISTS`, or `KEYS`.
- #tool:data-store/insert: Use this tool for create/set operations with the `SET` command.
- #tool:data-store/update: Use this tool for overwrite/update operations with the `SET` command when the key must already exist.
- #tool:data-store/delete: Use this tool for delete/remove operations with the `DEL` command.
- #tool:data-store/mutation: Use this tool as a generic alias for write operations that map to insert, update, or delete behavior with the appropriate Redis commands.
- #tool:data-store/schema: Use this tool for a shortcut to `this.client.keys('*')` to inspect the available keys in the Redis store, since Redis does not have a formal schema but this can provide insight into the key structure.

## Common Patterns

Common patterns provide quick mappings from user intent to valid Redis payload shapes. They are useful for first-pass request construction before refining edge-case behavior. Treat them as practical shortcuts, then verify against the payload reference when methods become more specialized.

- Single-key read: `method: "get"`, `key: "some:key"`
- Single-key write: `method: "in"`, `key: "some:key"`, `value: "..."`
- Hash write: `method: "hIn"`, `key: "hash:key"`, `hValue: "field"`, `value: "..."`
- Key delete: `method: "del"`, `key: "some:key"`

## Example Assets

Use these assets as canonical request templates for Redis operations. They avoid duplicated inline payload examples and remain easier to maintain as tooling evolves. Copy the closest asset and modify only key names, fields, and values.

- [assets/redis/select.json](../assets/redis/select.json)
- [assets/redis/insert.json](../assets/redis/insert.json)
- [assets/redis/update.json](../assets/redis/update.json)
- [assets/redis/delete.json](../assets/redis/delete.json)
- [assets/redis/mutation.json](../assets/redis/mutation.json)
