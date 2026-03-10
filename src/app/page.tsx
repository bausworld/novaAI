"use client";

import { TopBar } from "@/components/layout/TopBar";
import { Sidebar } from "@/components/layout/Sidebar";
import { ChatView } from "@/components/chat/ChatView";
import { VideoModal } from "@/components/chat/VideoModal";

export default function Home() {
  return (
    <div className="flex flex-col h-dvh overflow-hidden">
      <TopBar />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        <main className="flex-1 flex flex-col overflow-hidden">
          <ChatView />
        </main>
      </div>
      <VideoModal />
    </div>
  );
}
