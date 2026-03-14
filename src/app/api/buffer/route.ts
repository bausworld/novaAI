import { NextRequest, NextResponse } from "next/server";
import {
  getAccount,
  getOrganizations,
  getChannels,
  createTextPost,
  createImagePost,
  createVideoPost,
  getPaginatedPosts,
  getPostsWithAssets,
  getScheduledPosts,
  createIdea,
} from "@/lib/buffer";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { action, ...params } = body;

  if (!action) {
    return NextResponse.json({ error: "Missing action" }, { status: 400 });
  }

  try {
    let result;

    switch (action) {
      case "getAccount":
        result = await getAccount();
        break;

      case "getOrganizations":
        result = await getOrganizations();
        break;

      case "getChannels":
        if (!params.organizationId) return NextResponse.json({ error: "Missing organizationId" }, { status: 400 });
        result = await getChannels(params.organizationId);
        break;

      case "createTextPost":
        if (!params.channelId || !params.text)
          return NextResponse.json({ error: "Missing channelId or text" }, { status: 400 });
        result = await createTextPost({
          channelId: params.channelId,
          text: params.text,
          dueAt: params.dueAt,
          schedulingType: params.schedulingType,
        });
        break;

      case "createImagePost":
        if (!params.channelId || !params.text || !params.imageUrl)
          return NextResponse.json({ error: "Missing channelId, text, or imageUrl" }, { status: 400 });
        result = await createImagePost({
          channelId: params.channelId,
          text: params.text,
          imageUrl: params.imageUrl,
          dueAt: params.dueAt,
          type: params.type,
        });
        break;

      case "createVideoPost":
        if (!params.channelId || !params.text || !params.videoUrl)
          return NextResponse.json({ error: "Missing channelId, text, or videoUrl" }, { status: 400 });
        result = await createVideoPost({
          channelId: params.channelId,
          text: params.text,
          videoUrl: params.videoUrl,
          dueAt: params.dueAt,
          type: params.type,
        });
        break;

      case "getPaginatedPosts":
        if (!params.organizationId) return NextResponse.json({ error: "Missing organizationId" }, { status: 400 });
        result = await getPaginatedPosts({
          organizationId: params.organizationId,
          channelId: params.channelId,
          status: params.status,
          after: params.after,
          first: params.first,
        });
        break;

      case "getPostsWithAssets":
        if (!params.organizationId) return NextResponse.json({ error: "Missing organizationId" }, { status: 400 });
        result = await getPostsWithAssets({
          organizationId: params.organizationId,
          channelId: params.channelId,
        });
        break;

      case "getScheduledPosts":
        if (!params.organizationId) return NextResponse.json({ error: "Missing organizationId" }, { status: 400 });
        result = await getScheduledPosts(params.organizationId);
        break;

      case "createIdea":
        if (!params.organizationId || !params.title)
          return NextResponse.json({ error: "Missing organizationId or title" }, { status: 400 });
        result = await createIdea({
          organizationId: params.organizationId,
          title: params.title,
          text: params.text || "",
        });
        break;

      default:
        return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
    }

    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    if (message.includes("RATE_LIMIT")) {
      return NextResponse.json({ error: "Rate limit exceeded. Please try again later." }, { status: 429 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
