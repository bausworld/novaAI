import { useCallback, useRef, useState } from "react";
import { useChatStore } from "@/stores/chat-store";
import { Message, Source, VideoResult, EmailDraft, GeneratedDoc, JiraResult } from "@/lib/types";

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
}

function detectIntent(content: string): { wantsSearch: boolean; wantsVideo: boolean; wantsImage: boolean; wantsEmail: boolean; wantsDoc: boolean; wantsJira: boolean; docType: "docx" | "xlsx" | "pdf"; searchQuery: string; imagePrompt: string; emailTo: string } {
  const lower = content.toLowerCase();

  const wantsImage = /\b(generate|create|make|draw|paint|design|render|imagine)\b.*\b(image|picture|photo|art|illustration|icon|logo|portrait|scene|poster)\b/i.test(lower)
    || /\b(image|picture|photo|art|illustration)\b.*\b(of|showing|with|featuring)\b/i.test(lower);

  // Jira detection: create, move, delete issues
  const wantsJira = !wantsImage && (
    /\b(create|make|add|open|file|log|submit)\b.*\b(jira|ticket|epic|story|subtask)\b/i.test(lower)
    || /\bjira\b.*\b(create|make|add|ticket|epic|story|subtask|issue|task|bug|move|put|remove|delete)\b/i.test(lower)
    || /\b(move|put)\b.*\b(CEO-\d+|issue|ticket|story)\b.*\b(sprint|backlog)\b/i.test(lower)
    || /\b(delete|remove)\b.*\b(CEO-\d+|issue|ticket|story)\b/i.test(lower)
    || /\b(CEO-\d+)\b.*\b(to|into|in)\b.*\bsprint\b/i.test(lower)
  );

  // Email detection: "send an email to X", "email X about Y", "write an email to X"
  const wantsEmail = !wantsImage && !wantsJira && (/\b(send|write|draft|compose|create)\b.*\b(email|e-mail|mail)\b/i.test(lower)
    || /\bemail\b.*\b(to|about|regarding)\b/i.test(lower));

  // Document detection: "create a report", "generate a spreadsheet", "make a PDF"
  const wantsDoc = !wantsImage && !wantsEmail && !wantsJira && (
    /\b(create|generate|make|build|write|draft)\b.*\b(report|document|doc|invoice|spreadsheet|worksheet|pdf|docx|xlsx|word\s+doc|excel|proposal|summary|brief|memo|letter|contract|receipt|statement)\b/i.test(lower)
    || /\b(report|document|invoice|spreadsheet|pdf|proposal|summary)\b.*\b(about|for|on|regarding|of)\b/i.test(lower)
  );
  let docType: "docx" | "xlsx" | "pdf" = "docx";
  if (wantsDoc) {
    if (/\b(spreadsheet|xlsx|excel|worksheet|table|data)\b/i.test(lower)) docType = "xlsx";
    else if (/\b(pdf)\b/i.test(lower)) docType = "pdf";
  }

  // Extract email address from the message
  const emailMatch = content.match(/[\w.+-]+@[\w.-]+\.\w{2,}/);
  const emailTo = emailMatch ? emailMatch[0] : "";

  const wantsVideo = !wantsImage && !wantsEmail && !wantsDoc && !wantsJira && /\b(youtube|video|watch|find.*video|show.*video|play.*video|clip)\b/i.test(lower);

  // Broad search detection: any question or knowledge request
  const isQuestion = /\?\s*$/.test(content.trim());
  const hasQuestionWords = /\b(what|who|where|when|why|how|which|is\s+there|are\s+there|can\s+you|do\s+you|does|did|will|should|could|would|tell\s+me|explain|describe)\b/i.test(lower);
  const hasSearchIntent = /\b(search|look\s*up|find|google|browse|latest|current|news|recent|today|right\s+now|now|2024|2025|2026|update|price|weather|score|result|president|vice\s*president|governor|mayor|ceo|leader|capital|population)\b/i.test(lower);

  const wantsSearch = !wantsVideo && !wantsImage && !wantsEmail && !wantsDoc && !wantsJira && (isQuestion || hasQuestionWords || hasSearchIntent);

  // Extract clean search query
  let searchQuery = content
    .replace(/^(search\s+(the\s+)?(web|internet)\s+(for\s+)?)/i, "")
    .replace(/^(find\s+(me\s+)?(a\s+)?youtube\s+video\s+(about|on|for)\s+)/i, "")
    .replace(/^(find\s+(me\s+)?)/i, "")
    .replace(/^(look\s+up\s+)/i, "")
    .replace(/^(tell\s+me\s+(about\s+)?)/i, "")
    .replace(/^(show\s+me\s+(a\s+)?video\s+(about|on|for)\s+)/i, "")
    .replace(/^(what\s+is\s+(the\s+)?)/i, "")
    .replace(/^(who\s+is\s+(the\s+)?)/i, "")
    .trim();

  // Extract image prompt — strip the command words
  let imagePrompt = content
    .replace(/^(generate|create|make|draw|paint|design|render|imagine)\s+(me\s+)?(an?\s+)?/i, "")
    .replace(/^(an?\s+)?(image|picture|photo|art|illustration)\s+(of\s+)?/i, "")
    .trim();

  return { wantsSearch, wantsVideo, wantsImage, wantsEmail, wantsDoc, wantsJira, docType, searchQuery: searchQuery || content, imagePrompt: imagePrompt || content, emailTo };
}

export function useChat() {
  const {
    activeConversationId,
    createConversation,
    addMessage,
    appendToMessage,
    updateMessage,
    getActiveConversation,
  } = useChatStore();

  const [isStreaming, setIsStreaming] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (content: string) => {
      let convId = activeConversationId;
      if (!convId) {
        convId = createConversation();
      }

      // Add user message
      const userMsg: Message = {
        id: generateId(),
        role: "user",
        content,
        timestamp: Date.now(),
      };
      addMessage(convId, userMsg);

      // Create placeholder assistant message
      const assistantId = generateId();
      const assistantMsg: Message = {
        id: assistantId,
        role: "assistant",
        content: "",
        timestamp: Date.now(),
        isStreaming: true,
      };
      addMessage(convId, assistantMsg);
      setIsStreaming(true);

      // Get all messages for context
      const conversation = useChatStore.getState().conversations.find((c) => c.id === convId);
      const messages = conversation?.messages.slice(0, -1).map((m) => ({
        role: m.role,
        content: m.content,
      })) ?? [];

      // Detect if user wants search, video, image, email, or document
      const { wantsSearch, wantsVideo, wantsImage, wantsEmail, wantsDoc, wantsJira, docType, searchQuery, imagePrompt, emailTo } = detectIntent(content);

      // RAG: Run search/video BEFORE the LLM so we can inject results into context
      let searchResults: Source[] = [];
      let videoResults: VideoResult[] = [];
      let generatedImage: string | undefined;

      try {
        const fetches: Promise<void>[] = [];

        if (wantsSearch) {
          fetches.push(
            fetch("/api/search", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ query: searchQuery }),
            })
              .then(r => r.json())
              .then(data => { if (data?.results) searchResults = data.results; })
              .catch(() => {})
          );
        }
        if (wantsVideo) {
          fetches.push(
            fetch(`/api/youtube?q=${encodeURIComponent(searchQuery)}`)
              .then(r => r.json())
              .then(data => { if (data?.videos) videoResults = data.videos; })
              .catch(() => {})
          );
        }
        if (wantsImage) {
          fetches.push(
            fetch("/api/image", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ prompt: imagePrompt }),
            })
              .then(r => r.json())
              .then(data => { if (data?.image) generatedImage = data.image; })
              .catch(() => {})
          );
        }

        // Wait for results (image gen can take 30s+, search/video are fast)
        if (fetches.length > 0) {
          const timeout = wantsImage ? 65000 : 12000;
          await Promise.race([
            Promise.all(fetches),
            new Promise(resolve => setTimeout(resolve, timeout)),
          ]);
        }
      } catch {
        // search failures are non-fatal
      }

      // Immediately attach search/video results to the message for UI
      if (searchResults.length > 0) {
        updateMessage(convId!, assistantId, { sources: searchResults });
      }
      if (videoResults.length > 0) {
        updateMessage(convId!, assistantId, { videos: videoResults });
      }
      if (generatedImage) {
        updateMessage(convId!, assistantId, { generatedImage });
      }

      // For image-only requests, skip the LLM call — just show the image
      if (wantsImage && generatedImage) {
        updateMessage(convId!, assistantId, { content: "", isStreaming: false });
        setIsStreaming(false);
        return;
      }

      // For email requests, use a non-streaming call to generate structured email
      if (wantsEmail) {
        try {
          const selectedModel = useChatStore.getState().selectedModel;
          const emailSystemPrompt = `You are Nova, an AI email composer. The user wants to send an email. Generate the email content as a JSON object with these exact fields:
{
  "to": "recipient email address",
  "toName": "recipient name if mentioned, otherwise empty string",
  "subject": "a professional subject line",
  "bodyHtml": "the email body as clean HTML using <p>, <strong>, <em>, <ul>, <li>, <h2>, <h3>, <blockquote>, <a> tags"
}

Rules:
- Write professional, well-structured emails
- Use the recipient email from the user's message if provided: "${emailTo}"
- If no recipient email is given, use an empty string for "to"
- Make the email body rich and well-formatted with proper HTML
- Keep it concise but thorough
- Sign off as "Nova — Pixel & Purpose"
- Return ONLY the JSON object, no markdown fences, no extra text`;

          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [{ role: "user", content }],
              model: selectedModel || undefined,
              systemOverride: emailSystemPrompt,
              stream: false,
            }),
          });

          if (res.ok) {
            // Collect the streamed response
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let fullResponse = "";
            if (reader) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");
                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    const data = line.slice(6);
                    if (data === "[DONE]") break;
                    try {
                      const parsed = JSON.parse(data);
                      if (parsed.token) fullResponse += parsed.token;
                    } catch {}
                  }
                }
              }
            }

            // Parse JSON from the response — handle markdown fences
            let jsonStr = fullResponse.trim();
            const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (fenceMatch) jsonStr = fenceMatch[1].trim();
            // Also handle case where LLM outputs text before/after JSON
            const braceMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (braceMatch) jsonStr = braceMatch[0];

            const emailData = JSON.parse(jsonStr) as EmailDraft;
            const draft: EmailDraft = {
              to: emailData.to || emailTo || "",
              toName: emailData.toName || "",
              subject: emailData.subject || "Email from Nova",
              bodyHtml: emailData.bodyHtml || "",
            };

            updateMessage(convId!, assistantId, {
              content: "I've drafted your email. Review it below and hit **Send** when ready.",
              emailDraft: draft,
              isStreaming: false,
            });
          } else {
            updateMessage(convId!, assistantId, {
              content: "Sorry, I couldn't generate the email. Please try again.",
              isStreaming: false,
            });
          }
        } catch {
          updateMessage(convId!, assistantId, {
            content: "Sorry, I had trouble generating the email. Please try again.",
            isStreaming: false,
          });
        } finally {
          setIsStreaming(false);
        }
        return;
      }

      // For document requests, use LLM to generate structured doc data then create the file
      if (wantsDoc) {
        try {
          const selectedModel = useChatStore.getState().selectedModel;
          const docSystemPrompt = `YOU ARE A JSON GENERATOR. You MUST respond with ONLY a JSON object. NEVER respond with code, explanations, or anything other than JSON.

The user wants a ${docType.toUpperCase()} document. Generate the content as this EXACT JSON structure:

{"title":"Document Title","sections":[{"heading":"Section 1","content":"Content here. Use - for bullets."},{"heading":"Section 2","content":"More content."}],"tableData":[["Col1","Col2"],["Val1","Val2"]]}

RULES:
- Output ONLY valid JSON — no markdown, no code blocks, no explanation
- "title": descriptive document title based on user's request
- "sections": array of 3-6 sections with professional content
- "tableData": include if topic involves data/numbers, otherwise set to null
- NEVER output Python, JavaScript, or any programming code
- NEVER output markdown formatting
- Your ENTIRE response must be parseable by JSON.parse()`;

          const userPrompt = `Create a ${docType.toUpperCase()} document about: ${content}. Respond with ONLY the JSON object.`;

          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [{ role: "user", content: userPrompt }],
              model: selectedModel || undefined,
              systemOverride: docSystemPrompt,
            }),
          });

          if (res.ok) {
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let fullResponse = "";
            if (reader) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");
                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    const data = line.slice(6);
                    if (data === "[DONE]") break;
                    try {
                      const parsed = JSON.parse(data);
                      if (parsed.token) fullResponse += parsed.token;
                    } catch {}
                  }
                }
              }
            }

            // Parse JSON from LLM response
            let jsonStr = fullResponse.trim();
            const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (fenceMatch) jsonStr = fenceMatch[1].trim();
            const braceMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (braceMatch) jsonStr = braceMatch[0];

            let docData: { title?: string; sections?: { heading: string; content: string }[]; tableData?: (string | number)[][] | null };
            try {
              docData = JSON.parse(jsonStr);
            } catch {
              // LLM didn't return valid JSON — create a basic doc from the raw text
              const topicMatch = content.match(/(?:about|for|on|regarding)\s+(.+)/i);
              const topic = topicMatch ? topicMatch[1].trim() : content.replace(/^(create|generate|make|build|write|draft)\s+(a\s+|an\s+|the\s+)?(new\s+)?/i, "").trim();
              docData = {
                title: topic.charAt(0).toUpperCase() + topic.slice(1),
                sections: [{ heading: "Overview", content: fullResponse || topic }],
              };
            }

            // Generate the actual document file
            const genRes = await fetch("/api/docs/generate", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                type: docType,
                title: docData.title || "Document",
                sections: docData.sections || [],
                tableData: docData.tableData || undefined,
              }),
            });

            const genResult = await genRes.json();
            if (genResult.success) {
              updateMessage(convId!, assistantId, {
                content: `Here's your **${docType.toUpperCase()}** document. You can preview and download it below.`,
                generatedDoc: genResult.doc as GeneratedDoc,
                isStreaming: false,
              });
            } else {
              updateMessage(convId!, assistantId, {
                content: "Sorry, I couldn't generate the document. Please try again.",
                isStreaming: false,
              });
            }
          }
        } catch {
          updateMessage(convId!, assistantId, {
            content: "Sorry, I had trouble generating the document. Please try again.",
            isStreaming: false,
          });
        } finally {
          setIsStreaming(false);
        }
        return;
      }

      // For Jira requests, use LLM to extract structured data then call Jira API
      if (wantsJira) {
        try {
          const selectedModel = useChatStore.getState().selectedModel;
          const jiraSystemPrompt = `YOU ARE A JSON GENERATOR. You MUST respond with ONLY a JSON object. NEVER respond with explanations or anything other than JSON.

The user wants to perform a Jira action. Determine the mode and generate the appropriate JSON:

MODE "move" — move issues to a sprint:
{"mode":"move","issueKeys":["CEO-1","CEO-2"],"sprintId":244}

MODE "delete" — delete/remove issues:
{"mode":"delete","issueKeys":["CEO-1"]}

MODE "single" — create one issue:
{"mode":"single","projectKey":"CEO","issueType":"Story","summary":"Title","description":"Description"}

MODE "set" — create epic+story+subtask:
{"mode":"set","projectKey":"CEO","epic":{"summary":"Epic title"},"story":{"summary":"Story title","description":"Story description"},"subtask":{"summary":"Subtask title","description":"Subtask description"}}

RULES:
- Use mode "move" when user says move/put issues into/to a sprint. Default sprintId to 244 (Sprint 1).
- Use mode "delete" when user says delete/remove issues.
- Issue keys look like CEO-1, CEO-2 etc. Extract ALL mentioned keys.
- issueType must be one of: Epic, Story, Subtask, Task, Bug
- Default projectKey to "CEO"
- Output ONLY valid JSON — no markdown, no code blocks, no explanation`;

          const res = await fetch("/api/chat", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              messages: [{ role: "user", content }],
              model: selectedModel || undefined,
              systemOverride: jiraSystemPrompt,
            }),
          });

          if (res.ok) {
            const reader = res.body?.getReader();
            const decoder = new TextDecoder();
            let fullResponse = "";
            if (reader) {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;
                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split("\n");
                for (const line of lines) {
                  if (line.startsWith("data: ")) {
                    const data = line.slice(6);
                    if (data === "[DONE]") break;
                    try {
                      const parsed = JSON.parse(data);
                      if (parsed.token) fullResponse += parsed.token;
                    } catch {}
                  }
                }
              }
            }

            // Parse JSON
            let jsonStr = fullResponse.trim();
            const fenceMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
            if (fenceMatch) jsonStr = fenceMatch[1].trim();
            const braceMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (braceMatch) jsonStr = braceMatch[0];
            // Fix common LLM JSON issues: trailing commas, unescaped newlines
            jsonStr = jsonStr.replace(/,\s*([\]}])/g, "$1").replace(/[\r\n]+/g, " ");

            let jiraData;
            try {
              jiraData = JSON.parse(jsonStr);
            } catch {
              // LLM returned bad JSON — fall back to extracting from user message
              const issueKeyMatches = content.match(/CEO-\d+/gi) || [];
              const wantsMove = /\b(move|put)\b/i.test(content) && /\bsprint\b/i.test(content);
              const wantsDelete = /\b(delete|remove)\b/i.test(content) && issueKeyMatches.length > 0;

              if (wantsMove && issueKeyMatches.length > 0) {
                jiraData = { mode: "move", issueKeys: issueKeyMatches.map(k => k.toUpperCase()), sprintId: 244 };
              } else if (wantsDelete) {
                jiraData = { mode: "delete", issueKeys: issueKeyMatches.map(k => k.toUpperCase()) };
              } else {
                const topic = content
                  .replace(/\b(create|make|add|open|file|log|submit|a|an|the|in|for|on|to|jira|ticket|issue)\b/gi, "")
                  .replace(/\s+/g, " ")
                  .trim() || "New issue";
                jiraData = {
                  mode: "single",
                  projectKey: "CEO",
                  issueType: /\bepic\b/i.test(content) ? "Epic" : /\bsubtask\b/i.test(content) ? "Subtask" : /\bbug\b/i.test(content) ? "Bug" : /\btask\b/i.test(content) ? "Task" : "Story",
                  summary: topic.charAt(0).toUpperCase() + topic.slice(1),
                  description: content,
                };
              }
            }

            // Call Jira API based on mode
            let jiraRes;
            if (jiraData.mode === "move") {
              jiraRes = await fetch("/api/jira", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "moveToSprint",
                  issueKeys: jiraData.issueKeys,
                  sprintId: jiraData.sprintId || 244,
                }),
              });
            } else if (jiraData.mode === "delete") {
              jiraRes = await fetch("/api/jira", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "deleteIssues",
                  issueKeys: jiraData.issueKeys,
                }),
              });
            } else if (jiraData.mode === "set") {
              jiraRes = await fetch("/api/jira", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "createSet",
                  projectKey: jiraData.projectKey || "CEO",
                  sprintId: 244,
                  epic: jiraData.epic,
                  story: jiraData.story,
                  subtask: jiraData.subtask,
                }),
              });
            } else {
              jiraRes = await fetch("/api/jira", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  action: "createIssue",
                  projectKey: jiraData.projectKey || "CEO",
                  issueType: jiraData.issueType || "Story",
                  summary: jiraData.summary,
                  description: jiraData.description,
                  sprintId: 244,
                }),
              });
            }

            const jiraResult = await jiraRes.json();

            if (jiraResult.success !== false && !jiraResult.error) {
              // Handle move result
              if (jiraData.mode === "move") {
                const keys = (jiraResult.moved || []).map((k: string) => `**${k}**`).join(", ");
                updateMessage(convId!, assistantId, {
                  content: `Done! Moved ${keys} to Sprint 1.`,
                  isStreaming: false,
                });
              // Handle delete result
              } else if (jiraData.mode === "delete") {
                const deleted = (jiraResult.results || []).filter((r: { deleted: boolean }) => r.deleted).map((r: { key: string }) => `**${r.key}**`).join(", ");
                updateMessage(convId!, assistantId, {
                  content: `Done! Deleted ${deleted} from Jira.`,
                  isStreaming: false,
                });
              } else {
                const result: JiraResult = {};
                if (jiraResult.epic) result.epic = jiraResult.epic;
                if (jiraResult.story) result.story = jiraResult.story;
                if (jiraResult.subtask) result.subtask = jiraResult.subtask;
                if (jiraResult.issue) result.issue = jiraResult.issue;

                const parts: string[] = [];
                if (result.epic) parts.push(`Epic **${result.epic.key}**`);
                if (result.story) parts.push(`Story **${result.story.key}**`);
                if (result.subtask) parts.push(`Subtask **${result.subtask.key}**`);
                if (result.issue) parts.push(`${result.issue.type} **${result.issue.key}**`);

                updateMessage(convId!, assistantId, {
                  content: `Done! Created ${parts.join(" → ")} in Jira.`,
                  jiraResult: result,
                  isStreaming: false,
                });
              }
            } else {
              updateMessage(convId!, assistantId, {
                content: `Sorry, I couldn't complete the Jira action: ${jiraResult.error || "Unknown error"}`,
                isStreaming: false,
              });
            }
          }
        } catch (err) {
          updateMessage(convId!, assistantId, {
            content: `Sorry, I had trouble creating the Jira issue. ${err instanceof Error ? err.message : ""}`,
            isStreaming: false,
          });
        } finally {
          setIsStreaming(false);
        }
        return;
      }

      try {
        abortRef.current = new AbortController();

        // Get uploaded context
        const uploadedContext = useChatStore.getState().uploadedContext;
        const selectedModel = useChatStore.getState().selectedModel;

        const response = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            messages,
            context: uploadedContext.length > 0 ? uploadedContext : undefined,
            searchResults: searchResults.length > 0 ? searchResults : undefined,
            videoResults: videoResults.length > 0 ? videoResults : undefined,
            model: selectedModel || undefined,
          }),
          signal: abortRef.current.signal,
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();

        if (reader) {
          let buffer = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (line.startsWith("data: ")) {
                const data = line.slice(6);
                if (data === "[DONE]") break;
                try {
                  const parsed = JSON.parse(data);
                  if (parsed.token) {
                    appendToMessage(convId!, assistantId, parsed.token);
                  }
                  if (parsed.sources) {
                    updateMessage(convId!, assistantId, { sources: parsed.sources });
                  }
                  if (parsed.videos) {
                    updateMessage(convId!, assistantId, { videos: parsed.videos });
                  }
                } catch {
                  // skip non-JSON lines
                }
              }
            }
          }
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.name === "AbortError") {
          // User stopped generation
        } else {
          appendToMessage(
            convId!,
            assistantId,
            "\n\n*An error occurred. Please try again.*"
          );
        }
      } finally {
        updateMessage(convId!, assistantId, { isStreaming: false });
        setIsStreaming(false);
        abortRef.current = null;
      }
    },
    [activeConversationId, createConversation, addMessage, appendToMessage, updateMessage]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const regenerate = useCallback(async () => {
    const conversation = getActiveConversation();
    if (!conversation) return;
    const lastUserMsg = [...conversation.messages]
      .reverse()
      .find((m) => m.role === "user");
    if (lastUserMsg) {
      await sendMessage(lastUserMsg.content);
    }
  }, [getActiveConversation, sendMessage]);

  return { sendMessage, stopStreaming, regenerate, isStreaming };
}
