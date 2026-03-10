import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) {
    return NextResponse.json({ error: "Missing query parameter" }, { status: 400 });
  }

  // Strategy 1: Direct YouTube search page scrape (most reliable)
  try {
    const res = await fetch(
      `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
        signal: AbortSignal.timeout(8000),
      }
    );

    if (res.ok) {
      const html = await res.text();
      const match = html.match(/var ytInitialData = ({.*?});<\/script>/);
      if (match) {
        const data = JSON.parse(match[1]);
        const contents =
          data?.contents?.twoColumnSearchResultsRenderer?.primaryContents
            ?.sectionListRenderer?.contents?.[0]?.itemSectionRenderer?.contents || [];

        const videos = [];
        for (const item of contents) {
          const vr = item?.videoRenderer;
          if (!vr?.videoId || !vr?.title?.runs?.[0]?.text) continue;

          videos.push({
            videoId: vr.videoId,
            title: vr.title.runs[0].text,
            channelTitle: vr.ownerText?.runs?.[0]?.text || "",
            thumbnail: `https://i.ytimg.com/vi/${vr.videoId}/mqdefault.jpg`,
            viewCount: vr.viewCountText?.simpleText?.replace(/ views?/i, "") || "",
            duration: vr.lengthText?.simpleText || "",
          });

          if (videos.length >= 6) break;
        }

        if (videos.length > 0) return NextResponse.json({ videos });
      }
    }
  } catch {}

  // Strategy 2: Piped API instances (fallback)
  const pipedInstances = [
    "https://pipedapi.kavin.rocks",
    "https://pipedapi.adminforge.de",
    "https://api.piped.privacydev.net",
  ];

  for (const instance of pipedInstances) {
    try {
      const res = await fetch(
        `${instance}/search?q=${encodeURIComponent(query)}&filter=videos`,
        { signal: AbortSignal.timeout(4000) }
      );
      if (!res.ok) continue;

      const data = await res.json();
      const videos = (data.items || [])
        .filter((item: any) => item.url && item.title)
        .slice(0, 6)
        .map((item: any) => {
          const videoId = item.url?.replace("/watch?v=", "") || "";
          return {
            videoId,
            title: item.title,
            channelTitle: item.uploaderName || item.uploader || "",
            thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`,
            viewCount: formatViewCount(item.views),
            duration: formatDuration(item.duration),
          };
        });

      if (videos.length > 0) return NextResponse.json({ videos });
    } catch {
      continue;
    }
  }

  return NextResponse.json({ videos: [], error: "YouTube search temporarily unavailable" });
}

function formatViewCount(count: number | undefined): string {
  if (!count) return "";
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return String(count);
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
}
