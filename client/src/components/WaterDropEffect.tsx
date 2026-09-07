import { useEffect, useRef, useState } from "react";
import { IconCheckCircle, IconDocument, IconSparkle } from "./icons/GesturaIcons";

interface Props {
  onComplete: () => void;
  fileName?: string;
  previewUrl?: string;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  alpha: number;
}

export default function WaterDropEffect({ onComplete, fileName = "File", previewUrl }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const onResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };
    window.addEventListener("resize", onResize);

    const centerX = width / 2;
    const impactY = height * 0.52;

    // Simulation states
    let startTime = performance.now();
    let dropletY = -40;
    let dropletVy = 0;
    const gravity = 0.65;
    let impacted = false;
    let impactTime = 0;

    // Ripple rings
    interface Ripple {
      startTime: number;
      speed: number;
      maxRadius: number;
      amplitude: number;
    }
    const ripples: Ripple[] = [];

    // Crown particles
    const particles: Particle[] = [];

    // Reveal content slightly after impact
    const contentTimer = setTimeout(() => setShowContent(true), 900);
    // Completion timer
    const completeTimer = setTimeout(onComplete, 3800);

    const render = (now: number) => {
      const elapsed = (now - startTime) / 1000;
      ctx.clearRect(0, 0, width, height);

      // Deep atmospheric dark/glass caustic backdrop
      const bgGrad = ctx.createRadialGradient(centerX, impactY, 20, centerX, impactY, Math.max(width, height) * 0.7);
      bgGrad.addColorStop(0, "rgba(99, 102, 241, 0.22)");
      bgGrad.addColorStop(0.4, "rgba(14, 165, 233, 0.12)");
      bgGrad.addColorStop(1, "rgba(9, 13, 22, 0.88)");
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, width, height);

      // 1. Falling Droplet Physics
      if (!impacted) {
        dropletVy += gravity;
        dropletY += dropletVy;

        if (dropletY >= impactY) {
          impacted = true;
          impactTime = now;

          // Trigger ripple waves
          ripples.push({ startTime: now, speed: 280, maxRadius: Math.max(width, height) * 0.5, amplitude: 18 });
          ripples.push({ startTime: now + 120, speed: 240, maxRadius: Math.max(width, height) * 0.45, amplitude: 14 });
          ripples.push({ startTime: now + 260, speed: 200, maxRadius: Math.max(width, height) * 0.4, amplitude: 10 });
          ripples.push({ startTime: now + 420, speed: 170, maxRadius: Math.max(width, height) * 0.35, amplitude: 6 });

          // Spawn realistic crown splash droplets
          for (let i = 0; i < 28; i++) {
            const angle = (Math.PI * 2 * i) / 28 + (Math.random() - 0.5) * 0.2;
            const speed = 4.5 + Math.random() * 5.5;
            particles.push({
              x: centerX,
              y: impactY,
              vx: Math.cos(angle) * speed,
              vy: -Math.sin(Math.random() * Math.PI) * speed * 1.3 - 2,
              r: 1.8 + Math.random() * 2.8,
              alpha: 1,
            });
          }
        } else {
          // Draw falling droplet with teardrop surface tension & specular caustics
          ctx.save();
          ctx.translate(centerX, dropletY);

          // Droplet shadow on pool surface
          const distToPool = impactY - dropletY;
          if (distToPool < 200) {
            const shadowAlpha = (1 - distToPool / 200) * 0.4;
            const shadowRadius = 14 + (1 - distToPool / 200) * 16;
            ctx.fillStyle = `rgba(6, 182, 212, ${shadowAlpha})`;
            ctx.beginPath();
            ctx.ellipse(0, distToPool, shadowRadius, shadowRadius * 0.35, 0, 0, Math.PI * 2);
            ctx.fill();
          }

          // Main fluid droplet
          ctx.beginPath();
          ctx.moveTo(0, -26);
          ctx.bezierCurveTo(14, -10, 18, 12, 0, 18);
          ctx.bezierCurveTo(-18, 12, -14, -10, 0, -26);
          ctx.closePath();

          const dropGrad = ctx.createLinearGradient(0, -26, 0, 18);
          dropGrad.addColorStop(0, "rgba(255, 255, 255, 0.95)");
          dropGrad.addColorStop(0.3, "rgba(165, 243, 252, 0.85)");
          dropGrad.addColorStop(0.7, "rgba(56, 189, 248, 0.75)");
          dropGrad.addColorStop(1, "rgba(99, 102, 241, 0.9)");
          ctx.fillStyle = dropGrad;
          ctx.fill();

          // High-gloss specular reflection
          ctx.beginPath();
          ctx.ellipse(-4, -4, 4, 9, -0.3, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 255, 255, 0.9)";
          ctx.fill();

          ctx.beginPath();
          ctx.arc(3, 10, 2, 0, Math.PI * 2);
          ctx.fillStyle = "rgba(255, 255, 255, 0.75)";
          ctx.fill();

          ctx.restore();
        }
      }

      // 2. Realistic Physics Surface Ripples
      if (impacted) {
        const timeSinceImpact = (now - impactTime) / 1000;

        // Rayleigh jet rebound column (first 0.7s after impact)
        if (timeSinceImpact < 0.75) {
          const jetHeight = Math.sin(timeSinceImpact * Math.PI * 1.35) * 55;
          if (jetHeight > 0) {
            ctx.save();
            ctx.translate(centerX, impactY);

            ctx.beginPath();
            ctx.moveTo(-6, 0);
            ctx.quadraticCurveTo(-3, -jetHeight * 0.7, 0, -jetHeight);
            ctx.quadraticCurveTo(3, -jetHeight * 0.7, 6, 0);
            ctx.closePath();

            const jetGrad = ctx.createLinearGradient(0, 0, 0, -jetHeight);
            jetGrad.addColorStop(0, "rgba(99, 102, 241, 0.6)");
            jetGrad.addColorStop(0.7, "rgba(56, 189, 248, 0.85)");
            jetGrad.addColorStop(1, "rgba(255, 255, 255, 0.95)");
            ctx.fillStyle = jetGrad;
            ctx.fill();

            // Rebound tip bead
            ctx.beginPath();
            ctx.arc(0, -jetHeight - 4, 3.5, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
            ctx.fill();

            ctx.restore();
          }
        }

        // Render expanding wave rings with refractive distortion
        ripples.forEach((r) => {
          const dt = (now - r.startTime) / 1000;
          if (dt <= 0) return;

          const radius = dt * r.speed;
          if (radius > r.maxRadius) return;

          const decay = Math.exp(-dt * 1.8);
          const alpha = decay * 0.85;

          ctx.save();
          ctx.translate(centerX, impactY);

          // Outer refractive caustic ring
          ctx.beginPath();
          ctx.ellipse(0, 0, radius, radius * 0.38, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(165, 243, 252, ${alpha * 0.65})`;
          ctx.lineWidth = 3.5 * decay + 0.8;
          ctx.stroke();

          // Bright specular peak crest
          ctx.beginPath();
          ctx.ellipse(0, 0, radius * 0.96, radius * 0.96 * 0.38, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.9})`;
          ctx.lineWidth = 1.6 * decay + 0.5;
          ctx.stroke();

          // Subtle cyan/violet trough shadow
          ctx.beginPath();
          ctx.ellipse(0, 0, radius * 1.04, radius * 1.04 * 0.38, 0, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(99, 102, 241, ${alpha * 0.4})`;
          ctx.lineWidth = 2 * decay;
          ctx.stroke();

          ctx.restore();
        });

        // 3. Crown Splash Droplet Particles
        for (let i = particles.length - 1; i >= 0; i--) {
          const p = particles[i];
          p.x += p.vx;
          p.y += p.vy;
          p.vy += 0.32; // Gravity
          p.alpha -= 0.014;

          if (p.alpha <= 0 || p.y > height) {
            particles.splice(i, 1);
            continue;
          }

          ctx.beginPath();
          ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(224, 242, 254, ${p.alpha * 0.95})`;
          ctx.fill();

          // Specular spark
          ctx.beginPath();
          ctx.arc(p.x - p.r * 0.3, p.y - p.r * 0.3, p.r * 0.4, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha})`;
          ctx.fill();
        }
      }

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      clearTimeout(contentTimer);
      clearTimeout(completeTimer);
    };
  }, [onComplete]);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 99999,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />

      {/* Floating Refractive Fluid Glass Preview Card */}
      {showContent && (
        <div
          style={{
            position: "relative",
            zIndex: 10,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 16,
            animation: "liquidFloatUp 0.65s cubic-bezier(0.16, 1, 0.3, 1) forwards",
          }}
        >
          {/* Glass orb with file or preview image */}
          <div
            style={{
              width: 140,
              height: 140,
              borderRadius: "50%",
              background: "radial-gradient(circle at 35% 25%, rgba(255, 255, 255, 0.8), rgba(165, 243, 252, 0.35) 45%, rgba(99, 102, 241, 0.4) 80%)",
              boxShadow: "0 20px 60px rgba(56, 189, 248, 0.45), inset 0 2px 4px rgba(255, 255, 255, 0.9), inset 0 -4px 10px rgba(99, 102, 241, 0.5)",
              border: "1.5px solid rgba(255, 255, 255, 0.65)",
              backdropFilter: "blur(16px)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              position: "relative",
            }}
          >
            {/* Water surface reflection streak */}
            <div
              style={{
                position: "absolute",
                top: 8,
                left: 14,
                width: 50,
                height: 25,
                borderRadius: "50%",
                background: "radial-gradient(ellipse at center, rgba(255, 255, 255, 0.9), transparent 70%)",
                transform: "rotate(-25deg)",
                pointerEvents: "none",
              }}
            />

            {previewUrl ? (
              <img
                src={previewUrl}
                alt={fileName}
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  borderRadius: "50%",
                }}
              />
            ) : (
              <div style={{ color: "#ffffff", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <IconDocument size={52} color="#ffffff" />
              </div>
            )}
          </div>

          {/* Clean Glass Status Pill */}
          <div
            style={{
              background: "rgba(15, 23, 42, 0.75)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255, 255, 255, 0.18)",
              boxShadow: "0 12px 36px rgba(0, 0, 0, 0.35)",
              borderRadius: 30,
              padding: "10px 22px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "#ffffff",
            }}
          >
            <span style={{ color: "#34d399", display: "flex", alignItems: "center" }}>
              <IconCheckCircle size={18} color="#34d399" />
            </span>
            <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: -0.2 }}>
              {fileName}
            </span>
            <span style={{ color: "#38bdf8", display: "flex", alignItems: "center" }}>
              <IconSparkle size={14} color="#38bdf8" />
            </span>
          </div>

          <div style={{ fontSize: 12, fontWeight: 600, color: "rgba(224, 242, 254, 0.8)", letterSpacing: 0.5 }}>
            File received and saved cleanly
          </div>
        </div>
      )}

      <style>{`
        @keyframes liquidFloatUp {
          from {
            opacity: 0;
            transform: translateY(28px) scale(0.92);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
}
