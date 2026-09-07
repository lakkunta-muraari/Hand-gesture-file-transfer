import { CSSProperties, ReactNode, useRef } from "react";
import "./liquid-glass.css";

type GlassTone = "clear" | "violet" | "cyan" | "dark";
type GlassShape = "rounded" | "pill" | "circle";

interface GlassProps {
  children: ReactNode;
  className?: string;
  tone?: GlassTone;
  shape?: GlassShape;
  intensity?: number;
  interactive?: boolean;
  style?: CSSProperties;
  onClick?: () => void;
  ariaLabel?: string;
}

function usePointerGlass(interactive: boolean) {
  const ref = useRef<HTMLElement>(null);

  const onPointerMove = (event: React.PointerEvent<HTMLElement>) => {
    if (!interactive || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    ref.current.style.setProperty("--glass-x", `${x}%`);
    ref.current.style.setProperty("--glass-y", `${y}%`);
  };

  const onPointerLeave = () => {
    if (!ref.current) return;
    ref.current.style.setProperty("--glass-x", "50%");
    ref.current.style.setProperty("--glass-y", "20%");
  };

  return { ref, onPointerMove, onPointerLeave };
}

export function LiquidGlass({
  children,
  className = "",
  tone = "clear",
  shape = "rounded",
  intensity = 1,
  interactive = true,
  style,
  onClick,
  ariaLabel,
}: GlassProps) {
  const pointer = usePointerGlass(interactive);
  const Tag = onClick ? "button" : "div";

  return (
    <Tag
      ref={pointer.ref as any}
      className={`lg-glass lg-glass-${tone} lg-glass-${shape} ${interactive ? "lg-glass-interactive" : ""} ${className}`}
      style={{ "--glass-intensity": intensity, ...style } as CSSProperties}
      onPointerMove={pointer.onPointerMove}
      onPointerLeave={pointer.onPointerLeave}
      onClick={onClick}
      aria-label={ariaLabel}
      type={onClick ? "button" : undefined}
    >
      <span className="lg-glass-highlight" aria-hidden="true" />
      <span className="lg-glass-edge" aria-hidden="true" />
      <span className="lg-glass-content">{children}</span>
    </Tag>
  );
}

export function LiquidGlassCard(props: Omit<GlassProps, "shape">) {
  return <LiquidGlass {...props} shape="rounded" />;
}

export function LiquidGlassPill(props: Omit<GlassProps, "shape">) {
  return <LiquidGlass {...props} shape="pill" />;
}

export function LiquidGlassCircle(props: Omit<GlassProps, "shape">) {
  return <LiquidGlass {...props} shape="circle" />;
}

interface OrbProps {
  size?: number;
  label?: ReactNode;
  sublabel?: ReactNode;
  className?: string;
  onClick?: () => void;
}

export function LiquidTransferOrb({
  size = 150,
  label = "↕",
  sublabel = "TRANSFER",
  className = "",
  onClick,
}: OrbProps) {
  return (
    <div
      className={`lg-orb-wrap ${className}`}
      style={{ "--orb-size": `${size}px` } as CSSProperties}
    >
      <div className="lg-orb-aura" aria-hidden="true" />
      <div className="lg-orb-ring lg-orb-ring-a" aria-hidden="true" />
      <div className="lg-orb-ring lg-orb-ring-b" aria-hidden="true" />
      <LiquidGlassCircle
        className="lg-transfer-orb"
        tone="violet"
        interactive
        onClick={onClick}
        ariaLabel="Transfer file"
      >
        <span className="lg-orb-icon">{label}</span>
        <span className="lg-orb-label">{sublabel}</span>
      </LiquidGlassCircle>
    </div>
  );
}

export function LiquidGlassBackground({ children }: { children: ReactNode }) {
  return (
    <div className="lg-page-shell">
      <div className="lg-blob lg-blob-one" aria-hidden="true" />
      <div className="lg-blob lg-blob-two" aria-hidden="true" />
      <div className="lg-blob lg-blob-three" aria-hidden="true" />
      <div className="lg-noise" aria-hidden="true" />
      <div className="lg-page-content">{children}</div>
    </div>
  );
}
