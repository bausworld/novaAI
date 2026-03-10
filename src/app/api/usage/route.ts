import { NextResponse } from "next/server";

const STABILITY_KEY = process.env.STABILITY_API_KEY || "";
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
const OPENAI_KEY = process.env.OPENAI_API_KEY || "";
const MAILERSEND_KEY = process.env.MAILERSEND_API_KEY || "";

export async function GET() {
  const services: Array<{
    name: string;
    type: string;
    status: "active" | "error" | "free";
    cost: string;
    limit: string;
    usage?: string;
    remaining?: string;
    note?: string;
  }> = [];

  // 1. Stability AI — check account balance
  if (STABILITY_KEY) {
    try {
      const res = await fetch("https://api.stability.ai/v1/user/balance", {
        headers: { Authorization: `Bearer ${STABILITY_KEY}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        const credits = data.credits ?? 0;
        services.push({
          name: "Stability AI",
          type: "Image Generation",
          status: "active",
          cost: "~3-6 credits per image (SDXL)",
          limit: "Based on credit balance",
          remaining: `${Number(credits).toFixed(1)} credits`,
          note: "1024×1024 SDXL images, 30 steps",
        });
      } else {
        services.push({
          name: "Stability AI",
          type: "Image Generation",
          status: "error",
          cost: "~3-6 credits per image",
          limit: "Unknown",
          note: `API returned ${res.status}`,
        });
      }
    } catch {
      services.push({
        name: "Stability AI",
        type: "Image Generation",
        status: "error",
        cost: "~3-6 credits per image",
        limit: "Unknown",
        note: "Could not reach Stability AI",
      });
    }
  } else {
    services.push({
      name: "Stability AI",
      type: "Image Generation",
      status: "error",
      cost: "N/A",
      limit: "N/A",
      note: "No API key configured",
    });
  }

  // 2. RapidAPI (Google Web Search)
  if (RAPIDAPI_KEY) {
    try {
      const res = await fetch("https://google-web-search1.p.rapidapi.com/", {
        method: "HEAD",
        headers: {
          "x-rapidapi-key": RAPIDAPI_KEY,
          "x-rapidapi-host": "google-web-search1.p.rapidapi.com",
        },
        signal: AbortSignal.timeout(8000),
      });
      const rateLimit = res.headers.get("x-ratelimit-requests-limit");
      const rateRemaining = res.headers.get("x-ratelimit-requests-remaining");
      services.push({
        name: "RapidAPI Search",
        type: "Web Search",
        status: "active",
        cost: "Based on subscription plan",
        limit: rateLimit ? `${rateLimit} requests/month` : "See RapidAPI dashboard",
        remaining: rateRemaining ? `${rateRemaining} requests left` : "Check dashboard",
        note: "Falls back to DuckDuckGo if unavailable",
      });
    } catch {
      services.push({
        name: "RapidAPI Search",
        type: "Web Search",
        status: "active",
        cost: "Based on subscription plan",
        limit: "See RapidAPI dashboard",
        note: "Falls back to DuckDuckGo if unavailable",
      });
    }
  } else {
    services.push({
      name: "RapidAPI Search",
      type: "Web Search",
      status: "error",
      cost: "N/A",
      limit: "N/A",
      note: "No API key — using DuckDuckGo fallback",
    });
  }

  // 3. OpenAI
  if (OPENAI_KEY) {
    services.push({
      name: "OpenAI",
      type: "AI Chat",
      status: "active",
      cost: "Pay-per-token",
      limit: "Based on billing plan",
      note: "API key configured",
    });
  } else {
    services.push({
      name: "OpenAI",
      type: "AI Chat",
      status: "error",
      cost: "Pay-per-token",
      limit: "N/A",
      note: "No API key configured — add OPENAI_API_KEY to .env.local",
    });
  }

  // 4. MailerSend
  if (MAILERSEND_KEY) {
    services.push({
      name: "MailerSend",
      type: "Email",
      status: "active",
      cost: "Free tier: 3,000 emails/month",
      limit: "Based on plan",
      note: "Sends branded emails from nova@pixel-and-purpose.com",
    });
  } else {
    services.push({
      name: "MailerSend",
      type: "Email",
      status: "error",
      cost: "Free tier available",
      limit: "N/A",
      note: "No API key — add MAILERSEND_API_KEY to .env.local",
    });
  }

  // 5. Free services
  services.push(
    {
      name: "Ollama",
      type: "AI Chat",
      status: "free",
      cost: "Free (runs locally)",
      limit: "Unlimited",
      note: "Uses your Mac's CPU/GPU — no external costs",
    },
    {
      name: "Open-Meteo",
      type: "Weather",
      status: "free",
      cost: "Free",
      limit: "10,000 requests/day",
      note: "No API key required",
    },
    {
      name: "Yahoo Finance",
      type: "Stock Data",
      status: "free",
      cost: "Free",
      limit: "Undocumented",
      note: "Unofficial API, may have soft limits",
    },
    {
      name: "Edge TTS",
      type: "Text-to-Speech",
      status: "free",
      cost: "Free",
      limit: "3,000 chars per request",
      note: "Microsoft Edge voices, no API key needed",
    },
    {
      name: "YouTube Search",
      type: "Video Search",
      status: "free",
      cost: "Free",
      limit: "No hard limit",
      note: "HTML scraping with Piped API fallback",
    },
    {
      name: "Document Generator",
      type: "Documents",
      status: "free",
      cost: "Free",
      limit: "Unlimited",
      note: "Local generation — Word, Excel, PDF via docx/exceljs/pdfkit",
    }
  );

  return NextResponse.json({ services });
}
