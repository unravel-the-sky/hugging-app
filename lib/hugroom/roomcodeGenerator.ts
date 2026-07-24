/**
 * Room codes — Squish Hug Room
 *
 * The alphabet drops every glyph pair that people confuse when reading a code
 * off one screen and typing it into another: I / L / 1 and O / 0.
 * 31 characters, 6 long → ~887 million combinations.
 */

export const ROOM_CODE_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
export const ROOM_CODE_LENGTH = 6;

const DISALLOWED = new RegExp(`[^${ROOM_CODE_ALPHABET}]`, "g");

/**
 * NOTE: Math.random is fine while the room code is only guarded by a 30-minute
 * window. Swap this for expo-crypto's getRandomBytes when the join path moves
 * behind a Cloud Function — at that point the code is a real bearer token.
 */
export function generateRoomCode(): string {
  let out = "";
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    out +=
      ROOM_CODE_ALPHABET[Math.floor(Math.random() * ROOM_CODE_ALPHABET.length)];
  }
  return out;
}

/** Uppercase what was typed and drop anything outside the alphabet. */
export function normalizeRoomCode(input: string): string {
  return input.toUpperCase().replace(DISALLOWED, "").slice(0, ROOM_CODE_LENGTH);
}

export function isCompleteRoomCode(code: string): boolean {
  return normalizeRoomCode(code).length === ROOM_CODE_LENGTH;
}
