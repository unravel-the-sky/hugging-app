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

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCP_AUUjewwX3k7qY75lDIBwRuvk0Tf3kk",
  authDomain: "hug-me-app-afb44.firebaseapp.com",
  projectId: "hug-me-app-afb44",
  storageBucket: "hug-me-app-afb44.firebasestorage.app",
  messagingSenderId: "150030020437",
  appId: "1:150030020437:web:6c55ca8839b8da6eef89dc",
  measurementId: "G-2MRHMXEE90",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth =
  Platform.OS === "web"
    ? getAuth(app)
    : initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
      });
export const db = getFirestore(app);
