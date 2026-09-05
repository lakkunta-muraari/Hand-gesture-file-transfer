export interface Landmark {
  x: number;
  y: number;
  z?: number;
}

export type Gesture = "fist" | "open-palm" | "two-palms" | "none";

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
    const m1Extended = tipDist > pipDist * 1.02;
    const m2Extended = distance(landmarks[tip], wrist) > palmSize * 0.85;

    if (m1Extended || m2Extended) extendedCount++;
  }

  // Thumb
  const thumbTipDist = distance(landmarks[THUMB.tip], wrist);
  const thumbIpDist  = distance(landmarks[THUMB.ip],  wrist);
  if (thumbTipDist > thumbIpDist * 1.02) extendedCount++;

  return extendedCount;
}

export function classifySingleHand(landmarks: Landmark[]): "fist" | "open-palm" {
  const count = countExtendedFingers(landmarks);
  if (count >= 3) return "open-palm";
  return "fist";
}

export function classifyGesture(landmarks: Landmark[]): { gesture: Gesture; confidence: number } {
  const result = classifySingleHand(landmarks);
  return { gesture: result, confidence: 0.9 };
}

export function classifyMultiHand(allHands: Landmark[][]): { gesture: Gesture; confidence: number } {
  if (allHands.length >= 2) {
    const count1 = countExtendedFingers(allHands[0]);
    const count2 = countExtendedFingers(allHands[1]);

    // If both hands have 2+ extended fingers in frame, it is Two Palms
    if (count1 >= 2 && count2 >= 2) {
      return { gesture: "two-palms", confidence: 0.95 };
    }
  }

  if (allHands.length >= 1) {
    return classifyGesture(allHands[0]);
  }

  return { gesture: "none", confidence: 0 };
}
