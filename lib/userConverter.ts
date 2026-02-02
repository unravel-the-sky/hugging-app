import { FirestoreDataConverter } from "firebase/firestore";
import { User } from "./createUser";

export const userConverter: FirestoreDataConverter<User> = {
  toFirestore(user: User) {
    return user;
  },
  fromFirestore(snapshot) {
    return snapshot.data() as User;
  },
};
