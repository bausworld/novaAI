"use client";

import { useState } from "react";
import { Source } from "@/lib/types";

interface SourceCitationProps {
  sources: Source[];
}

export function SourceCitation({ sources }: SourceCitationProps) {
  const [expanded, setExpanded] = useState(false);

  if (!sources || sources.length === 0) return null;

  return (
    <div style={{ marginTop: 14 }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          paddingTop: 10,
          paddingBottom: expanded ? 8 : 0,
          borderTop: "1px solid var(--border)",
          background: "none",
          border: "none",
          borderTopStyle: "solid",
          borderTopWidth: 1,
          borderTopColor: "var(--border)",
          cursor: "pointer",
          width: "100%",
          textAlign: "left",
        }}
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="16" x2="12" y2="12" />
          <line x1="12" y1="8" x2="12.01" y2="8" />
        </svg>
        <span style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", flex: 1 }}>
          Sources ({sources.length})
        </span>
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--text-secondary)"
          strokeWidth="2"
          strokeLinecap="round"
          style={{
            transition: "transform 0.2s ease",
            transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      <div style={{
        display: "flex",
        flexDirection: "column",
        gap: 6,
        overflow: "hidden",
        maxHeight: expanded ? sources.length * 80 : 0,
        opacity: expanded ? 1 : 0,
        transition: "max-height 0.3s ease, opacity 0.2s ease",
      }}>
        {sources.map((source, i) => (
          <a
            key={i}
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            title={source.snippet || source.title}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 12px",
              background: "var(--surface-tertiary)",
              borderRadius: 12,
              fontSize: 13,
              color: "var(--text-primary)",
              textDecoration: "none",
              transition: "all 0.15s ease",
              border: "1px solid transparent",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = "var(--accent)";
              e.currentTarget.style.background = "var(--accent-light)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.borderColor = "transparent";
              e.currentTarget.style.background = "var(--surface-tertiary)";
            }}
          >
            {/* Favicon */}
            <img
              src={`https://www.google.com/s2/favicons?sz=32&domain=${source.domain}`}
              alt=""
              width={16}
              height={16}
              style={{ borderRadius: 4, flexShrink: 0 }}
              onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
            />
            {/* Number badge */}
            <span style={{
              flexShrink: 0,
              width: 20,
              height: 20,
              borderRadius: 6,
              background: "var(--accent)",
              color: "#fff",
              fontSize: 11,
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}>
              {i + 1}
            </span>
            {/* Title + domain */}
            <div style={{ minWidth: 0, flex: 1 }}>
              <div style={{
                fontWeight: 500,
                fontSize: 13,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}>
                {source.title}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 1 }}>
                {source.domain}
              </div>
            </div>
            {/* Arrow */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0 }}>
              <line x1="7" y1="17" x2="17" y2="7" />
              <polyline points="7 7 17 7 17 17" />
            </svg>
          </a>
        ))}
      </div>
    </div>
  );
}
