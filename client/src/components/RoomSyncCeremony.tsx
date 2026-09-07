import { useEffect, useState } from "react";
import type { DeviceInfo } from "../types/device";
import { IconLaptop, IconPhone, IconRadar, IconSparkle } from "./icons/GesturaIcons";

interface Props {
  roomCode: string;
  devices: DeviceInfo[];
  selfId?: string | null;
  onComplete: () => void;
}

export default function RoomSyncCeremony({ roomCode, devices, selfId, onComplete }: Props) {
  const [progress, setProgress] = useState(0);
  const [stage, setStage] = useState<"scanning" | "detected" | "synchronized">("scanning");

  useEffect(() => {
    const start = performance.now();
    const duration = 3000; // 3 seconds exact

    const timer = setInterval(() => {
      const elapsed = performance.now() - start;
      const p = Math.min(100, Math.round((elapsed / duration) * 100));
      setProgress(p);

      if (p > 35 && p <= 75) {
        setStage("detected");
      } else if (p > 75) {
        setStage("synchronized");
      }

      if (elapsed >= duration) {
        clearInterval(timer);
        setTimeout(onComplete, 200);
      }
    }, 30);

    return () => clearInterval(timer);
  }, [onComplete]);

  // Display devices or mock placeholder if devices are still connecting
  const displayDevices = devices.length > 0 ? devices : [
    { id: selfId || "self", name: "Your Device", type: "laptop" as const },
  ];

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9999,
        background: "radial-gradient(circle at center, rgba(17, 24, 39, 0.96) 0%, rgba(9, 13, 22, 0.99) 100%)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        color: "#ffffff",
        overflow: "hidden",
        padding: 20,
      }}
    >
      {/* 3D Perspective Grid Background */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          perspective: 600,
          pointerEvents: "none",
          overflow: "hidden",
          opacity: 0.35,
        }}
      >
        <div
          style={{
            position: "absolute",
            width: "200%",
            height: "200%",
            left: "-50%",
            top: "-20%",
            transform: "rotateX(62deg)",
            backgroundImage: `
              linear-gradient(rgba(99, 102, 241, 0.25) 1px, transparent 1px),
              linear-gradient(90deg, rgba(99, 102, 241, 0.25) 1px, transparent 1px)
            `,
            backgroundSize: "60px 60px",
            animation: "gridMove 10s linear infinite",
          }}
        />
      </div>

      {/* Atmospheric Ambient Glow Orbs */}
      <div
        style={{
          position: "absolute",
          width: 380,
          height: 380,
          borderRadius: "50%",
          background: "radial-gradient(circle, rgba(99, 102, 241, 0.35) 0%, rgba(6, 182, 212, 0.15) 50%, transparent 70%)",
          filter: "blur(50px)",
          animation: "pulseAura 3s ease-in-out infinite",
          pointerEvents: "none",
        }}
      />

      {/* Top Telemetry Header */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          textAlign: "center",
          marginBottom: 36,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 10,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            background: "rgba(99, 102, 241, 0.16)",
            border: "1px solid rgba(129, 140, 248, 0.35)",
            padding: "6px 16px",
            borderRadius: 30,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 2,
            textTransform: "uppercase",
            color: "#a5b4fc",
          }}
        >
          <IconRadar size={14} color="#38bdf8" />
          <span>HOLOGRAPHIC MESH SCAN</span>
          <span style={{ color: "#38bdf8" }}>{progress}%</span>
        </div>

        <h2
          style={{
            fontSize: "clamp(22px, 5vw, 32px)",
            fontWeight: 900,
            letterSpacing: -0.5,
            margin: 0,
            background: "linear-gradient(135deg, #ffffff 30%, #a5b4fc 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            fontFamily: "var(--font-display)",
          }}
        >
          {stage === "scanning" && "Scanning Local Mesh Network..."}
          {stage === "detected" && `Discovered Room Nodes (${displayDevices.length})`}
          {stage === "synchronized" && `Room ${roomCode} Synchronized!`}
        </h2>

        <p style={{ fontSize: 13, color: "#94a3b8", margin: 0, maxWidth: 360 }}>
          {stage === "scanning" && "Broadcasting WebRTC cryptographic tokens..."}
          {stage === "detected" && "Pairing direct peer-to-peer data channels..."}
          {stage === "synchronized" && "Ready for zero-click gesture air sharing!"}
        </p>
      </div>

      {/* Central 3D Radar Node & Orbiting Device Cards */}
      <div
        style={{
          position: "relative",
          width: "min(90vw, 420px)",
          height: 280,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 10,
        }}
      >
        {/* Radar Rings */}
        <div className="radar-ring ring-1" />
        <div className="radar-ring ring-2" />
        <div className="radar-ring ring-3" />

        {/* Central Core Hub */}
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "radial-gradient(circle at 30% 30%, #ffffff, #6366f1 60%, #4338ca 100%)",
            boxShadow: "0 0 36px rgba(99, 102, 241, 0.8), inset 0 2px 4px rgba(255,255,255,0.9)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            zIndex: 5,
            animation: "corePulse 2s ease-in-out infinite",
          }}
        >
          <IconSparkle size={28} color="#ffffff" />
          {/* Radar Sweep Beams */}
          <div className="radar-sweep" />
        </div>

        {/* Discovered Devices Animated into 3D Space */}
        {displayDevices.map((device, idx) => {
          const isMe = device.id === selfId || device.id === "self";
          const angle = (idx / Math.max(1, displayDevices.length)) * Math.PI * 2 - Math.PI / 2;
          const radius = displayDevices.length === 1 ? 115 : 125;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * (radius * 0.65); // Elliptical perspective

          return (
            <div
              key={device.id || idx}
              style={{
                position: "absolute",
                transform: `translate(${x}px, ${y}px)`,
                animation: `deviceFloatIn 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${idx * 0.18}s both`,
                zIndex: 6,
              }}
            >
              {/* Connection Beam Line to Center */}
              <svg
                style={{
                  position: "absolute",
                  left: -x,
                  top: -y,
                  width: Math.abs(x) * 2 || 1,
                  height: Math.abs(y) * 2 || 1,
                  pointerEvents: "none",
                  overflow: "visible",
                }}
              >
                <line
                  x1={x}
                  y1={y}
                  x2={0}
                  y2={0}
                  stroke="rgba(56, 189, 248, 0.45)"
                  strokeWidth="1.5"
                  strokeDasharray="4 4"
                />
              </svg>

              {/* Glass Device Card */}
              <div
                style={{
                  background: isMe ? "rgba(16, 185, 129, 0.18)" : "rgba(30, 41, 59, 0.75)",
                  border: isMe ? "1.5px solid rgba(52, 211, 153, 0.65)" : "1.5px solid rgba(148, 163, 184, 0.3)",
                  backdropFilter: "blur(14px)",
                  boxShadow: isMe ? "0 8px 28px rgba(16, 185, 129, 0.3)" : "0 8px 24px rgba(0, 0, 0, 0.4)",
                  borderRadius: 18,
                  padding: "10px 14px",
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  whiteSpace: "nowrap",
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 10,
                    background: device.type === "phone" ? "rgba(245, 158, 11, 0.25)" : "rgba(56, 189, 248, 0.25)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: device.type === "phone" ? "#f59e0b" : "#38bdf8",
                  }}
                >
                  {device.type === "phone" ? <IconPhone size={18} /> : <IconLaptop size={18} />}
                </div>

                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#ffffff" }}>
                    {device.name || (device.type === "phone" ? "Phone" : "Laptop")}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginTop: 2 }}>
                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", display: "inline-block" }} />
                    <span style={{ fontSize: 10, color: "#34d399", fontWeight: 700 }}>
                      {isMe ? "YOU • ACTIVE" : "PEER • SYNCED"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Progress Bar & Skip Button */}
      <div
        style={{
          position: "relative",
          zIndex: 10,
          marginTop: 30,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 14,
          width: "100%",
          maxWidth: 320,
        }}
      >
        <div
          style={{
            width: "100%",
            height: 5,
            background: "rgba(255, 255, 255, 0.12)",
            borderRadius: 6,
            overflow: "hidden",
          }}
        >
          <div
            style={{
              width: `${progress}%`,
              height: "100%",
              background: "linear-gradient(90deg, #38bdf8, #6366f1, #ec4899)",
              transition: "width 0.05s linear",
              boxShadow: "0 0 12px rgba(99, 102, 241, 0.8)",
            }}
          />
        </div>

        <button
          type="button"
          onClick={onComplete}
          style={{
            background: "none",
            border: "none",
            color: "rgba(148, 163, 184, 0.75)",
            fontSize: 12,
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: "uppercase",
            cursor: "pointer",
            padding: "6px 14px",
            transition: "color 0.2s ease",
          }}
        >
          Skip into Dashboard →
        </button>
      </div>

      <style>{`
        .radar-ring {
          position: absolute;
          border-radius: 50%;
          border: 1px solid rgba(56, 189, 248, 0.25);
          pointer-events: none;
        }
        .ring-1 { width: 140px; height: 140px; transform: scaleY(0.65); animation: pulseRing 3s ease-out infinite; }
        .ring-2 { width: 230px; height: 230px; transform: scaleY(0.65); animation: pulseRing 3s ease-out 1s infinite; }
        .ring-3 { width: 320px; height: 320px; transform: scaleY(0.65); animation: pulseRing 3s ease-out 2s infinite; }

        .radar-sweep {
          position: absolute;
          width: 170px;
          height: 170px;
          border-radius: 50%;
          background: conic-gradient(from 0deg, rgba(56, 189, 248, 0.35) 0deg, transparent 60deg, transparent 360deg);
          animation: radarRotate 3s linear infinite;
          pointer-events: none;
        }

        @keyframes radarRotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulseRing {
          0% { opacity: 0.8; transform: scale(0.6) scaleY(0.65); }
          100% { opacity: 0; transform: scale(1.4) scaleY(0.65); }
        }
        @keyframes pulseAura {
          0%, 100% { transform: scale(0.95); opacity: 0.4; }
          50% { transform: scale(1.1); opacity: 0.75; }
        }
        @keyframes gridMove {
          0% { transform: rotateX(62deg) translateY(0); }
          100% { transform: rotateX(62deg) translateY(60px); }
        }
        @keyframes deviceFloatIn {
          from {
            opacity: 0;
            transform: translate(0, 0) scale(0.4);
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}
