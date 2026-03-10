"use client";

import { ReactNode, useEffect, useCallback } from "react";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  maxWidth?: number;
}

export function Modal({ open, onClose, children, className = "", maxWidth = 480 }: ModalProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (open) {
      document.addEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "hidden";
    }
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      document.body.style.overflow = "";
    };
  }, [open, handleKeyDown]);

  if (!open) return null;

  return (
    <div style={{
      position: "fixed",
      inset: 0,
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
    }}>
      {/* Backdrop */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(0,0,0,0.6)",
          transition: "opacity 0.2s",
        }}
        onClick={onClose}
      />
      {/* Content */}
      <div
        className={`animate-scale-in ${className}`}
        style={{
          position: "relative",
          background: "var(--surface-primary)",
          borderRadius: 16,
          boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)",
          maxHeight: "90vh",
          width: "95vw",
          maxWidth,
          overflow: "auto",
        }}
      >
        {children}
      </div>
    </div>
  );
}
