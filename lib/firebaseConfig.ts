// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import {
  getAuth,
  initializeAuth,
  // @ts-expect-error - the function exists but is not typed in the Firebase SDK
  getReactNativePersistence,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getStorage } from "firebase/storage";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBXoswQn-DueKJBlO8dSeNAoBRfA1AlXIE",
  authDomain: "hugging-app.firebaseapp.com",
  projectId: "hugging-app",
  storageBucket: "hugging-app.firebasestorage.app",
  messagingSenderId: "811741030521",
  appId: "1:811741030521:web:07e655849359b4647d8ca8",
  measurementId: "G-0YFMHPWZM4",
  databaseURL:
    "https://hugging-app-default-rtdb.europe-west1.firebasedatabase.app",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);

export const auth =
  Platform.OS === "web"
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
export const db = getFirestore(app);
export const rtdb = getDatabase(app);
