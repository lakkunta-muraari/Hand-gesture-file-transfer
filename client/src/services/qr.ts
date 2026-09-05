/**
 * A scanned QR can contain either a full deep-link URL
 * (https://192.168.x.x:5173/join/AB12CD) — which is what our own
 * generated QR codes contain, so any phone's native camera app can
 * open it directly — or, if someone typed/shared just the bare code,
 * the code itself. This handles both.
 */
export function extractRoomCode(scanned: string): string | null {
  const urlMatch = scanned.match(/\/join\/([A-Z0-9]{4,8})/i);
  if (urlMatch) return urlMatch[1].toUpperCase();

  const bare = scanned.trim().toUpperCase();
  if (/^[A-Z0-9]{4,8}$/.test(bare)) return bare;

  return null;
}
