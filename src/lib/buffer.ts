const BUFFER_API_URL = "https://api.buffer.com";

function getHeaders() {
  const key = process.env.BUFFER_API_KEY;
  if (!key) throw new Error("BUFFER_API_KEY not set");
  return {
    Authorization: `Bearer ${key}`,
    "Content-Type": "application/json",
  };
}

async function gql(query: string, variables?: Record<string, unknown>) {
  const res = await fetch(BUFFER_API_URL, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify({ query, variables }),
  });
  const rateLimitHeaders = {
    limit: res.headers.get("RateLimit-Limit"),
    remaining: res.headers.get("RateLimit-Remaining"),
    reset: res.headers.get("RateLimit-Reset"),
  };
  const json = await res.json();
  if (json.errors?.length) throw new Error(json.errors[0].message);
  return { data: json.data, rateLimit: rateLimitHeaders };
}

// ---- Account & Orgs ----

export async function getAccount() {
  return gql(`query { account { id email name } }`);
}

export async function getOrganizations() {
  return gql(`query { account { organizations { id name ownerEmail } } }`);
}

// ---- Channels ----

export async function getChannels(organizationId: string) {
  return gql(
    `query GetChannels($input: ChannelsInput!) {
      channels(input: $input) {
        id name displayName service avatar isQueuePaused
      }
    }`,
    { input: { organizationId } }
  );
}

// ---- Posts ----

export interface CreateTextPostInput {
  channelId: string;
  text: string;
  dueAt?: string;
  schedulingType?: string;
}

export async function createTextPost({ channelId, text, dueAt, schedulingType = "automatic" }: CreateTextPostInput) {
  return gql(
    `mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess { post { id text } }
        ... on MutationError { message }
      }
    }`,
    {
      input: {
        channelId,
        text,
        schedulingType,
        mode: "customScheduled",
        dueAt: dueAt || new Date(Date.now() + 3600_000).toISOString(),
      },
    }
  );
}

export interface CreateImagePostInput {
  channelId: string;
  text: string;
  imageUrl: string;
  dueAt?: string;
  type?: string; // For Instagram: "post", "story", "reel"
}

export async function createImagePost({ channelId, text, imageUrl, dueAt, type = "post" }: CreateImagePostInput) {
  return gql(
    `mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess { post { id text assets { id mimeType } } }
        ... on MutationError { message }
      }
    }`,
    {
      input: {
        channelId,
        text,
        schedulingType: "automatic",
        mode: "customScheduled",
        dueAt: dueAt || new Date(Date.now() + 3600_000).toISOString(),
        assets: { images: [{ url: imageUrl }] },
        type,
      },
    }
  );
}

export interface CreateVideoPostInput {
  channelId: string;
  text: string;
  videoUrl: string;
  dueAt?: string;
  type?: string; // For Instagram: "reel", "story", "post"
}

export async function createVideoPost({ channelId, text, videoUrl, dueAt, type = "reel" }: CreateVideoPostInput) {
  return gql(
    `mutation CreatePost($input: CreatePostInput!) {
      createPost(input: $input) {
        ... on PostActionSuccess { post { id text assets { id mimeType } } }
        ... on MutationError { message }
      }
    }`,
    {
      input: {
        channelId,
        text,
        schedulingType: "automatic",
        mode: "customScheduled",
        dueAt: dueAt || new Date(Date.now() + 3600_000).toISOString(),
        assets: { videos: [{ url: videoUrl }] },
        type,
      },
    }
  );
}

export interface GetPaginatedPostsInput {
  organizationId: string;
  channelId?: string;
  status?: string[];
  after?: string;
  first?: number;
}

export async function getPaginatedPosts({
  organizationId,
  channelId,
  status = ["sent"],
  after,
  first = 20,
}: GetPaginatedPostsInput) {
  const filter: Record<string, unknown> = { status };
  if (channelId) filter.channelIds = [channelId];
  return gql(
    `query GetPosts($after: String, $first: Int, $input: PostsInput!) {
      posts(after: $after, first: $first, input: $input) {
        pageInfo { startCursor endCursor hasNextPage }
        edges { node { id text createdAt channelId } }
      }
    }`,
    { after, first, input: { organizationId, filter } }
  );
}

export async function getPostsWithAssets({ organizationId, channelId }: { organizationId: string; channelId?: string }) {
  const filter: Record<string, unknown> = { status: ["sent"] };
  if (channelId) filter.channelIds = [channelId];
  return gql(
    `query GetPostsWithAssets($input: PostsInput!) {
      posts(input: $input) {
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
    }`,
    { input: { organizationId, filter } }
  );
}

export async function getScheduledPosts(organizationId: string) {
  return gql(
    `query GetScheduledPosts($input: PostsInput!) {
      posts(input: $input) {
        edges { node { id text createdAt } }
      }
    }`,
    {
      input: {
        organizationId,
        sort: [
          { field: "dueAt", direction: "asc" },
          { field: "createdAt", direction: "desc" },
        ],
        filter: { status: ["scheduled"] },
      },
    }
  );
}

// ---- Ideas ----

export async function createIdea({ organizationId, title, text }: { organizationId: string; title: string; text: string }) {
  return gql(
    `mutation CreateIdea($input: CreateIdeaInput!) {
      createIdea(input: $input) {
        ... on Idea { id content { title text } }
      }
    }`,
    { input: { organizationId, content: { title, text } } }
  );
}
