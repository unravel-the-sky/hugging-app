import {
  addDoc,
  collection,
  doc,
  FieldValue,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  startAfter,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { AvatarType } from "./createUser";
import { canHugBack } from "./hugs/thread";

/**
 * One turn in a hug's back-and-forth. Deliberately thinner than a Hug: the
 * two participants and their names already live on the parent hug, so an
 * item only carries who spoke and what they said.
 *
 * `createdAt` is a *client* timestamp — Firestore rejects `serverTimestamp()`
 * inside an array element. The rules bound it against `request.time` so it
 * can't drift far from the truth.
 */
type HugBackBase<TTimestamp> = {
  from: string;
  note: string;
  createdAt: TTimestamp;
};

export type HugBack = HugBackBase<Timestamp>;

type HugBase<TTimestamp> = {
  from: string;
  to: string;
  fromName: string;
  toName: string;
  imagePath?: string;
  /** hex backdrop the sender chose for the postcard in the editor */
  backgroundColor?: string;
  fromAvatar?: AvatarType;
  note?: string;
  createdAt?: TTimestamp;
  /** `to` opened the hug. */
  seenAt?: TTimestamp;
  /**
   * The thread, oldest first, alternating authors and starting with `to`.
   * An array rather than a subcollection: it is capped at MAX_HUG_BACKS
   * short notes and is never read apart from its hug, so it rides along with
   * the streams and caches that already carry the hug document.
   */
  hugBacks?: HugBackBase<TTimestamp>[];
  /**
   * When each participant last read the thread, keyed by uid. A map so each
   * side writes only its own key — marking read can't clobber a reply landing
   * at the same moment, the way rewriting the array would.
   */
  seenAtBy?: Record<string, TTimestamp>;
  /** @deprecated pre-thread hug backs. Read for old hugs, never written. */
  hugBackNote?: string;
  /** @deprecated see `hugBackNote`. */
  hugBackAt?: TTimestamp;
  /** @deprecated `from` opened the hug back. Superseded by `seenAtBy`. */
  hugBackSeenAt?: TTimestamp;
  /**
   * Set by the server when the pair is blocked: the hug exists for the
   * sender, but is never shown to, or counted for, the recipient.
   */
  blockedDelivery?: boolean;
};

export type HugCreate = HugBase<FieldValue>;
export type Hug = HugBase<Timestamp> & { id: string };

export type SendableHug = Pick<
  HugBase<FieldValue>,
  "to" | "toName" | "note" | "imagePath" | "backgroundColor"
>;

const MAX_LEN = 140;

export async function sendHug(hug: HugCreate) {
  try {
    console.log("sending hug to firebase, hug is: ", hug);
    await addDoc(collection(db, "hugs"), {
      from: hug.from,
      to: hug.to,
      fromName: hug.fromName,
      toName: hug.toName,
      fromAvatar: hug.fromAvatar,
      note: hug.note,
      imagePath: hug.imagePath || "",
      backgroundColor: hug.backgroundColor || "",
      createdAt: serverTimestamp(),
    });
    console.log("hug is sent to firebase");
  } catch (err) {
    console.error("error when saving hug ", err);
  }
}

/**
 * Appends a turn to a hug's thread.
 *
 * Read-modify-write in a transaction rather than `arrayUnion`, so the rules
 * see the resulting array and can check the cap and whose turn it is. The
 * two participants alternate, so contention here is close to theoretical.
 */
export async function sendHugBack(hugId: string, note: string): Promise<void> {
  const trimmed = note.trim();
  if (!trimmed) throw new Error("empty hug-back note");

  const me = auth.currentUser;
  if (!me) throw new Error("not signed in");

  const ref = doc(db, "hugs", hugId);

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) throw new Error(`no hug with id ${hugId}`);

    const hug = { id: snap.id, ...(snap.data() as HugBase<Timestamp>) };
    if (!canHugBack(hug, me.uid)) throw new Error("not your turn to hug back");

    const item: HugBack = {
      from: me.uid,
      note: trimmed.slice(0, MAX_LEN),
      createdAt: Timestamp.now(),
    };

    tx.update(ref, { hugBacks: [...(hug.hugBacks ?? []), item] });
  });
}

/** Marks the thread read up to now for the signed-in user. */
export async function markThreadSeen(hugId: string): Promise<void> {
  const me = auth.currentUser;
  if (!me) return;

  await updateDoc(doc(db, "hugs", hugId), {
    [`seenAtBy.${me.uid}`]: Timestamp.now(),
  });
}

export async function getHugs() {
  // get current user
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log("currentUser not found haci..");
    return [];
  }

  const q = query(collection(db, "hugs"), where("to", "==", currentUser.uid));

  const snapshot = await getDocs(q);

  const data: Hug[] = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as HugBase<Timestamp>),
  }));

  console.log("all the hugs for the user; ", data);

  return data;

  // actually subscribe to this and show real time updates
}

export async function getHugWithId(hugId: string): Promise<Hug | null> {
  const docRef = doc(db, "hugs", hugId);

  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    return {
      id: docSnap.id,
      ...(docSnap.data() as HugBase<Timestamp>),
    };
  } else {
    console.error(`no document with ${hugId} was found..`);
    return null;
  }
}

/** A page of the memory lane, small enough that most visits read one page. */
export const HUGS_WITH_PAGE_SIZE = 10;

export type HugsWithPage = {
  hugs: Hug[];
  /** `createdAt` of the oldest hug returned — pass it back as `before`. */
  cursor?: Timestamp;
  hasMore: boolean;
};

export async function getHugsWith(
  friendId: string,
  opts: { pageSize?: number; before?: Timestamp } = {},
): Promise<HugsWithPage> {
  const me = auth.currentUser;
  if (!me) return { hugs: [], hasMore: false };

  const pageSize = opts.pageSize ?? HUGS_WITH_PAGE_SIZE;
  const hugsRef = collection(db, "hugs");

  const pageQuery = (from: string, to: string) =>
    query(
      hugsRef,
      where("from", "==", from),
      where("to", "==", to),
      orderBy("createdAt", "desc"),
      ...(opts.before ? [startAfter(opts.before)] : []),
      limit(pageSize + 1),
    );

  const [sentSnap, recvSnap] = await Promise.all([
    getDocs(pageQuery(me.uid, friendId)),
    getDocs(pageQuery(friendId, me.uid)),
  ]);

  const toHug = (d: (typeof sentSnap.docs)[number]): Hug => ({
    id: d.id,
    ...(d.data() as Omit<Hug, "id">),
  });

  const merged = [...sentSnap.docs, ...recvSnap.docs]
    .map(toHug)
    .sort(
      (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
    );

  const hugs = merged.slice(0, pageSize);

  return {
    hugs,
    cursor: hugs.at(-1)?.createdAt,
    hasMore: merged.length > pageSize,
  };
}

// this is some weird workaround for adding %2F instead of / on firebase downloadUrl
// fix this better when you have time
export const fixFirebaseUrl = (url: string): string => {
  // Match the path between /o/ and ? and re-encode any unencoded slashes
  return url.replace(/\/o\/([^?]+)/, (_, path) => {
    // Decode first (in case it's partially encoded), then re-encode
    const decoded = decodeURIComponent(path);
    return `/o/${encodeURIComponent(decoded)}`;
  });
};
