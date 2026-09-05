import type { Gesture } from "./gestureDetector";

/**
 * Smooths raw per-frame gesture detections into a stable output.
 * 
 * Optimized for realtime responsiveness (<150ms):
 * Uses a compact 3-frame history window requiring 2 frames (60%) of agreement.
 * This eliminates the 5-second lag on mobile while preventing 1-frame noise.
 */
export class GestureDebouncer {
  private history: Gesture[] = [];
  private stable: Gesture = "none";

  constructor(
    private readonly windowSize = 3,      // 3-frame window for realtime responsiveness
    private readonly requiredRatio = 0.6, // 60% agreement (2 out of 3 frames)
    private readonly minConfidence = 0.15 // Ignore confidence=0 noise
  ) {}

  update(gesture: Gesture, confidence: number): Gesture {
    const effective = confidence >= this.minConfidence ? gesture : "none";

    this.history.push(effective);
    if (this.history.length > this.windowSize) this.history.shift();

    if (this.history.length < 2) return this.stable;

    // Count occurrences of each gesture in the window
    const counts: Record<Gesture, number> = { fist: 0, "open-palm": 0, "two-palms": 0, none: 0 };
    for (const g of this.history) counts[g]++;

    const total = this.history.length;

    // Check two-palms first (highest priority), then fist, then open-palm
    for (const candidate of ["two-palms", "fist", "open-palm"] as const) {
      if (counts[candidate] / total >= this.requiredRatio) {
        this.stable = candidate;
        return this.stable;
      }
    }

    // Reset to "none" if none dominates
    if (counts["none"] / total >= this.requiredRatio) {
      this.stable = "none";
    }

    // Otherwise keep last stable gesture (hysteresis)
    return this.stable;
  }

  reset(): void {
    this.history = [];
    this.stable = "none";
  }
}
