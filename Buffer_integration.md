# Buffer API: Complete Integration Guide

> This guide covers all Buffer API features, authentication, endpoints, error handling, pagination, rate limits, and detailed GraphQL usage with examples.

---

## Table of Contents
1. [Register & Authentication](#register--authentication)
2. [API Endpoint](#api-endpoint)
3. [Supported Features](#supported-features)
4. [GraphQL Basics](#graphql-basics)
5. [Making Requests](#making-requests)
6. [Posting: Text, Image, Video](#posting-text-image-video)
7. [Ideas](#ideas)
8. [Fetching Data](#fetching-data)
9. [Pagination](#pagination)
10. [Error Handling](#error-handling)
11. [Rate Limits & Query Limits](#rate-limits--query-limits)
12. [Best Practices](#best-practices)
13. [Integrations & SDKs](#integrations--sdks)
14. [References & Resources](#references--resources)

---

## 1. Register & Authentication

- Sign up: [Buffer Signup](https://buffer.com/signup)
- Create an API Key: [API Settings](https://publish.buffer.com/settings/api)
- All requests require an `Authorization` header:
  ```http
  Authorization: Bearer YOUR_TOKEN
  ```

## 2. API Endpoint

- All requests go to: `https://api.buffer.com`
- The API is GraphQL-based. Use tools like [Postman GraphQL](https://learning.postman.com/docs/sending-requests/graphql/graphql-overview/) or [Buffer Explorer](https://developers.buffer.com/explorer.html).

## 3. Supported Features

- Post Creation (text, image, video)
- Post Retrieval (with assets, paginated, scheduled, by channel)
- Idea Creation
- Account, Organization, Channel retrieval
- Analytics (via post/channel queries)

## 4. GraphQL Basics

Buffer uses GraphQL. Learn more: [GraphQL Docs](https://graphql.org/learn/)

**Example: Fetch Organizations**
```graphql
query GetOrganizations {
  account {
    organizations {
      id
      name
      ownerEmail
    }
  }
}
```

## 5. Making Requests

**Headers:**
```json
{
  "Authorization": "Bearer YOUR_TOKEN"
}
```

**Example cURL:**
```bash
curl -X POST https://api.buffer.com \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"query": "query { account { organizations { id name } } }"}'
```

## 6. Posting: Text, Image, Video

### Create Text Post
```graphql
mutation CreatePost {
  createPost(input: {
    text: "Hello from Buffer API!",
    channelId: "YOUR_CHANNEL_ID",
    schedulingType: automatic,
    mode: customSchedule,
    dueAt: "2026-03-26T10:28:47.545Z"
  }) {
    ... on PostActionSuccess {
      post { id text assets { id mimeType } }
    }
    ... on MutationError { message }
  }
}
```
More: [Create Text Post Example](https://developers.buffer.com/examples/create-text-post.html)

### Create Image Post
```graphql
mutation CreatePost {
  createPost(input: {
    text: "Post with image!",
    channelId: "YOUR_CHANNEL_ID",
    schedulingType: automatic,
    mode: customSchedule,
    dueAt: "2026-03-26T10:28:47.545Z",
    assets: {
      images: [
        { url: "https://images.unsplash.com/photo-1742850541164-8eb59ecb3282?q=80&w=3388&auto=format&fit=crop" }
      ]
    }
  }) {
    ... on PostActionSuccess {
      post { id text assets { id mimeType } }
    }
    ... on MutationError { message }
  }
}
```
More: [Create Image Post Example](https://developers.buffer.com/examples/create-image-post.html)

### Create Video Post
Use the `assets.videos` array in the input, similar to images. See [API Reference](https://developers.buffer.com/reference.html#type/VideoAssetInput).

## 7. Ideas

Create an idea for an organization:
```graphql
mutation CreateIdea {
  createIdea(input: {
    organizationId: "YOUR_ORG_ID",
    content: {
      title: "New Idea from API",
      text: "This is the text of the new idea."
    }
  }) {
    ... on Idea {
      id
      content { title text }
    }
  }
}
```
More: [Create Idea Example](https://developers.buffer.com/examples/create-idea.html)

## 8. Fetching Data

### Get Channels
```graphql
query GetChannels {
  channels(input: { organizationId: "YOUR_ORG_ID" }) {
    id name displayName service avatar isQueuePaused
  }
}
```
More: [Get Channels Example](https://developers.buffer.com/examples/get-channels.html)

### Get Posts (Paginated)
```graphql
query GetPosts {
  posts(
    after: "CURSOR",
    first: 20,
    input: { organizationId: "YOUR_ORG_ID", filter: { status: [sent], channelIds: ["YOUR_CHANNEL_ID"] } }
  ) {
    pageInfo { startCursor endCursor hasNextPage }
    edges { node { id text createdAt channelId } }
  }
}
```
More: [Get Paginated Posts](https://developers.buffer.com/examples/get-paginated-posts.html)

### Get Posts With Assets
```graphql
query GetPostsWithAssets {
  posts(
    input: { organizationId: "YOUR_ORG_ID", filter: { status: [sent], channelIds: ["YOUR_CHANNEL_ID"] } }
  ) {
    edges {
      node {
        id text createdAt channelId
        assets {
          thumbnail mimeType source
          ... on ImageAsset { image { altText width height } }
        }
      }
    }
  }
}
```
More: [Get Posts With Assets](https://developers.buffer.com/examples/get-posts-with-assets.html)

### Get Scheduled Posts
```graphql
query GetScheduledPosts {
  posts(
    input: { organizationId: "YOUR_ORG_ID", sort: [{ field: dueAt, direction: asc }, { field: createdAt, direction: desc }], filter: { status: [scheduled] } }
  ) {
    edges { node { id text createdAt } }
  }
}
```
More: [Get Scheduled Posts](https://developers.buffer.com/examples/get-scheduled-posts.html)

## 9. Pagination

- Buffer uses cursor-based pagination: `after`, `first`, `pageInfo`, `edges`.
- See [GraphQL Pagination](https://graphql.org/learn/pagination/).

**Example:**
```graphql
query GetPosts {
  posts(after: "CURSOR", first: 10, input: { organizationId: "ORG_ID" }) {
    pageInfo { startCursor endCursor hasNextPage }
    edges { node { id text } }
  }
}
```

## 10. Error Handling

- Mutations return union types for success and error states.
- Always include `... on MutationError { message }` in your mutation queries.
- Non-recoverable errors appear in the GraphQL `errors` array (e.g., `UNAUTHORIZED`, `NOT_FOUND`).

**Example:**
```graphql
mutation CreatePost {
  createPost(input: { ... }) {
    ... on PostActionSuccess { post { id } }
    ... on MutationError { message }
  }
}
```
More: [API Standards: Error Handling](https://developers.buffer.com/guides/api-standards.html#error-handling)

## 11. Rate Limits & Query Limits

- Third-party Clients: 100 requests/15min
- Unauthenticated: 50 requests/15min
- Account overall: 2000 requests/15min
- Query complexity, depth, alias, and token limits apply. See [API Limits](https://developers.buffer.com/guides/api-limits.html)

**Rate Limit Headers:**
```
RateLimit-Limit: 1000
RateLimit-Remaining: 850
RateLimit-Reset: 2024-01-01T12:00:00.000Z
```

**Error Example:**
```json
{
  "errors": [
    {
      "message": "Too many requests from this client. Please try again later.",
      "extensions": {
        "code": "RATE_LIMIT_EXCEEDED",
        "limitType": "CLIENT_ACCOUNT",
        "retryAfter": 900
      }
    }
  ]
}
```

## 12. Best Practices

- Use HTTPS for all requests.
- Monitor rate limits and handle 429 errors.
- Use named arguments for input types (not positional).
- Use the [API Explorer](https://developers.buffer.com/explorer.html) to test queries.
- Handle nullability as described in [API Standards](https://developers.buffer.com/guides/api-standards.html#being-specific-with-nullability).

## 13. Integrations & SDKs

- [Zapier](https://developers.buffer.com/guides/integrations/zapier.html): Automate workflows
- [n8n](https://developers.buffer.com/guides/integrations/n8n.html): Visual automation
- [Cursor](https://developers.buffer.com/guides/integrations/cursor.html): Code editor integration
- [Raycast](https://developers.buffer.com/guides/integrations/raycast.html): Quick keyboard shortcuts
- [Claude](https://developers.buffer.com/guides/integrations/claude.html): AI content
- [MCP](https://developers.buffer.com/guides/integrations/mcp.html): Model Context Protocol

## 14. References & Resources

- [Buffer API Reference](https://developers.buffer.com/reference.html)
- [Buffer API Explorer](https://developers.buffer.com/explorer.html)
- [API Standards](https://developers.buffer.com/guides/api-standards.html)
- [API Limits](https://developers.buffer.com/guides/api-limits.html)
- [Official GraphQL Docs](https://graphql.org/learn/)
- [Apollo GraphQL Tutorials](https://www.apollographql.com/tutorials/)
- [Buffer Discord](https://discord.gg/9kb24u2tEv)

---


---

## Local Integration Usage (buffer.ts)

All Buffer API features are implemented in `src/lib/buffer.ts` for local use with a single API key. Import and use these functions in your backend or scripts:

```ts
import {
  createTextPost, createImagePost, createVideoPost,
  getPaginatedPosts, getPostsWithAssets, getScheduledPosts,
  createIdea, getAccount, getOrganizations, getChannels
} from './src/lib/buffer';

// Example: Create a text post
await createTextPost({ channelId, text: 'Hello!', dueAt: '2026-03-26T10:28:47.545Z' });

// Example: Create an image post
await createImagePost({ channelId, text: 'With image', imageUrl: 'https://...' });

// Example: Get paginated posts
await getPaginatedPosts({ organizationId, channelId });

// Example: Create an idea
await createIdea({ organizationId, title: 'Idea', text: 'Details' });

// Example: Get account/org/channel info
await getAccount();
await getOrganizations();
await getChannels(organizationId);
```

All functions return the API response and rate limit info. Errors include rate limit headers for handling 429s.

Set your API key in `.env` as `BUFFER_API_KEY=...`.

---

For more advanced usage, see the [Buffer API Reference](https://developers.buffer.com/reference.html) and linked examples above.
