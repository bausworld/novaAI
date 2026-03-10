"use client";

import { useEffect, useState } from "react";
import { useChatStore } from "@/stores/chat-store";
import { ModelPickerModal } from "./ModelPickerModal";
import { ApiUsagePanel } from "./ApiUsagePanel";
import { EmailComposer } from "./EmailComposer";
import { DocumentPanel } from "./DocumentPanel";

interface OllamaModel {
  name: string;
  size: number;
  parameterSize?: string;
}

export function TopBar() {
  const { toggleSidebar, toggleTheme, theme, createConversation, setActiveConversation, selectedModel, setSelectedModel } =
    useChatStore();
  const [mounted, setMounted] = useState(false);
  const [models, setModels] = useState<OllamaModel[]>([]);
  const [modelModalOpen, setModelModalOpen] = useState(false);
  const [usagePanelOpen, setUsagePanelOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    if (isDark && theme !== "dark") toggleTheme();
    setMounted(true);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Fetch models on mount
  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        if (data.models) setModels(data.models);
      })
      .catch(() => {});
  }, []);

  const handleNew = () => {
    const id = createConversation();
    setActiveConversation(id);
  };

  const displayModel = selectedModel || models[0]?.name || "Model";
  const baseName = displayModel.split(":")[0];
  // Shorten long model names for the topbar
  const shortModel = baseName.length > 10 ? baseName.slice(0, 9) + "…" : baseName;

  return (
    <header className="nova-topbar">
      {/* Left */}
      <div className="flex items-center gap-3">
        <button className="nova-icon-btn" onClick={toggleSidebar} aria-label="Toggle sidebar">
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
            <line x1="3" y1="5" x2="17" y2="5" />
            <line x1="3" y1="10" x2="17" y2="10" />
            <line x1="3" y1="15" x2="17" y2="15" />
          </svg>
        </button>
        <button
          className="flex items-center gap-2"
          onClick={() => setActiveConversation(null)}
          style={{ background: "none", border: "none", cursor: "pointer", padding: 0 }}
          aria-label="Go to homepage"
        >
          <div
            className="flex items-center justify-center"
            style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent)" }}
          >
            <span className="text-white text-xs font-bold">N</span>
          </div>
          <span className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>
            Nova
          </span>
          <span style={{ fontSize: 10, color: "var(--text-secondary)", opacity: 0.7, fontWeight: 400, whiteSpace: "nowrap" }}>
            by Pixel &amp; Purpose
          </span>
        </button>
      </div>

      {/* Right */}
      <div className="flex items-center gap-1">
        {/* Model Picker */}
        <button
          className="nova-icon-btn"
          onClick={() => setModelModalOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 13,
            padding: "6px 10px",
            borderRadius: 8,
            color: "var(--text-secondary)",
          }}
          aria-label="Select model"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z" />
            <path d="M2 17l10 5 10-5" />
            <path d="M2 12l10 5 10-5" />
          </svg>
          <span className="hidden sm:inline" style={{ maxWidth: 100, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: 13 }}>
            {shortModel}
          </span>
        </button>

        <ModelPickerModal
          open={modelModalOpen}
          onClose={() => setModelModalOpen(false)}
          models={models}
          selectedModel={selectedModel || models[0]?.name || ""}
          onSelect={setSelectedModel}
        />

        <button className="nova-btn-accent" onClick={handleNew}>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="8" y1="2" x2="8" y2="14" />
            <line x1="2" y1="8" x2="14" y2="8" />
          </svg>
          <span className="hidden sm:inline">New</span>
        </button>

        {/* Email */}
        <button
          className="nova-icon-btn"
          onClick={() => setEmailOpen(true)}
          aria-label="Compose email"
          title="Compose Email"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="M22 7l-10 7L2 7" />
          </svg>
        </button>

        <EmailComposer open={emailOpen} onClose={() => setEmailOpen(false)} />

        {/* Documents */}
        <button
          className="nova-icon-btn"
          onClick={() => setDocsOpen(true)}
          aria-label="Documents"
          title="Documents"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
        </button>

        <DocumentPanel open={docsOpen} onClose={() => setDocsOpen(false)} />

        {/* API Usage */}
        <button
          className="nova-icon-btn"
          onClick={() => setUsagePanelOpen(true)}
          aria-label="API usage & costs"
          title="API Usage & Costs"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
        </button>

        <ApiUsagePanel open={usagePanelOpen} onClose={() => setUsagePanelOpen(false)} />

        <button className="nova-icon-btn" onClick={toggleTheme} aria-label="Toggle theme">
          {!mounted || theme === "light" ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="5" />
              <line x1="12" y1="1" x2="12" y2="3" />
              <line x1="12" y1="21" x2="12" y2="23" />
              <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
              <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
              <line x1="1" y1="12" x2="3" y2="12" />
              <line x1="21" y1="12" x2="23" y2="12" />
              <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
              <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
            </svg>
          )}
        </button>
      </div>
    </header>
  );
}
