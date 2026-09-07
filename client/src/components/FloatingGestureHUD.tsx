import { useState, useRef, useCallback } from "react";
import CameraView from "./CameraView";
import { GestureSequenceDetector, type GestureAction } from "../vision/gestureSequenceDetector";
import type { Gesture } from "../vision/gestureDetector";
import { useTheme } from "../utils/useTheme";
import { LiquidGlassCard } from "./liquid-glass/LiquidGlass";
import {
  IconTwoPalms,
  IconOpenPalm,
  IconFistGrab,
  IconDocument,
  IconReceiveArrow,
} from "./icons/GesturaIcons";

interface Props {
  onActionDetected: (action: GestureAction) => void;
  onRawGesture?: (gesture: Gesture) => void;
  stagedFileName?: string | null;
}

export default function FloatingGestureHUD({ onActionDetected, onRawGesture, stagedFileName }: Props) {
  const { isDark } = useTheme();
  const [minimized, setMinimized] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<"loading" | "ready" | "error">("loading");
  const [activeGesture, setActiveGesture] = useState<Gesture>("none");
  const [lastAction, setLastAction] = useState<GestureAction>("none");
  const sequenceDetectorRef = useRef(new GestureSequenceDetector());

  const handleGestureChange = useCallback((gesture: Gesture) => {
    setActiveGesture(gesture);
    onRawGesture?.(gesture);
    const action = sequenceDetectorRef.current.update(gesture);
    if (action !== "none") {
      setLastAction(action);
      onActionDetected(action);
      setTimeout(() => setLastAction("none"), 3500);
    }
  }, [onActionDetected, onRawGesture]);

  return (
    <LiquidGlassCard
      tone={isDark ? "dark" : "clear"}
      interactive={false}
      className="hud-card-container"
      style={{
        padding: 16,
        borderRadius: 24,
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#6366f1">
            <rect x="4" y="8" width="3" height="8" rx="1.5" />
            <rect x="10.5" y="4" width="3" height="16" rx="1.5" />
            <rect x="17" y="7" width="3" height="10" rx="1.5" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 800, color: isDark ? "#f8fafc" : "#334155", letterSpacing: 0.8 }}>
            GESTURE HUD
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMinimized((v) => !v)}
          style={{
            background: "none", border: "none", color: "#94a3b8",
            fontSize: 16, fontWeight: 700, cursor: "pointer", padding: "0 4px",
          }}
          aria-label="Toggle HUD"
        >
          {minimized ? "+" : "\u2014"}
        </button>
      </div>

      {!minimized && (
        <div>
          {/* Camera preview box */}
          <div style={{
            background: "#111827", borderRadius: 18,
            height: 165, position: "relative", overflow: "hidden",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          }}>
            <div style={{ position: "absolute", inset: 0, opacity: 0.75 }}>
              <CameraView active={true} onGestureChange={handleGestureChange} onStatusChange={setCameraStatus} showPreview={true} />
            </div>

            {/* Camera Status Badge */}
            <div style={{
              position: "absolute", top: 10, left: 10,
              display: "flex", alignItems: "center", gap: 5,
              background: "rgba(0,0,0,0.65)", borderRadius: 20, padding: "3px 8px", zIndex: 4,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%",
                background: cameraStatus === "ready" ? "#ef4444" : cameraStatus === "error" ? "#dc2626" : "#f59e0b",
                display: "inline-block",
                boxShadow: cameraStatus === "ready" ? "0 0 6px #ef4444" : "0 0 6px #f59e0b",
                animation: cameraStatus === "ready" ? "pulse 1.2s infinite ease-in-out" : "pulse 0.8s infinite ease-in-out",
              }} />
              <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", letterSpacing: 1 }}>
                {cameraStatus === "ready" ? "LIVE" : cameraStatus === "error" ? "ERROR" : "WARMING UP"}
              </span>
            </div>

            {/* Center overlay label */}
            <div style={{
              position: "relative", zIndex: 3, display: "flex",
              flexDirection: "column", alignItems: "center", pointerEvents: "none",
            }}>
              <svg
                width="64" height="40" viewBox="0 0 80 48" fill="none"
                style={{
                  filter: activeGesture !== "none"
                    ? "drop-shadow(0 0 10px rgba(56, 189, 248, 0.9))"
                    : "drop-shadow(0 0 6px rgba(56, 189, 248, 0.6))",
                }}
              >
                <path d="M12 40V24M18 40V16M24 40V14M30 40V18M6 40V28" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M4 42C4 42 16 46 32 42" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
                <path d="M68 40V24M62 40V16M56 40V14M50 40V18M74 40V28" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
                <path d="M48 42C48 42 64 46 76 42" stroke="#38bdf8" strokeWidth="2.5" strokeLinecap="round" />
              </svg>

              <div style={{ color: "#fff", fontSize: 13, fontWeight: 700, marginTop: 6 }}>
                {cameraStatus === "loading"
                  ? "Loading Vision AI..."
                  : cameraStatus === "error"
                  ? "Camera Error"
                  : activeGesture === "none"
                  ? "Present hand"
                  : activeGesture === "two-palms"
                  ? "Two Palms Active"
                  : activeGesture === "open-palm"
                  ? "Open Palm Active"
                  : "Fist Detected"}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 1 }}>
                {cameraStatus === "loading"
                  ? "Downloading neural model"
                  : activeGesture === "none"
                  ? "Optical Tracker Ready"
                  : "Locked On"}
              </div>
            </div>
          </div>

          {/* Action indicator */}
          {lastAction !== "none" && (
            <div
              onClick={() => { if (lastAction === "open-file-picker") onActionDetected("open-file-picker"); }}
              style={{
                marginTop: 8, padding: "7px 12px", borderRadius: 12,
                display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                fontWeight: 700, fontSize: 11,
                background: lastAction === "open-file-picker" ? "#6c5ce7" : lastAction === "grab" ? "#f59e0b" : "#10b981",
                color: "#fff",
                cursor: lastAction === "open-file-picker" ? "pointer" : "default",
                boxShadow: "0 4px 14px rgba(0,0,0,0.15)",
              }}
            >
              {lastAction === "open-file-picker" && (
                <>
                  <IconTwoPalms size={14} color="#fff" />
                  <span>OPEN FILE PICKER (CLICK)</span>
                </>
              )}
              {lastAction === "grab" && (
                <>
                  <IconFistGrab size={14} color="#fff" />
                  <span>GRABBED • READY TO SEND</span>
                </>
              )}
              {lastAction === "release" && (
                <>
                  <IconReceiveArrow size={14} color="#fff" />
                  <span>RECEIVING FILE DATA</span>
                </>
              )}
            </div>
          )}

          {/* Bottom Classy Gesture Reference Guide */}
          <div style={{
            background: isDark ? "rgba(30, 41, 59, 0.65)" : "rgba(241, 245, 249, 0.8)",
            border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
            borderRadius: 14, padding: "10px 12px",
            marginTop: 12,
            color: isDark ? "#cbd5e1" : "#475569",
            fontSize: 11, fontWeight: 600,
            display: "flex", flexDirection: "column", gap: 6,
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <IconTwoPalms size={13} color="#6366f1" />
                <span>Two Palms</span>
              </span>
              <span style={{ color: isDark ? "#94a3b8" : "#64748b", fontSize: 10, fontWeight: 700 }}>Pick File</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <IconOpenPalm size={13} color="#10b981" />
                <span>Open Palm</span>
              </span>
              <span style={{ color: isDark ? "#94a3b8" : "#64748b", fontSize: 10, fontWeight: 700 }}>Ready / Share</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                <IconFistGrab size={13} color="#f59e0b" />
                <span>Closed Fist</span>
              </span>
              <span style={{ color: isDark ? "#94a3b8" : "#64748b", fontSize: 10, fontWeight: 700 }}>Receive / Accept</span>
            </div>
          </div>

          {stagedFileName && (
            <div style={{
              marginTop: 8, padding: "7px 10px", borderRadius: 10,
              background: isDark ? "rgba(30, 41, 59, 0.8)" : "#f1f5f9",
              border: isDark ? "1px solid rgba(255, 255, 255, 0.08)" : "1px solid #e2e8f0",
              color: isDark ? "#e2e8f0" : "#334155",
              fontSize: 11, fontWeight: 600,
              display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
              whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}
            title={stagedFileName}
            >
              <IconDocument size={13} color="#6366f1" />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{stagedFileName}</span>
            </div>
          )}
        </div>
      )}
    </LiquidGlassCard>
  );
}
