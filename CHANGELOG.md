# Change Log

## 1.0.0 - 2025-08-09

- Initial release

## 1.1.0 - 2025-08-10

- Added
  - Support for additional data stores.
    - CRUD (Create, Read, Update, Delete)
    - GraphQL
  - Additional error handling.
  - Extra response information when the connections tool is used.
- Updated
  - README.md with more examples and usage instructions.

## 1.1.1 - 2025-08-11

- Fixed:
  - Activation events to correctly match single connection and store files.

## 1.2.x - 2025-08-14

- Added
  - Support for MongoDB.
- Updated
  - Improved error messages.

## 1.3.x - 2025-08-17

- Fixed
  - Corrected the connection call for postgres.
- Added
  - Support for AWS S3.
  - New `payload` tool for describing the payload for each data source.
  - Store config addition of `disallowedTools` parameter to restrict certain tools from running a enabled tool.
    - Useful for allowing some tools to run while blocking others.
- Updated
  - Renamed `CRUD` data source to `Rest`.
  - Changed the parameters that get passed to the data source so it is more dynamic and flexible. It now only accepts 2 parameters.
    - `connectionId` - The unique identifier for the connection.
    - `payload` - The payload to be sent to the data source.
