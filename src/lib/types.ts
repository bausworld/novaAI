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
  generatedVideo?: GeneratedVideo;
  savedRecipe?: SavedRecipe;
  isStreaming?: boolean;
  recipeOptions?: any[];
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

export interface GeneratedVideo {
  operationName: string;
  prompt: string;
  model: string;
  aspectRatio: string;
  resolution: string;
  durationSeconds: number;
  status: "generating" | "polling" | "downloading" | "ready" | "error";
  videoUrl?: string;
  error?: string;
  startedAt: number;
}

export interface SavedRecipe {
  slug: string;
  title: string;
  tagline: string;
  servings: string;
  prep_time: string | null;
  cook_time: string | null;
  total_time: string | null;
  image_url: string;
  ingredients: string[];
  instructions: string[];
  tags: string[];
  nutrition: Record<string, string | number>;
  status: "searching" | "generating-image" | "saving" | "generating-video" | "ready" | "error";
  error?: string;
  videoUrl?: string;
  veoOperationName?: string;
  videoStatus?: "generating" | "polling" | "downloading" | "ready" | "error";
}

export interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}
