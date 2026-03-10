import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile, mkdir } from "fs/promises";
import { join } from "path";

const DATA_DIR = join(process.cwd(), ".data");
const FILE = join(DATA_DIR, "conversations.json");

async function ensureDir() {
  try { await mkdir(DATA_DIR, { recursive: true }); } catch {}
}

async function readData() {
  try {
    const raw = await readFile(FILE, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { conversations: [], activeConversationId: null };
  }
}

async function writeData(data: unknown) {
  await ensureDir();
  await writeFile(FILE, JSON.stringify(data), "utf-8");
}

// GET — load all conversations
export async function GET() {
  const data = await readData();
  return NextResponse.json(data);
}

// PUT — save all conversations (full sync)
export async function PUT(req: NextRequest) {
  const data = await req.json();
  await writeData(data);
  return NextResponse.json({ ok: true });
}
