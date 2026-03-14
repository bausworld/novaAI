import { NextResponse } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";

export async function GET() {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, {
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error("Ollama unreachable");

    const data = await res.json();
    const models = (data.models || []).map((m: { name: string; size: number; details?: { parameter_size?: string } }) => ({
      name: m.name,
      size: m.size,
      parameterSize: m.details?.parameter_size || "",
      provider: "ollama",
    }));

    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ models: [], error: "Cannot connect to Ollama" }, { status: 503 });
  }
}
