import { NextRequest, NextResponse } from "next/server";

const STABILITY_KEY = process.env.STABILITY_API_KEY || "";

export async function POST(req: NextRequest) {
  if (!STABILITY_KEY) {
    return NextResponse.json({ error: "Stability API key not configured" }, { status: 500 });
  }

  try {
    const { prompt } = await req.json();
    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json({ error: "Missing prompt" }, { status: 400 });
    }

    // Use Stability AI's SDXL endpoint (stable-diffusion-xl-1024-v1-0)
    const res = await fetch(
      "https://api.stability.ai/v1/generation/stable-diffusion-xl-1024-v1-0/text-to-image",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${STABILITY_KEY}`,
          Accept: "application/json",
        },
        body: JSON.stringify({
          text_prompts: [
            { text: prompt, weight: 1 },
            { text: "blurry, bad quality, distorted, ugly, deformed", weight: -1 },
          ],
          cfg_scale: 7,
          width: 1024,
          height: 1024,
          steps: 30,
          samples: 1,
        }),
        signal: AbortSignal.timeout(60000),
      }
    );

    if (!res.ok) {
      const errText = await res.text();
      console.error("Stability error:", res.status, errText);
      return NextResponse.json({ error: `Stability API error: ${res.status}` }, { status: 502 });
    }

    const data = await res.json();
    const image = data.artifacts?.[0];
    if (!image?.base64) {
      return NextResponse.json({ error: "No image generated" }, { status: 500 });
    }

    return NextResponse.json({
      image: `data:image/png;base64,${image.base64}`,
      seed: image.seed,
    });
  } catch (err) {
    console.error("Image generation error:", err);
    return NextResponse.json({ error: "Image generation failed" }, { status: 500 });
  }
}
