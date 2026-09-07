# GESTURA Liquid Glass UI

Drop this folder into:

`client/src/components/liquid-glass/`

It is a dependency-free React/TypeScript liquid-glass layer designed to work with the existing GESTURA Vite app.

## Import

```tsx
import {
  LiquidGlassCard,
  LiquidGlassPill,
  LiquidGlassCircle,
  LiquidTransferOrb,
  LiquidGlassBackground,
} from "../components/liquid-glass/LiquidGlass";
```

## Examples

```tsx
<LiquidGlassCard tone="clear" interactive>
  <div style={{ padding: 20 }}>
    Connected Devices
  </div>
</LiquidGlassCard>
```

```tsx
<LiquidGlassPill tone="violet" onClick={openFileSelector}>
  <span style={{ padding: "11px 18px", fontWeight: 800 }}>
    Choose File
  </span>
</LiquidGlassPill>
```

```tsx
<LiquidTransferOrb
  size={150}
  label="↕"
  sublabel="TRANSFER"
  onClick={openFileSelector}
/>
```

```tsx
<LiquidGlassBackground>
  {/* existing GESTURA dashboard */}
</LiquidGlassBackground>
```

## Recommended GESTURA usage

- Use `LiquidGlassCard` for Connected Devices, staged-file and status panels.
- Use `LiquidGlassPill` for Select File, QR and action buttons.
- Use `LiquidTransferOrb` for the central transfer control.
- Keep the existing CameraView/HUD functionality; style its outer shell with `LiquidGlassCard` rather than replacing the camera logic.
- Use the supplied Liquid Logo project only for a landing/loading logo treatment, not every component.

The component is intentionally separate from the WebGL library you supplied, so it won't add another dependency or interfere with MediaPipe/WebRTC.
