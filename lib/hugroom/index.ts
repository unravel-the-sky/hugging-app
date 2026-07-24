/**
 * Hug Room — Realtime Database layer.
 *
 * Everything about a room lives at /rooms/$code. No Firestore.
 *
 * Participants are two fixed slots, "a" and "b", rather than a list. That makes
 * the two-person cap structural: there is nowhere for a third person to go, so
 * security rules only have to say "you may write into an empty slot" instead of
 * counting children (which RTDB rules can't do).
 */

import {
  get,
  onDisconnect,
  onValue,
  ref,
  remove,
  runTransaction,
  set,
  update,
} from "firebase/database";
import { AvatarType, User } from "../createUser";
import { rtdb } from "../firebaseConfig";
import { generateRoomCode } from "./roomcodeGenerator";

/** How long a code stays joinable. This is a *join window*, not a session cap —
 *  once both people are in, the room lives until they leave. */
export const ROOM_TTL_MS = 30 * 60 * 1000;

export type RoomStatus = "open" | "active" | "closed";
export type ParticipantSlot = "a" | "b";

export const SLOTS: readonly ParticipantSlot[] = ["a", "b"] as const;

export type RoomParticipant = {
  uid: string;
  displayName: string;
  avatar: AvatarType;
  /** Copied in at join time so the room renders with zero Firestore/Storage reads. */
  photoThumbURL: string | null;
  joinedAt: number;
  connected: boolean;
  touch?: TouchPoint | null;
};

export type Room = {
  code: string;
  createdBy: string;
  createdAt: number;
  expiresAt: number;
  status: RoomStatus;
  participants?: Partial<Record<ParticipantSlot, RoomParticipant>>;
};

export type RoomErrorCode =
  | "not-found"
  | "expired"
  | "closed"
  | "full"
  | "no-code";

export class RoomError extends Error {
  constructor(
    public code: RoomErrorCode,
    message: string,
  ) {
    super(message);
    this.name = "RoomError";
  }
}

const roomRef = (code: string) => ref(rtdb, `rooms/${code}`);
const participantsRef = (code: string) =>
  ref(rtdb, `rooms/${code}/participants`);

/** RTDB rejects `undefined`, so every optional field is normalised to null. */
function participantFrom(user: User): RoomParticipant {
  return {
    uid: user.uid,
    displayName: user.displayName,
    avatar: user.avatar ?? "male",
    photoThumbURL:
      user.avatar === "photo" ? (user.photoThumbURL ?? null) : null,
    joinedAt: Date.now(),
    connected: true,
  };
}

function slotOf(
  participants:
    | Partial<Record<ParticipantSlot, RoomParticipant>>
    | null
    | undefined,
  uid: string,
): ParticipantSlot | null {
  return SLOTS.find((s) => participants?.[s]?.uid === uid) ?? null;
}

export function occupants(room: Room | null): RoomParticipant[] {
  if (!room?.participants) return [];
  return SLOTS.map((s) => room.participants?.[s]).filter(
    Boolean,
  ) as RoomParticipant[];
}

export function isExpired(room: Room): boolean {
  return Date.now() > room.expiresAt;
}

/**
 * Create a room and take slot "a".
 *
 * The transaction aborts if the code is already taken, so a collision costs a
 * retry rather than clobbering someone else's room.
 *
 * NOTE: expiresAt is computed from the device clock. Good enough while the
 * client owns the join; when the Cloud Function lands, set it server-side so a
 * skewed clock can't widen the window.
 */
export async function createRoom(user: User): Promise<string> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const code = generateRoomCode();
    const now = Date.now();

    const result = await runTransaction(roomRef(code), (current) => {
      if (current !== null) return; // taken — abort and retry with a new code
      return {
        createdBy: user.uid,
        createdAt: now,
        expiresAt: now + ROOM_TTL_MS,
        status: "open" as RoomStatus,
        participants: { a: participantFrom(user) },
      };
    });

    if (result.committed) return code;
  }
  throw new RoomError("no-code", "Couldn't find a free room code. Try again.");
}

const slotRef = (code: string, slot: ParticipantSlot) =>
  ref(rtdb, `rooms/${code}/participants/${slot}`);

function isPermissionDenied(e: unknown): boolean {
  const msg = String((e as any)?.code ?? (e as any)?.message ?? e);
  return msg.toUpperCase().includes("PERMISSION_DENIED");
}

async function markActiveIfFull(code: string): Promise<void> {
  const snap = await get(participantsRef(code));
  const participants = snap.val() as Partial<
    Record<ParticipantSlot, RoomParticipant>
  > | null;
  if (SLOTS.every((s) => participants?.[s])) {
    await update(roomRef(code), { status: "active" satisfies RoomStatus });
  }
}

/**
 * Claim a slot in the room, or return the one already held.
 *
 * Writes go to `participants/a` or `participants/b` directly, never to the
 * `participants` map — the map is only writable by people already in the room,
 * which by definition excludes whoever is joining.
 *
 * No transaction: the `!data.exists()` clause in the slot's .write rule is the
 * compare-and-swap. Two people racing for the same slot both send a set; the
 * server takes one and denies the other, who falls through to the next slot.
 */
export async function joinRoom(
  code: string,
  user: User,
): Promise<ParticipantSlot> {
  const snap = await get(roomRef(code));
  if (!snap.exists())
    throw new RoomError("not-found", "No room with that code.");

  const room = { code, ...snap.val() } as Room;

  // Already in? Idempotent — this is the path taken by the creator and by
  // anyone re-entering, and it must not re-check expiry.
  const held = slotOf(room.participants, user.uid);
  if (held) return held;

  if (room.status === "closed")
    throw new RoomError("closed", "That room has closed.");
  if (isExpired(room)) throw new RoomError("expired", "That code has expired.");

  // Try what looked free at read time first, then the other slot in case the
  // snapshot was already stale.
  const free = SLOTS.filter((s) => !room.participants?.[s]);
  const candidates = [...free, ...SLOTS.filter((s) => !free.includes(s))];

  for (const slot of candidates) {
    try {
      await set(slotRef(code, slot), participantFrom(user));
      await markActiveIfFull(code);
      return slot;
    } catch (e) {
      if (!isPermissionDenied(e)) throw e; // a real failure, not an occupied slot
    }
  }

  throw new RoomError("full", "That room already has two people in it.");
}

export function subscribeRoom(
  code: string,
  cb: (room: Room | null) => void,
): () => void {
  return onValue(roomRef(code), (snap) => {
    cb(snap.exists() ? ({ code, ...snap.val() } as Room) : null);
  });
}

/**
 * Keep `connected` honest.
 *
 * onDisconnect is registered server-side, so it still fires when the app is
 * force-quit or loses signal. The slot itself is left in place — backgrounding
 * shouldn't evict anyone from the room.
 *
 * The `.info/connected` listener re-arms the handler after every reconnect,
 * because onDisconnect registrations are dropped when the socket drops.
 */
export function trackPresence(code: string, slot: ParticipantSlot): () => void {
  const flagRef = ref(rtdb, `rooms/${code}/participants/${slot}/connected`);

  const stop = onValue(ref(rtdb, ".info/connected"), async (snap) => {
    if (snap.val() !== true) return;
    try {
      await onDisconnect(flagRef).set(false);
      await set(flagRef, true);
    } catch {
      // Transient — the next .info/connected tick retries.
    }
  });

  return () => {
    stop();
    onDisconnect(flagRef)
      .cancel()
      .catch(() => {});
  };
}

export async function leaveRoom(
  code: string,
  slot: ParticipantSlot,
): Promise<void> {
  await remove(ref(rtdb, `rooms/${code}/participants/${slot}`));
  const rest = await get(participantsRef(code));
  if (!rest.exists()) {
    await update(roomRef(code), { status: "closed" satisfies RoomStatus });
  }
}

// hugcanvas related
// Add to lib/hugRoom.ts. `remove` and `set` are already imported.

/** Normalised to 0..1 of the canvas — never pixels. Devices differ. */
export type TouchPoint = { x: number; y: number; at: number };

/** Fastest we push a moving finger to RTDB. ~14 writes/sec while dragging. */
export const TOUCH_MIN_INTERVAL_MS = 70;

/**
 * How close two fingers must be to count as the same circle, in normalised
 * units. The threshold is compared in normalised space rather than pixels so
 * both devices reach the same verdict — a pixel threshold would let a phone
 * with a taller screen disagree with its partner about whether they're
 * touching, and there is no server arbitrating.
 */
export const TOGETHER_RADIUS = 0.09;

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

const touchRef = (code: string, slot: ParticipantSlot) =>
  ref(rtdb, `rooms/${code}/participants/${slot}/touch`);

export function writeTouch(
  code: string,
  slot: ParticipantSlot,
  point: { x: number; y: number } | null,
): Promise<void> {
  if (!point) return remove(touchRef(code, slot));
  return set(touchRef(code, slot), {
    x: clamp01(point.x),
    y: clamp01(point.y),
    at: Date.now(),
  });
}

export function touchDistance(
  a?: TouchPoint | null,
  b?: TouchPoint | null,
): number {
  if (!a || !b) return Infinity;
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function isTogether(
  a?: TouchPoint | null,
  b?: TouchPoint | null,
): boolean {
  return touchDistance(a, b) <= TOGETHER_RADIUS;
}

// Also add to RoomParticipant:
//   touch?: TouchPoint | null;
//
// `holding` / `holdingSince` are now redundant — a touch either exists or it
// doesn't. Drop them from participantFrom rather than keeping two sources of
// truth for the same thing.
