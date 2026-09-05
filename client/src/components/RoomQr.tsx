import { useEffect, useState } from "react";
import QRCode from "qrcode";
import { useTheme } from "../utils/useTheme";

interface Props {
  roomCode: string;
  onClose?: () => void;
}

export default function RoomQr({ roomCode, onClose }: Props) {
  const { isDark } = useTheme();
  const [dataUrl, setDataUrl] = useState<string | null>(null);

  useEffect(() => {
    const joinUrl = `${window.location.origin}/join/${roomCode}`;
    QRCode.toDataURL(joinUrl, {
      margin: 1,
      width: 220,
      color: { dark: "#1c1c2e", light: "#ffffff" },
    })
      .then(setDataUrl)
      .catch(() => setDataUrl(null));
  }, [roomCode]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 999,
        background: "rgba(10, 15, 29, 0.8)",
        backdropFilter: "blur(8px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 20,
      }}
    >
      <div
        style={{
          background: isDark ? "#111827" : "#ffffff",
          border: isDark ? "1px solid #1f2937" : "none",
          borderRadius: 24,
          padding: 24,
          maxWidth: 320,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
          boxShadow: isDark ? "0 24px 50px rgba(0,0,0,0.6)" : "0 20px 40px rgba(0,0,0,0.15)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", width: "100%", alignItems: "center" }}>
          <span style={{ fontWeight: 800, fontSize: 18, color: isDark ? "#f8fafc" : "#0f172a" }}>Room QR Code</span>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              style={{
                background: isDark ? "#1e293b" : "#f1f5f9",
                color: isDark ? "#f8fafc" : "#0f172a",
                border: "none",
                borderRadius: 10,
                padding: "6px 12px",
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          )}
        </div>

        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`QR Code for room ${roomCode}`}
            style={{
              borderRadius: 16,
              width: 220,
              height: 220,
              background: "#ffffff",
              padding: 8,
              boxShadow: "0 4px 14px rgba(0,0,0,0.1)",
            }}
          />
        ) : (
          <div style={{ width: 220, height: 220, display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b" }}>
            Generating QR...
          </div>
        )}

        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 12, textTransform: "uppercase", letterSpacing: 1.5, color: isDark ? "#94a3b8" : "#64748b", fontWeight: 700 }}>
            Room Code
          </div>
          <div style={{ fontSize: 24, fontWeight: 900, color: isDark ? "#818cf8" : "var(--color-primary)", letterSpacing: 2 }}>
            {roomCode}
          </div>
        </div>

        <p style={{ fontSize: 13, color: isDark ? "#94a3b8" : "#64748b", textAlign: "center", margin: 0 }}>
          Scan with any phone camera to join directly.
        </p>
      </div>
    </div>
  );
}
