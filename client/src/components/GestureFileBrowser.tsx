import { useEffect, useRef, useState, useCallback } from "react";
import { useTheme } from "../utils/useTheme";
import type { Gesture } from "../vision/gestureDetector";
import {
  IconCheckCircle,
  IconFistGrab,
  IconTwoPalms,
} from "./icons/GesturaIcons";

export interface BrowserFileItem {
  id: string;
  name: string;
  type: string;
  size: number;
  category: "pdf" | "video" | "image" | "archive" | "data" | "custom";
  description: string;
  isCustom?: boolean;
  fileObj?: File;
}

const PRELOADED_FILES: BrowserFileItem[] = [
  {
    id: "demo-pdf",
    name: "Project_Presentation.pdf",
    type: "application/pdf",
    size: 4.2 * 1024 * 1024,
    category: "pdf",
    description: "Slide deck covering system architecture & vision pipeline.",
  },
  {
    id: "demo-video",
    name: "GESTURA_Demo_Clip.mp4",
    type: "video/mp4",
    size: 18.5 * 1024 * 1024,
    category: "video",
    description: "Full HD recorded demo of P2P hand gesture sharing.",
  },
  {
    id: "demo-image",
    name: "System_Architecture.png",
    type: "image/png",
    size: 2.1 * 1024 * 1024,
    category: "image",
    description: "High-resolution diagram of WebRTC signaling & MediaPipe.",
  },
  {
    id: "demo-zip",
    name: "Source_Code_Archive.zip",
    type: "application/zip",
    size: 5.8 * 1024 * 1024,
    category: "archive",
    description: "Complete production source code & configuration assets.",
  },
  {
    id: "demo-data",
    name: "Benchmark_Metrics.csv",
    type: "text/csv",
    size: 940 * 1024,
    category: "data",
    description: "Real-time latency, throughput & FPS evaluation logs.",
  },
];

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirmFiles: (files: File[]) => void;
  onOpenNativePicker: () => void;
  handPosition?: { x: number; y: number } | null;
  activeGesture?: Gesture;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

// Generate an authentic synthetic File instance for demo items
function createSynthesizedFile(item: BrowserFileItem): File {
  if (item.fileObj) return item.fileObj;
  const header = `=== GESTURA DEMO ASSET: ${item.name} ===\nType: ${item.type}\nSize: ${item.size} bytes\nTimestamp: ${new Date().toISOString()}\n\n`;
  const paddingNeeded = Math.min(item.size, 1024 * 64);
  const blobData = new Blob([header + "X".repeat(Math.max(0, paddingNeeded - header.length))], { type: item.type });
  return new File([blobData], item.name, { type: item.type, lastModified: Date.now() });
}

export default function GestureFileBrowser({
  isOpen,
  onClose,
  onConfirmFiles,
  onOpenNativePicker,
  handPosition,
  activeGesture,
}: Props) {
  const { isDark } = useTheme();
  const carouselRef = useRef<HTMLDivElement>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set(["demo-pdf"]));
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [lastGestureHandled, setLastGestureHandled] = useState<string>("");

  // Smooth continuous gesture scrolling based on Hand X position (0.0 = Left, 1.0 = Right)
  useEffect(() => {
    if (!isOpen || !handPosition || !carouselRef.current) return;

    const scrollContainer = carouselRef.current;
    const x = handPosition.x;

    if (x < 0.38) {
      const speed = Math.max(4, Math.round((0.38 - x) * 35));
      scrollContainer.scrollLeft -= speed;
    } else if (x > 0.62) {
      const speed = Math.max(4, Math.round((x - 0.62) * 35));
      scrollContainer.scrollLeft += speed;
    }
  }, [isOpen, handPosition]);

  // Handle Grab gesture (Closed Fist) to toggle/select the focused item
  useEffect(() => {
    if (!isOpen) return;

    if (activeGesture === "fist" && lastGestureHandled !== "fist") {
      setLastGestureHandled("fist");
      const targetItem = PRELOADED_FILES[focusedIndex];
      if (targetItem) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(targetItem.id)) next.delete(targetItem.id);
          else next.add(targetItem.id);
          return next;
        });
      }
    } else if (activeGesture !== "fist" && lastGestureHandled === "fist") {
      setLastGestureHandled("");
    }
  }, [isOpen, activeGesture, focusedIndex, lastGestureHandled]);

  const toggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const handleConfirm = useCallback(() => {
    const chosenItems = PRELOADED_FILES.filter((f) => selectedIds.has(f.id));
    if (chosenItems.length === 0) return;
    const files = chosenItems.map(createSynthesizedFile);
    onConfirmFiles(files);
    onClose();
  }, [selectedIds, onConfirmFiles, onClose]);

  if (!isOpen) return null;

  const handZone = !handPosition
    ? "none"
    : handPosition.x < 0.38
    ? "left"
    : handPosition.x > 0.62
    ? "right"
    : "center";

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10000,
        background: isDark ? "rgba(10, 15, 29, 0.88)" : "rgba(15, 23, 42, 0.7)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "16px",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 820,
          background: isDark
            ? "linear-gradient(145deg, rgba(30, 41, 59, 0.96), rgba(15, 23, 42, 0.98))"
            : "linear-gradient(145deg, #ffffff, #f8fafc)",
          borderRadius: 28,
          border: isDark ? "1px solid rgba(255, 255, 255, 0.12)" : "1px solid rgba(99, 102, 241, 0.2)",
          boxShadow: isDark
            ? "0 24px 60px rgba(0, 0, 0, 0.6), 0 0 30px rgba(99, 102, 241, 0.25)"
            : "0 24px 60px rgba(99, 102, 241, 0.22)",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
        }}
      >
        {/* Top Header */}
        <div
          style={{
            padding: "20px 24px 14px",
            borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 12,
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                boxShadow: "0 6px 16px rgba(99, 102, 241, 0.35)",
              }}
            >
              <IconTwoPalms size={20} color="#fff" />
            </div>
            <div>
              <h2 style={{ fontSize: 18, fontWeight: 800, margin: 0, color: isDark ? "#f8fafc" : "#1e293b", letterSpacing: -0.3 }}>
                Gesture File Browser
              </h2>
              <div style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b", marginTop: 2 }}>
                Wave hand left/right to scroll • Closed Fist (Grab) to select
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            style={{
              background: isDark ? "rgba(255, 255, 255, 0.08)" : "#f1f5f9",
              border: "none",
              borderRadius: "50%",
              width: 32,
              height: 32,
              color: isDark ? "#cbd5e1" : "#64748b",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 16,
              fontWeight: 700,
            }}
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Real-time Hand Optical Navigation Tracker Bar */}
        <div
          style={{
            padding: "8px 24px",
            background: isDark ? "rgba(15, 23, 42, 0.6)" : "rgba(241, 245, 249, 0.7)",
            borderBottom: isDark ? "1px solid rgba(255, 255, 255, 0.06)" : "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 11,
            fontWeight: 700,
            color: isDark ? "#94a3b8" : "#64748b",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 6, color: handZone === "left" ? "#818cf8" : undefined }}>
            <span>◀</span>
            <span>Scroll Left ({`<`} 40%)</span>
          </div>

          <div
            style={{
              flex: 1,
              maxWidth: 240,
              height: 6,
              background: isDark ? "#334155" : "#cbd5e1",
              borderRadius: 3,
              margin: "0 16px",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {handPosition && (
              <div
                style={{
                  position: "absolute",
                  left: `${Math.min(100, Math.max(0, handPosition.x * 100))}%`,
                  top: 0,
                  bottom: 0,
                  width: 14,
                  transform: "translateX(-50%)",
                  background: "#6366f1",
                  borderRadius: 3,
                  boxShadow: "0 0 10px #6366f1",
                  transition: "left 0.05s ease-out",
                }}
              />
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6, color: handZone === "right" ? "#818cf8" : undefined }}>
            <span>Scroll Right ({`>`} 60%)</span>
            <span>▶</span>
          </div>
        </div>

        {/* Carousel Row */}
        <div
          ref={carouselRef}
          style={{
            display: "flex",
            gap: 16,
            padding: "24px",
            overflowX: "auto",
            scrollBehavior: "smooth",
            WebkitOverflowScrolling: "touch",
            scrollbarWidth: "none",
          }}
        >
          {/* Custom Upload Tile */}
          <div
            onClick={onOpenNativePicker}
            style={{
              flex: "0 0 180px",
              borderRadius: 20,
              border: isDark ? "2px dashed rgba(99, 102, 241, 0.4)" : "2px dashed #818cf8",
              background: isDark ? "rgba(99, 102, 241, 0.06)" : "#f5f3ff",
              padding: "20px 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              textAlign: "center",
              cursor: "pointer",
              transition: "transform 0.2s, border-color 0.2s",
            }}
          >
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: 14,
                background: "rgba(99, 102, 241, 0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: 12,
                color: "#6366f1",
                fontSize: 22,
                fontWeight: 800,
              }}
            >
              +
            </div>
            <div style={{ fontWeight: 800, fontSize: 13, color: isDark ? "#f8fafc" : "#1e293b" }}>
              Upload From Device
            </div>
            <div style={{ fontSize: 11, color: isDark ? "#94a3b8" : "#64748b", marginTop: 4 }}>
              Open OS File Explorer
            </div>
          </div>

          {/* Preloaded Demo File Items */}
          {PRELOADED_FILES.map((item, idx) => {
            const isSelected = selectedIds.has(item.id);
            const isFocused = idx === focusedIndex;

            return (
              <div
                key={item.id}
                onClick={() => {
                  setFocusedIndex(idx);
                  toggleSelect(item.id);
                }}
                style={{
                  flex: "0 0 200px",
                  borderRadius: 20,
                  border: isSelected
                    ? "2px solid #10b981"
                    : isFocused
                    ? "2px solid #6366f1"
                    : isDark
                    ? "1px solid rgba(255, 255, 255, 0.08)"
                    : "1px solid #e2e8f0",
                  background: isSelected
                    ? isDark
                      ? "rgba(16, 185, 129, 0.12)"
                      : "#ecfdf5"
                    : isDark
                    ? "rgba(30, 41, 59, 0.7)"
                    : "#ffffff",
                  padding: "18px 16px",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  cursor: "pointer",
                  position: "relative",
                  boxShadow: isSelected
                    ? "0 8px 24px rgba(16, 185, 129, 0.2)"
                    : isFocused
                    ? "0 8px 24px rgba(99, 102, 241, 0.2)"
                    : "0 4px 14px rgba(0, 0, 0, 0.05)",
                  transform: isFocused ? "scale(1.02)" : "scale(1)",
                  transition: "all 0.18s ease",
                }}
              >
                {/* Selection Badge */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                  <span
                    style={{
                      fontSize: 10,
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: 0.8,
                      padding: "3px 8px",
                      borderRadius: 6,
                      background: item.category === "video" ? "#ef4444" : item.category === "pdf" ? "#6366f1" : "#06b6d4",
                      color: "#ffffff",
                    }}
                  >
                    {item.category}
                  </span>

                  <div
                    style={{
                      width: 22,
                      height: 22,
                      borderRadius: "50%",
                      border: isSelected ? "none" : "2px solid #94a3b8",
                      background: isSelected ? "#10b981" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    {isSelected && <IconCheckCircle size={15} color="#fff" />}
                  </div>
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 800,
                      fontSize: 13,
                      color: isDark ? "#f8fafc" : "#1e293b",
                      lineHeight: 1.3,
                      wordBreak: "break-word",
                    }}
                  >
                    {item.name}
                  </div>
                  <div style={{ fontSize: 11, color: isDark ? "#94a3b8" : "#64748b", marginTop: 4 }}>
                    {formatBytes(item.size)}
                  </div>
                  <p
                    style={{
                      fontSize: 11,
                      color: isDark ? "#cbd5e1" : "#475569",
                      marginTop: 8,
                      lineHeight: 1.4,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                    }}
                  >
                    {item.description}
                  </p>
                </div>

                {isFocused && (
                  <div
                    style={{
                      marginTop: 8,
                      padding: "4px 8px",
                      borderRadius: 8,
                      background: isDark ? "rgba(99, 102, 241, 0.2)" : "#eef2ff",
                      fontSize: 10,
                      fontWeight: 700,
                      color: "#6366f1",
                      textAlign: "center",
                    }}
                  >
                    Fist (Grab) to Toggle
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Footer with Selection Count & Confirm Button */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: isDark ? "rgba(15, 23, 42, 0.5)" : "#f8fafc",
          }}
        >
          <div style={{ fontSize: 13, fontWeight: 700, color: isDark ? "#cbd5e1" : "#475569" }}>
            <span>{selectedIds.size} file(s) selected</span>
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: "10px 18px",
                borderRadius: 14,
                background: isDark ? "rgba(255, 255, 255, 0.08)" : "#e2e8f0",
                color: isDark ? "#cbd5e1" : "#475569",
                border: "none",
                fontWeight: 700,
                fontSize: 13,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={handleConfirm}
              disabled={selectedIds.size === 0}
              style={{
                padding: "10px 22px",
                borderRadius: 14,
                background:
                  selectedIds.size > 0
                    ? "linear-gradient(135deg, #10b981, #059669)"
                    : isDark
                    ? "#334155"
                    : "#cbd5e1",
                color: "#ffffff",
                border: "none",
                fontWeight: 800,
                fontSize: 13,
                cursor: selectedIds.size > 0 ? "pointer" : "not-allowed",
                boxShadow: selectedIds.size > 0 ? "0 4px 16px rgba(16, 185, 129, 0.4)" : "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 8,
              }}
            >
              <IconFistGrab size={14} color="#fff" />
              <span>Confirm & Stage Files</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
