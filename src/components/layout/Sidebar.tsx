"use client";

import { useChatStore } from "@/stores/chat-store";
import { Conversation } from "@/lib/types";

function groupConversations(conversations: Conversation[]) {
  const today: Conversation[] = [];
  const yesterday: Conversation[] = [];
  const older: Conversation[] = [];

  const dayMs = 86400000;
  const startOfToday = new Date().setHours(0, 0, 0, 0);

  for (const c of conversations) {
    if (c.updatedAt >= startOfToday) today.push(c);
    else if (c.updatedAt >= startOfToday - dayMs) yesterday.push(c);
    else older.push(c);
  }

  return { today, yesterday, older };
}

export function Sidebar() {
  const {
    conversations,
    activeConversationId,
    sidebarOpen,
    toggleSidebar,
    setActiveConversation,
    deleteConversation,
    createConversation,
  } = useChatStore();

  const { today, yesterday, older } = groupConversations(conversations);

  const renderGroup = (label: string, items: Conversation[]) => {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: 16 }}>
        <div style={{ padding: "6px 12px", fontSize: 11, fontWeight: 600, color: "var(--text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          {label}
        </div>
        {items.map((c) => (
          <div
            key={c.id}
            onClick={() => setActiveConversation(c.id)}
            className="sidebar-conv-row"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "10px 12px",
              margin: "2px 8px",
              borderRadius: 10,
              cursor: "pointer",
              fontSize: 14,
              color: c.id === activeConversationId ? "var(--accent)" : "var(--text-primary)",
              background: c.id === activeConversationId ? "var(--accent-light)" : "transparent",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => {
              if (c.id !== activeConversationId) e.currentTarget.style.background = "var(--surface-tertiary)";
            }}
            onMouseLeave={(e) => {
              if (c.id !== activeConversationId) e.currentTarget.style.background = "transparent";
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" style={{ flexShrink: 0, opacity: 0.6 }}>
              <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
            </svg>
            <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.title}</span>
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteConversation(c.id);
              }}
              style={{ background: "none", border: "none", color: "var(--text-secondary)", cursor: "pointer", padding: 4, borderRadius: 6, opacity: 0, transition: "opacity 0.15s" }}
              className="sidebar-delete-btn"
              onMouseEnter={(e) => { e.currentTarget.style.color = "#ef4444"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "var(--text-secondary)"; }}
              aria-label="Delete"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        ))}
      </div>
    );
  };

  return (
    <>
      {/* Backdrop */}
      {sidebarOpen && (
        <div
          style={{ position: "fixed", inset: 0, zIndex: 40, background: "rgba(0,0,0,0.4)" }}
          onClick={toggleSidebar}
        />
      )}

      <aside className={`nova-sidebar ${sidebarOpen ? "open" : "closed"}`}>
        {/* Header */}
        <div style={{ height: "var(--topbar-height)", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 16px", borderBottom: "1px solid var(--border)" }}>
          <div className="flex items-center gap-2">
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "var(--accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span className="text-white text-xs font-bold">N</span>
            </div>
            <span style={{ fontWeight: 600, color: "var(--text-primary)" }}>Nova</span>
          </div>
          <button className="nova-icon-btn" onClick={toggleSidebar}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* New Chat */}
        <div style={{ padding: 12 }}>
          <button
            className="nova-btn-accent"
            style={{ width: "100%", justifyContent: "center", padding: "10px 16px" }}
            onClick={() => {
              const id = createConversation();
              setActiveConversation(id);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="8" y1="2" x2="8" y2="14" />
              <line x1="2" y1="8" x2="14" y2="8" />
            </svg>
            New Chat
          </button>
        </div>

        {/* List */}
        <div style={{ flex: 1, overflowY: "auto", padding: "8px 0" }}>
          {conversations.length === 0 ? (
            <div style={{ padding: "32px 16px", textAlign: "center", fontSize: 14, color: "var(--text-secondary)" }}>
              No conversations yet
            </div>
          ) : (
            <>
              {renderGroup("Today", today)}
              {renderGroup("Yesterday", yesterday)}
              {renderGroup("Older", older)}
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ borderTop: "1px solid var(--border)", padding: 12, textAlign: "center", fontSize: 11, color: "var(--text-secondary)" }}>
          Nova AI · v1.0
        </div>
      </aside>
    </>
  );
}
