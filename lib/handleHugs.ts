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

export type Hug = {
  fromUid: string;
  toUid: string;
  fromName: string;
  toName: string;
  createdAt?: Timestamp;
  seenAt?: Timestamp;
};

export async function sendHug(hug: Hug) {
  const docRef = await addDoc(collection(db, "hugs"), {
    from: hug.fromUid,
    to: hug.toUid,
    fromName: hug.fromName,
    toName: hug.toName,
    createdAt: serverTimestamp(),
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
    fromName: doc.data().fromName,
    fromUid: doc.data().fromUid,
    toName: doc.data().toName,
    toUid: doc.data().toUid,
    createdAt: doc.data().createdAt,
  }));

  console.log("all the hugs for the user; ", data);

  return data;

  // actually subscribe to this and show real time updates
}
