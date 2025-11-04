// src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// 🧩 Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyD7DJflr2Fm7fKW2EcTsDCVV1RQ2ctDpf8",
  authDomain: "relief-13dee.firebaseapp.com",
  projectId: "relief-13dee",
  storageBucket: "relief-13dee.firebasestorage.app",
  messagingSenderId: "1011363331833",
  appId: "1:1011363331833:web:16c1af8a42b0f128e8ec28",
  measurementId: "G-ZY65RDL9NS"
};

// ✅ Initialize Firebase once
const app = initializeApp(firebaseConfig);

// ✅ Export the initialized auth instance
export const auth = getAuth(app);
