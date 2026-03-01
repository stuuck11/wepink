import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDt3moQgGgODXmh4Oc70QotVNWnWZBVvyQ",
  authDomain: "wepink-4e089.firebaseapp.com",
  projectId: "wepink-4e089",
  storageBucket: "wepink-4e089.firebasestorage.app",
  messagingSenderId: "852881534937",
  appId: "1:852881534937:web:a0ee39c3bf5f156602b3c8",
  measurementId: "G-48WJTDYBNV"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
