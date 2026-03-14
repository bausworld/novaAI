import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Conversation, Message, VideoResult, Source } from "@/lib/types";

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;
function debouncedSync(state: { conversations: Conversation[]; activeConversationId: string | null; selectedModel: string }) {
  if (syncTimer) clearTimeout(syncTimer);
  syncTimer = setTimeout(() => {
    fetch("/api/conversations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        conversations: state.conversations,
        activeConversationId: state.activeConversationId,
        selectedModel: state.selectedModel,
      }),
    }).catch(() => {});
  }, 1000);
}

interface ChatState {
  conversations: Conversation[];
  activeConversationId: string | null;
  sidebarOpen: boolean;
  theme: "light" | "dark";
  videoModal: { open: boolean; videoId?: string; url?: string };
  uploadedContext: Array<{ name: string; content: string }>;
  selectedModel: string;
  videoDuration: 2 | 5 | 8;

  // Actions
  createConversation: () => string;
  deleteConversation: (id: string) => void;
  setActiveConversation: (id: string | null) => void;
  addMessage: (conversationId: string, message: Message) => void;
  updateMessage: (conversationId: string, messageId: string, updates: Partial<Message>) => void;
  appendToMessage: (conversationId: string, messageId: string, token: string) => void;
  toggleSidebar: () => void;
  toggleTheme: () => void;
  openVideoModal: (opts: { videoId?: string; url?: string }) => void;
  closeVideoModal: () => void;
  getActiveConversation: () => Conversation | undefined;
  addUploadedContext: (file: { name: string; content: string }) => void;
  removeUploadedContext: (name: string) => void;
  clearUploadedContext: () => void;
  setSelectedModel: (model: string) => void;
  setVideoDuration: (d: 2 | 5 | 8) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set, get) => ({
      conversations: [],
      activeConversationId: null,
      sidebarOpen: false,
      theme: "light",
      videoModal: { open: false },
      uploadedContext: [],
      selectedModel: "",
      videoDuration: 8,

      createConversation: () => {
        const id = generateId();
        const conversation: Conversation = {
          id,
          title: "New Chat",
          messages: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
        };
        set((state) => ({
          conversations: [conversation, ...state.conversations],
          activeConversationId: id,
        }));
        return id;
      },

      deleteConversation: (id) => {
        set((state) => {
          const conversations = state.conversations.filter((c) => c.id !== id);
          const activeConversationId =
            state.activeConversationId === id
              ? conversations[0]?.id ?? null
              : state.activeConversationId;
          return { conversations, activeConversationId };
        });
      },

      setActiveConversation: (id) => {
        set({ activeConversationId: id, sidebarOpen: false });
      },

      addMessage: (conversationId, message) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            const messages = [...c.messages, message];
            const title =
              c.messages.length === 0 && message.role === "user"
                ? message.content.slice(0, 40) + (message.content.length > 40 ? "…" : "")
                : c.title;
            return { ...c, messages, title, updatedAt: Date.now() };
          }),
        }));
      },

      updateMessage: (conversationId, messageId, updates) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === messageId ? { ...m, ...updates } : m
              ),
              updatedAt: Date.now(),
            };
          }),
        }));
      },

      appendToMessage: (conversationId, messageId, token) => {
        set((state) => ({
          conversations: state.conversations.map((c) => {
            if (c.id !== conversationId) return c;
            return {
              ...c,
              messages: c.messages.map((m) =>
                m.id === messageId ? { ...m, content: m.content + token } : m
              ),
            };
          }),
        }));
      },

      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),

      toggleTheme: () =>
        set((state) => {
          const next = state.theme === "light" ? "dark" : "light";
          if (typeof document !== "undefined") {
            document.documentElement.classList.toggle("dark", next === "dark");
          }
          if (typeof localStorage !== "undefined") {
            localStorage.setItem("nova-theme", next);
          }
          return { theme: next };
        }),

      openVideoModal: (opts) => set({ videoModal: { open: true, ...opts } }),
      closeVideoModal: () => set({ videoModal: { open: false } }),

      getActiveConversation: () => {
        const state = get();
        return state.conversations.find((c) => c.id === state.activeConversationId);
      },

      addUploadedContext: (file) => {
        set((state) => ({
          uploadedContext: [...state.uploadedContext.filter(f => f.name !== file.name), file],
        }));
      },
      removeUploadedContext: (name) => {
        set((state) => ({
          uploadedContext: state.uploadedContext.filter(f => f.name !== name),
        }));
      },
      clearUploadedContext: () => set({ uploadedContext: [] }),
      setSelectedModel: (model) => set({ selectedModel: model }),
      setVideoDuration: (d) => set({ videoDuration: d }),
    }),
    {
      name: "nova-chat-storage",
      partialize: (state) => ({
        conversations: state.conversations.map(c => ({
          ...c,
          messages: c.messages.map(m => {
            const cleaned = { ...m };
            if (cleaned.generatedImage) delete cleaned.generatedImage;
            if (cleaned.generatedDoc?.previewHtml) {
              cleaned.generatedDoc = { ...cleaned.generatedDoc, previewHtml: "" };
            }
            if (cleaned.generatedVideo?.videoUrl) {
              cleaned.generatedVideo = { ...cleaned.generatedVideo, videoUrl: undefined };
            }
            return cleaned;
          }),
        })),
        activeConversationId: null,
        theme: state.theme,
        selectedModel: state.selectedModel,
        videoDuration: state.videoDuration,
      }),
      onRehydrateStorage: () => (state) => {
        // One-time: clear bloated localStorage with base64 images
        try {
          const raw = localStorage.getItem("nova-chat-storage");
          if (raw && raw.length > 2_000_000) {
            localStorage.removeItem("nova-chat-storage");
          }
        } catch { /* ignore */ }

        // Clear ephemeral state that should never survive a page reload
        if (state) {
          state.uploadedContext = [];
          if (![2, 5, 8].includes(state.videoDuration as number)) {
            state.videoDuration = 8;
          }
        }

        // Load from server on startup (server data wins if newer)
        fetch("/api/conversations")
          .then(r => r.json())
          .then(data => {
            if (data?.conversations?.length > 0) {
              const serverLatest = Math.max(...data.conversations.map((c: Conversation) => c.updatedAt || 0));
              const localLatest = Math.max(0, ...(state?.conversations || []).map((c: Conversation) => c.updatedAt || 0));
              if (serverLatest >= localLatest) {
                useChatStore.setState({
                  conversations: data.conversations,
                  activeConversationId: null,
                  selectedModel: data.selectedModel || state?.selectedModel || "",
                });
              }
            }
          })
          .catch(() => {});
      },
    }
  )
);

// Auto-sync to server whenever conversations change
useChatStore.subscribe(
  (state, prevState) => {
    if (state.conversations !== prevState.conversations) {
      debouncedSync(state);
    }
  }
);
