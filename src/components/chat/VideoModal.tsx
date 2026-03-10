"use client";

import { useChatStore } from "@/stores/chat-store";
import { Modal } from "@/components/ui/Modal";

export function VideoModal() {
  const { videoModal, closeVideoModal } = useChatStore();

  if (!videoModal.open) return null;

  const getEmbedUrl = () => {
    if (videoModal.videoId) {
      return `https://www.youtube-nocookie.com/embed/${videoModal.videoId}?autoplay=1&rel=0`;
    }
    if (videoModal.url) {
      // Check for Vimeo
      const vimeoMatch = videoModal.url.match(/vimeo\.com\/(\d+)/);
      if (vimeoMatch) {
        return `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
      }
      // Check for YouTube URL
      const ytMatch = videoModal.url.match(
        /(?:youtube\.com\/watch\?v=|youtu\.be\/)([a-zA-Z0-9_-]+)/
      );
      if (ytMatch) {
        return `https://www.youtube-nocookie.com/embed/${ytMatch[1]}?autoplay=1&rel=0`;
      }
      // Direct video URL
      return videoModal.url;
    }
    return null;
  };

  const embedUrl = getEmbedUrl();
  const isDirectVideo = videoModal.url && !videoModal.url.includes("youtube") && !videoModal.url.includes("vimeo") && !videoModal.videoId;

  return (
    <Modal open={videoModal.open} onClose={closeVideoModal} className="" >
      <div style={{ width: "90vw", maxWidth: 1024 }}>
        {/* Close button */}
        <button
          onClick={closeVideoModal}
          aria-label="Close video"
          style={{
            position: "absolute",
            top: 12,
            right: 12,
            zIndex: 10,
            width: 32,
            height: 32,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: "50%",
            background: "rgba(0,0,0,0.5)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
          }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>

        {/* Video Player */}
        <div style={{ position: "relative", width: "100%", paddingTop: "56.25%" }}>
          {isDirectVideo ? (
            <video
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", borderRadius: "16px 16px 0 0" }}
              src={videoModal.url}
              controls
              autoPlay
            />
          ) : embedUrl ? (
            <iframe
              style={{ position: "absolute", inset: 0, width: "100%", height: "100%", borderRadius: "16px 16px 0 0" }}
              src={embedUrl}
              title="Video Player"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          ) : null}
        </div>
      </div>
    </Modal>
  );
}
