import { NextRequest, NextResponse } from "next/server";

type SearchResult = { title: string; url: string; domain: string; snippet: string };

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&nbsp;/g, " ");
}

/** Parse DuckDuckGo HTML search results into structured data */
function parseDDGHtml(html: string): SearchResult[] {
  const results: SearchResult[] = [];

  // Split by result blocks — each organic result lives inside a result__body
  const blocks = html.split("result__body");

  for (const block of blocks.slice(1)) {
    // Extract title + URL from result__a
    const linkMatch = block.match(/class="result__a"[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/);
    if (!linkMatch) continue;

    let url = linkMatch[1];
    const rawTitle = decodeHtmlEntities(linkMatch[2].replace(/<[^>]+>/g, "").trim());

    // Skip ad results (they route through duckduckgo.com redirect)
    if (url.includes("duckduckgo.com/y.js") || url.includes("ad_provider")) continue;

    // DDG wraps URLs in a redirect — unwrap if needed
    const uddgMatch = url.match(/[?&]uddg=([^&]+)/);
    if (uddgMatch) {
      url = decodeURIComponent(uddgMatch[1]);
    }

    // Extract snippet
    const snippetMatch = block.match(/class="result__snippet"[^>]*>([\s\S]*?)<\/a>/);
    const snippet = snippetMatch
      ? decodeHtmlEntities(snippetMatch[1].replace(/<[^>]+>/g, "").trim()).slice(0, 250)
      : "";

    if (!rawTitle || !url) continue;

    try {
      results.push({
        title: rawTitle.slice(0, 120),
        url,
        domain: new URL(url).hostname,
        snippet,
      });
    } catch {
      continue;
    }
  }

  return results;
}

export async function POST(req: NextRequest) {
  const { query } = await req.json();

  if (!query) {
    return NextResponse.json({ error: "Missing query" }, { status: 400 });
  }

  // Strategy 1: RapidAPI Google Web Search (reliable, fast)
  const rapidApiKey = process.env.RAPIDAPI_KEY;
  if (rapidApiKey) {
    try {
      const res = await fetch(
        `https://google-web-search1.p.rapidapi.com/?query=${encodeURIComponent(query)}&limit=5&related_keywords=false`,
        {
          headers: {
            "x-rapidapi-key": rapidApiKey,
            "x-rapidapi-host": "google-web-search1.p.rapidapi.com",
          },
          signal: AbortSignal.timeout(8000),
        }
      );

      if (res.ok) {
        const data = await res.json();
        const results: SearchResult[] = (data.results || []).slice(0, 3).map((r: any) => {
          let domain = "";
          try { domain = new URL(r.url || r.link || "").hostname; } catch {}
          return {
            title: (r.title || "").slice(0, 120),
            url: r.url || r.link || "",
            domain,
            snippet: (r.description || r.snippet || "").slice(0, 250),
          };
        }).filter((r: SearchResult) => r.title && r.url);

        if (results.length > 0) {
          return NextResponse.json({ results });
        }
      }
    } catch {
      // Fall through to DDG
    }
  }

  // Strategy 2: DuckDuckGo HTML search (free fallback)
  for (let attempt = 0; attempt < 2; attempt++) {
    if (attempt > 0) await new Promise(r => setTimeout(r, 500));
    try {
      const ddgRes = await fetch("https://html.duckduckgo.com/html/", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
          "Accept-Language": "en-US,en;q=0.9",
        },
        body: `q=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(8000),
      });

      if (ddgRes.ok) {
        const html = await ddgRes.text();
        const results = parseDDGHtml(html).slice(0, 3);
        if (results.length > 0) {
          return NextResponse.json({ results });
        }
      }
    } catch {
      // Retry or fall through
    }
  }

  return NextResponse.json({ results: [] });
}
