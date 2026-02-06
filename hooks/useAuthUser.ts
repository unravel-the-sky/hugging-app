import { auth, db } from "@/lib/firebaseConfig";
import { onAuthStateChanged, signInAnonymously, User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { useEffect, useState } from "react";

// new flow - experimental, not used now
// export function useAuthUser() {
//   const [firebaseUser, setFirebaseUser] = useState<User | null | undefined>(
//     undefined,
//   );

//   useEffect(() => {
//     const unsub = onAuthStateChanged(auth, async (user) => {
//       if (user) {
//         setFirebaseUser(user);
//       } else {
//         const result = await signInAnonymously(auth);
//         setFirebaseUser(result.user);
//       }
//     });

//     return unsub;
//   }, []);

//   return firebaseUser;
// }

// export function useUserDoc(uid?: string) {
//   const [user, setUser] = useState<User | null | undefined>(undefined);
//   const [loading, setLoading] = useState(true);

//   useEffect(() => {
//     if (!uid) return;

//     const userRef = doc(db, "users", uid);

//     const unsub = onSnapshot(userRef, (snap) => {
//       if (snap.exists()) {
//         console.log("snap exists");
//         setUser(snap.data() as User);
//       } else {
//         console.log("snap does not exist");
//         setUser(null);
//       }
//       setLoading(false);
//     });

//     return unsub;
//   }, [uid]);

//   return { user, loading };
// }

// export function useCurrentUser() {
//   const firebaseUser = useAuthUser();
//   const uid = firebaseUser?.uid;

//   const { user, loading } = useUserDoc(uid);

//   return {
//     user,
//     loading: firebaseUser === undefined || loading,
//     uid,
//   };
// }
