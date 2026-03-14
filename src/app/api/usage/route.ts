import { NextResponse } from "next/server";

const STABILITY_KEY = process.env.STABILITY_API_KEY || "";
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || "";
const OPENAI_KEY = process.env.OPEN_API_KEY || "";
const MAILERSEND_KEY = process.env.MAILERSEND_API_KEY || "";
const VEO_KEY = process.env.VEO_API_KEY || "";
const JIRA_SITE = process.env.JIRA_SITE_URL || "";
const BUFFER_KEY = process.env.BUFFER_API_KEY || "";

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
    try {
      const res = await fetch("https://api.openai.com/v1/models", {
        headers: { Authorization: `Bearer ${OPENAI_KEY}` },
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const data = await res.json();
        const modelCount = data.data?.length || 0;
        const hasGpt4 = data.data?.some((m: { id: string }) => m.id.startsWith("gpt-4"));
        const hasGpt5 = data.data?.some((m: { id: string }) => m.id.startsWith("gpt-5"));
        const topModel = hasGpt5 ? "GPT-5" : hasGpt4 ? "GPT-4" : "GPT-3.5";
        services.push({
          name: "OpenAI",
          type: "AI Chat",
          status: "active",
          cost: "Pay-per-token",
          limit: "Based on billing plan",
          remaining: `${modelCount} models available`,
          note: `Up to ${topModel}. Check billing at platform.openai.com`,
        });
      } else {
        services.push({
          name: "OpenAI",
          type: "AI Chat",
          status: "error",
          cost: "Pay-per-token",
          limit: "N/A",
          note: `API returned ${res.status} — check key`,
        });
      }
    } catch {
      services.push({
        name: "OpenAI",
        type: "AI Chat",
        status: "error",
        cost: "Pay-per-token",
        limit: "N/A",
        note: "Could not reach OpenAI",
      });
    }
  } else {
    services.push({
      name: "OpenAI",
      type: "AI Chat",
      status: "error",
      cost: "Pay-per-token",
      limit: "N/A",
      note: "No API key configured — add OPEN_API_KEY to .env.local",
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

  // 5. Free services — check connectivity live
  // Ollama
  const ollamaUrl = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
  try {
    const ollamaRes = await fetch(`${ollamaUrl}/api/tags`, {
      signal: AbortSignal.timeout(2000),
    });
    if (ollamaRes.ok) {
      const ollamaData = await ollamaRes.json();
      const modelCount = ollamaData.models?.length || 0;
      services.push({
        name: "Ollama",
        type: "AI Chat",
        status: "active",
        cost: "Free (runs locally)",
        limit: "Unlimited",
        remaining: `${modelCount} model${modelCount !== 1 ? "s" : ""} loaded`,
        note: "Running locally — using your CPU/GPU",
      });
    } else {
      throw new Error("unreachable");
    }
  } catch {
    const hasOpenAI = !!(process.env.OPEN_API_KEY || process.env.OPENAI_API_KEY);
    services.push({
      name: "Ollama",
      type: "AI Chat",
      status: "error",
      cost: "Free (runs locally)",
      limit: "Unlimited",
      note: hasOpenAI
        ? `Not reachable at ${ollamaUrl} — Nova is using OpenAI as fallback`
        : `Not reachable at ${ollamaUrl} — start Ollama locally to use local models`,
    });
  }

  // Open-Meteo
  try {
    const meteoRes = await fetch(
      "https://api.open-meteo.com/v1/forecast?latitude=40.71&longitude=-74.01&current_weather=true",
      { signal: AbortSignal.timeout(5000) }
    );
    services.push({
      name: "Open-Meteo",
      type: "Weather",
      status: meteoRes.ok ? "active" : "error",
      cost: "Free",
      limit: "10,000 requests/day",
      note: meteoRes.ok ? "Connected — no API key required" : `Returned ${meteoRes.status}`,
    });
  } catch {
    services.push({
      name: "Open-Meteo",
      type: "Weather",
      status: "error",
      cost: "Free",
      limit: "10,000 requests/day",
      note: "Could not reach Open-Meteo",
    });
  }

  // Yahoo Finance
  try {
    const yahooRes = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/AAPL?interval=1d&range=1d",
      { signal: AbortSignal.timeout(5000) }
    );
    services.push({
      name: "Yahoo Finance",
      type: "Stock Data",
      status: yahooRes.ok ? "active" : "error",
      cost: "Free",
      limit: "Undocumented",
      note: yahooRes.ok ? "Connected — unofficial API" : `Returned ${yahooRes.status}`,
    });
  } catch {
    services.push({
      name: "Yahoo Finance",
      type: "Stock Data",
      status: "error",
      cost: "Free",
      limit: "Undocumented",
      note: "Could not reach Yahoo Finance",
    });
  }

  // Edge TTS — no external ping possible (local package), mark active if package present
  try {
    require("msedge-tts");
    services.push({
      name: "Edge TTS",
      type: "Text-to-Speech",
      status: "active",
      cost: "Free",
      limit: "3,000 chars per request",
      note: "Microsoft Edge voices — package installed",
    });
  } catch {
    services.push({
      name: "Edge TTS",
      type: "Text-to-Speech",
      status: "error",
      cost: "Free",
      limit: "3,000 chars per request",
      note: "msedge-tts package not found",
    });
  }

  // YouTube / Piped
  try {
    const pipedRes = await fetch("https://pipedapi.kavin.rocks/trending?region=US", {
      signal: AbortSignal.timeout(5000),
    });
    services.push({
      name: "YouTube Search",
      type: "Video Search",
      status: pipedRes.ok ? "active" : "error",
      cost: "Free",
      limit: "No hard limit",
      note: pipedRes.ok ? "Piped API reachable" : "Piped API unavailable — falling back to scraping",
    });
  } catch {
    services.push({
      name: "YouTube Search",
      type: "Video Search",
      status: "error",
      cost: "Free",
      limit: "No hard limit",
      note: "Piped API unreachable — scraping fallback active",
    });
  }

  // Document Generator — always local
  services.push({
    name: "Document Generator",
    type: "Documents",
    status: "active",
    cost: "Free",
    limit: "Unlimited",
    note: "Local — Word, Excel, PDF via docx/exceljs/pdfkit",
  });

  // 6. VEO Video Generation
  if (VEO_KEY) {
    services.push({
      name: "Google VEO",
      type: "Video Generation",
      status: "active",
      cost: "Pay-per-video",
      limit: "Based on Google Cloud billing",
      note: "AI video generation via Vertex AI",
    });
  }

  // 7. Jira
  if (JIRA_SITE) {
    services.push({
      name: "Jira Cloud",
      type: "Project Management",
      status: "active",
      cost: "Free (included in Jira plan)",
      limit: "Unlimited",
      note: `Connected to ${JIRA_SITE.replace("https://", "")}`,
    });
  }

  // 8. Buffer
  if (BUFFER_KEY) {
    try {
      const res = await fetch("https://api.buffer.com", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${BUFFER_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: "query { account { id email } }" }),
        signal: AbortSignal.timeout(8000),
      });
      const rateLimitRemaining = res.headers.get("RateLimit-Remaining");
      const rateLimitLimit = res.headers.get("RateLimit-Limit");
      if (res.ok) {
        const data = await res.json();
        const email = data?.data?.account?.email || "";
        services.push({
          name: "Buffer",
          type: "Social Media",
          status: "active",
          cost: "Based on Buffer plan",
          limit: rateLimitLimit ? `${rateLimitLimit} req/15min` : "100 req/15min (3rd party)",
          remaining: rateLimitRemaining ? `${rateLimitRemaining} requests left` : undefined,
          note: email ? `Connected as ${email}` : "Post & schedule to social channels",
        });
      } else {
        services.push({
          name: "Buffer",
          type: "Social Media",
          status: "error",
          cost: "Based on Buffer plan",
          limit: "N/A",
          note: `API returned ${res.status} — check BUFFER_API_KEY`,
        });
      }
    } catch {
      services.push({
        name: "Buffer",
        type: "Social Media",
        status: "error",
        cost: "Based on Buffer plan",
        limit: "N/A",
        note: "Could not reach Buffer API",
      });
    }
  } else {
    services.push({
      name: "Buffer",
      type: "Social Media",
      status: "error",
      cost: "Based on Buffer plan",
      limit: "N/A",
      note: "No API key — add BUFFER_API_KEY to .env.local",
    });
  }

  return NextResponse.json({ services });
}
