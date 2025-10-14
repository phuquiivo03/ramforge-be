export const openApiSpec = {
  openapi: "3.0.3",
  info: {
    title: "Ramforge API",
    version: "1.0.0",
    description: "API documentation for Ramforge backend",
  },
  servers: [{ url: "/" }],
  tags: [
    { name: "Auth", description: "Authentication and identity" },
    { name: "Networks", description: "Networks and onchain relationships" },
    { name: "Requests", description: "Connection requests" },
  ],
  components: {
    schemas: {
      Builder: {
        type: "object",
        properties: {
          _id: { type: "string" },
          name: { type: "string" },
          display_name: { type: "string", nullable: true },
          image_url: { type: "string", nullable: true },
          location: { type: "array", items: { type: "number" } },
        },
      },
      Request: {
        type: "object",
        properties: {
          _id: { type: "string" },
          sender: { $ref: "#/components/schemas/Builder" },
          receiver: { $ref: "#/components/schemas/Builder" },
          status: { type: "string", enum: ["pending", "accepted", "canceled"] },
          createdAt: { type: "string", format: "date-time" },
          updatedAt: { type: "string", format: "date-time" },
        },
      },
    },
  },
  paths: {
    "/auth": {
      post: {
        summary: "Authenticate by wallet address",
        tags: ["Auth"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: {
                type: "object",
                required: ["walletAddress"],
                properties: { walletAddress: { type: "string" } },
              },
            },
          },
        },
        responses: {
          200: {
            description: "Authenticated builder",
            content: { "application/json": { schema: { type: "object", properties: { builder: { $ref: "#/components/schemas/Builder" } } } } },
          },
          400: { description: "Invalid wallet address" },
          404: { description: "Name not resolved for address" },
        },
      },
    },
    "/requests": {
      get: {
        summary: "List requests",
        tags: ["Requests"],
        parameters: [
          { name: "sender", in: "query", schema: { type: "string" } },
          { name: "receiver", in: "query", schema: { type: "string" } },
          { name: "status", in: "query", schema: { type: "string", enum: ["pending", "accepted", "canceled"] } },
          { name: "page", in: "query", schema: { type: "integer", default: 1 } },
          { name: "limit", in: "query", schema: { type: "integer", default: 20 } },
        ],
        responses: {
          200: {
            description: "List of requests",
            content: { "application/json": { schema: { type: "object", properties: { page: { type: "integer" }, limit: { type: "integer" }, total: { type: "integer" }, items: { type: "array", items: { $ref: "#/components/schemas/Request" } } } } } },
          },
        },
      },
      post: {
        summary: "Create a request",
        tags: ["Requests"],
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: { type: "object", required: ["sender", "receiver"], properties: { sender: { type: "string" }, receiver: { type: "string" } } },
            },
          },
        },
        responses: {
          201: { description: "Created request", content: { "application/json": { schema: { $ref: "#/components/schemas/Request" } } } },
          400: { description: "Validation error" },
        },
      },
    },
    "/requests/{id}": {
      get: {
        summary: "Get a request",
        tags: ["Requests"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        responses: { 200: { description: "Request", content: { "application/json": { schema: { $ref: "#/components/schemas/Request" } } } }, 404: { description: "Not found" } },
      },
    },
    "/requests/{id}/status": {
      patch: {
        summary: "Update request status",
        tags: ["Requests"],
        parameters: [{ name: "id", in: "path", required: true, schema: { type: "string" } }],
        requestBody: {
          required: true,
          content: { "application/json": { schema: { type: "object", required: ["status"], properties: { status: { type: "string", enum: ["pending", "accepted", "canceled"] } } } } },
        },
        responses: { 200: { description: "Updated", content: { "application/json": { schema: { $ref: "#/components/schemas/Request" } } } }, 400: { description: "Invalid status" } },
      },
    },
    "/networks": {
      get: { summary: "List networks", tags: ["Networks"], responses: { 200: { description: "OK" } } },
      post: {
        summary: "Create network",
        tags: ["Networks"],
        requestBody: { required: true, content: { "application/json": { schema: { type: "object", properties: { builder: { type: "string" }, connections: { type: "array", items: { type: "string" } } } } } } },
        responses: { 201: { description: "Created" } },
      },
    },
    "/networks/{builderId}": {
      get: { summary: "Get a builder's network", tags: ["Networks"], parameters: [{ name: "builderId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "OK" }, 404: { description: "Not found" } } },
    },
    "/networks/{builderId}/onchainFiends": {
      get: { summary: "Get onchain friends for builder", tags: ["Networks"], parameters: [{ name: "builderId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "OK" } } },
    },
    "/networks/pending/received/{userId}": {
      get: { summary: "Get pending received for user", tags: ["Networks"], parameters: [{ name: "userId", in: "path", required: true, schema: { type: "string" } }], responses: { 200: { description: "OK" } } },
    },
  },
} as const;


