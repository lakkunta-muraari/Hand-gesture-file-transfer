export function parseCameraError(err: unknown): string {
  if (typeof window !== "undefined" && !window.isSecureContext) {
    return "Camera blocked: Insecure Context (HTTP). Access via HTTPS or localhost to enable camera.";
  }

  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    return "Camera API is not supported or is blocked in this browser context.";
  }

  if (err instanceof DOMException || (err && typeof err === "object" && "name" in err)) {
    const errorName = (err as { name?: string }).name;
    switch (errorName) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return "Camera error: NotAllowedError (Camera permission denied by user or browser).";
      case "NotFoundError":
      case "DevicesNotFoundError":
        return "Camera error: NotFoundError (No camera hardware found on this device).";
      case "NotReadableError":
      case "TrackStartError":
        return "Camera error: NotReadableError (Camera is already in use by another app or tab).";
      case "SecurityError":
        return "Camera error: SecurityError (Camera access blocked due to security settings).";
      case "OverconstrainedError":
        return "Camera error: OverconstrainedError (Requested camera constraints could not be met).";
      case "AbortError":
        return "Camera error: AbortError (Camera request was aborted).";
      default:
        if ("message" in err && typeof (err as any).message === "string" && (err as any).message) {
          return `Camera error: ${errorName || "Error"} - ${(err as any).message}`;
        }
        return `Camera error: ${errorName || "Unknown DOMException"}`;
    }
  }

  if (err instanceof Error) {
    return `Camera error: ${err.message}`;
  }

  return "Camera error: Failed to access camera feed.";
}
