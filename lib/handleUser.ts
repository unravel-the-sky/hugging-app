import { getFunctions, httpsCallable } from "firebase/functions";
import { app } from "./firebaseConfig";

const functions = getFunctions(app);

// one callable per function
export const deleteAccountFn = httpsCallable(functions, "deleteAccount");
