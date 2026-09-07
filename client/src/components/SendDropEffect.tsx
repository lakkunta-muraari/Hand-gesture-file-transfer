import { useEffect } from "react";
import { IconSparkle } from "./icons/GesturaIcons";

interface Props {
  onComplete: () => void;
  fileName?: string;
}

export default function SendDropEffect({ onComplete, fileName = "File" }: Props) {
  useEffect(() => {
    const timer = setTimeout(onComplete, 2200);
    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="liquid-drop-overlay">
      <div className="liquid-drop-backdrop" />

      <div className="liquid-step-badge">
        <IconSparkle size={13} color="#38bdf8" />
        <span>Fluid Transfer • Sender Departure</span>
      </div>

      <div className="liquid-canvas-container">
        <div className="liquid-send-pinch-glow">
          <div className="pinch-glow-ring-outer" />
          <div className="pinch-glow-ring-inner" />

          {/* Departing main liquid drop */}
          <svg viewBox="0 0 200 200" className="send-depart-svg">
            <defs>
              <radialGradient id="sendWaterGrad" cx="35%" cy="30%" r="65%">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                <stop offset="40%" stopColor="#74b9ff" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#6c5ce7" stopOpacity="1" />
              </radialGradient>
            </defs>

            <g className="departing-water-drop">
              <path
                d="M100,60 C88,78 78,94 78,110 a22,22 0 1 0 44,0 C122,94 112,78 100,60 Z"
                fill="url(#sendWaterGrad)"
              />
              <ellipse cx="92" cy="100" rx="5" ry="9" fill="#ffffff" opacity="0.85" />
            </g>
          </svg>

          {/* Trailing liquid particle stream */}
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className={`send-trail-particle send-trail-p${i}`} />
          ))}

          <p className="liquid-receiving-text" style={{ marginTop: 20 }}>
            Sending {fileName}...
          </p>
        </div>
      </div>
    </div>
  );
}
