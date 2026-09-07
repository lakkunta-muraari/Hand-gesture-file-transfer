import { CSSProperties } from 'react';

interface IconProps {
  size?: number;
  color?: string;
  className?: string;
  style?: CSSProperties;
}

// Two open hands with gesture aura
export function IconTwoPalms({ size = 18, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' style={style}>
      <path d='M4 17v-4a1.2 1.2 0 0 1 2.4 0v4' />
      <path d='M6.4 13v-3a1.2 1.2 0 0 1 2.4 0v3' />
      <path d='M8.8 11V8.5a1.2 1.2 0 0 1 2.4 0v5.5' />
      <path d='M2.5 14.5a1.2 1.2 0 0 1 1.5-.7v3.2c0 2.2 1.8 4 4 4h1a4 4 0 0 0 4-4v-2' />
      <path d='M14 6a5 5 0 0 1 5 5' opacity='0.6' />
      <path d='M17 3a9 9 0 0 1 4 4' opacity='0.4' />
      <path d='M16 19v-5a1.2 1.2 0 0 1 2.4 0v5' />
      <path d='M18.4 14v-4a1.2 1.2 0 0 1 2.4 0v4' />
    </svg>
  );
}

// Single open palm
export function IconOpenPalm({ size = 18, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' style={style}>
      <path d='M6 14v-4a1.5 1.5 0 0 1 3 0v4' />
      <path d='M9 10V6.5a1.5 1.5 0 0 1 3 0V11' />
      <path d='M12 7.5a1.5 1.5 0 0 1 3 0v4' />
      <path d='M15 9.5a1.5 1.5 0 0 1 3 0v5c0 3.87-3.13 7-7 7a6.98 6.98 0 0 1-5.5-2.67l-2.7-3.6a1.5 1.5 0 0 1 2.4-1.8l1.8 2.4V14' />
    </svg>
  );
}

// Fist / Grab icon
export function IconFistGrab({ size = 18, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' style={style}>
      <path d='M5 11c0-1.66 1.34-3 3-3h8c1.66 0 3 1.34 3 3v2c0 3.31-2.69 6-6 6H9c-3.31 0-6-2.69-6-6v-2' />
      <path d='M7 8V6a2 2 0 0 1 2-2h1a2 2 0 0 1 2 2v2' />
      <path d='M12 8V5a2 2 0 0 1 2-2h0a2 2 0 0 1 2 2v3' />
      <path d='M8 11h8' />
      <path d='M8 14h6' />
    </svg>
  );
}

// Minimal modern file document
export function IconDocument({ size = 18, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' style={style}>
      <path d='M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z' />
      <polyline points='14 2 14 8 20 8' />
      <line x1='16' y1='13' x2='8' y2='13' />
      <line x1='16' y1='17' x2='8' y2='17' />
      <line x1='10' y1='9' x2='8' y2='9' />
    </svg>
  );
}

// Modern laptop icon
export function IconLaptop({ size = 18, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' style={style}>
      <rect x='3' y='4' width='18' height='12' rx='2' />
      <line x1='2' y1='20' x2='22' y2='20' />
    </svg>
  );
}

// Modern smartphone icon
export function IconPhone({ size = 18, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' style={style}>
      <rect x='6' y='2' width='12' height='20' rx='3' />
      <line x1='11' y1='5' x2='13' y2='5' strokeWidth='2' strokeLinecap='round' />
      <circle cx='12' cy='18' r='1' fill='currentColor' />
    </svg>
  );
}

// Modern arrow / send
export function IconSendArrow({ size = 16, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' style={style}>
      <line x1='12' y1='19' x2='12' y2='5' />
      <polyline points='5 12 12 5 19 12' />
    </svg>
  );
}

// Modern receive arrow
export function IconReceiveArrow({ size = 16, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' style={style}>
      <line x1='12' y1='5' x2='12' y2='19' />
      <polyline points='19 12 12 19 5 12' />
    </svg>
  );
}

// Modern lock
export function IconLock({ size = 14, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='2' strokeLinecap='round' strokeLinejoin='round' style={style}>
      <rect x='3' y='11' width='18' height='11' rx='2' ry='2' />
      <path d='M7 11V7a5 5 0 0 1 10 0v4' />
    </svg>
  );
}

// Sparkle glint
export function IconSparkle({ size = 16, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill={color} style={style}>
      <path d='M12 0L14.5 9.5L24 12L14.5 14.5L12 24L9.5 14.5L0 12L9.5 9.5L12 0Z' />
    </svg>
  );
}

// Check circle badge
export function IconCheckCircle({ size = 16, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='2.2' strokeLinecap='round' strokeLinejoin='round' style={style}>
      <circle cx='12' cy='12' r='10' />
      <polyline points='9 12 11.5 14.5 16 9.5' />
    </svg>
  );
}

// Pulse radar wave icon
export function IconRadar({ size = 18, color = 'currentColor', style }: IconProps) {
  return (
    <svg width={size} height={size} viewBox='0 0 24 24' fill='none' stroke={color} strokeWidth='1.8' strokeLinecap='round' strokeLinejoin='round' style={style}>
      <path d='M12 2a10 10 0 0 1 10 10' />
      <path d='M12 6a6 6 0 0 1 6 6' />
      <path d='M12 10a2 2 0 0 1 2 2' />
      <line x1='12' y1='12' x2='21.5' y2='2.5' />
      <circle cx='12' cy='12' r='1' fill={color} />
    </svg>
  );
}
