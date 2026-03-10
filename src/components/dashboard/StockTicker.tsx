"use client";

import { useEffect, useState, useRef } from "react";

interface StockQuote {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  name: string;
}

export function StockTicker() {
  const [quotes, setQuotes] = useState<StockQuote[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/stocks")
      .then((r) => r.json())
      .then((data) => {
        if (data?.quotes) setQuotes(data.quotes);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const scroll = (dir: number) => {
    if (scrollRef.current) {
      scrollRef.current.scrollBy({ left: dir * 160, behavior: "smooth" });
    }
  };

  if (loading) {
    return (
      <div className="stock-ticker-container">
        <div style={{ display: "flex", alignItems: "center", gap: 8, opacity: 0.5, padding: "20px 0" }}>
          <span style={{ fontSize: 14, color: "rgba(255,255,255,0.6)" }}>Loading stocks...</span>
        </div>
      </div>
    );
  }

  if (quotes.length === 0) return null;

  return (
    <div className="stock-ticker-container">
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "rgba(255,255,255,0.6)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
          Watchlist
        </span>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={() => scroll(-1)} className="stock-scroll-btn" aria-label="Scroll left">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button onClick={() => scroll(1)} className="stock-scroll-btn" aria-label="Scroll right">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <polyline points="9 6 15 12 9 18" />
            </svg>
          </button>
        </div>
      </div>
      <div
        ref={scrollRef}
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
          scrollSnapType: "x mandatory",
          paddingBottom: 4,
        }}
      >
        {quotes.map((q) => {
          const isUp = q.change >= 0;
          const hasData = q.price > 0;
          return (
            <div
              key={q.symbol}
              className="stock-card"
              style={{
                scrollSnapAlign: "start",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: "#fff" }}>
                  {q.symbol}
                </span>
                {hasData && (
                  <span
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      padding: "2px 6px",
                      borderRadius: 6,
                      background: isUp ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
                      color: isUp ? "#22c55e" : "#ef4444",
                    }}
                  >
                    {isUp ? "+" : ""}{q.changePercent.toFixed(2)}%
                  </span>
                )}
              </div>
              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.5)", marginBottom: 6, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                {q.name}
              </div>
              {hasData ? (
                <div>
                  <div style={{ fontSize: 22, fontWeight: 600, color: "#fff" }}>
                    ${q.price.toFixed(2)}
                  </div>
                  <div style={{ fontSize: 12, color: isUp ? "#22c55e" : "#ef4444", marginTop: 4 }}>
                    {isUp ? "▲" : "▼"} {isUp ? "+" : ""}{q.change.toFixed(2)}
                  </div>
                </div>
              ) : (
                <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>No data</span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
