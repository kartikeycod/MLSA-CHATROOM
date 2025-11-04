import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyD7DJflr2Fm7fKW2EcTsDCVV1RQ2ctDpf8",
  authDomain: "relief-13dee.firebaseapp.com",
  projectId: "relief-13dee",
  storageBucket: "relief-13dee.firebasestorage.app",
  messagingSenderId: "1011363331833",
  appId: "1:1011363331833:web:16c1af8a42b0f128e8ec28",
  measurementId: "G-ZY65RDL9NS",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
