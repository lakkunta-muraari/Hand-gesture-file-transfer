import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import jsQR from "jsqr";
import { signaling } from "../services/signaling";
import { guessDeviceType } from "../types/device";
import { extractRoomCode } from "../services/qr";
import { parseCameraError } from "../utils/cameraErrors";

export default function Scan() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState("Point camera at room QR code");
  const [manualCode, setManualCode] = useState("");

  const handleFound = async (roomCode: string) => {
    setStatus(`Found room ${roomCode} - connecting...`);
    const type = guessDeviceType();
    try {
      await signaling.connect(roomCode, "", type);
      navigate(`/room/${roomCode}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not connect to room.");
    }
  };

  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId = 0;
    let cancelled = false;

    async function startCamera() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          tick();
        }
      } catch (err) {
        if (!cancelled) {
          setError(parseCameraError(err));
        }
      }
    }

    function tick() {
      if (cancelled) return;
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imgData.data, imgData.width, imgData.height, {
            inversionAttempts: "dontInvert",
          });
          if (code?.data) {
            const extracted = extractRoomCode(code.data);
            if (extracted) {
              cancelled = true;
              if (stream) stream.getTracks().forEach((t) => t.stop());
              handleFound(extracted);
              return;
            }
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    }

    startCamera();

    return () => {
      cancelled = true;
      cancelAnimationFrame(rafId);
      if (stream) stream.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height);
        if (code?.data) {
          const extracted = extractRoomCode(code.data);
          if (extracted) {
            handleFound(extracted);
            return;
          }
        }
      }
      setError("No valid room QR code found in that image.");
    };
    img.src = URL.createObjectURL(file);
  };

  return (
    <div className="app-container" style={{ justifyContent: "center" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <button
          type="button"
          onClick={() => navigate("/")}
          style={{
            padding: "8px 16px",
            borderRadius: 12,
            background: "#f1f5f9",
            color: "#64748b",
            fontWeight: 600,
            fontSize: 14,
            border: "none",
            cursor: "pointer",
          }}
        >
          ← Back
        </button>
        <span style={{ fontWeight: 700, fontSize: 16 }}>Scan QR Code</span>
        <div style={{ width: 60 }} />
      </div>

      {error ? (
        <div className="status-pill-card" style={{ flexDirection: "column", gap: 12, textAlign: "center" }}>
          <p style={{ color: "#ef4444", fontWeight: 600, margin: 0 }}>{error}</p>
          <div style={{ display: "flex", gap: 10, width: "100%", justifyContent: "center" }}>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              style={{
                padding: "10px 16px",
                borderRadius: 12,
                background: "var(--color-primary-light)",
                color: "var(--color-primary)",
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              Upload QR Image
            </button>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
          <div
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 340,
              aspectRatio: "1/1",
              borderRadius: 24,
              overflow: "hidden",
              background: "#000000",
              boxShadow: "0 12px 32px rgba(0,0,0,0.15)",
            }}
          >
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
            <canvas ref={canvasRef} style={{ display: "none" }} />

            <div
              style={{
                position: "absolute",
                inset: 40,
                border: "3px solid rgba(255,255,255,0.8)",
                borderRadius: 16,
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)",
              }}
            />
          </div>

          <p style={{ color: "var(--color-text-sub)", fontSize: 14, fontWeight: 600 }}>{status}</p>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            style={{
              padding: "10px 18px",
              borderRadius: 14,
              background: "#ffffff",
              border: "1px solid rgba(0,0,0,0.1)",
              color: "var(--color-text-main)",
              fontWeight: 600,
              fontSize: 14,
              cursor: "pointer",
            }}
          >
            Or upload QR image
          </button>
        </div>
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: "none" }}
        onChange={handleImageUpload}
      />

      <div style={{ marginTop: 24, paddingTop: 20, borderTop: "1px solid #e2e8f0", width: "100%" }}>
        <p style={{ fontSize: 13, color: "#64748b", textAlign: "center", marginBottom: 10, fontWeight: 600 }}>
          Have a 6-character room code?
        </p>
        <div style={{ display: "flex", gap: 8 }}>
          <input
            placeholder="CODE"
            value={manualCode}
            onChange={(e) => setManualCode(e.target.value.toUpperCase().trim())}
            maxLength={6}
            style={{
              flex: 1,
              padding: "12px 16px",
              borderRadius: 14,
              border: "1px solid #cbd5e1",
              fontSize: 16,
              fontWeight: 700,
              letterSpacing: 2,
              textAlign: "center",
            }}
          />
          <button
            type="button"
            disabled={manualCode.length < 4}
            onClick={() => handleFound(manualCode)}
            style={{
              padding: "12px 20px",
              borderRadius: 14,
              background: "var(--color-primary)",
              color: "#ffffff",
              fontWeight: 700,
              fontSize: 14,
            }}
          >
            Join
          </button>
        </div>
      </div>
    </div>
  );
}
