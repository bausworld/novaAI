import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { existsSync } from "fs";

const BASE_URL = "https://generativelanguage.googleapis.com/v1beta";

function getConfig() {
  return {
    apiKey: process.env.VEO_API_KEY || "",
    projectId: process.env.GOOGLE_PROJECT_ID || "",
  };
}

// POST: Start video generation
// GET: Poll status or download video
export async function POST(req: NextRequest) {
  const { apiKey } = getConfig();
  if (!apiKey) {
    return NextResponse.json({ error: "VEO API key not configured" }, { status: 500 });
  }

  try {
    const body = await req.json();
    const {
      prompt,
      model = "veo-3.1-generate-preview",
      aspectRatio = "16:9",
      durationSeconds = 8,
      resolution = "720p",
      personGeneration = "allow_all",
      negativePrompt,
      imageBase64,
      imageMimeType,
    } = body;

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // Build request body
    const instance: Record<string, unknown> = { prompt };

    // Image-to-video: use provided image as first frame
    if (imageBase64) {
      instance.image = {
        bytesBase64Encoded: imageBase64,
        mimeType: imageMimeType || "image/png",
      };
    }

    const parameters: Record<string, unknown> = {
      aspectRatio,
      durationSeconds: Number(durationSeconds),
      personGeneration: imageBase64 ? "allow_adult" : personGeneration,
    };

    if (resolution && resolution !== "720p") {
      parameters.resolution = resolution;
    }

    if (negativePrompt) {
      parameters.negativePrompt = negativePrompt;
    }

    const requestBody = {
      instances: [instance],
      parameters,
    };

    const url = `${BASE_URL}/models/${model}:predictLongRunning`;

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "x-goog-api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(requestBody),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("VEO generation error:", res.status, errText);
      return NextResponse.json(
        { error: `VEO API error: ${res.status} — ${errText}` },
        { status: 502 }
      );
    }

    const operation = await res.json();
    return NextResponse.json({
      operationName: operation.name,
      done: operation.done || false,
    });
  } catch (err) {
    console.error("VEO POST error:", err);
    return NextResponse.json({ error: "Video generation request failed" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const { apiKey } = getConfig();
  if (!apiKey) {
    return NextResponse.json({ error: "VEO API key not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(req.url);

  // Download a completed video by its file URI
  const downloadUri = searchParams.get("download");
  if (downloadUri) {
    try {
      // The URI from VEO is like: https://generativelanguage.googleapis.com/v1beta/files/...
      // We need to append ?alt=media and our API key
      const separator = downloadUri.includes("?") ? "&" : "?";
      const mediaUrl = `${downloadUri}${separator}alt=media&key=${apiKey}`;

      const res = await fetch(mediaUrl, {
        signal: AbortSignal.timeout(120000),
      });

      if (!res.ok) {
        // Try without alt=media (some endpoints serve directly)
        const directRes = await fetch(downloadUri, {
          headers: { "x-goog-api-key": apiKey },
          signal: AbortSignal.timeout(120000),
        });
        if (!directRes.ok) {
          return NextResponse.json({ error: `Download failed: ${directRes.status}` }, { status: 502 });
        }
        const videoBuffer = Buffer.from(await directRes.arrayBuffer());
        return saveAndServe(videoBuffer);
      }

      const videoBuffer = Buffer.from(await res.arrayBuffer());
      return saveAndServe(videoBuffer);
    } catch (err) {
      console.error("VEO download error:", err);
      return NextResponse.json({ error: "Video download failed" }, { status: 500 });
    }
  }

  // Poll operation status
  const operationName = searchParams.get("operationName");
  if (!operationName) {
    return NextResponse.json({ error: "Missing operationName or download param" }, { status: 400 });
  }

  try {
    const url = `${BASE_URL}/${operationName}`;
    const res = await fetch(url, {
      headers: { "x-goog-api-key": apiKey },
      signal: AbortSignal.timeout(15000),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("VEO poll error:", res.status, errText);
      return NextResponse.json({ error: `Poll failed: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();

    if (data.done) {
      // Extract video info from the response
      const samples = data.response?.generateVideoResponse?.generatedSamples
        || data.response?.generatedVideos
        || [];
      const firstVideo = samples[0];
      const videoUri = firstVideo?.video?.uri || firstVideo?.video?.url || "";

      return NextResponse.json({
        done: true,
        videoUri,
      });
    }

    return NextResponse.json({
      done: false,
      metadata: data.metadata || null,
    });
  } catch (err) {
    console.error("VEO poll error:", err);
    return NextResponse.json({ error: "Polling failed" }, { status: 500 });
  }
}

async function saveAndServe(videoBuffer: Buffer) {
  // Save to generated-videos directory
  const dir = join(process.cwd(), "generated-videos");
  if (!existsSync(dir)) {
    await mkdir(dir, { recursive: true });
  }
  const filename = `veo-${Date.now()}.mp4`;
  const filepath = join(dir, filename);
  await writeFile(filepath, videoBuffer);

  return new NextResponse(new Uint8Array(videoBuffer), {
    headers: {
      "Content-Type": "video/mp4",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Content-Length": String(videoBuffer.length),
    },
  });
}
