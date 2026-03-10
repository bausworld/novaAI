import { NextRequest, NextResponse } from "next/server";

const MAILERSEND_KEY = process.env.MAILERSEND_API_KEY || "";
const FROM_EMAIL = "nova@pixel-and-purpose.com";
const FROM_NAME = "Nova by Pixel & Purpose";
const REPLY_TO_EMAIL = "team@pixel-and-purpose.com";
const REPLY_TO_NAME = "Pixel & Purpose Team";

function buildBrandedHtml(subject: string, body: string): string {
  // Body comes as HTML (user composes rich content)
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
  <style>
    body { margin: 0; padding: 0; background: #f5f5f7; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .wrapper { max-width: 600px; margin: 0 auto; padding: 40px 20px; }
    .card { background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08); }
    .header { background: linear-gradient(135deg, #2a7d8c 0%, #1f5f6b 100%); padding: 32px 40px 28px; text-align: center; }
    .header-logo { display: inline-flex; align-items: center; justify-content: center; width: 44px; height: 44px; border-radius: 50%; background: rgba(255,255,255,0.2); margin-bottom: 12px; }
    .header-logo span { color: #fff; font-size: 18px; font-weight: 700; }
    .header h1 { color: #ffffff; font-size: 20px; font-weight: 600; margin: 0 0 4px; letter-spacing: -0.01em; }
    .header p { color: rgba(255,255,255,0.7); font-size: 12px; margin: 0; font-weight: 400; }
    .body { padding: 36px 40px; color: #1d1d1f; font-size: 15px; line-height: 1.7; }
    .body p { margin: 0 0 16px; }
    .body a { color: #2a7d8c; text-decoration: none; font-weight: 500; }
    .body a:hover { text-decoration: underline; }
    .body h2 { font-size: 18px; font-weight: 600; margin: 24px 0 8px; color: #1d1d1f; }
    .body h3 { font-size: 16px; font-weight: 600; margin: 20px 0 6px; color: #1d1d1f; }
    .body ul, .body ol { padding-left: 20px; margin: 0 0 16px; }
    .body li { margin-bottom: 6px; }
    .body blockquote { border-left: 3px solid #2a7d8c; padding: 12px 20px; margin: 16px 0; background: #f8fafb; border-radius: 0 8px 8px 0; color: #444; font-style: italic; }
    .body code { background: #f2f2f7; padding: 2px 6px; border-radius: 4px; font-size: 13px; font-family: 'SF Mono', Monaco, monospace; }
    .body pre { background: #1d1d1f; color: #e8e8ed; padding: 16px 20px; border-radius: 10px; overflow-x: auto; font-size: 13px; line-height: 1.5; }
    .body pre code { background: none; padding: 0; color: inherit; }
    .divider { height: 1px; background: #e8e8ed; margin: 0 40px; }
    .footer { padding: 24px 40px 32px; text-align: center; }
    .footer p { color: #86868b; font-size: 12px; margin: 0 0 4px; line-height: 1.5; }
    .footer a { color: #2a7d8c; text-decoration: none; }
    .footer .brand { font-weight: 600; color: #1d1d1f; font-size: 13px; margin-bottom: 8px; }
    @media (max-width: 480px) {
      .wrapper { padding: 20px 12px; }
      .header { padding: 24px 24px 20px; }
      .body { padding: 24px 24px; }
      .footer { padding: 20px 24px 24px; }
      .divider { margin: 0 24px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="card">
      <div class="header">
        <div class="header-logo"><span>N</span></div>
        <h1>Nova</h1>
        <p>by Pixel &amp; Purpose</p>
      </div>
      <div class="body">
        ${body}
      </div>
      <div class="divider"></div>
      <div class="footer">
        <p class="brand">Pixel &amp; Purpose</p>
        <p>Sent with Nova &mdash; your AI-powered assistant</p>
        <p><a href="mailto:team@pixel-and-purpose.com">team@pixel-and-purpose.com</a></p>
      </div>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<\/div>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/h[1-6]>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// POST /api/email — send an email
export async function POST(req: NextRequest) {
  if (!MAILERSEND_KEY) {
    return NextResponse.json({ error: "MailerSend API key not configured" }, { status: 500 });
  }

  const { to, toName, subject, bodyHtml } = await req.json();

  if (!to || !subject || !bodyHtml) {
    return NextResponse.json({ error: "Missing required fields: to, subject, bodyHtml" }, { status: 400 });
  }

  // Basic email validation
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
  }

  const fullHtml = buildBrandedHtml(subject, bodyHtml);
  const plainText = stripHtmlToText(bodyHtml);

  try {
    const res = await fetch("https://api.mailersend.com/v1/email", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MAILERSEND_KEY}`,
      },
      body: JSON.stringify({
        from: { email: FROM_EMAIL, name: FROM_NAME },
        to: [{ email: to, name: toName || to }],
        reply_to: { email: REPLY_TO_EMAIL, name: REPLY_TO_NAME },
        subject,
        html: fullHtml,
        text: plainText,
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok || res.status === 202) {
      return NextResponse.json({ success: true });
    }

    const errBody = await res.text();
    return NextResponse.json(
      { error: `MailerSend error: ${res.status}`, details: errBody },
      { status: 502 }
    );
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// GET /api/email/preview — return branded HTML for preview
// (Uses query params so we can open in iframe)
