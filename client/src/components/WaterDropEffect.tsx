import { useEffect, useState } from "react";

interface Props {
  onComplete: () => void;
  fileName?: string;
  previewUrl?: string;
}

export default function WaterDropEffect({ onComplete, fileName = "File", previewUrl }: Props) {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  useEffect(() => {
    // Step 1: Liquid stream entry (0s - 0.8s)
    const t1 = setTimeout(() => setStep(2), 800);
    // Step 2: Liquid drop impact & crown splash (0.8s - 1.8s)
    const t2 = setTimeout(() => setStep(3), 1800);
    // Step 3: Ripple fade out & completion (2.8s)
    const t3 = setTimeout(onComplete, 2800);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [onComplete]);

  return (
    <div className="liquid-drop-overlay">
      <div className="liquid-drop-backdrop" />

      {/* Step Indicator Label */}
      <div className="liquid-step-badge">
        <span>Liquid Drop UI Effect · Step {step} of 3</span>
      </div>

      <div className="liquid-canvas-container">
        {/* Step 1 & 2: Stream of liquid droplets flowing in */}
        {step < 3 && (
          <div className="liquid-stream-arc">
            <svg viewBox="0 0 400 200" className="liquid-arc-svg">
              <path
                d="M 10 180 Q 200 10 390 100"
                fill="none"
                stroke="url(#liquidStreamGrad)"
                strokeWidth="4"
                strokeDasharray="6 8"
                className="liquid-stream-path"
              />
              <defs>
                <linearGradient id="liquidStreamGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#74b9ff" stopOpacity="0.3" />
                  <stop offset="50%" stopColor="#00cec9" stopOpacity="0.9" />
                  <stop offset="100%" stopColor="#6c5ce7" stopOpacity="1" />
                </linearGradient>
              </defs>
            </svg>
            {/* Liquid Droplet Particles */}
            {[0, 1, 2, 3, 4, 5].map((i) => (
              <div key={i} className={`liquid-particle particle-${i}`} />
            ))}
          </div>
        )}

        {/* Step 2: Receiving Image Liquid Sphere */}
        {step === 2 && (
          <div className="liquid-preview-orb-container">
            <div className="liquid-orb-ripple-outer" />
            <div className="liquid-orb-ripple-inner" />
            <div className="liquid-orb-core">
              {previewUrl ? (
                <img src={previewUrl} alt={fileName} className="liquid-preview-img" />
              ) : (
                <div className="liquid-file-icon">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="2.5">
                    <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
                    <polyline points="13 2 13 9 20 9" />
                  </svg>
                </div>
              )}
            </div>
            <p className="liquid-receiving-text">Receiving {fileName}...</p>
          </div>
        )}

        {/* Step 3: Realistic Water Droplet Impact & Concentric Splash */}
        {step === 3 && (
          <div className="realistic-drop-splash">
            <svg viewBox="0 0 300 300" className="water-splash-svg">
              <defs>
                <radialGradient id="waterSpecular" cx="35%" cy="30%" r="65%">
                  <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
                  <stop offset="40%" stopColor="#74b9ff" stopOpacity="0.7" />
                  <stop offset="85%" stopColor="#00cec9" stopOpacity="0.8" />
                  <stop offset="100%" stopColor="#6c5ce7" stopOpacity="0.95" />
                </radialGradient>
              </defs>

              {/* Expanding Concentric Ripple Rings */}
              <circle cx="150" cy="180" r="20" className="splash-ripple ripple-a" />
              <circle cx="150" cy="180" r="20" className="splash-ripple ripple-b" />
              <circle cx="150" cy="180" r="20" className="splash-ripple ripple-c" />
              <circle cx="150" cy="180" r="20" className="splash-ripple ripple-d" />

              {/* Droplet Drop Body */}
              <g className="realistic-falling-droplet">
                <path
                  d="M150,70 C132,100 115,128 115,152 a35,35 0 1 0 70,0 C185,128 168,100 150,70 Z"
                  fill="url(#waterSpecular)"
                />
                <ellipse cx="136" cy="138" rx="8" ry="14" fill="#ffffff" opacity="0.8" />
              </g>

              {/* Splash Droplet Particles */}
              {[-1, 1].map((dir) =>
                [0, 1, 2, 3].map((i) => (
                  <circle
                    key={`${dir}-${i}`}
                    cx={150 + dir * (12 + i * 14)}
                    cy={175 - (i % 2 === 0 ? 16 : 8)}
                    r={4 - i * 0.7}
                    fill="#00cec9"
                    className={`crown-splash-particle crown-${dir > 0 ? "right" : "left"}-${i}`}
                  />
                ))
              )}
            </svg>
            <p className="liquid-receiving-text" style={{ marginTop: -30 }}>
              Resource Saved!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
