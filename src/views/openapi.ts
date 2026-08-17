import { VERSION } from "../constants";
import type { ViewContext } from "../types";

const DOCUMENT_SCHEMA = {
  "$id": "Document",
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
    },
    "content": {
      "type": "string",
    },
    "contentType": {
      "type": "string",
      "example": "text/plain",
      "default": "text/plain",
    },
    "contentLength": {
      "type": "integer",
      "format": "int64",
    },
    "metadata": {
      "$ref": "#/components/schemas/Metadata",
    },
  },
  "required": [
    "id",
    "content",
  ],
  "additionalProperties": false,
};
const METADATA_SCHEMA = {
  "$id": "Metadata",
  "type": "object",
  "properties": {
    "tags": {
      "type": "array",
      "items": {
        "type": "string",
      },
    },
    "indexedAt": {
      "type": "string",
      "format": "date-time",
      "example": "2024-01-15T10:30:00Z",
    },
  },
};
const RESULT_SCHEMA = {
  "$id": "RESULT",
  "type": "object",
  "properties": {
    "id": {
      "type": "string",
    },
    "score": {
      "type": "number",
    },
    "document": {
      "$ref": "#/components/schemas/Document",
    },
    "docLength": {
      "type": "number",
    },
  },
};
const RESPONSE_ERROR_SCHEMA = {
  "$id": "ResponseError",
  "type": "object",
  "properties": {
    "success": {
      "type": "boolean",
      "default": false,
    },
    "errors": {
      "type": "array",
      "items": {
        "type": "string",
      },
    },
  },
  "required": [
    "success",
    "errors",
  ],
};
const OPENAPI_SCHEMA = {
  "openapi": "3.1.0",
  "info": {
    "title": "Anthology",
    "version": VERSION,
  },
  "paths": {
    "/documents": {
      "post": {
        "summary": "Adds/updates a document in the index",
        "operationId": "addDocument",
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Document",
              },
            },
          },
        },
        "responses": {
          "202": {
            "description": "A success response",
            "content": {
              "application/json": {
                "schema": {
                  "success": {
                    "type": "boolean",
                  },
                  "document": {
                    "$ref": "#/components/schemas/Document",
                  },
                },
              },
            },
          },
          "400": {
            "description": "An invalid body was provided",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ResponseError",
                },
              },
            },
          },
          "default": {
            "description": "Unexpected error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ResponseError",
                },
              },
            },
          },
        },
      },
    },
    "/documents/{docId}": {
      "get": {
        "summary": "Fetches a given document by ID",
        "operationId": "getDocument",
        "parameters": [
          {
            "name": "docId",
            "in": "path",
            "required": true,
            "description": "The id of the document. Should be unique.",
            "schema": {
              "type": "string",
            },
          },
        ],
        "responses": {
          "200": {
            "description": "The document in JSON format",
            "content": {
              "application/json": {
                "schema": {
                  "success": {
                    "type": "boolean",
                  },
                  "document": {
                    "$ref": "#/components/schemas/Document",
                  },
                },
              },
            },
          },
          "404": {
            "description": "Returned when the specified document couldn't be found",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ResponseError",
                },
              },
            },
          },
          "default": {
            "description": "Unexpected error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ResponseError",
                },
              },
            },
          },
        },
      },
      "put": {
        "summary": "Adds/updates a document in the index",
        "operationId": "updateDocument",
        "parameters": [
          {
            "name": "docId",
            "in": "path",
            "required": true,
            "description": "The id of the document. Should be unique.",
            "schema": {
              "type": "string",
            },
          },
        ],
        "requestBody": {
          "content": {
            "application/json": {
              "schema": {
                "$ref": "#/components/schemas/Document",
              },
            },
          },
        },
        "responses": {
          "202": {
            "description": "A success response",
            "content": {
              "application/json": {
                "schema": {
                  "success": {
                    "type": "boolean",
                  },
                  "document": {
                    "$ref": "#/components/schemas/Document",
                  },
                },
              },
            },
          },
          "400": {
            "description": "An invalid body was provided",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ResponseError",
                },
              },
            },
          },
          "default": {
            "description": "Unexpected error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ResponseError",
                },
              },
            },
          },
        },
      },
      "delete": {
        "summary": "Deletes a given document by ID",
        "operationId": "deleteDocument",
        "parameters": [
          {
            "name": "docId",
            "in": "path",
            "required": true,
            "description": "The id of the document. Should be unique.",
            "schema": {
              "type": "string",
            },
          },
        ],
        "responses": {
          "200": {
            "description": "A success response",
            "content": {
              "application/json": {
                "schema": {
                  "success": {
                    "type": "boolean",
                  },
                  "id": {
                    "type": "string",
                    "description": "The id of the deleted document",
                  },
                },
              },
            },
          },
          "400": {
            "description": "An invalid request was made",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ResponseError",
                },
              },
            },
          },
          "default": {
            "description": "Unexpected error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ResponseError",
                },
              },
            },
          },
        },
      },
    },

    "/search/basic": {
      "get": {
        "summary": "A search endpoint for simple queries/parameters",
        "operationId": "searchBasic",
        "parameters": [
          {
            "name": "q",
            "in": "query",
            "description": "The search query as a plain string",
            "required": true,
            "schema": {
              "type": "string",
            },
          },
          // FIXME: This eventually needs pagination params, ordering, etc.
        ],
        "responses": {
          "200": {
            "description": "A list of results",
            "content": {
              "application/json": {
                "schema": {
                  "success": {
                    "type": "boolean",
                  },
                  "query": {
                    "type": "string",
                    "description": "The query that was provided",
                  },
                  "results": {
                    "type": "array",
                    "items": {
                      "$ref": "#/components/schemas/Result",
                    },
                  },
                  // FIXME: This will need more metadata.
                },
              },
            },
          },
          "400": {
            "description": "An invalid request was made",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ResponseError",
                },
              },
            },
          },
          "default": {
            "description": "Unexpected error",
            "content": {
              "application/json": {
                "schema": {
                  "$ref": "#/components/schemas/ResponseError",
                },
              },
            },
          },
        }
      },
    },

    "/stats": {
      "get": {
        "summary": "Returns statistics information about the Anthology server/engine",
        "operationId": "getStats",
        "responses": {
          "200": {
            "description": "Includes a variety of information, including server version, number of indexed documents, number of indexed terms, etc.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "version": {
                      "type": "string",
                      "description": "A roughly semver version of the Anthology server",
                    },
                    "runtime": {
                      "type": "string",
                      "description": "The version of the runtime executing the server",
                    },
                    "indexSize": {
                      "type": "integer",
                      "format": "int64",
                      "description": "The number of terms in the index",
                    },
                    "indexedDocuments": {
                      "type": "integer",
                      "format": "int64",
                      "description": "The number of documents that have been indexed",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },

    "/schema": {
      "get": {
        "summary": "The OpenAPI schema for the Anthology server; a.k.a this schema",
        "operationId": "getSchema",
        "responses": {
          "200": {
            "description": "This schema document",
          },
        },
      },
    },

    "/health": {
      "get": {
        "summary": "Returns health information about the Anthology server/engine",
        "operationId": "getHealth",
        "responses": {
          "200": {
            "description": "Includes a variety of information, including status, current timestamp, server uptime, etc.",
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "status": {
                      "type": "string",
                      "example": "ok",
                    },
                    "timestamp": {
                      "type": "string",
                      "format": "date-time",
                      "example": "2024-01-15T10:30:00Z",
                    },
                    "uptime": {
                      "type": "number",
                      "description": "The amount of time the server has been running for, in seconds, as a float",
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  },
  "components": {
    "schemas": {
      "Document": DOCUMENT_SCHEMA,
      "Metadata": METADATA_SCHEMA,
      "Result": RESULT_SCHEMA,
      "ResponseError": RESPONSE_ERROR_SCHEMA,
    },
  },
};

export function makeSchemaViews({ engine }: ViewContext) {
  return {
    async openapiSchema(req: Bun.BunRequest): Promise<Response> {
      return Response.json(OPENAPI_SCHEMA);
    },
  };
}
