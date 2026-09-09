import React, { useState, useEffect, useRef, useCallback } from "react";
import type { HandTrackingData } from "./CameraView";
import { useTheme } from "../utils/useTheme";

export interface GestureFileBrowserProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmFiles: (files: File[], autoGrab?: boolean) => void;
  onOpenNativePicker: () => void;
  handPosition: HandTrackingData | null;
  currentGesture?: string;
  cameraHud?: React.ReactNode;
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
  { id: "real", name: "Real Files", icon: "DEV", path: "" },
  { id: "downloads", name: "Downloads", icon: "DL", path: "Downloads" },
  { id: "documents", name: "Documents", icon: "DC", path: "Documents" },
  { id: "pictures", name: "Pictures", icon: "IMG", path: "Pictures" },
  { id: "videos", name: "Videos", icon: "VID", path: "Videos" },
  { id: "desktop", name: "Desktop", icon: "DSK", path: "Desktop" },
];

const FOLDER_PRESETS: Record<string, BrowserFileItem[]> = {
  real: [],
  downloads: [
    { id: "dl-1", name: "University_Lost_and_Found_Abstract.pdf", dateModified: "09-09-2026 14:50", type: "PDF Document", sizeBytes: 2516582, sizeLabel: "2.4 MB", extension: "pdf" },
    { id: "dl-2", name: "ilovepdf_merged (1).pdf", dateModified: "09-09-2026 14:40", type: "PDF Document", sizeBytes: 5033164, sizeLabel: "4.8 MB", extension: "pdf" },
    { id: "dl-3", name: "ilovepdf_merged.docx", dateModified: "09-09-2026 14:39", type: "Microsoft Word Document", sizeBytes: 1258291, sizeLabel: "1.2 MB", extension: "docx" },
    { id: "dl-4", name: "ilovepdf_merged.pdf", dateModified: "09-09-2026 14:39", type: "PDF Document", sizeBytes: 4194304, sizeLabel: "4.0 MB", extension: "pdf" },
    { id: "dl-5", name: "GESTURA_Architecture_v2.pdf", dateModified: "08-09-2026 11:20", type: "PDF Document", sizeBytes: 3145728, sizeLabel: "3.0 MB", extension: "pdf" },
    { id: "dl-6", name: "WebRTC_P2P_Benchmark_Report.pdf", dateModified: "07-09-2026 09:15", type: "PDF Document", sizeBytes: 1887436, sizeLabel: "1.8 MB", extension: "pdf" },
  ],
  documents: [
    { id: "doc-1", name: "Project_Proposal_Final.docx", dateModified: "09-09-2026 10:30", type: "Microsoft Word Document", sizeBytes: 891289, sizeLabel: "870 KB", extension: "docx" },
    { id: "doc-2", name: "Meeting_Notes_Sprint14.pdf", dateModified: "08-09-2026 16:45", type: "PDF Document", sizeBytes: 421000, sizeLabel: "411 KB", extension: "pdf" },
    { id: "doc-3", name: "Network_Security_Audit.pdf", dateModified: "06-09-2026 13:10", type: "PDF Document", sizeBytes: 2097152, sizeLabel: "2.0 MB", extension: "pdf" },
  ],
  pictures: [
    { id: "pic-1", name: "Hand_Tracking_Landmarks.png", dateModified: "09-09-2026 12:00", type: "PNG Image", sizeBytes: 1572864, sizeLabel: "1.5 MB", extension: "png" },
    { id: "pic-2", name: "Demo_Presentation_Slide1.png", dateModified: "08-09-2026 18:30", type: "PNG Image", sizeBytes: 943718, sizeLabel: "922 KB", extension: "png" },
    { id: "pic-3", name: "System_Diagram.png", dateModified: "07-09-2026 15:40", type: "PNG Image", sizeBytes: 2359296, sizeLabel: "2.25 MB", extension: "png" },
  ],
  videos: [
    { id: "vid-1", name: "Gesture_Transfer_Demo_60fps.mp4", dateModified: "09-09-2026 14:15", type: "MP4 Video", sizeBytes: 8388608, sizeLabel: "8.0 MB", extension: "mp4" },
    { id: "vid-2", name: "MediaPipe_Hand_Tracking_Test.mp4", dateModified: "08-09-2026 17:00", type: "MP4 Video", sizeBytes: 6291456, sizeLabel: "6.0 MB", extension: "mp4" },
  ],
  desktop: [
    { id: "dsk-1", name: "quick_notes.txt", dateModified: "09-09-2026 15:00", type: "Text Document", sizeBytes: 4096, sizeLabel: "4 KB", extension: "other" },
    { id: "dsk-2", name: "Railway_Deploy_Configs.zip", dateModified: "08-09-2026 21:00", type: "ZIP Archive", sizeBytes: 3145728, sizeLabel: "3.0 MB", extension: "zip" },
  ],
};

function getFileIcon(ext: BrowserFileItem["extension"]) {
  const badgeStyle: React.CSSProperties = {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: 22,
    height: 20,
    borderRadius: 3,
    fontSize: 9,
    fontWeight: 800,
    letterSpacing: -0.3,
    color: "#ffffff",
    flexShrink: 0,
  };
  switch (ext) {
    case "pdf":
      return <span style={{ ...badgeStyle, background: "#ef4444" }}>PDF</span>;
    case "docx":
      return <span style={{ ...badgeStyle, background: "#2563eb" }}>DOC</span>;
    case "png":
    case "jpg":
      return <span style={{ ...badgeStyle, background: "#10b981" }}>IMG</span>;
    case "mp4":
      return <span style={{ ...badgeStyle, background: "#8b5cf6" }}>VID</span>;
    case "zip":
      return <span style={{ ...badgeStyle, background: "#f59e0b" }}>ZIP</span>;
    default:
      return <span style={{ ...badgeStyle, background: "#64748b" }}>FILE</span>;
  }
}

export function GestureFileBrowser({
  isOpen,
  onClose,
  onConfirmFiles,
  onOpenNativePicker,
  handPosition,
  currentGesture = "none",
  cameraHud,
}: GestureFileBrowserProps) {
  const { isDark } = useTheme();

  // Responsive mobile state
  const [isMobile, setIsMobile] = useState<boolean>(() => typeof window !== "undefined" ? window.innerWidth < 768 : false);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
  const [grabbedNotice, setGrabbedNotice] = useState<string | null>(null);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState<boolean>(false);

  const nativeInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const lastScrollTimeRef = useRef<number>(0);
  const lastGrabTimeRef = useRef<number>(0);
  const activeRowRef = useRef<HTMLDivElement>(null);

  const currentFiles = folderFiles[activeSectionId] || [];

  // Reset file index on section change
  useEffect(() => {
    setActiveFileIndex(0);
  }, [activeSectionId]);

  // Auto-scroll pointed row into view
  useEffect(() => {
    if (activeRowRef.current) {
      activeRowRef.current.scrollIntoView({ block: "nearest", behavior: "smooth" });
    }
  }, [activeFileIndex]);

  // Convert browser items to actual File objects
  const makeRealFile = (item: BrowserFileItem): File => {
    if (item.actualFile) return item.actualFile;
    const safeSize = Math.min(item.sizeBytes, 1024 * 512);
    const buffer = new Uint8Array(safeSize);
    const headerText = `Gestura Demo File: ${item.name}\nSize: ${item.sizeLabel}\nP2P Gesture File Transfer verified.\n`;
    const encoder = new TextEncoder();
    buffer.set(encoder.encode(headerText).subarray(0, safeSize));
    const mime = item.name.endsWith(".pdf")
      ? "application/pdf"
      : item.name.endsWith(".docx")
      ? "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      : item.name.endsWith(".mp4")
      ? "video/mp4"
      : "application/octet-stream";
    const blob = new Blob([buffer], { type: mime });
    return new File([blob], item.name, {
      type: mime,
      lastModified: Date.now(),
    });
  };

  const handleConfirm = useCallback((autoGrab: boolean = false) => {
    const chosen: File[] = [];
    currentFiles.forEach((item) => {
      if (selectedFileIds.has(item.id)) {
        chosen.push(makeRealFile(item));
      }
    });

    if (chosen.length === 0 && currentFiles[activeFileIndex]) {
      chosen.push(makeRealFile(currentFiles[activeFileIndex]));
    }

    onConfirmFiles(chosen, autoGrab);
  }, [currentFiles, selectedFileIds, activeFileIndex, onConfirmFiles]);

  const handleDirectGrab = useCallback((item: BrowserFileItem) => {
    setGrabbedNotice(`File grabbed: "${item.name}". Show Two Closed Palms to clear and close.`);
    if (typeof navigator !== "undefined" && navigator.vibrate) {
      try { navigator.vibrate([70, 40, 70]); } catch (_) {}
    }
    const realFile = makeRealFile(item);
    onConfirmFiles([realFile], true);
  }, [onConfirmFiles]);

  // File System Access API: Pick real folder from phone or desktop!
  const handleOpenRealDirectory = async () => {
    try {
      if ("showDirectoryPicker" in window) {
        setIsLoadingDirectory(true);
        // @ts-ignore
        const dirHandle = await (window as any).showDirectoryPicker();
        const files: BrowserFileItem[] = [];

        // @ts-ignore
        for await (const entry of dirHandle.values()) {
          if (entry.kind === "file") {
            try {
              const file: File = await entry.getFile();
              const ext = file.name.split(".").pop()?.toLowerCase() || "other";
              const validExt: BrowserFileItem["extension"] = ["pdf", "docx", "png", "jpg", "mp4", "zip"].includes(ext)
                ? (ext as BrowserFileItem["extension"])
                : "other";

              files.push({
                id: `real-${file.name}-${file.size}-${file.lastModified}`,
                name: file.name,
                dateModified: new Date(file.lastModified).toLocaleDateString() + " " + new Date(file.lastModified).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
                type: file.type || "File",
                sizeBytes: file.size,
                sizeLabel: (file.size / (1024 * 1024)).toFixed(1) + " MB",
                extension: validExt,
                actualFile: file,
              });
            } catch (err) {
              console.warn("Could not read file from folder:", entry.name, err);
            }
          }
        }

        if (files.length > 0) {
          setFolderFiles((prev) => ({
            ...prev,
            real: files,
          }));
          setActiveSectionId("real");
          setActiveFileIndex(0);
        }
        setIsLoadingDirectory(false);
      } else {
        folderInputRef.current?.click();
      }
    } catch (err) {
      setIsLoadingDirectory(false);
      console.log("Directory picker cancelled or unsupported:", err);
    }
  };

  // Handle native file selection
  const handleNativeFiles = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newItems: BrowserFileItem[] = Array.from(files).map((f, i) => {
      const ext = f.name.split(".").pop()?.toLowerCase() || "other";
      const validExt: BrowserFileItem["extension"] = ["pdf", "docx", "png", "jpg", "mp4", "zip"].includes(ext)
        ? (ext as BrowserFileItem["extension"])
        : "other";

      return {
        id: `uploaded-${Date.now()}-${i}`,
        name: f.name,
        dateModified: new Date(f.lastModified).toLocaleDateString() + " " + new Date(f.lastModified).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
        type: f.type || "File",
        sizeBytes: f.size,
        sizeLabel: (f.size / (1024 * 1024)).toFixed(1) + " MB",
        extension: validExt,
        actualFile: f,
      };
    });

    setFolderFiles((prev) => ({
      ...prev,
      real: [...newItems, ...(prev.real || [])],
      [activeSectionId]: [...newItems, ...(prev[activeSectionId] || [])],
    }));

    setSelectedFileIds((prev) => {
      const next = new Set(prev);
      newItems.forEach((it) => next.add(it.id));
      return next;
    });

    setActiveFileIndex(0);
  }, [activeSectionId]);

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

  // Gesture Controls: 2-Finger Scroll & Fist Grab & Two Closed Palms
  useEffect(() => {
    if (!isOpen) return;

    const now = Date.now();

    // 1. TWO CLOSED PALMS: Close picker
    if (currentGesture === "two-closed-palms") {
      if (now - lastGrabTimeRef.current > 600) {
        lastGrabTimeRef.current = now;
        onClose();
      }
      return;
    }

    // 2. FIST: Grab pointed file
    if (currentGesture === "fist") {
      if (now - lastGrabTimeRef.current > 800) {
        lastGrabTimeRef.current = now;
        const target = currentFiles[activeFileIndex] || currentFiles[0];
        if (target) {
          handleDirectGrab(target);
        }
      }
      return;
    }

    // 3. 2-FINGER SCROLL
    if (handPosition?.isTwoFingerScroll) {
      const y = handPosition.y;

      if (y < 0.42) {
        setScrollDirection("up");
        if (now - lastScrollTimeRef.current > 180) {
          lastScrollTimeRef.current = now;
          setActiveFileIndex((prev) => Math.max(0, prev - 1));
        }
      } else if (y > 0.58) {
        setScrollDirection("down");
        if (now - lastScrollTimeRef.current > 180) {
          lastScrollTimeRef.current = now;
          setActiveFileIndex((prev) => Math.min(currentFiles.length - 1, prev + 1));
        }
      } else {
        setScrollDirection("idle");
      }
    } else {
      setScrollDirection("idle");
    }
  }, [isOpen, currentGesture, handPosition, currentFiles, activeFileIndex, onClose, handleDirectGrab]);

  // Clear grab notice after 3.5s
  useEffect(() => {
    if (!grabbedNotice) return;
    const t = setTimeout(() => setGrabbedNotice(null), 3500);
    return () => clearTimeout(t);
  }, [grabbedNotice]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100000,
        background: "rgba(0, 0, 0, 0.72)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: isMobile ? "8px" : "16px 20px",
        animation: "fadeIn 0.2s ease-out",
        pointerEvents: "auto",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* Hidden native input for single/multi file upload */}
      <input
        ref={nativeInputRef}
        type="file"
        multiple
        style={{ display: "none" }}
        onChange={handleNativeFiles}
      />

      {/* Hidden native input for directory/folder upload fallback */}
      <input
        ref={folderInputRef}
        type="file"
        {...({ webkitdirectory: "", directory: "", multiple: true } as any)}
        style={{ display: "none" }}
        onChange={handleNativeFiles}
      />

      {/* Direct Grab Confirmation Notice */}
      {grabbedNotice && (
        <div
          style={{
            position: "absolute",
            top: isMobile ? "20%" : "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            zIndex: 100010,
            background: "linear-gradient(135deg, #10b981, #059669)",
            color: "#ffffff",
            padding: isMobile ? "12px 20px" : "20px 32px",
            borderRadius: 16,
            fontSize: isMobile ? 13 : 15,
            fontWeight: 800,
            boxShadow: "0 20px 50px rgba(16, 185, 129, 0.6)",
            display: "flex",
            alignItems: "center",
            gap: 10,
            border: "2px solid rgba(255,255,255,0.4)",
            maxWidth: "90vw",
            textAlign: "center",
          }}
        >
          <span>{grabbedNotice}</span>
        </div>
      )}

      {/* Main File Explorer Window */}
      <div
        style={{
          width: "100%",
          maxWidth: isMobile ? "100%" : "calc(100vw - 320px)",
          height: isMobile ? "92vh" : "86vh",
          maxHeight: isMobile ? "none" : 660,
          background: isDark ? "#0f172a" : "#ffffff",
          borderRadius: isMobile ? 12 : 16,
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
            height: isMobile ? 36 : 40,
            borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            background: isDark ? "#1e293b" : "#f1f5f9",
            userSelect: "none",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: isMobile ? 12 : 13, fontWeight: 700 }}>
            <div
              style={{
                width: 18,
                height: 18,
                borderRadius: "50%",
                background: "linear-gradient(135deg, #0ea5e9, #6366f1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                color: "#fff",
                fontWeight: 900,
              }}
            >
              G
            </div>
            <span>Gestura File Explorer</span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button
              onClick={handleOpenRealDirectory}
              disabled={isLoadingDirectory}
              style={{
                padding: "4px 10px",
                borderRadius: 5,
                background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                border: "none",
                color: "#ffffff",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {isLoadingDirectory ? "Reading Folder..." : "Browse Real Folder"}
            </button>

            <span
              onClick={onClose}
              style={{
                fontSize: 14,
                color: isDark ? "#94a3b8" : "#64748b",
                cursor: "pointer",
                padding: "2px 6px",
                fontWeight: 700,
              }}
            >
              x
            </span>
          </div>
        </div>

        {/* Realtime Gesture Action Guidance Banner */}
        <div
          style={{
            background: currentGesture === "fist"
              ? "linear-gradient(90deg, #10b981, #059669)"
              : currentGesture === "two-closed-palms"
              ? "linear-gradient(90deg, #8b5cf6, #7c3aed)"
              : scrollDirection === "up" || scrollDirection === "down"
              ? "linear-gradient(90deg, #3b82f6, #1d4ed8)"
              : isDark ? "#131d31" : "#eef2ff",
            color: currentGesture !== "none" || scrollDirection !== "idle" ? "#ffffff" : isDark ? "#94a3b8" : "#4338ca",
            padding: "5px 12px",
            fontSize: 11,
            fontWeight: 600,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: isDark ? "1px solid rgba(255,255,255,0.06)" : "1px solid rgba(99,102,241,0.15)",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            <span style={{
              background: "rgba(255,255,255,0.2)",
              padding: "1px 6px",
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 800,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}>
              {currentGesture === "two-closed-palms"
                ? "TWO CLOSED PALMS"
                : currentGesture === "fist"
                ? "CLOSED FIST"
                : scrollDirection === "up"
                ? "SCROLL UP"
                : scrollDirection === "down"
                ? "SCROLL DOWN"
                : "READY"}
            </span>
            <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>
              {currentGesture === "fist"
                ? "Grab pointed file directly into sender hand!"
                : currentGesture === "two-closed-palms"
                ? "Clearing stage and closing file explorer..."
                : scrollDirection === "up"
                ? "Scrolling UP (2 fingers elevated)"
                : scrollDirection === "down"
                ? "Scrolling DOWN (2 fingers lowered)"
                : "2 fingers (index+middle) to scroll | Fist to Grab | 2 Closed Palms to Exit"}
            </span>
          </div>

          <div style={{ fontSize: 10, opacity: 0.85, flexShrink: 0, display: isMobile ? "none" : "block" }}>
            Pointed #{activeFileIndex + 1} of {currentFiles.length}
          </div>
        </div>

        {/* Mobile Horizontal Section Tabs */}
        {isMobile ? (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 6,
              padding: "6px 8px",
              background: isDark ? "#111827" : "#f8fafc",
              borderBottom: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
              overflowX: "auto",
              userSelect: "none",
              flexShrink: 0,
            }}
          >
            {SECTIONS.map((sec) => {
              const isActive = sec.id === activeSectionId;
              return (
                <button
                  key={sec.id}
                  onClick={() => setActiveSectionId(sec.id)}
                  style={{
                    padding: "5px 10px",
                    borderRadius: 6,
                    fontSize: 11,
                    fontWeight: isActive ? 700 : 500,
                    border: isActive ? "1.5px solid #6366f1" : "1px solid transparent",
                    background: isActive ? (isDark ? "rgba(99,102,241,0.25)" : "#e0e7ff") : "transparent",
                    color: isActive ? (isDark ? "#ffffff" : "#4338ca") : (isDark ? "#94a3b8" : "#64748b"),
                    whiteSpace: "nowrap",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <span style={{ fontSize: 9, fontWeight: 800, color: "#6366f1" }}>{sec.icon}</span>
                  <span>{sec.name}</span>
                </button>
              );
            })}
            <button
              onClick={() => nativeInputRef.current?.click()}
              style={{
                padding: "4px 8px",
                borderRadius: 6,
                fontSize: 10,
                fontWeight: 700,
                border: "1px dashed #6366f1",
                background: "transparent",
                color: "#6366f1",
                whiteSpace: "nowrap",
                cursor: "pointer",
              }}
            >
              + Upload
            </button>
          </div>
        ) : null}

        {/* Middle Explorer Body */}
        <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
          {/* Desktop Left Sidebar */}
          {!isMobile && (
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
                flexShrink: 0,
              }}
            >
              <div style={{ fontSize: 11, fontWeight: 700, color: isDark ? "#64748b" : "#94a3b8", padding: "4px 8px" }}>
                Folders / Locations
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
                    <span style={{ fontSize: 9, fontWeight: 800, background: "rgba(99,102,241,0.15)", color: "#6366f1", padding: "2px 5px", borderRadius: 4, letterSpacing: -0.3 }}>
                      {sec.icon}
                    </span>
                    <span style={{ flex: 1 }}>{sec.name}</span>
                  </div>
                );
              })}

              <div style={{ marginTop: "auto", paddingTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
                <button
                  onClick={handleOpenRealDirectory}
                  disabled={isLoadingDirectory}
                  style={{
                    width: "100%",
                    padding: "8px 10px",
                    borderRadius: 6,
                    border: "none",
                    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#ffffff",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    boxShadow: "0 2px 8px rgba(37,99,235,0.35)",
                  }}
                >
                  <span>{isLoadingDirectory ? "Reading Folder..." : "Browse Real Folder"}</span>
                </button>

                <button
                  onClick={() => nativeInputRef.current?.click()}
                  style={{
                    width: "100%",
                    padding: "7px 10px",
                    borderRadius: 6,
                    border: isDark ? "1px dashed rgba(255,255,255,0.2)" : "1px dashed #94a3b8",
                    background: isDark ? "rgba(255,255,255,0.04)" : "#ffffff",
                    fontSize: 11,
                    fontWeight: 600,
                    color: isDark ? "#c7d2fe" : "#4f46e5",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                  }}
                >
                  <span>Upload Files</span>
                </button>
              </div>
            </div>
          )}

          {/* Main Files Table View */}
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
                gridTemplateColumns: isMobile ? "28px 1fr 70px" : "36px minmax(180px, 1fr) 130px 100px 75px",
                alignItems: "center",
                padding: "0 8px",
                fontSize: 11,
                fontWeight: 600,
                color: isDark ? "#94a3b8" : "#64748b",
                userSelect: "none",
                background: isDark ? "#1e293b" : "#f8fafc",
                flexShrink: 0,
              }}
            >
              <div></div>
              <div>Name</div>
              {!isMobile && <div>Date modified</div>}
              {!isMobile && <div>Type</div>}
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
              {currentFiles.length === 0 ? (
                <div style={{ textAlign: "center", padding: "40px 20px", color: isDark ? "#64748b" : "#94a3b8" }}>
                  <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 8 }}>No files in this folder</p>
                  <p style={{ fontSize: 12, marginBottom: 16 }}>Click "Browse Real Folder" or "Upload Files" to display your device files</p>
                  <button
                    onClick={handleOpenRealDirectory}
                    style={{
                      padding: "8px 16px",
                      borderRadius: 6,
                      background: "#3b82f6",
                      color: "#fff",
                      border: "none",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Browse Real Folder
                  </button>
                </div>
              ) : (
                currentFiles.map((file, idx) => {
                  const isPointed = activeFileIndex === idx;
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
                        height: isMobile ? 42 : 38,
                        display: "grid",
                        gridTemplateColumns: isMobile ? "28px 1fr 70px" : "36px minmax(180px, 1fr) 130px 100px 75px",
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
                          <div style={{
                            width: 12,
                            height: 12,
                            borderRadius: "50%",
                            background: "#6366f1",
                            boxShadow: "0 0 8px #6366f1",
                          }} />
                        ) : isSelected ? (
                          <div style={{
                            width: 14,
                            height: 14,
                            borderRadius: 3,
                            background: "#6366f1",
                            color: "#fff",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 9,
                            fontWeight: 800,
                          }}>
                            v
                          </div>
                        ) : (
                          <div style={{
                            width: 12,
                            height: 12,
                            borderRadius: 3,
                            border: isDark ? "1px solid rgba(255,255,255,0.2)" : "1px solid #cbd5e1",
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

                      {/* Date Modified (Desktop only) */}
                      {!isMobile && (
                        <div style={{ color: isDark ? "#94a3b8" : "#64748b", fontSize: 11 }}>
                          {file.dateModified}
                        </div>
                      )}

                      {/* Type (Desktop only) */}
                      {!isMobile && (
                        <div style={{
                          color: isDark ? "#94a3b8" : "#64748b",
                          fontSize: 11,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}>
                          {file.type}
                        </div>
                      )}

                      {/* Size */}
                      <div style={{
                        textAlign: "right",
                        paddingRight: 8,
                        color: isDark ? "#94a3b8" : "#64748b",
                        fontSize: 11,
                        fontWeight: 600,
                      }}>
                        {file.sizeLabel}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Bottom Bar */}
        <div
          style={{
            height: isMobile ? 54 : 64,
            borderTop: isDark ? "1px solid rgba(255,255,255,0.08)" : "1px solid rgba(0,0,0,0.08)",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 12px",
            background: isDark ? "#1e293b" : "#f1f5f9",
            gap: 8,
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, overflow: "hidden" }}>
            <div
              style={{
                flex: 1,
                maxWidth: isMobile ? 180 : 320,
                height: 28,
                background: isDark ? "#0f172a" : "#ffffff",
                border: isDark ? "1px solid rgba(255,255,255,0.12)" : "1px solid #cbd5e1",
                borderRadius: 4,
                display: "flex",
                alignItems: "center",
                padding: "0 8px",
                fontSize: 11,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                color: isDark ? "#f8fafc" : "#1e293b",
              }}
            >
              {selectedFileIds.size > 0
                ? `${selectedFileIds.size} file(s) selected`
                : currentFiles[activeFileIndex]?.name || "No file selected"}
            </div>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <button
              onClick={() => {
                if (currentFiles[activeFileIndex]) {
                  handleDirectGrab(currentFiles[activeFileIndex]);
                }
              }}
              style={{
                padding: isMobile ? "6px 10px" : "7px 16px",
                borderRadius: 6,
                border: "none",
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "#ffffff",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(16,185,129,0.35)",
                whiteSpace: "nowrap",
              }}
            >
              Grab (Fist)
            </button>

            <button
              onClick={() => handleConfirm(false)}
              style={{
                padding: isMobile ? "6px 10px" : "7px 14px",
                borderRadius: 6,
                border: "none",
                background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                color: "#ffffff",
                fontSize: 11,
                fontWeight: 700,
                cursor: "pointer",
                boxShadow: "0 2px 8px rgba(99,102,241,0.35)",
                whiteSpace: "nowrap",
              }}
            >
              Stage
            </button>

            <button
              onClick={onClose}
              style={{
                padding: isMobile ? "6px 8px" : "7px 12px",
                borderRadius: 6,
                border: isDark ? "1px solid rgba(255,255,255,0.14)" : "1px solid #cbd5e1",
                background: isDark ? "#334155" : "#ffffff",
                color: isDark ? "#f8fafc" : "#1e293b",
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                whiteSpace: "nowrap",
              }}
            >
              Close
            </button>
          </div>
        </div>
      </div>

      {/* Embedded Camera HUD: Fixed bottom-right on desktop, compact on mobile */}
      {cameraHud && (
        <div
          style={{
            position: "fixed",
            bottom: isMobile ? 8 : 16,
            right: isMobile ? 8 : 16,
            zIndex: 100020,
            width: isMobile ? 180 : 280,
            maxWidth: "calc(100vw - 32px)",
            pointerEvents: "auto",
            filter: "drop-shadow(0 15px 35px rgba(0,0,0,0.8))",
          }}
        >
          {cameraHud}
        </div>
      )}
    </div>
  );
}

export default GestureFileBrowser;
