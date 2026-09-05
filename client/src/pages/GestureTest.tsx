import { useState } from "react";
import { useNavigate } from "react-router-dom";
import CameraView from "../components/CameraView";
import type { Gesture } from "../vision/gestureDetector";

const GESTURE_LABEL: Record<Gesture, string> = {
  fist: "CLOSED FIST",
  "open-palm": "OPEN PALM",
  "two-palms": "TWO PALMS",
  none: "no gesture",
};

const GESTURE_COLOR: Record<Gesture, string> = {
  fist: "#fdcb6e",
  "open-palm": "#00b894",
  "two-palms": "#0984e3",
  none: "#b2bec3",
};

export default function GestureTest() {
  const navigate = useNavigate();
  const [active, setActive] = useState(false);
  const [gesture, setGesture] = useState<Gesture>("none");

  return (
    <div className="app-container">
      <header className="page-header">
        <button type="button" className="icon-btn" onClick={() => navigate("/")} aria-label="Back">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>
        <h2 className="page-header-title">Gesture Test</h2>
      </header>

      <div style={{ textAlign: "center", margin: "20px 0" }}>
        <button
          type="button"
          onClick={() => setActive((v) => !v)}
          style={{
            padding: "12px 24px",
            borderRadius: 16,
            background: active ? "#d63031" : "var(--color-primary)",
            color: "#fff",
            fontWeight: 700,
          }}
        >
          {active ? "Stop Camera" : "Start Camera Test"}
        </button>
      </div>

      {active && (
        <div style={{ margin: "20px 0" }}>
          <CameraView active={active} onGestureChange={(g) => setGesture(g)} />
        </div>
      )}

      <div className="status-pill-card" style={{ justifyContent: "center", marginTop: 20 }}>
        <span style={{ fontSize: 16, fontWeight: 800, color: GESTURE_COLOR[gesture] }}>
          Current Gesture: {GESTURE_LABEL[gesture]}
        </span>
      </div>
    </div>
  );
}
