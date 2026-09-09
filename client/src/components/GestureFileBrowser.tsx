import React, { useState, useEffect, useRef, useCallback } from "react";
import type { HandTrackingData } from "./CameraView";
import { useTheme } from "../utils/useTheme";

export interface GestureFileBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmFiles: (files: File[]) => void;
  onOpenNativePicker: () => void;
  handPosition: HandTrackingData | null;
  currentGesture?: string;
}

interface BrowserFileItem {
  id: string;
  name: string;
  dateModified: string;
  type: string;
  sizeBytes: number;
  sizeLabel: string;
  extension: "pdf" | "docx" | "png" | "jpg" | "mp4" | "zip" | "other";
  actualFile?: File;
}

interface SectionFolder {
  id: string;
  name: string;
  icon: string;
  path: string;
}

const SECTIONS: SectionFolder[] = [
  { id: "downloads", name: "Downloads", icon: "📥", path: "Downloads" },
  { id: "documents", name: "Documents", icon: "📄", path: "Documents" },
  { id: "pictures", name: "Pictures", icon: "🖼️", path: "Pictures" },
  { id: "videos", name: "Videos", icon: "🎥", path: "Videos" },
  { id: "desktop", name: "Desktop", icon: "🖥️", path: "Desktop" },
];

// Presets matching the user's actual presentation and file picker screenshot!
const FOLDER_PRESETS: Record<string, BrowserFileItem[]> = {
  downloads: [
    {
      id: "dl-1",
      name: "University_Lost_and_Found_Abstract.pdf",
      dateModified: "09-09-2026 14:50",
      type: "PDF Document",
      sizeBytes: 2516582,
      sizeLabel: "2.4 MB",
      extension: "pdf",
    },
    {
      id: "dl-2",
      name: "ilovepdf_merged (1).pdf",
      dateModified: "09-09-2026 14:40",
      type: "PDF Document",
      sizeBytes: 5033164,
      sizeLabel: "4.8 MB",
      extension: "pdf",
    },
    {
      id: "dl-3",
      name: "ilovepdf_merged.docx",
      dateModified: "09-09-2026 14:39",
      type: "Microsoft Word Document",
      sizeBytes: 1258291,
      sizeLabel: "1.2 MB",
      extension: "docx",
    },
    {
      id: "dl-4",
      name: "ilovepdf_merged.pdf",
      dateModified: "09-09-2026 14:31",
      type: "PDF Document",
      sizeBytes: 3250585,
      sizeLabel: "3.1 MB",
      extension: "pdf",
    },
    {
      id: "dl-5",
      name: "gestura.pdf",
      dateModified: "09-09-2026 14:30",
      type: "PDF Document",
      sizeBytes: 5872025,
      sizeLabel: "5.6 MB",
      extension: "pdf",
    },
    {
      id: "dl-6",
      name: "GESTURA_Full_Presentation_Guide.pdf",
      dateModified: "09-09-2026 14:29",
      type: "PDF Document",
      sizeBytes: 8598323,
      sizeLabel: "8.2 MB",
      extension: "pdf",
    },
  ],
  documents: [
    {
      id: "doc-1",
      name: "GESTURA_Project_Final_Report.pdf",
      dateModified: "08-09-2026 16:20",
      type: "PDF Document",
      sizeBytes: 3984588,
      sizeLabel: "3.8 MB",
      extension: "pdf",
    },
    {
      id: "doc-2",
      name: "WebRTC_P2P_Transfer_Architecture.docx",
      dateModified: "07-09-2026 11:15",
      type: "Microsoft Word Document",
      sizeBytes: 943718,
      sizeLabel: "920 KB",
      extension: "docx",
    },
    {
      id: "doc-3",
      name: "Gesture_Recognition_Benchmark_Specs.pdf",
      dateModified: "06-09-2026 18:42",
      type: "PDF Document",
      sizeBytes: 1887436,
      sizeLabel: "1.8 MB",
      extension: "pdf",
    },
  ],
  pictures: [
    {
      id: "pic-1",
      name: "gestura_live_demo_screenshot.png",
      dateModified: "09-09-2026 12:10",
      type: "PNG Image",
      sizeBytes: 2306867,
      sizeLabel: "2.2 MB",
      extension: "png",
    },
    {
      id: "pic-2",
      name: "hand_tracking_landmarks_diagram.jpg",
      dateModified: "08-09-2026 09:30",
      type: "JPEG Image",
      sizeBytes: 1572864,
      sizeLabel: "1.5 MB",
      extension: "jpg",
    },
  ],
  videos: [
    {
      id: "vid-1",
      name: "gestura_transfer_demo_847mb.mp4",
      dateModified: "08-09-2026 21:04",
      type: "MP4 Video",
      sizeBytes: 888143872,
      sizeLabel: "847 MB",
      extension: "mp4",
    },
    {
      id: "vid-2",
      name: "project_walkthrough_presentation.mp4",
      dateModified: "09-09-2026 15:10",
      type: "MP4 Video",
      sizeBytes: 356515840,
      sizeLabel: "340 MB",
      extension: "mp4",
    },
  ],
  desktop: [
    {
      id: "dsk-1",
      name: "Project_Presentation_Notes.txt",
      dateModified: "09-09-2026 16:00",
      type: "Text Document",
      sizeBytes: 14500,
      sizeLabel: "14 KB",
      extension: "other",
    },
  ],
};

function getFileIcon(ext: BrowserFileItem["extension"]) {
  switch (ext) {
    case "pdf":
      return (
        <div style={{
          width: 22, height: 26, background: "#ef4444", borderRadius: 3,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800, fontSize: 8, letterSpacing: -0.5, flexShrink: 0
        }}>
          PDF
        </div>
      );
    case "docx":
      return (
        <div style={{
          width: 22, height: 26, background: "#2563eb", borderRadius: 3,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800, fontSize: 8, letterSpacing: -0.5, flexShrink: 0
        }}>
          DOC
        </div>
      );
    case "mp4":
      return (
        <div style={{
          width: 22, height: 26, background: "#8b5cf6", borderRadius: 3,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800, fontSize: 8, letterSpacing: -0.5, flexShrink: 0
        }}>
          VID
        </div>
      );
    case "png":
    case "jpg":
      return (
        <div style={{
          width: 22, height: 26, background: "#06b6d4", borderRadius: 3,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800, fontSize: 8, letterSpacing: -0.5, flexShrink: 0
        }}>
          IMG
        </div>
      );
    default:
      return (
        <div style={{
          width: 22, height: 26, background: "#64748b", borderRadius: 3,
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontWeight: 800, fontSize: 8, letterSpacing: -0.5, flexShrink: 0
        }}>
          FILE
        </div>
      );
  }
}

export default function GestureFileBrowser({
  isOpen,
  onClose,
  onConfirmFiles,
  onOpenNativePicker,
  handPosition,
  currentGesture = "none",
}: GestureFileBrowserProps) {
  const { isDark } = useTheme();

  // Navigation state
  const [activeSectionId, setActiveSectionId] = useState<string>("downloads");
  const [folderFiles, setFolderFiles] = useState<Record<string, BrowserFileItem[]>>(FOLDER_PRESETS);
  const [selectedFileIds, setSelectedFileIds] = useState<Set<string>>(new Set());

  // Focus and cursor state
  const [focusedZone, setFocusedZone] = useState<"sections" | "files">("files");
  const [activeFileIndex, setActiveFileIndex] = useState<number>(0);
  const [activeSectionIndex, setActiveSectionIndex] = useState<number>(0);

  // Gesture scroll state
  const [scrollDirection, setScrollDirection] = useState<"up" | "down" | "pointing" | "idle">("idle");
  const [dwellProgress, setDwellProgress] = useState<number>(0);

  const nativeInputRef = useRef<HTMLInputElement>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const lastGrabTimeRef = useRef<number>(0);
  const activeRowRef = useRef<HTMLDivElement>(null);
  const dwellTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentFiles = folderFiles[activeSectionId] || [];

  // Keep index within bounds when folder changes
  useEffect(() => {
    setActiveFileIndex(0);
  }, [activeSectionId]);

  // Scroll active row into view
  useEffect(() => {
    if (activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeFileIndex]);

  // Convert browser items to actual File objects
  const handleConfirm = useCallback(() => {
    const chosen: File[] = [];
    currentFiles.forEach((item) => {
      if (selectedFileIds.has(item.id)) {
        if (item.actualFile) {
          chosen.push(item.actualFile);
        } else {
          // Generate a synthetic File object with requested name and size
          const content = `Mock file content for ${item.name} generated by Gestura In-App Gesture Browser.`;
          const blob = new Blob([content], { type: "application/octet-stream" });
          const file = new File([blob], item.name, {
            type: item.type.includes("PDF") ? "application/pdf" : "application/octet-stream",
            lastModified: Date.now(),
          });
          // Attach simulated size
          Object.defineProperty(file, "size", { value: item.sizeBytes, writable: false });
          chosen.push(file);
        }
      }
    });

    if (chosen.length === 0 && currentFiles[activeFileIndex]) {
      // If none explicitly checked, take currently pointed file
      const item = currentFiles[activeFileIndex];
      const content = `Mock file content for ${item.name}`;
      const blob = new Blob([content], { type: "application/octet-stream" });
      const file = new File([blob], item.name, {
        type: item.type.includes("PDF") ? "application/pdf" : "application/octet-stream",
        lastModified: Date.now(),
      });
      Object.defineProperty(file, "size", { value: item.sizeBytes, writable: false });
      chosen.push(file);
    }

    onConfirmFiles(chosen);
  }, [currentFiles, selectedFileIds, activeFileIndex, onConfirmFiles]);

  // Handle native file selection
  const handleNativeFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: BrowserFileItem[] = Array.from(files).map((f, i) => ({
      id: `uploaded-${Date.now()}-${i}`,
      name: f.name,
      dateModified: new Date(f.lastModified).toLocaleDateString() + " " + new Date(f.lastModified).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      type: f.type || "File",
      sizeBytes: f.size,
      sizeLabel: (f.size / (1024 * 1024)).toFixed(1) + " MB",
      extension: f.name.endsWith(".pdf") ? "pdf" : f.name.endsWith(".docx") ? "docx" : f.name.endsWith(".mp4") ? "mp4" : "other",
      actualFile: f,
    }));

    setFolderFiles((prev) => ({
      ...prev,
      [activeSectionId]: [...newItems, ...(prev[activeSectionId] || [])],
    }));

    // Auto-select uploaded files
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      newItems.forEach((it) => next.add(it.id));
      return next;
    });

    setActiveFileIndex(0);
  }, [activeSectionId]);

  // Toggle selection on current file
  const toggleSelection = useCallback((fileId: string) => {
    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      if (next.has(fileId)) {
        next.delete(fileId);
      } else {
        next.add(fileId);
      }
      return next;
    });
  }, []);

  // Process 1-Finger Pointing & Vertical Scrolling Gesture
  useEffect(() => {
    if (!isOpen) return;

    const now = Date.now();
    const px = handPosition?.pointerX ?? handPosition?.x;
    const py = handPosition?.pointerY ?? handPosition?.y;

    if (px === undefined || py === undefined || px === null || py === null) {
      setScrollDirection("idle");
      return;
    }

    // 1. Zone determination: Left sidebar (x < 0.28) vs Main file list (x >= 0.28)
    const newZone = px < 0.28 ? "sections" : "files";
    if (newZone !== focusedZone) {
      setFocusedZone(newZone);
    }

    // 2. Vertical 1-Finger Movement: UP / DOWN / POINTING
    const isUp = py < 0.36;
    const isDown = py > 0.64;

    if (isUp) {
      setScrollDirection("up");
      if (now - lastScrollTimeRef.current > 380) {
        lastScrollTimeRef.current = now;
        if (newZone === "files") {
          setActiveFileIndex((prev) => Math.max(0, prev - 1));
        } else {
          setActiveSectionIndex((prev) => {
            const nextIdx = Math.max(0, prev - 1);
            setActiveSectionId(SECTIONS[nextIdx].id);
            return nextIdx;
          });
        }
      }
    } else if (isDown) {
      setScrollDirection("down");
      if (now - lastScrollTimeRef.current > 380) {
        lastScrollTimeRef.current = now;
        if (newZone === "files") {
          setActiveFileIndex((prev) => Math.min(currentFiles.length - 1, prev + 1));
        } else {
          setActiveSectionIndex((prev) => {
            const nextIdx = Math.min(SECTIONS.length - 1, prev + 1);
            setActiveSectionId(SECTIONS[nextIdx].id);
            return nextIdx;
          });
        }
      }
    } else {
      // In middle zone: Pointing steadily at the item
      setScrollDirection("pointing");
    }

    // 3. Fist Grab selection toggle
    if (currentGesture === "fist") {
      if (now - lastGrabTimeRef.current > 700) {
        lastGrabTimeRef.current = now;
        if (newZone === "files" && currentFiles[activeFileIndex]) {
          toggleSelection(currentFiles[activeFileIndex].id);
          if (typeof navigator !== "undefined" && navigator.vibrate) {
            try { navigator.vibrate(50); } catch (_) {}
          }
        }
      }
    }

    // 4. Two Palms confirmation
    if (currentGesture === "two-palms") {
      if (now - lastGrabTimeRef.current > 1200) {
        lastGrabTimeRef.current = now;
        handleConfirm();
      }
    }
  }, [
    isOpen,
    handPosition,
    currentGesture,
    focusedZone,
    currentFiles,
    activeFileIndex,
    toggleSelection,
    handleConfirm,
  ]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        background: "rgba(0, 0, 0, 0.68)",
        backdropFilter: "blur(16px)",
        WebkitBackdropFilter: "blur(16px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "fadeIn 0.2s ease-out",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Hidden native input for upload button */}
      <input
        ref={nativeInputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={handleNativeFiles}
      />

      {/* Main File Explorer Window matching screenshot */}
      <div
        style={{
          width: "100%",
          maxWidth: 820,
          height: "85vh",
          maxHeight: 640,
          background: isDark ? "#0f172a" : "#ffffff",
          borderRadius: 14,
          border: isDark ? "1.5px solid rgba(255,255,255,0.14)" : "1.5px solid rgba(0,0,0,0.12)",
          boxShadow: isDark
            ? "0 25px 60px -12px rgba(0,0,0,0.7), 0 0 0 1px rgba(99,102,241,0.2)"
            : "0 25px 60px -12px rgba(0,0,0,0.25), 0 0 0 1px rgba(99,102,241,0.15)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
          color: isDark ? "#f8fafc" : "#1e293b",
        }}
      >
        {/* Title Bar */}
        <div
          style={{
            height: 38,
            borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 14px",
            background: isDark ? "#1e293b" : "#f1f5f9",
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, fontWeight: 600 }}>
            {/* Edge/Gestura Browser Icon */}
            <div style={{
              width: 18, height: 18, borderRadius: "50%",
              background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontSize: 10, color: "#fff", fontWeight: 900
            }}>
              G
            </div>
            <span>Open &mdash; Gesture File Picker</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <span style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b" }}>—</span>
            <span style={{ fontSize: 11, color: isDark ? "#94a3b8" : "#64748b" }}>□</span>
            <span
              onClick={onClose}
              style={{ fontSize: 14, color: isDark ? "#94a3b8" : "#64748b", cursor: "pointer", padding: "2px 6px" }}
            >
              ✕
            </span>
          </div>
        </div>

        {/* Realtime 1-Finger Gesture Guidance Banner */}
        <div
          style={{
            background: scrollDirection === "up"
              ? "linear-gradient(90deg, #10b981, #059669)"
              : scrollDirection === "down"
              ? "linear-gradient(90deg, #6366f1, #4f46e5)"
              : isDark ? "#1e293b" : "#e0e7ff",
            color: scrollDirection !== "idle" && scrollDirection !== "pointing" ? "#ffffff" : isDark ? "#c7d2fe" : "#3730a3",
            padding: "6px 14px",
            fontSize: 12,
            fontWeight: 700,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            transition: "background 0.2s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 15 }}>
              {scrollDirection === "up" ? "☝️" : scrollDirection === "down" ? "👇" : "👉"}
            </span>
            <span>
              {scrollDirection === "up" && "1 FINGER UP: SCROLLING UP ▲"}
              {scrollDirection === "down" && "1 FINGER DOWN: SCROLLING DOWN ▼"}
              {scrollDirection === "pointing" && `POINTED AT: "${currentFiles[activeFileIndex]?.name || "Item"}"`}
              {scrollDirection === "idle" && "Show 1 finger to point & scroll UP/DOWN • Fist grab to select"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, opacity: 0.95 }}>
            <span style={{
              background: focusedZone === "sections" ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.12)",
              padding: "2px 8px", borderRadius: 6
            }}>
              {focusedZone === "sections" ? "📂 Focus: Sidebar" : "📑 Focus: File List"}
            </span>
            <span>Fist = Select ({selectedFileIds.size})</span>
          </div>
        </div>

        {/* Address & Breadcrumbs Bar matching screenshot */}
        <div
          style={{
            height: 44,
            borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            padding: "0 12px",
            gap: 8,
            background: isDark ? "#0f172a" : "#f8fafc",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 4, color: isDark ? "#94a3b8" : "#64748b" }}>
            <span style={{ fontSize: 16, cursor: "pointer", padding: "4px 6px" }}>←</span>
            <span style={{ fontSize: 16, cursor: "pointer", padding: "4px 6px" }}>→</span>
            <span style={{ fontSize: 16, cursor: "pointer", padding: "4px 6px" }}>↑</span>
          </div>

          {/* Breadcrumb box */}
          <div
            style={{
              flex: 1,
              height: 28,
              background: isDark ? "#1e293b" : "#ffffff",
              border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #cbd5e1",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              padding: "0 10px",
              gap: 6,
              fontSize: 12,
              fontWeight: 500,
            }}
          >
            <span style={{ color: "#0ea5e9" }}>↓</span>
            <span>{SECTIONS.find((s) => s.id === activeSectionId)?.name || "Downloads"}</span>
            <span style={{ color: isDark ? "#64748b" : "#94a3b8" }}>&gt;</span>
          </div>

          {/* Search box */}
          <div
            style={{
              width: 180,
              height: 28,
              background: isDark ? "#1e293b" : "#ffffff",
              border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #cbd5e1",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              padding: "0 8px",
              gap: 6,
              fontSize: 12,
              color: isDark ? "#94a3b8" : "#64748b",
            }}
          >
            <span>🔍</span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              Search {SECTIONS.find((s) => s.id === activeSectionId)?.name}
            </span>
          </div>
        </div>

        {/* Middle Explorer Body: Left Sidebar + Files Table */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Left Sidebar (Sections) */}
          <div
            style={{
              width: 190,
              borderRight: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
              background: isDark ? "#111827" : "#f8fafc",
              padding: "10px 8px",
              display: "flex",
              flexDirection: "column",
              gap: 3,
              userSelect: "none",
              overflowY: "auto",
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: isDark ? "#64748b" : "#94a3b8", padding: "4px 8px" }}>
              📁 Folders / Sections
            </div>

            {SECTIONS.map((sec, idx) => {
              const isActive = sec.id === activeSectionId;
              const isPointerOnSection = focusedZone === "sections" && activeSectionIndex === idx;

              return (
                <div
                  key={sec.id}
                  onClick={() => {
                    setActiveSectionId(sec.id);
                    setActiveSectionIndex(idx);
                    setFocusedZone("files");
                  }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "7px 10px",
                    borderRadius: 6,
                    fontSize: 13,
                    fontWeight: isActive ? 700 : 500,
                    cursor: "pointer",
                    background: isPointerOnSection
                      ? isDark ? "rgba(99,102,241,0.3)" : "#e0e7ff"
                      : isActive
                      ? isDark ? "rgba(255,255,255,0.08)" : "#e2e8f0"
                      : "transparent",
                    border: isPointerOnSection ? "1.5px solid #6366f1" : "1.5px solid transparent",
                    color: isActive ? (isDark ? "#ffffff" : "#0f172a") : (isDark ? "#94a3b8" : "#475569"),
                    transition: "all 0.15s ease",
                  }}
                >
                  <span style={{ fontSize: 14 }}>{sec.icon}</span>
                  <span style={{ flex: 1 }}>{sec.name}</span>
                  {isPointerOnSection && (
                    <span style={{ fontSize: 11, color: "#6366f1", fontWeight: 800 }}>👈</span>
                  )}
                </div>
              );
            })}

            <div style={{ marginTop: "auto", paddingTop: 10 }}>
              <button
                onClick={() => nativeInputRef.current?.click()}
                style={{
                  width: "100%",
                  padding: "8px 10px",
                  borderRadius: 6,
                  border: isDark ? "1px dashed rgba(255,255,255,0.2)" : "1px dashed #94a3b8",
                  background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
                  fontSize: 12,
                  fontWeight: 600,
                  color: isDark ? "#c7d2fe" : "#4f46e5",
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 6,
                }}
              >
                <span>➕</span>
                <span>Upload PC Files</span>
              </button>
            </div>
          </div>

          {/* Right Main Table View matching screenshot */}
          <div
            style={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              background: isDark ? "#0f172a" : "#ffffff",
              overflow: "hidden",
            }}
          >
            {/* Table Header Columns */}
            <div
              style={{
                height: 32,
                borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
                display: "grid",
                gridTemplateColumns: "36px minmax(220px, 1fr) 140px 110px 80px",
                alignItems: "center",
                padding: "0 8px",
                fontSize: 12,
                fontWeight: 600,
                color: isDark ? "#94a3b8" : "#64748b",
                userSelect: "none",
                background: isDark ? "#1e293b" : "#f8fafc",
              }}
            >
              <div></div>
              <div>Name</div>
              <div>Date modified</div>
              <div>Type</div>
              <div style={{ textAlign: "right", paddingRight: 8 }}>Size</div>
            </div>

            {/* Scrollable File Rows */}
            <div
              style={{
                flex: 1,
                overflowY: "auto",
                padding: "6px 8px",
              }}
            >
              {/* Group label: "v Today" from screenshot */}
              <div
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: isDark ? "#cbd5e1" : "#475569",
                  padding: "4px 8px",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span>∨</span>
                <span>Today ({currentFiles.length} files)</span>
              </div>

              {currentFiles.map((file, idx) => {
                const isPointed = focusedZone === "files" && activeFileIndex === idx;
                const isSelected = selectedFileIds.has(file.id);

                return (
                  <div
                    key={file.id}
                    ref={isPointed ? activeRowRef : null}
                    onClick={() => {
                      setActiveFileIndex(idx);
                      toggleSelection(file.id);
                    }}
                    style={{
                      height: 38,
                      display: "grid",
                      gridTemplateColumns: "36px minmax(220px, 1fr) 140px 110px 80px",
                      alignItems: "center",
                      padding: "0 8px",
                      borderRadius: 6,
                      fontSize: 12,
                      cursor: "pointer",
                      marginBottom: 2,
                      userSelect: "none",
                      position: "relative",
                      background: isPointed
                        ? isDark ? "rgba(99,102,241,0.28)" : "#e0e7ff"
                        : isSelected
                        ? isDark ? "rgba(99,102,241,0.14)" : "#eef2ff"
                        : "transparent",
                      border: isPointed
                        ? "1.5px solid #6366f1"
                        : isSelected
                        ? isDark ? "1px solid rgba(99,102,241,0.4)" : "1px solid #c7d2fe"
                        : "1.5px solid transparent",
                      transition: "all 0.1s ease",
                    }}
                  >
                    {/* Laser Pointer / Selection Indicator */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {isPointed ? (
                        <span style={{ fontSize: 16, animation: "bounce 0.8s infinite" }}>👉</span>
                      ) : isSelected ? (
                        <div style={{
                          width: 16, height: 16, borderRadius: 4, background: "#6366f1",
                          color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: 10, fontWeight: 800
                        }}>
                          ✓
                        </div>
                      ) : (
                        <div style={{
                          width: 14, height: 14, borderRadius: 3,
                          border: isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid #cbd5e1"
                        }} />
                      )}
                    </div>

                    {/* Name + File Icon */}
                    <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden" }}>
                      {getFileIcon(file.extension)}
                      <span
                        style={{
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                          fontWeight: isPointed || isSelected ? 700 : 500,
                          color: isPointed
                            ? (isDark ? "#ffffff" : "#1e1b4b")
                            : isSelected
                            ? (isDark ? "#c7d2fe" : "#4338ca")
                            : (isDark ? "#e2e8f0" : "#1e293b"),
                        }}
                      >
                        {file.name}
                      </span>
                    </div>

                    {/* Date Modified */}
                    <div style={{ color: isDark ? "#94a3b8" : "#64748b", fontSize: 11 }}>
                      {file.dateModified}
                    </div>

                    {/* Type */}
                    <div style={{
                      color: isDark ? "#94a3b8" : "#64748b", fontSize: 11,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap"
                    }}>
                      {file.type}
                    </div>

                    {/* Size */}
                    <div style={{
                      textAlign: "right", paddingRight: 8,
                      color: isDark ? "#94a3b8" : "#64748b", fontSize: 11, fontWeight: 600
                    }}>
                      {file.sizeLabel}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom Bar matching Windows Open dialog screenshot */}
        <div
          style={{
            height: 64,
            borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 16px",
            background: isDark ? "#1e293b" : "#f1f5f9",
            gap: 12,
          }}
        >
          {/* File Name input display */}
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1 }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: isDark ? "#94a3b8" : "#475569", whiteSpace: "nowrap" }}>
              File name:
            </span>
            <div
              style={{
                flex: 1,
                maxWidth: 360,
                height: 28,
                background: isDark ? "#0f172a" : "#ffffff",
                border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #cbd5e1",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                padding: "0 8px",
                fontSize: 12,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: isDark ? "#f8fafc" : "#1e293b",
              }}
            >
              {selectedFileIds.size > 0
                ? `${selectedFileIds.size} file(s) selected: ${Array.from(selectedFileIds).map((id) => currentFiles.find((f) => f.id === id)?.name).filter(Boolean).join(", ")}`
                : currentFiles[activeFileIndex]?.name || "No file selected"}
            </div>
          </div>

          {/* Action Buttons: Upload from mobile/PC, Open, Cancel */}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button
              onClick={() => nativeInputRef.current?.click()}
              style={{
                padding: "7px 12px",
                borderRadius: 6,
                border: isDark ? "1px solid rgba(255,255,255,0.14)" : "1px solid #cbd5e1",
                background: isDark ? "#334155" : "#ffffff",
                color: isDark ? "#f8fafc" : "#1e293b",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Upload from PC / Mobile
            </button>

            <button
              onClick={handleConfirm}
              style={{
                padding: "7px 20px",
                borderRadius: 6,
                border: "none",
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                color: "#ffffff",
                fontSize: 12,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
              }}
            >
              Open (Stage Files)
            </button>

            <button
              onClick={onClose}
              style={{
                padding: "7px 14px",
                borderRadius: 6,
                border: isDark ? "1px solid rgba(255,255,255,0.14)" : "1px solid #cbd5e1",
                background: isDark ? "#334155" : "#ffffff",
                color: isDark ? "#f8fafc" : "#1e293b",
                fontSize: 12,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
