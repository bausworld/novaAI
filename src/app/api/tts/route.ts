import { NextRequest, NextResponse } from "next/server";
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";

// en-US-GuyNeural = natural American male voice
const VOICE = "en-US-GuyNeural";

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json();
    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Missing text" }, { status: 400 });
    }

    // Limit length to prevent abuse
    const trimmed = text.slice(0, 3000);

    const tts = new MsEdgeTTS();
    await tts.setMetadata(VOICE, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);

    const { audioStream } = tts.toStream(trimmed);
    const chunks: Buffer[] = [];

    await new Promise<void>((resolve, reject) => {
      audioStream.on("data", (chunk: Buffer) => {
        chunks.push(chunk);
      });
      audioStream.on("end", () => resolve());
      audioStream.on("error", reject);
    });

    const audio = Buffer.concat(chunks);

    return new NextResponse(audio, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": String(audio.length),
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (err) {
    console.error("TTS error:", err);
    return NextResponse.json({ error: "TTS failed" }, { status: 500 });
  }
}
