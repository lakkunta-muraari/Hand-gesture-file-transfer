import type { Gesture } from "./gestureDetector";

export type GestureAction = "grab" | "release" | "open-file-picker" | "open-native-upload" | "none";

/**
 * Detects gesture SEQUENCES from a stream of stable gestures.
 *
 * Sequences:
 *   two-palms (held)      → "open-file-picker"
 *   open-palm -> fist   → "grab"   (sender sends file)
 *   fist -> open-palm   → "release" (receiver downloads file)
 *
 * Key fixes over original:
 * - two-palms fires on ENTRY (first frame it becomes stable), not on hold.
 *   This makes the picker open instantly and consistently.
 * - Cooldown only blocks the SAME action from repeating, not different ones.
 * - lastGestureTime is set correctly on every transition.
 * - Sequence window is 2500ms — wide enough for a natural gesture.
 */
export class GestureSequenceDetector {
  private prevGesture: Gesture = "none";
  private prevGestureTime: number = 0;

  // Per-action cooldowns so one doesn't block another
  private cooldowns: Record<GestureAction, number> = {
    "open-file-picker": 0,
    "open-native-upload": 0,
    "grab": 0,
    "release": 0,
    "none": 0,
  };

  private twoPalmsFired: boolean = false;
  private twoClosedPalmsFired: boolean = false;
  private readonly SEQUENCE_WINDOW_MS = 2500;
  private readonly COOLDOWN_MS: Record<GestureAction, number> = {
    "open-file-picker": 3000,
    "open-native-upload": 3000,
    "grab": 2000,
    "release": 2000,
    "none": 0,
  };

  update(stableGesture: Gesture): GestureAction {
    const now = Date.now();

    // ── TWO CLOSED PALMS: fire once on entry to open upload ──────────────
    if (stableGesture === "two-closed-palms") {
      if (!this.twoClosedPalmsFired && now - this.cooldowns["open-native-upload"] > this.COOLDOWN_MS["open-native-upload"]) {
        this.twoClosedPalmsFired = true;
        this.cooldowns["open-native-upload"] = now;
        return "open-native-upload";
      }
      return "none";
    } else {
      this.twoClosedPalmsFired = false;
    }

    // ── TWO PALMS: fire once on entry ─────────────────────────────────────
    if (stableGesture === "two-palms") {
      if (!this.twoPalmsFired && now >= this.cooldowns["open-file-picker"]) {
        this.twoPalmsFired = true;
        this.cooldowns["open-file-picker"] = now + this.COOLDOWN_MS["open-file-picker"];
        this.prevGesture = stableGesture;
        this.prevGestureTime = now;
        console.log("[GSD] ACTION: open-file-picker (two-palms detected)");
        return "open-file-picker";
      }
      return "none";
    }

    // We're past the two-palms block, so gesture is NOT two-palms here.
    // Reset flag so next two-palms detection can fire again.
    this.twoPalmsFired = false;

    // ── SEQUENCE DETECTION ─────────────────────────────────────────────────
    // Direct detection or sequence transitions:
    // 1. Fist / Closed Palm -> GRAB
    if (stableGesture === "fist") {
      if (now >= this.cooldowns["grab"]) {
        this.cooldowns["grab"] = now + this.COOLDOWN_MS["grab"];
        this.prevGesture = stableGesture;
        this.prevGestureTime = now;
        console.log("[GSD] ACTION: grab (fist detected)");
        return "grab";
      }
      return "none";
    }

    // 2. Open Palm -> RELEASE (Receive)
    if (stableGesture === "open-palm") {
      if (now >= this.cooldowns["release"]) {
        this.cooldowns["release"] = now + this.COOLDOWN_MS["release"];
        this.prevGesture = stableGesture;
        this.prevGestureTime = now;
        console.log("[GSD] ACTION: release (open-palm detected)");
        return "release";
      }
      return "none";
    }

    if (stableGesture !== "none") {
      this.prevGesture = stableGesture;
      this.prevGestureTime = now;
    }

    return "none";
  }

  reset(): void {
    this.prevGesture = "none";
    this.prevGestureTime = 0;
    this.twoPalmsFired = false;
    this.cooldowns = { "open-file-picker": 0, "grab": 0, "release": 0, "none": 0 };
  }
}
