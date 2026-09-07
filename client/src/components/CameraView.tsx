import { useEffect, useRef, useState, useCallback } from "react";
import { getHandLandmarker } from "../vision/handLandmarker";
import { classifyMultiHand, type Gesture } from "../vision/gestureDetector";
import { GestureDebouncer } from "../vision/gestureDebouncer";

export type CameraStatus = "idle" | "loading" | "ready" | "error";

interface Props {
  active: boolean;
  onGestureChange?: (gesture: Gesture) => void;
  onStatusChange?: (status: CameraStatus) => void;
  showPreview?: boolean;
  title?: string;
  subtitle?: string;
}

export default function CameraView({
  active,
  onGestureChange,
  onStatusChange,
  showPreview = true,
  title,
  subtitle,
}: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number>(0);

  // Fresh debouncer per camera session (3-frame window for realtime <150ms reaction)
  const debouncerRef = useRef<GestureDebouncer | null>(null);

  const onGestureChangeRef = useRef(onGestureChange);
  useEffect(() => {
    onGestureChangeRef.current = onGestureChange;
  });

  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [displayGesture, setDisplayGesture] = useState<Gesture>("none");

  const stopCamera = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    debouncerRef.current?.reset();
  }, []);

  useEffect(() => {
    if (!active) {
      stopCamera();
      setStatus("idle");
      setError(null);
      setDisplayGesture("none");
      onStatusChange?.("idle");
      return;
    }

    let cancelled = false;
    debouncerRef.current = new GestureDebouncer(3, 0.6, 0.15);

    async function start() {
      setStatus("loading");
      setError(null);
      onStatusChange?.("loading");

      if (!window.isSecureContext) {
        setError("Camera requires HTTPS. Open via https:// or localhost.");
        setStatus("error");
        onStatusChange?.("error");
        return;
      }
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("Camera API not available in this browser.");
        setStatus("error");
        onStatusChange?.("error");
        return;
      }

      try {
        const landmarker = await getHandLandmarker();
        if (cancelled) return;

        let stream: MediaStream | null = null;
        try {
          // Constrain resolution to 480x360@30fps to avoid mobile thermal throttling & high latency
          stream = await navigator.mediaDevices.getUserMedia({
            video: {
              facingMode: "user",
              width: { ideal: 480, max: 640 },
              height: { ideal: 360, max: 480 },
              frameRate: { ideal: 30, max: 30 },
            },
          });
        } catch (_) {
          try {
            stream = await navigator.mediaDevices.getUserMedia({
              video: { facingMode: "user" },
            });
          } catch (_) {
            stream = await navigator.mediaDevices.getUserMedia({ video: true });
          }
        }

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          await new Promise<void>((resolve, reject) => {
            video.onloadedmetadata = () => {
              video.play().then(resolve).catch(reject);
            };
            video.onerror = reject;
          });
        }

        setStatus("ready");
        onStatusChange?.("ready");

        // Inference loop with rate-limiting and non-overlapping execution lock
        let lastInferenceTime = 0;
        let isDetecting = false;

        function loop() {
          if (cancelled) return;
          const v = videoRef.current;
          if (!v || v.readyState < v.HAVE_ENOUGH_DATA) {
            rafRef.current = requestAnimationFrame(loop);
            return;
          }

          const now = performance.now();
          // Throttle inference to ~18-20 FPS (~52ms interval): buttery smooth while lightweight
          if (now - lastInferenceTime >= 52 && !isDetecting) {
            isDetecting = true;
            lastInferenceTime = now;

            try {
              const result = landmarker.detectForVideo(v, now);
              const { gesture, confidence } = classifyMultiHand(result.landmarks);
              const stable = debouncerRef.current!.update(gesture, confidence);
              setDisplayGesture(stable);
              onGestureChangeRef.current?.(stable);
            } catch (e) {
              // Ignore initial frame timing anomalies
            } finally {
              isDetecting = false;
            }
          }

          rafRef.current = requestAnimationFrame(loop);
        }

        rafRef.current = requestAnimationFrame(loop);
      } catch (err: any) {
        if (!cancelled) {
          console.warn("[CameraView] error:", err);
          setError(err?.message || "Failed to start camera");
          setStatus("error");
          onStatusChange?.("error");
        }
      }
    }

    start();

    return () => {
      cancelled = true;
      stopCamera();
    };
  }, [active, stopCamera]);

  if (!active) return null;

  const gestureColors: Record<Gesture, string> = {
    "two-palms": "#6c5ce7",
    "open-palm": "#00b894",
    fist: "#fdcb6e",
    none: "rgba(255,255,255,0.6)",
  };
  const gestureLabels: Record<Gesture, string> = {
    "two-palms": "TWO PALMS DETECTED",
    "open-palm": "OPEN PALM DETECTED",
    fist: "CLOSED FIST / GRAB",
    none: "Awaiting Gesture",
  };

  return (
    <div style={{ position: "relative", width: "100%", borderRadius: 20, overflow: "hidden", background: "#111" }}>
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        style={{
          width: "100%",
          display: showPreview ? "block" : "none",
          transform: "scaleX(-1)", // mirror
          maxHeight: 260,
          objectFit: "cover",
        }}
      />

      {/* LIVE badge */}
      <div
        style={{
          position: "absolute",
          top: 10,
          left: 10,
          display: "flex",
          alignItems: "center",
          gap: 5,
          background: "rgba(0,0,0,0.5)",
          borderRadius: 20,
          padding: "4px 10px",
        }}
      >
        <span
          style={{
            width: 7,
            height: 7,
            borderRadius: "50%",
            background: "#ff4757",
            display: "inline-block",
            boxShadow: "0 0 6px #ff4757",
            animation: "pulse 1.2s ease-in-out infinite",
          }}
        />
        <span style={{ fontSize: 10, fontWeight: 800, color: "#fff", letterSpacing: 1 }}>LIVE</span>
      </div>

      {/* Gesture status badge at bottom */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: "50%",
          transform: "translateX(-50%)",
          background: "rgba(0,0,0,0.65)",
          backdropFilter: "blur(8px)",
          borderRadius: 20,
          padding: "5px 14px",
          color: gestureColors[displayGesture],
          fontSize: 12,
          fontWeight: 800,
          whiteSpace: "nowrap",
          border: `1px solid ${gestureColors[displayGesture]}44`,
          transition: "color 0.15s, border-color 0.15s",
        }}
      >
        {gestureLabels[displayGesture]}
      </div>

      {title && (
        <div
          style={{
            position: "absolute",
            top: 10,
            right: 10,
            background: "rgba(0,0,0,0.5)",
            borderRadius: 12,
            padding: "4px 10px",
            color: "#fff",
            fontSize: 11,
            fontWeight: 700,
          }}
        >
          {title}
        </div>
      )}

      {/* Loading overlay */}
      {status === "loading" && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.7)",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: "50%",
              border: "3px solid rgba(255,255,255,0.15)",
              borderTopColor: "#a29bfe",
              animation: "spin 0.75s linear infinite",
            }}
          />
          <p style={{ color: "#fff", fontSize: 13, marginTop: 12, fontWeight: 600 }}>Starting camera...</p>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.75)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 16,
          }}
        >
          <p style={{ color: "#ff7675", fontSize: 13, textAlign: "center", margin: 0 }}>{error}</p>
        </div>
      )}
    </div>
  );
}
