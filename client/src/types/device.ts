export type DeviceType = "phone" | "laptop";

export interface DeviceInfo {
  id: string;
  name: string;
  type: DeviceType;
}

/** Detects whether this browser is likely running on a phone or a laptop. */
export function guessDeviceType(): DeviceType {
  const isTouchPrimary = window.matchMedia("(pointer: coarse)").matches;
  return isTouchPrimary ? "phone" : "laptop";
}
