import {
  addDoc,
  collection,
  doc,
  FieldValue,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { AvatarType } from "./createUser";

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
  hugBackNote?: string;
  hugBackAt?: TTimestamp;
  /** `from` opened the hug back. */
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

export type HugBackUpdate = Required<
  Pick<HugBase<FieldValue>, "hugBackNote" | "hugBackAt">
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

export async function sendHugBack(hugId: string, note: string): Promise<void> {
  const trimmed = note.trim();
  if (!trimmed) throw new Error("empty hug-back note");

  const update: HugBackUpdate = {
    hugBackNote: trimmed.slice(0, MAX_LEN),
    hugBackAt: serverTimestamp(),
  };

  // adjust the collection path to match yours (top-level `hugs` vs a subcollection)
  await updateDoc(doc(db, "hugs", hugId), update);
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

export async function getHugsWith(friendId: string): Promise<Hug[]> {
  const me = auth.currentUser;
  if (!me) return [];

  const hugsRef = collection(db, "hugs");
  const [sentSnap, recvSnap] = await Promise.all([
    getDocs(
      query(hugsRef, where("from", "==", me.uid), where("to", "==", friendId)),
    ),
    getDocs(
      query(hugsRef, where("from", "==", friendId), where("to", "==", me.uid)),
    ),
  ]);

  const toHug = (d: (typeof sentSnap.docs)[number]): Hug => ({
    id: d.id,
    ...(d.data() as Omit<Hug, "id">),
  });

  return [...sentSnap.docs, ...recvSnap.docs]
    .map(toHug)
    .sort(
      (a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0),
    );
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
