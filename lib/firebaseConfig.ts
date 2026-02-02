// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

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
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
