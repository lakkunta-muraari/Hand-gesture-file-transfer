export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

export type Gesture = "fist" | "open-palm" | "two-palms" | "two-closed-palms" | "none";

// Finger tip and pip (knuckle) landmark indices from MediaPipe
// Index: pip=6,tip=8 | Middle: pip=10,tip=12 | Ring: pip=14,tip=16 | Pinky: pip=18,tip=20
const FINGER_JOINTS: { pip: number; mcp: number; tip: number }[] = [
  { pip: 6,  mcp: 5,  tip: 8  }, // index
  { pip: 10, mcp: 9,  tip: 12 }, // middle
  { pip: 14, mcp: 13, tip: 16 }, // ring
  { pip: 18, mcp: 17, tip: 20 }, // pinky
];
// Thumb: cmc=1, mcp=2, ip=3, tip=4
const THUMB = { cmc: 1, mcp: 2, ip: 3, tip: 4 };

function distance(a: Landmark, b: Landmark): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return Math.sqrt(dx * dx + dy * dy);
}

export function countExtendedFingers(landmarks: Landmark[]): number {
  if (!landmarks || landmarks.length < 21) return 0;

  const wrist = landmarks[0];
  const palmSize = distance(wrist, landmarks[9]) || 0.001;
  let extendedCount = 0;

  for (const { pip, tip } of FINGER_JOINTS) {
    const pipDist = distance(landmarks[pip], wrist);
    const tipDist = distance(landmarks[tip], wrist);
    const m1Extended = tipDist > pipDist * 1.05;
    const m2Extended = distance(landmarks[tip], wrist) > palmSize * 0.9;

    if (m1Extended && m2Extended) extendedCount++;
  }

  // Thumb
  const thumbTipDist = distance(landmarks[THUMB.tip], wrist);
  const thumbIpDist  = distance(landmarks[THUMB.ip],  wrist);
  if (thumbTipDist > thumbIpDist * 1.08) extendedCount++;

  return extendedCount;
}

/**
 * Robust check for a closed fist:
 * Index, middle, and ring tips MUST be folded close to wrist (below PIP joints).
 * If index finger is extended (pointing to scroll), it is NEVER a fist!
 */
export function isHandFist(landmarks: Landmark[]): boolean {
  if (!landmarks || landmarks.length < 21) return false;
  const wrist = landmarks[0];

  const indexFolded  = distance(landmarks[8],  wrist) <= distance(landmarks[6],  wrist) * 1.15;
  const middleFolded = distance(landmarks[12], wrist) <= distance(landmarks[10], wrist) * 1.15;
  const ringFolded   = distance(landmarks[16], wrist) <= distance(landmarks[14], wrist) * 1.15;
  const pinkyFolded  = distance(landmarks[20], wrist) <= distance(landmarks[18], wrist) * 1.15;

  // Crucial: Index and Middle MUST be folded. If index is pointing, it returns false!
  return indexFolded && middleFolded && (ringFolded || pinkyFolded);
}

/**
 * Check for open palm: at least 4 extended fingers
 */
export function isHandOpen(landmarks: Landmark[]): boolean {
  if (!landmarks || landmarks.length < 21) return false;
  return countExtendedFingers(landmarks) >= 4;
}

export function classifySingleHand(landmarks: Landmark[]): Gesture {
  if (!landmarks || landmarks.length < 21) return "none";
  if (isHandOpen(landmarks)) return "open-palm";
  if (isHandFist(landmarks)) return "fist";
  return "none";
}

export function classifyGesture(landmarks: Landmark[]): { gesture: Gesture; confidence: number } {
  const result = classifySingleHand(landmarks);
  return { gesture: result, confidence: result === "none" ? 0 : 0.9 };
}

export function classifyMultiHand(allHands: Landmark[][]): { gesture: Gesture; confidence: number } {
  if (allHands.length >= 2) {
    const isFist1 = isHandFist(allHands[0]);
    const isFist2 = isHandFist(allHands[1]);
    const isOpen1 = isHandOpen(allHands[0]);
    const isOpen2 = isHandOpen(allHands[1]);

    // Both hands closed into fists -> TWO CLOSED PALMS!
    if (isFist1 && isFist2) {
      return { gesture: "two-closed-palms", confidence: 0.95 };
    }

    // Both hands open -> TWO PALMS!
    if (isOpen1 && isOpen2) {
      return { gesture: "two-palms", confidence: 0.95 };
    }
  }

  if (allHands.length >= 1) {
    return classifyGesture(allHands[0]);
  }

  return { gesture: "none", confidence: 0 };
}
