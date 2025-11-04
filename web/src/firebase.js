// web/src/firebase.js
import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth"; // 🔑 Added GoogleAuthProvider

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDZhalAZkPO2eI20kU_8l_djUy8K21wLSs",
  authDomain: "reliefchat-fa9d2.firebaseapp.com",
  projectId: "reliefchat-fa9d2",
  storageBucket: "reliefchat-fa9d2.firebasestorage.app",
  messagingSenderId: "769019872204",
  appId: "1:769019872204:web:fdb3a73cd75d0359a5d369"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication and get a reference to the service
export const auth = getAuth(app); 

// 🚀 EXPORT GOOGLE AUTH PROVIDER
export const googleProvider = new GoogleAuthProvider();