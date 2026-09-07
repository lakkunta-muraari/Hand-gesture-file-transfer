import { useEffect, useState } from "react";
import { getHandLandmarker } from "../vision/handLandmarker";
import { useNavigate } from "react-router-dom";
import { signaling } from "../services/signaling";
import { guessDeviceType } from "../types/device";
import FallingWordmark from "../components/FallingWordmark";
import { useTheme } from "../utils/useTheme";

function generateRoomCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export default function Landing() {
  const navigate = useNavigate();
  const { isDark, toggleTheme } = useTheme();
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [introDone, setIntroDone] = useState(false);

  useEffect(() => {
    // Warm up and cache MediaPipe model in background
    getHandLandmarker().catch(() => {});
  }, []);

  async function connectAndGo(roomCode: string) {
    setError(null);
    setConnecting(true);
    const type = guessDeviceType();
    try {
      await signaling.connect(roomCode, "", type);
      navigate(`/room/${roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect.");
      setConnecting(false);
    }
  }

  return (
    <div className="app-container" style={{ justifyContent: "center", position: "relative" }}>
      {/* Top Bar with Theme Toggle */}
      <div style={{ position: "absolute", top: 20, right: 20, zIndex: 10 }}>
        <button
          type="button"
          onClick={toggleTheme}
          title={isDark ? "Switch to Light Theme" : "Switch to Dark Theme"}
          aria-label="Toggle Theme"
          style={{
            width: 38, height: 38, borderRadius: "50%",
            background: isDark ? "#111827" : "#ffffff",
            border: isDark ? "1px solid #1f2937" : "1px solid #e2e8f0",
            display: "flex", alignItems: "center", justifyContent: "center",
            color: isDark ? "#facc15" : "#475569",
            cursor: "pointer",
            boxShadow: isDark ? "0 0 14px rgba(250, 204, 21, 0.2)" : "0 2px 8px rgba(0,0,0,0.06)",
            transition: "all 0.2s ease",
          }}
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
        </button>
      </div>

      {/* Hero Visual */}
      <div className="hero-section" style={{ marginTop: 20 }}>
        <FallingWordmark word="GESTURA" onDone={() => setIntroDone(true)} />
        <p className="hero-subtitle" style={{ opacity: introDone ? 1 : 0, transition: "opacity 0.4s ease", color: isDark ? "#94a3b8" : undefined }}>
          Share files with a simple gesture
        </p>

        {/* Central Orb */}
        <div
          className="hero-orb-container"
          style={{
            margin: "32px 0",
            opacity: introDone ? 1 : 0,
            transform: introDone ? "scale(1)" : "scale(0.85)",
            transition: "opacity 0.5s ease, transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)",
          }}
        >
          <div className="hero-orb-glow"></div>
          <div className="hero-orb-ring"></div>
          <div className="hero-orb-core">
            <svg
              className="hero-orb-icon"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="17 1 21 5 17 9" />
              <path d="M3 11V9a4 4 0 0 1 4-4h14" />
              <polyline points="7 23 3 19 7 15" />
              <path d="M21 13v2a4 4 0 0 1-4 4H3" />
            </svg>
          </div>
        </div>
      </div>

      {/* Buttons */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 14,
          opacity: introDone ? 1 : 0,
          transform: introDone ? "translateY(0)" : "translateY(10px)",
          transition: "opacity 0.4s ease 0.1s, transform 0.4s ease 0.1s",
        }}
      >
        <button
          type="button"
          disabled={connecting}
          onClick={() => connectAndGo(generateRoomCode())}
          style={{
            padding: "16px 20px",
            borderRadius: 20,
            background: "linear-gradient(135deg, #6c5ce7 0%, #0984e3 100%)",
            color: "#ffffff",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 16,
            boxShadow: "0 8px 24px rgba(108, 92, 231, 0.3)",
            cursor: "pointer",
          }}
        >
          {connecting ? "Connecting..." : "Create Room"}
        </button>

        <button
          type="button"
          disabled={connecting}
          onClick={() => navigate("/scan")}
          style={{
            padding: "16px 20px",
            borderRadius: 20,
            background: isDark ? "#111827" : "#ffffff",
            border: isDark ? "1px solid #1f2937" : "1px solid rgba(108, 92, 231, 0.2)",
            color: isDark ? "#c7d2fe" : "var(--color-primary)",
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 16,
            boxShadow: isDark ? "0 4px 16px rgba(0, 0, 0, 0.4)" : "0 4px 16px rgba(0, 0, 0, 0.04)",
            cursor: "pointer",
          }}
        >
          Scan QR Code
        </button>

        {!showManual ? (
          <button
            type="button"
            onClick={() => setShowManual(true)}
            style={{
              marginTop: 6,
              background: "none",
              border: "none",
              color: isDark ? "#94a3b8" : "var(--color-text-sub)",
              fontSize: 13,
              cursor: "pointer",
              textAlign: "center",
            }}
          >
            Enter room code manually
          </button>
        ) : (
          <div className="status-pill-card" style={{ flexDirection: "column", gap: 10, alignItems: "stretch", marginTop: 10 }}>
            <input
              placeholder="ENTER ROOM CODE"
              value={manualCode}
              onChange={(e) => setManualCode(e.target.value.toUpperCase().trim())}
              maxLength={6}
              style={{
                width: "100%",
                padding: "14px 16px",
                borderRadius: 14,
                background: isDark ? "#111827" : "#ffffff",
                border: isDark ? "1px solid #1f2937" : "1px solid rgba(0,0,0,0.1)",
                color: isDark ? "#f8fafc" : "#1e1e2d",
                fontSize: 16,
                letterSpacing: 2,
                fontWeight: 700,
                textAlign: "center",
              }}
            />
            <button
              type="button"
              disabled={connecting || manualCode.length < 4}
              onClick={() => connectAndGo(manualCode)}
              style={{
                padding: "12px 16px",
                borderRadius: 14,
                background: "var(--color-primary)",
                color: "#ffffff",
                fontWeight: 600,
                fontSize: 15,
                cursor: "pointer",
              }}
            >
              Join Room
            </button>
          </div>
        )}

        {error && <p style={{ color: "#ef4444", fontSize: 13, textAlign: "center", marginTop: 8 }}>{error}</p>}
      </div>
    </div>
  );
}
