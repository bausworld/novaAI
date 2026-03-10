"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";

interface OllamaModel {
  name: string;
  size: number;
  parameterSize?: string;
}

interface ModelInfo {
  description: string;
  bestFor: string[];
  limitations: string[];
  canDo: string[];
}

const MODEL_INFO: Record<string, ModelInfo> = {
  "mistral": {
    description: "A fast, general-purpose assistant. Great balance of speed and quality for everyday questions, writing, and analysis.",
    bestFor: ["General Q&A", "Writing & editing", "Summarizing documents", "Brainstorming"],
    canDo: ["Text files (.txt, .md, .csv, .json)", "Code files (.js, .py, .ts, etc.)", "PDF text extraction", "Web search integration"],
    limitations: ["Cannot see or analyze images", "No real-time internet access on its own", "May struggle with very complex math or logic"],
  },
  "gemma3": {
    description: "Google's lightweight model. Snappy and efficient — ideal for quick tasks where speed matters more than depth.",
    bestFor: ["Quick answers", "Short summaries", "Simple code help", "Fast back-and-forth chat"],
    canDo: ["Text files (.txt, .md, .csv, .json)", "Code files (.js, .py, .ts, etc.)", "PDF text extraction"],
    limitations: ["Cannot see or analyze images", "Smaller model — may miss nuance", "Less capable with long documents", "Can struggle with complex reasoning"],
  },
  "zephyr": {
    description: "A fine-tuned chat model focused on being helpful and following instructions precisely. Good at structured tasks.",
    bestFor: ["Following detailed instructions", "Structured outputs (lists, tables)", "Conversational tasks", "Document review"],
    canDo: ["Text files (.txt, .md, .csv, .json)", "Code files (.js, .py, .ts, etc.)", "PDF text extraction"],
    limitations: ["Cannot see or analyze images", "Older model — less capable than Mistral", "Can be verbose", "Limited coding ability"],
  },
  "qwen2.5-coder": {
    description: "A coding specialist from Alibaba. Purpose-built for writing, reviewing, and explaining code across many languages.",
    bestFor: ["Writing code from scratch", "Debugging & code review", "Explaining code", "Converting between languages"],
    canDo: ["All major programming languages", "Code files (.js, .py, .ts, .go, .rs, etc.)", "Text & config files", "SQL queries"],
    limitations: ["Cannot see or analyze images", "Weaker at general knowledge & chat", "Not ideal for creative writing", "May over-engineer simple requests"],
  },
};

function getModelInfo(modelName: string): ModelInfo {
  const base = modelName.split(":")[0];
  if (MODEL_INFO[base]) return MODEL_INFO[base];
  // Fuzzy match
  for (const key of Object.keys(MODEL_INFO)) {
    if (base.startsWith(key) || base.includes(key)) return MODEL_INFO[key];
  }
  return {
    description: "A local AI model running on your machine.",
    bestFor: ["General tasks"],
    canDo: ["Text files"],
    limitations: ["Capabilities unknown — try it out!"],
  };
}

function formatSize(bytes: number): string {
  const gb = bytes / (1024 * 1024 * 1024);
  return gb >= 1 ? `${gb.toFixed(1)} GB` : `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
}

interface ModelPickerModalProps {
  open: boolean;
  onClose: () => void;
  models: OllamaModel[];
  selectedModel: string;
  onSelect: (model: string) => void;
}

export function ModelPickerModal({ open, onClose, models, selectedModel, onSelect }: ModelPickerModalProps) {
  const [expandedModel, setExpandedModel] = useState<string | null>(null);

  return (
    <Modal open={open} onClose={onClose} maxWidth={560}>
      <div style={{ padding: "24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
          <div>
            <h2 style={{ fontSize: 18, fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>Choose a Model</h2>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "4px 0 0" }}>All models run locally on your machine — free and private.</p>
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

        {/* Model list */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {models.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--text-secondary)", fontSize: 14 }}>
              No models found. Is Ollama running?
            </div>
          ) : (
            models.map((m) => {
              const info = getModelInfo(m.name);
              const isActive = m.name === selectedModel;
              const isExpanded = expandedModel === m.name;
              const baseName = m.name.split(":")[0];

              return (
                <div
                  key={m.name}
                  style={{
                    border: isActive ? "2px solid var(--accent)" : "1.5px solid var(--border)",
                    borderRadius: 14,
                    background: isActive ? "var(--accent-light)" : "var(--surface-secondary)",
                    transition: "all 0.15s",
                    overflow: "hidden",
                  }}
                >
                  {/* Collapsed header — always visible */}
                  <div
                    onClick={() => setExpandedModel(isExpanded ? null : m.name)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "14px 16px",
                      cursor: "pointer",
                    }}
                  >
                    <span style={{ fontSize: 15, fontWeight: 700, color: isActive ? "var(--accent)" : "var(--text-primary)" }}>
                      {baseName}
                    </span>
                    {m.parameterSize && (
                      <span style={{
                        fontSize: 11, fontWeight: 600, padding: "2px 7px", borderRadius: 6,
                        background: "var(--surface-tertiary)", color: "var(--text-secondary)",
                      }}>
                        {m.parameterSize}
                      </span>
                    )}
                    <span style={{
                      fontSize: 11, padding: "2px 7px", borderRadius: 6,
                      background: "var(--surface-tertiary)", color: "var(--text-secondary)",
                    }}>
                      {formatSize(m.size)}
                    </span>
                    {isActive && (
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2.5" strokeLinecap="round" style={{ flexShrink: 0 }}>
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                    <svg
                      width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-secondary)" strokeWidth="2" strokeLinecap="round"
                      style={{ marginLeft: "auto", flexShrink: 0, transition: "transform 0.2s", transform: isExpanded ? "rotate(180deg)" : "rotate(0deg)" }}
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </div>

                  {/* Expanded details */}
                  {isExpanded && (
                    <div style={{ padding: "0 16px 14px" }}>
                      {/* Description */}
                      <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: "0 0 10px", lineHeight: 1.5 }}>
                        {info.description}
                      </p>

                      {/* Best for */}
                      <div style={{ marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Best for
                        </span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                          {info.bestFor.map((item) => (
                            <span key={item} style={{
                              fontSize: 11, padding: "3px 8px", borderRadius: 999,
                              background: "rgba(34,197,94,0.1)", color: "#22c55e", fontWeight: 500,
                            }}>
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Can process */}
                      <div style={{ marginBottom: 6 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Can process
                        </span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                          {info.canDo.map((item) => (
                            <span key={item} style={{
                              fontSize: 11, padding: "3px 8px", borderRadius: 999,
                              background: "var(--accent-light)", color: "var(--accent)", fontWeight: 500,
                            }}>
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Limitations */}
                      <div style={{ marginBottom: 12 }}>
                        <span style={{ fontSize: 11, fontWeight: 700, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
                          Limitations
                        </span>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 4, marginTop: 4 }}>
                          {info.limitations.map((item) => (
                            <span key={item} style={{
                              fontSize: 11, padding: "3px 8px", borderRadius: 999,
                              background: "rgba(239,68,68,0.08)", color: "#ef4444", fontWeight: 500,
                            }}>
                              {item}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Select button */}
                      <button
                        onClick={() => { onSelect(m.name); onClose(); }}
                        style={{
                          width: "100%",
                          padding: "10px",
                          borderRadius: 10,
                          border: "none",
                          background: isActive ? "var(--surface-tertiary)" : "var(--accent)",
                          color: isActive ? "var(--text-secondary)" : "#fff",
                          fontSize: 13,
                          fontWeight: 600,
                          cursor: isActive ? "default" : "pointer",
                          transition: "all 0.15s",
                        }}
                      >
                        {isActive ? "Currently selected" : "Use this model"}
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </Modal>
  );
}
