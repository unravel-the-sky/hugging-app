import {
  arrayUnion,
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  updateDoc,
  where,
} from "firebase/firestore";
import { auth, db } from "./firebaseConfig";
import { normalizeUsername } from "./util";
import { User } from "./createUser";

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

export async function getFriendsForCurrentUser() {
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

  // now we have the list of friend uids. fetch these from users collection
  const q = query(
    collection(db, "users"),
    where("__name__", "in", friendUidList),
  );

  const snapshot = await getDocs(q); // this gets all the docs with frienduids

  const data = snapshot.docs.map((doc) => ({
    uid: doc.id,
    displayName: doc.data()?.displayName || "",
  }));

  console.log("whoa, all users data: ", data);

  return data;
}
