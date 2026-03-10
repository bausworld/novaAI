"use client";

import { VideoResult } from "@/lib/types";
import { useChatStore } from "@/stores/chat-store";

interface VideoCardProps {
  video: VideoResult;
}

export function VideoCard({ video }: VideoCardProps) {
  const openVideoModal = useChatStore((s) => s.openVideoModal);

  return (
    <div
      className="nova-video-card"
      onClick={() => openVideoModal({ videoId: video.videoId })}
    >
      {/* Thumbnail */}
      <div style={{
        position: "relative",
        width: "100%",
        aspectRatio: "16/9",
        borderRadius: 10,
        overflow: "hidden",
        background: "var(--surface-tertiary)",
      }}>
        {video.thumbnail && (
          <img
            src={video.thumbnail}
            alt={video.title}
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
            loading="lazy"
          />
        )}
        {video.duration && (
          <span style={{
            position: "absolute",
            bottom: 6,
            right: 6,
            padding: "2px 6px",
            background: "rgba(0,0,0,0.85)",
            color: "#fff",
            fontSize: 11,
            borderRadius: 4,
            fontWeight: 500,
          }}>
            {video.duration}
          </span>
        )}
        {/* Play button overlay */}
        <div className="nova-video-play-overlay">
          <svg width="36" height="36" viewBox="0 0 24 24" fill="white" style={{ filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.3))" }}>
            <polygon points="5 3 19 12 5 21 5 3" />
          </svg>
        </div>
      </div>

      {/* Info */}
      <div style={{ padding: "8px 2px 0" }}>
        <div style={{
          fontSize: 13,
          fontWeight: 500,
          color: "var(--text-primary)",
          lineHeight: 1.35,
          display: "-webkit-box",
          WebkitLineClamp: 2,
          WebkitBoxOrient: "vertical",
          overflow: "hidden",
        }}>
          {video.title}
        </div>
        {(video.channelTitle || video.viewCount) && (
          <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 3 }}>
            {video.channelTitle}
            {video.viewCount && ` · ${video.viewCount}`}
          </div>
        )}
      </div>
    </div>
  );
}
