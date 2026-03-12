"use client";

import { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";

interface ServiceInfo {
  name: string;
  type: string;
  status: "active" | "error" | "free";
  cost: string;
  limit: string;
  usage?: string;
  remaining?: string;
  note?: string;
}

interface ApiUsagePanelProps {
  open: boolean;
  onClose: () => void;
}

const STATUS_STYLES: Record<string, { bg: string; color: string; label: string }> = {
  active: { bg: "rgba(34,197,94,0.1)", color: "#22c55e", label: "Active" },
  free: { bg: "var(--accent-light)", color: "var(--accent)", label: "Free" },
  error: { bg: "rgba(239,68,68,0.08)", color: "#ef4444", label: "Issue" },
};

const TYPE_ICONS: Record<string, string> = {
  "Image Generation": "🎨",
  "Web Search": "🔍",
  "AI Chat": "🤖",
  "Weather": "🌤️",
  "Stock Data": "📈",
  "Text-to-Speech": "🔊",
  "Video Search": "🎬",
  "Video Generation": "🎥",
  "Email": "📧",
  "Documents": "📄",
  "Project Management": "📋",
};

export function ApiUsagePanel({ open, onClose }: ApiUsagePanelProps) {
  const [services, setServices] = useState<ServiceInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setExpandedCard(null);
    fetch("/api/usage")
      .then((r) => r.json())
      .then((data) => {
        if (data?.services) setServices(data.services);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open]);

  const paidServices = services.filter((s) => s.status !== "free");
  const freeServices = services.filter((s) => s.status === "free");

  return (
    <Modal open={open} onClose={onClose} maxWidth={600}>
      <div style={{ padding: "24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>API Usage & Costs</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" }}>Real-time status of all connected services.</p>
          </div>
          <button
            onClick={onClose}
            style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 4 }}
            aria-label="Close"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}>
            Checking API status...
          </div>
        ) : (
          <>
            {/* Paid / Active Services */}
            {paidServices.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                  Paid Services
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {paidServices.map((s) => (
                    <ServiceCard key={s.name} service={s} expanded={expandedCard === s.name} onToggle={() => setExpandedCard(expandedCard === s.name ? null : s.name)} />
                  ))}
                </div>
              </div>
            )}

            {/* Free Services */}
            {freeServices.length > 0 && (
              <div>
                <h3 style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 10 }}>
                  Free Services
                </h3>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {freeServices.map((s) => (
                    <ServiceCard key={s.name} service={s} expanded={expandedCard === s.name} onToggle={() => setExpandedCard(expandedCard === s.name ? null : s.name)} />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}

function ServiceCard({ service, expanded, onToggle }: { service: ServiceInfo; expanded: boolean; onToggle: () => void }) {
  const status = STATUS_STYLES[service.status] || STATUS_STYLES.error;
  const icon = TYPE_ICONS[service.type] || "⚙️";

  return (
    <div style={{
      border: "1.5px solid var(--border)",
      borderRadius: 12,
      background: "var(--surface-secondary)",
      overflow: "hidden",
    }}>
      {/* Collapsed header — always visible */}
      <div
        onClick={onToggle}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          padding: "14px 16px",
          cursor: "pointer",
        }}
      >
        <span style={{ fontSize: 18 }}>{icon}</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{service.name}</span>
        <span style={{
          fontSize: 11, padding: "2px 7px", borderRadius: 6,
          background: "var(--surface-tertiary)", color: "var(--text-secondary)",
        }}>
          {service.type}
        </span>
        <span style={{
          fontSize: 11, fontWeight: 600, padding: "2px 8px", borderRadius: 6,
          background: status.bg, color: status.color,
        }}>
          {status.label}
        </span>
        {service.remaining && (
          <span style={{ fontSize: 12, fontWeight: 600, color: service.status === "error" ? "#ef4444" : "#22c55e", marginLeft: "auto" }}>
            {service.remaining}
          </span>
        )}
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"
          style={{ flexShrink: 0, marginLeft: service.remaining ? 0 : "auto", transition: "transform 0.2s", transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>

      {/* Expanded details */}
      {expanded && (
        <div style={{ padding: "0 16px 14px" }}>
          {/* Info grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 16px", fontSize: 13 }}>
            <div>
              <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>Cost</span>
              <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>{service.cost}</div>
            </div>
            <div>
              <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>Limit</span>
              <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>{service.limit}</div>
            </div>
            {service.remaining && (
              <div>
                <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>Remaining</span>
                <div style={{ color: service.status === "error" ? "#ef4444" : "#22c55e", fontWeight: 600 }}>{service.remaining}</div>
              </div>
            )}
            {service.usage && (
              <div>
                <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>Used</span>
                <div style={{ color: "var(--text-primary)", fontWeight: 500 }}>{service.usage}</div>
              </div>
            )}
          </div>

          {/* Note */}
          {service.note && (
            <div style={{ marginTop: 8, fontSize: 12, color: "var(--text-secondary)", fontStyle: "italic" }}>
              {service.note}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
