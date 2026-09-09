import { useEffect, useState, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { signaling } from "../services/signaling";
import { webrtc } from "../services/webrtc";
import { fileTransfer, type TransferProgress } from "../services/fileTransfer";
import type { DeviceInfo } from "../types/device";
import RoomQr from "../components/RoomQr";
import FloatingGestureHUD from "../components/FloatingGestureHUD";
import type { HandTrackingData } from "../components/CameraView";
import WaterDropEffect from "../components/WaterDropEffect";
import SendDropEffect from "../components/SendDropEffect";
import GestureFileBrowser from "../components/GestureFileBrowser";
import type { GestureAction } from "../vision/gestureSequenceDetector";
import type { Gesture } from "../vision/gestureDetector";
import { useTheme } from "../utils/useTheme";
import {
  LiquidGlassCard,
  LiquidGlassPill,
  LiquidGlassCircle,
  LiquidGlassBackground,
} from "../components/liquid-glass/LiquidGlass";
import {
  IconTwoPalms,
  IconOpenPalm,
  IconFistGrab,
  IconDocument,
  IconPhone,
  IconLaptop,
  IconSendArrow,
  IconReceiveArrow,
  IconLock,
  IconSparkle,
  IconCheckCircle,
} from "../components/icons/GesturaIcons";

interface ActiveSenderState {
  senderId: string;
  senderName: string;
  fileName: string;
  fileSize?: number;
  fileCount?: number;
  fileNames?: string[];
  readyToSend: boolean;
}

function formatFileSize(bytes?: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export default function Home() {
  const { roomCode } = useParams<{ roomCode: string }>();
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();

  const fileInputRef = useRef<HTMLInputElement>(null);
  const stagedFilesRef = useRef<File[]>([]);
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [stagedTotalSize, setStagedTotalSize] = useState<number>(0);

  const [devices, setDevices] = useState<DeviceInfo[]>([]);
  const devicesRef = useRef<DeviceInfo[]>([]);
  devicesRef.current = devices;

  // Clear stale transfer/staged states whenever Home mounts fresh
  useEffect(() => {
    fileTransfer.stageFiles([]);
    stagedFilesRef.current = [];
    setStagedFiles([]);
    setStagedFileName(null);
    setStagedTotalSize(0);
    setIsSenderReady(false);
    setActiveSender(null);
  }, []);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showGestureBrowser, setShowGestureBrowser] = useState(false);
  const [handPos, setHandPos] = useState<HandTrackingData | null>(null);
  const [currentRawGesture, setCurrentRawGesture] = useState<string>("none");
  const [stagedFileName, setStagedFileName] = useState<string | null>(null);
    const [pickerActiveDevice, setPickerActiveDevice] = useState<{ id: string; name: string } | null>(null);
  const pickerActiveDeviceRef = useRef<{ id: string; name: string } | null>(null);
  pickerActiveDeviceRef.current = pickerActiveDevice;
  const [isSenderReady, setIsSenderReady] = useState(false);
  const isSenderReadyRef = useRef(false);
  useEffect(() => {
    isSenderReadyRef.current = isSenderReady;
  }, [isSenderReady]);

  // Two Palms Mobile File Picker helper banner
  const [showTwoPalmsPrompt, setShowTwoPalmsPrompt] = useState(false);
  const promptTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Active sender tracking across all devices
  const [activeSender, setActiveSender] = useState<ActiveSenderState | null>(null);
  const activeSenderRef = useRef<ActiveSenderState | null>(null);
  activeSenderRef.current = activeSender;

  const [currentTransfer, setCurrentTransfer] = useState<TransferProgress | null>(null);
  const [showWaterDropCeremony, setShowWaterDropCeremony] = useState(false);
  const [showSendCeremony, setShowSendCeremony] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(undefined);

  // Toast
  const [toastMsg, setToastMsg] = useState<string | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showToast = useCallback((msg: string, duration = 3500) => {
    setToastMsg(msg);
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
    toastTimerRef.current = setTimeout(() => setToastMsg(null), duration);
  }, []);

  const selfId = signaling.selfId;
  const isOtherSender = !!(activeSender && activeSender.senderId !== selfId);

  useEffect(() => {
    const unsubList = signaling.on("device-list", (msg) => {
      setDevices(msg.devices);

      // Deterministic single-direction initiator: only peer with higher ID initiates
      msg.devices.forEach((peer) => {
        if (peer.id !== signaling.selfId && webrtc.getState(peer.id) === "idle") {
          if ((signaling.selfId ?? "") > peer.id) {
            webrtc.connectTo(peer.id).catch(console.error);
          }
        }
      });

      if (activeSenderRef.current) {
        const senderStillPresent = msg.devices.some((d) => d.id === activeSenderRef.current?.senderId);
        if (!senderStillPresent) {
          console.log("[Home] Sender left room. Clearing active sender.");
          setActiveSender(null);
          showToast("Sender disconnected. Room reset to normal.", 3000);
        }
      }

      if (stagedFilesRef.current.length > 0 && signaling.selfId) {
        const count = stagedFilesRef.current.length;
        const totalSize = stagedFilesRef.current.reduce((acc, f) => acc + f.size, 0);
        const summary = count === 1
          ? stagedFilesRef.current[0].name
          : `${count} files (${stagedFilesRef.current.slice(0, 3).map((f) => f.name).join(", ")}${count > 3 ? "..." : ""})`;

        signaling.sendBroadcast({
          kind: isSenderReady ? "sender-ready" : "file-staged",
          senderId: signaling.selfId,
          senderName: signaling.selfName || "Peer",
          fileName: summary,
          fileSize: totalSize,
          fileCount: count,
          fileNames: stagedFilesRef.current.map((f) => f.name),
          readyToSend: isSenderReady,
        });
      }
    });

    const unsubBroadcast = signaling.on("broadcast", (msg) => {
      const data = msg.data as any;
      if (!data || typeof data !== "object") return;

      if (data.kind === "picker-opened") {
        if (data.senderId !== signaling.selfId) {
          setPickerActiveDevice({ id: data.senderId, name: data.senderName || "A peer" });
          setActiveSender({
            senderId: data.senderId,
            senderName: data.senderName || "A peer",
            fileName: "Selecting files in file explorer...",
            fileSize: 0,
            fileCount: 0,
            fileNames: [],
            readyToSend: false,
          });
          showToast(`🔒 ${data.senderName || "A peer"} opened file explorer. They are now the active sender.`, 3500);
        }
      } else if (data.kind === "picker-closed") {
        setPickerActiveDevice(null);
        if (activeSenderRef.current?.senderId === data.senderId && !activeSenderRef.current.readyToSend) {
          setActiveSender(null);
          showToast(`File explorer closed by peer. File picker is now unlocked.`, 3000);
        }
      } else if (data.kind === "file-staged") {
        if (data.senderId !== signaling.selfId) {
          setActiveSender({
            senderId: data.senderId,
            senderName: data.senderName || "A peer",
            fileName: data.fileName,
            fileSize: data.fileSize,
            fileCount: data.fileCount || 1,
            fileNames: data.fileNames,
            readyToSend: false,
          });
          showToast(`${data.senderName || "A peer"} staged "${data.fileName}". Awaiting grab gesture...`, 4000);
        }
      } else if (data.kind === "sender-ready") {
        if (data.senderId !== signaling.selfId) {
          setActiveSender({
            senderId: data.senderId,
            senderName: data.senderName || "A peer",
            fileName: data.fileName,
            fileSize: data.fileSize,
            fileCount: data.fileCount || 1,
            fileNames: data.fileNames,
            readyToSend: true,
          });
          showToast(`💧 ${data.senderName || "A peer"} is ready to send "${data.fileName}". Show OPEN PALM to receive!`, 6000);
        }
      } else if (data.kind === "file-cleared") {
        setActiveSender(null);
        showToast("Files cleared. Any device can now select files.", 3000);
      } else if (data.kind === "receiver-ready") {
        if (stagedFilesRef.current.length > 0 && (isSenderReady || isSenderReadyRef.current)) {
          const targetPeerId = data.receiverId;
          const filesToSend = [...stagedFilesRef.current];
          const count = filesToSend.length;
          showToast(`Transferring ${count} file${count > 1 ? "s" : ""} to ${data.receiverName}...`, 3000);
          fileTransfer.sendFiles(targetPeerId, filesToSend, (file, idx, total) => {
            showToast(`Sent ${file.name} (${idx}/${total})`, 2500);
          }).catch((err) => {
            console.error("Transfer error:", err);
            showToast(`Transfer failed: ${err.message}`);
          });
        }
      }
    });

    const unsubTransfer = fileTransfer.onProgress((progress) => {
      setCurrentTransfer(progress);
      if (progress.status === "complete") {
        if (progress.direction === "receive" && progress.blob) {
          if (progress.mimeType.startsWith("image/")) {
            setPreviewUrl(URL.createObjectURL(progress.blob));
          }
          setShowWaterDropCeremony(true);
          showToast(`💧 Received "${progress.name}"! Downloading to device...`, 4000);

          // Automatically download to user's device Downloads
          try {
            const blobUrl = URL.createObjectURL(progress.blob);
            const downloadLink = document.createElement("a");
            downloadLink.href = blobUrl;
            downloadLink.download = progress.name;
            document.body.appendChild(downloadLink);
            downloadLink.click();
            setTimeout(() => {
              document.body.removeChild(downloadLink);
              URL.revokeObjectURL(blobUrl);
            }, 1500);
          } catch (dlErr) {
            console.error("[Home] auto download failed:", dlErr);
          }
        }

        // File transfer completed: sender can send more files, or show Two Closed Palms to finish
        showToast(
          progress.direction === "send"
            ? `💧 Sent "${progress.name}"! Grab another file to send more, or show Two Closed Palms to finish.`
            : `💧 Received & downloaded "${progress.name}"!`,
          4000
        );
      }
    });

    return () => {
      unsubList();
      unsubBroadcast();
      unsubTransfer();
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current);
      if (promptTimerRef.current) clearTimeout(promptTimerRef.current);
    };
  }, [isSenderReady, showToast]);

  const openFileSelector = useCallback(() => {
    const sender = activeSenderRef.current;
    const isOtherActiveSender = !!(
      sender &&
      sender.senderId !== signaling.selfId &&
      devicesRef.current.some((d) => d.id === sender.senderId)
    );

    if (isOtherActiveSender && sender) {
      showToast(`${sender.senderName} has already selected a file. Please wait until current transfer clears.`, 4000);
      return;
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  }, [showToast]);

  const handleFilesSelected = useCallback((files: File[] | FileList | null, autoGrab: boolean = false) => {
    if (!files) return;
    const fileList = Array.isArray(files) ? files : Array.from(files);
    if (fileList.length === 0) return;

    setShowTwoPalmsPrompt(false);

    const currentSender = activeSenderRef.current;
    const isOtherActive = !!(
      currentSender &&
      currentSender.senderId !== signaling.selfId &&
      devicesRef.current.some((d) => d.id === currentSender.senderId)
    );
    if (isOtherActive && currentSender) {
      showToast(`${currentSender.senderName} has already selected a file. Please wait until current transfer clears.`, 4000);
      return;
    }

    stagedFilesRef.current = fileList;
    setStagedFiles(fileList);
    fileTransfer.stageFiles(fileList);

    const count = fileList.length;
    const totalBytes = fileList.reduce((acc, f) => acc + f.size, 0);
    const summaryName = count === 1
      ? fileList[0].name
      : `${count} files (${fileList.slice(0, 3).map((f) => f.name).join(", ")}${count > 3 ? "..." : ""})`;

    setStagedFileName(summaryName);
    setStagedTotalSize(totalBytes);
    if (autoGrab) {
      setIsSenderReady(true);
      isSenderReadyRef.current = true;
      setShowSendCeremony(true); // Trigger Sender Water Drop Ceremony!
      const senderState: ActiveSenderState = {
        senderId: signaling.selfId || "",
        senderName: signaling.selfName || "Peer",
        fileName: summaryName,
        fileSize: totalBytes,
        fileCount: count,
        fileNames: fileList.map((f) => f.name),
        readyToSend: true,
      };
      setActiveSender(senderState);
      signaling.sendBroadcast({
        kind: "sender-ready",
        ...senderState,
      });
      showToast(
        count === 1
          ? `💧 Grabbed "${fileList[0].name}"! Sender water effect active. Other device can show Open Palm to receive.`
          : `💧 Grabbed ${count} files! Sender water effect active. Other device can show Open Palm to receive.`,
        5000
      );
    } else {
      setIsSenderReady(false);
      isSenderReadyRef.current = false;
      const senderState: ActiveSenderState = {
        senderId: signaling.selfId || "",
        senderName: signaling.selfName || "Peer",
        fileName: summaryName,
        fileSize: totalBytes,
        fileCount: count,
        fileNames: fileList.map((f) => f.name),
        readyToSend: false,
      };
      setActiveSender(senderState);
      signaling.sendBroadcast({
        kind: "file-staged",
        ...senderState,
      });
      showToast(
        count === 1
          ? `📁 File staged: "${fileList[0].name}"! Show CLOSED PALM (Fist) to ready for transfer.`
          : `📁 ${count} files staged! Show CLOSED PALM (Fist) to ready for transfer.`,
        5000
      );
    }
  }, [showToast]);

  const handleClearStagedFile = useCallback(() => {
    stagedFilesRef.current = [];
    setStagedFiles([]);
    fileTransfer.stageFiles([]);
    setStagedFileName(null);
    setStagedTotalSize(0);
    setIsSenderReady(false);
    setActiveSender(null);
    setShowTwoPalmsPrompt(false);

    signaling.sendBroadcast({
      kind: "file-cleared",
      senderId: signaling.selfId,
    });

    showToast("Staged files cleared. All devices reset.", 2500);
  }, [showToast]);

  const handleSenderGrab = useCallback(() => {
    const files = stagedFilesRef.current;
    if (!files || files.length === 0) {
      showToast("No files staged. Show Two Palms gesture to pick files first.");
      return;
    }

    setIsSenderReady(true);
    isSenderReadyRef.current = true;
    setShowSendCeremony(true);

    const count = files.length;
    const totalBytes = files.reduce((acc, f) => acc + f.size, 0);
    const summaryName = count === 1
      ? files[0].name
      : `${count} files (${files.slice(0, 3).map((f) => f.name).join(", ")}${count > 3 ? "..." : ""})`;

    const senderState: ActiveSenderState = {
      senderId: signaling.selfId || "",
      senderName: signaling.selfName || "Peer",
      fileName: summaryName,
      fileSize: totalBytes,
      fileCount: count,
      fileNames: files.map((f) => f.name),
      readyToSend: true,
    };
    setActiveSender(senderState);

    signaling.sendBroadcast({
      kind: "sender-ready",
      ...senderState,
    });

    showToast(
      count === 1
        ? `File ready. Sharing "${files[0].name}". Receivers can present closed fist to download.`
        : `${count} files ready (${formatFileSize(totalBytes)}). Receivers can present closed fist to download.`,
      5000
    );
  }, [showToast]);

  const handleGestureAction = useCallback((action: GestureAction) => {
    console.log(`[Home] Gesture action received: ${action}`);

    if (action === "open-file-picker") {
      if (pickerActiveDeviceRef.current && pickerActiveDeviceRef.current.id !== signaling.selfId) {
        showToast(`🔒 ${pickerActiveDeviceRef.current.name} is currently using the file picker. Only one device can pick at a time.`, 4000);
        return;
      }
      const currentSender = activeSenderRef.current;
      const isOtherActive = !!(
        currentSender &&
        currentSender.senderId !== signaling.selfId &&
        devicesRef.current.some((d) => d.id === currentSender.senderId)
      );

      if (isOtherActive && currentSender) {
        showToast(`${currentSender.senderName} has already selected a file. Please wait until transfer completes.`, 4000);
      } else {
        if (typeof navigator !== "undefined" && navigator.vibrate) {
          try { navigator.vibrate([40, 30, 40]); } catch (_) { }
        }
        setPickerActiveDevice({ id: signaling.selfId || "", name: signaling.selfName || "Peer" });
        signaling.sendBroadcast({
          kind: "picker-opened",
          senderId: signaling.selfId,
          senderName: signaling.selfName || "Peer",
        });
        setShowGestureBrowser(true);
        showToast("Gesture File Explorer opened! Point 1 finger to scroll, Fist to Grab, Two Closed Palms to close.", 4000);
      }
    } else if (action === "open-native-upload") {
      // Two Closed Palms detected: Clear staged files, close file picker, reset room!
      handleClearStagedFile();
      setShowGestureBrowser(false);
      setPickerActiveDevice(null);
      signaling.sendBroadcast({
        kind: "picker-closed",
        senderId: signaling.selfId,
      });
      showToast("Two Closed Palms: File picker closed and stage cleared. Any device can now be sender.", 4000);
    } else if (action === "grab") {
      if (stagedFilesRef.current.length > 0 && !isSenderReady) {
        handleSenderGrab();
      }
    } else if (action === "release") {
      if (activeSenderRef.current && activeSenderRef.current.senderId !== signaling.selfId) {
        if (activeSenderRef.current.readyToSend) {
          showToast(`Requesting "${activeSenderRef.current.fileName}" from ${activeSenderRef.current.senderName}...`, 3000);
          signaling.sendBroadcast({
            kind: "receiver-ready",
            receiverId: signaling.selfId,
            receiverName: signaling.selfName || "Peer",
            senderId: activeSenderRef.current.senderId,
          });
        } else {
          showToast(`${activeSenderRef.current.senderName} has not initiated grab gesture yet.`, 3000);
        }
      }
    }
  }, [isSenderReady, openFileSelector, handleSenderGrab, showToast]);

  const handleRawGesture = useCallback((gesture: Gesture) => {
    const rawName = typeof gesture === "string" ? gesture : (gesture as any)?.name || "none";
    setCurrentRawGesture(rawName);
  }, []);

  return (
    <LiquidGlassBackground>
      {/* Accessible Off-screen File Input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        id="gestura-file-input"
        style={{
          position: "fixed",
          top: -9999,
          left: -9999,
          opacity: 0,
          width: 1,
          height: 1,
          pointerEvents: "none",
        }}
        onChange={(e) => {
          const files = e.target.files ? Array.from(e.target.files) : [];
          handleFilesSelected(files);
        }}
      />

      {/* Two Palms Native Trigger Banner */}
      {showTwoPalmsPrompt && !stagedFileName && (
        <label
          htmlFor="gestura-file-input"
          style={{
            position: "fixed",
            top: 24,
            left: "50%",
            transform: "translateX(-50%)",
            zIndex: 9999,
            width: "calc(100% - 32px)",
            maxWidth: 440,
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
            color: "#ffffff",
            padding: "14px 18px",
            borderRadius: 20,
            boxShadow: "0 14px 36px rgba(99, 102, 241, 0.55)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            animation: "pulse 1.6s infinite ease-in-out",
            border: "1.5px solid rgba(255, 255, 255, 0.4)",
            userSelect: "none",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 14,
              background: "rgba(255, 255, 255, 0.25)",
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0,
            }}>
              <IconTwoPalms size={24} color="#ffffff" />
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14, letterSpacing: -0.2 }}>Two Palms Detected!</div>
              <div style={{ fontSize: 12, opacity: 0.92, marginTop: 2 }}>Tap anywhere on this banner to choose file</div>
            </div>
          </div>
          <span
            style={{
              padding: "8px 14px",
              background: "rgba(255, 255, 255, 0.28)",
              borderRadius: 12,
              fontWeight: 800,
              fontSize: 12,
              letterSpacing: 0.6,
              textTransform: "uppercase",
              whiteSpace: "nowrap",
            }}
          >
            Browse
          </span>
        </label>
      )}

      {/* Floating Toast Notification */}
      {toastMsg && (
        <div
          style={{
            position: "fixed",
            top: showTwoPalmsPrompt ? 90 : 16,
            left: "50%",
            transform: "translateX(-50%)",
            background: isDark ? "rgba(17, 24, 39, 0.95)" : "rgba(15, 23, 42, 0.92)",
            backdropFilter: "blur(12px)",
            color: "#ffffff",
            padding: "10px 20px",
            borderRadius: 30,
            fontWeight: 700,
            fontSize: 13,
            boxShadow: "0 8px 32px rgba(0, 0, 0, 0.35)",
            zIndex: 9998,
            maxWidth: "92%",
            textAlign: "center",
            border: isDark ? "1px solid #374151" : "1px solid rgba(255, 255, 255, 0.15)",
          }}
        >
          {toastMsg}
        </div>
      )}

      {/* Bottom Wave Background Graphic */}
      <div
        style={{
          position: "fixed", bottom: 0, left: 0, right: 0,
          height: 240, pointerEvents: "none", zIndex: 0, overflow: "hidden",
        }}
      >
        <svg viewBox="0 0 1440 320" fill="none" style={{ width: "100%", height: "100%", opacity: isDark ? 0.30 : 0.45 }} preserveAspectRatio="none">
          <path
            d="M0,192L48,197.3C96,203,192,213,288,229.3C384,245,480,267,576,250.7C672,235,768,181,864,165.3C960,149,1056,171,1152,186.7C1248,203,1344,213,1392,218.7L1440,224L1440,320L1392,320C1344,320,1248,320,1152,320C1056,320,960,320,864,320C768,320,672,320,576,320C480,320,384,320,288,320C192,320,96,320,48,320L0,320Z"
            fill="url(#wave-grad)"
          />
          <defs>
            <linearGradient id="wave-grad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={isDark ? "#312e81" : "#ede9fe"} stopOpacity={isDark ? "0.4" : "0.85"} />
              <stop offset="50%" stopColor={isDark ? "#1e1b4b" : "#e0e7ff"} stopOpacity={isDark ? "0.2" : "0.5"} />
              <stop offset="100%" stopColor={isDark ? "#4c1d95" : "#fae8ff"} stopOpacity={isDark ? "0.35" : "0.8"} />
            </linearGradient>
          </defs>
        </svg>
      </div>

      {/* Main Dashboard Layout Container (responsive via CSS class) */}
      <div className="dashboard-container">
        {/* Top Navbar */}
        <div className="dashboard-navbar">
          <div className="dashboard-nav-left">
            {/* Brand Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <path d="M16 2L3 8.5L16 15L29 8.5L16 2Z" fill="#6366f1" />
                <path d="M3 13.5L16 20L29 13.5" stroke="#4f46e5" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M3 18.5L16 25L29 18.5" stroke="#4338ca" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <span style={{ fontSize: 18, fontWeight: 800, color: isDark ? "#f8fafc" : "#0f172a", letterSpacing: 0.5, fontFamily: "var(--font-display)" }}>
                GESTURA
              </span>
            </div>

            {/* Room Code with LiquidGlassPill */}
            <LiquidGlassPill
              tone={isDark ? "dark" : "clear"}
              interactive={false}
              style={{
                padding: "6px 14px",
                display: "inline-flex",
                alignItems: "center",
                gap: 7,
              }}
            >
              <span style={{ fontSize: 13, color: isDark ? "#94a3b8" : "#475569", fontWeight: 500 }}>
                Room: <strong style={{ color: isDark ? "#f8fafc" : "#0f172a" }}>{roomCode}</strong>
              </span>
              <button
                type="button"
                onClick={() => setShowInviteModal(true)}
                style={{
                  background: "#6366f1", color: "#fff", fontSize: 10, fontWeight: 800,
                  padding: "2px 7px", borderRadius: 10, cursor: "pointer", border: "none",
                }}
              >
                QR
              </button>
              <span
                onClick={() => setShowInviteModal(true)}
                style={{ color: "#f97316", fontSize: 18, cursor: "pointer", fontWeight: 700 }}
              >
                {"⋮"}
              </span>
            </LiquidGlassPill>
          </div>

          <div className="dashboard-nav-right">
            {/* 1st button: Light / Dark Theme toggle with LiquidGlassCircle */}
            <LiquidGlassCircle
              tone={isDark ? "dark" : "clear"}
              interactive
              onClick={toggleTheme}
              style={{
                width: 36,
                height: 36,
                color: isDark ? "#facc15" : "#475569",
              }}
              ariaLabel="Toggle Theme"
            >
              {isDark ? (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 3a9 9 0 1 0 9 9c0-.46-.04-.92-.1-1.36a5.389 5.389 0 0 1-4.4 2.26 5.403 5.403 0 0 1-3.14-9.8c-.44-.06-.9-.1-1.36-.1z" />
                </svg>
              ) : (
                <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="5" />
                  <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                  <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
                </svg>
              )}
            </LiquidGlassCircle>

            {/* 2nd button: Leave Room with LiquidGlassPill */}
            <LiquidGlassPill
              tone="dark"
              interactive
              onClick={() => { signaling.disconnect(); navigate("/"); }}
              style={{
                height: 36,
                padding: "0 14px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                background: isDark ? "rgba(239, 68, 68, 0.16)" : "rgba(254, 226, 226, 0.8)",
                borderColor: isDark ? "rgba(239, 68, 68, 0.35)" : "#fecaca",
                color: isDark ? "#f87171" : "#dc2626",
                fontWeight: 700,
                fontSize: 12,
              }}
              ariaLabel="Leave Room"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
              <span>Leave</span>
            </LiquidGlassPill>
          </div>
        </div>

        {/* Hero Banner Card (responsive via CSS class) */}
        <div className="dashboard-hero-banner">
          <div className="hero-text-content">
            <div
              style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(255, 255, 255, 0.2)", backdropFilter: "blur(8px)",
                padding: "4px 12px", borderRadius: 20, fontSize: 10, fontWeight: 800,
                letterSpacing: 1.4, textTransform: "uppercase", marginBottom: 14,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm-2 16l-4-4 1.41-1.41L10 14.17l6.59-6.59L18 9l-8 8z" />
              </svg>
              <span>ROOM CONNECTED</span>
            </div>

            <h1 className="hero-heading">
              Any device can share a file freely
            </h1>

            <p className="hero-subtext">
              {"Show Two Palms gesture to select a file,"}<br />
              {"or tap “Select File” below."}
            </p>
          </div>

          {/* Right: 3D Orbit Ring & Glass Floating File Icons */}
          <div className="hero-orbit-graphic">
            {/* Orbit ring */}
            <div style={{
              position: "absolute", width: "90%", height: "70%",
              borderRadius: "50%", border: "1.5px solid rgba(255, 255, 255, 0.35)",
              transform: "rotate(-18deg)",
              boxShadow: "0 0 24px rgba(255, 255, 255, 0.25), inset 0 0 16px rgba(255,255,255,0.15)",
              pointerEvents: "none",
            }} />

            {/* Sparkles */}
            <span style={{ position: "absolute", top: "10%", right: "14%", color: "rgba(255,255,255,0.85)" }}>
              <IconSparkle size={14} color="rgba(255,255,255,0.85)" />
            </span>
            <span style={{ position: "absolute", top: "28%", left: "7%", color: "rgba(255,255,255,0.75)" }}>
              <IconSparkle size={10} color="rgba(255,255,255,0.75)" />
            </span>
            <span style={{ position: "absolute", bottom: "12%", right: "24%", color: "rgba(255,255,255,0.75)" }}>
              <IconSparkle size={12} color="rgba(255,255,255,0.75)" />
            </span>

            {/* Document Glass Card */}
            <div style={{
              width: 68, height: 78, borderRadius: 18,
              background: "rgba(255, 255, 255, 0.3)", backdropFilter: "blur(14px)",
              border: "1px solid rgba(255, 255, 255, 0.55)",
              boxShadow: "0 16px 32px rgba(0, 0, 0, 0.16)",
              transform: "rotate(-10deg) translateX(-14px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative", zIndex: 1,
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="16" y1="13" x2="8" y2="13" /><line x1="16" y1="17" x2="8" y2="17" />
              </svg>
            </div>

            {/* Image Glass Card */}
            <div style={{
              width: 68, height: 78, borderRadius: 18,
              background: "rgba(255, 255, 255, 0.38)", backdropFilter: "blur(14px)",
              border: "1px solid rgba(255, 255, 255, 0.65)",
              boxShadow: "0 20px 36px rgba(0, 0, 0, 0.2)",
              transform: "rotate(10deg) translateX(14px)",
              display: "flex", alignItems: "center", justifyContent: "center",
              position: "relative", zIndex: 2,
            }}>
              <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <polyline points="21 15 16 10 5 21" />
              </svg>
            </div>
          </div>
        </div>

        {/* Main Content Row (responsive via CSS class) */}
        <div className="dashboard-content-row">
          {/* Left Column: Devices & Transfer */}
          <div className="devices-column">
            {/* Staged File Card with LiquidGlassCard */}
            {stagedFileName && (
              <LiquidGlassCard
                tone="violet"
                interactive={false}
                style={{
                  border: isSenderReady ? "2px solid #10b981" : "2px solid #6366f1",
                  padding: "18px 22px",
                  borderRadius: 24,
                  marginBottom: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 800, letterSpacing: 1.2,
                      color: isSenderReady ? "#10b981" : (isDark ? "#818cf8" : "#6366f1"), textTransform: "uppercase",
                    }}>
                      {isSenderReady ? (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <IconCheckCircle size={13} color="#10b981" />
                          <span>Ready to Send (Closed Palm Confirmed)</span>
                        </span>
                      ) : (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                          <IconDocument size={13} color={isDark ? "#818cf8" : "#6366f1"} />
                          <span>File Staged — Show Closed Palm</span>
                        </span>
                      )}
                    </span>
                    <div style={{
                      fontWeight: 800, fontSize: 16, color: isDark ? "#f8fafc" : "#1e293b", marginTop: 2,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {stagedFileName} {stagedTotalSize > 0 && <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#94a3b8" : "#64748b" }}>({formatFileSize(stagedTotalSize)})</span>}
                    </div>
                    {stagedFiles.length > 1 && (
                      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8, maxHeight: 110, overflowY: "auto" }}>
                        {stagedFiles.map((f, i) => (
                          <span key={i} style={{
                            padding: "3px 8px", borderRadius: 8,
                            background: isDark ? "rgba(255,255,255,0.07)" : "rgba(99,102,241,0.08)",
                            fontSize: 11, fontWeight: 600, color: isDark ? "#cbd5e1" : "#4f46e5",
                            display: "inline-flex", alignItems: "center", gap: 4,
                          }}>
                            <IconDocument size={11} />
                            <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                            <span style={{ opacity: 0.7, fontSize: 10 }}>({formatFileSize(f.size)})</span>
                          </span>
                        ))}
                      </div>
                    )}
                    <div style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b", marginTop: 4 }}>
                      {isSenderReady
                        ? "✅ Ready! Other device can now show OPEN PALM to receive."
                        : "✊ Show CLOSED PALM (Fist) to ready file for transfer."}
                    </div>
                  </div>

                  <button type="button" onClick={handleClearStagedFile}
                    style={{
                      padding: "7px 14px", borderRadius: 12,
                      background: isDark ? "rgba(239, 68, 68, 0.2)" : "#fee2e2",
                      color: isDark ? "#f87171" : "#ef4444",
                      fontWeight: 700, fontSize: 12, border: "none", cursor: "pointer",
                      flexShrink: 0,
                    }}
                  >
                    Clear
                  </button>
                </div>

                {!isSenderReady && (
                  <button type="button" onClick={handleSenderGrab}
                    style={{
                      padding: "10px 18px", borderRadius: 14, background: "linear-gradient(135deg, #6366f1, #4f46e5)",
                      color: "#fff", fontWeight: 700, fontSize: 13, border: "none",
                      cursor: "pointer", alignSelf: "flex-start",
                      boxShadow: "0 4px 14px rgba(99, 102, 241, 0.35)",
                      display: "inline-flex", alignItems: "center", gap: 8,
                    }}
                  >
                    <IconFistGrab size={15} color="#fff" />
                    <span>Ready File (Grab)</span>
                  </button>
                )}
              </LiquidGlassCard>
            )}

            {/* Incoming File Card for Receiver */}
            {isOtherSender && activeSender && (
              <LiquidGlassCard
                tone="emerald"
                interactive={false}
                style={{
                  border: activeSender.readyToSend ? "2px solid #10b981" : "2px solid #f59e0b",
                  padding: "18px 22px",
                  borderRadius: 24,
                  marginBottom: 20,
                  display: "flex",
                  flexDirection: "column",
                  gap: 12,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <span style={{
                      fontSize: 11, fontWeight: 800, letterSpacing: 1.2,
                      color: activeSender.readyToSend ? "#10b981" : "#f59e0b", textTransform: "uppercase",
                      display: "inline-flex", alignItems: "center", gap: 6,
                    }}>
                      {activeSender.readyToSend ? (
                        <>
                          <IconCheckCircle size={13} color="#10b981" />
                          <span>Ready to Receive — Show Open Palm</span>
                        </>
                      ) : (
                        <>
                          <IconDocument size={13} color="#f59e0b" />
                          <span>File Staged by {activeSender.senderName}</span>
                        </>
                      )}
                    </span>
                    <div style={{
                      fontWeight: 800, fontSize: 16, color: isDark ? "#f8fafc" : "#1e293b", marginTop: 2,
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {activeSender.fileName} {activeSender.fileSize > 0 && <span style={{ fontSize: 13, fontWeight: 600, color: isDark ? "#94a3b8" : "#64748b" }}>({formatFileSize(activeSender.fileSize)})</span>}
                    </div>
                    <div style={{ fontSize: 12, color: isDark ? "#94a3b8" : "#64748b", marginTop: 4 }}>
                      {activeSender.readyToSend
                        ? "✋ Show OPEN PALM to receive, or click the button below!"
                        : `Waiting for ${activeSender.senderName} to show Closed Palm (Fist)...`}
                    </div>
                  </div>
                </div>

                {activeSender.readyToSend && (
                  <button
                    type="button"
                    onClick={() => {
                      showToast(`Requesting "${activeSender.fileName}" from ${activeSender.senderName}...`, 3000);
                      signaling.sendBroadcast({
                        kind: "receiver-ready",
                        receiverId: signaling.selfId,
                        receiverName: signaling.selfName || "Peer",
                        senderId: activeSender.senderId,
                      });
                    }}
                    style={{
                      padding: "10px 18px", borderRadius: 14, background: "linear-gradient(135deg, #10b981, #059669)",
                      color: "#fff", fontWeight: 700, fontSize: 13, border: "none",
                      cursor: "pointer", alignSelf: "flex-start",
                      boxShadow: "0 4px 14px rgba(16, 185, 129, 0.4)",
                      display: "inline-flex", alignItems: "center", gap: 8,
                    }}
                  >
                    <span>✋ Receive File (Open Palm)</span>
                  </button>
                )}
              </LiquidGlassCard>
            )}

            {/* Connected Devices Card with LiquidGlassCard */}
            <LiquidGlassCard
              tone={isDark ? "dark" : "clear"}
              interactive={false}
              style={{
                borderRadius: 24,
                padding: "20px 22px",
                marginBottom: 20,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 8, flexWrap: "wrap" }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: isDark ? "#f8fafc" : "#1e293b" }}>
                  Connected Devices ({devices.length})
                </span>

                {!isOtherSender && !stagedFileName && (
                  <LiquidGlassPill
                    tone="violet"
                    interactive
                    onClick={() => {
                      if (pickerActiveDeviceRef.current && pickerActiveDeviceRef.current.id !== signaling.selfId) {
                        showToast(`🔒 ${pickerActiveDeviceRef.current.name} currently has file explorer open.`, 3500);
                        return;
                      }
                      setPickerActiveDevice({ id: signaling.selfId || "", name: signaling.selfName || "Peer" });
                      signaling.sendBroadcast({
                        kind: "picker-opened",
                        senderId: signaling.selfId,
                        senderName: signaling.selfName || "Peer",
                      });
                      setShowGestureBrowser(true);
                    }}
                    style={{
                      padding: "7px 14px",
                      fontWeight: 700,
                      fontSize: 12,
                      color: isDark ? "#c7d2fe" : "#6366f1",
                      whiteSpace: "nowrap",
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <IconDocument size={14} />
                    <span>Select File</span>
                  </LiquidGlassPill>
                )}

                {isOtherSender && (
                  <span style={{
                    fontSize: 11, fontWeight: 700,
                    color: isDark ? "#64748b" : "#94a3b8",
                    display: "inline-flex", alignItems: "center", gap: 5,
                  }}>
                    <IconLock size={12} />
                    <span>{activeSender?.senderName} staged file</span>
                  </span>
                )}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {devices.map((device) => {
                  const isMe = device.id === selfId;
                  const isThisDeviceSender = activeSender?.senderId === device.id;
                  return (
                    <div key={device.id} style={{
                      background: isThisDeviceSender
                        ? (isDark ? "rgba(59, 130, 246, 0.2)" : "#eff6ff")
                        : isMe
                          ? (isDark ? "rgba(34, 197, 94, 0.14)" : "#f0fdf4")
                          : (isDark ? "rgba(30, 41, 59, 0.6)" : "#f8fafc"),
                      border: isThisDeviceSender
                        ? (isDark ? "1px solid rgba(59, 130, 246, 0.4)" : "1px solid #bfdbfe")
                        : isMe
                          ? (isDark ? "1px solid rgba(34, 197, 94, 0.35)" : "1px solid #bbf7d0")
                          : (isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0"),
                      borderRadius: 14, padding: "10px 14px",
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0, flex: 1 }}>
                        <div style={{
                          width: 34, height: 34, borderRadius: 10, flexShrink: 0,
                          background: device.type === "phone"
                            ? (isDark ? "rgba(245, 158, 11, 0.25)" : "#fef3c7")
                            : (isDark ? "rgba(56, 189, 248, 0.25)" : "#e0f2fe"),
                          display: "flex", alignItems: "center", justifyContent: "center",
                          color: device.type === "phone" ? "#f59e0b" : "#38bdf8",
                        }}>
                          {device.type === "phone" ? <IconPhone size={18} /> : <IconLaptop size={18} />}
                        </div>
                        <span style={{
                          fontWeight: 700, fontSize: 14,
                          color: isDark ? "#f8fafc" : "#1e293b",
                          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        }}>
                          {device.name || (device.type === "phone" ? "Phone 1" : "Laptop 1")}
                        </span>
                        {isMe && (
                          <span style={{
                            background: "#22c55e", color: "#fff", fontSize: 9, fontWeight: 800,
                            padding: "2px 6px", borderRadius: 6, letterSpacing: 0.5, textTransform: "uppercase",
                            flexShrink: 0,
                          }}>ME</span>
                        )}
                        {isThisDeviceSender && (
                          <span style={{
                            background: "#3b82f6", color: "#fff", fontSize: 9, fontWeight: 800,
                            padding: "2px 6px", borderRadius: 6, letterSpacing: 0.5, textTransform: "uppercase",
                            flexShrink: 0,
                          }}>SENDER</span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#16a34a", display: "inline-block" }} />
                        <span style={{ fontSize: 12, fontWeight: 600, color: "#16a34a" }}>Active</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </LiquidGlassCard>

            {/* Transfer Progress with LiquidGlassCard */}
            {currentTransfer && currentTransfer.status === "in-progress" && (
              <LiquidGlassCard
                tone={isDark ? "dark" : "clear"}
                interactive={false}
                style={{
                  padding: "14px 18px", borderRadius: 18, marginBottom: 20,
                  color: isDark ? "#f8fafc" : "#1e293b",
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 13, fontWeight: 700 }}>
                  <span style={{
                    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1,
                    display: "inline-flex", alignItems: "center", gap: 6,
                  }}>
                    {currentTransfer.direction === "send" ? (
                      <IconSendArrow size={14} color="#6366f1" />
                    ) : (
                      <IconReceiveArrow size={14} color="#10b981" />
                    )}
                    <span>{currentTransfer.direction === "send" ? "Sending" : "Receiving"} {currentTransfer.name}</span>
                  </span>
                  <span style={{ flexShrink: 0, marginLeft: 8 }}>
                    {Math.round((currentTransfer.bytesTransferred / currentTransfer.size) * 100)}%
                  </span>
                </div>
                <div style={{ width: "100%", height: 7, background: isDark ? "#1e293b" : "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
                  <div style={{
                    width: `${(currentTransfer.bytesTransferred / currentTransfer.size) * 100}%`,
                    height: "100%", background: "#6366f1", transition: "width 0.1s ease",
                  }} />
                </div>
              </LiquidGlassCard>
            )}
          </div>

          {/* Right Column: Floating Gesture HUD (hidden when file browser is open, rendered separately) */}
          {!showGestureBrowser && (
            <div className="hud-column">
              <FloatingGestureHUD
                onActionDetected={handleGestureAction}
                onRawGesture={handleRawGesture}
                onHandPosition={setHandPos}
                stagedFileName={stagedFileName || activeSender?.fileName}
              />
            </div>
          )}
        </div>
      </div>

      {/* Invite QR Modal */}
      {showInviteModal && (
        <RoomQr roomCode={roomCode || ""} onClose={() => setShowInviteModal(false)} />
      )}

      {/* Water Drop Receive Ceremony */}
      {showWaterDropCeremony && (
        <WaterDropEffect
          fileName={currentTransfer?.name || activeSender?.fileName || "Shared File"}
          previewUrl={previewUrl}
          onComplete={() => { setShowWaterDropCeremony(false); setPreviewUrl(undefined); }}
        />
      )}

      {/* Send Ceremony */}
      {showSendCeremony && (
        <SendDropEffect
          fileName={stagedFileName || "File"}
          onComplete={() => setShowSendCeremony(false)}
        />
      )}

      {/* In-App Gesture File Browser with embedded Camera HUD */}
      {showGestureBrowser && (
        <GestureFileBrowser
          isOpen={showGestureBrowser}
          onClose={() => {
            setShowGestureBrowser(false);
            setPickerActiveDevice(null);
            handleClearStagedFile();
            signaling.sendBroadcast({
              kind: "picker-closed",
              senderId: signaling.selfId,
            });
          }}
          onConfirmFiles={(files, autoGrab) => {
            // DO NOT close file explorer here!
            // It remains OPEN as requested by the user until Two Closed Palms is shown!
            handleFilesSelected(files, autoGrab);
          }}
          onOpenNativePicker={() => {
            setShowGestureBrowser(false);
            openFileSelector();
          }}
          handPosition={handPos}
          currentGesture={currentRawGesture}
          cameraHud={
            <FloatingGestureHUD
              onActionDetected={handleGestureAction}
              onRawGesture={handleRawGesture}
              onHandPosition={setHandPos}
              stagedFileName={stagedFileName || activeSender?.fileName}
            />
          }
        />
      )}


    </LiquidGlassBackground>
  );
}
