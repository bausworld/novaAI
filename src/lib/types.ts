export interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: number;
  sources?: Source[];
  videos?: VideoResult[];
  generatedImage?: string;
  emailDraft?: EmailDraft;
  generatedDoc?: GeneratedDoc;
  jiraResult?: JiraResult;
  isStreaming?: boolean;
}

export interface JiraIssue {
  key: string;
  id: string;
  url: string;
  summary: string;
  type: string;
}

export interface JiraResult {
  epic?: JiraIssue;
  story?: JiraIssue;
  subtask?: JiraIssue;
  issue?: JiraIssue;
}

export interface EmailDraft {
  to: string;
  toName?: string;
  subject: string;
  bodyHtml: string;
  sent?: boolean;
}

export interface GeneratedDoc {
  id: string;
  type: "docx" | "xlsx" | "pdf";
  title: string;
  description?: string;
  downloadUrl: string;
  previewHtml?: string;
  createdAt: number;
}

export interface Source {
  title: string;
  url: string;
  domain: string;
  snippet?: string;
}

export interface VideoResult {
  videoId: string;
  title: string;
  channelTitle: string;
  thumbnail: string;
  viewCount?: string;
  duration?: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}
