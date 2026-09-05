import { useState, useRef, useCallback } from "react";
import CameraView from "./CameraView";
import { GestureSequenceDetector, type GestureAction } from "../vision/gestureSequenceDetector";
import type { Gesture } from "../vision/gestureDetector";
import { useTheme } from "../utils/useTheme";

interface Props {
  onActionDetected: (action: GestureAction) => void;
  onRawGesture?: (gesture: Gesture) => void;
  stagedFileName?: string | null;
}

export default function FloatingGestureHUD({ onActionDetected, onRawGesture, stagedFileName }: Props) {
  const { isDark } = useTheme();
  const [minimized, setMinimized] = useState(false);
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
    <div
      className="hud-card-container"
      style={{
        background: isDark ? "#111827" : "#ffffff",
        borderColor: isDark ? "#1f2937" : "#eef2f6",
        boxShadow: isDark ? "0 8px 30px rgba(0, 0, 0, 0.45)" : "0 8px 30px rgba(0, 0, 0, 0.06)",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#6366f1">
            <rect x="4" y="8" width="3" height="8" rx="1.5" />
            <rect x="10.5" y="4" width="3" height="16" rx="1.5" />
            <rect x="17" y="7" width="3" height="10" rx="1.5" />
          </svg>
          <span style={{ fontSize: 12, fontWeight: 800, color: isDark ? "#f8fafc" : "#334155", letterSpacing: 0.5 }}>
            GESTURE HUD
          </span>
        </div>
        <button
          type="button"
          onClick={() => setMinimized((v) => !v)}
          style={{
            background: "none", border: "none", color: isDark ? "#94a3b8" : "#94a3b8",
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
              <CameraView active={true} onGestureChange={handleGestureChange} showPreview={true} />
            </div>

            {/* LIVE Badge */}
            <div style={{
              position: "absolute", top: 10, left: 10,
              display: "flex", alignItems: "center", gap: 5,
              background: "rgba(0,0,0,0.55)", borderRadius: 20, padding: "3px 8px", zIndex: 4,
            }}>
              <span style={{
                width: 6, height: 6, borderRadius: "50%", background: "#ef4444",
                display: "inline-block", boxShadow: "0 0 6px #ef4444",
                animation: "pulse 1.2s infinite ease-in-out",
              }} />
              <span style={{ fontSize: 9, fontWeight: 800, color: "#fff", letterSpacing: 1 }}>LIVE</span>
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
                {activeGesture === "none" ? "Show your hand"
                  : activeGesture === "two-palms" ? "Two Palms"
                  : activeGesture === "open-palm" ? "Open Palm"
                  : "Fist"}
              </div>
              <div style={{ color: "#94a3b8", fontSize: 11, marginTop: 1 }}>
                {activeGesture === "none" ? "Show hand" : "Detected"}
              </div>
            </div>
          </div>

          {/* Action indicator */}
          {lastAction !== "none" && (
            <div
              onClick={() => { if (lastAction === "open-file-picker") onActionDetected("open-file-picker"); }}
              style={{
                marginTop: 8, padding: "6px 12px", borderRadius: 12,
                textAlign: "center", fontWeight: 700, fontSize: 11,
                background: lastAction === "open-file-picker" ? "#6c5ce7" : lastAction === "grab" ? "#f59e0b" : "#10b981",
                color: "#fff",
                cursor: lastAction === "open-file-picker" ? "pointer" : "default",
              }}
            >
              {lastAction === "open-file-picker" && "\ud83d\udd90\ufe0f\ud83d\udd90\ufe0f OPENING PICKER (TAP)"}
              {lastAction === "grab" && "\u270a GRABBED - READY TO SEND!"}
              {lastAction === "release" && "\ud83d\udd90\ufe0f RECEIVING FILE!"}
            </div>
          )}

          {/* Bottom helper pill */}
          <div style={{
            background: isDark ? "rgba(245, 158, 11, 0.16)" : "#fef3c7",
            border: isDark ? "1px solid rgba(245, 158, 11, 0.3)" : "none",
            borderRadius: 14, padding: "10px 12px",
            marginTop: 12,
            color: isDark ? "#fde68a" : "#78350f",
            fontSize: 11, fontWeight: 600,
            lineHeight: 1.5, textAlign: "center",
          }}>
            <div>{"\u270b \u270b Two palms = pick  |  \ud83d\udcc1"}</div>
            <div style={{ marginTop: 2 }}>{"\u270b = send  |  \u270a = receive"}</div>
          </div>

          {stagedFileName && (
            <div style={{
              marginTop: 8, padding: "6px 10px", borderRadius: 10,
              background: isDark ? "#1e293b" : "#f1f5f9",
              color: isDark ? "#e2e8f0" : "#334155",
              fontSize: 11, fontWeight: 600,
              textAlign: "center", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
            }}>
              {"\ud83d\udcc1 "}{stagedFileName}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
