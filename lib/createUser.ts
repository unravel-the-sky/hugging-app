import { signInAnonymously } from "firebase/auth";
import {
  doc,
  FieldValue,
  getDoc,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
} from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { normalizeUsername } from "./util";

type AvatarType = "male" | "female";

export type UserDoc = {
  displayName: string;
  friends: string[];
  avatar?: AvatarType;
  createdAt?: FieldValue;
  pushToken?: string;
  stats: {
    hugsSent: number;
    hugsReceived: number;
    lastHugAt?: FieldValue;
  };
};

export type User = UserDoc & { uid: string };

export async function createUserIfNeeded(displayName: string): Promise<string> {
  // check auth
  const authResult = auth.currentUser
    ? { user: auth.currentUser }
    : await signInAnonymously(auth);

  const user = authResult.user;

  // check if user exists in firestore
  const userRef = doc(db, "users", user.uid);
  const snapshop = await getDoc(userRef);

  if (!snapshop.exists()) {
    const newUser: UserDoc = {
      displayName,
      createdAt: serverTimestamp(),
      friends: [],
      stats: {
        hugsSent: 0,
        hugsReceived: 0,
      },
    };
    await setDoc(userRef, newUser);
  }

  return user.uid;
}

export async function createUserWithUsername(
  displayName: string,
): Promise<string> {
  const normalized = normalizeUsername(displayName); // just in case

  console.log("we are at createUserWithUsername");
  // console.log("auth.currentUser: ", auth.currentUser);
  const authResult = auth.currentUser
    ? { user: auth.currentUser }
    : await signInAnonymously(auth);

  const user = authResult.user;
  console.log("authResult.user: ", authResult.user);

  const userRef = doc(db, "users", user.uid);
  const usernameRef = doc(db, "usernames", normalized);

  await runTransaction(db, async (transaction) => {
    const usernameSnapshot = await transaction.get(usernameRef);

    if (usernameSnapshot.exists()) {
      throw new Error("USERNAME_TAKEN");
    }

    const newUser: UserDoc = {
      displayName,
      createdAt: serverTimestamp(),
      friends: [],
      stats: {
        hugsSent: 0,
        hugsReceived: 0,
      },
    };

    transaction.set(userRef, newUser);
    transaction.set(usernameRef, {
      uid: user.uid,
      createdAt: serverTimestamp(),
    });
  });

  return user.uid;
}

export async function updateUserAvatar(avatar: AvatarType) {
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log("poop, no currentUser");
    return;
  }

  const currentUserRef = doc(db, "users", currentUser.uid);
  if (!currentUserRef) return;

  await updateDoc(currentUserRef, { avatar });

  return true;
}

export async function getUserFromCollection(uid: string): Promise<User | null> {
  const userRef = doc(db, "users", uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const userData = { ...snap.data(), uid: snap.id } as User;
    console.log("userdata is: ", userData);

    return userData;
  }

  return null;
}
