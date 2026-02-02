import { db } from "@/lib/firebaseConfig";
import { Hug } from "@/lib/handleHugs";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect } from "react";

export function useIncomingHugs(uid: string) {
  useEffect(() => {
    const q = query(collection(db, "hugs"), where("to", "==", uid));

    const unsubscribeUid = onSnapshot(q, (snap) => {
      snap.docChanges().forEach((change) => {
        if (change.type === "added") {
          const hug = change.doc.data() as Hug;
          console.log(`Hug from ${hug.fromName} is received!`);
        }
      });
    });

    return unsubscribeUid;
  }, [uid]);
}
