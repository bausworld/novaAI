import { NextRequest } from "next/server";

const OLLAMA_URL = process.env.OLLAMA_URL || "http://127.0.0.1:11434";
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || "mistral:7b-instruct-v0.2-q8_0";

async function isOllamaAvailable(): Promise<boolean> {
  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: AbortSignal.timeout(2000) });
    return res.ok;
  } catch {
    return false;
  }
}

const SYSTEM_PROMPT = `You are Nova, a helpful AI assistant. Be direct and concise. Get to the answer immediately.

TODAY'S DATE: ${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.

Key rules:
- Lead with the answer. No preamble, no "Sure!", no "Great question!".
- Keep answers SHORT. 1-3 sentences for simple questions. Only elaborate when the topic demands it.
- Use markdown for structure: **bold**, tables, lists, code blocks as needed.
- For factual questions, state the fact first, then add brief context if useful.

CRITICAL ANSWER STYLE:
- NEVER list websites or say "according to X website". Synthesize information into a direct answer.
- NEVER include citations, source numbers, or references like [1], [2], (source), etc. Just state facts plainly.

CODE & FILE GENERATION:
- When asked to write code or create files, ALWAYS use fenced code blocks with the language tag (e.g. \`\`\`python, \`\`\`javascript, \`\`\`html).
- The user can copy or download your code blocks directly as files.
- Write complete, working code — never use placeholders like "// your code here" or "...".

When the user asks for videos: say NOTHING. The videos are displayed automatically as visual cards — do NOT write any text about them. Your response should be completely empty or at most a single short sentence. Never list video titles, never describe videos, never give advice about watching them.

When the user asks to generate/create an image: respond with a SHORT one-sentence remark like "Here's your image" or a brief creative comment. The image is displayed automatically — don't describe what it looks like in detail.`;

export async function POST(req: NextRequest) {
  const { messages, context, searchResults, videoResults, model, systemOverride } = await req.json();

  const selectedModel = model || OLLAMA_MODEL;

  // Build system message with optional uploaded context
  let systemContent = systemOverride || SYSTEM_PROMPT;

  // Inject web search results so the LLM can use current information
  if (searchResults && searchResults.length > 0) {
    const searchContext = searchResults.map(
      (r: { title: string; domain: string; snippet?: string; url: string }, i: number) =>
        `FACT ${i + 1}: ${r.title}\n${r.snippet || ""}`
    ).join("\n\n");
    systemContent += `\n\n=== REAL-TIME WEB SEARCH RESULTS (${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}) ===
YOUR TRAINING DATA IS OUTDATED. The following facts are from a LIVE web search performed RIGHT NOW. These facts are CORRECT and CURRENT. You MUST use ONLY these facts to answer. Do NOT use your training data if it conflicts.

${searchContext}

INSTRUCTIONS: Base your answer ENTIRELY on the facts above. If the facts say someone is VP, that is correct — your training data is wrong. Never cite sources or URLs.`;
  }

  // Video results are rendered visually as cards — don't inject into LLM context
  // so it won't try to describe or list them

  // Inject uploaded file context
  if (context && context.length > 0) {
    const contextBlocks = context.map(
      (c: { name: string; content: string }) => `--- File: ${c.name} ---\n${c.content}`
    ).join("\n\n");
    systemContent += `\n\nThe user has provided the following context documents. Use them to answer their questions:\n\n${contextBlocks}`;
  }

  if (!await isOllamaAvailable()) {
    return new Response(
      JSON.stringify({ error: "Ollama is not reachable. Please ensure your Ollama server is running." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }

  return streamOllama(systemContent, messages, selectedModel);
}

async function streamOllama(systemContent: string, messages: { role: string; content: string }[], model: string) {
  const ollamaMessages = [
    { role: "system", content: systemContent },
    ...messages,
  ];

  try {
    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: model,
        messages: ollamaMessages,
        stream: true,
      }),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errText = await response.text();
      return new Response(
        JSON.stringify({ error: `Ollama error: ${errText}` }),
        { status: 502, headers: { "Content-Type": "application/json" } }
      );
    }

    // Transform Ollama NDJSON stream into our SSE format
    const encoder = new TextEncoder();
    const decoder = new TextDecoder();

    const stream = new ReadableStream({
      async start(controller) {
        const reader = response.body?.getReader();
        if (!reader) { controller.close(); return; }

        let buffer = "";
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (!line.trim()) continue;
              try {
                const parsed = JSON.parse(line);
                if (parsed.message?.content) {
                  controller.enqueue(
                    encoder.encode(`data: ${JSON.stringify({ token: parsed.message.content })}\n\n`)
                  );
                }
                if (parsed.done) {
                  controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                }
              } catch {
                // skip malformed lines
              }
            }
          }
          // Process remaining buffer
          if (buffer.trim()) {
            try {
              const parsed = JSON.parse(buffer);
              if (parsed.message?.content) {
                controller.enqueue(
                  encoder.encode(`data: ${JSON.stringify({ token: parsed.message.content })}\n\n`)
                );
              }
            } catch { /* ignore */ }
          }
          controller.enqueue(encoder.encode("data: [DONE]\n\n"));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: `Cannot connect to Ollama at ${OLLAMA_URL}. Is it running?` }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}
