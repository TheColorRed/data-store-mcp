# SQL Schema Tool

The SQL Schema tool allows you to retrieve schema information about your connected SQL databases. It is designed to provide insights into the structure of your databases, including tables, columns, data types, and relationships. This information can be used to inform query generation and help agents understand the underlying data model.

## SQL Schema Tool Payload

The payload for the SQL Schema tool supports the following parameters to allow for flexible and targeted schema retrieval. If no parameters are provided, the tool will return a comprehensive schema overview including tables, columns, data types, and relationships for a `MySQL` database this is the `SHOW CREATE TABLE xxx` for every table.

### Simplified Schema Discovery

Using these parameters allows for a more lightweight schema discovery process, enabling agents to quickly identify available tables, procedures, functions, views, or triggers without the overhead of retrieving full column details. This can be particularly useful in scenarios where the agent is exploring the database structure for the first time or when dealing with large databases where a full schema retrieval may be costly in terms of tokens and processing time. Once the relevant tables, procedures, functions, views, or triggers are identified, agents can then make more targeted schema queries for specific items to retrieve detailed column information as needed.

- `listTables`: A boolean parameter that, when set to `true`, returns a list of tables and the table comments (if available) in the database without column details. This provides a lightweight way for agents to discover available tables before querying for specific schema information.
- `listProcedures`: A boolean parameter that, when set to `true`, returns a list of stored procedures and the procedure comments (if available) in the database without parameter or column details. This provides a lightweight way for agents to discover available stored procedures before querying for specific schema information.
- `listFunctions`: A boolean parameter that, when set to `true`, returns a list of functions and the function comments (if available) in the database without parameter or column details. This provides a lightweight way for agents to discover available functions before querying for specific schema information.
- `listViews`: A boolean parameter that, when set to `true`, returns a list of views and the view comments (if available) in the database without column details. This provides a lightweight way for agents to discover available views before querying for specific schema information.
- `listTriggers`: A boolean parameter that, when set to `true`, returns a list of triggers and the trigger comments (if available) in the database without column details. This provides a lightweight way for agents to discover available triggers before querying for specific schema information.

## Table-Specific Schema Retrieval

If a `tableName` is provided in the payload, the tool will return detailed schema information for that specific table, including column names, data types, nullability, default values, and any relationships to other tables. This allows agents to retrieve in-depth information about a particular table after identifying it through a broader schema discovery process. If no `tableName` is provided, the tool will return a high-level overview of the entire database schema, including a list of all tables and their respective columns, data types, and relationships. This comprehensive view can be useful for agents that need to understand the overall structure of the database before diving into specific tables.

- `tableName`: An optional string parameter that specifies the name of a specific table to retrieve detailed schema information for. If provided, the tool will return column details for that table. If not provided, the tool will return an overview of the entire database schema.

# SQL Schema Tool Payload Assets

- [List Specific Items](../../assets/schema/list.json) - Example payload for listing tables, procedures, functions, views, or triggers without column details.
- [List Specific Table](../../assets/schema/specific-table.json) - Example payload for retrieving schema information for a specific table, including column details.
- [Full Schema](../../assets/schema/full.json) - Example payload for retrieving the full schema overview of the database, including all tables and their respective columns, data types, and relationships.
