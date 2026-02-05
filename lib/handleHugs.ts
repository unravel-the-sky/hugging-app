import {
  addDoc,
  collection,
  FieldValue,
  getDocs,
  query,
  serverTimestamp,
  Timestamp,
  where,
} from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { AvatarType } from "@/components/user/Avatar";

type HugBase<TTimestamp> = {
  from: string;
  to: string;
  fromName: string;
  toName: string;
  fromAvatar?: AvatarType;
  note?: string;
  createdAt?: TTimestamp;
  seenAt?: TTimestamp;
};

export type HugCreate = HugBase<FieldValue>;
export type Hug = HugBase<Timestamp> & { id: string };

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
      createdAt: serverTimestamp(),
    });
    console.log("hug is sent to firebase");
  } catch (err) {
    console.error("error when saving hug ", err);
  }
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
