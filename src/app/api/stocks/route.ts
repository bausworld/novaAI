import { NextRequest, NextResponse } from "next/server";

const DEFAULT_SYMBOLS = ["DAL", "GFS", "INTC", "KO", "LAC", "SGML", "SOFI", "YOU"];

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  name: string;
}

const COMPANY_NAMES: Record<string, string> = {
  DAL: "Delta Air Lines",
  GFS: "GlobalFoundries",
  INTC: "Intel",
  KO: "Coca-Cola",
  LAC: "Lithium Americas",
  SGML: "Sigma Lithium",
  SOFI: "SoFi Technologies",
  YOU: "Clear Secure",
};

async function fetchQuote(symbol: string): Promise<StockQuote> {
  const fallback: StockQuote = {
    symbol,
    price: 0,
    change: 0,
    changePercent: 0,
    name: COMPANY_NAMES[symbol] || symbol,
  };

  try {
    const res = await fetch(
      `https://query2.finance.yahoo.com/v8/finance/chart/${symbol}?interval=1d&range=2d`,
      {
        headers: { "User-Agent": "Mozilla/5.0 (compatible; Nova/1.0)" },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return fallback;
    const data = await res.json();
    const meta = data?.chart?.result?.[0]?.meta;
    if (!meta?.regularMarketPrice) return fallback;

    const price = meta.regularMarketPrice;
    const prevClose = meta.chartPreviousClose ?? meta.previousClose ?? price;
    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    return {
      symbol,
      price,
      change,
      changePercent,
      name: COMPANY_NAMES[symbol] || meta.shortName || symbol,
    };
  } catch {
    return fallback;
  }
}

export async function GET(req: NextRequest) {
  const symbolsParam = req.nextUrl.searchParams.get("symbols");
  const symbols = symbolsParam ? symbolsParam.split(",") : DEFAULT_SYMBOLS;

  const quotes = await Promise.all(symbols.map(fetchQuote));

  return NextResponse.json({ quotes });
}
