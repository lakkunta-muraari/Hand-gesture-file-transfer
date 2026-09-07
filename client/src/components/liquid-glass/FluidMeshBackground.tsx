import { useEffect, useRef, ReactNode } from "react";
import { useTheme } from "../../utils/useTheme";

interface Props {
  children?: ReactNode;
}

export default function FluidMeshBackground({ children }: Props) {
  const { isDark } = useTheme();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointerRef = useRef({ x: 0.5, y: 0.5, targetX: 0.5, targetY: 0.5 });

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

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
      const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;
      pointerRef.current.targetX = clientX / width;
      pointerRef.current.targetY = clientY / height;
    };
    window.addEventListener("mousemove", onPointerMove);
    window.addEventListener("touchmove", onPointerMove);

    let t = 0;

    const render = () => {
      t += 0.008;

      // Smooth pointer interpolation
      pointerRef.current.x += (pointerRef.current.targetX - pointerRef.current.x) * 0.05;
      pointerRef.current.y += (pointerRef.current.targetY - pointerRef.current.y) * 0.05;

      const px = pointerRef.current.x;
      const py = pointerRef.current.y;

      // Base clear
      ctx.fillStyle = isDark ? "#090d16" : "#f8faff";
      ctx.fillRect(0, 0, width, height);

      // Multi-layer fluid color currents inspired by shadergradient
      // Center coordinates moving harmonically
      const x1 = width * (0.25 + Math.sin(t * 0.8) * 0.15 + (px - 0.5) * 0.1);
      const y1 = height * (0.3 + Math.cos(t * 0.7) * 0.15 + (py - 0.5) * 0.1);
      const r1 = Math.max(width, height) * 0.45;

      const x2 = width * (0.75 + Math.cos(t * 0.6) * 0.15 - (px - 0.5) * 0.1);
      const y2 = height * (0.35 + Math.sin(t * 0.9) * 0.15 - (py - 0.5) * 0.1);
      const r2 = Math.max(width, height) * 0.4;

      const x3 = width * (0.5 + Math.sin(t * 1.1) * 0.2);
      const y3 = height * (0.8 + Math.cos(t * 0.5) * 0.15);
      const r3 = Math.max(width, height) * 0.5;

      // Blob 1: Electric Indigo / Violet
      const grad1 = ctx.createRadialGradient(x1, y1, 0, x1, y1, r1);
      if (isDark) {
        grad1.addColorStop(0, "rgba(99, 102, 241, 0.28)");
        grad1.addColorStop(0.5, "rgba(79, 70, 229, 0.12)");
        grad1.addColorStop(1, "transparent");
      } else {
        grad1.addColorStop(0, "rgba(129, 140, 248, 0.32)");
        grad1.addColorStop(0.5, "rgba(199, 210, 254, 0.18)");
        grad1.addColorStop(1, "transparent");
      }
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      // Blob 2: Cyan / Emerald Seafoam
      const grad2 = ctx.createRadialGradient(x2, y2, 0, x2, y2, r2);
      if (isDark) {
        grad2.addColorStop(0, "rgba(6, 182, 212, 0.22)");
        grad2.addColorStop(0.5, "rgba(14, 165, 233, 0.08)");
        grad2.addColorStop(1, "transparent");
      } else {
        grad2.addColorStop(0, "rgba(45, 212, 191, 0.25)");
        grad2.addColorStop(0.5, "rgba(165, 243, 252, 0.14)");
        grad2.addColorStop(1, "transparent");
      }
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // Blob 3: Soft Pink / Purple Caustic
      const grad3 = ctx.createRadialGradient(x3, y3, 0, x3, y3, r3);
      if (isDark) {
        grad3.addColorStop(0, "rgba(217, 70, 239, 0.18)");
        grad3.addColorStop(0.5, "rgba(168, 85, 247, 0.06)");
        grad3.addColorStop(1, "transparent");
      } else {
        grad3.addColorStop(0, "rgba(244, 114, 182, 0.18)");
        grad3.addColorStop(0.5, "rgba(250, 232, 255, 0.12)");
        grad3.addColorStop(1, "transparent");
      }
      ctx.fillStyle = grad3;
      ctx.fillRect(0, 0, width, height);

      animId = requestAnimationFrame(render);
    };

    animId = requestAnimationFrame(render);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("mousemove", onPointerMove);
      window.removeEventListener("touchmove", onPointerMove);
    };
  }, [isDark]);

  return (
    <div style={{ position: "relative", minHeight: "100vh", width: "100%", overflowX: "hidden" }}>
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          width: "100%",
          height: "100%",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      {/* Subtle glass noise texture for authentic depth */}
      <div
        className="lg-noise"
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 1,
          pointerEvents: "none",
          opacity: isDark ? 0.03 : 0.02,
        }}
      />
      <div style={{ position: "relative", zIndex: 2, width: "100%" }}>{children}</div>
    </div>
  );
}
