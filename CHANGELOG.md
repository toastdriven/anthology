# Changelog

All notable changes to this project will be documented in this file.

## [Unreleased]

- _Nothing yet._
- Revised how tokenization is done. Move from an overridable single instance to plugin-style architecture, to allow for per-language tokenization, or multiple tokenizers at once, etc.
- Added an OpenAPI schema to the server for all current endpoints.
- Added a health check endpoint to the server.


## [v0.1.0] - 2026-08-08

### Added

- Initial public release of `anthology`.
- A working embeddable `SearchEngine`.
- Two indexing backends: `InMemoryIndex` & `JSONIndex`.
- Two document storage backends: `InMemoryDocumentStore` & `JSONDocumentStore`.
- A bare/basic, yet functional, HTTP API server.
