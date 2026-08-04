import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { AvatarType, getUserFromCollection, User } from "./createUser";
import { auth, db } from "./firebaseConfig";
import { normalizeUsername } from "./util";

export type FriendshipRequest = {
  id: string;
  from: string;
  fromName: string;
  fromAvatar?: AvatarType | null;
  to: string;
  toName: string;
  createdAt: Timestamp;
  status: "pending" | "declined" | "accepted";
};

export type UserFriend = {
  id: string; // friend's uid (== doc id)
  displayName: string;
  avatar?: AvatarType | null;
  friendedAt: Timestamp;
  lastSentHug?: Timestamp | null;
  lastReceivedHug?: Timestamp | null;
  totalHugsSent?: number;
  totalHugsReceived?: number;
  numStreakDays?: number;
  addedAt?: Timestamp;
  online?: boolean;
  photoThumbPath?: string;
};

export async function getUserByUsername(username: string) {
  const normalized = normalizeUsername(username); // just in case
  const q = query(
    collection(db, "users"),
    where("displayName", "==", normalized),
  );

  const snapshot = await getDocs(q);

  if (snapshot.empty) {
    console.log("nothing found on snapshot..");
    return null;
  }

  const doc = snapshot.docs[0]; // get the first
  return {
    uid: doc.id,
    ...doc.data(),
  };
}

export async function addFriendByUsername(username: string) {
  // get current user
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log("currentUser not found haci..");
    return;
  }

  // get user
  const user = await getUserByUsername(username);

  if (user) {
    // if exists, add as friend
    const currentUserRef = doc(db, "users", currentUser.uid);
    const updateCurrentUser = updateDoc(currentUserRef, {
      friends: arrayUnion(user.uid),
    });

    const userRef = doc(db, "users", user.uid);
    const updateAddedUser = updateDoc(userRef, {
      friends: arrayUnion(currentUser.uid),
    });

    await Promise.all([updateCurrentUser, updateAddedUser]);

    return true;
  } else {
    // else return not found
    throw new Error("User not found!!");
  }
}

export async function getFriendsForCurrentUser(userId?: string) {
  // get current user
  const currentUser = auth.currentUser;
  if (!currentUser) {
    console.log("currentUser not found haci..");
    return [];
  }

  const currentUserRef = doc(db, "users", currentUser.uid);
  const userSnap = await getDoc(currentUserRef);

  if (!userSnap.exists()) {
    console.log("user doc not found, poop"); // throw error here actually
    return [];
  }

  const userData = userSnap.data() as User;
  const friendUidList: string[] = userData.friends || [];

  console.log("friendsUidList here: ", friendUidList);
  if (friendUidList.length < 1) return [];

  // now we have the list of friend uids. fetch these from users collection
  const q = query(
    collection(db, "users"),
    where("__name__", "in", friendUidList),
  );

  const snapshot = await getDocs(q); // this gets all the docs with frienduids

  const data = snapshot.docs.map((doc) => ({
    uid: doc.id,
    displayName: doc.data()?.displayName || "",
    avatar: doc.data()?.avatar || "",
  }));

  // console.log("whoa, all users data: ", data);

  return data;
}

export async function sendFriendRequest(username: string) {
  const me = auth?.currentUser;
  if (!me) throw new Error("User not signed in!");

  const target = await getUserByUsername(username);
  if (!target) throw new Error("User not found!");
  if (target.uid === me.uid)
    throw new Error(
      "although i appreciate self love, in this app you cannot add yourself",
    );

  try {
    const friendDoc = await getDoc(
      doc(db, "users", me.uid, "friends", target.uid),
    );
    if (friendDoc.exists()) throw new Error("you are already friends <3");

    const [myProfile, targetProfile] = await Promise.all([
      getUserFromCollection(me.uid),
      getUserFromCollection(target.uid),
    ]);

    const reqId = `${me.uid}_${target.uid}`;

    await setDoc(doc(db, "friendshipRequests", reqId), {
      id: reqId,
      from: me.uid,
      fromName: myProfile?.displayName,
      fromAvatar: myProfile?.avatar ?? null,
      to: target.uid,
      toName: targetProfile?.displayName,
      status: "pending",
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (err) {
    console.error("Error while creating friendship request: ", err);
  }
}

const functions = getFunctions(); // or getFunctions(app, "your-region") if not us-central1

// one callable per function
const acceptFriendRequestFn = httpsCallable(functions, "acceptFriendRequest");
const declineFriendRequestFn = httpsCallable(functions, "declineFriendRequest");
const removeFriendFn = httpsCallable(functions, "removeFriend");

export const onAccept = async (requestId: string) => {
  try {
    const result = await acceptFriendRequestFn({ requestId });
    // result.data is what your function returned, i.e. { ok: true }
    console.log("accepted", result.data);
  } catch (e: any) {
    // HttpsError from the server arrives here, typed
    console.log(e.code, e.message); // e.g. "failed-precondition", "Already handled"
  }
};

export const onDecline = async (requestId: string) => {
  try {
    await declineFriendRequestFn({ requestId });
  } catch (e: any) {
    console.log(e.code, e.message);
  }
};

export const onRemoveFriend = async (
  friendId: string,
  deleteHistory: boolean,
): Promise<boolean> => {
  try {
    const result = await removeFriendFn({ friendId, deleteHistory });
    return (result.data as { ok: boolean }).ok;
  } catch (e: any) {
    console.log("removeFriend failed:", e.code, e.message);
    throw e; // let the UI show an error state
  }
};

export const getPendingOutgoingUids = async (): Promise<Set<string>> => {
  const me = auth.currentUser;
  if (!me) return new Set();

  const q = query(
    collection(db, "friendshipRequests"),
    where("from", "==", me.uid),
    where("status", "==", "pending"),
  );
  const snap = await getDocs(q);
  return new Set(snap.docs.map((d) => d.get("to") as string));
};
