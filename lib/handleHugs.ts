import {
  addDoc,
  collection,
  FieldValue,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebaseConfig";

export type Hug = {
  fromUid: string;
  toUid: string;
  fromName: string;
  toName: string;
  createdAt: FieldValue;
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
