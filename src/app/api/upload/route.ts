import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabase";

const BUCKET = "media";

async function uploadBuffer(
  bytes: Uint8Array,
  mimeType: string,
  fileName: string
): Promise<{ url: string; kind: "image" | "video" }> {
  const isVideo = mimeType.startsWith("video/");
  const admin = getSupabaseAdmin();

  await admin.storage.createBucket(BUCKET, { public: true }).catch(() => {});

  const ext = fileName.split(".").pop()?.toLowerCase() || (isVideo ? "mp4" : "png");
  const folder = isVideo ? "videos" : "images";
  const filePath = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

  const { error } = await admin.storage
    .from(BUCKET)
    .upload(filePath, bytes, { contentType: mimeType, upsert: false });

  if (error) throw new Error(error.message);

  const { data } = admin.storage.from(BUCKET).getPublicUrl(filePath);
  return { url: data.publicUrl, kind: isVideo ? "video" : "image" };
}

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") ?? "";

    // --- JSON body: base64 data URL (e.g. from AI image generation) ---
    if (contentType.includes("application/json")) {
      const { dataUrl, fileName = "generated.png" } = await req.json();
      if (!dataUrl || !dataUrl.startsWith("data:")) {
        return NextResponse.json({ error: "Invalid dataUrl" }, { status: 400 });
      }
      const [meta, b64] = dataUrl.split(",");
      const mimeType = meta.match(/data:([^;]+)/)?.[1] ?? "image/png";
      const bytes = Uint8Array.from(atob(b64), (c) => c.charCodeAt(0));
      const result = await uploadBuffer(bytes, mimeType, fileName);
      return NextResponse.json({ ...result, mimeType, name: fileName });
    }

    // --- FormData body: real file upload ---
    const form = await req.formData();
    const file = form.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const mimeType = file.type || "application/octet-stream";
    const isImage = mimeType.startsWith("image/");
    const isVideo = mimeType.startsWith("video/");

    if (!isImage && !isVideo) {
      return NextResponse.json({ error: "Only image and video files are supported" }, { status: 400 });
    }
    if (isVideo && file.size > 200 * 1024 * 1024) {
      return NextResponse.json({ error: "Video file too large (max 200 MB)" }, { status: 413 });
    }
    if (isImage && file.size > 20 * 1024 * 1024) {
      return NextResponse.json({ error: "Image file too large (max 20 MB)" }, { status: 413 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const result = await uploadBuffer(bytes, mimeType, file.name);
    return NextResponse.json({ ...result, mimeType, name: file.name });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
