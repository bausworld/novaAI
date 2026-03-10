import { NextRequest, NextResponse } from "next/server";
import mammoth from "mammoth";
import ExcelJS from "exceljs";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const name = file.name.toLowerCase();
    const buffer = Buffer.from(await file.arrayBuffer());

    if (name.endsWith(".docx")) {
      const result = await mammoth.convertToHtml({ buffer });
      return NextResponse.json({
        html: wrapHtml(result.value, file.name),
        type: "docx",
        name: file.name,
      });
    }

    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
      let html = "";
      workbook.eachSheet((sheet) => {
        html += `<h3 style="font-size:14px;margin:16px 0 8px;color:#1d1d1f">${escapeHtml(sheet.name)}</h3>`;
        html += `<table style="width:100%;border-collapse:collapse;font-size:12px">`;
        sheet.eachRow((row, rowNum) => {
          html += "<tr>";
          row.eachCell((cell) => {
            const val = cell.text || "";
            if (rowNum === 1) {
              html += `<th style="background:#2A7D8C;color:#fff;padding:6px 10px;text-align:left;font-weight:600">${escapeHtml(val)}</th>`;
            } else {
              html += `<td style="padding:5px 10px;border-bottom:1px solid #eee;${rowNum % 2 === 0 ? "background:#f9f9fb" : ""}">${escapeHtml(val)}</td>`;
            }
          });
          html += "</tr>";
        });
        html += "</table>";
      });
      return NextResponse.json({
        html: wrapHtml(html, file.name),
        type: "xlsx",
        name: file.name,
      });
    }

    if (name.endsWith(".pdf")) {
      // PDFs: return as base64 data URI for iframe rendering
      const base64 = buffer.toString("base64");
      return NextResponse.json({
        dataUri: `data:application/pdf;base64,${base64}`,
        type: "pdf",
        name: file.name,
      });
    }

    // Plain text / CSV / Markdown
    if (name.endsWith(".txt") || name.endsWith(".csv") || name.endsWith(".md")) {
      const text = buffer.toString("utf-8");
      let html: string;
      if (name.endsWith(".csv")) {
        html = csvToHtmlTable(text);
      } else {
        html = `<pre style="font-size:13px;line-height:1.6;white-space:pre-wrap;word-break:break-word">${escapeHtml(text)}</pre>`;
      }
      return NextResponse.json({
        html: wrapHtml(html, file.name),
        type: name.split(".").pop(),
        name: file.name,
      });
    }

    return NextResponse.json({ error: "Unsupported file type. Supports: .docx, .xlsx, .pdf, .txt, .csv, .md" }, { status: 400 });
  } catch (err) {
    console.error("Doc view error:", err);
    return NextResponse.json({ error: "Failed to process document" }, { status: 500 });
  }
}

function wrapHtml(body: string, title: string): string {
  return `<div style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px;color:#1d1d1f;max-width:700px">
<h2 style="font-size:18px;margin:0 0 16px">${escapeHtml(title)}</h2>
${body}
</div>`;
}

function csvToHtmlTable(csv: string): string {
  const rows = csv.split("\n").filter((r) => r.trim());
  if (rows.length === 0) return "<p>Empty file</p>";
  let html = `<table style="width:100%;border-collapse:collapse;font-size:12px">`;
  rows.forEach((row, i) => {
    const cells = row.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    html += "<tr>";
    for (const cell of cells) {
      if (i === 0) {
        html += `<th style="background:#2A7D8C;color:#fff;padding:6px 10px;text-align:left">${escapeHtml(cell)}</th>`;
      } else {
        html += `<td style="padding:5px 10px;border-bottom:1px solid #eee">${escapeHtml(cell)}</td>`;
      }
    }
    html += "</tr>";
  });
  html += "</table>";
  return html;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}
