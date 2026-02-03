import { db } from "@/lib/firebaseConfig";
import { Hug } from "@/lib/handleHugs";
import { collection, onSnapshot, query, where } from "firebase/firestore";
import { useEffect, useState } from "react";

export function useIncomingHugs(uid?: string) {
  const [hugs, setHugs] = useState<Hug[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;

    const q = query(collection(db, "hugs"), where("to", "==", uid));

    const unsubscribe = onSnapshot(q, (snap) => {
      setHugs(
        snap.docs.map(
          (doc) =>
            ({
              ...doc.data(),
            }) as Hug,
        ),
      );
    });

    // const unsubscribeUid = onSnapshot(q, (snap) => {
    //   snap.docChanges().forEach((change) => {
    //     if (change.type === "added") {
    //       const hug = change.doc.data() as Hug;
    //       console.log(`Hug from ${hug.fromName} is received!`);
    //     }
    //   });
    // });

    setIsLoading(false);
    return unsubscribe;
  }, [uid]);

  return { isLoading, hugs };
}
