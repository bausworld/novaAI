import { NextRequest, NextResponse } from "next/server";
import { readFile, stat } from "fs/promises";
import path from "path";

const DOCS_DIR = path.join(process.cwd(), "generated-docs");

const MIME: Record<string, string> = {
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".xlsx": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ".pdf": "application/pdf",
};

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  try {
    const { filename } = await params;

    // Sanitize — only allow uuid.ext format
    if (!/^[a-f0-9-]+\.(docx|xlsx|pdf)$/.test(filename)) {
      return NextResponse.json({ error: "Invalid filename" }, { status: 400 });
    }

    const filePath = path.join(DOCS_DIR, filename);

    // Ensure file is within DOCS_DIR (prevent path traversal)
    const resolvedPath = path.resolve(filePath);
    if (!resolvedPath.startsWith(path.resolve(DOCS_DIR))) {
      return NextResponse.json({ error: "Invalid path" }, { status: 400 });
    }

    await stat(filePath);
    const buffer = await readFile(filePath);
    const ext = path.extname(filename);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": MIME[ext] || "application/octet-stream",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": buffer.length.toString(),
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
