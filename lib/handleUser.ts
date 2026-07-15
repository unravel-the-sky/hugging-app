import { getFunctions, httpsCallable } from "firebase/functions";

const functions = getFunctions();

// one callable per function
export const deleteAccountFn = httpsCallable(functions, "deleteAccount");
